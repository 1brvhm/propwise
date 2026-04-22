import { cn } from '@/lib/utils/cn'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'emerald' | 'gold' | 'red' | 'orange' | 'slate' | 'blue'
}

const variants = {
  emerald: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  gold:    'bg-gold-500/10    text-gold-400    border border-gold-500/20',
  red:     'bg-red-500/10     text-red-400     border border-red-500/20',
  orange:  'bg-orange-500/10  text-orange-400  border border-orange-500/20',
  slate:   'bg-slate-700/50   text-slate-400   border border-slate-700',
  blue:    'bg-blue-500/10    text-blue-400    border border-blue-500/20',
}

export function Badge({ variant = 'slate', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
