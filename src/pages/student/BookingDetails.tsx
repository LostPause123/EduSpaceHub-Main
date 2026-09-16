'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Navigate, Booking } from '../../types'
import {
  Card,
  Badge,
  Button,
  Avatar,
  Modal,
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  VideoIcon,
  MapPinIcon,
  ExternalLinkIcon,
  RefreshIcon,
  AlertCircleIcon,
} from '../../components/ui'
import { supabase } from '../../lib/supabase'

interface BookingDetailsProps {
  navigate: Navigate
  bookingId?: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function BookingDetails({ navigate, bookingId }: BookingDetailsProps) {
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

  const fetchBooking = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      const studentId = user?.id || '6b163bc1-1e73-4faf-b5bc-d7c6c1a71c5c'

      let targetBooking: Booking | null = null

      if (bookingId) {
        const res = await fetch(`${API_URL}/api/bookings/${bookingId}`)
        if (!res.ok) {
          throw new Error('Booking not found or could not be loaded.')
        }
        const data = await res.json()
        targetBooking = data.booking
      } else {
        // Fallback: fetch student's latest booking
        const res = await fetch(`${API_URL}/api/bookings?student_id=${studentId}`)
        if (res.ok) {
          const data = await res.json()
          targetBooking = data.bookings?.[0] || null
        }
      }

      if (!targetBooking) {
        throw new Error('No booking details available.')
      }

      setBooking(targetBooking)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load booking details.'
      console.error(msg)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [bookingId])

  useEffect(() => {
    fetchBooking()
  }, [fetchBooking])

