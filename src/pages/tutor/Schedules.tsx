'use client'

import { useEffect, useState } from 'react'
import type { Navigate, TutorBooking } from '../../types'
import {
  SectionHeader,
  Card,
  Badge,
  Button,
  Avatar,
  CalendarIcon,
  ClockIcon,
  RefreshIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XIcon,
} from '../../components/ui'
import { supabase } from '../../lib/supabase'

interface SchedulesProps {
  navigate?: Navigate
}

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

const TIME_SLOTS = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
]

export default function TutorSchedules({ navigate }: SchedulesProps) {
  const [weekOffset, setWeekOffset] = useState(0) // 0 = current week, 1 = next week, etc.
  const [bookings, setBookings] = useState<TutorBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState<TutorBooking | null>(null)

  // Calculate Monday of the selected week
  function getMonday(offset: number) {
    const d = new Date()
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
    const monday = new Date(d.setDate(diff))
    monday.setDate(monday.getDate() + offset * 7)
    monday.setHours(0, 0, 0, 0)
    return monday
  }

  const currentMonday = getMonday(weekOffset)

  // Array of 7 dates for this week
  const weekDates = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(currentMonday)
    d.setDate(d.getDate() + i)
    return d
  })

  const weekRangeLabel = `${weekDates[0].toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })} – ${weekDates[6].toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`

  async function fetchSchedules() {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      let success = false
      try {
        const res = await fetch('http://localhost:3000/api/tutor/bookings', {
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
        const { data: tutorRow } = await supabase
          .from('tutors')
          .select('id, hourly_rate, rating, subjects, profiles(*)')
          .eq('profile_id', session.user.id)
          .single()

        if (tutorRow) {
          const { data: rows } = await supabase
            .from('bookings')
            .select('*')
            .eq('tutor_id', tutorRow.id)
            .neq('status', 'cancelled')

          const studentIds = Array.from(new Set((rows || []).map((b) => b.student_id).filter(Boolean)))
          const { data: studentProfiles } = await supabase
            .from('profiles')
            .select('id, full_name, email, avatar_url')
            .in('id', studentIds)

          const studentMap: Record<string, any> = {}
          ;(studentProfiles || []).forEach((p) => {
            studentMap[p.id] = p
          })

          const formatted: TutorBooking[] = (rows || []).map((b) => {
            const st = new Date(b.start_time)
            const student = studentMap[b.student_id]
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
              status: b.status,
              location: 'online',
              price: tutorRow.hourly_rate || 40,
              studentId: b.student_id,
              studentName: student?.full_name || 'Student',
              studentEmail: student?.email || '',
              studentAvatar: student?.avatar_url || '',
              notes: b.notes,
            }
          })
          setBookings(formatted)
        }
      }
    } catch (err) {
      console.error('Error fetching schedules:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSchedules()
  }, [])

  function getBookingForSlot(date: Date, timeSlot: string) {
    const dateStr = date.toISOString().split('T')[0]
    return bookings.find((b) => {
      if (b.status === 'cancelled') return false
      if (b.date === dateStr) {
        return b.time.startsWith(timeSlot)
      }
      return false
    })
  }

  // Count booked sessions this week
  const weekDateStrings = weekDates.map((d) => d.toISOString().split('T')[0])
  const sessionsThisWeek = bookings.filter(
    (b) => b.status !== 'cancelled' && weekDateStrings.includes(b.date)
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <SectionHeader
        title="My Schedule"
        subtitle="Manage your tutoring schedule, review booked sessions, and view available slots."
        action={
          <Button variant="outline" size="sm" onClick={fetchSchedules} className="gap-2 cursor-pointer">
            <RefreshIcon size={14} />
            Refresh
          </Button>
        }
      />

      {/* Week Navigator & Metrics */}
      <Card className="p-4 sm:p-5 bg-white border border-border">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWeekOffset(weekOffset - 1)}
                className="p-2 cursor-pointer"
                aria-label="Previous week"
              >
                <ChevronLeftIcon size={16} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWeekOffset(0)}
                className="text-xs px-3 cursor-pointer"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWeekOffset(weekOffset + 1)}
                className="p-2 cursor-pointer"
                aria-label="Next week"
              >
                <ChevronRightIcon size={16} />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <CalendarIcon size={16} className="text-primary" />
              <span className="text-sm font-bold text-foreground">{weekRangeLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-primary-50 border border-primary-100 text-primary font-medium">
              <strong>{sessionsThisWeek.length}</strong> session(s) this week
            </div>
            <div className="flex items-center gap-3 font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300" />
                <span className="text-foreground">Booked</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-50 border border-emerald-200" />
                <span className="text-muted-foreground">Available</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Schedule Table / Grid */}
      <Card className="p-4 bg-white border border-border overflow-hidden">
        {loading ? (
          <div className="h-96 animate-pulse bg-secondary/30 rounded-xl" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-3 px-3 text-left font-semibold text-muted-foreground w-20">Time</th>
                  {weekDates.map((d, i) => {
                    const isToday = new Date().toISOString().split('T')[0] === d.toISOString().split('T')[0]
                    return (
                      <th
                        key={i}
                        className={`py-3 px-2 text-center font-semibold ${
                          isToday ? 'bg-primary-50/60 text-primary' : 'text-foreground'
                        }`}
                      >
                        <div className="text-[11px] uppercase tracking-wider">{DAYS_OF_WEEK[i]}</div>
                        <div className={`text-base font-bold mt-0.5 ${isToday ? 'text-primary' : ''}`}>
                          {d.getDate()}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {TIME_SLOTS.map((timeSlot) => (
                  <tr key={timeSlot} className="hover:bg-secondary/10 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-muted-foreground">
                      {timeSlot}
                    </td>
                    {weekDates.map((date, dayIdx) => {
                      const booking = getBookingForSlot(date, timeSlot)

                      return (
                        <td key={dayIdx} className="p-1 min-w-[130px] h-14 align-top">
                          {booking ? (
                            <button
                              onClick={() => setSelectedBooking(booking)}
                              className="w-full h-full p-1.5 rounded-lg bg-amber-50 border border-amber-200 hover:border-amber-400 text-left transition-colors cursor-pointer flex flex-col justify-between"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-semibold text-amber-900 truncate text-[11px]">
                                  {booking.studentName}
                                </span>
                                <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-amber-200 text-amber-900 border-none">
                                  Booked
                                </Badge>
                              </div>
                              <span className="text-[10px] text-amber-700 truncate">
                                {booking.time} • 1h
                              </span>
                            </button>
                          ) : (
                            <div className="w-full h-full rounded-lg border border-dashed border-border/60 hover:bg-emerald-50/30 transition-colors flex items-center justify-center text-[10px] text-muted-foreground/50">
                              Available
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl border border-border p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Session Details</h3>
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
                  <span className="text-muted-foreground block text-[11px]">Rate</span>
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
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
