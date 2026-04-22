/**
 * AgentRunner — shared execution context for all AI agent API routes.
 *
 * Responsibilities:
 *  - Creates and owns an `agent_runs` record
 *  - Streams structured entries to `execution_logs`
 *  - Creates `pending_approvals` for human review
 *  - Tracks token usage and cost across the entire run
 *  - Updates the run record to completed/failed on teardown
 *
 * All DB writes use the service-role client (bypasses RLS).
 * Never instantiate this in browser code.
 */

import { getSupabaseServiceClient } from '@/lib/supabase/server'
import type { AIResponse } from './types'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success'
export type ApprovalType =
  | 'vendor_dispatch'
  | 'invoice_payment'
  | 'tenant_outreach'
  | 'maintenance_escalation'
  | 'budget_exception'

export interface AgentRunnerConfig {
  deployedAgentId:    string
  consultingClientId: string
  triggerType?:       'scheduled' | 'manual' | 'webhook' | 'event'
}

export interface LogOptions {
  entityType?:     string
  entityId?:       string
  entityLabel?:    string
  aiModel?:        string
  promptTokens?:   number
  completionTokens?: number
  costUsd?:        number
  latencyMs?:      number
  inputSnapshot?:  Record<string, unknown>
  outputSnapshot?: Record<string, unknown>
}

export interface ApprovalRequest {
  approvalType:    ApprovalType
  title:           string
  description:     string
  aiRecommendation: string
  aiConfidence?:   number
  amountUsd?:      number
  entityType?:     string
  entityId?:       string
  entityLabel?:    string
  payload?:        Record<string, unknown>
}

export class AgentRunner {
  private runId:          string | null = null
  private seqNum          = 0
  private totalTokens     = 0
  private totalCostUsd    = 0
  private itemsProcessed  = 0
  private itemsActioned   = 0

  constructor(private readonly config: AgentRunnerConfig) {}

  async start(): Promise<string> {
    const sb = await getSupabaseServiceClient()
    const { data, error } = await sb
      .from('agent_runs')
      .insert({
        deployed_agent_id:    this.config.deployedAgentId,
        consulting_client_id: this.config.consultingClientId,
        status:               'running',
        trigger_type:         this.config.triggerType ?? 'manual',
      })
      .select('id')
      .single()

    if (error) throw new Error(`Failed to start agent run: ${error.message}`)
    this.runId = data.id as string
    return this.runId
  }

  async log(
    level:     LogLevel,
    eventType: string,
    message:   string,
    opts:      LogOptions = {},
  ): Promise<void> {
    if (!this.runId) throw new Error('AgentRunner.start() must be called first')
    const runId = this.runId
    const sb = await getSupabaseServiceClient()
    await sb.from('execution_logs').insert({
      agent_run_id:         runId,
      consulting_client_id: this.config.consultingClientId,
      deployed_agent_id:    this.config.deployedAgentId,
      sequence_num:         ++this.seqNum,
      log_level:            level,
      event_type:           eventType,
      message,
      entity_type:          opts.entityType      ?? null,
      entity_id:            opts.entityId        ?? null,
      entity_label:         opts.entityLabel     ?? null,
      ai_model:             opts.aiModel         ?? null,
      prompt_tokens:        opts.promptTokens    ?? null,
      completion_tokens:    opts.completionTokens ?? null,
      cost_usd:             opts.costUsd         ?? null,
      latency_ms:           opts.latencyMs       ?? null,
      input_snapshot:       (opts.inputSnapshot  ?? null) as import('@/types/database').Json | null,
      output_snapshot:      (opts.outputSnapshot ?? null) as import('@/types/database').Json | null,
    })
  }

  trackAIUsage(response: AIResponse<unknown>): void {
    this.totalTokens  += response.usage.promptTokens + response.usage.completionTokens
    this.totalCostUsd += response.usage.costUsd
  }

  incrementProcessed(n = 1): void { this.itemsProcessed += n }
  incrementActioned(n = 1):  void { this.itemsActioned  += n }

  async requestApproval(req: ApprovalRequest): Promise<string> {
    if (!this.runId) throw new Error('AgentRunner.start() must be called first')
    const runId = this.runId
    const sb = await getSupabaseServiceClient()
    const { data, error } = await sb
      .from('pending_approvals')
      .insert({
        agent_run_id:         runId,
        consulting_client_id: this.config.consultingClientId,
        deployed_agent_id:    this.config.deployedAgentId,
        approval_type:        req.approvalType,
        title:                req.title,
        description:          req.description,
        ai_recommendation:    req.aiRecommendation,
        ai_confidence:        req.aiConfidence  ?? null,
        amount_usd:           req.amountUsd     ?? null,
        entity_type:          req.entityType    ?? null,
        entity_id:            req.entityId      ?? null,
        entity_label:         req.entityLabel   ?? null,
        payload:              (req.payload ?? {}) as import('@/types/database').Json,
      })
      .select('id')
      .single()

    if (error) throw new Error(`Failed to create approval: ${error.message}`)
    this.incrementActioned()
    return data.id
  }

  async complete(summary: string): Promise<void> {
    if (!this.runId) return
    const sb = await getSupabaseServiceClient()
    await sb.from('agent_runs').update({
      status:          'completed',
      completed_at:    new Date().toISOString(),
      total_tokens:    this.totalTokens,
      total_cost_usd:  this.totalCostUsd,
      items_processed: this.itemsProcessed,
      items_actioned:  this.itemsActioned,
      summary,
    }).eq('id', this.runId)
  }

  async fail(errorMessage: string): Promise<void> {
    if (!this.runId) return
    const sb = await getSupabaseServiceClient()
    await sb.from('agent_runs').update({
      status:          'failed',
      completed_at:    new Date().toISOString(),
      total_tokens:    this.totalTokens,
      total_cost_usd:  this.totalCostUsd,
      items_processed: this.itemsProcessed,
      items_actioned:  this.itemsActioned,
      error_message:   errorMessage,
    }).eq('id', this.runId)
  }

  get runIdOrNull() { return this.runId }
}
