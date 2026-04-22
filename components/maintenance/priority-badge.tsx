import { cn } from '@/lib/utils/cn'
import type { Priority } from '@/types/domain'

const PRIORITY_CONFIG: Record<Priority, {
  label:  string
  bg:     string
  text:   string
  border: string
  dot:    string
}> = {
  P1: {
    label:  'P1 Emergency',
    bg:     'bg-red-500/10',
    text:   'text-red-400',
    border: 'border-red-500/30',
    dot:    'bg-red-500 animate-pulse',
  },
  P2: {
    label:  'P2 Urgent',
    bg:     'bg-orange-500/10',
    text:   'text-orange-400',
    border: 'border-orange-500/30',
    dot:    'bg-orange-500',
  },
  P3: {
    label:  'P3 Standard',
    bg:     'bg-gold-500/10',
    text:   'text-gold-500',
    border: 'border-gold-500/30',
    dot:    'bg-gold-500',
  },
  P4: {
    label:  'P4 Low',
    bg:     'bg-slate-700/50',
    text:   'text-slate-400',
    border: 'border-slate-600',
    dot:    'bg-slate-500',
  },
}

interface PriorityBadgeProps {
  priority:  Priority
  showDot?:  boolean
  className?: string
}

export function PriorityBadge({ priority, showDot = true, className }: PriorityBadgeProps) {
  const cfg = PRIORITY_CONFIG[priority]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-md border',
        cfg.bg, cfg.text, cfg.border,
        className,
      )}
    >
      {showDot && (
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} />
      )}
      {cfg.label}
    </span>
  )
}
