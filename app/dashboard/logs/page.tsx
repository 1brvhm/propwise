'use client'

import { useState } from 'react'
import { Terminal, Circle } from 'lucide-react'
import { LiveExecutionLogs } from '@/components/command-center/live-execution-logs'

const AGENT_FILTERS = [
  { value: '',                       label: 'All Agents'   },
  { value: 'maintenance_triage',     label: 'Maintenance'  },
  { value: 'tenant_retention',       label: 'Tenant'       },
  { value: 'contractor_dispatch',    label: 'Contractor'   },
  { value: 'cash_flow_forecasting',  label: 'Cash Flow'    },
]

const LEVEL_FILTERS = [
  { value: '',        label: 'All Levels' },
  { value: 'success', label: 'Success'   },
  { value: 'info',    label: 'Info'      },
  { value: 'warn',    label: 'Warning'   },
  { value: 'error',   label: 'Error'     },
]

export default function LogsPage() {
  const [agentFilter, setAgentFilter] = useState('')

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Execution Logs</h1>
          <p className="text-sm text-slate-400 mt-1">
            Live stream of every AI agent action, decision, and API call.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
          <Circle className="w-2 h-2 fill-emerald-400 animate-pulse" />
          STREAMING
        </div>
      </div>

      {/* Agent filters */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Filter by agent</p>
        <div className="flex items-center gap-2 flex-wrap">
          {AGENT_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setAgentFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                agentFilter === f.value
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                  : 'border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-400'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Terminal panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800 flex items-center gap-3">
          {/* Traffic lights */}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-gold-500/60" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <Terminal className="w-3.5 h-3.5" />
            <span className="text-xs font-mono">workflow_execution.log</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono text-emerald-500">LIVE</span>
          </div>
        </div>
        <div className="max-h-[640px] overflow-y-auto py-2">
          <LiveExecutionLogs limit={150} agentId={agentFilter || undefined} />
        </div>
      </div>

    </div>
  )
}
