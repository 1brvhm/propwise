'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'
import type { LucideIcon } from 'lucide-react'

interface SidebarItemProps {
  href:    string
  label:   string
  icon:    LucideIcon
  badge?:  string
  onClick?: () => void
}

export function SidebarItem({ href, label, icon: Icon, badge, onClick }: SidebarItemProps) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  return (
    <Link href={href} onClick={onClick}>
      <motion.div
        whileHover={{ x: 2 }}
        transition={{ duration: 0.15 }}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
          isActive
            ? 'bg-emerald-500/10 text-emerald-400 border-r-2 border-emerald-500'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800',
        )}
      >
        <Icon
          className={cn(
            'w-4 h-4 shrink-0 transition-colors',
            isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300',
          )}
        />
        <span className="flex-1 truncate">{label}</span>
        {badge && (
          badge === 'LIVE' ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
          ) : (
            <span className={cn(
              'inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-xs font-bold',
              /^\d+$/.test(badge)
                ? 'bg-red-500 text-white'
                : 'bg-slate-700 text-slate-300',
            )}>
              {badge}
            </span>
          )
        )}
      </motion.div>
    </Link>
  )
}
