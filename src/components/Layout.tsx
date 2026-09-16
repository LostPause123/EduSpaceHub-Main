'use client'

import { useState, useEffect, type ReactNode } from 'react'
import type { Navigate, PageName } from '../types'
import {
  cn,
  Avatar,
  XIcon,
  MenuIcon,
  HomeIcon,
  SearchIcon,
  BookmarkIcon,
  BookOpenIcon,
  BellIcon,
  UserIcon,
  SettingsIcon,
  LogOutIcon,
  GraduationCapIcon,
} from './ui'
import { notifications } from '../data/mockData'
import { supabase } from '../lib/supabase'

interface NavItem {
  page: PageName
  label: string
  icon: ReactNode
}

interface UserInfo {
  name: string
  program: string
  avatarUrl: string | null
}

const navItems: NavItem[] = [
  { page: 'dashboard', label: 'Dashboard', icon: <HomeIcon size={18} /> },
  { page: 'find-sessions', label: 'Find Sessions', icon: <SearchIcon size={18} /> },
  { page: 'my-bookings', label: 'My Bookings', icon: <BookmarkIcon size={18} /> },
  { page: 'learning-materials', label: 'Learning Materials', icon: <BookOpenIcon size={18} /> },
  { page: 'notifications', label: 'Notifications', icon: <BellIcon size={18} /> },
  { page: 'profile', label: 'Profile', icon: <UserIcon size={18} /> },
]

const bottomItems: NavItem[] = [
  { page: 'settings', label: 'Settings', icon: <SettingsIcon size={18} /> },
]

interface LayoutProps {
  children: ReactNode
  navigate: Navigate
  activePage: PageName
}

export default function Layout({ children, navigate, activePage }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<UserInfo>({
    name: 'Student',
    program: '',
    avatarUrl: null,
  })
  const unreadCount = notifications.filter((n) => !n.read).length

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) return

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle()

        const metadata = authUser.user_metadata ?? {}
        const name = profile?.full_name ?? metadata.full_name ?? (authUser.email ? authUser.email.split('@')[0] : 'Student')
        const program = metadata.program ?? profile?.program ?? (metadata.university || 'Student')
        const avatarUrl = profile?.avatar_url ?? metadata.avatar_url ?? null

        setUser({
          name,
          program,
          avatarUrl,
        })
      } catch (err) {
        console.error('Error loading user in Layout:', err)
      }
    }

    loadUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadUser()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function handleLogout() {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Error signing out:', err)
    } finally {
      navigate('login')
    }
  }

  function navTo(page: PageName) {
    navigate(page)
    setSidebarOpen(false)
  }

  return (
    <div className="flex h-full bg-[#FAFAF8]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-border/80 bg-white h-full">
        <SidebarContent
          activePage={activePage}
          unreadCount={unreadCount}
          navTo={navTo}
          navigate={navigate}
          user={user}
          onLogout={handleLogout}
        />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/25 backdrop-blur-2xs"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white border-r border-border/80 flex flex-col z-10 shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-xs">
                  <GraduationCapIcon size={18} />
                </div>
                <span className="font-semibold text-base text-foreground tracking-tight">EduSpace</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors cursor-pointer"
                aria-label="Close menu"
              >
                <XIcon size={18} />
              </button>
            </div>
            <SidebarContent
              activePage={activePage}
              unreadCount={unreadCount}
              navTo={navTo}
              navigate={navigate}
              user={user}
              onLogout={handleLogout}
              hideLogo
            />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-border/80 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors cursor-pointer"
            aria-label="Open menu"
          >
            <MenuIcon size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center text-white shadow-xs">
              <GraduationCapIcon size={16} />
            </div>
            <span className="font-semibold text-foreground tracking-tight">EduSpace</span>
          </div>
          <button onClick={() => navTo('profile')} className="shrink-0 cursor-pointer">
            <Avatar src={user.avatarUrl} alt={user.name} size="sm" />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

interface SidebarContentProps {
  activePage: PageName
  unreadCount: number
  navTo: (page: PageName) => void
  navigate: Navigate
  user: UserInfo
  onLogout: () => void
  hideLogo?: boolean
}

function SidebarContent({ activePage, unreadCount, navTo, navigate, user, onLogout, hideLogo }: SidebarContentProps) {
  return (
    <>
      {!hideLogo && (
        <div className="px-5 py-4 border-b border-border/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-xs shrink-0">
              <GraduationCapIcon size={18} />
            </div>
            <span className="font-semibold text-lg text-foreground tracking-tight">EduSpace</span>
          </div>
        </div>
      )}

      {/* Dynamic User Card */}
      <div className="px-4 py-3.5 border-b border-border/70 shrink-0">
        <div className="flex items-center gap-3">
          <Avatar src={user.avatarUrl} alt={user.name} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate leading-tight">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {user.program || 'Student Account'}
            </p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5">
        <div className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavButton
              key={item.page}
              item={item}
              active={activePage === item.page}
              badge={item.page === 'notifications' && unreadCount > 0 ? unreadCount : undefined}
              onClick={() => navTo(item.page)}
            />
          ))}
        </div>

        <div className="mt-6 mb-2 px-3">
          <p className="text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-widest">Account</p>
        </div>

        <div className="flex flex-col gap-1">
          {bottomItems.map((item) => (
            <NavButton
              key={item.page}
              item={item}
              active={activePage === item.page}
              onClick={() => navTo(item.page)}
            />
          ))}
          <button
            onClick={onLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors w-full text-left cursor-pointer"
          >
            <LogOutIcon size={18} />
            <span>Log out</span>
          </button>
        </div>
      </nav>
    </>
  )
}

interface NavButtonProps {
  item: NavItem
  active: boolean
  badge?: number
  onClick: () => void
}

function NavButton({ item, active, badge, onClick }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors w-full text-left cursor-pointer',
        active
          ? 'bg-primary-50 text-primary font-semibold'
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60',
      )}
    >
      <span className="shrink-0">{item.icon}</span>
      <span className="flex-1 font-medium">{item.label}</span>
      {badge !== undefined && (
        <span className="text-xs bg-primary text-white rounded-full px-1.5 py-0.5 font-medium leading-none">
          {badge}
        </span>
      )}
    </button>
  )
}
