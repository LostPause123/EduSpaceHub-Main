'use client'

import { useState } from 'react'
import type { NavState, PageName, Navigate } from './types'

import Layout from './components/Layout'

import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'

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

const AUTH_PAGES: PageName[] = ['login', 'register', 'forgot-password']

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

  const isAuth = AUTH_PAGES.includes(nav.page)

  function renderPage() {
    switch (nav.page) {
      case 'login':
        return <Login navigate={navigate} />
      case 'register':
        return <Register navigate={navigate} />
      case 'forgot-password':
        return <ForgotPassword navigate={navigate} />
      case 'dashboard':
        return <Dashboard navigate={navigate} />
      case 'find-sessions':
        return <FindSessions navigate={navigate} />
      case 'tutor-profile':
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
      default:
        return <Dashboard navigate={navigate} />
    }
  }

  if (isAuth) {
    return (
      <div className="min-h-full bg-background">
        {renderPage()}
      </div>
    )
  }

  return (
    <Layout navigate={navigate} activePage={nav.page}>
      {renderPage()}
    </Layout>
  )
}
