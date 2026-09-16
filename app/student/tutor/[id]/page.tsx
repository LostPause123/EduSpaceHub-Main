'use client'

import { useParams, useRouter } from 'next/navigation'
import TutorProfile from '@/pages/student/TutorProfile'
import Layout from '@/components/Layout'

export default function TutorProfilePage() {
  const params = useParams()
  const router = useRouter()
  const tutorId = params?.id as string

  return (
    <Layout
      activePage="find-sessions"
      navigate={(target) => {
        if (typeof target === 'string') {
          router.push(target === 'dashboard' ? '/' : `/student/${target}`)
        } else if (target.page === 'booking') {
          router.push(`/student/booking?tutorId=${target.tutorId}`)
        } else {
          router.push(`/student/${target.page}`)
        }
      }}
    >
      <TutorProfile
        tutorId={tutorId}
        navigate={(target) => {
          if (typeof target === 'string') {
            router.push(target === 'dashboard' ? '/' : `/student/${target}`)
          } else if (target.page === 'booking') {
            router.push(`/student/booking?tutorId=${target.tutorId}`)
          } else {
            router.push(`/student/${target.page}`)
          }
        }}
      />
    </Layout>
  )
}
