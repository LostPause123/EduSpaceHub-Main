'use client'

import { useEffect, useState } from 'react'
import type { Navigate, LearningMaterial } from '../../types'
import {
  Card,
  Badge,
  Button,
  Input,
  SearchIcon,
  DownloadIcon,
  FileTextIcon,
  RefreshIcon,
  AlertCircleIcon,
} from '../../components/ui'
import { supabase } from '../../lib/supabase'

interface LearningMaterialsProps {
  navigate?: Navigate
}

export default function LearningMaterials({ navigate }: LearningMaterialsProps) {
  const [materials, setMaterials] = useState<LearningMaterial[]>([])
  const [enrolledSubjects, setEnrolledSubjects] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [subject, setSubject] = useState('All subjects')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

  async function fetchMaterials() {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated. Please log in.')

      const params = new URLSearchParams()
      if (subject !== 'All subjects') params.append('subject', subject)
      if (query.trim()) params.append('search', query.trim())

      const res = await fetch(`${apiUrl}/api/materials/student?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to fetch learning materials')
      }

      const data = await res.json()
      setMaterials(data.materials || [])
      setEnrolledSubjects(data.enrolledSubjects || [])
    } catch (err: any) {
      console.error('fetchMaterials error:', err)
      setError(err.message || 'Failed to load materials.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMaterials()
  }, [subject, query])

  async function handleDownload(material: LearningMaterial) {
    setDownloadingId(material.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch(`${apiUrl}/api/materials/${material.id}/download`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to access file.')
      }

      window.open(data.downloadUrl, '_blank')
    } catch (err: any) {
      alert(err.message || 'Could not download material.')
    } finally {
      setDownloadingId(null)
    }
  }

  function formatBytes(bytes: number) {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  const subjectOptions = ['All subjects', ...enrolledSubjects]

  return (
    <div className="px-6 lg:px-8 py-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Learning Materials</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Lecture notes, exercises, and study resources published by your tutors for your enrolled subjects.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchMaterials} className="gap-2 cursor-pointer self-start sm:self-auto">
          <RefreshIcon size={14} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
          <AlertCircleIcon size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search Input */}
      <div>
        <Input
          placeholder="Search materials by title, subject, or description..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          leftIcon={<SearchIcon size={15} />}
        />
      </div>

      {/* Enrolled Subject Filter Chips */}
      {enrolledSubjects.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {subjectOptions.map((s) => (
            <button
              key={s}
              onClick={() => setSubject(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors cursor-pointer ${
                subject === s
                  ? 'border-primary bg-primary text-white'
                  : 'border-border bg-white text-muted-foreground hover:border-foreground/30 hover:text-foreground'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Results Header */}
      <div className="text-xs text-muted-foreground">
        Showing {materials.length} published material{materials.length !== 1 ? 's' : ''} for your enrolled subjects
      </div>

      {/* Materials Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 bg-white border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : materials.length === 0 ? (
        <Card className="p-12 text-center bg-white border border-border">
          <FileTextIcon size={40} className="mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-base font-semibold text-foreground">No published materials found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            {enrolledSubjects.length === 0
              ? 'You do not have any confirmed tutoring sessions yet. Book a session with a tutor to gain access to course materials.'
              : `No published materials are currently available${subject !== 'All subjects' ? ` for ${subject}` : ''}.`}
          </p>
          {navigate && enrolledSubjects.length === 0 && (
            <Button
              size="sm"
              onClick={() => navigate('find-sessions')}
              className="mt-4 bg-primary text-white cursor-pointer"
            >
              Find Tutors & Book Session
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {materials.map((m) => (
            <Card key={m.id} className="p-5 flex flex-col justify-between gap-4 bg-white border border-border hover:shadow-xs transition-shadow">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary uppercase">
                      {m.fileType || 'DOC'}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {m.subject}
                    </Badge>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {formatBytes(m.fileSize)}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-foreground line-clamp-2 leading-snug">
                  {m.title}
                </h3>

                {m.description && (
                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                    {m.description}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border/80 text-xs">
                <div className="text-muted-foreground text-[11px]">
                  <p className="font-medium text-foreground">{m.tutorName}</p>
                  <p>Published {m.publishedAt ? new Date(m.publishedAt).toLocaleDateString() : new Date(m.updatedAt).toLocaleDateString()}</p>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(m)}
                  disabled={downloadingId === m.id}
                  className="gap-1.5 text-xs cursor-pointer"
                >
                  <DownloadIcon size={12} />
                  {downloadingId === m.id ? 'Loading...' : 'Download'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
