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

interface TutorNavItem {
  page: PageName
  path: string
  label: string
  icon: ReactNode
}

interface TutorUserInfo {
  name: string
  email: string
  avatarUrl: string | null
  subject?: string
}

const tutorNavItems: TutorNavItem[] = [
  { page: 'tutor-dashboard', path: '/tutor', label: 'Dashboard', icon: <HomeIcon size={18} /> },
  { page: 'tutor-bookings', path: '/tutor/bookings', label: 'My Bookings', icon: <BookmarkIcon size={18} /> },
  { page: 'tutor-schedules', path: '/tutor/schedules', label: 'Schedule', icon: <CalendarIcon size={18} /> },
  { page: 'tutor-students', path: '/tutor/students', label: 'My Students', icon: <UsersIcon size={18} /> },
  { page: 'tutor-materials', path: '/tutor/materials', label: 'Learning Materials', icon: <BookOpenIcon size={18} /> },
  { page: 'tutor-profile', path: '/tutor/profile', label: 'My Profile', icon: <UserIcon size={18} /> },
]

interface TutorLayoutProps {
  children: ReactNode
  navigate?: Navigate
  activePage: PageName
}

export default function TutorLayout({ children, navigate, activePage }: TutorLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [tutorUser, setTutorUser] = useState<TutorUserInfo>({
    name: 'Tutor',
    email: 'tutor@eduspace.edu',
    avatarUrl: null,
  })

  useEffect(() => {
    async function loadTutorInfo() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email, avatar_url')
          .eq('id', user.id)
          .maybeSingle()

        const name = profile?.full_name || user.user_metadata?.full_name || 'Tutor'
        const email = profile?.email || user.email || ''
        const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || null

        setTutorUser({ name, email, avatarUrl })
      } catch (err) {
        console.error('Error loading tutor profile in TutorLayout:', err)
      }
    }

    loadTutorInfo()
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

  function handleNav(item: TutorNavItem) {
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
          tutorUser={tutorUser}
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
                <Badge variant="default" className="text-[10px] uppercase font-bold bg-primary text-white">Tutor</Badge>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                aria-label="Close menu"
              >
                <XIcon size={18} />
              </button>
            </div>
            <SidebarContent
              activePage={activePage}
              handleNav={handleNav}
              tutorUser={tutorUser}
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
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            aria-label="Open menu"
          >
            <MenuIcon size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center text-white shadow-xs">
              <GraduationCapIcon size={16} />
            </div>
            <span className="font-semibold text-foreground tracking-tight">EduSpace Tutor</span>
            <Badge variant="default" className="text-[10px] uppercase font-bold bg-primary text-white">Tutor</Badge>
          </div>
          <button
            onClick={() => handleNav(tutorNavItems.find(i => i.page === 'tutor-profile')!)}
            className="shrink-0 cursor-pointer"
          >
            <Avatar src={tutorUser.avatarUrl} alt={tutorUser.name} size="sm" />
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
  handleNav: (item: TutorNavItem) => void
  tutorUser: TutorUserInfo
  onLogout: () => void
  hideHeader?: boolean
}

function SidebarContent({ activePage, handleNav, tutorUser, onLogout, hideHeader }: SidebarContentProps) {
  return (
    <>
      {!hideHeader && (
        <div className="px-5 py-4 border-b border-border/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-xs shrink-0">
              <GraduationCapIcon size={18} />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-base text-foreground tracking-tight truncate">EduSpace</span>
                <Badge variant="default" className="text-[10px] font-bold px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                  TUTOR
                </Badge>
              </div>
              <span className="text-[11px] text-muted-foreground truncate">Tutor Portal</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Tutor Workspace
        </div>
        {tutorNavItems.map((item) => {
          const isActive = activePage === item.page
          return (
            <button
              key={item.page}
              onClick={() => handleNav(item)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer',
                isActive
                  ? 'bg-primary text-white shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70'
              )}
            >
              <span className={cn('shrink-0', isActive ? 'text-white' : 'text-muted-foreground')}>
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Footer User & Logout */}
      <div className="p-3 border-t border-border/70 bg-secondary/30 shrink-0">
        <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-border/50 shadow-2xs mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar src={tutorUser.avatarUrl} alt={tutorUser.name} size="sm" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-foreground truncate">{tutorUser.name}</span>
              <span className="text-[10px] text-muted-foreground truncate">{tutorUser.email}</span>
            </div>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-destructive/80 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
        >
          <LogOutIcon size={14} />
          <span>Sign Out</span>
        </button>
      </div>
    </>
  )
}
