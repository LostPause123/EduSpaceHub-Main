'use client'

import { useRouter } from 'next/navigation'
import BookingConflict from '@/pages/student/BookingConflict'
import Layout from '@/components/Layout'

export default function BookingConflictPage() {
  const router = useRouter()
  return (
    <Layout
      activePage="find-sessions"
      navigate={(target) => {
        if (typeof target === 'string') {
          router.push(target === 'dashboard' ? '/' : `/student/${target}`)
        } else {
          router.push(`/student/${target.page}`)
        }
      }}
    >
      <BookingConflict
        navigate={(target) => {
          if (typeof target === 'string') {
            router.push(target === 'dashboard' ? '/' : `/student/${target}`)
          } else {
            router.push(`/student/${target.page}`)
          }
        }}
      />
    </Layout>
  )
}
