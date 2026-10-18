'use client'

import { useRouter } from 'next/navigation'
import TutorAuthGuard from '@/components/TutorAuthGuard'
import TutorLayout from '@/components/TutorLayout'
import Schedules from '@/pages/tutor/Schedules'

export default function TutorSchedulesPage() {
  const router = useRouter()

  function handleNavigate(target: any) {
    if (typeof target === 'string') {
      if (target === 'tutor-dashboard') router.push('/tutor')
      else if (target === 'tutor-bookings') router.push('/tutor/bookings')
      else if (target === 'tutor-schedules') router.push('/tutor/schedules')
      else if (target === 'tutor-students') router.push('/tutor/students')
      else if (target === 'tutor-profile') router.push('/tutor/profile')
      else router.push('/')
    } else if (target && target.page) {
      const routeName = target.page.replace('tutor-', '')
      router.push(`/tutor/${routeName}`)
    }
  }

  return (
    <TutorAuthGuard>
      <TutorLayout activePage="tutor-schedules" navigate={handleNavigate}>
        <Schedules navigate={handleNavigate} />
      </TutorLayout>
    </TutorAuthGuard>
  )
}
