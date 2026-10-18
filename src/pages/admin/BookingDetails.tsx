'use client'

import { useEffect, useState } from 'react'
import type { Navigate, AdminBooking } from '../../types'
import {
  SectionHeader,
  Card,
  Badge,
  Button,
  Avatar,
  Modal,
  Input,
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  XIcon,
  VideoIcon,
  MapPinIcon,
  RefreshIcon,
  AlertCircleIcon,
} from '../../components/ui'

interface BookingDetailsProps {
  navigate?: Navigate
  bookingId?: string
}

export default function BookingDetails({ navigate, bookingId: propBookingId }: BookingDetailsProps) {
  const [bookingId, setBookingId] = useState<string | null>(propBookingId || null)
  const [booking, setBooking] = useState<AdminBooking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  // Cancel Modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  useEffect(() => {
    // If no propBookingId provided, extract from URL params if in browser
    if (!propBookingId && typeof window !== 'undefined') {
      const parts = window.location.pathname.split('/')
      const last = parts[parts.length - 1]
      if (last && last !== 'bookings') {
        setBookingId(last)
      }
    } else if (propBookingId) {
      setBookingId(propBookingId)
    }
  }, [propBookingId])

  async function fetchBookingDetails() {
    if (!bookingId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`http://localhost:3000/api/bookings/${bookingId}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      const data = await res.json()
      if (data.success) {
        setBooking(data.booking)
      } else {
        throw new Error(data.error || 'Failed to fetch booking details')
      }
    } catch (err: any) {
      console.error('Error fetching booking details:', err)
      setError(err.message || 'Could not connect to server.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails()
    }
  }, [bookingId])

  function handleBack() {
    if (navigate) {
      navigate('admin-bookings')
    } else if (typeof window !== 'undefined') {
      window.location.href = '/admin/bookings'
    }
  }

  async function handleUpdateStatus(newStatus: string, reasonText?: string) {
    if (!bookingId) return
    setUpdating(true)
    try {
      const res = await fetch(`http://localhost:3000/api/admin/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reason: reasonText }),
      })

      if (!res.ok) throw new Error('Failed to update booking status')
      const data = await res.json()
      if (data.success && data.booking) {
        setBooking(data.booking)
        setCancelModalOpen(false)
        setCancelReason('')
      } else {
        throw new Error(data.error || 'Update failed')
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setUpdating(false)
    }
  }

  function getStatusBadge(status?: string) {
    switch (status) {
      case 'confirmed':
      case 'upcoming':
        return <Badge variant="success" className="text-sm px-3 py-1">Confirmed</Badge>
      case 'completed':
        return <Badge variant="secondary" className="text-sm px-3 py-1">Completed</Badge>
      case 'cancelled':
        return <Badge variant="destructive" className="text-sm px-3 py-1">Cancelled</Badge>
      case 'pending':
        return <Badge variant="warning" className="text-sm px-3 py-1">Pending</Badge>
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="h-8 w-36 bg-border/60 rounded animate-pulse" />
        <div className="h-64 bg-white border border-border rounded-xl animate-pulse p-6" />
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Button variant="ghost" onClick={handleBack} className="gap-2">
          <ArrowLeftIcon size={16} />
          Back to Bookings
        </Button>
        <Card className="p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-3">
            <AlertCircleIcon size={24} />
          </div>
          <h3 className="text-base font-semibold text-foreground">Booking Not Found</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">{error || 'Could not find booking record.'}</p>
          <Button variant="outline" size="sm" onClick={fetchBookingDetails}>
            Retry
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header & Back Button */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={handleBack} className="gap-2 text-sm font-medium">
          <ArrowLeftIcon size={16} />
          Back to Bookings
        </Button>
        <Button variant="outline" size="sm" onClick={fetchBookingDetails} className="gap-1.5">
          <RefreshIcon size={14} />
          Refresh
        </Button>
      </div>

      <SectionHeader
        title={`Booking #${booking.id.slice(0, 8)}...`}
        subtitle="Complete session details and administrative status controls."
        action={getStatusBadge(booking.status)}
      />

      {/* Admin Quick Action Controls */}
      <Card className="p-4 bg-primary-50/40 border-primary-100 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-semibold text-primary uppercase tracking-wider">
          Admin Status Controls
        </div>
        <div className="flex items-center gap-2">
          {booking.status !== 'confirmed' && (
            <Button
              variant="primary"
              size="sm"
              loading={updating}
              onClick={() => handleUpdateStatus('confirmed')}
            >
              Mark as Confirmed
            </Button>
          )}
          {booking.status !== 'completed' && (
            <Button
              variant="secondary"
              size="sm"
              loading={updating}
              onClick={() => handleUpdateStatus('completed')}
            >
              Mark as Completed
            </Button>
          )}
          {booking.status !== 'cancelled' && (
            <Button
              variant="destructive"
              size="sm"
              loading={updating}
              onClick={() => setCancelModalOpen(true)}
            >
              Cancel Booking
            </Button>
          )}
        </div>
      </Card>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Student Card */}
        <Card className="p-6">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
            Student Information
          </div>
          <div className="flex items-center gap-4">
            <Avatar src={booking.studentAvatar} alt={booking.studentName} size="xl" />
            <div>
              <h4 className="text-base font-bold text-foreground">{booking.studentName}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">{booking.studentEmail || 'Registered Student'}</p>
              <Badge variant="outline" className="mt-2 text-[10px]">
                Student ID: {booking.studentId ? booking.studentId.slice(0, 8) : 'N/A'}...
              </Badge>
            </div>
          </div>
        </Card>

        {/* Tutor Card */}
        <Card className="p-6">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
            Tutor Information
          </div>
          <div className="flex items-center gap-4">
            <Avatar src={booking.tutorAvatar} alt={booking.tutorName} size="xl" />
            <div>
              <h4 className="text-base font-bold text-foreground">{booking.tutorName}</h4>
              <p className="text-xs text-primary font-semibold mt-0.5">{booking.tutorSubject}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{booking.tutorTitle}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Session Details Card */}
      <Card className="p-6 space-y-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground pb-2 border-b border-border">
          Session & Time Information
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-secondary/40 p-4 rounded-lg border border-border">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1 font-medium">
              <CalendarIcon size={14} />
              Session Date
            </span>
            <span className="text-sm font-bold text-foreground">
              {booking.displayDate || booking.date}
            </span>
          </div>

          <div className="bg-secondary/40 p-4 rounded-lg border border-border">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1 font-medium">
              <ClockIcon size={14} />
              Start & End Time
            </span>
            <span className="text-sm font-bold text-foreground">
              {booking.time} ({booking.duration || 60} mins)
            </span>
          </div>

          <div className="bg-secondary/40 p-4 rounded-lg border border-border">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1 font-medium">
              {booking.location === 'in-person' ? <MapPinIcon size={14} /> : <VideoIcon size={14} />}
              Location / Format
            </span>
            <span className="text-sm font-bold text-foreground capitalize">
              {booking.location === 'in-person' ? (booking.room || 'In-Person Study Room') : 'Online Video Room'}
            </span>
          </div>
        </div>

        {/* Meeting Link or Room Info */}
        {booking.meetingLink && (
          <div className="p-3 bg-white border border-border rounded-lg flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Meeting Link:</span>
            <a
              href={booking.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary font-semibold hover:underline"
            >
              {booking.meetingLink}
            </a>
          </div>
        )}

        {/* Session Notes */}
        <div>
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Session Notes / Special Instructions
          </h4>
          <div className="p-4 bg-secondary/30 border border-border rounded-lg text-sm text-foreground leading-relaxed">
            {booking.notes || 'No session notes provided.'}
          </div>
        </div>

        {/* Cancellation Reason if applicable */}
        {booking.cancelledReason && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive">
            <span className="font-bold block mb-1">Cancellation Reason:</span>
            {booking.cancelledReason}
          </div>
        )}
      </Card>

      {/* Cancel Booking Modal */}
      <Modal
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel Session Booking"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to cancel this booking? Please provide a reason for student & tutor records.
          </p>
          <Input
            label="Cancellation Reason"
            placeholder="e.g. Schedule conflict or student requested cancellation"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="outline" onClick={() => setCancelModalOpen(false)}>
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              loading={updating}
              onClick={() => handleUpdateStatus('cancelled', cancelReason)}
            >
              Confirm Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
