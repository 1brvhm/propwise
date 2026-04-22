'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { scaleIn } from '@/lib/utils/motion-variants'
import type { Priority } from '@/types/domain'

interface NewTicketModalProps {
  open:    boolean
  onClose: () => void
  onSubmit: (data: TicketFormData) => Promise<void>
}

export interface TicketFormData {
  title:       string
  description: string
  property:    string
  unit:        string
  priority:    Priority
}

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: 'P1', label: 'P1 — Emergency',  color: 'border-red-500    text-red-400    bg-red-500/10'    },
  { value: 'P2', label: 'P2 — Urgent',     color: 'border-orange-500 text-orange-400 bg-orange-500/10' },
  { value: 'P3', label: 'P3 — Standard',   color: 'border-gold-500   text-gold-400   bg-gold-500/10'   },
  { value: 'P4', label: 'P4 — Low',        color: 'border-slate-500  text-slate-400  bg-slate-500/10'  },
]

export function NewTicketModal({ open, onClose, onSubmit }: NewTicketModalProps) {
  const [form, setForm]     = useState<TicketFormData>({
    title: '', description: '', property: '', unit: '', priority: 'P3',
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  function set(field: keyof TicketFormData, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.description.trim() || !form.property.trim()) {
      setError('Title, description, and property are required.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await onSubmit(form)
      setForm({ title: '', description: '', property: '', unit: '', priority: 'P3' })
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-card-glow overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Wrench className="w-4 h-4 text-emerald-400" />
                </div>
                <h2 className="text-sm font-semibold text-slate-100">New Maintenance Ticket</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Issue title <span className="text-red-400">*</span>
                </label>
                <Input
                  placeholder="e.g. Burst pipe in bathroom"
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  disabled={loading}
                  autoFocus
                  required
                />
              </div>

              {/* Property + Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Property <span className="text-red-400">*</span>
                  </label>
                  <Input
                    placeholder="123 Oak Street"
                    value={form.property}
                    onChange={(e) => set('property', e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Unit</label>
                  <Input
                    placeholder="Unit 4B"
                    value={form.unit}
                    onChange={(e) => set('unit', e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  placeholder="Describe the issue in detail..."
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  disabled={loading}
                  required
                  rows={3}
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 transition-all duration-150 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 resize-none"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Priority</label>
                <div className="grid grid-cols-2 gap-2">
                  {PRIORITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => set('priority', opt.value)}
                      className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                        form.priority === opt.value
                          ? opt.color
                          : 'border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  className="flex-1"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="md"
                  loading={loading}
                  className="flex-1"
                >
                  Create Ticket
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
