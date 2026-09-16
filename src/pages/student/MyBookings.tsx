'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Navigate, Booking } from '../../types'
import {
  Card,
  Badge,
  Button,
  Avatar,
  Tabs,
  EmptyState,
  Modal,
  CalendarIcon,
  ClockIcon,
  VideoIcon,
  MapPinIcon,
  ChevronRightIcon,
  AlertCircleIcon,
} from '../../components/ui'
import { supabase } from '../../lib/supabase'

interface MyBookingsProps {
  navigate: Navigate
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function MyBookings({ navigate }: MyBookingsProps) {
  const [activeTab, setActiveTab] = useState('upcoming')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cancellation modal state
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // 1. Get authenticated user
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // Fallback to active student profile ID in dev if not logged in
      const studentId = user?.id || '6b163bc1-1e73-4faf-b5bc-d7c6c1a71c5c'

      // 2. Fetch real bookings from Express API
      const res = await fetch(`${API_URL}/api/bookings?student_id=${studentId}`)

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Server error: ${res.status}`)
      }

      const data = await res.json()
      setBookings(data.bookings || [])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not connect to the booking server.'
      console.error('Failed to load bookings:', message)
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  async function handleConfirmCancel() {
    if (!bookingToCancel) return

    try {
      setCancelling(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      const studentId = user?.id || '6b163bc1-1e73-4faf-b5bc-d7c6c1a71c5c'

      const res = await fetch(`${API_URL}/api/bookings/${bookingToCancel.id}/cancel`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: cancelReason || 'Cancelled by student',
          student_id: studentId,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to cancel booking')
      }

      const data = await res.json()
      const updatedBooking: Booking = data.booking

      // Update state in-place with real server data
      setBookings((prev) =>
        prev.map((b) => (b.id === updatedBooking.id ? updatedBooking : b))
      )

      setBookingToCancel(null)
      setCancelReason('')
      // Switch tab to cancelled to show the result
      setActiveTab('cancelled')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error cancelling booking'
      alert(msg)
    } finally {
      setCancelling(false)
    }
  }

  const upcoming = bookings.filter((b) => b.status === 'upcoming')
  const completed = bookings.filter((b) => b.status === 'completed')
  const cancelled = bookings.filter((b) => b.status === 'cancelled')

  const displayBookings =
    activeTab === 'upcoming'
      ? upcoming
      : activeTab === 'completed'
      ? completed
      : cancelled

  return (
    <div className="px-6 lg:px-8 py-8 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">My bookings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {upcoming.length} upcoming · {completed.length} completed
          </p>
        </div>
        <Button size="sm" onClick={() => navigate('find-sessions')}>
          Book new session
        </Button>
      </div>

      <Tabs
        tabs={[
          { id: 'upcoming', label: 'Upcoming', count: upcoming.length },
          { id: 'completed', label: 'Completed', count: completed.length },
          { id: 'cancelled', label: 'Cancelled', count: cancelled.length },
        ]}
        active={activeTab}
        onChange={setActiveTab}
        className="mb-6"
      />

      {loading ? (
        <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm">Loading your bookings...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-xl border border-destructive/20 bg-destructive/5 text-center my-6">
          <p className="text-sm text-destructive font-medium mb-1">Failed to load bookings</p>
          <p className="text-xs text-muted-foreground mb-4">{error}</p>
          <Button size="sm" variant="outline" onClick={fetchBookings}>
            Retry
          </Button>
        </div>
      ) : displayBookings.length === 0 ? (
        <EmptyState
          icon={<CalendarIcon size={32} />}
          title={`No ${activeTab} bookings`}
          description={
            activeTab === 'upcoming'
              ? "You don't have any upcoming sessions scheduled."
              : activeTab === 'completed'
              ? "You haven't completed any sessions yet."
              : "No cancelled bookings."
          }
          action={
            activeTab === 'upcoming' ? (
              <Button size="sm" onClick={() => navigate('find-sessions')}>
                Find a tutor
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {displayBookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              navigate={navigate}
              onCancel={() => setBookingToCancel(booking)}
            />
          ))}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {bookingToCancel && (
        <Modal
          open={Boolean(bookingToCancel)}
          onClose={() => {
            if (!cancelling) setBookingToCancel(null)
          }}
          title="Cancel booking"
          footer={
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                disabled={cancelling}
                onClick={() => setBookingToCancel(null)}
              >
                Keep booking
              </Button>
              <Button
                variant="destructive"
                loading={cancelling}
                onClick={handleConfirmCancel}
              >
                Yes, cancel booking
              </Button>
            </div>
          }
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-warning-50 text-warning shrink-0 mt-0.5">
              <AlertCircleIcon size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground mb-1">
                Cancel your session with {bookingToCancel.tutorName}?
              </p>
              <p className="text-sm text-muted-foreground mb-3">
                Your session is on <strong>{bookingToCancel.displayDate}</strong> at{' '}
                <strong>{bookingToCancel.time}</strong>.
              </p>
              <div className="bg-muted rounded-lg p-3 text-xs text-muted-foreground mb-4">
                <p className="font-medium text-foreground mb-1">Cancellation policy</p>
                <p>
                  Free cancellation more than 24 hours before the session. Within 24 hours, a
                  50% charge applies. Your refund will be processed within 3–5 business days.
                </p>
              </div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Reason for cancellation (optional)
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g., Schedule conflict, sickness..."
                className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function BookingCard({
  booking,
  navigate,
  onCancel,
}: {
  booking: Booking
  navigate: Navigate
  onCancel: () => void
}) {
  const statusConfig = {
    upcoming: { variant: 'success' as const, label: 'Upcoming' },
    completed: { variant: 'secondary' as const, label: 'Completed' },
    cancelled: { variant: 'destructive' as const, label: 'Cancelled' },
  }

  return (
    <Card className="overflow-hidden hover:shadow-sm transition-all">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <Avatar src={booking.tutorAvatar} alt={booking.tutorName} size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-foreground">{booking.tutorName}</p>
                <p className="text-sm text-muted-foreground">{booking.tutorSubject}</p>
              </div>
              <Badge variant={statusConfig[booking.status].variant}>
                {statusConfig[booking.status].label}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarIcon size={12} />
                {booking.displayDate}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ClockIcon size={12} />
                {booking.time} · {booking.duration} min
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {booking.location === 'online' ? <VideoIcon size={12} /> : <MapPinIcon size={12} />}
                <span className="capitalize">{booking.location}</span>
              </div>
            </div>

            {booking.cancelledReason && (
              <p className="text-xs text-muted-foreground mt-2 bg-destructive/5 border border-destructive/10 rounded px-2.5 py-1.5">
                Cancellation reason: {booking.cancelledReason}
              </p>
            )}

            {booking.notes && booking.status === 'upcoming' && (
              <p className="text-xs text-muted-foreground mt-2 bg-muted rounded px-2.5 py-1.5 truncate">
                Note: {booking.notes}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 py-3 border-t border-border bg-muted/30 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-foreground">${booking.price.toFixed(0)}</span>
        <div className="flex gap-2">
          {booking.status === 'upcoming' && (
            <>
              <Button
                size="xs"
                variant="outline"
                onClick={() =>
                  navigate({
                    page: 'booking',
                    tutorId: booking.tutorId,
                    bookingId: booking.id,
                  })
                }
              >
                Reschedule
              </Button>
              <Button
                size="xs"
                variant="ghost"
                className="text-destructive hover:bg-destructive/5 hover:text-destructive"
                onClick={onCancel}
              >
                Cancel
              </Button>
            </>
          )}
          {booking.status === 'completed' && (
            <Button size="xs" variant="outline">
              Leave review
            </Button>
          )}
          <Button
            size="xs"
            variant="ghost"
            className="flex items-center gap-1"
            onClick={() => navigate({ page: 'booking-details', bookingId: booking.id })}
          >
            Details
            <ChevronRightIcon size={12} />
          </Button>
        </div>
      </div>
    </Card>
  )
}
