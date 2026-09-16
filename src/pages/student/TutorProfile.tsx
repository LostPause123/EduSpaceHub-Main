'use client'

import { useState } from 'react'
import type { Navigate } from '../../types'
import {
  Badge,
  Button,
  Avatar,
  ArrowLeftIcon,
  CalendarIcon,
  ClockIcon,
  VideoIcon,
  MapPinIcon,
  GraduationCapIcon,
} from '../../components/ui'
import { tutors, availableDays } from '../../data/mockData'
import type { Tutor } from '../../types'

interface TutorProfileProps {
  navigate: Navigate
  tutorId?: string
}

function getTeachingApproach(tutor: Tutor): string {
  const sentences = tutor.bio.split(/(?<=[.?!])\s+/)
  const approachSentences = sentences.filter((s) =>
    s.toLowerCase().includes('teaching') ||
    s.toLowerCase().includes('session') ||
    s.toLowerCase().includes('approach') ||
    s.toLowerCase().includes('adapt') ||
    s.toLowerCase().includes('practical') ||
    s.toLowerCase().includes('problem-solving') ||
    s.toLowerCase().includes('explaining')
  )
  if (approachSentences.length > 0) {
    return approachSentences.join(' ')
  }
  return `Focuses on adapting explanations to each student's learning style, building clear conceptual understanding before diving into problem-solving.`
}

