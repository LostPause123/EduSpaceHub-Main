import { useEffect, useState } from 'react'
import type { Navigate } from '../../types'

import {
  Card,
  Badge,
  Button,
  Avatar,
  StarRating,
  SectionHeader,
  CalendarIcon,
  ClockIcon,
  VideoIcon,
  MapPinIcon,
  SearchIcon,
  ChevronRightIcon,
  BookOpenIcon,
  GraduationCapIcon,
  DoorOpenIcon,
  PlusIcon,
} from '../../components/ui'

import { supabase } from '../../lib/supabase'

interface DashboardProps {
  navigate: Navigate
}

interface Profile {
  id: string
  full_name: string
  email: string | null
  role: string
  avatar_url: string | null
}

interface Tutor {
  id: string
  profile_id: string
  bio: string | null
  subjects: string[]
  experience_years: number
  hourly_rate: number | null
  rating: number
  is_active: boolean
}

interface Booking {
  id: string
  student_id: string
  tutor_id: string | null
  room_id: string | null
  start_time: string
  end_time: string
  status: string
  notes: string | null
}

interface StudyRoom {
  id: string
  name: string
  description: string | null
  location: string | null
  capacity: number
  is_available: boolean
}

interface TutorDisplay extends Tutor {
  name: string
  avatarUrl: string
  subject: string
}

interface BookingDisplay extends Booking {
  tutorName: string
  tutorAvatar: string
  tutorSubject: string
  displayDate: string
  time: string
  duration: number
  location: 'online' | 'in-person'
}

