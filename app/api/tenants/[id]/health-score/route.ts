import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { calculateTenantHealth } from '@/lib/scoring/tenant-health'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id }   = await params
    const supabase = await getSupabaseServerClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [paymentsRes, ticketsRes, eventsRes, tenantRes] = await Promise.all([
      supabase
        .from('payments')
        .select('status, days_late, due_date')
        .eq('tenant_id', id)
        .order('due_date', { ascending: false })
        .limit(24),
      supabase
        .from('maintenance_tickets')
        .select('status')
        .eq('tenant_id', id),
      supabase
        .from('tenant_engagement_events')
        .select('occurred_at')
        .eq('tenant_id', id)
        .gte('occurred_at', new Date(Date.now() - 90 * 86_400_000).toISOString())
        .order('occurred_at', { ascending: false }),
      supabase
        .from('tenants')
        .select('lease_start_date')
        .eq('id', id)
        .maybeSingle(),
    ])

    const recentPayments = (paymentsRes.data ?? []).map(p => ({
      status:   p.status as 'paid' | 'late' | 'missed' | 'partial' | 'pending',
      daysLate: p.days_late ?? 0,
      dueDate:  new Date(p.due_date),
    }))

    const openTickets   = (ticketsRes.data ?? []).filter(t =>
      ['open', 'in_progress', 'dispatched'].includes(t.status),
    ).length

    const events         = eventsRes.data ?? []
    const lastEngagement = events.length > 0 ? new Date(events[0].occurred_at) : null

    const score = calculateTenantHealth({
      recentPayments,
      openTickets,
      averageResolutionDays:      3,
      lastEngagementDate:         lastEngagement,
      engagementEventsLast90Days: events.length,
      leaseStartDate:             tenantRes.data?.lease_start_date
                                    ? new Date(tenantRes.data.lease_start_date)
                                    : null,
    })

    await supabase.from('tenants').update({
      health_score:     score.composite,
      payment_score:    score.payment,
      ticket_score:     score.ticket,
      engagement_score: score.engagement,
      lease_age_score:  score.leaseAge,
    }).eq('id', id)

    return NextResponse.json({ data: { tenantId: id, score } })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Score calculation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
