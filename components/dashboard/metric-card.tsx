'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { fadeUpVariants, cardHover } from '@/lib/utils/motion-variants'
import { cn } from '@/lib/utils/cn'
import type { MetricDelta } from '@/types/domain'

interface MetricCardProps {
  title:      string
  value:      string | number
  delta?:     MetricDelta
  icon:       LucideIcon
  iconColor?: 'emerald' | 'gold' | 'red' | 'blue'
  loading?:   boolean
  index?:     number
  children?:  React.ReactNode
  onClick?:   () => void
}

const iconColors = {
  emerald: 'bg-emerald-500/10 text-emerald-400',
  gold:    'bg-gold-500/10    text-gold-400',
  red:     'bg-red-500/10     text-red-400',
  blue:    'bg-blue-500/10    text-blue-400',
}

const deltaColors = {
  up:      'text-emerald-400',
  down:    'text-red-400',
  neutral: 'text-slate-500',
}

export function MetricCard({
  title,
  value,
  delta,
  icon: Icon,
  iconColor = 'emerald',
  loading   = false,
  index     = 0,
  children,
  onClick,
}: MetricCardProps) {
  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="skeleton w-10 h-10 rounded-lg" />
          <div className="skeleton w-16 h-4 rounded" />
        </div>
        <div className="skeleton w-24 h-8 rounded mb-2" />
        <div className="skeleton w-32 h-3 rounded" />
      </div>
    )
  }

  return (
    <motion.div
      variants={fadeUpVariants}
      initial="hidden"
      animate="visible"
      custom={index}
      whileHover={cardHover}
      onClick={onClick}
      className={cn(
        'bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-card-glow',
        onClick && 'cursor-pointer',
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', iconColors[iconColor])}>
          <Icon className="w-5 h-5" />
        </div>
        {delta && (
          <div className={cn('flex items-center gap-1 text-xs font-medium', deltaColors[delta.direction])}>
            {delta.direction === 'up'      && <TrendingUp   className="w-3.5 h-3.5" />}
            {delta.direction === 'down'    && <TrendingDown  className="w-3.5 h-3.5" />}
            {delta.direction === 'neutral' && <Minus         className="w-3.5 h-3.5" />}
            {delta.value > 0 && delta.direction === 'up'   && '+'}
            {delta.value}%
          </div>
        )}
      </div>

      <div className="mb-1">
        <span className="text-3xl font-bold text-slate-50 tabular-nums">{value}</span>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{title}</p>
        {delta && (
          <p className="text-xs text-slate-600">{delta.label}</p>
        )}
      </div>

      {children && <div className="mt-4">{children}</div>}
    </motion.div>
  )
}
