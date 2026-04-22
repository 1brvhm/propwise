'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { CheckCircle2, AlertTriangle, XCircle, Info, Zap } from 'lucide-react'

type LogEntry = {
  id:            string
  sequence_num:  number
  log_level:     'debug' | 'info' | 'warn' | 'error' | 'success'
  event_type:    string
  message:       string
  entity_label:  string | null
  ai_model:      string | null
  latency_ms:    number | null
  cost_usd:      number | null
  created_at:    string
  deployed_agents: {
    agent_type:   string
    display_name: string
  } | null
}

const LEVEL = {
  debug:   { icon: Info,          color: 'text-slate-500', dot: 'bg-slate-600'   },
  info:    { icon: Info,          color: 'text-slate-300', dot: 'bg-slate-500'   },
  warn:    { icon: AlertTriangle, color: 'text-gold-400',  dot: 'bg-gold-500'    },
  error:   { icon: XCircle,       color: 'text-red-400',   dot: 'bg-red-500'     },
  success: { icon: CheckCircle2,  color: 'text-emerald-400', dot: 'bg-emerald-500' },
}

const AGENT_COLOR: Record<string, string> = {
  maintenance_triage:    'text-red-400',
  tenant_retention:      'text-emerald-400',
  contractor_dispatch:   'text-gold-400',
  cash_flow_forecasting: 'text-blue-400',
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 5)  return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

interface LiveExecutionLogsProps {
  limit?:   number
  compact?: boolean
  agentId?: string
}

export function LiveExecutionLogs({ limit = 50, compact = false, agentId }: LiveExecutionLogsProps) {
  const [logs,    setLogs]    = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const bottomRef             = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    async function loadInitial() {
      let query = supabase
        .from('execution_logs')
        .select(`
          id, sequence_num, log_level, event_type, message,
          entity_label, ai_model, latency_ms, cost_usd, created_at,
          deployed_agents ( agent_type, display_name )
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (agentId) query = query.eq('deployed_agent_id', agentId)

      const { data } = await query
      setLogs(((data as LogEntry[]) ?? []).reverse())
      setLoading(false)
    }

    loadInitial()

    const channel = supabase
      .channel('execution_logs_live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'execution_logs' },
        async (payload) => {
          const id = (payload.new as { id: string }).id
          const { data } = await supabase
            .from('execution_logs')
            .select(`
              id, sequence_num, log_level, event_type, message,
              entity_label, ai_model, latency_ms, cost_usd, created_at,
              deployed_agents ( agent_type, display_name )
            `)
            .eq('id', id)
            .single()
          if (data) {
            setLogs(prev => [...prev.slice(-(limit - 1)), data as LogEntry])
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
          }
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [limit, agentId])

  if (loading) {
    return (
      <div className="space-y-1.5 p-4">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton h-9 rounded-lg" />
        ))}
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-3">
          <Zap className="w-5 h-5 text-slate-600" />
        </div>
        <p className="text-sm font-medium text-slate-400">No activity yet</p>
        <p className="text-xs text-slate-600 mt-1">Agent executions will stream here in real time.</p>
      </div>
    )
  }

  return (
    <div className="font-mono text-xs space-y-px">
      <AnimatePresence initial={false}>
        {logs.map((log) => {
          const cfg        = LEVEL[log.log_level] ?? LEVEL.info
          const LevelIcon  = cfg.icon
          const agentColor = log.deployed_agents
            ? AGENT_COLOR[log.deployed_agents.agent_type] ?? 'text-slate-400'
            : 'text-slate-500'

          return (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="flex items-start gap-3 px-4 py-2.5 hover:bg-slate-800/40 rounded-lg transition-colors"
            >
              {/* Level indicator */}
              <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                <LevelIcon className={`w-3 h-3 ${cfg.color}`} />
              </div>

              {/* Body */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {log.deployed_agents && !compact && (
                    <span className={`font-semibold uppercase tracking-widest text-[10px] ${agentColor}`}>
                      {log.deployed_agents.display_name}
                    </span>
                  )}
                  <span className="text-slate-500 text-[10px] uppercase tracking-wider">
                    {log.event_type.replace(/_/g, '​ ')}
                  </span>
                  {log.entity_label && (
                    <span className="text-slate-400">&#8594; {log.entity_label}</span>
                  )}
                </div>
                <p className={`mt-0.5 leading-snug ${cfg.color}`}>{log.message}</p>
                {(log.latency_ms || log.cost_usd) && (
                  <div className="flex items-center gap-3 mt-0.5 text-[10px] text-slate-600">
                    {log.ai_model  && <span>{log.ai_model}</span>}
                    {log.latency_ms && <span>{log.latency_ms}ms</span>}
                    {log.cost_usd  && <span>${(log.cost_usd * 1000).toFixed(3)}m</span>}
                  </div>
                )}
              </div>

              {/* Timestamp */}
              <span className="text-[10px] text-slate-600 shrink-0 pt-0.5 tabular-nums whitespace-nowrap">
                {timeAgo(log.created_at)}
              </span>
            </motion.div>
          )
        })}
      </AnimatePresence>
      <div ref={bottomRef} />
    </div>
  )
}
