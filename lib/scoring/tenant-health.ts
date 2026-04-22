/**
 * PropWise — Tenant Health Score Engine
 * Pure TypeScript — no DB calls. Takes pre-fetched data.
 *
 * Composite score: payments 40%, tickets 20%, engagement 20%, lease age 20%
 */

import type { TenantHealthScore, TenantRiskTier } from '@/types/domain'

export interface TenantHealthInput {
  // Payment component (40%)
  recentPayments: Array<{
    status:   string
    daysLate: number | null
    dueDate:  Date
  }>

  // Ticket component (20%)
  openTickets:              number
  averageResolutionDays:    number | null

  // Engagement component (20%)
  lastEngagementDate:          Date | null
  engagementEventsLast90Days:  number

  // Lease age component (20%)
  leaseStartDate: Date | null
}

export type { TenantHealthScore }

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)))
}

function riskTier(score: number): TenantRiskTier {
  if (score >= 75) return 'low'
  if (score >= 55) return 'medium'
  if (score >= 35) return 'high'
  return 'critical'
}

// ---- Component Calculators ----

function calcPaymentScore(
  payments: TenantHealthInput['recentPayments'],
): { score: number; details: string } {
  const last12 = payments.filter(
    (p) => p.dueDate >= new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
  )

  if (last12.length === 0) {
    return { score: 50, details: 'No payment history — neutral score' }
  }

  const onTime    = last12.filter((p) => ['paid', 'partial'].includes(p.status) && (p.daysLate ?? 0) === 0).length
  const total     = last12.length
  const avgLate   = last12.filter((p) => p.daysLate != null).reduce((sum, p) => sum + (p.daysLate ?? 0), 0)
                  / Math.max(1, last12.filter((p) => p.daysLate != null).length)

  const score = clamp(
    (onTime / total) * 80 - avgLate * 2 + 20,
  )

  const details = `${onTime}/${total} on-time payments, avg ${avgLate.toFixed(1)} days late`
  return { score, details }
}

function calcTicketScore(
  openTickets:           number,
  avgResolutionDays:     number | null,
): { score: number; details: string } {
  let score = 100 - openTickets * 10

  // Penalize slow resolution (SLA: P1=2d, P2=1d, P3=3d, P4=14d → average SLA ~5d)
  if (avgResolutionDays != null && avgResolutionDays > 5) {
    score -= Math.floor((avgResolutionDays - 5) / 7) * 5
  }

  const details = `${openTickets} open ticket(s)${avgResolutionDays != null ? `, avg resolution ${avgResolutionDays.toFixed(0)}d` : ''}`
  return { score: clamp(score), details }
}

function calcEngagementScore(
  lastActivity:        Date | null,
  eventsLast90Days:    number,
): { score: number; details: string } {
  let score: number

  if (eventsLast90Days === 0)         score = 20
  else if (eventsLast90Days <= 2)     score = 50
  else if (eventsLast90Days <= 5)     score = 75
  else                                score = 100

  // Cap if tenant has been inactive for >90 days
  if (lastActivity == null) {
    score = Math.min(score, 30)
  } else {
    const daysSinceActive = (Date.now() - lastActivity.getTime()) / (24 * 60 * 60 * 1000)
    if (daysSinceActive > 90) score = Math.min(score, 40)
  }

  const details = `${eventsLast90Days} engagement events in last 90 days`
  return { score: clamp(score), details }
}

function calcLeaseAgeScore(
  leaseStart: Date | null,
): { score: number; details: string } {
  if (!leaseStart) {
    return { score: 40, details: 'No lease start date recorded' }
  }

  const monthsActive = (Date.now() - leaseStart.getTime()) / (30.44 * 24 * 60 * 60 * 1000)

  let score: number
  let details: string

  if (monthsActive < 3) {
    score   = 40
    details = `New tenant (${monthsActive.toFixed(0)} months)`
  } else if (monthsActive < 12) {
    score   = 60
    details = `${monthsActive.toFixed(0)} months tenancy`
  } else if (monthsActive < 24) {
    score   = 80
    details = `${(monthsActive / 12).toFixed(1)} years tenancy`
  } else {
    score   = 100
    details = `Loyal tenant — ${(monthsActive / 12).toFixed(1)} years`
  }

  return { score: clamp(score), details }
}

// ---- Main Export ----

export function calculateTenantHealth(input: TenantHealthInput): TenantHealthScore {
  const WEIGHTS = { payment: 0.40, ticket: 0.20, engagement: 0.20, leaseAge: 0.20 }

  const payment    = calcPaymentScore(input.recentPayments)
  const ticket     = calcTicketScore(input.openTickets, input.averageResolutionDays)
  const engagement = calcEngagementScore(input.lastEngagementDate, input.engagementEventsLast90Days)
  const leaseAge   = calcLeaseAgeScore(input.leaseStartDate)

  const composite = clamp(
    payment.score    * WEIGHTS.payment    +
    ticket.score     * WEIGHTS.ticket     +
    engagement.score * WEIGHTS.engagement +
    leaseAge.score   * WEIGHTS.leaseAge,
  )

  return {
    composite,
    payment:    payment.score,
    ticket:     ticket.score,
    engagement: engagement.score,
    leaseAge:   leaseAge.score,
    riskTier:   riskTier(composite),
    breakdown: {
      payment:    { score: payment.score,    weight: WEIGHTS.payment,    contribution: payment.score    * WEIGHTS.payment,    details: payment.details    },
      ticket:     { score: ticket.score,     weight: WEIGHTS.ticket,     contribution: ticket.score     * WEIGHTS.ticket,     details: ticket.details     },
      engagement: { score: engagement.score, weight: WEIGHTS.engagement, contribution: engagement.score * WEIGHTS.engagement, details: engagement.details },
      leaseAge:   { score: leaseAge.score,   weight: WEIGHTS.leaseAge,   contribution: leaseAge.score   * WEIGHTS.leaseAge,   details: leaseAge.details   },
    },
  }
}
