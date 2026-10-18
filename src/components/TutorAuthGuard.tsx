'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { GraduationCapIcon } from './ui'

interface TutorAuthGuardProps {
  children: ReactNode
  onUnauthorized?: () => void
}

export default function TutorAuthGuard({ children, onUnauthorized }: TutorAuthGuardProps) {
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function checkTutorAuth() {
      try {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          // Unauthenticated user -> redirect to login
          if (onUnauthorized) onUnauthorized()
          router.replace('/')
          return
        }

        // Fetch profile
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', user.id)
          .maybeSingle()

        if (error) {
          console.error('Error checking user role:', error)
          setErrorMessage('Error verifying permissions.')
          setLoading(false)
          return
        }

        // Check if role is tutor
        if (profile && profile.role === 'tutor') {
          setAuthorized(true)
        } else if (profile && profile.role === 'admin') {
          // Admin redirected to admin dashboard
          console.log('Admin redirected to admin dashboard from tutor guard')
          if (onUnauthorized) onUnauthorized()
          router.replace('/admin')
        } else {
          // Student or other role redirected to student home
          console.warn('Unauthorized access to tutor area by user:', user.email, 'role:', profile?.role)
          if (onUnauthorized) onUnauthorized()
          router.replace('/')
        }
      } catch (err) {
        console.error('Unexpected error in TutorAuthGuard:', err)
        setErrorMessage('An unexpected authentication error occurred.')
      } finally {
        setLoading(false)
      }
    }

    checkTutorAuth()
  }, [router, onUnauthorized])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAF8] text-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-md animate-pulse">
            <GraduationCapIcon size={24} />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Verifying Tutor Permissions...</p>
        </div>
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAF8] px-4">
        <div className="bg-white border border-border rounded-xl p-6 max-w-md w-full text-center shadow-sm">
          <div className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-3">
            !
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">Access Restricted</h3>
          <p className="text-xs text-muted-foreground mb-4">{errorMessage}</p>
          <button
            onClick={() => router.replace('/')}
            className="px-4 py-2 bg-primary text-white text-xs font-medium rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  if (!authorized) {
    return null
  }

  return <>{children}</>
}
