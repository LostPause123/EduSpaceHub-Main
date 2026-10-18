'use client'

import { useState, useEffect, type ReactNode } from 'react'
import type { Navigate, PageName } from '../types'
import {
  cn,
  Avatar,
  XIcon,
  MenuIcon,
  HomeIcon,
  UsersIcon,
  UserIcon,
  BookmarkIcon,
  CalendarIcon,
  LogOutIcon,
  GraduationCapIcon,
  Badge,
  BookOpenIcon,
} from './ui'
import { supabase } from '../lib/supabase'

interface AdminNavItem {
  page: PageName
  path: string
  label: string
  icon: ReactNode
}

interface AdminUserInfo {
  name: string
  email: string
  avatarUrl: string | null
}

const adminNavItems: AdminNavItem[] = [
  { page: 'admin-dashboard', path: '/admin', label: 'Dashboard', icon: <HomeIcon size={18} /> },
  { page: 'admin-tutors', path: '/admin/tutors', label: 'Tutors', icon: <UsersIcon size={18} /> },
  { page: 'admin-students', path: '/admin/students', label: 'Students', icon: <UserIcon size={18} /> },
  { page: 'admin-bookings', path: '/admin/bookings', label: 'Bookings', icon: <BookmarkIcon size={18} /> },
  { page: 'admin-schedules', path: '/admin/schedules', label: 'Schedules', icon: <CalendarIcon size={18} /> },
  { page: 'admin-materials', path: '/admin/materials', label: 'Materials', icon: <BookOpenIcon size={18} /> },
  { page: 'admin-profile', path: '/admin/profile', label: 'Profile', icon: <UserIcon size={18} /> },
]

interface AdminLayoutProps {
  children: ReactNode
  navigate?: Navigate
  activePage: PageName
}

export default function AdminLayout({ children, navigate, activePage }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [adminUser, setAdminUser] = useState<AdminUserInfo>({
    name: 'Administrator',
    email: 'admin@eduspace.edu',
    avatarUrl: null,
  })

  useEffect(() => {
    async function loadAdminInfo() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email, avatar_url')
          .eq('id', user.id)
          .maybeSingle()

        const name = profile?.full_name || user.user_metadata?.full_name || 'Administrator'
        const email = profile?.email || user.email || 'admin@eduspace.edu'
        const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || null

        setAdminUser({ name, email, avatarUrl })
      } catch (err) {
        console.error('Error loading admin profile in AdminLayout:', err)
      }
    }

    loadAdminInfo()
  }, [])

  async function handleLogout() {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    }
  }

  function handleNav(item: AdminNavItem) {
    if (navigate) {
      navigate(item.page)
    } else if (typeof window !== 'undefined') {
      window.location.href = item.path
    }
    setSidebarOpen(false)
  }

  return (
    <div className="flex h-screen bg-[#FAFAF8] overflow-hidden text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-border/80 bg-white h-full">
        <SidebarContent
          activePage={activePage}
          handleNav={handleNav}
          adminUser={adminUser}
          onLogout={handleLogout}
        />
      </aside>

      {/* Mobile Drawer Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-2xs"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white border-r border-border flex flex-col z-10 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-xs">
                  <GraduationCapIcon size={18} />
                </div>
                <span className="font-semibold text-base text-foreground tracking-tight">EduSpace</span>
                <Badge variant="destructive" className="text-[10px] uppercase font-bold">Admin</Badge>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                aria-label="Close menu"
              >
                <XIcon size={18} />
              </button>
            </div>
            <SidebarContent
              activePage={activePage}
              handleNav={handleNav}
              adminUser={adminUser}
              onLogout={handleLogout}
              hideHeader
            />
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-border shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="Open menu"
          >
            <MenuIcon size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center text-white shadow-xs">
              <GraduationCapIcon size={16} />
            </div>
            <span className="font-semibold text-foreground tracking-tight">EduSpace Admin</span>
          </div>
          <button
            onClick={() => handleNav(adminNavItems.find(i => i.page === 'admin-profile')!)}
            className="shrink-0"
          >
            <Avatar src={adminUser.avatarUrl} alt={adminUser.name} size="sm" />
          </button>
        </header>

        {/* Dynamic Page Content Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

interface SidebarContentProps {
  activePage: PageName
  handleNav: (item: AdminNavItem) => void
  adminUser: AdminUserInfo
  onLogout: () => void
  hideHeader?: boolean
}

function SidebarContent({ activePage, handleNav, adminUser, onLogout, hideHeader }: SidebarContentProps) {
  return (
    <>
      {!hideHeader && (
        <div className="px-5 py-4 border-b border-border/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-xs shrink-0">
              <GraduationCapIcon size={18} />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-base text-foreground tracking-tight leading-tight">
                EduSpace Hub
              </span>
              <span className="text-[11px] font-bold text-primary tracking-wider uppercase">
                Admin Control
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Admin Profile Card */}
      <div className="px-4 py-3.5 border-b border-border/70 bg-primary-50/40 shrink-0">
        <div className="flex items-center gap-3">
          <Avatar src={adminUser.avatarUrl} alt={adminUser.name} size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate leading-tight">{adminUser.name}</p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{adminUser.email}</p>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="px-3 mb-1">
            <p className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-widest">
              Navigation
            </p>
          </div>
          {adminNavItems.map((item) => {
            const isActive = activePage === item.page
            return (
              <button
                key={item.page}
                onClick={() => handleNav(item)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors w-full text-left font-medium cursor-pointer',
                  isActive
                    ? 'bg-primary text-white shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70',
                )}
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
              </button>
            )
          })}
        </div>

        {/* Bottom Actions */}
        <div className="pt-4 border-t border-border/70 flex flex-col gap-1">
          <button
            onClick={onLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors w-full text-left font-medium cursor-pointer"
          >
            <LogOutIcon size={18} />
            <span>Sign out</span>
          </button>
        </div>
      </nav>
    </>
  )
}
