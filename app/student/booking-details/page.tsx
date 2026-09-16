'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import BookingDetails from '@/pages/student/BookingDetails'
import Layout from '@/components/Layout'

function BookingDetailsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookingId = searchParams ? (searchParams.get('bookingId') || undefined) : undefined

  return (
    <Layout
      activePage="my-bookings"
      navigate={(target) => {
        if (typeof target === 'string') {
          router.push(target === 'dashboard' ? '/' : `/student/${target}`)
        } else {
          const query = target.bookingId ? `?bookingId=${target.bookingId}` : ''
          router.push(`/student/${target.page}${query}`)
        }
      }}
    >
      <BookingDetails
        bookingId={bookingId}
        navigate={(target) => {
          if (typeof target === 'string') {
            router.push(target === 'dashboard' ? '/' : `/student/${target}`)
          } else {
            const query = target.bookingId ? `?bookingId=${target.bookingId}` : ''
            router.push(`/student/${target.page}${query}`)
          }
        }}
      />
    </Layout>
  )
}

export default function BookingDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-sm text-muted-foreground">
          Loading booking details...
        </div>
      }
    >
      <BookingDetailsContent />
    </Suspense>
  )
}
