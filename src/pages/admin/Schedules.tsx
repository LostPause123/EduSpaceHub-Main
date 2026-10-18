'use client'

import { useEffect, useState } from 'react'
import type { Navigate, AdminTutor, AdminBooking } from '../../types'
import {
  SectionHeader,
  Card,
  Badge,
  Button,
  Select,
  Avatar,
  CalendarIcon,
  ClockIcon,
  RefreshIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  BookmarkIcon,
} from '../../components/ui'

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
]

const TIME_SLOTS = [
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
]

export default function Schedules({ navigate }: SchedulesProps) {
  const [tutors, setTutors] = useState<AdminTutor[]>([])
  const [selectedTutorId, setSelectedTutorId] = useState<string>('')
  const [bookings, setBookings] = useState<AdminBooking[]>([])
  const [loadingTutors, setLoadingTutors] = useState(true)
  const [loadingBookings, setLoadingBookings] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchTutors() {
    setLoadingTutors(true)
    setError(null)
    try {
      const res = await fetch('http://localhost:3000/api/admin/tutors')
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      const data = await res.json()
      if (data.success && data.tutors?.length > 0) {
        setTutors(data.tutors)
        setSelectedTutorId(data.tutors[0].id)
      } else {
        setTutors([])
      }
    } catch (err: any) {
      console.error('Error fetching tutors for schedule:', err)
      setError(err.message || 'Could not connect to server.')
    } finally {
      setLoadingTutors(false)
    }
  }

  async function fetchTutorBookings(tutorId: string) {
    if (!tutorId) return
    setLoadingBookings(true)
    try {
      const res = await fetch(`http://localhost:3000/api/admin/bookings?tutor_id=${tutorId}`)
      if (!res.ok) throw new Error('Failed to fetch tutor bookings')
      const data = await res.json()
      if (data.success) {
        setBookings(data.bookings || [])
      }
    } catch (err: any) {
      console.error('Error fetching bookings for tutor schedule:', err)
    } finally {
      setLoadingBookings(false)
    }
  }

  useEffect(() => {
    fetchTutors()
  }, [])

  useEffect(() => {
    if (selectedTutorId) {
      fetchTutorBookings(selectedTutorId)
    }
  }, [selectedTutorId])

  const currentTutor = tutors.find((t) => t.id === selectedTutorId)

  // Map bookings to time slots for schedule grid
  function getSlotStatus(dayIndex: number, timeStr: string) {
    // Generate simulated dates for the upcoming week based on dayIndex
    const today = new Date()
    const currentDayOfWeek = today.getDay() // 0 = Sun, 1 = Mon...
    const diff = (dayIndex + 1) - currentDayOfWeek
    const targetDate = new Date(today)
    targetDate.setDate(today.getDate() + diff)
    const dateIso = targetDate.toISOString().split('T')[0]

    // Find any matching active booking for this tutor on target date or time
    const matchedBooking = bookings.find((b) => {
      if (b.status === 'cancelled') return false
      if (b.date === dateIso) {
        return b.time.startsWith(timeStr)
      }
      return false
    })

    return matchedBooking
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <SectionHeader
        title="Tutor Schedules & Availability"
        subtitle="Inspect weekly available time slots and active student bookings for tutors."
        action={
          <Button variant="outline" size="sm" onClick={() => fetchTutorBookings(selectedTutorId)} className="gap-2">
            <RefreshIcon size={14} />
            Refresh Schedule
          </Button>
        }
      />

      {/* Tutor Selector Card */}
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="w-full sm:w-80">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Select Tutor
            </label>
            <Select
              value={selectedTutorId}
              onChange={(e) => setSelectedTutorId(e.target.value)}
              options={tutors.map((t) => ({
                value: t.id,
                label: `${t.full_name || t.name} (${t.subjects?.[0] || t.subject || 'General'})`,
              }))}
            />
          </div>

          {currentTutor && (
            <div className="flex items-center gap-3 bg-secondary/40 p-3 rounded-lg border border-border w-full sm:w-auto">
              <Avatar src={currentTutor.avatar_url || currentTutor.avatarUrl} alt={currentTutor.full_name || currentTutor.name} size="md" />
              <div>
                <h4 className="text-sm font-bold text-foreground">{currentTutor.full_name || currentTutor.name}</h4>
                <p className="text-xs text-primary font-medium">
                  {(currentTutor.subjects || []).join(', ') || 'General'}
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Legend & Summary */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-emerald-100 border border-emerald-300" />
            <span className="text-foreground">Available Slot</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-amber-100 border border-amber-300" />
            <span className="text-foreground">Booked Session</span>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">
          Showing upcoming week schedule
        </span>
      </div>

      {/* Weekly Schedule Grid */}
      {loadingTutors || loadingBookings ? (
        <div className="h-96 bg-white border border-border rounded-xl animate-pulse p-6" />
      ) : error ? (
        <Card className="p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-3">
            <AlertCircleIcon size={24} />
          </div>
          <h3 className="text-base font-semibold text-foreground">Error loading schedule</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchTutors}>
            Retry
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-secondary/60 border-b border-border">
                  <th className="p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24 border-r border-border">
                    Time
                  </th>
                  {DAYS_OF_WEEK.map((day) => (
                    <th key={day} className="p-3 text-xs font-semibold text-foreground uppercase tracking-wider text-center border-r border-border last:border-r-0">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {TIME_SLOTS.map((time) => (
                  <tr key={time} className="hover:bg-secondary/20 transition-colors">
                    <td className="p-3 font-semibold text-muted-foreground border-r border-border bg-secondary/20">
                      {time}
                    </td>
                    {DAYS_OF_WEEK.map((day, dIdx) => {
                      const booking = getSlotStatus(dIdx, time)
                      return (
                        <td key={day} className="p-2 border-r border-border last:border-r-0 text-center">
                          {booking ? (
                            <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-md p-2 text-[11px] space-y-0.5 shadow-2xs">
                              <span className="font-bold block truncate">{booking.studentName}</span>
                              <span className="text-[10px] text-amber-700 block capitalize">
                                {booking.status}
                              </span>
                            </div>
                          ) : (
                            <div className="bg-emerald-50/60 border border-emerald-200/80 text-emerald-800 rounded-md p-2 text-[11px] font-medium hover:bg-emerald-100 transition-colors">
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
        </Card>
      )}
    </div>
  )
}
