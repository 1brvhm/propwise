'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  Terminal,
  CheckSquare,
  BarChart3,
  LogOut,
  ChevronDown,
  Building2,
  Bot,
} from 'lucide-react'
import { SidebarItem } from './sidebar-item'
import { cn } from '@/lib/utils/cn'

interface SidebarProps {
  orgName?:          string
  userName?:         string
  userEmail?:        string
  className?:        string
  onClose?:          () => void
  pendingApprovals?: number
}

const NAV_ITEMS = [
  { href: '/dashboard',            label: 'Command Center', icon: LayoutDashboard             },
  { href: '/dashboard/logs',       label: 'Execution Logs', icon: Terminal,   badge: 'LIVE' as const },
  { href: '/dashboard/approvals',  label: 'Approvals',      icon: CheckSquare, badge: 'COUNT' as const },
  { href: '/dashboard/metrics',    label: 'Outcomes',        icon: BarChart3                  },
]

export function Sidebar({
  orgName          = 'Client Portal',
  userName         = 'Account',
  userEmail        = '',
  className,
  onClose,
  pendingApprovals = 0,
}: SidebarProps) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside
      className={cn(
        'flex flex-col w-64 bg-slate-900 border-r border-slate-800 h-screen',
        className,
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center shrink-0">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-gradient-brand text-lg tracking-tight">PropWise</span>
      </div>

      {/* Client Selector */}
      <div className="px-3 py-3 border-b border-slate-800">
        <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors group text-left">
          <div className="w-7 h-7 rounded-md bg-emerald-500/20 flex items-center justify-center shrink-0">
            <Building2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">{orgName}</p>
            <p className="text-xs text-slate-500">AI Command Center</p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-3 pb-2 text-xs font-medium text-slate-600 uppercase tracking-wider">
          Platform
        </p>
        {NAV_ITEMS.map((item) => {
          const badge =
            item.badge === 'LIVE'  ? 'LIVE'
            : item.badge === 'COUNT' && pendingApprovals > 0 ? String(pendingApprovals)
            : undefined
          return (
            <SidebarItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              badge={badge}
              onClick={onClose}
            />
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-slate-800 space-y-0.5">
        <div>
          <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-gradient-brand flex items-center justify-center text-xs font-bold text-white shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">{userName}</p>
              <p className="text-xs text-slate-500 truncate">{userEmail}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all duration-150"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  )
}
