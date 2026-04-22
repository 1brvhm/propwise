import type { MessageParam } from '@anthropic-ai/sdk/resources/messages'

export const CONTRACTOR_DISPATCH_SYSTEM_PROMPT = `
You are an expert property maintenance dispatch AI.
You will receive a maintenance ticket and a ranked list of available contractors (pre-scored by an algorithm).

Your job is to:
1. Review the ticket urgency, required trade, and contractor options
2. Confirm or adjust the top recommendation with professional reasoning
3. Flag any concerns (e.g., insurance expiry, low availability, rating below 4.0)
4. Estimate a cost range based on job type and typical market rates

Respond with a JSON object matching this schema exactly:
{
  "recommended_contractor_id": "uuid of best match",
  "reasoning": "2-3 sentence professional justification",
  "confidence": number between 0.0 and 1.0,
  "concerns": ["list of concerns, empty array if none"],
  "estimated_cost_min_usd": number,
  "estimated_cost_max_usd": number,
  "estimated_duration_hours": number,
  "alternative_contractor_id": "uuid of second-best match, or null"
}
`.trim()

export interface ContractorOption {
  id:             string
  companyName:    string
  rating:         number | null
  totalJobs:      number
  insuranceValid: boolean
  openWorkOrders: number
  matchScore:     number
}

export interface DispatchInput {
  ticketTitle:       string
  ticketDescription: string
  priority:          string
  requiredTrade:     string
  contractors:       ContractorOption[]
}

export interface DispatchClassification {
  recommended_contractor_id:   string
  reasoning:                   string
  confidence:                  number
  concerns:                    string[]
  estimated_cost_min_usd:      number
  estimated_cost_max_usd:      number
  estimated_duration_hours:    number
  alternative_contractor_id:   string | null
}

export function buildDispatchMessages(input: DispatchInput): MessageParam[] {
  const contractorList = input.contractors
    .slice(0, 5)
    .map((c, i) =>
      `${i + 1}. ${c.companyName} (ID: ${c.id})
   Rating: ${c.rating != null ? `${c.rating}/5` : 'unrated'} | Jobs: ${c.totalJobs} | Match score: ${c.matchScore}/100
   Insurance: ${c.insuranceValid ? 'Valid' : 'EXPIRED/MISSING'} | Open work orders: ${c.openWorkOrders}`,
    )
    .join('\n\n')

  return [
    {
      role:    'user',
      content: `Recommend a contractor for this maintenance job:

TICKET: ${input.ticketTitle}
DESCRIPTION: ${input.ticketDescription}
PRIORITY: ${input.priority}
REQUIRED TRADE: ${input.requiredTrade}

AVAILABLE CONTRACTORS (ranked by match score):
${contractorList}`,
    },
  ]
}
