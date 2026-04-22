import { NextRequest, NextResponse } from 'next/server'
import { AgentRunner } from '@/lib/ai/agent-runner'
import { callClaudeJSON } from '@/lib/ai/claude'
import {
  CONTRACTOR_DISPATCH_SYSTEM_PROMPT,
  buildDispatchMessages,
  type DispatchClassification,
} from '@/lib/ai/prompts/contractor-dispatch'
import { matchContractors } from '@/lib/dispatch/vendor-matching'
import { getSupabaseServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-agent-secret')
  if (secret !== process.env.AGENTS_SECRET_KEY) {
    if (!req.cookies.get('sb-access-token') && !req.cookies.get('sb-auth-token')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  let body: Record<string, string>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { ticketId, deployedAgentId, consultingClientId } = body

  if (!ticketId || !deployedAgentId || !consultingClientId) {
    return NextResponse.json(
      { error: 'ticketId, deployedAgentId, and consultingClientId are required' },
      { status: 400 },
    )
  }

  const sb     = await getSupabaseServiceClient()
  const runner = new AgentRunner({ deployedAgentId, consultingClientId, triggerType: 'manual' })

  try {
    await runner.start()

    // ── 1. Fetch ticket ─────────────────────────────────────────────
    const { data: ticket, error: ticketErr } = await sb
      .from('maintenance_tickets')
      .select('id, title, description, priority, ai_priority, ai_category')
      .eq('id', ticketId)
      .single()

    if (ticketErr || !ticket) {
      await runner.fail('Ticket not found')
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    await runner.log('info', 'ticket_fetched',
      `Dispatching for: "${ticket.title}" (${ticket.ai_priority ?? ticket.priority})`, {
        entityType: 'maintenance_ticket', entityId: ticket.id, entityLabel: ticket.title,
      })
    runner.incrementProcessed()

    // ── 2. Fetch and rank contractors ────────────────────────────────
    const { data: rawContractors } = await sb
      .from('contractors')
      .select('id, company_name, trades, rating, total_jobs, insurance_expiry, status')
      .eq('consulting_client_id', consultingClientId)
      .eq('status', 'active')

    const requiredTrade = (ticket.ai_category ?? 'general').toLowerCase()

    const matches = matchContractors(
      (rawContractors ?? []).map(c => ({
        id:              c.id,
        companyName:     c.company_name,
        trades:          c.trades ?? [],
        rating:          c.rating,
        totalJobs:       c.total_jobs,
        insuranceExpiry: c.insurance_expiry ? new Date(c.insurance_expiry) : null,
        status:          c.status,
        openWorkOrders:  0,
      })),
      { requiredTrade },
    )

    await runner.log('info', 'contractors_ranked',
      `${matches.length} contractor(s) ranked for trade: ${requiredTrade}`)

    if (matches.length === 0) {
      await runner.log('warn', 'no_contractors',
        `No active contractors found for trade: ${requiredTrade} — manual dispatch required`)
      await runner.complete(`No contractors available for trade: ${requiredTrade}`)
      return NextResponse.json({ success: false, message: 'No contractors available', runId: runner.runIdOrNull })
    }

    // ── 3. Ask Claude to confirm / reason ───────────────────────────
    const aiResponse = await callClaudeJSON<DispatchClassification>(
      buildDispatchMessages({
        ticketTitle:       ticket.title,
        ticketDescription: ticket.description ?? '',
        priority:          ticket.ai_priority ?? ticket.priority,
        requiredTrade,
        contractors:       matches.map(m => ({
          id:             m.contractorId,
          companyName:    m.companyName,
          rating:         m.rating,
          totalJobs:      (rawContractors ?? []).find(c => c.id === m.contractorId)?.total_jobs ?? 0,
          insuranceValid: m.insuranceValid,
          openWorkOrders: m.openWorkOrders,
          matchScore:     m.matchScore,
        })),
      }),
      {
        systemPrompt: CONTRACTOR_DISPATCH_SYSTEM_PROMPT,
        maxTokens:    700,
      },
    )

    runner.trackAIUsage(aiResponse)
    const dispatch = aiResponse.content

    const recommendedContractor = (rawContractors ?? []).find(
      c => c.id === dispatch.recommended_contractor_id,
    )
    const contractorName = recommendedContractor?.company_name ?? 'Unknown contractor'

    await runner.log('success', 'dispatch_recommended',
      `${contractorName} recommended — confidence ${Math.round(dispatch.confidence * 100)}% · est. $${dispatch.estimated_cost_min_usd}–$${dispatch.estimated_cost_max_usd}`, {
        entityType:       'contractor',
        entityId:         dispatch.recommended_contractor_id,
        entityLabel:      contractorName,
        aiModel:          aiResponse.model,
        promptTokens:     aiResponse.usage.promptTokens,
        completionTokens: aiResponse.usage.completionTokens,
        costUsd:          aiResponse.usage.costUsd,
        latencyMs:        aiResponse.latencyMs,
        outputSnapshot:   dispatch as unknown as Record<string, unknown>,
      })

    if (dispatch.concerns.length > 0) {
      await runner.log('warn', 'dispatch_concerns',
        `Concerns flagged: ${dispatch.concerns.join('; ')}`)
    }

    // ── 4. Create approval ───────────────────────────────────────────
    const avgEstimate = (dispatch.estimated_cost_min_usd + dispatch.estimated_cost_max_usd) / 2

    await runner.requestApproval({
      approvalType:     'vendor_dispatch',
      title:            `Dispatch ${contractorName} → "${ticket.title}"`,
      description:      `${ticket.ai_priority ?? ticket.priority} · Est. cost $${dispatch.estimated_cost_min_usd}–$${dispatch.estimated_cost_max_usd} · ${dispatch.estimated_duration_hours}h estimate${dispatch.concerns.length > 0 ? ` · ⚠️ ${dispatch.concerns[0]}` : ''}`,
      aiRecommendation: dispatch.reasoning,
      aiConfidence:     dispatch.confidence,
      amountUsd:        avgEstimate,
      entityType:       'maintenance_ticket',
      entityId:         ticket.id,
      entityLabel:      ticket.title,
      payload:          {
        ticketId:              ticket.id,
        recommendedContractorId: dispatch.recommended_contractor_id,
        alternativeContractorId: dispatch.alternative_contractor_id,
        dispatch,
      },
    })

    await runner.log('success', 'approval_created',
      `Dispatch approval created for ${contractorName}`, {
        entityType: 'contractor',
        entityId:   dispatch.recommended_contractor_id,
        entityLabel: contractorName,
      })

    await runner.complete(
      `Dispatch recommendation: ${contractorName} for "${ticket.title}" · confidence ${Math.round(dispatch.confidence * 100)}%`,
    )

    return NextResponse.json({ success: true, dispatch, contractorName, runId: runner.runIdOrNull })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    await runner.fail(msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
