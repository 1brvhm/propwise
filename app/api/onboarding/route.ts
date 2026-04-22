import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient, getSupabaseServiceClient } from '@/lib/supabase/server'

const BodySchema = z.object({
  companyName: z.string().min(2).max(100).trim(),
  fullName:    z.string().min(1).max(100).trim().optional(),
})

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Company name is required' }, { status: 422 })
  }

  const { companyName, fullName } = parsed.data
  const sb = await getSupabaseServiceClient()

  // Idempotent — already onboarded, just return their client
  const { data: existing } = await sb
    .from('client_users')
    .select('consulting_client_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ success: true, clientId: existing.consulting_client_id })
  }

  // Save full name to auth metadata if provided
  if (fullName) {
    await supabase.auth.updateUser({ data: { full_name: fullName } })
  }

  // Create unique slug from company name
  const base = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const slug  = `${base}-${Date.now().toString(36)}`

  // Create consulting client
  const { data: client, error: clientErr } = await sb
    .from('consulting_clients')
    .insert({
      name:          companyName,
      slug,
      contact_email: user.email ?? null,
      contact_name:  fullName   ?? null,
      status:        'active',
      plan:          'standard',
    })
    .select('id')
    .single()

  if (clientErr) {
    return NextResponse.json({ error: clientErr.message }, { status: 500 })
  }

  // Link user as admin
  const { error: memberErr } = await sb.from('client_users').insert({
    consulting_client_id: client.id,
    user_id:              user.id,
    role:                 'admin',
  })

  if (memberErr) {
    return NextResponse.json({ error: memberErr.message }, { status: 500 })
  }

  // Seed all 4 AI agents for this client
  await sb.from('deployed_agents').insert([
    {
      consulting_client_id: client.id,
      agent_type:   'maintenance_triage',
      display_name: 'Maintenance Triage Agent',
      description:  'Classifies and prioritises maintenance tickets using AI, dispatches contractors for P1/P2 issues.',
      status:       'active',
    },
    {
      consulting_client_id: client.id,
      agent_type:   'tenant_retention',
      display_name: 'Tenant Retention Agent',
      description:  'Scores tenant health and drafts personalised outreach for at-risk tenants.',
      status:       'active',
    },
    {
      consulting_client_id: client.id,
      agent_type:   'contractor_dispatch',
      display_name: 'Contractor Dispatch Agent',
      description:  'Ranks and recommends the best contractor for each job based on trade, rating and availability.',
      status:       'active',
    },
    {
      consulting_client_id: client.id,
      agent_type:   'cash_flow_forecasting',
      display_name: 'Cash Flow Forecasting Agent',
      description:  'Forecasts 30-day portfolio revenue, flags collection risks and alerts managers to cash gaps.',
      status:       'active',
    },
  ])

  return NextResponse.json({ success: true, clientId: client.id })
}
