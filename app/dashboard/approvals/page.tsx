'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckSquare, Clock, DollarSign, AlertTriangle, Loader2 } from 'lucide-react'
import { MetricCard } from '@/components/dashboard/metric-card'
import { Badge } from '@/components/ui/badge'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

type Approval = {
  id:               string
  approval_type:    string
  title:            string
  description:      string
  ai_recommendation: string
  ai_confidence:    number | null
  amount_usd:       number | null
  entity_label:     string | null
  status:           string
  expires_at:       string | null
  created_at:       string
  deployed_agents:  { display_name: string; agent_type: string } | null
}

const TYPE_LABEL: Record<string, string> = {
  vendor_dispatch:         'Vendor Dispatch',
  invoice_payment:         'Invoice Payment',
  tenant_outreach:         'Tenant Outreach',
  maintenance_escalation:  'Escalation',
  budget_exception:        'Budget Exception',
}

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

export default function ApprovalsPage() {
  const [approvals,    setApprovals]    = useState<Approval[]>([])
  const [loading,      setLoading]      = useState(true)
  const [actionId,     setActionId]     = useState<string | null>(null)

  const loadApprovals = useCallback(async () => {
    const supabase = getSupabaseBrowserClient()
    const { data } = await supabase
      .from('pending_approvals')
      .select(`
        id, approval_type, title, description, ai_recommendation,
        ai_confidence, amount_usd, entity_label, status, expires_at, created_at,
        deployed_agents ( display_name, agent_type )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    setApprovals((data as Approval[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadApprovals() }, [loadApprovals])

  async function decide(id: string, decision: 'approved' | 'rejected') {
    setActionId(id)
    const supabase = getSupabaseBrowserClient()
    await supabase
      .from('pending_approvals')
      .update({ status: decision, reviewed_at: new Date().toISOString() })
      .eq('id', id)
    setActionId(null)
    await loadApprovals()
  }

  const pending    = approvals.length
  const financial  = approvals.filter(a => a.amount_usd != null).length
  const dispatches = approvals.filter(a => a.approval_type === 'vendor_dispatch').length
  const escalations= approvals.filter(a => a.approval_type === 'maintenance_escalation').length

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      <div>
        <h1 className="text-2xl font-bold text-slate-50">Pending Approvals</h1>
        <p className="text-sm text-slate-400 mt-1">
          AI-generated actions waiting for your sign-off before execution.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard title="Awaiting Review"  value={pending}     icon={Clock}         iconColor="gold"    index={0} loading={loading} />
        <MetricCard title="Financial"        value={financial}   icon={DollarSign}    iconColor="emerald" index={1} loading={loading} />
        <MetricCard title="Dispatches"       value={dispatches}  icon={CheckSquare}   iconColor="emerald" index={2} loading={loading} />
        <MetricCard title="Escalations"      value={escalations} icon={AlertTriangle} iconColor="red"     index={3} loading={loading} />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-slate-100">Review Queue</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Each decision triggers the downstream AI workflow action immediately
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
          </div>
        ) : approvals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <CheckSquare className="w-10 h-10 text-slate-700 mb-3" />
            <p className="text-sm font-medium text-slate-400">Queue is clear</p>
            <p className="text-xs text-slate-600 mt-1">
              No pending approvals — agents are running autonomously.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {approvals.map(a => (
              <div key={a.id} className="px-5 py-5 space-y-3">

                {/* Header row */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <Badge variant="gold">{TYPE_LABEL[a.approval_type] ?? a.approval_type}</Badge>
                      {a.deployed_agents && (
                        <span className="text-xs text-slate-500">{a.deployed_agents.display_name}</span>
                      )}
                      {a.entity_label && (
                        <span className="text-xs text-slate-400">· {a.entity_label}</span>
                      )}
                      {a.amount_usd != null && (
                        <span className="text-xs font-semibold text-gold-400">
                          ${a.amount_usd.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-slate-100">{a.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{a.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {a.ai_confidence != null && (
                      <>
                        <p className="text-[10px] text-slate-600 uppercase tracking-wider">AI confidence</p>
                        <p className="text-lg font-bold text-emerald-400 tabular-nums">
                          {Math.round(a.ai_confidence * 100)}%
                        </p>
                      </>
                    )}
                    <p className="text-[10px] text-slate-600 mt-0.5">{timeAgo(a.created_at)}</p>
                  </div>
                </div>

                {/* AI recommendation */}
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-lg px-4 py-3">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    AI Recommendation
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">{a.ai_recommendation}</p>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => decide(a.id, 'approved')}
                    disabled={actionId === a.id}
                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all disabled:opacity-40"
                  >
                    {actionId === a.id ? 'Processing…' : '✓ Approve'}
                  </button>
                  <button
                    onClick={() => decide(a.id, 'rejected')}
                    disabled={actionId === a.id}
                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40 transition-all disabled:opacity-40"
                  >
                    ✕ Reject
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
