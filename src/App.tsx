'use client'

import { useState, useEffect } from 'react'
import type { NavState, PageName, Navigate } from './types'
import { supabase } from './lib/supabase'

import Layout from './components/Layout'

import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'

import Dashboard from './pages/student/Dashboard'
import FindSessions from './pages/student/FindSessions'
import TutorProfile from './pages/student/TutorProfile'
import Booking from './pages/student/Booking'
import BookingConfirmation from './pages/student/BookingConfirmation'
import BookingConflict from './pages/student/BookingConflict'
import MyBookings from './pages/student/MyBookings'
import BookingDetails from './pages/student/BookingDetails'
import Notifications from './pages/student/Notifications'
import LearningMaterials from './pages/student/LearningMaterials'
import Profile from './pages/student/Profile'
import Settings from './pages/student/Settings'

import AdminAuthGuard from './components/AdminAuthGuard'
import AdminLayout from './components/AdminLayout'
import AdminDashboard from './pages/admin/Dashboard'
import AdminTutors from './pages/admin/Tutors'
import AdminStudents from './pages/admin/Students'
import AdminBookings from './pages/admin/Bookings'
import AdminBookingDetails from './pages/admin/BookingDetails'
import AdminSchedules from './pages/admin/Schedules'
import AdminProfile from './pages/admin/Profile'
import AdminMaterials from './pages/admin/Materials'

import TutorAuthGuard from './components/TutorAuthGuard'
import TutorLayout from './components/TutorLayout'
import TutorDashboard from './pages/tutor/Dashboard'
import TutorBookings from './pages/tutor/Bookings'
import TutorSchedules from './pages/tutor/Schedules'
import TutorStudents from './pages/tutor/Students'
import TutorSelfProfile from './pages/tutor/Profile'
import TutorMaterials from './pages/tutor/Materials'

const AUTH_PAGES: PageName[] = ['login', 'register', 'forgot-password', 'reset-password']
const ADMIN_PAGES: PageName[] = [
  'admin-dashboard',
  'admin-tutors',
  'admin-students',
  'admin-bookings',
  'admin-booking-details',
  'admin-schedules',
  'admin-profile',
  'admin-materials',
]
const TUTOR_PAGES: PageName[] = [
  'tutor-dashboard',
  'tutor-bookings',
  'tutor-schedules',
  'tutor-students',
  'tutor-profile',
  'tutor-materials',
]

export default function App() {
  const [nav, setNav] = useState<NavState>({ page: 'login' })

  const navigate: Navigate = (target) => {
    if (typeof target === 'string') {
      setNav({ page: target })
    } else {
      setNav(target)
    }
    window.scrollTo(0, 0)
  }

  useEffect(() => {
    // 1. Detect password recovery tokens or paths in URL
    if (typeof window !== 'undefined') {
      const hash = window.location.hash
      const search = window.location.search
      const path = window.location.pathname
      if (
        hash.includes('type=recovery') ||
        search.includes('type=recovery') ||
        path.includes('reset-password')
      ) {
        setNav({ page: 'reset-password' })
      }
    }

    // 2. Listen for Supabase PASSWORD_RECOVERY event
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setNav({ page: 'reset-password' })
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const isAuth = AUTH_PAGES.includes(nav.page)

  function renderPage() {
    switch (nav.page) {
      case 'login':
        return <Login navigate={navigate} />
      case 'register':
        return <Register navigate={navigate} />
      case 'forgot-password':
        return <ForgotPassword navigate={navigate} />
      case 'reset-password':
        return <ResetPassword navigate={navigate} />
      case 'dashboard':
        return <Dashboard navigate={navigate} />
      case 'find-sessions':
        return <FindSessions navigate={navigate} />
      case 'student-tutor-profile':
        return <TutorProfile navigate={navigate} tutorId={nav.tutorId} />
      case 'booking':
        return <Booking navigate={navigate} tutorId={nav.tutorId} bookingId={nav.bookingId} />
      case 'booking-confirmation':
        return <BookingConfirmation navigate={navigate} bookingId={nav.bookingId} />
      case 'booking-conflict':
        return <BookingConflict navigate={navigate} />
      case 'my-bookings':
        return <MyBookings navigate={navigate} />
      case 'booking-details':
        return <BookingDetails navigate={navigate} bookingId={nav.bookingId} />
      case 'notifications':
        return <Notifications navigate={navigate} />
      case 'learning-materials':
        return <LearningMaterials navigate={navigate} />
      case 'profile':
        return <Profile navigate={navigate} />
      case 'settings':
        return <Settings navigate={navigate} />
      case 'admin-dashboard':
        return <AdminDashboard navigate={navigate} />
      case 'admin-tutors':
        return <AdminTutors navigate={navigate} />
      case 'admin-students':
        return <AdminStudents navigate={navigate} />
      case 'admin-bookings':
        return <AdminBookings navigate={navigate} />
      case 'admin-booking-details':
        return <AdminBookingDetails navigate={navigate} bookingId={nav.bookingId} />
      case 'admin-schedules':
        return <AdminSchedules navigate={navigate} />
      case 'admin-profile':
        return <AdminProfile navigate={navigate} />
      case 'admin-materials':
        return <AdminMaterials navigate={navigate} />
      case 'tutor-dashboard':
        return <TutorDashboard navigate={navigate} />
      case 'tutor-bookings':
        return <TutorBookings navigate={navigate} />
      case 'tutor-schedules':
        return <TutorSchedules navigate={navigate} />
      case 'tutor-students':
        return <TutorStudents navigate={navigate} />
      case 'tutor-profile':
        return <TutorSelfProfile navigate={navigate} />
      case 'tutor-materials':
        return <TutorMaterials navigate={navigate} />
      default:
        return <Dashboard navigate={navigate} />
    }
  }

  const isAdmin = ADMIN_PAGES.includes(nav.page)
  const isTutor = TUTOR_PAGES.includes(nav.page)

  if (isAuth) {
    return <div className="min-h-full bg-background">{renderPage()}</div>
  }

  if (isAdmin) {
    return (
      <AdminAuthGuard onUnauthorized={() => navigate('dashboard')}>
        <AdminLayout navigate={navigate} activePage={nav.page}>
          {renderPage()}
        </AdminLayout>
      </AdminAuthGuard>
    )
  }

  if (isTutor) {
    return (
      <TutorAuthGuard onUnauthorized={() => navigate('dashboard')}>
        <TutorLayout navigate={navigate} activePage={nav.page}>
          {renderPage()}
        </TutorLayout>
      </TutorAuthGuard>
    )
  }

  return (
    <Layout navigate={navigate} activePage={nav.page}>
      {renderPage()}
    </Layout>
  )
}
