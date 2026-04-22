// ============================================================
// PropWise — Shared Domain Types
// ============================================================

export type Priority      = 'P1' | 'P2' | 'P3' | 'P4'
export type TicketStatus  = 'open' | 'in_progress' | 'dispatched' | 'resolved' | 'closed' | 'cancelled'
export type WorkOrderStatus = 'pending' | 'accepted' | 'scheduled' | 'in_progress' | 'completed' | 'invoiced' | 'paid' | 'cancelled'
export type TenantStatus  = 'active' | 'past' | 'prospect' | 'eviction'
export type TenantRiskTier = 'low' | 'medium' | 'high' | 'critical'
export type UserRole      = 'owner' | 'admin' | 'member' | 'viewer'
export type PropertyType  = 'residential' | 'commercial' | 'mixed'
export type UnitStatus    = 'vacant' | 'occupied' | 'maintenance' | 'reserved'
export type OrgPlan       = 'trial' | 'starter' | 'pro' | 'enterprise'
export type PaymentStatus = 'pending' | 'paid' | 'partial' | 'late' | 'missed'

export type MaintenanceCategory =
  | 'plumbing'
  | 'electrical'
  | 'hvac'
  | 'structural'
  | 'appliance'
  | 'pest'
  | 'landscaping'
  | 'safety'
  | 'other'

export interface OrganizationContext {
  id: string
  name: string
  slug: string
  plan: OrgPlan
  role: UserRole
}

export interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

export interface MetricDelta {
  value: number
  label: string
  direction: 'up' | 'down' | 'neutral'
}

// AI Classification result from Claude
export interface MaintenanceClassification {
  category: MaintenanceCategory
  priority: Priority
  reasoning: string
  estimated_resolution_hours: number
  requires_immediate_dispatch: boolean
  safety_concern: boolean
  recommended_trade: string
}

// Tenant health score breakdown
export interface TenantHealthScore {
  composite: number
  payment:   number
  ticket:    number
  engagement: number
  leaseAge:  number
  riskTier:  TenantRiskTier
  breakdown: {
    payment:    { score: number; weight: number; contribution: number; details: string }
    ticket:     { score: number; weight: number; contribution: number; details: string }
    engagement: { score: number; weight: number; contribution: number; details: string }
    leaseAge:   { score: number; weight: number; contribution: number; details: string }
  }
}

// Cash flow forecast
export interface DayForecast {
  date:               string   // ISO date string
  expectedRevenue:    number
  optimisticRevenue:  number
  pessimisticRevenue: number
  atRiskRevenue:      number
}

export interface CashFlowForecast {
  totalExpected:     number
  totalOptimistic:   number
  totalPessimistic:  number
  atRiskTotal:       number
  dailyForecasts:    DayForecast[]
  riskSummary: {
    tenantsAtRisk:    number
    riskExposure:     number
    averageRiskScore: number
  }
}

// Contractor matching
export interface ContractorMatchScore {
  contractorId:   string
  companyName:    string
  matchScore:     number
  tradeMatch:     boolean
  rating:         number
  openWorkOrders: number
  insuranceValid: boolean
}

// API response wrapper
export interface ApiResponse<T = unknown> {
  data?:  T
  error?: string
  code?:  string
}
