'use client'

import { useState, useEffect } from 'react'
import type { Navigate } from '../../types'
import { Card, Button, Avatar, Input, SearchIcon, FilterIcon, ClockIcon, VideoIcon, MapPinIcon } from '../../components/ui'
import { tutors } from '../../data/mockData'
import type { Tutor } from '../../types'

interface FindSessionsProps { navigate: Navigate }

const subjects = ['All subjects', 'Mathematics', 'Physics', 'Chemistry', 'Computer Science', 'Biology', 'Economics']
const levels = ['Any level', 'Undergraduate', 'Graduate', 'Professional']
const formats = ['Any format', 'Online', 'In-person']

export default function FindSessions({ navigate }: FindSessionsProps) {
  const [tutorList, setTutorList] = useState<Tutor[]>(tutors)
  const [query, setQuery] = useState('')
  const [subject, setSubject] = useState('All subjects')
  const [level, setLevel] = useState('Any level')
  const [format, setFormat] = useState('Any format')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetch('http://localhost:3000/api/tutors')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.tutors) && data.tutors.length > 0) {
          const merged: Tutor[] = data.tutors.map((apiT: any) => {
            const mockMatch = tutors.find(
              (m) =>
                m.name.toLowerCase() === apiT.full_name?.toLowerCase() ||
                m.name.toLowerCase() === apiT.name?.toLowerCase()
            )
            return {
              id: apiT.id,
              name: apiT.full_name || apiT.name || mockMatch?.name || 'Tutor',
              title: mockMatch?.title || `${apiT.subject} Tutor`,
              subject: apiT.subject || mockMatch?.subject || 'General',
              specializations:
                apiT.specializations && apiT.specializations.length > 0
                  ? apiT.specializations
                  : mockMatch?.specializations || [],
              rating: apiT.rating || mockMatch?.rating || 5.0,
              reviewCount: mockMatch?.reviewCount || 48,
              pricePerHour: apiT.pricePerHour || apiT.hourly_rate || mockMatch?.pricePerHour || 40,
              bio: apiT.bio || mockMatch?.bio || '',
              education: mockMatch?.education || [`Specialist in ${apiT.subject || 'Subject'}`],
              experience: mockMatch?.experience || `${apiT.experience_years || 5} years experience`,
              avatarUrl:
                mockMatch?.avatarUrl ||
                apiT.avatarUrl ||
                'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&h=120&fit=crop&auto=format',
              level: mockMatch?.level || 'Undergraduate',
              languages: mockMatch?.languages || ['English'],
              sessionFormats: mockMatch?.sessionFormats || ['Online', 'In-person'],
              responseTime: mockMatch?.responseTime || 'Within 2 hours',
              completedSessions: mockMatch?.completedSessions || 100,
            }
          })
          setTutorList(merged)
        }
      })
      .catch((err) => {
        console.error('Failed to fetch tutors from backend API:', err)
      })
  }, [])

  const filtered = tutorList.filter((t) => {
    const q = query.toLowerCase()
    const matchQuery =
      !q ||
      t.name.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      t.specializations.some((s) => s.toLowerCase().includes(q))
    const matchSubject = subject === 'All subjects' || t.subject === subject
    const matchLevel = level === 'Any level' || t.level === level
    const matchFormat = format === 'Any format' || t.sessionFormats.includes(format)
    return matchQuery && matchSubject && matchLevel && matchFormat
  })

  return (
    <div className="px-6 lg:px-8 py-8 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Find tutors</h1>
        <p className="text-sm text-muted-foreground mt-1">Search and book sessions with expert tutors</p>
      </div>

      {/* Search + filter bar */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1">
          <Input
            placeholder="Search by name, subject, or topic..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            leftIcon={<SearchIcon size={15} />}
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={`cursor-pointer ${showFilters ? 'border-primary text-primary bg-primary-50/50' : 'bg-white'}`}
        >
          <FilterIcon size={14} />
          Filters
        </Button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <Card className="p-4 mb-6 bg-white border border-border/80 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FilterSelect label="Subject" value={subject} options={subjects} onChange={setSubject} />
            <FilterSelect label="Level" value={level} options={levels} onChange={setLevel} />
            <FilterSelect label="Format" value={format} options={formats} onChange={setFormat} />
          </div>
          <div className="flex justify-end mt-3 pt-3 border-t border-border/70">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSubject('All subjects')
                setLevel('Any level')
                setFormat('Any format')
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Reset filters
            </Button>
          </div>
        </Card>
      )}

      {/* Subject chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {subjects.map((s) => {
          const isSelected = subject === s
          return (
            <button
              key={s}
              type="button"
              onClick={() => setSubject(s)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-white text-muted-foreground border border-border/80 hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              {s}
            </button>
          )
        })}
      </div>

      {/* Results count */}
      <p className="text-xs sm:text-sm text-muted-foreground mb-5 font-normal">
        <span className="font-semibold text-foreground">{filtered.length}</span> tutor{filtered.length !== 1 ? 's' : ''} found
        {query && <> for "<span className="text-foreground font-medium">{query}</span>"</>}
      </p>

      {/* Tutor grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-border/80 p-8">
          <p className="text-muted-foreground text-sm">No tutors found matching your criteria.</p>
          <button
            type="button"
            className="text-primary text-sm font-medium mt-2 hover:underline cursor-pointer"
            onClick={() => {
              setQuery('')
              setSubject('All subjects')
              setLevel('Any level')
              setFormat('Any format')
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((tutor) => (
            <TutorCard key={tutor.id} tutor={tutor} navigate={navigate} />
          ))}
        </div>
      )}
    </div>
  )
}

function TutorCard({ tutor, navigate }: { tutor: Tutor; navigate: Navigate }) {
  const slots = ['09:00', '11:00', '14:00', '16:00']

  return (
    <Card className="flex flex-col overflow-hidden bg-white border border-border/80 rounded-xl hover:border-border hover:shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all">
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Header: Avatar + Name + Title */}
          <div className="flex items-start gap-3.5 mb-3">
            <Avatar src={tutor.avatarUrl} alt={tutor.name} size="lg" className="w-12 h-12 shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-base tracking-tight truncate">{tutor.name}</h3>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{tutor.title}</p>
            </div>
          </div>

          {/* Subject Badge (1つのみ) */}
          <div className="mb-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-primary-50 text-primary border border-primary-100">
              {tutor.subject}
            </span>
          </div>

          {/* Meta: Response Time + Online + In-person */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground mb-5">
            <span className="flex items-center gap-1.5">
              <ClockIcon size={13} className="text-muted-foreground/80 shrink-0" />
              {tutor.responseTime}
            </span>
            {tutor.sessionFormats.includes('Online') && (
              <span className="flex items-center gap-1.5">
                <VideoIcon size={13} className="text-muted-foreground/80 shrink-0" />
                Online
              </span>
            )}
            {tutor.sessionFormats.includes('In-person') && (
              <span className="flex items-center gap-1.5">
                <MapPinIcon size={13} className="text-muted-foreground/80 shrink-0" />
                In-person
              </span>
            )}
          </div>
        </div>

        {/* Available times */}
        <div className="pt-3 border-t border-border/60">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Available this week
          </p>
          <div className="flex flex-wrap gap-1.5">
            {slots.map((time) => (
              <button
                key={time}
                type="button"
                onClick={() => navigate({ page: 'booking', tutorId: tutor.id })}
                className="px-2.5 py-1 text-xs rounded-md bg-primary-50/70 text-primary border border-primary-100/70 hover:bg-primary hover:text-white hover:border-primary transition-colors font-medium cursor-pointer"
              >
                {time}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3.5 border-t border-border/80 bg-[#FAFAF9] flex items-center justify-between gap-3">
        <div>
          <span className="text-base font-bold text-foreground tracking-tight">${tutor.pricePerHour}</span>
          <span className="text-xs text-muted-foreground font-normal"> / hour</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ page: 'tutor-profile', tutorId: tutor.id })}
            className="text-xs font-medium cursor-pointer bg-white"
          >
            Profile
          </Button>
          <Button
            size="sm"
            onClick={() => navigate({ page: 'booking', tutorId: tutor.id })}
            className="text-xs font-medium cursor-pointer shadow-xs"
          >
            Book session
          </Button>
        </div>
      </div>
    </Card>
  )
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-border/80 rounded-md bg-white text-foreground text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  )
}
