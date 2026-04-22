'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { DollarSign, AlertTriangle, TrendingUp, Users, Loader2, Pencil, Trash2 } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { MetricCard } from '@/components/dashboard/metric-card'
import { ForecastChart } from '@/components/cash-flow/forecast-chart'
import { Badge } from '@/components/ui/badge'
import { HealthScoreWidget } from '@/components/tenants/health-score-ring'
import { AddTenantModal } from '@/components/tenants/add-tenant-modal'
import { calculateCashFlowForecast, type ForecastTenant } from '@/lib/forecast/cash-flow'
import { formatCurrency, formatCurrencyCompact } from '@/lib/utils/currency'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import type { TenantFormData, TenantEditData } from '@/components/tenants/add-tenant-modal'

type TenantRow = {
  id:               string
  first_name:       string
  last_name:        string
  email:            string
  phone:            string | null
  monthly_rent:     number | null
  health_score:     number
  lease_start_date: string | null
  lease_end_date:   string | null
  status:           string
}

export default function CashFlowPage() {
  const [tenants,       setTenants]       = useState<TenantRow[]>([])
  const [loading,       setLoading]       = useState(true)
  const [editingTenant, setEditingTenant] = useState<TenantEditData | null>(null)
  const [deletingId,    setDeletingId]    = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const loadTenants = useCallback(async () => {
    const supabase = getSupabaseBrowserClient()
    const { data } = await supabase
      .from('tenants')
      .select('id, first_name, last_name, monthly_rent, health_score, lease_start_date, lease_end_date, status')
      .eq('status', 'active')
      .gt('monthly_rent', 0)
    setTenants((data as TenantRow[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadTenants() }, [loadTenants])

  const forecastTenants: ForecastTenant[] = useMemo(() => tenants.map(t => ({
    id:           t.id,
    monthlyRent:  Number(t.monthly_rent ?? 0),
    healthScore:  t.health_score,
    leaseEndDate: t.lease_end_date ? new Date(t.lease_end_date) : null,
    status:       t.status,
  })), [tenants])

  const forecast = useMemo(
    () => forecastTenants.length > 0
      ? calculateCashFlowForecast({ tenants: forecastTenants, forecastDays: 30 })
      : null,
    [forecastTenants],
  )

  const atRiskTenants = tenants.filter(t => t.health_score < 60)
  const hasTenants    = tenants.length > 0

  function clampScore(raw: string) {
    const n = parseInt(raw, 10)
    return isNaN(n) ? undefined : Math.min(100, Math.max(0, n))
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

  async function handleDeactivate(id: string) {
    setDeleteLoading(true)
    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase
      .from('tenants')
      .update({ status: 'past' })
      .eq('id', id)
    setDeleteLoading(false)
    setDeletingId(null)
    if (!error) await loadTenants()
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      <div>
        <h1 className="text-2xl font-bold text-slate-50">Cash Flow Intelligence</h1>
        <p className="text-sm text-slate-400 mt-1">30-day revenue forecast weighted by tenant health scores.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard
          title="Expected (30d)"
          value={forecast ? formatCurrencyCompact(forecast.totalExpected) : '—'}
          icon={DollarSign} iconColor="gold" index={0} loading={loading}
        />
        <MetricCard
          title="Optimistic"
          value={forecast ? formatCurrencyCompact(forecast.totalOptimistic) : '—'}
          icon={TrendingUp} iconColor="emerald" index={1} loading={loading}
        />
        <MetricCard
          title="At-Risk Revenue"
          value={forecast ? formatCurrencyCompact(forecast.atRiskTotal) : '—'}
          icon={AlertTriangle} iconColor="red" index={2} loading={loading}
        />
        <MetricCard
          title="Tenants at Risk"
          value={forecast ? forecast.riskSummary.tenantsAtRisk : 0}
          icon={Users} iconColor="red" index={3} loading={loading}
        />
      </div>

      {/* Forecast Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">30-Day Revenue Forecast</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {hasTenants
                ? `Based on ${tenants.length} active tenant${tenants.length !== 1 ? 's' : ''} · Health-score weighted probability`
                : 'Add tenants with monthly rent to generate a forecast'}
            </p>
          </div>
          {forecast && (
            <div className="text-right">
              <p className="text-xs text-slate-500">Expected total</p>
              <p className="text-lg font-bold text-gold-400 tabular-nums">
                {formatCurrency(forecast.totalExpected)}
              </p>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
          </div>
        ) : !hasTenants ? (
          <div className="flex flex-col items-center justify-center py-20 px-5 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center mb-4">
              <DollarSign className="w-6 h-6 text-slate-600" />
            </div>
            <p className="text-sm font-medium text-slate-300">No forecast data yet</p>
            <p className="text-xs text-slate-500 mt-1 mb-4 max-w-xs">
              Add tenants with monthly rent to generate a 30-day revenue forecast.
            </p>
            <Link
              href="/dashboard/tenants"
              className="inline-flex items-center gap-1.5 text-xs text-emerald-500 hover:text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/60 px-3 py-1.5 rounded-lg transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add first tenant
            </Link>
          </div>
        ) : (
          <div className="p-5">
            <ForecastChart data={forecast!.dailyForecasts} />
          </div>
        )}
      </div>

      {/* At-Risk Tenant Breakdown */}
      {!loading && atRiskTenants.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-semibold text-slate-100">At-Risk Tenants</h3>
              <Badge variant="red">{atRiskTenants.length} tenant{atRiskTenants.length !== 1 ? 's' : ''}</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Health score below 60 — collection probability reduced to 50–70%
            </p>
          </div>
          <div className="divide-y divide-slate-800">
            {atRiskTenants.map(tenant => {
              const prob     = tenant.health_score >= 40 ? 70 : 50
              const rent     = Number(tenant.monthly_rent ?? 0)
              const expected = rent * (prob / 100)
              const atRisk   = rent - expected

              return (
                <div key={tenant.id} className="flex items-center gap-4 px-5 py-3.5">
                  <HealthScoreWidget score={tenant.health_score} size={44} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200">
                      {tenant.first_name} {tenant.last_name}
                    </p>
                    {rent > 0 && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        Monthly rent: {formatCurrency(rent)}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Collection probability</p>
                    <p className="text-sm font-semibold text-gold-400">{prob}%</p>
                  </div>
                  {rent > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Monthly at risk</p>
                      <p className="text-sm font-semibold text-red-400">
                        {formatCurrency(atRisk)}
                      </p>
                    </div>
                  )}

                  {deletingId === tenant.id ? (
                    <div className="flex items-center gap-2 shrink-0 pl-2">
                      <span className="text-xs text-red-400">Remove?</span>
                      <button
                        onClick={() => handleDeactivate(tenant.id)}
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
                        title="Deactivate tenant"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {atRiskTenants.some(t => t.monthly_rent) && (
            <div className="px-5 py-4 bg-slate-800/30 border-t border-slate-800 flex justify-between">
              <span className="text-sm text-slate-400">Total monthly exposure</span>
              <span className="text-sm font-bold text-red-400">
                {formatCurrency(atRiskTenants.reduce((s, t) => {
                  const rent = Number(t.monthly_rent ?? 0)
                  const prob = t.health_score >= 40 ? 0.70 : 0.50
                  return s + rent * (1 - prob)
                }, 0))}
              </span>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {editingTenant && (
          <AddTenantModal
            open={!!editingTenant}
            onClose={() => setEditingTenant(null)}
            onSubmit={handleEditTenant}
            initialData={editingTenant ?? undefined}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
