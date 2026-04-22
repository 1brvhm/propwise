'use client'

import { useEffect, useState } from 'react'
import { Bot, Zap, CheckSquare, DollarSign, Circle } from 'lucide-react'
import { motion } from 'framer-motion'
import { MetricCard } from '@/components/dashboard/metric-card'
import { Badge } from '@/components/ui/badge'
import { LiveExecutionLogs } from '@/components/command-center/live-execution-logs'
import { TriggerAgentButton } from '@/components/command-center/trigger-agent-button'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import Link from 'next/link'

type DeployedAgent = {
  id:            string
  agent_type:    string
  display_name:  string
  description:   string | null
  status:        'active' | 'paused' | 'error' | 'inactive'
  last_run_at:   string | null
  total_runs:    number
  total_cost_usd: number
}

const AGENT_THEME: Record<string, { accent: string; bg: string; dot: string }> = {
  maintenance_triage:    { accent: 'text-red-400',     bg: 'bg-red-500/10',     dot: 'bg-red-500'     },
  tenant_retention:      { accent: 'text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-500' },
  contractor_dispatch:   { accent: 'text-gold-400',    bg: 'bg-gold-500/10',    dot: 'bg-gold-500'    },
  cash_flow_forecasting: { accent: 'text-blue-400',    bg: 'bg-blue-500/10',    dot: 'bg-blue-500'    },
}

const STATUS_VARIANT: Record<string, 'emerald' | 'gold' | 'red' | 'slate'> = {
  active:   'emerald',
  paused:   'gold',
  error:    'red',
  inactive: 'slate',
}

function timeAgo(iso: string | null) {
  if (!iso) return 'Never run'
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function CommandCenterPage() {
  const [loading,          setLoading]          = useState(true)
  const [agents,           setAgents]           = useState<DeployedAgent[]>([])
  const [runsToday,        setRunsToday]        = useState(0)
  const [pendingApprovals, setPendingApprovals] = useState(0)
  const [costToday,        setCostToday]        = useState(0)
  const [clientId,         setClientId]         = useState('')

  useEffect(() => {
    async function load() {
      const supabase    = getSupabaseBrowserClient()
      const todayStart  = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: membership } = await supabase
          .from('client_users')
          .select('consulting_client_id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle()
        if (membership) setClientId(membership.consulting_client_id)
      }

      const [agentsRes, runsRes, approvalsRes] = await Promise.all([
        supabase
          .from('deployed_agents')
          .select('id, agent_type, display_name, description, status, last_run_at, total_runs, total_cost_usd')
          .order('created_at', { ascending: true }),
        supabase
          .from('agent_runs')
          .select('id, total_cost_usd', { count: 'exact' })
          .gte('started_at', todayStart.toISOString()),
        supabase
          .from('pending_approvals')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
      ])

      const runs = runsRes.data ?? []
      setCostToday(runs.reduce((s, r) => s + Number(r.total_cost_usd ?? 0), 0))
      setAgents((agentsRes.data as DeployedAgent[]) ?? [])
      setRunsToday(runsRes.count ?? 0)
      setPendingApprovals(approvalsRes.count ?? 0)
      setLoading(false)
    }
    load()
  }, [])

  const activeCount = agents.filter(a => a.status === 'active').length

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">AI Command Center</h1>
          <p className="text-sm text-slate-400 mt-1">Live status of all deployed AI agents and their executions.</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-400">
          <Circle className="w-2 h-2 fill-emerald-400 animate-pulse" />
          LIVE
        </div>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          title="Active Agents"
          value={activeCount}
          icon={Bot}
          iconColor="emerald"
          index={0}
          loading={loading}
        />
        <MetricCard
          title="Runs Today"
          value={runsToday}
          icon={Zap}
          iconColor="gold"
          index={1}
          loading={loading}
        />
        <MetricCard
          title="Pending Approvals"
          value={pendingApprovals}
          icon={CheckSquare}
          iconColor={pendingApprovals > 0 ? 'red' : 'emerald'}
          index={2}
          loading={loading}
        />
        <MetricCard
          title="AI Cost (today)"
          value={loading ? '—' : `$${costToday.toFixed(4)}`}
          icon={DollarSign}
          iconColor="gold"
          index={3}
          loading={loading}
        />
      </div>

      {/* Deployed Agents Grid */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Deployed Agents</h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="skeleton h-44 rounded-xl" />
            ))}
          </div>
        ) : agents.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col items-center justify-center py-16 text-center">
            <Bot className="w-8 h-8 text-slate-600 mb-3" />
            <p className="text-sm font-medium text-slate-400">No agents deployed</p>
            <p className="text-xs text-slate-600 mt-1">Contact your agency team to activate AI workflows.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {agents.map((agent, i) => {
              const theme = AGENT_THEME[agent.agent_type] ?? AGENT_THEME.maintenance_triage
              return (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-9 h-9 rounded-lg ${theme.bg} flex items-center justify-center`}>
                      <div className={`w-2 h-2 rounded-full ${theme.dot} ${agent.status === 'active' ? 'animate-pulse' : ''}`} />
                    </div>
                    <Badge variant={STATUS_VARIANT[agent.status]}>{agent.status}</Badge>
                  </div>
                  <p className="text-sm font-semibold text-slate-100 leading-tight">{agent.display_name}</p>
                  {agent.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{agent.description}</p>
                  )}
                  <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-slate-600">Total runs</p>
                      <p className="text-slate-300 font-medium tabular-nums">{agent.total_runs}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Last run</p>
                      <p className="text-slate-300 font-medium">{timeAgo(agent.last_run_at)}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    {clientId && (
                      <TriggerAgentButton
                        deployedAgentId={agent.id}
                        consultingClientId={clientId}
                        agentType={agent.agent_type}
                      />
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Live Activity Feed */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-sm font-semibold text-slate-100">Live Activity</h3>
          </div>
          <Link
            href="/dashboard/logs"
            className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors"
          >
            Full logs →
          </Link>
        </div>
        <div className="max-h-72 overflow-y-auto py-2">
          <LiveExecutionLogs limit={20} compact />
        </div>
      </div>

    </div>
  )
}
