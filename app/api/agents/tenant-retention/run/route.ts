import { NextRequest, NextResponse } from 'next/server'
import { AgentRunner } from '@/lib/ai/agent-runner'
import { callClaudeJSON } from '@/lib/ai/claude'
import {
  TENANT_RETENTION_SYSTEM_PROMPT,
  buildTenantRetentionMessages,
  type TenantRetentionClassification,
} from '@/lib/ai/prompts/tenant-retention'
import { calculateTenantHealth } from '@/lib/scoring/tenant-health'
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

  const { deployedAgentId, consultingClientId, tenantId } = body

  if (!deployedAgentId || !consultingClientId) {
    return NextResponse.json(
      { error: 'deployedAgentId and consultingClientId are required' },
      { status: 400 },
    )
  }

  const sb     = await getSupabaseServiceClient()
  const runner = new AgentRunner({ deployedAgentId, consultingClientId, triggerType: 'scheduled' })

  try {
    await runner.start()
    await runner.log('info', 'agent_started', 'Tenant Retention Agent initializing…')

    // ── 1. Fetch tenants ─────────────────────────────────────────────
    let tenantsQuery = sb
      .from('tenants')
      .select('id, first_name, last_name, email, monthly_rent, health_score, lease_start_date, lease_end_date, status')
      .eq('consulting_client_id', consultingClientId)
      .eq('status', 'active')

    if (tenantId) tenantsQuery = tenantsQuery.eq('id', tenantId)

    const { data: tenants, error: tenantsErr } = await tenantsQuery
    if (tenantsErr) {
      await runner.fail(`Failed to fetch tenants: ${tenantsErr.message}`)
      return NextResponse.json({ error: tenantsErr.message }, { status: 500 })
    }

    await runner.log('info', 'tenants_fetched', `Processing ${(tenants ?? []).length} active tenant(s)`)

    const results: Array<{ tenantId: string; score: number; outreachCreated: boolean }> = []

    for (const tenant of tenants ?? []) {
      runner.incrementProcessed()

      // ── 2. Gather health score inputs ──────────────────────────────
      const [paymentsRes, ticketsRes, eventsRes] = await Promise.all([
        sb.from('payments')
          .select('status, days_late, due_date')
          .eq('tenant_id', tenant.id)
          .order('due_date', { ascending: false })
          .limit(24),
        sb.from('maintenance_tickets')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id)
          .not('status', 'in', '(resolved,closed,cancelled)'),
        sb.from('tenant_engagement_events')
          .select('occurred_at')
          .eq('tenant_id', tenant.id)
          .gte('occurred_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
          .order('occurred_at', { ascending: false }),
      ])

      const payments   = paymentsRes.data  ?? []
      const openTickets = ticketsRes.count ?? 0
      const events     = eventsRes.data    ?? []

      const lastEvent = events.length > 0 ? new Date(events[0].occurred_at) : null
      const daysSinceLastEvent = lastEvent
        ? Math.floor((Date.now() - lastEvent.getTime()) / (24 * 60 * 60 * 1000))
        : null

      // ── 3. Calculate health score ──────────────────────────────────
      const healthResult = calculateTenantHealth({
        recentPayments: payments.map(p => ({
          status:   p.status,
          daysLate: p.days_late,
          dueDate:  new Date(p.due_date),
        })),
        openTickets,
        averageResolutionDays: null,
        lastEngagementDate:          lastEvent,
        engagementEventsLast90Days:  events.length,
        leaseStartDate: tenant.lease_start_date ? new Date(tenant.lease_start_date) : null,
      })

      // ── 4. Persist updated scores ──────────────────────────────────
      await sb.from('tenants').update({
        health_score:     healthResult.composite,
        payment_score:    healthResult.payment,
        ticket_score:     healthResult.ticket,
        engagement_score: healthResult.engagement,
        lease_age_score:  healthResult.leaseAge,
      }).eq('id', tenant.id)

      await runner.log('success', 'score_updated',
        `${tenant.first_name} ${tenant.last_name} — score updated to ${healthResult.composite}/100 (${healthResult.riskTier})`, {
          entityType: 'tenant',
          entityId:   tenant.id,
          entityLabel: `${tenant.first_name} ${tenant.last_name}`,
        })

      // ── 5. Draft outreach for at-risk tenants ──────────────────────
      if (healthResult.composite < 60) {
        const leaseMonths = tenant.lease_start_date
          ? Math.floor((Date.now() - new Date(tenant.lease_start_date).getTime()) / (30.44 * 24 * 60 * 60 * 1000))
          : 0

        const latePayments = payments.filter(p => (p.days_late ?? 0) > 0)
        const avgLate = latePayments.length > 0
          ? (latePayments.reduce((s, p) => s + (p.days_late ?? 0), 0) / latePayments.length).toFixed(1)
          : '0'

        const paymentSummary = payments.length === 0
          ? 'No payment history recorded'
          : `${latePayments.length} late payment(s) in last ${payments.length} months, avg ${avgLate} days late`

        const aiResponse = await callClaudeJSON<TenantRetentionClassification>(
          buildTenantRetentionMessages({
            firstName:          tenant.first_name,
            lastName:           tenant.last_name,
            healthScore:        healthResult.composite,
            riskTier:           healthResult.riskTier,
            monthsAsTenant:     leaseMonths,
            monthlyRent:        Number(tenant.monthly_rent ?? 0),
            paymentDetails:     paymentSummary,
            openTickets,
            lastEngagementDays: daysSinceLastEvent,
            leaseEndDate:       tenant.lease_end_date,
          }),
          {
            systemPrompt: TENANT_RETENTION_SYSTEM_PROMPT,
            maxTokens:    800,
          },
        )

        runner.trackAIUsage(aiResponse)
        const outreach = aiResponse.content

        await runner.requestApproval({
          approvalType:     'tenant_outreach',
          title:            `Outreach: ${tenant.first_name} ${tenant.last_name} (${healthResult.riskTier})`,
          description:      `${healthResult.riskTier} tenant (score ${healthResult.composite}/100). AI drafted a ${outreach.urgency.replace('_', ' ')} outreach email regarding ${outreach.primary_concern}.`,
          aiRecommendation: `Subject: "${outreach.subject}"\n\n${outreach.message}\n\n---\nIf no response: ${outreach.suggested_action}`,
          aiConfidence:     healthResult.composite >= 35 ? 0.85 : 0.70,
          entityType:       'tenant',
          entityId:         tenant.id,
          entityLabel:      `${tenant.first_name} ${tenant.last_name}`,
          payload:          { outreach, healthScore: healthResult.composite, riskTier: healthResult.riskTier },
        })

        await runner.log('success', 'outreach_drafted',
          `Outreach approval created for ${tenant.first_name} ${tenant.last_name} — urgency: ${outreach.urgency}`, {
            entityType:       'tenant',
            entityId:         tenant.id,
            entityLabel:      `${tenant.first_name} ${tenant.last_name}`,
            aiModel:          aiResponse.model,
            promptTokens:     aiResponse.usage.promptTokens,
            completionTokens: aiResponse.usage.completionTokens,
            costUsd:          aiResponse.usage.costUsd,
            latencyMs:        aiResponse.latencyMs,
          })

        results.push({ tenantId: tenant.id, score: healthResult.composite, outreachCreated: true })
      } else {
        results.push({ tenantId: tenant.id, score: healthResult.composite, outreachCreated: false })
      }
    }

    const atRisk = results.filter(r => r.outreachCreated).length
    await runner.complete(
      `Scored ${results.length} tenant(s) — ${atRisk} at-risk outreach approval(s) created`,
    )

    return NextResponse.json({ success: true, results, runId: runner.runIdOrNull })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    await runner.fail(msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
