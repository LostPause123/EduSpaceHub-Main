'use client'

import { useRouter } from 'next/navigation'
import FindSessions from '@/pages/student/FindSessions'
import Layout from '@/components/Layout'

export default function FindSessionsPage() {
  const router = useRouter()
  return (
    <Layout
      activePage="find-sessions"
      navigate={(target) => {
        if (typeof target === 'string') {
          if (target === 'dashboard') router.push('/')
          else router.push(`/student/${target}`)
        } else {
          if (target.page === 'booking' && target.tutorId) {
            router.push(`/student/booking?tutorId=${target.tutorId}`)
          } else if (target.page === 'tutor-profile' && target.tutorId) {
            router.push(`/student/tutor/${target.tutorId}`)
          } else {
            router.push(`/student/${target.page}`)
          }
        }
      }}
    >
      <FindSessions
        navigate={(target) => {
          if (typeof target === 'string') {
            if (target === 'dashboard') router.push('/')
            else router.push(`/student/${target}`)
          } else {
            if (target.page === 'booking' && target.tutorId) {
              router.push(`/student/booking?tutorId=${target.tutorId}`)
            } else if (target.page === 'tutor-profile' && target.tutorId) {
              router.push(`/student/tutor/${target.tutorId}`)
            } else {
              router.push(`/student/${target.page}`)
            }
          }
        }}
      />
    </Layout>
  )
}
