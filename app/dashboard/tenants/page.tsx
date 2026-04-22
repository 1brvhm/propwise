'use client'

import { useState, useEffect, useCallback } from 'react'
import { Users, Heart, AlertTriangle, TrendingDown, Plus, Loader2, Pencil, Trash2 } from 'lucide-react'
import { MetricCard } from '@/components/dashboard/metric-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { HealthScoreWidget } from '@/components/tenants/health-score-ring'
import { AddTenantModal } from '@/components/tenants/add-tenant-modal'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { getOrgId } from '@/lib/org/get-org'
import { formatCurrency } from '@/lib/utils/currency'
import type { TenantFormData, TenantEditData } from '@/components/tenants/add-tenant-modal'

type Tenant = {
  id:               string
  first_name:       string
  last_name:        string
  email:            string
  phone:            string | null
  monthly_rent:     number | null
  health_score:     number
  status:           string
  lease_start_date: string | null
  lease_end_date:   string | null
}

function riskTier(score: number) {
  if (score >= 75) return { label: 'Healthy',   variant: 'emerald' as const }
  if (score >= 55) return { label: 'Medium',    variant: 'gold'    as const }
  if (score >= 35) return { label: 'High risk', variant: 'red'     as const }
  return             { label: 'Critical',  variant: 'red'     as const }
}

export default function TenantsPage() {
  const [tenants,       setTenants]       = useState<Tenant[]>([])
  const [loading,       setLoading]       = useState(true)
  const [modalOpen,     setModalOpen]     = useState(false)
  const [editingTenant, setEditingTenant] = useState<TenantEditData | null>(null)
  const [deletingId,    setDeletingId]    = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const loadTenants = useCallback(async () => {
    const supabase = getSupabaseBrowserClient()
    const { data } = await supabase
      .from('tenants')
      .select('id, first_name, last_name, email, phone, monthly_rent, health_score, status, lease_start_date, lease_end_date')
      .order('health_score', { ascending: true })
    setTenants((data as Tenant[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadTenants() }, [loadTenants])

  const active   = tenants.filter(t => t.status === 'active')
  const avgScore = active.length > 0
    ? Math.round(active.reduce((s, t) => s + t.health_score, 0) / active.length)
    : null
  const atRisk   = active.filter(t => t.health_score < 60).length
  const critical = active.filter(t => t.health_score < 35).length

  function clampScore(raw: string) {
    const n = parseInt(raw, 10)
    return isNaN(n) ? undefined : Math.min(100, Math.max(0, n))
  }

  async function handleAddTenant(data: TenantFormData) {
    const supabase = getSupabaseBrowserClient()
    const orgId    = await getOrgId()
    const score    = clampScore(data.healthScore)

    const { error } = await supabase.from('tenants').insert({
      consulting_client_id: orgId,
      first_name:       data.firstName.trim(),
      last_name:        data.lastName.trim(),
      email:            data.email.trim().toLowerCase(),
      phone:            data.phone.trim() || null,
      monthly_rent:     data.monthlyRent ? parseFloat(data.monthlyRent) : null,
      lease_start_date: data.leaseStart  || null,
      lease_end_date:   data.leaseEnd    || null,
      status:           'active',
      ...(score !== undefined && {
        health_score:     score,
        payment_score:    score,
        engagement_score: score,
        lease_age_score:  score,
        ticket_score:     score,
      }),
    })

    if (error) throw new Error(error.message)
    await loadTenants()
  }

  async function handleEditTenant(data: TenantFormData) {
    if (!editingTenant) return
    const supabase = getSupabaseBrowserClient()
    const score    = clampScore(data.healthScore)

    const { error } = await supabase.from('tenants').update({
      first_name:       data.firstName.trim(),
      last_name:        data.lastName.trim(),
      email:            data.email.trim().toLowerCase(),
      phone:            data.phone.trim() || null,
      monthly_rent:     data.monthlyRent ? parseFloat(data.monthlyRent) : null,
      lease_start_date: data.leaseStart  || null,
      lease_end_date:   data.leaseEnd    || null,
      ...(score !== undefined && {
        health_score:     score,
        payment_score:    score,
        engagement_score: score,
        lease_age_score:  score,
        ticket_score:     score,
      }),
    }).eq('id', editingTenant.id)

    if (error) throw new Error(error.message)
    await loadTenants()
  }

  async function handleDelete(id: string) {
    setDeleteLoading(true)
    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase.from('tenants').delete().eq('id', id)
    setDeleteLoading(false)
    setDeletingId(null)
    if (!error) await loadTenants()
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Tenant Health</h1>
          <p className="text-sm text-slate-400 mt-1">AI-scored portfolio — payment, engagement, and lease signals.</p>
        </div>
        <Button size="md" onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Add Tenant
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard title="Total Active"        value={active.length}                               icon={Users}         iconColor="emerald" index={0} loading={loading} />
        <MetricCard title="Avg Health Score"    value={avgScore !== null ? `${avgScore}/100` : '—'} icon={Heart}         iconColor="emerald" index={1} loading={loading} />
        <MetricCard title="At Risk (score <60)" value={atRisk}                                      icon={AlertTriangle} iconColor="red"     index={2} loading={loading} />
        <MetricCard title="Critical (<35)"      value={critical}                                    icon={TrendingDown}  iconColor="red"     index={3} loading={loading} />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-slate-100">Tenant Roster</h3>
          <p className="text-xs text-slate-500 mt-0.5">Sorted by health score — lowest first</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
          </div>
        ) : tenants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-5 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-slate-600" />
            </div>
            <p className="text-sm font-medium text-slate-300">No tenants yet</p>
            <p className="text-xs text-slate-500 mt-1 mb-5 max-w-xs">
              Add your first tenant to start tracking health scores, payments, and lease status.
            </p>
            <Button size="md" onClick={() => setModalOpen(true)}>
              <Plus className="w-4 h-4" />
              Add first tenant
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {tenants.map(tenant => {
              const tier = riskTier(tenant.health_score)
              return (
                <div key={tenant.id} className="flex items-center gap-4 px-5 py-4">
                  <HealthScoreWidget score={tenant.health_score} size={48} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="text-sm font-medium text-slate-100">
                        {tenant.first_name} {tenant.last_name}
                      </p>
                      <Badge variant={tier.variant}>{tier.label}</Badge>
                    </div>
                    <p className="text-xs text-slate-400">{tenant.email}</p>
                    {tenant.phone && <p className="text-xs text-slate-500">{tenant.phone}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    {tenant.monthly_rent != null && (
                      <p className="text-sm font-semibold text-slate-100">
                        {formatCurrency(tenant.monthly_rent)}/mo
                      </p>
                    )}
                    {tenant.lease_end_date && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        Ends {new Date(tenant.lease_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </div>

                  {deletingId === tenant.id ? (
                    <div className="flex items-center gap-2 shrink-0 pl-2">
                      <span className="text-xs text-red-400">Delete?</span>
                      <button
                        onClick={() => handleDelete(tenant.id)}
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
                        onClick={() => setEditingTenant(tenant)}
                        className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all"
                        title="Edit tenant"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingId(tenant.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                        title="Delete tenant"
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

      <AddTenantModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleAddTenant}
      />

      <AddTenantModal
        open={!!editingTenant}
        onClose={() => setEditingTenant(null)}
        onSubmit={handleEditTenant}
        initialData={editingTenant ?? undefined}
      />
    </div>
  )
}
