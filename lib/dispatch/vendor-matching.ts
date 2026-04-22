/**
 * PropWise — Contractor Dispatch / Vendor Matching
 *
 * Matching algorithm:
 *   1. Hard filter: contractor must have the required trade
 *   2. Score = rating component (40pts) + availability (40pts) + insurance (10pts) + rating bonus (10pts)
 *   Returns contractors ordered by match score descending.
 */

import type { ContractorMatchScore } from '@/types/domain'

export type { ContractorMatchScore }

export interface ContractorRecord {
  id:               string
  companyName:      string
  trades:           string[]
  rating:           number | null
  totalJobs:        number
  insuranceExpiry:  Date | null
  status:           string
  openWorkOrders:   number  // fetched separately
}

export interface MatchRequest {
  requiredTrade:  string
  asOfDate?:      Date
}

function availabilityScore(openWorkOrders: number): number {
  if (openWorkOrders <= 3) return 40
  if (openWorkOrders <= 6) return 20
  return 0
}

function insuranceScore(expiry: Date | null, asOf: Date): number {
  if (!expiry) return 0
  return expiry > asOf ? 10 : 0
}

function ratingScore(rating: number | null): number {
  if (rating == null) return 15  // unknown — neutral
  return Math.round((rating / 5) * 40)
}

function experienceBonus(totalJobs: number): number {
  if (totalJobs >= 50) return 10
  if (totalJobs >= 20) return 5
  return 0
}

export function matchContractors(
  contractors: ContractorRecord[],
  request:     MatchRequest,
): ContractorMatchScore[] {
  const asOf = request.asOfDate ?? new Date()

  const eligible = contractors.filter(
    (c) => c.status === 'active' && c.trades.includes(request.requiredTrade),
  )

  const scored: ContractorMatchScore[] = eligible.map((c) => {
    const score =
      ratingScore(c.rating) +
      availabilityScore(c.openWorkOrders) +
      insuranceScore(c.insuranceExpiry, asOf) +
      experienceBonus(c.totalJobs)

    return {
      contractorId:   c.id,
      companyName:    c.companyName,
      matchScore:     Math.min(100, score),
      tradeMatch:     true,
      rating:         c.rating ?? 0,
      openWorkOrders: c.openWorkOrders,
      insuranceValid: c.insuranceExpiry != null && c.insuranceExpiry > asOf,
    }
  })

  return scored.sort((a, b) => b.matchScore - a.matchScore)
}
