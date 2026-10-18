'use client'

import { useEffect, useState } from 'react'
import type { Navigate, AdminStats, AdminBooking } from '../../types'
import {
  StatCard,
  Card,
  Badge,
  Button,
  Avatar,
  SectionHeader,
  UsersIcon,
  UserIcon,
  BookmarkIcon,
  ClockIcon,
  CalendarIcon,
  CheckCircleIcon,
  XIcon,
  AlertCircleIcon,
  RefreshIcon,
  ChevronRightIcon,
} from '../../components/ui'

interface DashboardProps {
  navigate?: Navigate
}

export default function Dashboard({ navigate }: DashboardProps) {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [recentBookings, setRecentBookings] = useState<AdminBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchStats() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('http://localhost:3000/api/admin/stats')
      if (!res.ok) {
        throw new Error(`Failed to fetch stats: ${res.statusText}`)
      }
      const data = await res.json()
      if (data.success) {
        setStats(data.stats)
        setRecentBookings(data.recentBookings || [])
      } else {
        throw new Error(data.error || 'Failed to load admin statistics')
      }
    } catch (err: any) {
      console.error('Error in Admin Dashboard:', err)
      setError(err.message || 'Could not connect to backend server.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  function handleNav(page: string, params?: { bookingId?: string; tutorId?: string }) {
    if (navigate) {
      if (params) {
        navigate({ page: page as any, ...params })
      } else {
        navigate(page as any)
      }
    } else if (typeof window !== 'undefined') {
      if (page === 'admin-bookings' && params?.bookingId) {
        window.location.href = `/admin/bookings/${params.bookingId}`
      } else if (page === 'admin-tutors') {
        window.location.href = '/admin/tutors'
      } else if (page === 'admin-students') {
        window.location.href = '/admin/students'
      } else if (page === 'admin-bookings') {
        window.location.href = '/admin/bookings'
      }
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'confirmed':
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-border/60 rounded-md animate-pulse" />
          <div className="h-9 w-28 bg-border/60 rounded-md animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-28 bg-white border border-border rounded-lg animate-pulse p-4" />
          ))}
        </div>
        <div className="h-64 bg-white border border-border rounded-lg animate-pulse p-6" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-3">
          <AlertCircleIcon size={24} />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">Failed to load Dashboard</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">{error}</p>
        <Button variant="outline" onClick={fetchStats} className="gap-2">
          <RefreshIcon size={16} />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <SectionHeader
        title="Admin Dashboard"
        subtitle="Overview of platform performance, users, and tutoring session bookings."
        action={
          <Button variant="outline" size="sm" onClick={fetchStats} className="gap-2">
            <RefreshIcon size={14} />
            Refresh
          </Button>
        }
      />

      {/* Main KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Students"
          value={stats?.totalStudents ?? 0}
          sub="Registered users"
          icon={<UserIcon size={20} />}
        />
        <StatCard
          label="Total Tutors"
          value={stats?.totalTutors ?? 0}
          sub="Active & inactive tutors"
          icon={<UsersIcon size={20} />}
        />
        <StatCard
          label="Total Bookings"
          value={stats?.totalBookings ?? 0}
          sub="Platform session requests"
          icon={<BookmarkIcon size={20} />}
        />
        <StatCard
          label="Confirmed Sessions"
          value={stats?.confirmedBookings ?? 0}
          sub="Upcoming active bookings"
          icon={<CheckCircleIcon size={20} />}
        />
      </div>

      {/* Detailed Status Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 border-l-4 border-l-warning">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending</p>
              <p className="text-2xl font-bold text-foreground mt-1">{stats?.pendingBookings ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Awaiting tutor response</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-warning-50 text-warning flex items-center justify-center font-bold">
              <ClockIcon size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-l-primary">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Completed</p>
              <p className="text-2xl font-bold text-foreground mt-1">{stats?.completedBookings ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Successfully concluded</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary-50 text-primary flex items-center justify-center font-bold">
              <CheckCircleIcon size={20} />
            </div>
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-l-destructive">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cancelled</p>
              <p className="text-2xl font-bold text-foreground mt-1">{stats?.cancelledBookings ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Cancelled by user/admin</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center font-bold">
              <XIcon size={20} />
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Bookings Table */}
      <Card className="overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Recent Bookings</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Latest tutoring sessions created across the platform.</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleNav('admin-bookings')}
            className="text-xs gap-1"
          >
            View all bookings
            <ChevronRightIcon size={14} />
          </Button>
        </div>

        {recentBookings.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No recent bookings found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/60 text-muted-foreground uppercase text-[11px] font-semibold tracking-wider border-b border-border">
                <tr>
                  <th className="px-5 py-3">Student</th>
                  <th className="px-5 py-3">Tutor & Subject</th>
                  <th className="px-5 py-3">Date & Time</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar src={b.studentAvatar} alt={b.studentName} size="sm" />
                        <div>
                          <p className="font-medium text-foreground">{b.studentName}</p>
                          <p className="text-xs text-muted-foreground">{b.studentEmail || 'Student'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar src={b.tutorAvatar} alt={b.tutorName} size="sm" />
                        <div>
                          <p className="font-medium text-foreground">{b.tutorName}</p>
                          <p className="text-xs text-primary font-medium">{b.tutorSubject}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col text-xs">
                        <span className="font-medium text-foreground flex items-center gap-1">
                          <CalendarIcon size={12} className="text-muted-foreground" />
                          {b.displayDate || b.date}
                        </span>
                        <span className="text-muted-foreground flex items-center gap-1 mt-0.5">
                          <ClockIcon size={12} />
                          {b.time} ({b.duration} mins)
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {getStatusBadge(b.status)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => handleNav('admin-bookings', { bookingId: b.id })}
                      >
                        Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
