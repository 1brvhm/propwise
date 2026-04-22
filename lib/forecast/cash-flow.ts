/**
 * PropWise — 30-Day Cash Flow Forecast Engine
 * Pure TypeScript — no DB calls. Takes pre-fetched tenant data.
 *
 * Rent probability model:
 *   score >= 80  →  97%
 *   score >= 60  →  90%
 *   score >= 40  →  70%  ← 70% weight for at-risk tenants
 *   score  < 40  →  50%
 */

import type { CashFlowForecast, DayForecast } from '@/types/domain'
import { addDays, format } from 'date-fns'

export type { CashFlowForecast, DayForecast }

export interface ForecastTenant {
  id:            string
  monthlyRent:   number
  healthScore:   number
  leaseEndDate:  Date | null
  status:        string
}

export interface ForecastInput {
  tenants:      ForecastTenant[]
  forecastDays: number
  asOfDate?:    Date
}

function rentProbability(healthScore: number): number {
  if (healthScore >= 80) return 0.97
  if (healthScore >= 60) return 0.90
  if (healthScore >= 40) return 0.70  // 70% weight for scores <60
  return 0.50
}

function dailyRent(monthlyRent: number): number {
  return monthlyRent / 30.44  // average days per month
}

export function calculateCashFlowForecast(input: ForecastInput): CashFlowForecast {
  const { tenants, forecastDays = 30, asOfDate = new Date() } = input

  // Only forecast active tenants
  const active = tenants.filter((t) => {
    if (t.status !== 'active') return false
    if (t.leaseEndDate && t.leaseEndDate < asOfDate) return false
    return true
  })

  const atRiskTenants = active.filter((t) => t.healthScore < 60)

  const dailyForecasts: DayForecast[] = []
  let totalExpected    = 0
  let totalOptimistic  = 0
  let totalPessimistic = 0
  let atRiskTotal      = 0

  for (let i = 0; i < forecastDays; i++) {
    const date = addDays(asOfDate, i)
    let expected    = 0
    let optimistic  = 0
    let pessimistic = 0
    let atRisk      = 0

    for (const tenant of active) {
      const daily  = dailyRent(tenant.monthlyRent)
      const prob   = rentProbability(tenant.healthScore)

      expected    += daily * prob
      optimistic  += daily * Math.min(1.0, prob + 0.07)
      pessimistic += daily * Math.max(0.3, prob - 0.20)

      if (tenant.healthScore < 60) {
        atRisk += daily * prob
      }
    }

    totalExpected    += expected
    totalOptimistic  += optimistic
    totalPessimistic += pessimistic
    atRiskTotal      += atRisk

    dailyForecasts.push({
      date:               format(date, 'yyyy-MM-dd'),
      expectedRevenue:    Math.round(expected),
      optimisticRevenue:  Math.round(optimistic),
      pessimisticRevenue: Math.round(pessimistic),
      atRiskRevenue:      Math.round(atRisk),
    })
  }

  const avgRiskScore = atRiskTenants.length > 0
    ? atRiskTenants.reduce((sum, t) => sum + t.healthScore, 0) / atRiskTenants.length
    : 0

  return {
    totalExpected:    Math.round(totalExpected),
    totalOptimistic:  Math.round(totalOptimistic),
    totalPessimistic: Math.round(totalPessimistic),
    atRiskTotal:      Math.round(atRiskTotal),
    dailyForecasts,
    riskSummary: {
      tenantsAtRisk:    atRiskTenants.length,
      riskExposure:     Math.round(atRiskTotal),
      averageRiskScore: Math.round(avgRiskScore),
    },
  }
}
