/**
 * lib/ai.ts — Simple maintenance classifier entry point.
 * Wraps the full Claude pipeline and returns a flat { urgency, category, action_taken } shape.
 * Suitable for webhook / external callers that don't need the full classification detail.
 */

import { callClaudeJSON } from '@/lib/ai/claude'
import {
  MAINTENANCE_SYSTEM_PROMPT,
  buildMaintenanceTriageMessages,
  type MaintenanceClassification,
} from '@/lib/ai/prompts/maintenance-triage'

export interface MaintenanceAnalysis {
  urgency:      'P1' | 'P2' | 'P3' | 'P4'
  category:     string
  action_taken: string
}

export async function classifyMaintenanceRequest(requestText: string): Promise<MaintenanceAnalysis> {
  const response = await callClaudeJSON<MaintenanceClassification>(
    buildMaintenanceTriageMessages(requestText, ''),
    { systemPrompt: MAINTENANCE_SYSTEM_PROMPT, maxTokens: 400 },
  )

  const c = response.content

  const action = c.requires_immediate_dispatch
    ? `Dispatched emergency ${c.recommended_trade.toLowerCase()}`
    : c.priority === 'P2'
    ? `Scheduled ${c.recommended_trade.toLowerCase()} within 24 hours`
    : `Queued for ${c.recommended_trade.toLowerCase()} (${c.estimated_resolution_hours}h SLA)`

  return {
    urgency:      c.priority as 'P1' | 'P2' | 'P3' | 'P4',
    category:     c.category,
    action_taken: action,
  }
}
