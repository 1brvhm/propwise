'use client'

import { useState, useEffect, useCallback } from 'react'
import { HardHat, Star, Briefcase, Plus, Loader2, Pencil, Trash2 } from 'lucide-react'
import { MetricCard } from '@/components/dashboard/metric-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AddContractorModal } from '@/components/contractors/add-contractor-modal'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { getOrgId } from '@/lib/org/get-org'
import type { ContractorFormData, ContractorEditData } from '@/components/contractors/add-contractor-modal'

type Contractor = {
  id:               string
  company_name:     string
  contact_name:     string | null
  email:            string | null
  phone:            string | null
  trades:           string[]
  rating:           number | null
  total_jobs:       number
  status:           string
  insurance_expiry: string | null
}

export default function ContractorsPage() {
  const [contractors,       setContractors]       = useState<Contractor[]>([])
  const [loading,           setLoading]           = useState(true)
  const [modalOpen,         setModalOpen]         = useState(false)
  const [editingContractor, setEditingContractor] = useState<ContractorEditData | null>(null)
  const [deletingId,        setDeletingId]        = useState<string | null>(null)
  const [deleteLoading,     setDeleteLoading]     = useState(false)

  const loadContractors = useCallback(async () => {
    const supabase = getSupabaseBrowserClient()
    const { data } = await supabase
      .from('contractors')
      .select('id, company_name, contact_name, email, phone, trades, rating, total_jobs, status, insurance_expiry')
      .eq('status', 'active')
      .order('rating', { ascending: false, nullsFirst: false })
    setContractors((data as Contractor[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadContractors() }, [loadContractors])

  const active    = contractors.length
  const avgRating = active > 0
    ? (contractors.reduce((s, c) => s + (c.rating ?? 0), 0) / active).toFixed(1)
    : null
  const totalJobs = contractors.reduce((s, c) => s + c.total_jobs, 0)
  const insured   = contractors.filter(c => {
    if (!c.insurance_expiry) return false
    return new Date(c.insurance_expiry) > new Date()
  }).length

  async function handleAddContractor(data: ContractorFormData) {
    const supabase = getSupabaseBrowserClient()
    const orgId    = await getOrgId()
    const trades   = data.trades.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)

    const { error } = await supabase.from('contractors').insert({
      consulting_client_id: orgId,
      company_name:     data.companyName.trim(),
      contact_name:     data.contactName.trim() || null,
      email:            data.email.trim().toLowerCase() || null,
      phone:            data.phone.trim() || null,
      trades,
      rating:           data.rating    ? parseFloat(data.rating)    : null,
      total_jobs:       data.totalJobs ? parseInt(data.totalJobs, 10) : 0,
      insurance_expiry: data.insuranceExpiry || null,
      status:           'active',
    })

    if (error) throw new Error(error.message)
    await loadContractors()
  }

  async function handleEditContractor(data: ContractorFormData) {
    if (!editingContractor) return
    const supabase = getSupabaseBrowserClient()
    const trades   = data.trades.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)

    const { error } = await supabase.from('contractors').update({
      company_name:     data.companyName.trim(),
      contact_name:     data.contactName.trim() || null,
      email:            data.email.trim().toLowerCase() || null,
      phone:            data.phone.trim() || null,
      trades,
      rating:           data.rating    ? parseFloat(data.rating)    : null,
      total_jobs:       data.totalJobs ? parseInt(data.totalJobs, 10) : 0,
      insurance_expiry: data.insuranceExpiry || null,
    }).eq('id', editingContractor.id)

    if (error) throw new Error(error.message)
    await loadContractors()
  }

  async function handleDelete(id: string) {
    setDeleteLoading(true)
    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase.from('contractors').delete().eq('id', id)
    setDeleteLoading(false)
    setDeletingId(null)
    if (!error) await loadContractors()
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Contractor Registry</h1>
          <p className="text-sm text-slate-400 mt-1">Manage your vendor network and AI-powered dispatch matching.</p>
        </div>
        <Button size="md" onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Add Contractor
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard title="Active Vendors"    value={active}                                            icon={HardHat}   iconColor="emerald" index={0} loading={loading} />
        <MetricCard title="Avg Rating"        value={avgRating !== null ? `${avgRating} ★` : '—'}      icon={Star}      iconColor="gold"    index={1} loading={loading} />
        <MetricCard title="Total Jobs Done"   value={totalJobs}                                         icon={Briefcase} iconColor="emerald" index={2} loading={loading} />
        <MetricCard title="Insured & Current" value={insured}                                           icon={HardHat}   iconColor="emerald" index={3} loading={loading} />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-slate-100">Vendor Directory</h3>
          <p className="text-xs text-slate-500 mt-0.5">Sorted by rating — highest first</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
          </div>
        ) : contractors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-5 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center mb-4">
              <HardHat className="w-6 h-6 text-slate-600" />
            </div>
            <p className="text-sm font-medium text-slate-300">No contractors yet</p>
            <p className="text-xs text-slate-500 mt-1 mb-5 max-w-xs">
              Add vendors to your registry. The AI will match them to maintenance tickets automatically.
            </p>
            <Button size="md" onClick={() => setModalOpen(true)}>
              <Plus className="w-4 h-4" />
              Add first contractor
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {contractors.map(c => {
              const insuranceValid = c.insurance_expiry ? new Date(c.insurance_expiry) > new Date() : false
              return (
                <div key={c.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                    <HardHat className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="text-sm font-medium text-slate-100">{c.company_name}</p>
                      {insuranceValid && <Badge variant="emerald">Insured</Badge>}
                    </div>
                    {c.contact_name && <p className="text-xs text-slate-400">{c.contact_name}</p>}
                    {(c.email || c.phone) && (
                      <p className="text-xs text-slate-500">{c.email ?? c.phone}</p>
                    )}
                    {c.trades.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-1">
                        {c.trades.slice(0, 4).map(trade => (
                          <span key={trade} className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded capitalize">
                            {trade}
                          </span>
                        ))}
                        {c.trades.length > 4 && (
                          <span className="text-xs text-slate-600">+{c.trades.length - 4}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {c.rating != null ? (
                      <p className="text-sm font-semibold text-gold-400">{c.rating.toFixed(1)} ★</p>
                    ) : (
                      <p className="text-xs text-slate-600">No rating</p>
                    )}
                    <p className="text-xs text-slate-500 mt-0.5">{c.total_jobs} jobs</p>
                    {c.insurance_expiry && !insuranceValid && (
                      <Badge variant="red" className="mt-1">Expired</Badge>
                    )}
                  </div>

                  {deletingId === c.id ? (
                    <div className="flex items-center gap-2 shrink-0 pl-2">
                      <span className="text-xs text-red-400">Delete?</span>
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={deleteLoading}
                        className="text-xs font-medium text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setEditingContractor(c)}
                        className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all"
                        title="Edit contractor"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingId(c.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                        title="Delete contractor"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <AddContractorModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleAddContractor}
      />

      <AddContractorModal
        open={!!editingContractor}
        onClose={() => setEditingContractor(null)}
        onSubmit={handleEditContractor}
        initialData={editingContractor ?? undefined}
      />
    </div>
  )
}
