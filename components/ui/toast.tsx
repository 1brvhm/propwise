'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id:       string
  type:     ToastType
  message:  string
  duration?: number
}

interface ToastItemProps extends Toast {
  onDismiss: (id: string) => void
}

const icons = {
  success: <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />,
  error:   <XCircle    className="w-5 h-5 text-red-400     shrink-0" />,
  info:    <Info       className="w-5 h-5 text-blue-400    shrink-0" />,
}

const styles = {
  success: 'border-emerald-500/30 bg-slate-900',
  error:   'border-red-500/30     bg-slate-900',
  info:    'border-blue-500/30    bg-slate-900',
}

function ToastItem({ id, type, message, duration = 4000, onDismiss }: ToastItemProps) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), duration)
    return () => clearTimeout(timer)
  }, [id, duration, onDismiss])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0,  scale: 1 }}
      exit={{    opacity: 0, y: -8, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg min-w-72 max-w-md',
        styles[type],
      )}
    >
      {icons[type]}
      <p className="text-sm text-slate-200 flex-1">{message}</p>
      <button
        onClick={() => onDismiss(id)}
        className="text-slate-500 hover:text-slate-300 transition-colors mt-0.5"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  )
}

interface ToastContainerProps {
  toasts:    Toast[]
  onDismiss: (id: string) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} {...toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  )
}

// ---- Hook ----
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  function toast(type: ToastType, message: string, duration?: number) {
    const id = `toast-${Date.now()}-${Math.random()}`
    setToasts((prev) => [...prev, { id, type, message, duration }])
  }

  return {
    toasts,
    dismiss,
    success: (msg: string, duration?: number) => toast('success', msg, duration),
    error:   (msg: string, duration?: number) => toast('error',   msg, duration),
    info:    (msg: string, duration?: number) => toast('info',    msg, duration),
  }
}
