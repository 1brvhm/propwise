import { forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix' | 'suffix'> {
  prefix?: React.ReactNode
  suffix?: React.ReactNode
  error?:  boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, prefix, suffix, error = false, ...props }, ref) => {
    if (prefix || suffix) {
      return (
        <div className="relative flex items-center">
          {prefix && (
            <div className="absolute left-3 flex items-center pointer-events-none text-slate-500">
              {prefix}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full bg-slate-800/60 border rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500',
              'transition-all duration-150 outline-none',
              'focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20',
              error ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-700',
              prefix && 'pl-10',
              suffix && 'pr-10',
              className,
            )}
            {...props}
          />
          {suffix && (
            <div className="absolute right-3 flex items-center pointer-events-none text-slate-500">
              {suffix}
            </div>
          )}
        </div>
      )
    }

    return (
      <input
        ref={ref}
        className={cn(
          'w-full bg-slate-800/60 border rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500',
          'transition-all duration-150 outline-none',
          'focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20',
          error ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-700',
          className,
        )}
        {...props}
      />
    )
  },
)

Input.displayName = 'Input'

export { Input }
