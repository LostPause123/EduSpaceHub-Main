export type PageName = "login" | "register" | "forgot-password" | "reset-password" | "dashboard" | "find-sessions" | "student-tutor-profile" | "booking" | "booking-confirmation" | "booking-conflict" | "my-bookings" | "booking-details" | "notifications" | "learning-materials" | "profile" | "settings" | "admin-dashboard" | "admin-tutors" | "admin-students" | "admin-bookings" | "admin-booking-details" | "admin-schedules" | "admin-profile" | "admin-materials" | "tutor-dashboard" | "tutor-bookings" | "tutor-schedules" | "tutor-students" | "tutor-profile" | "tutor-materials"

export interface NavState {
  page: PageName
  tutorId?: string
  bookingId?: string
}

export type Navigate = (state: NavState | PageName) => void

export interface Tutor {
  id: string
  name: string
  title: string
  subject: string
  specializations: string[]
  rating: number
  reviewCount: number
  pricePerHour: number
  bio: string
  education: string[]
  experience: string
  avatarUrl: string
  level: string
  languages: string[]
  sessionFormats: string[]
  responseTime: string
  completedSessions: number
}

export interface Review {
  id: string
  studentName: string
  avatarUrl: string
  rating: number
  comment: string
  date: string
  subject: string
}

export interface TimeSlot {
  time: string
  available: boolean
}

export interface AvailableDay {
  date: string
  label: string
  slots: TimeSlot[]
}

export interface Booking {
  id: string
  tutorId: string
  tutorName: string
  tutorTitle: string
  tutorSubject: string
  tutorAvatar: string
  date: string
  displayDate: string
  time: string
  duration: number
  type: "one-on-one" | "group"
  status: "upcoming" | "completed" | "cancelled"
  notes?: string
  location: "online" | "in-person"
  price: number
  meetingLink?: string
  room?: string
  cancelledReason?: string
}

export interface Notification {
  id: string
  type: "booking" | "reminder" | "material" | "system" | "cancellation"
  title: string
  description: string
  timestamp: string
  read: boolean
}

export interface Material {
  id: string
  title: string
  subject: string
  category: string
  type: "pdf" | "docx" | "pptx" | "video" | "link"
  uploadedBy: string
  uploadedAt: string
  fileSize: string
  downloads: number
  tags: string[]
  description: string
}

export interface StudyRoom {
  id: string
  name: string
  capacity: number
  occupied: number
  features: string[]
  available: boolean
  floor: string
}

export interface AdminStats {
  totalStudents: number
  totalTutors: number
  totalBookings: number
  pendingBookings: number
  confirmedBookings: number
  completedBookings: number
  cancelledBookings: number
}

export interface AdminBooking extends Omit<Booking, "status"> {
  status: "pending" | "confirmed" | "upcoming" | "completed" | "cancelled" | string
  studentId?: string
  studentName?: string
  studentEmail?: string
  studentAvatar?: string
  created_at?: string
  start_time?: string
  end_time?: string
  tutorEmail?: string
}

export interface AdminTutor {
  id: string
  profile_id?: string
  full_name: string
  name?: string
  email: string
  role?: string
  bio: string
  subjects: string[]
  subject?: string
  hourly_rate: number
  pricePerHour?: number
  rating: number
  experience_years: number
  avatar_url: string
  avatarUrl?: string
  is_active: boolean
  bookingCount: number
}

export interface AdminStudent {
  id: string
  full_name: string
  name?: string
  email: string
  avatar_url: string
  avatarUrl?: string
  created_at: string
  bookingCount: number
  status: string
}

export interface TutorStats {
  totalBookings: number
  upcomingBookings: number
  completedBookings: number
  cancelledBookings: number
  totalStudents: number
  hourlyRate: number
  rating: number
}

export interface TutorBooking extends Omit<Booking, "status"> {
  status: "pending" | "confirmed" | "upcoming" | "completed" | "cancelled" | string
  studentId?: string
  studentName?: string
  studentEmail?: string
  studentAvatar?: string
  created_at?: string
  start_time?: string
  end_time?: string
}

export interface TutorStudent {
  id: string
  name: string
  email: string
  avatarUrl: string
  totalSessions: number
  completedSessions: number
  upcomingSessions: number
  lastSessionDate: string | null
  nextSessionDate: string | null
}

export interface TutorProfileData {
  id: string
  profileId: string
  name: string
  email: string
  avatarUrl: string | null
  bio: string
  subjects: string[]
  hourly_rate: number
  experience_years: number
  rating: number
  is_active: boolean
}

export type MaterialStatus = "processing" | "pending_review" | "revision_requested" | "rejected" | "approved" | "published" | "archived"

export interface MaterialStatusHistoryItem {
  status: MaterialStatus | string
  timestamp: string
  action: string
  actorId?: string
  actorName?: string
  actorRole?: "admin" | "tutor" | "student" | string
  feedback?: string
  notes?: string
}

export interface LearningMaterial {
  id: string
  tutorId: string
  tutorName?: string
  tutorEmail?: string
  title: string
  description: string
  subject: string
  fileType: string
  filePath: string
  originalFilename: string
  fileSize: number
  mimeType: string
  status: MaterialStatus
  isPublic: boolean
  reviewFeedback?: string | null
  reviewedBy?: string | null
  publishedAt?: string | null
  statusHistory?: MaterialStatusHistoryItem[]
  createdAt: string
  updatedAt: string
}
