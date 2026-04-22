'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import type { DayForecast } from '@/types/domain'
import { formatCurrency } from '@/lib/utils/currency'

interface ForecastChartProps {
  data: DayForecast[]
}

interface TooltipPayload {
  name: string
  value: number
  color: string
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
}) {
  if (!active || !payload || !payload.length || !label) return null

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 shadow-xl text-xs">
      <p className="font-medium text-slate-300 mb-2">
        {format(parseISO(label), 'MMM d, yyyy')}
      </p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
            <span className="text-slate-400 capitalize">{entry.name}</span>
          </div>
          <span className="font-medium text-slate-200 tabular-nums">
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function ForecastChart({ data }: ForecastChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <defs>
          <linearGradient id="optimistic" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#10b981" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0}    />
          </linearGradient>
          <linearGradient id="expected" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#059669" stopOpacity={0.3}  />
            <stop offset="95%" stopColor="#059669" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="pessimistic" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.1}  />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}    />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

        <XAxis
          dataKey="date"
          tickFormatter={(v: string) => format(parseISO(v), 'MMM d')}
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval={4}
        />
        <YAxis
          tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={48}
        />

        <Tooltip content={<CustomTooltip />} />

        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ paddingTop: 16, fontSize: 12, color: '#94a3b8' }}
        />

        <Area
          type="monotone"
          dataKey="optimisticRevenue"
          name="Optimistic"
          stroke="#34d399"
          strokeWidth={1}
          strokeDasharray="4 4"
          fill="url(#optimistic)"
        />
        <Area
          type="monotone"
          dataKey="expectedRevenue"
          name="Expected"
          stroke="#059669"
          strokeWidth={2.5}
          fill="url(#expected)"
        />
        <Area
          type="monotone"
          dataKey="pessimisticRevenue"
          name="Pessimistic"
          stroke="#ef4444"
          strokeWidth={1}
          strokeDasharray="4 4"
          fill="url(#pessimistic)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