export default function Dashboard({ navigate }: DashboardProps) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [bookings, setBookings] = useState<BookingDisplay[]>([])
  const [tutors, setTutors] = useState<TutorDisplay[]>([])
  const [studyRooms, setStudyRooms] = useState<StudyRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      setLoading(true)
      setError(null)

      // ==========================================
      // 1. Get logged-in user
      // ==========================================

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!user) {
        navigate('login')
        return
      }

      // ==========================================
      // 2. Get profile
      // ==========================================

      const { data: profileData, error: profileError } =
        await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

      if (profileError) {
        throw profileError
      }

      setProfile(profileData)

      // ==========================================
      // 3. Get bookings
      // ==========================================

      const { data: bookingData, error: bookingError } =
        await supabase
          .from('bookings')
          .select('*')
          .eq('student_id', user.id)
          .order('start_time', { ascending: true })

      if (bookingError) {
        throw bookingError
      }

      // ==========================================
      // 4. Get tutors
      // ==========================================

      const { data: tutorData, error: tutorError } =
        await supabase
          .from('tutors')
          .select('*')
          .eq('is_active', true)
          .order('rating', { ascending: false })
          .limit(4)

      if (tutorError) {
        throw tutorError
      }

      // ==========================================
      // 5. Get tutor profiles
      // ==========================================

      const tutorProfileIds =
        (tutorData ?? []).map((tutor) => tutor.profile_id)

      let tutorProfiles: Profile[] = []

      if (tutorProfileIds.length > 0) {
        const { data: tutorProfilesData, error: tutorProfilesError } =
          await supabase
            .from('profiles')
            .select('*')
            .in('id', tutorProfileIds)

        if (tutorProfilesError) {
          throw tutorProfilesError
        }

        tutorProfiles = tutorProfilesData ?? []
      }

      // ==========================================
      // 6. Format tutors
      // ==========================================

      const formattedTutors: TutorDisplay[] =
        (tutorData ?? []).map((tutor) => {
          const tutorProfile = tutorProfiles.find(
            (p) => p.id === tutor.profile_id
          )

          return {
            ...tutor,
            name: tutorProfile?.full_name ?? 'Unknown Tutor',
            avatarUrl:
              tutorProfile?.avatar_url ??
              'https://i.pravatar.cc/150?img=12',
            subject:
              tutor.subjects && tutor.subjects.length > 0
                ? tutor.subjects[0]
                : 'General',
          }
        })

      setTutors(formattedTutors)

      // ==========================================
      // 7. Format bookings
      // ==========================================

      const tutorIds =
        (bookingData ?? [])
          .map((booking) => booking.tutor_id)
          .filter((id): id is string => Boolean(id))

      let bookingTutors: Tutor[] = []

      if (tutorIds.length > 0) {
        const { data: bookingTutorsData, error: bookingTutorsError } =
          await supabase
            .from('tutors')
            .select('*')
            .in('id', tutorIds)

        if (bookingTutorsError) {
          throw bookingTutorsError
        }

        bookingTutors = bookingTutorsData ?? []
      }

      const bookingTutorProfileIds =
        bookingTutors.map((tutor) => tutor.profile_id)

      let bookingTutorProfiles: Profile[] = []

      if (bookingTutorProfileIds.length > 0) {
        const { data: profilesData, error: profilesError } =
          await supabase
            .from('profiles')
            .select('*')
            .in('id', bookingTutorProfileIds)

        if (profilesError) {
          throw profilesError
        }

        bookingTutorProfiles = profilesData ?? []
      }

      const formattedBookings: BookingDisplay[] =
        (bookingData ?? []).map((booking) => {
          const tutor = bookingTutors.find(
            (t) => t.id === booking.tutor_id
          )

          const tutorProfile = tutor
            ? bookingTutorProfiles.find(
                (p) => p.id === tutor.profile_id
              )
            : null

          const start = new Date(booking.start_time)
          const end = new Date(booking.end_time)

          const duration = Math.round(
            (end.getTime() - start.getTime()) / 60000
          )

          return {
            ...booking,

            tutorName:
              tutorProfile?.full_name ?? 'Tutor',

            tutorAvatar:
              tutorProfile?.avatar_url ??
              'https://i.pravatar.cc/150?img=12',

            tutorSubject:
              tutor?.subjects?.[0] ?? 'General',

            displayDate: start.toLocaleDateString('en-US', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }),

            time: start.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }),

            duration,

            location: booking.room_id
              ? 'in-person'
              : 'online',
          }
        })

      setBookings(formattedBookings)

      // ==========================================
      // 8. Get study rooms
      // ==========================================

      const { data: roomsData, error: roomsError } =
        await supabase
          .from('study_rooms')
          .select('*')
          .order('name', { ascending: true })

      if (roomsError) {
        throw roomsError
      }

      setStudyRooms(roomsData ?? [])
    } catch (err) {
      console.error('Dashboard error:', err)

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load dashboard.'
      )
    } finally {
      setLoading(false)
    }
  }

  // ==========================================
  // Loading
  // ==========================================

  if (loading) {
    return (
      <div className="px-6 lg:px-8 py-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">
            Loading dashboard...
          </p>
        </div>
      </div>
    )
  }

  // ==========================================
  // Error
  // ==========================================

  if (error) {
    return (
      <div className="px-6 lg:px-8 py-8 max-w-6xl mx-auto">
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-red-600">
            Failed to load dashboard
          </h2>

          <p className="text-sm text-muted-foreground mt-2">
            {error}
          </p>

          <Button
            className="mt-4"
            onClick={loadDashboard}
          >
            Try again
          </Button>
        </Card>
      </div>
    )
  }

  // ==========================================
  // Calculations
  // ==========================================

  const upcomingBookings = bookings.filter(
    (booking) => booking.status === 'upcoming' ||
                 booking.status === 'confirmed'
  )

  const completedBookings = bookings.filter(
    (booking) => booking.status === 'completed'
  )

  const nextSession = upcomingBookings[0]

  const totalHours =
    completedBookings.reduce(
      (total, booking) => total + booking.duration,
      0
    ) / 60

  const firstName =
    profile?.full_name?.split(' ')[0] ?? 'Student'

  const today = new Date()

  const formattedToday = today.toLocaleDateString(
    'en-US',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }
  )

  // ==========================================
  // Dashboard
  // ==========================================

  return (
    <div className="px-6 lg:px-8 py-8 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Good morning, {firstName}
          </h1>

          <p className="text-sm text-muted-foreground mt-1">
            {formattedToday}
          </p>
        </div>

        <Button
          onClick={() => navigate('find-sessions')}
          size="sm"
          className="shrink-0"
        >
          <PlusIcon size={14} />
          Book a session
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Upcoming sessions
              </p>

              <p className="text-2xl font-semibold mt-2">
                {upcomingBookings.length}
              </p>
            </div>

            <div className="p-2 rounded-lg bg-primary-50 text-primary">
              <CalendarIcon size={16} />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Completed sessions
              </p>

              <p className="text-2xl font-semibold mt-2">
                {completedBookings.length}
              </p>
            </div>

            <div className="p-2 rounded-lg bg-primary-50 text-primary">
              <GraduationCapIcon size={16} />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Total hours
              </p>

              <p className="text-2xl font-semibold mt-2">
                {totalHours.toFixed(1)}h
              </p>
            </div>

            <div className="p-2 rounded-lg bg-primary-50 text-primary">
              <ClockIcon size={16} />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Active tutors
              </p>

              <p className="text-2xl font-semibold mt-2">
                {tutors.length}
              </p>
            </div>

            <div className="p-2 rounded-lg bg-primary-50 text-primary">
              {tutors[0] ? (
                <Avatar
                  src={tutors[0].avatarUrl}
                  alt=""
                  size="xs"
                />
              ) : (
                <GraduationCapIcon size={16} />
              )}
            </div>
          </div>
        </Card>

      </div>

      <div className="grid lg:grid-cols-3 gap-6">

        {/* ======================================
            LEFT
        ====================================== */}

        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Next Session */}

          {nextSession && (
            <Card className="p-6">

              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold">
                  Next session
                </h2>

                <Badge variant="success">
                  Upcoming
                </Badge>
              </div>

              <div className="flex items-start gap-4">

                <Avatar
                  src={nextSession.tutorAvatar}
                  alt={nextSession.tutorName}
                  size="lg"
                />

                <div className="flex-1 min-w-0">

                  <p className="font-semibold">
                    {nextSession.tutorName}
                  </p>

                  <p className="text-sm text-muted-foreground">
                    {nextSession.tutorSubject}
                  </p>

                  <div className="flex flex-wrap gap-4 mt-3">

                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <CalendarIcon size={14} />
                      {nextSession.displayDate}
                    </div>

                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <ClockIcon size={14} />
                      {nextSession.time} · {nextSession.duration} min
                    </div>

                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      {nextSession.location === 'online'
                        ? <VideoIcon size={14} />
                        : <MapPinIcon size={14} />
                      }

                      <span className="capitalize">
                        {nextSession.location}
                      </span>
                    </div>

                  </div>

                  {nextSession.notes && (
                    <p className="text-sm text-muted-foreground mt-2 bg-muted rounded-md px-3 py-2">
                      {nextSession.notes}
                    </p>
                  )}

                </div>
              </div>

              <div className="flex gap-3 mt-5 pt-4 border-t border-border">

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    navigate({
                      page: 'booking-details',
                      bookingId: nextSession.id,
                    })
                  }
                >
                  View details
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    navigate('my-bookings')
                  }
                >
                  Reschedule
                </Button>

              </div>

            </Card>
          )}

          {/* No upcoming sessions */}

          {!nextSession && (
            <Card className="p-6">
              <h2 className="text-base font-semibold">
                No upcoming sessions
              </h2>

              <p className="text-sm text-muted-foreground mt-1">
                Find a tutor and book your next session.
              </p>

              <Button
                className="mt-4"
                size="sm"
                onClick={() =>
                  navigate('find-sessions')
                }
              >
                <SearchIcon size={14} />
                Find a tutor
              </Button>
            </Card>
          )}

          {/* Active Bookings */}

          <Card className="overflow-hidden">

            <div className="px-6 py-4 border-b border-border">

              <SectionHeader
                title="Active bookings"
                action={
                  <button
                    onClick={() =>
                      navigate('my-bookings')
                    }
                    className="text-xs text-primary font-medium flex items-center gap-1"
                  >
                    View all
                    <ChevronRightIcon size={12} />
                  </button>
                }
              />

            </div>

            <div className="divide-y divide-border">

              {upcomingBookings.length === 0 && (
                <div className="px-6 py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No active bookings.
                  </p>
                </div>
              )}

              {upcomingBookings.map((booking) => (

                <div
                  key={booking.id}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-muted/40 transition-colors cursor-pointer"
                  onClick={() =>
                    navigate({
                      page: 'booking-details',
                      bookingId: booking.id,
                    })
                  }
                >

                  <Avatar
                    src={booking.tutorAvatar}
                    alt={booking.tutorName}
                    size="sm"
                  />

                  <div className="flex-1 min-w-0">

                    <p className="text-sm font-medium truncate">
                      {booking.tutorName}
                    </p>

                    <p className="text-xs text-muted-foreground truncate">
                      {booking.tutorSubject}
                    </p>

                  </div>

                  <div className="text-right shrink-0">

                    <p className="text-xs font-medium">
                      {booking.displayDate}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {booking.time}
                    </p>

                  </div>

                  <Badge
                    variant={
                      booking.location === 'online'
                        ? 'secondary'
                        : 'outline'
                    }
                  >
                    {booking.location}
                  </Badge>

                </div>

              ))}

            </div>
          </Card>

          {/* Study Rooms */}

          <div>

            <SectionHeader
              title="Study rooms"
              subtitle="On-campus rooms"
              className="mb-4"
            />

            <div className="grid grid-cols-2 gap-3">

              {studyRooms.map((room) => (

                <Card
                  key={room.id}
                  className="p-4"
                >

                  <div className="flex items-start justify-between gap-2 mb-2">

                    <div className="p-2 rounded-md bg-secondary text-muted-foreground">
                      <DoorOpenIcon size={14} />
                    </div>

                    <Badge
                      variant={
                        room.is_available
                          ? 'success'
                          : 'destructive'
                      }
                    >
                      {room.is_available
                        ? 'Available'
                        : 'Occupied'}
                    </Badge>

                  </div>

                  <p className="text-sm font-medium">
                    {room.name}
                  </p>

                  <p className="text-xs text-muted-foreground mt-0.5">
                    {room.location ?? 'Campus'} · {room.capacity} seats
                  </p>

                  {room.description && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {room.description}
                    </p>
                  )}

                </Card>

              ))}

            </div>

          </div>

        </div>

        {/* ======================================
            RIGHT
        ====================================== */}

        <div className="flex flex-col gap-6">

          {/* Quick Actions */}

          <Card className="p-5">

            <h2 className="text-sm font-semibold mb-3">
              Quick actions
            </h2>

            <div className="flex flex-col gap-2">

              <button
                onClick={() =>
                  navigate('find-sessions')
                }
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-md hover:bg-secondary text-sm text-left w-full"
              >
                <SearchIcon size={15} />
                Find a tutor
              </button>

              <button
                onClick={() =>
                  navigate('my-bookings')
                }
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-md hover:bg-secondary text-sm text-left w-full"
              >
                <CalendarIcon size={15} />
                My bookings
              </button>

              <button
                onClick={() =>
                  navigate('learning-materials')
                }
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-md hover:bg-secondary text-sm text-left w-full"
              >
                <BookOpenIcon size={15} />
                Browse materials
              </button>

            </div>

          </Card>

          {/* Recommended Tutors */}

          <div>

            <SectionHeader
              title="Recommended tutors"
              subtitle="Based on available tutors"
              className="mb-4"
            />

            <div className="flex flex-col gap-3">

              {tutors.map((tutor) => (

                <Card
                  key={tutor.id}
                  className="p-4 cursor-pointer hover:shadow-sm transition-all"
                  onClick={() =>
                    navigate({
                      page: 'tutor-profile',
                      tutorId: tutor.id,
                    })
                  }
                >

                  <div className="flex items-start gap-3">

                    <Avatar
                      src={tutor.avatarUrl}
                      alt={tutor.name}
                      size="sm"
                    />

                    <div className="flex-1 min-w-0">

                      <p className="text-sm font-medium truncate">
                        {tutor.name}
                      </p>

                      <p className="text-xs text-muted-foreground truncate">
                        {tutor.subject}
                      </p>

                      <div className="flex items-center justify-between mt-1.5">

                        <StarRating
                          rating={Number(tutor.rating)}
                          size="sm"
                        />

                        <span className="text-xs font-medium">
                          {tutor.hourly_rate != null
                            ? `$${tutor.hourly_rate}/hr`
                            : 'Rate N/A'}
                        </span>

                      </div>

                    </div>

                  </div>

                </Card>

              ))}

            </div>

            <button
              onClick={() =>
                navigate('find-sessions')
              }
              className="w-full text-center text-sm text-primary font-medium mt-3 py-2"
            >
              Browse all tutors →
            </button>

          </div>

        </div>

      </div>

    </div>
  )
}