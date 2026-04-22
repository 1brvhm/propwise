'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { Sidebar } from './sidebar'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':           'AI Command Center',
  '/dashboard/logs':      'Execution Logs',
  '/dashboard/approvals': 'Pending Approvals',
  '/dashboard/metrics':   'Outcome Metrics',
  '/dashboard/settings':  'Settings',
}

interface TopBarProps {
  orgName?:          string
  userName?:         string
  userEmail?:        string
  pendingApprovals?: number
}

export function TopBar({ orgName, userName, userEmail, pendingApprovals }: TopBarProps) {
  const pathname                = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const title = PAGE_TITLES[pathname] ?? 'PropWise'

  return (
    <>
      <header className="flex items-center h-16 px-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm shrink-0">
        <button
          onClick={() => setMenuOpen(true)}
          className="lg:hidden mr-3 text-slate-400 hover:text-slate-200 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex-1">
          <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
          <p className="text-xs text-slate-500 hidden sm:block">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar
              orgName={orgName}
              userName={userName}
              userEmail={userEmail}
              pendingApprovals={pendingApprovals}
              onClose={() => setMenuOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  )
}
