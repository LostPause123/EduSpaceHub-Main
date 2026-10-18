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
  RefreshIcon,
  SearchIcon,
  DownloadIcon,
  FileTextIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  XIcon,
  CheckIcon,
} from '../../components/ui'
import { supabase } from '../../lib/supabase'

interface AdminMaterialsProps {
  navigate?: Navigate
}

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending Review', value: 'pending_review' },
  { label: 'Revision Requested', value: 'revision_requested' },
  { label: 'Approved (Pending Publish)', value: 'approved' },
  { label: 'Published Live', value: 'published' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Archived', value: 'archived' },
]

export default function AdminMaterials({ navigate }: AdminMaterialsProps) {
  const [materials, setMaterials] = useState<LearningMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTutorId, setSelectedTutorId] = useState('all')

  // Review modal state
  const [selectedMaterial, setSelectedMaterial] = useState<LearningMaterial | null>(null)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'request_revision' | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)

  // Confirmation dialogs
  const [confirmPublishOpen, setConfirmPublishOpen] = useState(false)
  const [confirmUnpublishOpen, setConfirmUnpublishOpen] = useState(false)
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false)
  const [actionInProgress, setActionInProgress] = useState(false)

  // Downloading state
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
      if (selectedTutorId !== 'all') params.append('tutorId', selectedTutorId)
      if (searchQuery.trim()) params.append('search', searchQuery.trim())

      const res = await fetch(`${apiUrl}/api/admin/materials?${params.toString()}`, {
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
      setError(err.message || 'Failed to load materials.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMaterials()
  }, [statusFilter, selectedTutorId, searchQuery])

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
        throw new Error(data.error || 'Failed to generate download link.')
      }

      window.open(data.downloadUrl, '_blank')
    } catch (err: any) {
      alert(err.message || 'Download error.')
    } finally {
      setDownloadingId(null)
    }
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedMaterial || !reviewAction) return

    if ((reviewAction === 'reject' || reviewAction === 'request_revision') && !feedbackText.trim()) {
      alert(`Please provide ${reviewAction === 'reject' ? 'a reason' : 'revision feedback'} for the tutor.`)
      return
    }

    setSubmittingReview(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const payload: any = { action: reviewAction }
      if (reviewAction === 'reject') payload.reason = feedbackText.trim()
      if (reviewAction === 'request_revision') payload.feedback = feedbackText.trim()
      if (reviewAction === 'approve' && feedbackText.trim()) payload.feedback = feedbackText.trim()

      const res = await fetch(`${apiUrl}/api/admin/materials/${selectedMaterial.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit review.')
      }

      setSuccessMsg(`Material review action '${reviewAction}' recorded successfully!`)
      setTimeout(() => setSuccessMsg(null), 5000)

      setReviewModalOpen(false)
      setReviewAction(null)
      setFeedbackText('')
      setSelectedMaterial(null)
      fetchMaterials()
    } catch (err: any) {
      alert(err.message || 'Review submission failed.')
    } finally {
      setSubmittingReview(false)
    }
  }

  async function handlePublish(material: LearningMaterial) {
    setActionInProgress(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch(`${apiUrl}/api/admin/materials/${material.id}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to publish material.')
      }

      setSuccessMsg(`"${material.title}" is now published and accessible to enrolled students!`)
      setTimeout(() => setSuccessMsg(null), 5000)

      setConfirmPublishOpen(false)
      setSelectedMaterial(null)
      fetchMaterials()
    } catch (err: any) {
      alert(err.message || 'Publishing failed.')
    } finally {
      setActionInProgress(false)
    }
  }

  async function handleUnpublish(material: LearningMaterial) {
    setActionInProgress(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch(`${apiUrl}/api/admin/materials/${material.id}/unpublish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to unpublish material.')
      }

      setSuccessMsg(`"${material.title}" unpublished. It is no longer visible to students.`)
      setTimeout(() => setSuccessMsg(null), 5000)

      setConfirmUnpublishOpen(false)
      setSelectedMaterial(null)
      fetchMaterials()
    } catch (err: any) {
      alert(err.message || 'Unpublishing failed.')
    } finally {
      setActionInProgress(false)
    }
  }

  async function handleArchive(material: LearningMaterial) {
    setActionInProgress(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch(`${apiUrl}/api/admin/materials/${material.id}/archive`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to archive material.')
      }

      setSuccessMsg(`"${material.title}" has been archived.`)
      setTimeout(() => setSuccessMsg(null), 5000)

      setConfirmArchiveOpen(false)
      setSelectedMaterial(null)
      fetchMaterials()
    } catch (err: any) {
      alert(err.message || 'Archiving failed.')
    } finally {
      setActionInProgress(false)
    }
  }

  function getStatusBadge(status: MaterialStatus) {
    switch (status) {
      case 'published':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Published Live</Badge>
      case 'approved':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Approved (Unpublished)</Badge>
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

  // Extract unique tutors for filter
  const tutorsList = Array.from(
    new Map(materials.map((m) => [m.tutorId, { id: m.tutorId, name: m.tutorName }])).values()
  )

  const pendingCount = materials.filter((m) => m.status === 'pending_review').length
  const revisionCount = materials.filter((m) => m.status === 'revision_requested').length
  const approvedCount = materials.filter((m) => m.status === 'approved').length
  const publishedCount = materials.filter((m) => m.status === 'published').length

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <SectionHeader
        title="Learning Materials Review & Publishing"
        subtitle="Review uploaded study materials from tutors, conduct quality assurance, request revisions, and manage publishing."
        action={
          <Button variant="outline" size="sm" onClick={fetchMaterials} className="gap-2 cursor-pointer">
            <RefreshIcon size={14} />
            Refresh
          </Button>
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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card className="p-4 bg-white border border-border">
          <p className="text-xs text-muted-foreground font-medium">Total Materials</p>
          <p className="text-2xl font-bold text-foreground mt-1">{materials.length}</p>
        </Card>
        <Card className="p-4 bg-white border border-border">
          <p className="text-xs text-amber-600 font-medium">Pending Review</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{pendingCount}</p>
        </Card>
        <Card className="p-4 bg-white border border-border">
          <p className="text-xs text-orange-600 font-medium">Revisions Requested</p>
          <p className="text-2xl font-bold text-orange-700 mt-1">{revisionCount}</p>
        </Card>
        <Card className="p-4 bg-white border border-border">
          <p className="text-xs text-blue-600 font-medium">Approved (Unpublished)</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{approvedCount}</p>
        </Card>
        <Card className="p-4 bg-white border border-border">
          <p className="text-xs text-emerald-600 font-medium">Published Live</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{publishedCount}</p>
        </Card>
      </div>

      {/* Filters Card */}
      <Card className="p-4 bg-white border border-border space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="Search by title, subject, tutor, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<SearchIcon size={15} />}
            />
          </div>
          <div className="w-full sm:w-64">
            <select
              value={selectedTutorId}
              onChange={(e) => setSelectedTutorId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-white text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
            >
              <option value="all">All Tutors</option>
              {tutorsList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
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

      {/* Materials Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-white border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : materials.length === 0 ? (
        <Card className="p-12 text-center bg-white border border-border">
          <FileTextIcon size={40} className="mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-base font-semibold text-foreground">No learning materials found</h3>
          <p className="text-xs text-muted-foreground mt-1">
            No materials match the selected status or filters.
          </p>
        </Card>
      ) : (
        <Card className="bg-white border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-secondary/30 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4">Material / Document</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Tutor</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Uploaded</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {materials.map((m) => (
                  <tr key={m.id} className="hover:bg-secondary/15 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-foreground">{m.title}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <FileTextIcon size={12} />
                          <span>{m.originalFilename}</span>
                          <span>•</span>
                          <span>{formatBytes(m.fileSize)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-foreground">
                      <Badge variant="outline" className="text-xs">
                        {m.subject}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4">
                      <div>
                        <div className="font-medium text-foreground">{m.tutorName}</div>
                        <div className="text-[11px] text-muted-foreground">{m.tutorEmail}</div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {getStatusBadge(m.status)}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {new Date(m.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(m)}
                          disabled={downloadingId === m.id}
                          className="h-8 text-xs gap-1 cursor-pointer"
                        >
                          <DownloadIcon size={12} />
                          {downloadingId === m.id ? '...' : 'File'}
                        </Button>

                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setSelectedMaterial(m)
                            setReviewAction(null)
                            setFeedbackText('')
                            setReviewModalOpen(true)
                          }}
                          className="h-8 text-xs bg-primary text-white cursor-pointer"
                        >
                          Review & Audit
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Review & Audit Modal */}
      {reviewModalOpen && selectedMaterial && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-border shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-foreground">{selectedMaterial.title}</h3>
                  {getStatusBadge(selectedMaterial.status)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Subject: <span className="font-semibold text-foreground">{selectedMaterial.subject}</span> • Tutor: <span className="font-semibold text-foreground">{selectedMaterial.tutorName}</span>
                </p>
              </div>
              <button
                onClick={() => setReviewModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-md cursor-pointer"
              >
                <XIcon size={18} />
              </button>
            </div>

            {/* Document Details & Secure Preview */}
            <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <FileTextIcon size={14} className="text-primary" />
                    <span>{selectedMaterial.originalFilename}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Size: {formatBytes(selectedMaterial.fileSize)} • Type: {selectedMaterial.fileType.toUpperCase()} • Uploaded: {new Date(selectedMaterial.createdAt).toLocaleString()}
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(selectedMaterial)}
                  disabled={downloadingId === selectedMaterial.id}
                  className="gap-1.5 text-xs bg-white cursor-pointer"
                >
                  <DownloadIcon size={13} />
                  {downloadingId === selectedMaterial.id ? 'Generating link...' : 'Secure Download / Preview'}
                </Button>
              </div>

              {selectedMaterial.description && (
                <div className="pt-2 border-t border-border/60 text-xs text-foreground">
                  <span className="font-semibold block text-muted-foreground text-[11px] mb-0.5">Description / Guidance:</span>
                  <p className="whitespace-pre-wrap">{selectedMaterial.description}</p>
                </div>
              )}
            </div>

            {/* Full Audit Trail & Status History */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Status History & Audit Log
              </h4>
              <div className="space-y-2 border-l-2 border-border/80 pl-4 py-1">
                {(selectedMaterial.statusHistory || []).map((h, idx) => (
                  <div key={idx} className="relative text-xs space-y-0.5">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-white" />
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground capitalize">{h.action.replace('_', ' ')}</span>
                      <span className="text-[11px] text-muted-foreground">
                        by {h.actorName || 'User'} ({h.actorRole || 'role'})
                      </span>
                      <span>•</span>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(h.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {h.feedback && (
                      <p className="text-xs text-amber-800 bg-amber-50 p-2 rounded-md border border-amber-200 mt-1">
                        Feedback: {h.feedback}
                      </p>
                    )}
                    {h.notes && (
                      <p className="text-xs text-muted-foreground italic mt-0.5">
                        Note: {h.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons & Feedback Form */}
            <div className="border-t border-border pt-4 space-y-4">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Review Decision
              </h4>

              {/* Status Specific Decision Buttons */}
              <div className="flex flex-wrap gap-2">
                {(selectedMaterial.status === 'pending_review' || selectedMaterial.status === 'revision_requested') && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => setReviewAction('approve')}
                      className={`text-xs gap-1.5 cursor-pointer ${
                        reviewAction === 'approve'
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                      }`}
                    >
                      <CheckIcon size={13} />
                      Approve Material
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => setReviewAction('request_revision')}
                      className={`text-xs gap-1.5 cursor-pointer ${
                        reviewAction === 'request_revision'
                          ? 'bg-amber-600 text-white'
                          : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                      }`}
                    >
                      <AlertCircleIcon size={13} />
                      Request Revision
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => setReviewAction('reject')}
                      className={`text-xs gap-1.5 cursor-pointer ${
                        reviewAction === 'reject'
                          ? 'bg-rose-600 text-white'
                          : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                      }`}
                    >
                      <XIcon size={13} />
                      Reject Material
                    </Button>
                  </>
                )}

                {selectedMaterial.status === 'approved' && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setReviewModalOpen(false)
                      setConfirmPublishOpen(true)
                    }}
                    className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                  >
                    <CheckCircleIcon size={13} />
                    Publish Live (Make Accessible to Students)
                  </Button>
                )}

                {selectedMaterial.status === 'published' && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setReviewModalOpen(false)
                      setConfirmUnpublishOpen(true)
                    }}
                    className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                  >
                    Unpublish Material
                  </Button>
                )}

                {selectedMaterial.status !== 'archived' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setReviewModalOpen(false)
                      setConfirmArchiveOpen(true)
                    }}
                    className="text-xs text-muted-foreground hover:text-destructive cursor-pointer"
                  >
                    Archive
                  </Button>
                )}
              </div>

              {/* Review Feedback / Rejection Input Form */}
              {reviewAction && (
                <form onSubmit={handleSubmitReview} className="space-y-3 p-4 rounded-xl bg-secondary/20 border border-border">
                  <div className="font-semibold text-xs text-foreground">
                    {reviewAction === 'approve'
                      ? 'Confirm Approval (Approval does NOT automatically publish)'
                      : reviewAction === 'request_revision'
                      ? 'Feedback for Tutor (Specify needed fixes or improvements): *'
                      : 'Reason for Rejection: *'}
                  </div>

                  <Textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder={
                      reviewAction === 'approve'
                        ? 'Optional congratulatory or review remarks...'
                        : reviewAction === 'request_revision'
                        ? 'e.g. Please add solutions to exercise 3 and clarify question 5.'
                        : 'e.g. Outdated curriculum / content violates tutoring guidelines.'
                    }
                    rows={3}
                    required={reviewAction !== 'approve'}
                  />

                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setReviewAction(null)}
                      disabled={submittingReview}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={submittingReview}
                      className={
                        reviewAction === 'approve'
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : reviewAction === 'request_revision'
                          ? 'bg-amber-600 hover:bg-amber-700 text-white'
                          : 'bg-rose-600 hover:bg-rose-700 text-white'
                      }
                    >
                      {submittingReview ? 'Submitting...' : `Confirm ${reviewAction.replace('_', ' ')}`}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Publish */}
      {confirmPublishOpen && selectedMaterial && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-border shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-foreground">Confirm Publication</h3>
            <p className="text-xs text-muted-foreground">
              Are you sure you want to publish <span className="font-semibold text-foreground">"{selectedMaterial.title}"</span>?
              <br />
              Once published, students enrolled in <span className="font-semibold text-foreground">"{selectedMaterial.subject}"</span> will be able to view and download this material immediately.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmPublishOpen(false)}
                disabled={actionInProgress}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => handlePublish(selectedMaterial)}
                disabled={actionInProgress}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {actionInProgress ? 'Publishing...' : 'Yes, Publish Live'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Unpublish */}
      {confirmUnpublishOpen && selectedMaterial && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-border shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-foreground">Confirm Unpublish</h3>
            <p className="text-xs text-muted-foreground">
              Are you sure you want to unpublish <span className="font-semibold text-foreground">"{selectedMaterial.title}"</span>?
              <br />
              Students will immediately lose access to this material until re-published.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmUnpublishOpen(false)}
                disabled={actionInProgress}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => handleUnpublish(selectedMaterial)}
                disabled={actionInProgress}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {actionInProgress ? 'Unpublishing...' : 'Yes, Unpublish'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Archive */}
      {confirmArchiveOpen && selectedMaterial && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-border shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-foreground">Confirm Archive</h3>
            <p className="text-xs text-muted-foreground">
              Are you sure you want to archive <span className="font-semibold text-foreground">"{selectedMaterial.title}"</span>?
              <br />
              Archived materials are inactive and inaccessible to students.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmArchiveOpen(false)}
                disabled={actionInProgress}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => handleArchive(selectedMaterial)}
                disabled={actionInProgress}
                className="bg-zinc-700 hover:bg-zinc-800 text-white"
              >
                {actionInProgress ? 'Archiving...' : 'Yes, Archive'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
