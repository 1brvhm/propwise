'use client'

import { useState } from 'react'
import { Play, Loader2 } from 'lucide-react'

interface TriggerAgentButtonProps {
  deployedAgentId:    string
  consultingClientId: string
  agentType:          string
  /** For ticket-based agents, pass the ticketId */
  ticketId?:          string
  onSuccess?:         (runId: string) => void
}

const AGENT_ENDPOINTS: Record<string, string> = {
  maintenance_triage:    '/api/agents/maintenance-triage/run',
  tenant_retention:      '/api/agents/tenant-retention/run',
  contractor_dispatch:   '/api/agents/contractor-dispatch/run',
  cash_flow_forecasting: '/api/agents/cash-flow/run',
}

export function TriggerAgentButton({
  deployedAgentId,
  consultingClientId,
  agentType,
  ticketId,
  onSuccess,
}: TriggerAgentButtonProps) {
  const [loading, setLoading] = useState(false)
  const [status,  setStatus]  = useState<'idle' | 'success' | 'error'>('idle')

  const endpoint = AGENT_ENDPOINTS[agentType]
  if (!endpoint) return null

  async function trigger() {
    setLoading(true)
    setStatus('idle')
    try {
      const res = await fetch(endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ deployedAgentId, consultingClientId, ticketId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setStatus('error')
        console.error('Agent run failed:', data.error)
      } else {
        setStatus('success')
        onSuccess?.(data.runId)
        // Reset after 3s
        setTimeout(() => setStatus('idle'), 3000)
      }
    } catch {
      setStatus('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={trigger}
      disabled={loading}
      title="Trigger agent run"
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
        border transition-all disabled:opacity-50
        ${status === 'success'
          ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
          : status === 'error'
          ? 'border-red-500/40 text-red-400 bg-red-500/10'
          : 'border-slate-700 text-slate-400 hover:border-emerald-500/40 hover:text-emerald-400 hover:bg-emerald-500/5'
        }
      `}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Play className="w-3.5 h-3.5" />
      )}
      {loading ? 'Running…' : status === 'success' ? 'Started' : status === 'error' ? 'Failed' : 'Run now'}
    </button>
  )
}
