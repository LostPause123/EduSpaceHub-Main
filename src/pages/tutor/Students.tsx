'use client'

import { useEffect, useState } from 'react'
import type { Navigate, TutorStudent } from '../../types'
import {
  SectionHeader,
  Card,
  Badge,
  Button,
  Avatar,
  Input,
  UsersIcon,
  SearchIcon,
  RefreshIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  MailIcon,
} from '../../components/ui'
import { supabase } from '../../lib/supabase'

interface TutorStudentsProps {
  navigate?: Navigate
}

export default function TutorStudents({ navigate }: TutorStudentsProps) {
  const [students, setStudents] = useState<TutorStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  async function fetchStudents() {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      let success = false
      try {
        const res = await fetch('http://localhost:3000/api/tutor/students', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        })
        if (res.ok) {
          const data = await res.json()
          if (data.success) {
            setStudents(data.students || [])
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
          .select('id')
          .eq('profile_id', session.user.id)
          .single()

        if (!tutorRow) throw new Error('Tutor record not found.')

        const { data: bookings } = await supabase
          .from('bookings')
          .select('*')
          .eq('tutor_id', tutorRow.id)

        const studentStats: Record<string, any> = {}
        const now = Date.now()

        ;(bookings || []).forEach((b) => {
          if (!b.student_id) return
          if (!studentStats[b.student_id]) {
            studentStats[b.student_id] = {
              total: 0,
              completed: 0,
              upcoming: 0,
              lastSession: null,
              nextSession: null,
            }
          }
          const s = studentStats[b.student_id]
          s.total++
          const end = new Date(b.end_time).getTime()
          if (b.status === 'completed' || (b.status !== 'cancelled' && end < now)) {
            s.completed++
            if (!s.lastSession || new Date(b.start_time) > new Date(s.lastSession)) {
              s.lastSession = b.start_time
            }
          } else if (b.status !== 'cancelled' && end >= now) {
            s.upcoming++
            if (!s.nextSession || new Date(b.start_time) < new Date(s.nextSession)) {
              s.nextSession = b.start_time
            }
          }
        })

        const studentIds = Object.keys(studentStats)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', studentIds)

        const formatted: TutorStudent[] = (profiles || []).map((p) => {
          const st = studentStats[p.id] || {}
          return {
            id: p.id,
            name: p.full_name || 'Student',
            email: p.email || '',
            avatarUrl: p.avatar_url || '',
            totalSessions: st.total || 0,
            completedSessions: st.completed || 0,
            upcomingSessions: st.upcoming || 0,
            lastSessionDate: st.lastSession,
            nextSessionDate: st.nextSession,
          }
        })

        setStudents(formatted)
      }
    } catch (err: any) {
      console.error('Error fetching tutor students:', err)
      setError(err.message || 'Failed to load students.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [])

  const filtered = students.filter((s) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <SectionHeader
        title="My Students"
        subtitle="Students who have scheduled or attended tutoring sessions with you."
        action={
          <Button variant="outline" size="sm" onClick={fetchStudents} className="gap-2 cursor-pointer">
            <RefreshIcon size={14} />
            Refresh
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-border">
        <div className="flex items-center gap-2">
          <Badge variant="default" className="text-xs bg-primary-50 text-primary border-primary-200">
            {students.length} Student{students.length === 1 ? '' : 's'} Total
          </Badge>
        </div>

        <div className="w-full sm:w-72">
          <Input
            placeholder="Search students by name or email..."
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
          <Button size="sm" variant="outline" onClick={fetchStudents}>Retry</Button>
        </div>
      )}

      {/* Students Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-white border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center bg-white border border-border">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
            <UsersIcon size={24} />
          </div>
          <h3 className="text-base font-semibold text-foreground">No students found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'No students match your search criteria.'
              : 'You do not have any students assigned or booked yet.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((student) => (
            <Card
              key={student.id}
              className="p-5 bg-white border border-border/80 hover:border-primary/40 transition-colors shadow-2xs space-y-4"
            >
              {/* Student Header */}
              <div className="flex items-center gap-3">
                <Avatar src={student.avatarUrl} alt={student.name} size="lg" />
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-foreground truncate">{student.name}</h4>
                  <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                </div>
              </div>

              {/* Stats Box */}
              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-secondary/40 text-center text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Total</span>
                  <span className="font-bold text-foreground text-sm">{student.totalSessions}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Completed</span>
                  <span className="font-bold text-primary text-sm">{student.completedSessions}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Upcoming</span>
                  <span className="font-bold text-amber-600 text-sm">{student.upcomingSessions}</span>
                </div>
              </div>

              {/* Session Timeline info */}
              <div className="text-xs space-y-1.5 text-muted-foreground pt-1 border-t border-border/60">
                {student.nextSessionDate && (
                  <div className="flex items-center gap-1.5 text-foreground font-medium">
                    <ClockIcon size={12} className="text-primary shrink-0" />
                    <span className="text-[11px] truncate">
                      Next: {new Date(student.nextSessionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
                {student.lastSessionDate && (
                  <div className="flex items-center gap-1.5">
                    <CheckCircleIcon size={12} className="text-muted-foreground shrink-0" />
                    <span className="text-[11px] truncate">
                      Last: {new Date(student.lastSessionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                )}
              </div>

              {/* Action */}
              <div className="pt-2">
                <a
                  href={`mailto:${student.email}`}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary/70 transition-colors"
                >
                  <MailIcon size={13} />
                  <span>Email Student</span>
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
