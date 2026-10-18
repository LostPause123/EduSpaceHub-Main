'use client'

import { useEffect, useState } from 'react'
import type { Navigate, TutorBooking } from '../../types'
import {
  Card,
  Badge,
  Button,
  Avatar,
  Input,
  SectionHeader,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  XIcon,
  AlertCircleIcon,
  RefreshIcon,
  SearchIcon,
  FilterIcon,
} from '../../components/ui'
import { supabase } from '../../lib/supabase'

interface TutorBookingsProps {
  navigate?: Navigate
}

export default function TutorBookings({ navigate }: TutorBookingsProps) {
  const [bookings, setBookings] = useState<TutorBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'completed' | 'cancelled'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBooking, setSelectedBooking] = useState<TutorBooking | null>(null)
  const [updating, setUpdating] = useState(false)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  async function fetchBookings() {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      let success = false
      try {
        const url = statusFilter === 'all'
          ? 'http://localhost:3000/api/tutor/bookings'
          : `http://localhost:3000/api/tutor/bookings?status=${statusFilter}`

        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })
        if (res.ok) {
          const data = await res.json()
          if (data.success) {
            setBookings(data.bookings || [])
            success = true
          }
        }
      } catch (err) {
        console.warn('API error, falling back to Supabase:', err)
      }

      if (!success) {
        // Direct query fallback
        const { data: tutorRow } = await supabase
          .from('tutors')
          .select('id, hourly_rate, rating, subjects, profiles(*)')
          .eq('profile_id', session.user.id)
          .single()

        if (!tutorRow) throw new Error('Tutor profile not found.')

        let query = supabase
          .from('bookings')
          .select('*')
          .eq('tutor_id', tutorRow.id)
          .order('start_time', { ascending: false })

        const { data: rows, error: qErr } = await query
        if (qErr) throw qErr

        const all = rows || []
        const studentIds = Array.from(new Set(all.map((b) => b.student_id).filter(Boolean)))
        const { data: studentProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', studentIds)

        const studentMap: Record<string, any> = {}
        ;(studentProfiles || []).forEach((p) => {
          studentMap[p.id] = p
        })

        const now = Date.now()
        const formatted: TutorBooking[] = all.map((b) => {
          const st = new Date(b.start_time)
          const student = studentMap[b.student_id]
          const isCancelled = b.status === 'cancelled'
          const isCompleted = b.status === 'completed' || new Date(b.end_time).getTime() < now
          const status = isCancelled ? 'cancelled' : isCompleted ? 'completed' : 'upcoming'

          const tutorProfile: any = Array.isArray(tutorRow.profiles) ? tutorRow.profiles[0] : tutorRow.profiles

          return {
            id: b.id,
            tutorId: tutorRow.id,
            tutorName: tutorProfile?.full_name || 'Tutor',
            tutorTitle: 'Tutor',
            tutorSubject: tutorRow.subjects?.[0] || 'General',
            tutorAvatar: tutorProfile?.avatar_url || '',
            date: st.toISOString().split('T')[0],
            displayDate: st.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            time: st.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
            duration: 60,
            type: 'one-on-one',
            status,
            location: 'online',
            price: tutorRow.hourly_rate || 40,
            studentId: b.student_id,
            studentName: student?.full_name || 'Student',
            studentEmail: student?.email || '',
            studentAvatar: student?.avatar_url || '',
            notes: b.notes,
          }
        })

        const filtered = statusFilter === 'all'
          ? formatted
          : formatted.filter((b) => b.status === statusFilter)

        setBookings(filtered)
      }
    } catch (err: any) {
      console.error('Error fetching bookings:', err)
      setError(err.message || 'Failed to load bookings.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings()
  }, [statusFilter])

  async function handleStatusUpdate(bookingId: string, newStatus: string, notes?: string) {
    setUpdating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      let apiSuccess = false
      try {
        const res = await fetch(`http://localhost:3000/api/tutor/bookings/${bookingId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ status: newStatus, notes }),
        })
        if (res.ok) {
          const data = await res.json()
          if (data.success) apiSuccess = true
        }
      } catch (err) {
        console.warn('API update failed, trying Supabase direct:', err)
      }

      if (!apiSuccess) {
        const updatePayload: any = { status: newStatus, updated_at: new Date().toISOString() }
        if (notes !== undefined) updatePayload.notes = notes
        const { error: sbErr } = await supabase
          .from('bookings')
          .update(updatePayload)
          .eq('id', bookingId)
        if (sbErr) throw sbErr
      }

      await fetchBookings()
      setSelectedBooking(null)
      setCancelModalOpen(false)
      setCancelReason('')
    } catch (err: any) {
      alert(`Error updating booking: ${err.message}`)
    } finally {
      setUpdating(false)
    }
  }

  const filteredBookings = bookings.filter((b) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      b.studentName?.toLowerCase().includes(q) ||
      b.studentEmail?.toLowerCase().includes(q) ||
      b.notes?.toLowerCase().includes(q) ||
      b.date.includes(q)
    )
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <SectionHeader
        title="My Bookings"
        subtitle="Manage and view your tutoring sessions scheduled with students."
        action={
          <Button variant="outline" size="sm" onClick={fetchBookings} className="gap-2 cursor-pointer">
            <RefreshIcon size={14} />
            Refresh
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-border">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {(['all', 'upcoming', 'completed', 'cancelled'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer capitalize ${
                statusFilter === tab
                  ? 'bg-primary text-white font-semibold'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="w-full sm:w-64">
          <Input
            placeholder="Search student or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<SearchIcon size={14} />}
          />
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm flex items-center justify-between">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={fetchBookings}>Retry</Button>
        </div>
      )}

      {/* Bookings List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-white border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredBookings.length === 0 ? (
        <Card className="p-12 text-center bg-white border border-border">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
            <CalendarIcon size={24} />
          </div>
          <h3 className="text-base font-semibold text-foreground">No bookings found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {statusFilter !== 'all'
              ? `There are no ${statusFilter} sessions right now.`
              : 'You do not have any tutoring bookings yet.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((b) => (
            <Card
              key={b.id}
              className="p-4 sm:p-5 bg-white border border-border/80 hover:border-primary/40 transition-colors shadow-2xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Left: Student & Time details */}
                <div className="flex items-start sm:items-center gap-3.5">
                  <Avatar src={b.studentAvatar} alt={b.studentName || 'Student'} size="md" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-foreground">{b.studentName}</h4>
                      <Badge
                        variant={
                          b.status === 'completed'
                            ? 'default'
                            : b.status === 'cancelled'
                            ? 'destructive'
                            : 'secondary'
                        }
                        className="text-[10px] capitalize"
                      >
                        {b.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{b.studentEmail}</p>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-2">
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <CalendarIcon size={13} className="text-primary" />
                        {b.displayDate || b.date}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <ClockIcon size={13} className="text-primary" />
                        {b.time} ({b.duration || 60} mins)
                      </span>
                      <span>•</span>
                      <span className="font-semibold text-primary">${b.price}</span>
                    </div>

                    {b.notes && (
                      <p className="text-[11px] text-muted-foreground/90 bg-secondary/50 rounded px-2 py-1 mt-2 inline-block max-w-md truncate">
                        <strong>Note:</strong> {b.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedBooking(b)}
                    className="text-xs cursor-pointer"
                  >
                    Details
                  </Button>

                  {b.status === 'upcoming' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleStatusUpdate(b.id, 'completed')}
                        disabled={updating}
                        className="text-xs bg-primary text-white hover:bg-primary/90 cursor-pointer"
                      >
                        Mark Done
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedBooking(b)
                          setCancelModalOpen(true)
                        }}
                        disabled={updating}
                        className="text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Booking Details Modal */}
      {selectedBooking && !cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl border border-border p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Booking Details</h3>
              <button
                onClick={() => setSelectedBooking(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <XIcon size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/40">
                <Avatar src={selectedBooking.studentAvatar} alt={selectedBooking.studentName || 'Student'} size="md" />
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{selectedBooking.studentName}</h4>
                  <p className="text-xs text-muted-foreground">{selectedBooking.studentEmail}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg border border-border/60">
                  <span className="text-muted-foreground block text-[11px]">Date</span>
                  <span className="font-semibold text-foreground mt-0.5 block">{selectedBooking.displayDate || selectedBooking.date}</span>
                </div>
                <div className="p-3 rounded-lg border border-border/60">
                  <span className="text-muted-foreground block text-[11px]">Time</span>
                  <span className="font-semibold text-foreground mt-0.5 block">{selectedBooking.time} ({selectedBooking.duration || 60}m)</span>
                </div>
                <div className="p-3 rounded-lg border border-border/60">
                  <span className="text-muted-foreground block text-[11px]">Price</span>
                  <span className="font-semibold text-foreground mt-0.5 block">${selectedBooking.price}</span>
                </div>
                <div className="p-3 rounded-lg border border-border/60">
                  <span className="text-muted-foreground block text-[11px]">Status</span>
                  <Badge variant="secondary" className="mt-0.5 capitalize">{selectedBooking.status}</Badge>
                </div>
              </div>

              {selectedBooking.notes && (
                <div className="p-3 rounded-lg border border-border/60 text-xs">
                  <span className="text-muted-foreground block text-[11px] font-medium">Session Notes:</span>
                  <p className="text-foreground mt-1 leading-relaxed">{selectedBooking.notes}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setSelectedBooking(null)} className="cursor-pointer">
                Close
              </Button>
              {selectedBooking.status === 'upcoming' && (
                <Button
                  size="sm"
                  onClick={() => handleStatusUpdate(selectedBooking.id, 'completed')}
                  disabled={updating}
                  className="bg-primary text-white cursor-pointer"
                >
                  Mark Completed
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cancel Session Modal */}
      {cancelModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl border border-border p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Cancel Tutoring Session</h3>
              <button
                onClick={() => setCancelModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <XIcon size={18} />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Are you sure you want to cancel the session with <strong>{selectedBooking.studentName}</strong> scheduled for{' '}
              {selectedBooking.displayDate || selectedBooking.date} at {selectedBooking.time}?
            </p>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">
                Reason for Cancellation (optional):
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g., Tutor emergency, rescheduled by agreement..."
                rows={3}
                className="w-full text-xs p-2.5 rounded-lg border border-border bg-white text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setCancelModalOpen(false)} className="cursor-pointer">
                Keep Session
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() =>
                  handleStatusUpdate(
                    selectedBooking.id,
                    'cancelled',
                    cancelReason ? `[Cancelled by Tutor: ${cancelReason}] ${selectedBooking.notes || ''}` : `[Cancelled by Tutor] ${selectedBooking.notes || ''}`
                  )
                }
                disabled={updating}
                className="cursor-pointer"
              >
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
