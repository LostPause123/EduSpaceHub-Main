'use client'

import { useState, useEffect } from 'react'
import type { Navigate, Booking } from '../../types'
import { Card, Button, Badge, Avatar, CalendarIcon, ClockIcon, VideoIcon, MapPinIcon } from '../../components/ui'
import { supabase } from '../../lib/supabase'

interface BookingConfirmationProps {
  navigate: Navigate
  bookingId?: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function BookingConfirmation({ navigate, bookingId }: BookingConfirmationProps) {
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadBooking() {
      try {
        setLoading(true)
        const {
          data: { user },
        } = await supabase.auth.getUser()
        const studentId = user?.id || '6b163bc1-1e73-4faf-b5bc-d7c6c1a71c5c'

        if (bookingId) {
          const res = await fetch(`${API_URL}/api/bookings/${bookingId}`)
          if (res.ok) {
            const data = await res.json()
            setBooking(data.booking)
            return
          }
        }

        // Fallback: fetch student's latest booking
        const res = await fetch(`${API_URL}/api/bookings?student_id=${studentId}`)
        if (res.ok) {
          const data = await res.json()
          setBooking(data.bookings?.[data.bookings.length - 1] || null)
        }
      } catch (err) {
        console.error('Failed to load confirmation details:', err)
      } finally {
        setLoading(false)
      }
    }

    loadBooking()
  }, [bookingId])

  if (loading) {
    return (
      <div className="px-6 lg:px-8 py-20 max-w-lg mx-auto text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Loading confirmation...</p>
      </div>
    )
  }

  const tutorName = booking?.tutorName || 'Your Tutor'
  const tutorSubject = booking?.tutorSubject || 'Tutoring Session'
  const tutorAvatar =
    booking?.tutorAvatar ||
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&h=80&fit=crop&auto=format'
  const displayDate = booking?.displayDate || 'Upcoming Session'
  const time = booking?.time ? `${booking.time} · ${booking.duration || 60} minutes` : 'Scheduled Time'
  const locationLabel =
    booking?.location === 'in-person'
      ? `In-person · ${booking.room || 'Campus Room'}`
      : 'Online · meeting link in details'
  const price = booking?.price ? `$${booking.price.toFixed(2)}` : '$45.00'

  return (
    <div className="px-6 lg:px-8 py-16 max-w-lg mx-auto">
      {/* Success state */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-5">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#4A7B5E"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-foreground">Booking confirmed</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Your session has been booked. A confirmation email has been sent to your university address.
        </p>
      </div>

      {/* Booking summary card */}
      <Card className="p-6 mb-6">
        <div className="flex items-center gap-4 mb-5 pb-5 border-b border-border">
          <Avatar src={tutorAvatar} alt={tutorName} size="lg" />
          <div>
            <p className="font-semibold text-foreground">{tutorName}</p>
            <p className="text-sm text-muted-foreground">{tutorSubject}</p>
            <Badge variant="success" className="mt-1">
              Confirmed
            </Badge>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <span className="text-primary">
              <CalendarIcon size={15} />
            </span>
            {displayDate}
          </div>
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <span className="text-primary">
              <ClockIcon size={15} />
            </span>
            {time}
          </div>
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <span className="text-primary">
              {booking?.location === 'in-person' ? <MapPinIcon size={15} /> : <VideoIcon size={15} />}
            </span>
            {locationLabel}
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-border">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Session fee</span>
            <span className="font-semibold text-foreground">{price}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-muted-foreground">Payment method</span>
            <span className="text-foreground">·· 4242</span>
          </div>
        </div>
      </Card>

      {/* Reminder card */}
      <Card className="p-4 mb-6 bg-primary-50 border-primary/20">
        <p className="text-sm font-medium text-primary mb-1">Reminder set</p>
        <p className="text-xs text-primary/80">
          You&apos;ll receive an email and in-app notification 2 hours before your session starts.
        </p>
      </Card>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <Button
          fullWidth
          size="lg"
          onClick={() =>
            navigate(
              booking?.id
                ? { page: 'booking-details', bookingId: booking.id }
                : 'my-bookings'
            )
          }
        >
          View booking details
        </Button>
        <Button fullWidth variant="outline" size="lg" onClick={() => navigate('dashboard')}>
          Back to dashboard
        </Button>
      </div>
    </div>
  )
}
