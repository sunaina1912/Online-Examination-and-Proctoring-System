'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { LayoutDashboard, FileText, BarChart3, LogOut, Shield, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/admin/exams',     label: 'Exams',       icon: FileText },
  { href: '/admin/reports',   label: 'Reports',     icon: BarChart3 },
]

export function AdminSidebar({ role, name }: { role: string; name: string }) {
  const path = usePathname()

  return (
    <aside className="w-56 min-h-screen bg-surface-1 border-r border-surface-3 flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-surface-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center">
            <Shield className="w-4 h-4 text-brand-400" />
          </div>
          <span className="font-display font-bold text-white">Proctor<span className="text-brand-400">X</span></span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
              path === href
                ? 'bg-brand-500/20 text-brand-200 border border-brand-500/20'
                : 'text-gray-400 hover:text-white hover:bg-surface-2'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-surface-3">
        <div className="px-3 py-2 mb-1">
          <p className="text-xs font-semibold text-white truncate">{name}</p>
          <p className="text-[10px] text-gray-500 capitalize">{role}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/auth/login' })}
          className="flex items-center gap-3 px-3 py-2.5 w-full text-left text-sm text-gray-400 hover:text-danger hover:bg-danger/10 rounded-xl transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
