'use client'

import { useEffect, useState } from 'react'
import type { Navigate, AdminBooking } from '../../types'
import {
  SectionHeader,
  Card,
  Badge,
  Button,
  Input,
  Select,
  Avatar,
  Tabs,
  SearchIcon,
  RefreshIcon,
  CalendarIcon,
  ClockIcon,
  EyeIcon,
  AlertCircleIcon,
  FilterIcon,
} from '../../components/ui'

interface BookingsProps {
  navigate?: Navigate
}

export default function Bookings({ navigate }: BookingsProps) {
  const [bookings, setBookings] = useState<AdminBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [tutorFilter, setTutorFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')

  async function fetchBookings() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('http://localhost:3000/api/admin/bookings')
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      const data = await res.json()
      if (data.success) {
        setBookings(data.bookings || [])
      } else {
        throw new Error(data.error || 'Failed to load bookings')
      }
    } catch (err: any) {
      console.error('Error fetching admin bookings:', err)
      setError(err.message || 'Could not connect to server.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings()
  }, [])

  function handleViewDetails(id: string) {
    if (navigate) {
      navigate({ page: 'admin-booking-details', bookingId: id })
    } else if (typeof window !== 'undefined') {
      window.location.href = `/admin/bookings/${id}`
    }
  }

  // Conflict Detection Helper
  // Returns true if a booking has overlapping start/end time with another non-cancelled booking for the same tutor or student
  function isConflicting(target: AdminBooking): boolean {
    if (target.status === 'cancelled') return false
    const startA = new Date(target.start_time || `${target.date}T${target.time}`).getTime()
    const endA = startA + (target.duration || 60) * 60 * 1000

    if (isNaN(startA)) return false

    return bookings.some((b) => {
      if (b.id === target.id || b.status === 'cancelled') return false
      if (b.tutorId !== target.tutorId && b.studentId !== target.studentId) return false

      const startB = new Date(b.start_time || `${b.date}T${b.time}`).getTime()
      const endB = startB + (b.duration || 60) * 60 * 1000

      if (isNaN(startB)) return false

      return startA < endB && endA > startB
    })
  }

  // List of unique tutors for filter dropdown
  const tutorOptions = Array.from(
    new Set(bookings.map((b) => b.tutorName).filter(Boolean))
  )

  // Status Tab Counts
  const counts = {
    all: bookings.length,
    confirmed: bookings.filter((b) => b.status === 'confirmed' || b.status === 'upcoming').length,
    completed: bookings.filter((b) => b.status === 'completed').length,
    cancelled: bookings.filter((b) => b.status === 'cancelled').length,
    pending: bookings.filter((b) => b.status === 'pending').length,
    conflicts: bookings.filter(isConflicting).length,
  }

  const tabs = [
    { id: 'all', label: 'All Bookings', count: counts.all },
    { id: 'confirmed', label: 'Confirmed / Upcoming', count: counts.confirmed },
    { id: 'completed', label: 'Completed', count: counts.completed },
    { id: 'cancelled', label: 'Cancelled', count: counts.cancelled },
    { id: 'conflicts', label: 'Conflicts / Warnings', count: counts.conflicts },
  ]

  const filteredBookings = bookings.filter((b) => {
    // Tab Filter
    if (activeTab === 'confirmed' && b.status !== 'confirmed' && b.status !== 'upcoming') return false
    if (activeTab === 'completed' && b.status !== 'completed') return false
    if (activeTab === 'cancelled' && b.status !== 'cancelled') return false
    if (activeTab === 'pending' && b.status !== 'pending') return false
    if (activeTab === 'conflicts' && !isConflicting(b)) return false

    // Tutor Filter
    if (tutorFilter !== 'all' && b.tutorName !== tutorFilter) return false

    // Date Filter
    if (dateFilter && b.date !== dateFilter) return false

    // Search Query
    if (search) {
      const q = search.toLowerCase()
      const matchesStudent = (b.studentName || '').toLowerCase().includes(q)
      const matchesTutor = (b.tutorName || '').toLowerCase().includes(q)
      const matchesSubject = (b.tutorSubject || '').toLowerCase().includes(q)
      const matchesNotes = (b.notes || '').toLowerCase().includes(q)
      if (!matchesStudent && !matchesTutor && !matchesSubject && !matchesNotes) return false
    }

    return true
  })

  function getStatusBadge(status: string, hasConflict: boolean) {
    if (hasConflict) {
      return <Badge variant="destructive" className="animate-pulse">Time Conflict</Badge>
    }
    switch (status) {
      case 'confirmed':
      case 'upcoming':
        return <Badge variant="success">Confirmed</Badge>
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>
      case 'pending':
        return <Badge variant="warning">Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <SectionHeader
        title="Manage Bookings"
        subtitle="Monitor, filter, inspect, and update tutoring sessions across all students and tutors."
        action={
          <Button variant="outline" size="sm" onClick={fetchBookings} className="gap-2">
            <RefreshIcon size={14} />
            Refresh
          </Button>
        }
      />

      {/* Tabs */}
      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            placeholder="Search by student, tutor, or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<SearchIcon size={16} />}
          />
          <Select
            label=""
            value={tutorFilter}
            onChange={(e) => setTutorFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Tutors' },
              ...tutorOptions.map((t) => ({ value: t, label: t })),
            ]}
          />
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            rightIcon={
              dateFilter ? (
                <button
                  type="button"
                  onClick={() => setDateFilter('')}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              ) : undefined
            }
          />
        </div>
      </Card>

      {/* Booking Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-white border border-border rounded-lg animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <Card className="p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-3">
            <AlertCircleIcon size={24} />
          </div>
          <h3 className="text-base font-semibold text-foreground">Error loading bookings</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchBookings}>
            Retry
          </Button>
        </Card>
      ) : filteredBookings.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-secondary text-muted-foreground flex items-center justify-center mx-auto mb-3">
            <SearchIcon size={20} />
          </div>
          <h3 className="text-base font-semibold text-foreground">No bookings found</h3>
          <p className="text-xs text-muted-foreground mt-1">Try adjusting your status tab or search filters.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/60 text-muted-foreground uppercase text-[11px] font-semibold tracking-wider border-b border-border">
                <tr>
                  <th className="px-5 py-3">Student</th>
                  <th className="px-5 py-3">Tutor</th>
                  <th className="px-5 py-3">Date & Time</th>
                  <th className="px-5 py-3">Duration</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredBookings.map((b) => {
                  const conflict = isConflicting(b)
                  return (
                    <tr
                      key={b.id}
                      className={conflict ? 'bg-destructive/5 hover:bg-destructive/10 transition-colors' : 'hover:bg-secondary/30 transition-colors'}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar src={b.studentAvatar} alt={b.studentName} size="sm" />
                          <div>
                            <p className="font-semibold text-foreground">{b.studentName}</p>
                            <p className="text-xs text-muted-foreground">{b.studentEmail || 'Student'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar src={b.tutorAvatar} alt={b.tutorName} size="sm" />
                          <div>
                            <p className="font-semibold text-foreground">{b.tutorName}</p>
                            <p className="text-xs text-primary font-medium">{b.tutorSubject}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-xs space-y-0.5">
                          <p className="font-medium text-foreground flex items-center gap-1">
                            <CalendarIcon size={12} className="text-muted-foreground" />
                            {b.displayDate || b.date}
                          </p>
                          <p className="text-muted-foreground flex items-center gap-1">
                            <ClockIcon size={12} />
                            {b.time}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-medium text-foreground text-xs">
                        {b.duration || 60} mins
                      </td>
                      <td className="px-5 py-4">
                        {getStatusBadge(b.status, conflict)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Button
                          variant="outline"
                          size="xs"
                          className="gap-1"
                          onClick={() => handleViewDetails(b.id)}
                        >
                          <EyeIcon size={14} />
                          Details
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
