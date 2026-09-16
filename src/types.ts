export type PageName =
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'dashboard'
  | 'find-sessions'
  | 'tutor-profile'
  | 'booking'
  | 'booking-confirmation'
  | 'booking-conflict'
  | 'my-bookings'
  | 'booking-details'
  | 'notifications'
  | 'learning-materials'
  | 'profile'
  | 'settings'

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
  type: 'one-on-one' | 'group'
  status: 'upcoming' | 'completed' | 'cancelled'
  notes?: string
  location: 'online' | 'in-person'
  price: number
  meetingLink?: string
  room?: string
  cancelledReason?: string
}

export interface Notification {
  id: string
  type: 'booking' | 'reminder' | 'material' | 'system' | 'cancellation'
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
  type: 'pdf' | 'docx' | 'pptx' | 'video' | 'link'
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
