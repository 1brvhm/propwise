import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

/**
 * Server Component / Route Handler client.
 * Uses the anon key — respects RLS.
 */
export async function getSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          // In Server Components cookies are read-only after headers are sent.
          // Route Handlers handle cookie setting explicitly.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Silently ignore in RSC context
          }
        },
      },
    },
  )
}

/**
 * Service-role client — bypasses RLS.
 * Uses createClient directly (no cookie management needed for service role).
 * NEVER expose this to the browser.
 */
export async function getSupabaseServiceClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession:   false,
        autoRefreshToken: false,
      },
    },
  )
}
