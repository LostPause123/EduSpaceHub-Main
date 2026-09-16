'use client'

import { useRouter } from 'next/navigation'
import MyBookings from '@/pages/student/MyBookings'
import Layout from '@/components/Layout'
import type { NavState, PageName } from '@/types'

export default function MyBookingsPage() {
  const router = useRouter()

  function handleNavigate(target: NavState | PageName) {
    if (typeof target === 'string') {
      router.push(target === 'dashboard' ? '/' : `/student/${target}`)
    } else {
      const params = new URLSearchParams()
      if (target.bookingId) params.set('bookingId', target.bookingId)
      if (target.tutorId) params.set('tutorId', target.tutorId)
      const qs = params.toString() ? `?${params.toString()}` : ''
      router.push(`/student/${target.page}${qs}`)
    }
  }

  return (
    <Layout activePage="my-bookings" navigate={handleNavigate}>
      <MyBookings navigate={handleNavigate} />
    </Layout>
  )
}
