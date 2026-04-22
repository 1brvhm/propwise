'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar } from '@/components/dashboard/sidebar'
import { TopBar } from '@/components/dashboard/top-bar'
import { pageVariants } from '@/lib/utils/motion-variants'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

interface ShellInfo {
  clientName:       string
  userName:         string
  userEmail:        string
  pendingApprovals: number
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()
  const [info, setInfo] = useState<ShellInfo>({
    clientName:       '',
    userName:         '',
    userEmail:        '',
    pendingApprovals: 0,
  })

  useEffect(() => {
    async function bootstrap() {
      const supabase = getSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const [memberRes, approvalsRes] = await Promise.all([
        supabase
          .from('client_users')
          .select('consulting_client_id, consulting_clients(name)')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle(),
        supabase
          .from('pending_approvals')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
      ])

      // No client linked — send to onboarding
      if (!memberRes.data) { router.replace('/onboarding'); return }

      const client = memberRes.data?.consulting_clients as { name: string } | null
      setInfo({
        clientName:       client?.name ?? 'Client Portal',
        userName:         user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'User',
        userEmail:        user.email ?? '',
        pendingApprovals: approvalsRes.count ?? 0,
      })
    }

    bootstrap()
  }, [router])

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <div className="hidden lg:flex lg:shrink-0">
        <Sidebar
          orgName={info.clientName}
          userName={info.userName}
          userEmail={info.userEmail}
          pendingApprovals={info.pendingApprovals}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar
          orgName={info.clientName}
          userName={info.userName}
          userEmail={info.userEmail}
          pendingApprovals={info.pendingApprovals}
        />

        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="p-6 min-h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
