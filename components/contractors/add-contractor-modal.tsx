'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, HardHat } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { scaleIn } from '@/lib/utils/motion-variants'

export interface ContractorFormData {
  companyName:     string
  contactName:     string
  email:           string
  phone:           string
  trades:          string
  rating:          string
  totalJobs:       string
  insuranceExpiry: string
}

export interface ContractorEditData {
  id:               string
  company_name:     string
  contact_name:     string | null
  email:            string | null
  phone:            string | null
  trades:           string[]
  rating:           number | null
  total_jobs:       number
  insurance_expiry: string | null
}

interface AddContractorModalProps {
  open:         boolean
  onClose:      () => void
  onSubmit:     (data: ContractorFormData) => Promise<void>
  initialData?: ContractorEditData
}

const EMPTY: ContractorFormData = {
  companyName: '', contactName: '', email: '', phone: '',
  trades: '', rating: '', totalJobs: '', insuranceExpiry: '',
}

function toForm(d: ContractorEditData): ContractorFormData {
  return {
    companyName:     d.company_name,
    contactName:     d.contact_name ?? '',
    email:           d.email ?? '',
    phone:           d.phone ?? '',
    trades:          d.trades.join(', '),
    rating:          d.rating != null ? String(d.rating) : '',
    totalJobs:       d.total_jobs > 0 ? String(d.total_jobs) : '',
    insuranceExpiry: d.insurance_expiry ?? '',
  }
}

const TRADE_OPTIONS = [
  'plumbing', 'electrical', 'hvac', 'carpentry', 'painting',
  'roofing', 'landscaping', 'cleaning', 'pest control', 'general',
]

export function AddContractorModal({ open, onClose, onSubmit, initialData }: AddContractorModalProps) {
  const isEdit = !!initialData
  const [form,    setForm]    = useState<ContractorFormData>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (open) {
      setForm(initialData ? toForm(initialData) : EMPTY)
      setError('')
    }
  }, [open, initialData])

  function set(field: keyof ContractorFormData, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function toggleTrade(trade: string) {
    const current = form.trades.split(',').map(t => t.trim()).filter(Boolean)
    const updated  = current.includes(trade)
      ? current.filter(t => t !== trade)
      : [...current, trade]
    set('trades', updated.join(', '))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.companyName.trim()) {
      setError('Company name is required.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await onSubmit(form)
      setForm(EMPTY)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save contractor')
    } finally {
      setLoading(false)
    }
  }

  const selectedTrades = form.trades.split(',').map(t => t.trim()).filter(Boolean)

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
            className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-card-glow overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <HardHat className="w-4 h-4 text-emerald-400" />
                </div>
                <h2 className="text-sm font-semibold text-slate-100">
                  {isEdit ? 'Edit Contractor' : 'Add Contractor'}
                </h2>
              </div>
              <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Company name <span className="text-red-400">*</span>
                </label>
                <Input placeholder="Acme Plumbing Co." value={form.companyName} onChange={e => set('companyName', e.target.value)} disabled={loading} autoFocus required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Contact name</label>
                  <Input placeholder="John Doe" value={form.contactName} onChange={e => set('contactName', e.target.value)} disabled={loading} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Rating (0–5)</label>
                  <Input type="number" placeholder="4.5" min="0" max="5" step="0.1" value={form.rating} onChange={e => set('rating', e.target.value)} disabled={loading} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
                  <Input type="email" placeholder="contact@acme.com" value={form.email} onChange={e => set('email', e.target.value)} disabled={loading} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Phone</label>
                  <Input type="tel" placeholder="(555) 000-0000" value={form.phone} onChange={e => set('phone', e.target.value)} disabled={loading} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Jobs completed</label>
                  <Input type="number" placeholder="0" min="0" step="1" value={form.totalJobs} onChange={e => set('totalJobs', e.target.value)} disabled={loading} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Insurance expiry</label>
                  <Input type="date" value={form.insuranceExpiry} onChange={e => set('insuranceExpiry', e.target.value)} disabled={loading} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Trades</label>
                <div className="flex flex-wrap gap-2">
                  {TRADE_OPTIONS.map(trade => {
                    const active = selectedTrades.includes(trade)
                    return (
                      <button
                        key={trade}
                        type="button"
                        onClick={() => toggleTrade(trade)}
                        disabled={loading}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize ${
                          active
                            ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                            : 'border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-400'
                        }`}
                      >
                        {trade}
                      </button>
                    )
                  })}
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex items-center gap-3 pt-2">
                <Button type="button" variant="secondary" size="md" className="flex-1" onClick={onClose} disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" size="md" loading={loading} className="flex-1">
                  {isEdit ? 'Save Changes' : 'Add Contractor'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
