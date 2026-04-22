import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'

export const CASH_FLOW_SYSTEM_PROMPT = `
You are an expert property financial analyst AI.
You will receive a 30-day rent collection forecast with tenant-level risk data.

Analyze the data and:
1. Identify the top 3 collection risks with specific reasoning
2. Calculate the realistic worst-case cash gap scenario
3. Provide 2-3 actionable recommendations the property manager should take NOW
4. Flag any tenants that need immediate intervention (lease expiring + poor score = double risk)

Respond with a JSON object matching this schema exactly:
{
  "summary": "2-sentence executive summary of the 30-day outlook",
  "expected_collection_usd": number,
  "worst_case_usd": number,
  "collection_confidence_pct": number,
  "cash_gap_risk": "none|low|moderate|high|critical",
  "top_risks": [
    {
      "tenant_name": "string",
      "risk_reason": "string",
      "amount_at_risk_usd": number
    }
  ],
  "recommended_actions": ["action 1", "action 2", "action 3"],
  "requires_manager_alert": boolean
}
`.trim()

export interface TenantForecastEntry {
  id:            string
  name:          string
  monthlyRent:   number
  healthScore:   number
  collectionProb: number
  expectedUsd:   number
  atRiskUsd:     number
  leaseEndDate:  string | null
  daysUntilLeaseEnd: number | null
}

export interface CashFlowInput {
  tenants:          TenantForecastEntry[]
  totalExpectedUsd: number
  totalOptimisticUsd: number
  totalAtRiskUsd:   number
  portfolioRentRoll: number
}

export interface CashFlowAnalysis {
  summary:                  string
  expected_collection_usd:  number
  worst_case_usd:           number
  collection_confidence_pct: number
  cash_gap_risk:            'none' | 'low' | 'moderate' | 'high' | 'critical'
  top_risks:                Array<{ tenant_name: string; risk_reason: string; amount_at_risk_usd: number }>
  recommended_actions:      string[]
  requires_manager_alert:   boolean
}

export function buildCashFlowMessages(input: CashFlowInput): MessageParam[] {
  const tenantLines = input.tenants.map(t => {
    const leaseNote = t.daysUntilLeaseEnd != null
      ? ` | Lease expires in ${t.daysUntilLeaseEnd}d`
      : ''
    return `- ${t.name}: $${t.monthlyRent}/mo | Score ${t.healthScore}/100 | ${Math.round(t.collectionProb * 100)}% prob | Expected $${t.expectedUsd.toFixed(0)} | At risk $${t.atRiskUsd.toFixed(0)}${leaseNote}`
  }).join('\n')

  return [
    {
      role:    'user',
      content: `Analyze this 30-day cash flow forecast:

TOTAL RENT ROLL: $${input.portfolioRentRoll.toFixed(0)}/month
EXPECTED COLLECTION: $${input.totalExpectedUsd.toFixed(0)}
OPTIMISTIC SCENARIO: $${input.totalOptimisticUsd.toFixed(0)}
TOTAL AT RISK: $${input.totalAtRiskUsd.toFixed(0)}

TENANT BREAKDOWN:
${tenantLines}`,
    },
  ]
}