  async function handleCancel() {
    if (!booking) return

    try {
      setCancelling(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      const studentId = user?.id || '6b163bc1-1e73-4faf-b5bc-d7c6c1a71c5c'

      const res = await fetch(`${API_URL}/api/bookings/${booking.id}/cancel`, {
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
        throw new Error(errData.error || 'Failed to cancel booking.')
      }

      setShowCancelModal(false)
      navigate('my-bookings')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error cancelling booking.'
      alert(msg)
    } finally {
      setCancelling(false)
    }
  }

  const statusConfig = {
    upcoming: { variant: 'success' as const, label: 'Upcoming' },
    completed: { variant: 'secondary' as const, label: 'Completed' },
    cancelled: { variant: 'destructive' as const, label: 'Cancelled' },
  }

  if (loading) {
    return (
      <div className="px-6 lg:px-8 py-20 max-w-2xl mx-auto text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Loading booking details...</p>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="px-6 lg:px-8 py-12 max-w-2xl mx-auto">
        <button
          onClick={() => navigate('my-bookings')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeftIcon size={14} />
          My bookings
        </button>
        <div className="p-6 rounded-xl border border-border bg-card text-center">
          <p className="text-base font-semibold text-foreground mb-1">Booking not found</p>
          <p className="text-sm text-muted-foreground mb-4">
            {error || "The requested booking does not exist or you don't have permission to view it."}
          </p>
          <Button size="sm" onClick={() => navigate('my-bookings')}>
            Return to my bookings
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 lg:px-8 py-8 max-w-2xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate('my-bookings')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeftIcon size={14} />
        My bookings
      </button>

      <div className="flex items-start justify-between gap-4 mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Booking details</h1>
        <Badge variant={statusConfig[booking.status].variant}>
          {statusConfig[booking.status].label}
        </Badge>
      </div>

      {/* Tutor card */}
      <Card className="p-5 mb-4">
        <div className="flex items-center gap-4">
          <Avatar src={booking.tutorAvatar} alt={booking.tutorName} size="lg" />
          <div>
            <p className="font-semibold text-foreground">{booking.tutorName}</p>
            <p className="text-sm text-muted-foreground">{booking.tutorTitle}</p>
            <p className="text-sm text-muted-foreground">{booking.tutorSubject}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto shrink-0"
            onClick={() => navigate({ page: 'tutor-profile', tutorId: booking.tutorId })}
          >
            View profile
          </Button>
        </div>
      </Card>

      {/* Session details */}
      <Card className="p-5 mb-4">
        <h3 className="text-sm font-semibold text-foreground mb-4">Session details</h3>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5 text-sm">
            <span className="text-muted-foreground w-5 shrink-0">
              <CalendarIcon size={15} />
            </span>
            <span className="text-muted-foreground w-20 shrink-0">Date</span>
            <span className="font-medium text-foreground">{booking.displayDate}</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm">
            <span className="text-muted-foreground w-5 shrink-0">
              <ClockIcon size={15} />
            </span>
            <span className="text-muted-foreground w-20 shrink-0">Time</span>
            <span className="font-medium text-foreground">
              {booking.time} · {booking.duration} min
            </span>
          </div>
          <div className="flex items-center gap-2.5 text-sm">
            <span className="text-muted-foreground w-5 shrink-0">
              {booking.location === 'online' ? <VideoIcon size={15} /> : <MapPinIcon size={15} />}
            </span>
            <span className="text-muted-foreground w-20 shrink-0">Location</span>
            <span className="font-medium text-foreground capitalize">{booking.location}</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm">
            <span className="text-muted-foreground w-5 shrink-0">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
              >
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </span>
            <span className="text-muted-foreground w-20 shrink-0">Type</span>
            <span className="font-medium text-foreground capitalize">
              {booking.type.replace('-', ' ')}
            </span>
          </div>
        </div>
      </Card>

      {/* Meeting link (online) */}
      {booking.location === 'online' && booking.meetingLink && booking.status === 'upcoming' && (
        <Card className="p-5 mb-4 bg-primary-50 border-primary/20">
          <p className="text-sm font-semibold text-primary mb-1">Meeting link</p>
          <a
            href={booking.meetingLink}
            className="text-sm text-primary hover:text-primary/80 flex items-center gap-1.5 font-medium transition-colors"
            onClick={(e) => e.preventDefault()}
          >
            {booking.meetingLink}
            <ExternalLinkIcon size={12} />
          </a>
          <p className="text-xs text-primary/70 mt-1.5">
            Link becomes active 15 minutes before your session
          </p>
        </Card>
      )}

      {/* In-person location */}
      {booking.location === 'in-person' && booking.room && (
        <Card className="p-5 mb-4">
          <p className="text-sm font-semibold text-foreground mb-1">Location</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPinIcon size={14} />
            {booking.room}
          </div>
        </Card>
      )}

      {/* Cancellation reason if cancelled */}
      {booking.cancelledReason && (
        <Card className="p-5 mb-4 bg-destructive/5 border-destructive/20">
          <h3 className="text-sm font-semibold text-destructive mb-1">Cancelled Session</h3>
          <p className="text-sm text-muted-foreground">
            Reason: <strong>{booking.cancelledReason}</strong>
          </p>
        </Card>
      )}

      {/* Notes */}
      {booking.notes && (
        <Card className="p-5 mb-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">Session notes</h3>
          <p className="text-sm text-muted-foreground">{booking.notes}</p>
        </Card>
      )}

      {/* Payment */}
      <Card className="p-5 mb-6">
        <h3 className="text-sm font-semibold text-foreground mb-3">Payment</h3>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-muted-foreground">Session fee ({booking.duration} min)</span>
          <span className="font-medium text-foreground">${booking.price.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Platform fee</span>
          <span className="font-medium text-foreground">$0.00</span>
        </div>
        <div className="flex justify-between text-sm font-semibold border-t border-border mt-3 pt-3">
          <span className="text-foreground">Total</span>
          <span className="text-foreground">${booking.price.toFixed(2)}</span>
        </div>
      </Card>

      {/* Actions */}
      {booking.status === 'upcoming' && (
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() =>
              navigate({
                page: 'booking',
                tutorId: booking.tutorId,
                bookingId: booking.id,
              })
            }
          >
            <RefreshIcon size={14} />
            Reschedule
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={() => setShowCancelModal(true)}
          >
            Cancel booking
          </Button>
        </div>
      )}

      {/* Cancel modal */}
      <Modal
        open={showCancelModal}
        onClose={() => {
          if (!cancelling) setShowCancelModal(false)
        }}
        title="Cancel booking"
        footer={
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              disabled={cancelling}
              onClick={() => setShowCancelModal(false)}
            >
              Keep booking
            </Button>
            <Button variant="destructive" loading={cancelling} onClick={handleCancel}>
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
              Cancel your session with {booking.tutorName}?
            </p>
            <p className="text-sm text-muted-foreground mb-3">
              Your session is on <strong>{booking.displayDate}</strong> at{' '}
              <strong>{booking.time}</strong>.
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
              placeholder="e.g., Schedule conflict, illness..."
              className="w-full text-xs px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
