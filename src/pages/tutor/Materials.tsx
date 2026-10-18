'use client'

import { useEffect, useState } from 'react'
import type { Navigate, LearningMaterial, MaterialStatus } from '../../types'
import {
  Card,
  Badge,
  Button,
  Input,
  Textarea,
  SectionHeader,
  PlusIcon,
  RefreshIcon,
  SearchIcon,
  DownloadIcon,
  FileTextIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  XIcon,
  ExternalLinkIcon,
} from '../../components/ui'
import { supabase } from '../../lib/supabase'

interface TutorMaterialsProps {
  navigate?: Navigate
}

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending Review', value: 'pending_review' },
  { label: 'Revision Requested', value: 'revision_requested' },
  { label: 'Approved', value: 'approved' },
  { label: 'Published', value: 'published' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Archived', value: 'archived' },
]

export default function TutorMaterials({ navigate }: TutorMaterialsProps) {
  const [materials, setMaterials] = useState<LearningMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Tutor Profile for subjects
  const [tutorSubjects, setTutorSubjects] = useState<string[]>([])

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadDescription, setUploadDescription] = useState('')
  const [uploadSubject, setUploadSubject] = useState('')
  const [customSubject, setCustomSubject] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  // Resubmission modal state
  const [resubmitModalOpen, setResubmitModalOpen] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<LearningMaterial | null>(null)
  const [resubmitFile, setResubmitFile] = useState<File | null>(null)
  const [resubmitNote, setResubmitNote] = useState('')
  const [resubmitting, setResubmitting] = useState(false)

  // Download state
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

  async function fetchMaterials() {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (searchQuery.trim()) params.append('search', searchQuery.trim())

      const res = await fetch(`${apiUrl}/api/tutor/materials?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to fetch materials')
      }

      const data = await res.json()
      setMaterials(data.materials || [])
    } catch (err: any) {
      console.error('fetchMaterials error:', err)
      setError(err.message || 'Failed to load learning materials.')
    } finally {
      setLoading(false)
    }
  }

  // Fetch tutor profile to get taught subjects
  useEffect(() => {
    async function loadTutorProfile() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const res = await fetch(`${apiUrl}/api/tutor/profile`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok) {
          const data = await res.json()
          if (data.profile?.subjects) {
            setTutorSubjects(data.profile.subjects)
            if (data.profile.subjects.length > 0) {
              setUploadSubject(data.profile.subjects[0])
            }
          }
        }
      } catch (err) {
        console.warn('Could not load tutor subjects:', err)
      }
    }
    loadTutorProfile()
  }, [apiUrl])

  useEffect(() => {
    fetchMaterials()
  }, [statusFilter, searchQuery])

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>, isResubmit = false) {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedExtensions = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt']
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()

    if (!allowedExtensions.includes(ext)) {
      alert(`Unsupported file type. Please select a PDF, DOC, DOCX, PPT, PPTX, or TXT file.`)
      e.target.value = ''
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      alert(`File size exceeds 50MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`)
      e.target.value = ''
      return
    }

    if (isResubmit) {
      setResubmitFile(file)
    } else {
      setUploadFile(file)
    }
  }

  async function handleUploadSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!uploadFile) {
      alert('Please select a file to upload.')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const finalSubject = uploadSubject === 'Other' ? customSubject.trim() : uploadSubject

      const formData = new FormData()
      formData.append('title', uploadTitle.trim())
      formData.append('description', uploadDescription.trim())
      formData.append('subject', finalSubject || 'General')
      formData.append('file', uploadFile)

      const res = await fetch(`${apiUrl}/api/tutor/materials`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload material.')
      }

      setSuccessMsg('Material successfully uploaded and submitted for Admin review!')
      setTimeout(() => setSuccessMsg(null), 5000)

      // Reset form
      setUploadTitle('')
      setUploadDescription('')
      setUploadFile(null)
      setCustomSubject('')
      setUploadModalOpen(false)
      fetchMaterials()
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  async function handleResubmitSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedMaterial) return

    setResubmitting(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const formData = new FormData()
      formData.append('resubmit', 'true')
      if (resubmitNote.trim()) formData.append('resubmissionNote', resubmitNote.trim())
      if (resubmitFile) formData.append('file', resubmitFile)

      const res = await fetch(`${apiUrl}/api/tutor/materials/${selectedMaterial.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to resubmit material.')
      }

      setSuccessMsg('Material resubmitted successfully for review!')
      setTimeout(() => setSuccessMsg(null), 5000)

      setResubmitFile(null)
      setResubmitNote('')
      setResubmitModalOpen(false)
      setSelectedMaterial(null)
      fetchMaterials()
    } catch (err: any) {
      console.error('Resubmission error:', err)
      setError(err.message || 'Resubmission failed.')
    } finally {
      setResubmitting(false)
    }
  }

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
        throw new Error(data.error || 'Failed to generate download URL.')
      }

      window.open(data.downloadUrl, '_blank')
    } catch (err: any) {
      console.error('Download error:', err)
      alert(err.message || 'Could not download file.')
    } finally {
      setDownloadingId(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this material? This action cannot be undone.')) {
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch(`${apiUrl}/api/tutor/materials/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete material.')
      }

      setSuccessMsg('Material deleted successfully.')
      setTimeout(() => setSuccessMsg(null), 4000)
      fetchMaterials()
    } catch (err: any) {
      alert(err.message || 'Failed to delete material.')
    }
  }

  function getStatusBadge(status: MaterialStatus) {
    switch (status) {
      case 'published':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Published</Badge>
      case 'approved':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Approved</Badge>
      case 'revision_requested':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Revision Requested</Badge>
      case 'pending_review':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending Review</Badge>
      case 'rejected':
        return <Badge className="bg-rose-100 text-rose-800 border-rose-200">Rejected</Badge>
      case 'processing':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Processing</Badge>
      case 'archived':
        return <Badge className="bg-zinc-100 text-zinc-700 border-zinc-200">Archived</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  function formatBytes(bytes: number) {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  const pendingCount = materials.filter((m) => m.status === 'pending_review').length
  const revisionCount = materials.filter((m) => m.status === 'revision_requested').length
  const publishedCount = materials.filter((m) => m.status === 'published').length

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <SectionHeader
        title="Learning Materials"
        subtitle="Upload and manage study materials, slides, and exercises for students. Submissions undergo Admin review prior to publishing."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchMaterials} className="gap-2 cursor-pointer">
              <RefreshIcon size={14} />
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setUploadModalOpen(true)}
              className="gap-2 bg-primary text-white cursor-pointer"
            >
              <PlusIcon size={14} />
              Upload Material
            </Button>
          </div>
        }
      />

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircleIcon size={16} className="text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
          <AlertCircleIcon size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border border-border">
          <p className="text-xs text-muted-foreground font-medium">Total Materials</p>
          <p className="text-2xl font-bold text-foreground mt-1">{materials.length}</p>
        </Card>
        <Card className="p-4 bg-white border border-border">
          <p className="text-xs text-amber-600 font-medium">Pending Review</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{pendingCount}</p>
        </Card>
        <Card className="p-4 bg-white border border-border">
          <p className="text-xs text-orange-600 font-medium">Revisions Needed</p>
          <p className="text-2xl font-bold text-orange-700 mt-1">{revisionCount}</p>
        </Card>
        <Card className="p-4 bg-white border border-border">
          <p className="text-xs text-emerald-600 font-medium">Published Live</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{publishedCount}</p>
        </Card>
      </div>

      {/* Search & Filter */}
      <Card className="p-4 bg-white border border-border space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search by title, subject, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<SearchIcon size={15} />}
            />
          </div>
        </div>

        {/* Status Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 pt-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                statusFilter === f.value
                  ? 'bg-primary text-white'
                  : 'bg-secondary/60 text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Materials List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-white border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : materials.length === 0 ? (
        <Card className="p-12 text-center bg-white border border-border">
          <FileTextIcon size={40} className="mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-base font-semibold text-foreground">No learning materials found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {statusFilter !== 'all'
              ? `No materials matching status '${statusFilter}'.`
              : 'Upload your lecture notes, exercises, or revision slides to share with students.'}
          </p>
          <Button
            size="sm"
            onClick={() => setUploadModalOpen(true)}
            className="mt-4 gap-2 bg-primary text-white cursor-pointer"
          >
            <PlusIcon size={14} />
            Upload First Material
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {materials.map((m) => (
            <Card key={m.id} className="p-5 bg-white border border-border space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-foreground">{m.title}</h3>
                    {getStatusBadge(m.status)}
                    <Badge variant="outline" className="text-xs">
                      {m.subject}
                    </Badge>
                  </div>
                  {m.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{m.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 flex-wrap">
                    <span className="flex items-center gap-1">
                      <FileTextIcon size={13} />
                      {m.originalFilename}
                    </span>
                    <span>•</span>
                    <span>{formatBytes(m.fileSize)}</span>
                    <span>•</span>
                    <span>Uploaded {new Date(m.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(m)}
                    disabled={downloadingId === m.id}
                    className="gap-1.5 text-xs cursor-pointer"
                  >
                    <DownloadIcon size={13} />
                    {downloadingId === m.id ? 'Loading...' : 'Download'}
                  </Button>

                  {m.status === 'revision_requested' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setSelectedMaterial(m)
                        setResubmitModalOpen(true)
                      }}
                      className="gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                    >
                      <RefreshIcon size={13} />
                      Resubmit
                    </Button>
                  )}

                  {m.status !== 'published' && m.status !== 'approved' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(m.id)}
                      className="text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>

              {/* Revision Notice Banner */}
              {m.status === 'revision_requested' && m.reviewFeedback && (
                <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                  <div className="font-semibold flex items-center gap-1.5 text-amber-800">
                    <AlertCircleIcon size={14} className="shrink-0 text-amber-600" />
                    Admin Feedback (Action Required):
                  </div>
                  <p className="pl-5">{m.reviewFeedback}</p>
                </div>
              )}

              {/* Rejection Notice Banner */}
              {m.status === 'rejected' && m.reviewFeedback && (
                <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1">
                  <div className="font-semibold flex items-center gap-1.5 text-rose-800">
                    <AlertCircleIcon size={14} className="shrink-0 text-rose-600" />
                    Rejection Reason:
                  </div>
                  <p className="pl-5">{m.reviewFeedback}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Upload Material Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-border shadow-xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-bold text-foreground">Upload Learning Material</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Submissions are reviewed by EduSpace Admin before publishing.
                </p>
              </div>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md cursor-pointer"
              >
                <XIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Material Title *
                </label>
                <Input
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Chapter 4: Genetics and Molecular Inheritance"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Subject *
                </label>
                <select
                  value={uploadSubject}
                  onChange={(e) => setUploadSubject(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-white text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                >
                  {tutorSubjects.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  <option value="Other">Other (enter custom subject)</option>
                </select>

                {uploadSubject === 'Other' && (
                  <Input
                    className="mt-2"
                    placeholder="Enter subject name..."
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    required
                  />
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Description / Study Guidance
                </label>
                <Textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Outline what this document covers and how students should use it..."
                  rows={3}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Document File * (PDF, DOC, DOCX, PPT, PPTX, TXT - max 50MB)
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain"
                  onChange={(e) => handleFileSelect(e, false)}
                  className="w-full text-xs text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                  required
                />
                {uploadFile && (
                  <p className="text-xs text-emerald-600 mt-1 font-medium">
                    ✓ Selected: {uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setUploadModalOpen(false)}
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={uploading || !uploadFile}
                  className="bg-primary text-white"
                >
                  {uploading ? 'Uploading...' : 'Submit for Review'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resubmit Modal */}
      {resubmitModalOpen && selectedMaterial && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-border shadow-xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-bold text-foreground">Resubmit Revised Material</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedMaterial.title} ({selectedMaterial.subject})
                </p>
              </div>
              <button
                onClick={() => setResubmitModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md cursor-pointer"
              >
                <XIcon size={18} />
              </button>
            </div>

            {selectedMaterial.reviewFeedback && (
              <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                <span className="font-semibold block text-amber-800 mb-1">Admin Feedback:</span>
                {selectedMaterial.reviewFeedback}
              </div>
            )}

            <form onSubmit={handleResubmitSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Replace File (Optional if only metadata updated)
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain"
                  onChange={(e) => handleFileSelect(e, true)}
                  className="w-full text-xs text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                />
                {resubmitFile ? (
                  <p className="text-xs text-emerald-600 mt-1 font-medium">
                    ✓ New file: {resubmitFile.name} ({(resubmitFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Current file: {selectedMaterial.originalFilename}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Resubmission Notes for Admin
                </label>
                <Textarea
                  value={resubmitNote}
                  onChange={(e) => setResubmitNote(e.target.value)}
                  placeholder="Explain the changes or fixes made according to the review feedback..."
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setResubmitModalOpen(false)}
                  disabled={resubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={resubmitting}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {resubmitting ? 'Submitting...' : 'Resubmit for Review'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
