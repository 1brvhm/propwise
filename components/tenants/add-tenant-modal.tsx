'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { scaleIn } from '@/lib/utils/motion-variants'

export interface TenantFormData {
  firstName:   string
  lastName:    string
  email:       string
  phone:       string
  monthlyRent: string
  leaseStart:  string
  leaseEnd:    string
  healthScore: string
}

export interface TenantEditData {
  id:               string
  first_name:       string
  last_name:        string
  email:            string
  phone:            string | null
  monthly_rent:     number | null
  health_score:     number
  lease_start_date: string | null
  lease_end_date:   string | null
}

interface AddTenantModalProps {
  open:         boolean
  onClose:      () => void
  onSubmit:     (data: TenantFormData) => Promise<void>
  initialData?: TenantEditData
}

const EMPTY: TenantFormData = {
  firstName: '', lastName: '', email: '', phone: '',
  monthlyRent: '', leaseStart: '', leaseEnd: '', healthScore: '',
}

function toForm(d: TenantEditData): TenantFormData {
  return {
    firstName:   d.first_name,
    lastName:    d.last_name,
    email:       d.email,
    phone:       d.phone ?? '',
    monthlyRent: d.monthly_rent != null ? String(d.monthly_rent) : '',
    leaseStart:  d.lease_start_date ?? '',
    leaseEnd:    d.lease_end_date ?? '',
    healthScore: String(d.health_score),
  }
}

export function AddTenantModal({ open, onClose, onSubmit, initialData }: AddTenantModalProps) {
  const isEdit = !!initialData
  const [form,    setForm]    = useState<TenantFormData>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (open) {
      setForm(initialData ? toForm(initialData) : EMPTY)
      setError('')
    }
  }, [open, initialData])

  function set(field: keyof TenantFormData, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      setError('First name, last name, and email are required.')
      return
    }
    if (form.healthScore && (parseInt(form.healthScore) < 0 || parseInt(form.healthScore) > 100)) {
      setError('Health score must be between 0 and 100.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await onSubmit(form)
      setForm(EMPTY)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save tenant')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            variants={scaleIn} initial="hidden" animate="visible" exit="hidden"
            className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-card-glow overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-emerald-400" />
                </div>
                <h2 className="text-sm font-semibold text-slate-100">
                  {isEdit ? 'Edit Tenant' : 'Add Tenant'}
                </h2>
              </div>
              <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    First name <span className="text-red-400">*</span>
                  </label>
                  <Input placeholder="Jane" value={form.firstName} onChange={e => set('firstName', e.target.value)} disabled={loading} autoFocus required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Last name <span className="text-red-400">*</span>
                  </label>
                  <Input placeholder="Smith" value={form.lastName} onChange={e => set('lastName', e.target.value)} disabled={loading} required />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Email <span className="text-red-400">*</span>
                </label>
                <Input type="email" placeholder="jane@example.com" value={form.email} onChange={e => set('email', e.target.value)} disabled={loading} required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Phone</label>
                  <Input type="tel" placeholder="(555) 000-0000" value={form.phone} onChange={e => set('phone', e.target.value)} disabled={loading} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Monthly rent ($)</label>
                  <Input type="number" placeholder="2000" min="0" step="50" value={form.monthlyRent} onChange={e => set('monthlyRent', e.target.value)} disabled={loading} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Lease start</label>
                  <Input type="date" value={form.leaseStart} onChange={e => set('leaseStart', e.target.value)} disabled={loading} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Lease end</label>
                  <Input type="date" value={form.leaseEnd} onChange={e => set('leaseEnd', e.target.value)} disabled={loading} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Health score (0–100)
                  <span className="text-slate-600 ml-1.5 font-normal">— manually set tenant rating</span>
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 72"
                  min="0" max="100" step="1"
                  value={form.healthScore}
                  onChange={e => set('healthScore', e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-slate-600 mt-1">
                  0–34 = Critical · 35–54 = High risk · 55–74 = Medium · 75–100 = Healthy
                </p>
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex items-center gap-3 pt-2">
                <Button type="button" variant="secondary" size="md" className="flex-1" onClick={onClose} disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" size="md" loading={loading} className="flex-1">
                  {isEdit ? 'Save Changes' : 'Add Tenant'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