export default function TutorProfile({ navigate, tutorId }: TutorProfileProps) {
  const tutor = tutors.find((t) => t.id === tutorId) ?? tutors[0]
  const [activeTab, setActiveTab] = useState<'about' | 'schedule'>('about')
  const [selectedDate, setSelectedDate] = useState(availableDays[0].date)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  const currentDay = availableDays.find((d) => d.date === selectedDate) ?? availableDays[0]

  return (
    <div className="px-6 lg:px-8 py-8 max-w-5xl mx-auto">
      {/* Back to search */}
      <button
        type="button"
        onClick={() => navigate('find-sessions')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 cursor-pointer"
      >
        <ArrowLeftIcon size={14} />
        Back to search
      </button>

      {/* Profile Header Hero */}
      <div className="bg-white border border-border/80 rounded-2xl p-6 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.03)] mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4 sm:gap-5">
            <Avatar
              src={tutor.avatarUrl}
              alt={tutor.name}
              size="xl"
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{tutor.name}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{tutor.title}</p>

              {/* Subject and format tags */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-primary-50 text-primary border border-primary-100">
                  {tutor.subject}
                </span>
                {tutor.sessionFormats.includes('Online') && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#FAFAF8] text-muted-foreground border border-border/80">
                    <VideoIcon size={12} className="text-muted-foreground" />
                    Online
                  </span>
                )}
                {tutor.sessionFormats.includes('In-person') && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#FAFAF8] text-muted-foreground border border-border/80">
                    <MapPinIcon size={12} className="text-muted-foreground" />
                    In-person
                  </span>
                )}
              </div>

              {/* Response time */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-3">
                <ClockIcon size={13} className="text-muted-foreground/80 shrink-0" />
                <span>Responds within {tutor.responseTime.replace(/^Within\s+/i, '')}</span>
              </div>
            </div>
          </div>

          {/* Actions: Message & Book session */}
          <div className="flex items-center gap-2.5 self-start md:self-center shrink-0">
            <Button
              variant="outline"
              size="md"
              onClick={() => alert(`Messaging feature will open a conversation with ${tutor.name}`)}
              className="bg-white border-border/80 text-sm font-medium cursor-pointer"
            >
              Message
            </Button>
            <Button
              size="md"
              onClick={() => navigate({ page: 'booking', tutorId: tutor.id })}
              className="text-sm font-medium cursor-pointer shadow-xs"
            >
              Book session
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Layout: Tabs/Panels on Left, Booking Panel on Right */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column: Navigation Tabs & Tab Content */}
        <div className="lg:col-span-2">
          {/* Navigation: About | Schedule only */}
          <div className="flex items-center gap-6 border-b border-border/80 mb-6">
            <button
              type="button"
              onClick={() => setActiveTab('about')}
              className={`pb-3 text-sm font-semibold transition-colors relative cursor-pointer ${
                activeTab === 'about'
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              About
              {activeTab === 'about' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('schedule')}
              className={`pb-3 text-sm font-semibold transition-colors relative cursor-pointer ${
                activeTab === 'schedule'
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Schedule
              {activeTab === 'schedule' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          </div>

          {/* ABOUT TAB CONTENT */}
          {activeTab === 'about' && (
            <div className="flex flex-col gap-5">
              {/* Biography */}
              <div className="bg-white border border-border/80 rounded-xl p-5 sm:p-6 shadow-2xs">
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3">Biography</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{tutor.bio}</p>
              </div>

              {/* Education (Inside About) */}
              <div className="bg-white border border-border/80 rounded-xl p-5 sm:p-6 shadow-2xs">
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <GraduationCapIcon size={16} className="text-primary" />
                  Education
                </h2>
                <ul className="flex flex-col gap-2.5">
                  {tutor.education.map((edu) => (
                    <li key={edu} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      <span className="leading-snug">{edu}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Specializations */}
              <div className="bg-white border border-border/80 rounded-xl p-5 sm:p-6 shadow-2xs">
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3">Specializations</h2>
                <div className="flex flex-wrap gap-2">
                  {tutor.specializations.map((s) => (
                    <span
                      key={s}
                      className="px-3 py-1 rounded-lg bg-secondary/70 text-xs font-medium text-foreground border border-border/60"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Teaching Approach */}
              <div className="bg-white border border-border/80 rounded-xl p-5 sm:p-6 shadow-2xs">
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3">Teaching Approach</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {getTeachingApproach(tutor)}
                </p>
              </div>

              {/* Languages */}
              {tutor.languages && tutor.languages.length > 0 && (
                <div className="bg-white border border-border/80 rounded-xl p-5 sm:p-6 shadow-2xs">
                  <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3">Languages</h2>
                  <div className="flex flex-wrap gap-2">
                    {tutor.languages.map((lang) => (
                      <span
                        key={lang}
                        className="px-3 py-1 rounded-lg bg-white border border-border/80 text-xs font-medium text-foreground"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SCHEDULE TAB CONTENT */}
          {activeTab === 'schedule' && (
            <div className="flex flex-col gap-4">
              {/* Date selector */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {availableDays.map((day) => {
                  const isSelected = selectedDate === day.date
                  const availableCount = day.slots.filter((s) => s.available).length
                  return (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => {
                        setSelectedDate(day.date)
                        setSelectedTime(null)
                      }}
                      className={`flex flex-col items-center px-4 py-3 rounded-xl border text-sm shrink-0 transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-primary bg-primary-50 text-primary shadow-xs'
                          : 'border-border/80 bg-white text-muted-foreground hover:border-border hover:text-foreground'
                      }`}
                    >
                      <span className="font-semibold text-xs">{day.label}</span>
                      <span className="text-[11px] mt-0.5 opacity-80 font-medium">
                        {availableCount} slot{availableCount !== 1 ? 's' : ''}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Time slots */}
              <div className="bg-white border border-border/80 rounded-xl p-5 sm:p-6 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-foreground">
                    Available times — <span className="font-normal text-muted-foreground">{currentDay.label}</span>
                  </h3>
                  <span className="text-xs text-muted-foreground">All times in your local timezone</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {currentDay.slots.map((slot) => {
                    const isSelected = selectedTime === slot.time
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => setSelectedTime(slot.time)}
                        className={`py-2.5 px-3 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                          !slot.available
                            ? 'border-border/60 bg-muted/50 text-muted-foreground/40 cursor-not-allowed'
                            : isSelected
                            ? 'border-primary bg-primary text-white shadow-xs'
                            : 'border-border/80 bg-white text-foreground hover:border-primary hover:bg-primary-50 hover:text-primary'
                        }`}
                      >
                        {slot.time}
                        {!slot.available && <span className="block text-[10px] font-normal opacity-70">Booked</span>}
                      </button>
                    )
                  })}
                </div>

                {selectedTime && (
                  <div className="mt-5 pt-4 border-t border-border/70 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      Selected: <span className="font-semibold text-foreground">{currentDay.label} at {selectedTime}</span>
                    </p>
                    <Button
                      size="sm"
                      onClick={() => navigate({ page: 'booking', tutorId: tutor.id })}
                      className="w-full sm:w-auto shadow-xs cursor-pointer"
                    >
                      <CalendarIcon size={14} />
                      Book {selectedTime} session
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Booking Panel */}
        <div className="shrink-0">
          <div className="bg-white border border-border/80 rounded-2xl p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] sticky top-6">
            {/* Price & Availability */}
            <div className="flex items-center justify-between pb-4 border-b border-border/70 mb-4">
              <div>
                <span className="text-2xl font-bold tracking-tight text-foreground">${tutor.pricePerHour}</span>
                <span className="text-xs text-muted-foreground font-normal"> / hour</span>
              </div>
              <Badge variant="success">Available</Badge>
            </div>

            {/* Key attributes */}
            <div className="flex flex-col gap-2.5 mb-5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <ClockIcon size={14} className="text-primary shrink-0" />
                <span>Responds within {tutor.responseTime.replace(/^Within\s+/i, '')}</span>
              </div>
              {tutor.sessionFormats.includes('Online') && (
                <div className="flex items-center gap-2">
                  <VideoIcon size={14} className="text-primary shrink-0" />
                  <span>Online sessions available</span>
                </div>
              )}
              {tutor.sessionFormats.includes('In-person') && (
                <div className="flex items-center gap-2">
                  <MapPinIcon size={14} className="text-primary shrink-0" />
                  <span>In-person sessions available</span>
                </div>
              )}
              {tutor.languages && tutor.languages.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-primary font-semibold shrink-0">🌐</span>
                  <span>Languages: {tutor.languages.join(', ')}</span>
                </div>
              )}
            </div>

            {/* Available this week */}
            <div className="pt-4 border-t border-border/70 mb-5">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Available this week
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('schedule')}
                  className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                >
                  View full schedule →
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {currentDay.slots
                  .filter((s) => s.available)
                  .slice(0, 4)
                  .map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => navigate({ page: 'booking', tutorId: tutor.id })}
                      className="px-2.5 py-1 text-xs rounded-md bg-primary-50 text-primary border border-primary-100 hover:bg-primary hover:text-white transition-colors font-medium cursor-pointer"
                    >
                      {slot.time}
                    </button>
                  ))}
              </div>
            </div>

            {/* CTA Book button */}
            <Button
              fullWidth
              size="lg"
              onClick={() => navigate({ page: 'booking', tutorId: tutor.id })}
              className="mb-3 font-semibold shadow-xs cursor-pointer"
            >
              Book a session
            </Button>

            <p className="text-[11px] text-muted-foreground text-center leading-normal">
              Free cancellation up to 24 hours before session
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
