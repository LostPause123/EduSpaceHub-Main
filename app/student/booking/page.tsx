'use client'

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Booking from '@/pages/student/Booking'
import Layout from '@/components/Layout'

function BookingContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tutorId = searchParams ? searchParams.get('tutorId') || undefined : undefined

  return (
    <Layout
      activePage="find-sessions"
      navigate={(target) => {
        if (typeof target === 'string') {
          if (target === 'booking-confirmation') router.push('/student/booking-confirmation')
          else if (target === 'booking-conflict') router.push('/student/booking-conflict')
          else router.push(target === 'dashboard' ? '/' : `/student/${target}`)
        } else {
          router.push(`/student/${target.page}`)
        }
      }}
    >
      <Booking
        tutorId={tutorId}
        navigate={(target) => {
          if (typeof target === 'string') {
            if (target === 'booking-confirmation') router.push('/student/booking-confirmation')
            else if (target === 'booking-conflict') router.push('/student/booking-conflict')
            else router.push(target === 'dashboard' ? '/' : `/student/${target}`)
          } else {
            router.push(`/student/${target.page}`)
          }
        }}
      />
    </Layout>
  )
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading booking session...</div>}>
      <BookingContent />
    </Suspense>
  )
}
