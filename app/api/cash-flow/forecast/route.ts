import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { calculateCashFlowForecast } from '@/lib/forecast/cash-flow'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const days = Math.min(90, Math.max(7, parseInt(searchParams.get('days') ?? '30', 10)))

    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: rows } = await supabase
      .from('tenants')
      .select('id, monthly_rent, health_score, lease_end_date, status')
      .eq('status', 'active')
      .gt('monthly_rent', 0)

    const tenants = (rows ?? []).map(t => ({
      id:           t.id,
      monthlyRent:  Number(t.monthly_rent),
      healthScore:  t.health_score,
      leaseEndDate: t.lease_end_date ? new Date(t.lease_end_date) : null,
      status:       t.status,
    }))

    const forecast = calculateCashFlowForecast({ tenants, forecastDays: days })

    return NextResponse.json(
      { data: forecast },
      { headers: { 'Cache-Control': 'private, max-age=300' } },
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Forecast failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
