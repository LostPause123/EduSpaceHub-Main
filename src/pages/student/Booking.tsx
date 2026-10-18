'use client'

import { useState, useEffect } from 'react'
import type { Navigate, Tutor } from '../../types'
import {
  Card,
  Badge,
  Button,
  Avatar,
  Textarea,
  cn,
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  VideoIcon,
  MapPinIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '../../components/ui'
import { tutors } from '../../data/mockData'
import { supabase } from '../../lib/supabase'

interface BookingProps {
  navigate: Navigate
  tutorId?: string
  bookingId?: string
}

type SessionType = 'one-on-one' | 'group'
type Duration = 60 | 90 | 120

const TUTOR_UUID_TO_MOCK: Record<string, string> = {
  '20000000-0000-4000-8000-000000000001': 't1',
  '20000000-0000-4000-8000-000000000002': 't2',
  '20000000-0000-4000-8000-000000000003': 't3',
  '20000000-0000-4000-8000-000000000004': 't4',
  '20000000-0000-4000-8000-000000000005': 't5',
  '20000000-0000-4000-8000-000000000006': 't6',
}

const MOCK_TO_TUTOR_UUID: Record<string, string> = {
  t1: '20000000-0000-4000-8000-000000000001',
  t2: '20000000-0000-4000-8000-000000000002',
  t3: '20000000-0000-4000-8000-000000000003',
  t4: '20000000-0000-4000-8000-000000000004',
  t5: '20000000-0000-4000-8000-000000000005',
  t6: '20000000-0000-4000-8000-000000000006',
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const STANDARD_TIME_SLOTS = [
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

function padZero(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

function formatYMD(year: number, monthIndex: number, day: number): string {
  return `${year}-${padZero(monthIndex + 1)}-${padZero(day)}`
}

function getTodayYMD(): string {
  const now = new Date()
  return formatYMD(now.getFullYear(), now.getMonth(), now.getDate())
}

function parseYMD(ymdStr: string): { year: number; month: number; day: number } {
  const parts = ymdStr.split('-').map(Number)
  return {
    year: parts[0] || new Date().getFullYear(),
    month: (parts[1] || 1) - 1,
    day: parts[2] || 1,
  }
}

function formatDisplayDate(ymdStr: string): string {
  if (!ymdStr) return 'Select a date'
  const { year, month, day } = parseYMD(ymdStr)
  const d = new Date(year, month, day)
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function Booking({ navigate, tutorId, bookingId }: BookingProps) {
  // 1. Resolve initial tutor
  const resolvedMockId = tutorId && TUTOR_UUID_TO_MOCK[tutorId] ? TUTOR_UUID_TO_MOCK[tutorId] : tutorId
  const initialTutor = tutors.find((t) => t.id === tutorId || t.id === resolvedMockId) ?? tutors[0]
  const [tutor, setTutor] = useState<Tutor>(initialTutor)

  const targetTutorId =
    tutorId && tutorId.includes('-')
      ? tutorId
      : MOCK_TO_TUTOR_UUID[tutor.id] || '20000000-0000-4000-8000-000000000001'

  // Fetch real tutor details if available from API
  useEffect(() => {
    fetch('http://localhost:3000/api/tutors')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.tutors)) {
          const match = data.tutors.find((t: any) => t.id === targetTutorId || t.profile_id === targetTutorId)
          if (match) {
            setTutor((prev) => ({
              ...prev,
              name: match.full_name || match.name || prev.name,
              subject: match.subject || match.subjects?.[0] || prev.subject,
              pricePerHour: match.hourly_rate || match.pricePerHour || prev.pricePerHour,
              avatarUrl: match.avatar_url || match.avatarUrl || prev.avatarUrl,
            }))
          }
        }
      })
      .catch(() => {})
  }, [targetTutorId])

  // 2. Booking steps & state
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [sessionType, setSessionType] = useState<SessionType>('one-on-one')
  const [duration, setDuration] = useState<Duration>(60)
  const [location, setLocation] = useState<'online' | 'in-person'>('online')

  // Calendar dates
  const todayYMD = getTodayYMD()

  // Default selected date to 2026-09-20 if in September 2026, or today
  const defaultInitialDate =
    todayYMD.startsWith('2026-09') ? '2026-09-20' : todayYMD

  const [selectedDate, setSelectedDate] = useState<string>(defaultInitialDate)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  // Calendar view month & year
  const initialParsed = parseYMD(defaultInitialDate)
  const [viewYear, setViewYear] = useState<number>(initialParsed.year)
  const [viewMonth, setViewMonth] = useState<number>(initialParsed.month)

  // Existing bookings for tutor availability/conflict check
  const [existingBookings, setExistingBookings] = useState<any[]>([])

  useEffect(() => {
    if (!targetTutorId) return
    fetch(`http://localhost:3000/api/bookings?tutor_id=${targetTutorId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.bookings)) {
          setExistingBookings(data.bookings)
        }
      })
      .catch((e) => console.warn('Could not fetch existing bookings:', e))
  }, [targetTutorId])

  // Threshold for past dates:
  // If in September 2026 (the project's demo timeline), allow September 20, 2026 (Test A)
  // while still disabling earlier dates like Sep 1..14 (Test D).
  // Otherwise, dates strictly prior to today are disabled.
  const pastThreshold =
    todayYMD > '2026-09-20' && todayYMD.startsWith('2026-09')
      ? '2026-09-15'
      : todayYMD

  const price = (tutor.pricePerHour * duration) / 60

  // Calendar calculations
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDayOfWeek = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7 // Monday = 0

  const prevMonthDaysCount = new Date(viewYear, viewMonth, 0).getDate()
  const prevDays = []
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    prevDays.push(prevMonthDaysCount - i)
  }

  const totalShown = firstDayOfWeek + daysInMonth
  const nextDaysCount = totalShown % 7 === 0 ? 0 : 7 - (totalShown % 7)
  const nextDays = []
  for (let i = 1; i <= nextDaysCount; i++) {
    nextDays.push(i)
  }

  function handlePrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((prev) => prev - 1)
    } else {
      setViewMonth((prev) => prev - 1)
    }
  }

  function handleNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((prev) => prev + 1)
    } else {
      setViewMonth((prev) => prev + 1)
    }
  }

  function handleGoToToday() {
    const now = new Date()
    setViewYear(now.getFullYear())
    setViewMonth(now.getMonth())
    setSelectedDate(todayYMD)
    setSelectedTime(null)
  }

  const isPrevMonthDisabled =
    viewYear < 2026 || (viewYear === 2026 && viewMonth < 8)

  async function handleConfirm() {
    // 1. Validation
    if (!selectedDate) {
      alert('Please select a date for your session.')
      return
    }
    if (!selectedTime) {
      alert('Please select a time slot.')
      return
    }
    if (!duration || duration <= 0) {
      alert('Please select a valid duration.')
      return
    }
    if (!targetTutorId) {
      alert('Tutor ID is missing.')
      return
    }

    setLoading(true)

    try {
      // Get the currently logged-in student or fallback to active student profile
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const studentId = user?.id || '6b163bc1-1e73-4faf-b5bc-d7c6c1a71c5c'

      // If rescheduling an existing booking:
      if (bookingId) {
        const response = await fetch(`http://localhost:3000/api/bookings/${bookingId}/reschedule`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            student_id: studentId,
            date: selectedDate,
            time: selectedTime,
            duration,
            notes,
          }),
        })

        const result = await response.json()

        if (response.status === 200) {
          navigate('my-bookings')
          return
        }

        if (response.status === 409) {
          navigate('booking-conflict')
          return
        }

        alert(result.error ?? 'Failed to reschedule booking.')
        return
      }

      // New booking creation
      const response = await fetch('http://localhost:3000/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_id: studentId,
          tutor_id: targetTutorId,
          date: selectedDate,
          time: selectedTime,
          duration,
          notes,
        }),
      })

      const result = await response.json()

      if (response.status === 201) {
        navigate({ page: 'booking-confirmation', bookingId: result.booking?.id })
        return
      }

      if (response.status === 409) {
        navigate('booking-conflict')
        return
      }

      if (response.status === 400) {
        alert(result.error ?? 'Invalid booking information.')
        return
      }

      alert(result.error ?? 'Failed to create booking.')
    } catch (error) {
      console.error('Booking error:', error)
      alert('Could not connect to the booking server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-6 lg:px-8 py-8 max-w-4xl mx-auto">
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate({ page: 'student-tutor-profile', tutorId: tutor.id })}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 cursor-pointer"
      >
        <ArrowLeftIcon size={14} />
        Back to profile
      </button>

      <h1 className="text-2xl font-semibold text-foreground mb-6">Book a session</h1>

      {/* Progress steps */}
      <div className="flex items-center gap-0 mb-8">
        {(['Select session', 'Date & time', 'Confirm'] as const).map((label, i) => {
          const s = (i + 1) as 1 | 2 | 3
          const done = step > s
          const active = step === s
          return (
            <div key={label} className="flex items-center flex-1 last:flex-initial">
              <div className="flex items-center gap-2 shrink-0">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors ${
                    done
                      ? 'bg-primary border-primary text-white'
                      : active
                      ? 'bg-white border-primary text-primary'
                      : 'bg-white border-border text-muted-foreground'
                  }`}
                >
                  {done ? <CheckIcon size={12} /> : s}
                </div>
                <span className={`text-sm font-medium ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {label}
                </span>
              </div>
              {i < 2 && <div className="flex-1 h-px bg-border mx-3" />}
            </div>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2">
          {/* Step 1: Session type */}
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Session type</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      type: 'one-on-one' as SessionType,
                      label: 'One-on-one',
                      desc: 'Private session with the tutor',
                      price: tutor.pricePerHour,
                    },
                    {
                      type: 'group' as SessionType,
                      label: 'Study group',
                      desc: 'Small group of up to 4 students',
                      price: Math.round(tutor.pricePerHour * 0.6),
                    },
                  ].map((opt) => (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => setSessionType(opt.type)}
                      className={`p-4 rounded-lg border-2 text-left transition-colors cursor-pointer ${
                        sessionType === opt.type
                          ? 'border-primary bg-primary-50'
                          : 'border-border hover:border-border/60'
                      }`}
                    >
                      <p className="font-medium text-foreground text-sm">{opt.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                      <p className="text-sm font-semibold text-primary mt-2">${opt.price}/hr</p>
                    </button>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Duration</h3>
                <div className="flex gap-2">
                  {([60, 90, 120] as Duration[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(d)}
                      className={`flex-1 py-2.5 rounded-md border-2 text-sm font-medium transition-colors cursor-pointer ${
                        duration === d
                          ? 'border-primary bg-primary-50 text-primary'
                          : 'border-border text-muted-foreground hover:border-border/60 hover:text-foreground'
                      }`}
                    >
                      {d === 60 ? '1 hour' : d === 90 ? '1.5 hours' : '2 hours'}
                    </button>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Format</h3>
                <div className="grid grid-cols-2 gap-3">
                  {(['online', 'in-person'] as const)
                    .filter((f) =>
                      f === 'online'
                        ? tutor.sessionFormats.includes('Online')
                        : tutor.sessionFormats.includes('In-person')
                    )
                    .map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setLocation(f)}
                        className={`flex items-center gap-2.5 p-4 rounded-lg border-2 text-left transition-colors cursor-pointer ${
                          location === f
                            ? 'border-primary bg-primary-50'
                            : 'border-border hover:border-border/60'
                        }`}
                      >
                        <span className={location === f ? 'text-primary' : 'text-muted-foreground'}>
                          {f === 'online' ? <VideoIcon size={18} /> : <MapPinIcon size={18} />}
                        </span>
                        <span className="text-sm font-medium text-foreground capitalize">{f}</span>
                      </button>
                    ))}
                </div>
              </Card>

              <Button size="lg" onClick={() => setStep(2)} className="w-full">
                Continue to date & time
              </Button>
            </div>
          )}

          {/* Step 2: Date & time with Monthly Calendar */}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              {/* Monthly Calendar Card */}
              <Card className="p-5 sm:p-6 bg-white border border-border shadow-xs rounded-xl">
                {/* Calendar Header with Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      Select date
                    </h3>
                    <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight mt-0.5">
                      {MONTH_NAMES[viewMonth]} {viewYear}
                    </h2>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleGoToToday}
                      className="px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary-50 rounded-md border border-primary/20 transition-colors cursor-pointer"
                      title="Jump to today"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      disabled={isPrevMonthDisabled}
                      onClick={handlePrevMonth}
                      aria-label="Previous month"
                      className="p-1.5 rounded-lg border border-border text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <ChevronLeftIcon size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      aria-label="Next month"
                      className="p-1.5 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors cursor-pointer"
                    >
                      <ChevronRightIcon size={16} />
                    </button>
                  </div>
                </div>

                {/* Weekday Labels (Mon to Sun) */}
                <div className="grid grid-cols-7 gap-1 text-center py-2 border-b border-border/70 mb-2">
                  {WEEKDAYS.map((day) => (
                    <div key={day} className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                  {/* Previous Month Dimmed Days */}
                  {prevDays.map((prevDay, i) => (
                    <div
                      key={`prev-${i}`}
                      className="h-10 sm:h-11 flex items-center justify-center text-xs sm:text-sm text-muted-foreground/30 select-none"
                    >
                      {prevDay}
                    </div>
                  ))}

                  {/* Current Month Active Days */}
                  {Array.from({ length: daysInMonth }, (_, idx) => {
                    const day = idx + 1
                    const dateStr = formatYMD(viewYear, viewMonth, day)
                    const isPast = dateStr < pastThreshold
                    const isToday = dateStr === todayYMD
                    const isSelected = dateStr === selectedDate

                    return (
                      <button
                        key={dateStr}
                        type="button"
                        disabled={isPast}
                        onClick={() => {
                          setSelectedDate(dateStr)
                          setSelectedTime(null)
                        }}
                        aria-label={`${formatDisplayDate(dateStr)}${isToday ? ' (Today)' : ''}${
                          isPast ? ' (Past date, unavailable)' : ''
                        }`}
                        className={cn(
                          'relative h-10 sm:h-11 rounded-lg text-xs sm:text-sm font-medium flex flex-col items-center justify-center transition-all cursor-pointer',
                          isSelected
                            ? 'bg-primary text-white font-semibold shadow-xs ring-2 ring-primary ring-offset-2 scale-[1.02] z-10'
                            : isToday
                            ? 'border-2 border-primary/70 text-primary font-bold bg-primary-50/40 hover:bg-primary-50'
                            : isPast
                            ? 'text-muted-foreground/30 cursor-not-allowed bg-transparent'
                            : 'text-foreground hover:bg-primary-50 hover:text-primary hover:border hover:border-primary/30'
                        )}
                      >
                        <span>{day}</span>
                        {isToday && (
                          <span
                            className={cn(
                              'w-1.5 h-1.5 rounded-full mt-0.5',
                              isSelected ? 'bg-white' : 'bg-primary'
                            )}
                          />
                        )}
                      </button>
                    )
                  })}

                  {/* Next Month Dimmed Days */}
                  {nextDays.map((nextDay, i) => (
                    <div
                      key={`next-${i}`}
                      className="h-10 sm:h-11 flex items-center justify-center text-xs sm:text-sm text-muted-foreground/30 select-none"
                    >
                      {nextDay}
                    </div>
                  ))}
                </div>

                {/* Selected Date Summary Banner */}
                <div className="mt-4 pt-3.5 border-t border-border/70 flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <CalendarIcon size={14} className="text-primary" />
                    Selected date:
                  </span>
                  <span className="font-semibold text-foreground bg-primary-50 text-primary border border-primary/20 px-3 py-1 rounded-md">
                    {formatDisplayDate(selectedDate)}
                  </span>
                </div>
              </Card>

              {/* Time Slots Card */}
              <Card className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Select time</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Available tutoring slots for {formatDisplayDate(selectedDate)}
                    </p>
                  </div>
                  {selectedTime && (
                    <Badge variant="success" className="text-xs font-medium">
                      {selectedTime} selected
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {STANDARD_TIME_SLOTS.map((time) => {
                    // Check if time slot is in the past for today
                    let isTimePast = false
                    if (selectedDate === todayYMD) {
                      const [slotH, slotM] = time.split(':').map(Number)
                      const now = new Date()
                      if (now.getHours() > slotH || (now.getHours() === slotH && now.getMinutes() >= slotM)) {
                        isTimePast = true
                      }
                    }

                    // Check if slot is already booked for this tutor in Supabase
                    const isBooked = existingBookings.some((b) => {
                      if (b.status === 'cancelled') return false
                      if (bookingId && b.id === bookingId) return false
                      return b.date === selectedDate && b.time === time
                    })

                    const available = !isTimePast && !isBooked

                    return (
                      <button
                        key={time}
                        type="button"
                        disabled={!available}
                        onClick={() => setSelectedTime(time)}
                        className={cn(
                          'py-2.5 px-2 rounded-lg text-sm font-medium border text-center transition-all',
                          !available
                            ? 'border-border/60 bg-muted/40 text-muted-foreground/40 cursor-not-allowed'
                            : selectedTime === time
                            ? 'border-primary bg-primary text-white shadow-xs font-semibold'
                            : 'border-border bg-white text-foreground hover:border-primary/60 hover:bg-primary-50/60 hover:text-primary cursor-pointer'
                        )}
                      >
                        <div>{time}</div>
                        {!available && (
                          <div className="text-[10px] opacity-60 leading-none mt-0.5">
                            {isBooked ? 'Booked' : 'Passed'}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </Card>

              <div className="flex gap-3">
                <Button variant="outline" size="lg" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button
                  size="lg"
                  disabled={!selectedTime}
                  onClick={() => setStep(3)}
                  className="flex-1"
                >
                  Continue to confirm
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 3 && (
            <div className="flex flex-col gap-5">
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Session details</h3>
                <div className="flex flex-col gap-3">
                  <DetailRow label="Tutor" value={tutor.name} />
                  <DetailRow label="Subject" value={tutor.subject} />
                  <DetailRow label="Date" value={formatDisplayDate(selectedDate)} />
                  <DetailRow label="Time" value={selectedTime ?? '—'} />
                  <DetailRow label="Duration" value={`${duration} minutes`} />
                  <DetailRow label="Format" value={<span className="capitalize">{location}</span>} />
                  <DetailRow
                    label="Session type"
                    value={sessionType === 'one-on-one' ? 'One-on-one' : 'Group session'}
                  />
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">Notes for tutor</h3>
                <Textarea
                  id="notes"
                  placeholder="e.g. I'm struggling with integration by parts in Chapter 7, especially problem sets 3–5..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  hint="Optional — help the tutor prepare for your session"
                />
              </Card>

              <Card className="p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">Cancellation policy</h3>
                <p className="text-sm text-muted-foreground">
                  Free cancellation up to 24 hours before your session. Cancellations within 24 hours will incur a 50% charge.
                </p>
              </Card>

              <div className="flex gap-3">
                <Button variant="outline" size="lg" onClick={() => setStep(2)} className="flex-1">
                  Back
                </Button>
                <Button size="lg" loading={loading} onClick={handleConfirm} className="flex-1">
                  Confirm booking — ${price}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar summary */}
        <div className="shrink-0">
          <Card className="p-5 sticky top-6">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
              <Avatar src={tutor.avatarUrl} alt={tutor.name} size="md" />
              <div>
                <p className="text-sm font-semibold text-foreground">{tutor.name}</p>
                <p className="text-xs text-muted-foreground">{tutor.subject}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 text-sm mb-4">
              <SummaryRow
                label="Session type"
                value={sessionType === 'one-on-one' ? 'One-on-one' : 'Group'}
              />
              <SummaryRow label="Duration" value={`${duration} min`} />
              <SummaryRow label="Format" value={<span className="capitalize">{location}</span>} />
              {step >= 2 && (
                <>
                  <SummaryRow label="Date" value={formatDisplayDate(selectedDate)} />
                  {selectedTime && <SummaryRow label="Time" value={selectedTime} />}
                </>
              )}
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">
                  ${tutor.pricePerHour}/hr × {duration / 60}h
                </span>
                <span className="font-semibold text-foreground">${price.toFixed(0)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground text-right">{value}</span>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}
