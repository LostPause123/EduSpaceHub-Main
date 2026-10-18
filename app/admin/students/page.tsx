'use client'

import { useRouter } from 'next/navigation'
import AdminAuthGuard from '@/components/AdminAuthGuard'
import AdminLayout from '@/components/AdminLayout'
import Students from '@/pages/admin/Students'

export default function AdminStudentsPage() {
  const router = useRouter()

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
      if (target.page === 'admin-bookings' && target.bookingId) {
        router.push(`/admin/bookings/${target.bookingId}`)
      } else {
        const routeName = target.page.replace('admin-', '')
        router.push(`/admin/${routeName}`)
      }
    }
  }

  return (
    <AdminAuthGuard>
      <AdminLayout activePage="admin-students" navigate={handleNavigate}>
        <Students navigate={handleNavigate} />
      </AdminLayout>
    </AdminAuthGuard>
  )
}
