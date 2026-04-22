'use client'

import { motion } from 'framer-motion'
import type { TenantRiskTier } from '@/types/domain'

interface HealthScoreRingProps {
  score:        number
  size?:        number
  strokeWidth?: number
  className?:   string
}

const TIER_COLORS: Record<TenantRiskTier, string> = {
  low:      '#10b981',  // emerald-500
  medium:   '#f59e0b',  // gold-500
  high:     '#f97316',  // orange-500
  critical: '#ef4444',  // red-500
}

function riskTier(score: number): TenantRiskTier {
  if (score >= 75) return 'low'
  if (score >= 55) return 'medium'
  if (score >= 35) return 'high'
  return 'critical'
}

export function HealthScoreRing({
  score,
  size        = 64,
  strokeWidth = 6,
  className,
}: HealthScoreRingProps) {
  const tier         = riskTier(score)
  const color        = TIER_COLORS[tier]
  const radius       = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const targetOffset = circumference * (1 - score / 100)

  return (
    <div className={className} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1e293b"
          strokeWidth={strokeWidth}
        />
        {/* Animated progress */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: targetOffset }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.1 }}
        />
      </svg>
      {/* Score label */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ position: 'relative', marginTop: -(size) }}
      >
        <div
          className="flex flex-col items-center justify-center"
          style={{ width: size, height: size, marginTop: -(size) }}
        >
          {/* We render this on top using absolute positioning */}
        </div>
      </div>
    </div>
  )
}

/** Compact ring with score number overlay — the full self-contained widget */
export function HealthScoreWidget({
  score,
  size = 56,
}: { score: number; size?: number }) {
  const tier         = riskTier(score)
  const color        = TIER_COLORS[tier]
  const strokeWidth  = 5
  const radius       = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const targetOffset = circumference * (1 - score / 100)

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#1e293b" strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: targetOffset }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
        />
      </svg>
      <span
        className="relative text-xs font-bold tabular-nums"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  )
}
