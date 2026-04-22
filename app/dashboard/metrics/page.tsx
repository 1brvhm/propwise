'use client'

import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, DollarSign, Clock, Loader2 } from 'lucide-react'
import { MetricCard } from '@/components/dashboard/metric-card'
import { Badge } from '@/components/ui/badge'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

type Metric = {
  id:                   string
  deployed_agent_id:    string
  period_start:         string
  period_end:           string
  metric_type:          string
  metric_value:         number
  metric_unit:          string | null
  improvement_pct:      number | null
  deployed_agents:      { display_name: string; agent_type: string } | null
}

const UNIT_FORMAT: Record<string, (v: number) => string> = {
  usd:     v => `$${v.toFixed(2)}`,
  count:   v => String(Math.round(v)),
  hours:   v => `${v.toFixed(1)}h`,
  percent: v => `${v.toFixed(1)}%`,
}

const AGENT_COLOR: Record<string, string> = {
  maintenance_triage:    'text-red-400',
  tenant_retention:      'text-emerald-400',
  contractor_dispatch:   'text-gold-400',
  cash_flow_forecasting: 'text-blue-400',
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseBrowserClient()
      const { data } = await supabase
        .from('outcome_metrics')
        .select(`
          id, deployed_agent_id, period_start, period_end,
          metric_type, metric_value, metric_unit, improvement_pct,
          deployed_agents ( display_name, agent_type )
        `)
        .order('period_start', { ascending: false })
        .limit(100)
      setMetrics((data as Metric[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const totalSaved   = metrics
    .filter(m => m.metric_unit === 'usd')
    .reduce((s, m) => s + m.metric_value, 0)
  const avgImprovement = metrics.filter(m => m.improvement_pct != null).length > 0
    ? metrics
        .filter(m => m.improvement_pct != null)
        .reduce((s, m) => s + (m.improvement_pct ?? 0), 0)
        / metrics.filter(m => m.improvement_pct != null).length
    : null

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      <div>
        <h1 className="text-2xl font-bold text-slate-50">Outcome Metrics</h1>
        <p className="text-sm text-slate-400 mt-1">
          Measured impact of your AI agents across all workflows.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          title="Total Cost Saved"
          value={loading ? '—' : `$${totalSaved.toFixed(0)}`}
          icon={DollarSign}
          iconColor="gold"
          index={0}
          loading={loading}
        />
        <MetricCard
          title="Avg Improvement"
          value={avgImprovement != null ? `${avgImprovement.toFixed(1)}%` : '—'}
          icon={TrendingUp}
          iconColor="emerald"
          index={1}
          loading={loading}
        />
        <MetricCard
          title="Metrics Tracked"
          value={metrics.length}
          icon={BarChart3}
          iconColor="emerald"
          index={2}
          loading={loading}
        />
        <MetricCard
          title="Time Periods"
          value={new Set(metrics.map(m => m.period_start)).size}
          icon={Clock}
          iconColor="gold"
          index={3}
          loading={loading}
        />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-slate-100">Recorded Outcomes</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Sorted by most recent period — written by agent runs
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
          </div>
        ) : metrics.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BarChart3 className="w-10 h-10 text-slate-700 mb-3" />
            <p className="text-sm font-medium text-slate-400">No outcomes recorded yet</p>
            <p className="text-xs text-slate-600 mt-1">
              Metrics are written automatically as agents complete runs.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {metrics.map(m => {
              const fmt         = UNIT_FORMAT[m.metric_unit ?? 'count'] ?? UNIT_FORMAT.count
              const agentColor  = m.deployed_agents
                ? AGENT_COLOR[m.deployed_agents.agent_type] ?? 'text-slate-400'
                : 'text-slate-400'

              return (
                <div key={m.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      {m.deployed_agents && (
                        <span className={`text-xs font-semibold ${agentColor}`}>
                          {m.deployed_agents.display_name}
                        </span>
                      )}
                      <span className="text-xs text-slate-500">
                        {m.metric_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      {new Date(m.period_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {' – '}
                      {new Date(m.period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-slate-100 tabular-nums">
                      {fmt(m.metric_value)}
                    </p>
                    {m.improvement_pct != null && (
                      <Badge variant={m.improvement_pct >= 0 ? 'emerald' : 'red'}>
                        {m.improvement_pct >= 0 ? '+' : ''}{m.improvement_pct.toFixed(1)}%
                      </Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
