'use client'

import { useState } from 'react'
import type { Navigate } from '../../types'
import {
  Card, Badge, Button, Avatar, Textarea,
  ArrowLeftIcon, CalendarIcon, ClockIcon, VideoIcon, MapPinIcon, CheckIcon,
} from '../../components/ui'

import { tutors, availableDays } from '../../data/mockData'
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

export default function Booking({ navigate, tutorId, bookingId }: BookingProps) {
  const resolvedMockId = tutorId && TUTOR_UUID_TO_MOCK[tutorId] ? TUTOR_UUID_TO_MOCK[tutorId] : tutorId
  const tutor = tutors.find((t) => t.id === tutorId || t.id === resolvedMockId) ?? tutors[0]
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [sessionType, setSessionType] = useState<SessionType>('one-on-one')
  const [duration, setDuration] = useState<Duration>(60)
  const [location, setLocation] = useState<'online' | 'in-person'>('online')
  const [selectedDate, setSelectedDate] = useState(availableDays[0].date)
  const [selectedDay] = useState(availableDays[0])
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const currentDay = availableDays.find((d) => d.date === selectedDate) ?? availableDays[0]
  const price = (tutor.pricePerHour * duration) / 60

async function handleConfirm() {
  if (!selectedTime) {
    return
  }

  setLoading(true)

  try {
    // Get the currently logged-in student or fallback to active student profile
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const studentId = user?.id || '6b163bc1-1e73-4faf-b5bc-d7c6c1a71c5c'

    // Determine the real Supabase tutor UUID
    const targetTutorId =
      tutorId && tutorId.includes('-')
        ? tutorId
        : MOCK_TO_TUTOR_UUID[tutor.id] || '20000000-0000-4000-8000-000000000001'

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
      {/* Back */}
      <button
        onClick={() => navigate({ page: 'tutor-profile', tutorId: tutor.id })}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
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
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors ${
                  done ? 'bg-primary border-primary text-white' :
                  active ? 'bg-white border-primary text-primary' :
                  'bg-white border-border text-muted-foreground'
                }`}>
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
                  {([
                    { type: 'one-on-one' as SessionType, label: 'One-on-one', desc: 'Private session with the tutor', price: tutor.pricePerHour },
                    { type: 'group' as SessionType, label: 'Study group', desc: 'Small group of up to 4 students', price: Math.round(tutor.pricePerHour * 0.6) },
                  ]).map((opt) => (
                    <button
                      key={opt.type}
                      onClick={() => setSessionType(opt.type)}
                      className={`p-4 rounded-lg border-2 text-left transition-colors ${
                        sessionType === opt.type ? 'border-primary bg-primary-50' : 'border-border hover:border-border/60'
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
                      onClick={() => setDuration(d)}
                      className={`flex-1 py-2.5 rounded-md border-2 text-sm font-medium transition-colors ${
                        duration === d ? 'border-primary bg-primary-50 text-primary' : 'border-border text-muted-foreground hover:border-border/60 hover:text-foreground'
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
                  {(['online', 'in-person'] as const).filter((f) =>
                    (f === 'online' ? tutor.sessionFormats.includes('Online') : tutor.sessionFormats.includes('In-person'))
                  ).map((f) => (
                    <button
                      key={f}
                      onClick={() => setLocation(f)}
                      className={`flex items-center gap-2.5 p-4 rounded-lg border-2 text-left transition-colors ${
                        location === f ? 'border-primary bg-primary-50' : 'border-border hover:border-border/60'
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

          {/* Step 2: Date & time */}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Select date</h3>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {availableDays.map((day) => (
                    <button
                      key={day.date}
                      onClick={() => { setSelectedDate(day.date); setSelectedTime(null) }}
                      className={`flex flex-col items-center px-4 py-2.5 rounded-lg border shrink-0 text-sm transition-colors ${
                        selectedDate === day.date
                          ? 'border-primary bg-primary-50 text-primary'
                          : 'border-border bg-card text-muted-foreground hover:border-border/60 hover:text-foreground'
                      }`}
                    >
                      <span className="font-medium">{day.label}</span>
                      <span className="text-[10px] mt-0.5 opacity-70">
                        {day.slots.filter((s) => s.available).length} open
                      </span>
                    </button>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Select time</h3>
                <div className="grid grid-cols-3 gap-2">
                  {currentDay.slots.map((slot) => (
                    <button
                      key={slot.time}
                      disabled={!slot.available}
                      onClick={() => setSelectedTime(slot.time)}
                      className={`py-2.5 rounded-md text-sm font-medium border transition-colors ${
                        !slot.available
                          ? 'border-border bg-muted text-muted-foreground/40 cursor-not-allowed'
                          : selectedTime === slot.time
                          ? 'border-primary bg-primary text-white'
                          : 'border-border bg-card text-foreground hover:border-primary hover:bg-primary-50 hover:text-primary'
                      }`}
                    >
                      {slot.time}
                      {!slot.available && <div className="text-[10px] opacity-60">Booked</div>}
                    </button>
                  ))}
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
                  <DetailRow label="Date" value={currentDay.label} />
                  <DetailRow label="Time" value={selectedTime ?? '—'} />
                  <DetailRow label="Duration" value={`${duration} minutes`} />
                  <DetailRow label="Format" value={<span className="capitalize">{location}</span>} />
                  <DetailRow label="Session type" value={sessionType === 'one-on-one' ? 'One-on-one' : 'Group session'} />
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
              <SummaryRow label="Session type" value={sessionType === 'one-on-one' ? 'One-on-one' : 'Group'} />
              <SummaryRow label="Duration" value={`${duration} min`} />
              <SummaryRow label="Format" value={<span className="capitalize">{location}</span>} />
              {step >= 2 && (
                <>
                  <SummaryRow label="Date" value={currentDay.label} />
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
