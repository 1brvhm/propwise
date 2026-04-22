import { NextRequest, NextResponse } from 'next/server'
import { AgentRunner } from '@/lib/ai/agent-runner'
import { callClaudeJSON } from '@/lib/ai/claude'
import {
  MAINTENANCE_SYSTEM_PROMPT,
  buildMaintenanceTriageMessages,
} from '@/lib/ai/prompts/maintenance-triage'
import { matchContractors } from '@/lib/dispatch/vendor-matching'
import { getSupabaseServiceClient } from '@/lib/supabase/server'
import type { MaintenanceClassification } from '@/types/domain'

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export async function POST(req: NextRequest) {
  // Accept either a Supabase session cookie (dashboard trigger)
  // or the AGENTS_SECRET_KEY header (cron / scheduler trigger)
  const secret = req.headers.get('x-agent-secret')
  if (secret !== process.env.AGENTS_SECRET_KEY) {
    // Fall back to checking if there's a valid Supabase session
    // (handled by middleware for dashboard-triggered runs)
    if (!req.cookies.get('sb-access-token') && !req.cookies.get('sb-auth-token')) {
      return unauthorized()
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
      .select('id, title, description, priority, property_id')
      .eq('id', ticketId)
      .single()

    if (ticketErr || !ticket) {
      await runner.fail('Ticket not found')
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    await runner.log('info', 'ticket_fetched', `Starting triage: "${ticket.title}"`, {
      entityType: 'maintenance_ticket', entityId: ticket.id, entityLabel: ticket.title,
    })
    runner.incrementProcessed()

    // ── 2. Classify with Claude ──────────────────────────────────────
    const messages   = buildMaintenanceTriageMessages(ticket.title, ticket.description ?? '')
    const aiResponse = await callClaudeJSON<MaintenanceClassification>(messages, {
      systemPrompt: MAINTENANCE_SYSTEM_PROMPT,
      maxTokens:    600,
    })

    runner.trackAIUsage(aiResponse)
    const c = aiResponse.content

    await runner.log(
      'success',
      'ticket_classified',
      `${c.priority} · ${c.category} — ${c.reasoning}`,
      {
        entityType:       'maintenance_ticket',
        entityId:         ticket.id,
        entityLabel:      ticket.title,
        aiModel:          aiResponse.model,
        promptTokens:     aiResponse.usage.promptTokens,
        completionTokens: aiResponse.usage.completionTokens,
        costUsd:          aiResponse.usage.costUsd,
        latencyMs:        aiResponse.latencyMs,
        outputSnapshot:   c as unknown as Record<string, unknown>,
      },
    )

    // ── 3. Update ticket ─────────────────────────────────────────────
    await sb.from('maintenance_tickets').update({
      ai_category:  c.category,
      ai_priority:  c.priority,
      ai_reasoning: c.reasoning,
      priority:     c.priority,
    }).eq('id', ticketId)

    await runner.log('info', 'ticket_updated', `Priority set to ${c.priority}`, {
      entityType: 'maintenance_ticket', entityId: ticket.id, entityLabel: ticket.title,
    })

    // ── 4. Dispatch if required ──────────────────────────────────────
    if (c.requires_immediate_dispatch) {
      const { data: rawContractors } = await sb
        .from('contractors')
        .select('id, company_name, trades, rating, total_jobs, insurance_expiry, status')
        .eq('consulting_client_id', consultingClientId)
        .eq('status', 'active')

      const matches = matchContractors(
        (rawContractors ?? []).map(ct => ({
          id:              ct.id,
          companyName:     ct.company_name,
          trades:          ct.trades ?? [],
          rating:          ct.rating,
          totalJobs:       ct.total_jobs,
          insuranceExpiry: ct.insurance_expiry ? new Date(ct.insurance_expiry) : null,
          status:          ct.status,
          openWorkOrders:  0,
        })),
        { requiredTrade: c.recommended_trade.toLowerCase() },
      )

      await runner.log('info', 'contractors_matched',
        `${matches.length} eligible contractor(s) found for trade: ${c.recommended_trade}`)

      if (matches.length > 0) {
        const top = matches[0]
        await runner.requestApproval({
          approvalType:    'vendor_dispatch',
          title:           `Dispatch ${top.companyName} → "${ticket.title}"`,
          description:     `${c.priority} ticket requires ${c.recommended_trade}. AI match score: ${top.matchScore}/100. Est. resolution: ${c.estimated_resolution_hours}h.${c.safety_concern ? ' ⚠️ Safety concern flagged.' : ''}`,
          aiRecommendation: `Dispatch ${top.companyName} immediately. They have a match score of ${top.matchScore}/100 for this trade. ${c.reasoning}`,
          aiConfidence:    top.matchScore / 100,
          entityType:      'maintenance_ticket',
          entityId:        ticket.id,
          entityLabel:     ticket.title,
          payload:         { ticketId: ticket.id, contractorId: top.contractorId, classification: c },
        })

        await runner.log('success', 'dispatch_approval_created',
          `Approval created — ${top.companyName} recommended (score ${top.matchScore}/100)`, {
            entityType: 'contractor',
            entityId:   top.contractorId,
            entityLabel: top.companyName,
          })
      } else {
        await runner.log('warn', 'no_contractors_available',
          `No active contractors found for trade: ${c.recommended_trade} — manual dispatch required`)
      }
    }

    await runner.complete(
      `Triaged "${ticket.title}" → ${c.priority} (${c.category})${c.requires_immediate_dispatch ? ' · dispatch approval created' : ''}`,
    )

    return NextResponse.json({ success: true, classification: c, runId: runner.runIdOrNull })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    await runner.fail(msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
