'use client'

import { useEffect, useState } from 'react'
import type { Navigate, TutorStats, TutorBooking } from '../../types'
import {
  StatCard,
  Card,
  Badge,
  Button,
  Avatar,
  SectionHeader,
  UsersIcon,
  BookmarkIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertCircleIcon,
  RefreshIcon,
  ChevronRightIcon,
  GraduationCapIcon,
} from '../../components/ui'
import { supabase } from '../../lib/supabase'

interface TutorDashboardProps {
  navigate?: Navigate
}

export default function TutorDashboard({ navigate }: TutorDashboardProps) {
  const [stats, setStats] = useState<TutorStats | null>(null)
  const [tutorInfo, setTutorInfo] = useState<any>(null)
  const [upcomingSessions, setUpcomingSessions] = useState<TutorBooking[]>([])
  const [recentBookings, setRecentBookings] = useState<TutorBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function fetchDashboardData() {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      // Try Express backend first
      let success = false
      try {
        const res = await fetch('http://localhost:3000/api/tutor/stats', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })
        if (res.ok) {
          const data = await res.json()
          if (data.success) {
            setStats(data.stats)
            setTutorInfo(data.tutor)
            setUpcomingSessions(data.upcomingSessions || [])
            setRecentBookings(data.recentBookings || [])
            success = true
          }
        }
      } catch (err) {
        console.warn('Backend API unavailable, falling back to direct Supabase query:', err)
      }

      if (!success) {
        // Fallback: Query directly via Supabase client
        const { data: tutorRow } = await supabase
          .from('tutors')
          .select('*, profiles(*)')
          .eq('profile_id', session.user.id)
          .single()

        if (!tutorRow) throw new Error('Tutor profile not found.')

        const { data: bookingsData } = await supabase
          .from('bookings')
          .select('*')
          .eq('tutor_id', tutorRow.id)
          .order('start_time', { ascending: false })

        const all = bookingsData || []
        let up = 0
        let comp = 0
        let canc = 0
        const students = new Set<string>()
        const now = Date.now()

        all.forEach((b) => {
          if (b.student_id) students.add(b.student_id)
          const end = new Date(b.end_time).getTime()
          if (b.status === 'cancelled') canc++
          else if (b.status === 'completed' || end < now) comp++
          else up++
        })

        // Fetch student profiles
        const studentIds = Array.from(students)
        const { data: studentProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', studentIds)

        const studentMap: Record<string, any> = {}
        ;(studentProfiles || []).forEach((p) => {
          studentMap[p.id] = p
        })

        const formatted = all.map((b) => {
          const st = new Date(b.start_time)
          const student = studentMap[b.student_id]
          const isCancelled = b.status === 'cancelled'
          const isCompleted = b.status === 'completed' || new Date(b.end_time).getTime() < now
          const status = isCancelled ? 'cancelled' : isCompleted ? 'completed' : 'upcoming'

          return {
            id: b.id,
            tutorId: tutorRow.id,
            tutorName: tutorRow.profiles?.full_name || 'Tutor',
            tutorTitle: 'Tutor',
            tutorSubject: tutorRow.subjects?.[0] || 'General',
            tutorAvatar: tutorRow.profiles?.avatar_url || '',
            date: st.toISOString().split('T')[0],
            displayDate: st.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            time: st.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
            duration: 60,
            type: 'one-on-one' as const,
            status,
            location: 'online' as const,
            price: tutorRow.hourly_rate || 40,
            studentId: b.student_id,
            studentName: student?.full_name || 'Student',
            studentEmail: student?.email || '',
            studentAvatar: student?.avatar_url || '',
            notes: b.notes,
          }
        })

        setStats({
          totalBookings: all.length,
          upcomingBookings: up,
          completedBookings: comp,
          cancelledBookings: canc,
          totalStudents: students.size,
          hourlyRate: tutorRow.hourly_rate || 40,
          rating: tutorRow.rating || 5.0,
        })
        setTutorInfo({
          id: tutorRow.id,
          name: tutorRow.profiles?.full_name || 'Tutor',
          email: tutorRow.profiles?.email || '',
          avatarUrl: tutorRow.profiles?.avatar_url || '',
          subjects: tutorRow.subjects || [],
          bio: tutorRow.bio || '',
        })
        setUpcomingSessions(formatted.filter((b) => b.status === 'upcoming').slice(0, 5))
        setRecentBookings(formatted.slice(0, 8))
      }
    } catch (err: any) {
      console.error('Error fetching tutor dashboard:', err)
      setError(err.message || 'Failed to load tutor dashboard.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  function handleNav(page: string) {
    if (navigate) {
      navigate(page as any)
    } else if (typeof window !== 'undefined') {
      const path = page.replace('tutor-', '')
      window.location.href = path === 'dashboard' ? '/tutor' : `/tutor/${path}`
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="h-8 w-48 bg-border/60 rounded-md animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
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
        <h3 className="text-lg font-semibold text-foreground mb-1">Failed to load Tutor Dashboard</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">{error}</p>
        <Button variant="outline" onClick={fetchDashboardData} className="gap-2 cursor-pointer">
          <RefreshIcon size={16} />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-900 via-primary-800 to-primary-700 text-white p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 text-white/90 text-xs font-medium mb-3 backdrop-blur-xs">
              <GraduationCapIcon size={14} />
              <span>Tutor Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Welcome back, {tutorInfo?.name || 'Tutor'}!
            </h1>
            <p className="text-sm text-white/80 mt-1 max-w-xl">
              Here is your tutoring activity overview. You have{' '}
              <strong className="text-white font-semibold">{stats?.upcomingBookings ?? 0} upcoming session(s)</strong> scheduled.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNav('tutor-schedules')}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs cursor-pointer"
            >
              <CalendarIcon size={14} className="mr-1.5" />
              My Schedule
            </Button>
            <Button
              size="sm"
              onClick={() => handleNav('tutor-bookings')}
              className="bg-white text-primary hover:bg-white/95 font-semibold text-xs shadow-xs cursor-pointer"
            >
              <BookmarkIcon size={14} className="mr-1.5" />
              Manage Bookings
            </Button>
          </div>
        </div>

        {/* Decorative circle */}
        <div className="pointer-events-none absolute -bottom-12 -right-12 w-64 h-64 rounded-full bg-white/5 blur-2xl" />
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Upcoming Sessions"
          value={stats?.upcomingBookings ?? 0}
          sub="Confirmed active bookings"
          icon={<ClockIcon size={20} />}
        />
        <StatCard
          label="Completed Sessions"
          value={stats?.completedBookings ?? 0}
          sub="Finished tutoring lessons"
          icon={<CheckCircleIcon size={20} />}
        />
        <StatCard
          label="Active Students"
          value={stats?.totalStudents ?? 0}
          sub="Students mentored"
          icon={<UsersIcon size={20} />}
        />
        <StatCard
          label="Hourly Rate"
          value={`$${stats?.hourlyRate ?? 40}/hr`}
          sub={`★ ${stats?.rating?.toFixed(1) ?? '5.0'} rating`}
          icon={<GraduationCapIcon size={20} />}
        />
      </div>

      {/* Two Column Section: Upcoming Sessions & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Sessions List (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Next Upcoming Sessions</h2>
              <p className="text-xs text-muted-foreground">Sessions scheduled with your students</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleNav('tutor-bookings')}
              className="text-xs text-primary gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ChevronRightIcon size={14} />
            </Button>
          </div>

          {upcomingSessions.length === 0 ? (
            <Card className="p-8 text-center bg-white border border-border">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                <CalendarIcon size={22} />
              </div>
              <h4 className="text-sm font-semibold text-foreground">No upcoming sessions</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                You do not have any upcoming tutoring sessions scheduled at the moment.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {upcomingSessions.map((session) => (
                <Card
                  key={session.id}
                  className="p-4 bg-white border border-border/80 hover:border-primary/40 transition-colors shadow-2xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={session.studentAvatar}
                        alt={session.studentName || 'Student'}
                        size="md"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-foreground">
                            {session.studentName}
                          </h4>
                          <Badge variant="default" className="text-[10px] bg-primary-50 text-primary border-primary-200">
                            Upcoming
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {session.studentEmail}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5 font-medium">
                          <span className="flex items-center gap-1 text-foreground">
                            <CalendarIcon size={13} className="text-primary" />
                            {session.displayDate || session.date}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <ClockIcon size={13} className="text-primary" />
                            {session.time} ({session.duration || 60} mins)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleNav('tutor-bookings')}
                        className="text-xs cursor-pointer"
                      >
                        Details
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links & Tutor Info Card */}
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Tutor Profile</h2>
            <p className="text-xs text-muted-foreground">Your teaching credentials</p>
          </div>

          <Card className="p-5 bg-white border border-border space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-border/60">
              <Avatar
                src={tutorInfo?.avatarUrl}
                alt={tutorInfo?.name || 'Tutor'}
                size="lg"
              />
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-foreground truncate">{tutorInfo?.name}</h4>
                <p className="text-xs text-muted-foreground truncate">{tutorInfo?.email}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant="default" className="text-[10px] font-semibold bg-primary text-white">
                    Verified Tutor
                  </Badge>
                  <span className="text-xs font-semibold text-primary">★ {stats?.rating?.toFixed(1) ?? '5.0'}</span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Subjects Taught
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(tutorInfo?.subjects || ['General Tutoring']).map((s: string) => (
                  <Badge key={s} variant="secondary" className="text-[11px] font-normal">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>

            {tutorInfo?.bio && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Bio
                </p>
                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                  {tutorInfo.bio}
                </p>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleNav('tutor-profile')}
              className="w-full text-xs gap-1.5 cursor-pointer"
            >
              <span>Edit Tutor Profile</span>
              <ChevronRightIcon size={14} />
            </Button>
          </Card>
        </div>
      </div>

      {/* Recent Bookings Table */}
      <Card className="p-6 bg-white border border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">Recent Bookings</h3>
            <p className="text-xs text-muted-foreground">Overview of your recent booking activity</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleNav('tutor-bookings')}
            className="text-xs cursor-pointer"
          >
            All Bookings
          </Button>
        </div>

        {recentBookings.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No booking records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 text-muted-foreground font-semibold border-b border-border/80">
                <tr>
                  <th className="py-2.5 px-3">Student</th>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Rate</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {recentBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar src={b.studentAvatar} alt={b.studentName || 'Student'} size="xs" />
                        <div>
                          <p className="font-semibold text-foreground">{b.studentName}</p>
                          <p className="text-[11px] text-muted-foreground">{b.studentEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-medium text-foreground">
                      <p>{b.displayDate || b.date}</p>
                      <p className="text-[11px] text-muted-foreground">{b.time}</p>
                    </td>
                    <td className="py-3 px-3 text-muted-foreground">
                      {b.duration || 60} mins
                    </td>
                    <td className="py-3 px-3 font-semibold text-foreground">
                      ${b.price}
                    </td>
                    <td className="py-3 px-3">
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
