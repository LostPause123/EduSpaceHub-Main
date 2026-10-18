'use client'

import { useRouter, useParams } from 'next/navigation'
import AdminAuthGuard from '@/components/AdminAuthGuard'
import AdminLayout from '@/components/AdminLayout'
import BookingDetails from '@/pages/admin/BookingDetails'

export default function AdminBookingDetailPage() {
  const router = useRouter()
  const params = useParams()
  const bookingId = (params?.id as string) || ''

  function handleNavigate(target: any) {
    if (typeof target === 'string') {
      if (target === 'admin-dashboard') router.push('/admin')
      else if (target === 'admin-tutors') router.push('/admin/tutors')
      else if (target === 'admin-students') router.push('/admin/students')
      else if (target === 'admin-bookings') router.push('/admin/bookings')
      else if (target === 'admin-schedules') router.push('/admin/schedules')
      else if (target === 'admin-profile') router.push('/admin/profile')
      else router.push('/')
    } else if (target && target.page) {
      if (target.page === 'admin-booking-details' && target.bookingId) {
        router.push(`/admin/bookings/${target.bookingId}`)
      } else {
        const routeName = target.page.replace('admin-', '')
        router.push(`/admin/${routeName}`)
      }
    }
  }

  return (
    <AdminAuthGuard>
      <AdminLayout activePage="admin-bookings" navigate={handleNavigate}>
        <BookingDetails navigate={handleNavigate} bookingId={bookingId} />
      </AdminLayout>
    </AdminAuthGuard>
  )
}
