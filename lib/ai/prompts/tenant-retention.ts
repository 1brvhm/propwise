import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'

export const TENANT_RETENTION_SYSTEM_PROMPT = `
You are an expert tenant relations AI for a professional property management company.
Your goal is to help retain at-risk tenants by drafting proactive, warm, and professional outreach messages.

You will receive a tenant's health summary including:
- Their health score and risk tier (Critical / High / Medium)
- Key risk signals (late payments, low engagement, unresolved tickets)
- How long they have been a tenant

Write a personalized outreach message that:
1. Does NOT mention the health score or risk analysis directly
2. Opens warmly and references their tenancy length naturally
3. Addresses the most important concern tactfully (e.g., payment → offer payment plan; low engagement → check-in)
4. Ends with a clear, low-friction call to action
5. Sounds human — not robotic or corporate

Respond with a JSON object matching this schema exactly:
{
  "subject": "email subject line (concise, non-alarming)",
  "message": "full email body (2-3 short paragraphs, professional tone)",
  "urgency": "immediate|this_week|this_month",
  "primary_concern": "payment|engagement|maintenance|lease_expiry|general",
  "suggested_action": "brief internal note on what the property manager should do if no response in 3 days"
}
`.trim()

export interface TenantRetentionInput {
  firstName:         string
  lastName:          string
  healthScore:       number
  riskTier:          string
  monthsAsTenant:    number
  monthlyRent:       number
  paymentDetails:    string  // e.g. "2 late payments in last 6 months, avg 5 days late"
  openTickets:       number
  lastEngagementDays: number | null  // days since last engagement event (null = never)
  leaseEndDate:      string | null   // ISO date
}

export interface TenantRetentionClassification {
  subject:          string
  message:          string
  urgency:          'immediate' | 'this_week' | 'this_month'
  primary_concern:  string
  suggested_action: string
}

export function buildTenantRetentionMessages(input: TenantRetentionInput): MessageParam[] {
  const leaseNote = input.leaseEndDate
    ? `Lease expires: ${new Date(input.leaseEndDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
    : 'Lease end date: not recorded'

  const engagementNote = input.lastEngagementDays == null
    ? 'Last engagement: never recorded'
    : input.lastEngagementDays === 0
      ? 'Last engagement: today'
      : `Last engagement: ${input.lastEngagementDays} days ago`

  return [
    {
      role:    'user',
      content: `Draft a retention outreach for this tenant:

NAME: ${input.firstName} ${input.lastName}
TENURE: ${input.monthsAsTenant} months
MONTHLY RENT: $${input.monthlyRent.toFixed(2)}
RISK TIER: ${input.riskTier} (score: ${input.healthScore}/100)
PAYMENT HISTORY: ${input.paymentDetails}
OPEN MAINTENANCE TICKETS: ${input.openTickets}
${engagementNote}
${leaseNote}`,
    },
  ]
}
