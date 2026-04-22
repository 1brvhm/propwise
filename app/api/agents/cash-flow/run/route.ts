import { NextRequest, NextResponse } from 'next/server'
import { AgentRunner } from '@/lib/ai/agent-runner'
import { callClaudeJSON } from '@/lib/ai/claude'
import {
  CASH_FLOW_SYSTEM_PROMPT,
  buildCashFlowMessages,
  type CashFlowAnalysis,
  type TenantForecastEntry,
} from '@/lib/ai/prompts/cash-flow'
import { calculateCashFlowForecast } from '@/lib/forecast/cash-flow'
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

  const { deployedAgentId, consultingClientId } = body

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
    await runner.log('info', 'agent_started', 'Cash Flow Forecasting Agent initializing…')

    // ── 1. Fetch active tenants with rent ─────────────────────────────
    const { data: tenants, error: tenantsErr } = await sb
      .from('tenants')
      .select('id, first_name, last_name, monthly_rent, health_score, lease_end_date, status')
      .eq('consulting_client_id', consultingClientId)
      .eq('status', 'active')
      .gt('monthly_rent', 0)

    if (tenantsErr) {
      await runner.fail(`Failed to fetch tenants: ${tenantsErr.message}`)
      return NextResponse.json({ error: tenantsErr.message }, { status: 500 })
    }

    const activeTenants = tenants ?? []
    await runner.log('info', 'tenants_fetched',
      `Loaded ${activeTenants.length} active tenant(s) with monthly rent`)
    runner.incrementProcessed(activeTenants.length)

    if (activeTenants.length === 0) {
      await runner.complete('No active tenants with rent — forecast skipped')
      return NextResponse.json({ success: true, message: 'No tenants to forecast', runId: runner.runIdOrNull })
    }

    // ── 2. Run the deterministic forecast ───────────────────────────
    const forecastInput = activeTenants.map(t => ({
      id:           t.id,
      monthlyRent:  Number(t.monthly_rent ?? 0),
      healthScore:  t.health_score,
      leaseEndDate: t.lease_end_date ? new Date(t.lease_end_date) : null,
      status:       t.status,
    }))

    const forecast = calculateCashFlowForecast({ tenants: forecastInput, forecastDays: 30 })

    await runner.log('success', 'forecast_calculated',
      `30-day expected: $${forecast.totalExpected.toFixed(0)} · optimistic: $${forecast.totalOptimistic.toFixed(0)} · at-risk: $${forecast.atRiskTotal.toFixed(0)}`)

    // ── 3. Build Claude input ────────────────────────────────────────
    const portfolioRentRoll = activeTenants.reduce((s, t) => s + Number(t.monthly_rent ?? 0), 0)

    const forecastEntries: TenantForecastEntry[] = activeTenants.map(t => {
      const rent = Number(t.monthly_rent ?? 0)
      const prob = t.health_score >= 80 ? 0.97
                 : t.health_score >= 60 ? 0.90
                 : t.health_score >= 40 ? 0.70 : 0.50

      const daysUntilLeaseEnd = t.lease_end_date
        ? Math.floor((new Date(t.lease_end_date).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
        : null

      return {
        id:                t.id,
        name:              `${t.first_name} ${t.last_name}`,
        monthlyRent:       rent,
        healthScore:       t.health_score,
        collectionProb:    prob,
        expectedUsd:       rent * prob,
        atRiskUsd:         rent * (1 - prob),
        leaseEndDate:      t.lease_end_date,
        daysUntilLeaseEnd: daysUntilLeaseEnd,
      }
    })

    // ── 4. Call Claude for analysis ──────────────────────────────────
    const aiResponse = await callClaudeJSON<CashFlowAnalysis>(
      buildCashFlowMessages({
        tenants:            forecastEntries,
        totalExpectedUsd:   forecast.totalExpected,
        totalOptimisticUsd: forecast.totalOptimistic,
        totalAtRiskUsd:     forecast.atRiskTotal,
        portfolioRentRoll,
      }),
      {
        systemPrompt: CASH_FLOW_SYSTEM_PROMPT,
        maxTokens:    900,
      },
    )

    runner.trackAIUsage(aiResponse)
    const analysis = aiResponse.content

    await runner.log('success', 'analysis_complete',
      `${analysis.cash_gap_risk.toUpperCase()} risk — ${analysis.summary}`, {
        aiModel:          aiResponse.model,
        promptTokens:     aiResponse.usage.promptTokens,
        completionTokens: aiResponse.usage.completionTokens,
        costUsd:          aiResponse.usage.costUsd,
        latencyMs:        aiResponse.latencyMs,
        outputSnapshot:   analysis as unknown as Record<string, unknown>,
      })

    // ── 5. Log individual risk items ─────────────────────────────────
    for (const risk of analysis.top_risks) {
      await runner.log('warn', 'collection_risk',
        `${risk.tenant_name}: ${risk.risk_reason} — $${risk.amount_at_risk_usd.toFixed(0)} at risk`)
    }

    // ── 6. Create approval for high/critical risk ────────────────────
    if (analysis.requires_manager_alert) {
      const gap = portfolioRentRoll - analysis.expected_collection_usd
      await runner.requestApproval({
        approvalType:     'budget_exception',
        title:            `⚠️ Cash Gap Risk — $${gap.toFixed(0)} projected shortfall`,
        description:      `${analysis.cash_gap_risk.toUpperCase()} risk: portfolio is projecting a $${gap.toFixed(0)} shortfall vs. full rent roll. ${analysis.top_risks.length} tenant(s) flagged as collection risks.`,
        aiRecommendation: analysis.recommended_actions.join('\n• '),
        aiConfidence:     analysis.collection_confidence_pct / 100,
        amountUsd:        gap,
        payload:          { analysis, forecast: { totalExpected: forecast.totalExpected, totalAtRisk: forecast.atRiskTotal } },
      })

      await runner.log('warn', 'manager_alert_created',
        `Budget exception approval created — $${gap.toFixed(0)} projected shortfall`)
    }

    // ── 7. Save outcome metrics ──────────────────────────────────────
    const today = new Date().toISOString().slice(0, 10)
    const monthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10)

    const metrics = [
      { type: 'expected_revenue_30d', value: forecast.totalExpected,   unit: 'usd'   },
      { type: 'at_risk_revenue_30d',  value: forecast.atRiskTotal,     unit: 'usd'   },
      { type: 'tenants_at_risk',      value: forecast.riskSummary.tenantsAtRisk, unit: 'count' },
      { type: 'collection_confidence', value: analysis.collection_confidence_pct, unit: 'percent' },
    ]

    await sb.from('outcome_metrics').upsert(
      metrics.map(m => ({
        consulting_client_id: consultingClientId,
        deployed_agent_id:    deployedAgentId,
        period_start:         today,
        period_end:           monthEnd,
        metric_type:          m.type,
        metric_value:         m.value,
        metric_unit:          m.unit,
      })),
      { onConflict: 'consulting_client_id,deployed_agent_id,period_start,metric_type' },
    )

    await runner.log('info', 'metrics_saved', `${metrics.length} outcome metric(s) saved to dashboard`)

    await runner.complete(
      `Forecast: $${forecast.totalExpected.toFixed(0)} expected · $${forecast.atRiskTotal.toFixed(0)} at risk · ${analysis.cash_gap_risk} risk level`,
    )

    return NextResponse.json({
      success:  true,
      forecast: { totalExpected: forecast.totalExpected, totalAtRisk: forecast.atRiskTotal },
      analysis,
      runId:    runner.runIdOrNull,
    })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    await runner.fail(msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
