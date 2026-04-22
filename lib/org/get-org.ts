import { getSupabaseBrowserClient } from '@/lib/supabase/client'

let _clientId: string | null = null

export async function getOrgId(): Promise<string> {
  if (_clientId) return _clientId

  const supabase = getSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data } = await supabase
    .from('client_users')
    .select('consulting_client_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!data?.consulting_client_id) throw new Error('No client linked — please complete onboarding')
  _clientId = data.consulting_client_id
  return _clientId
}
