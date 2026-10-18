'use client'

import { useEffect, useState } from 'react'
import type { Navigate, AdminTutor } from '../../types'
import {
  SectionHeader,
  Card,
  Badge,
  Button,
  Input,
  Select,
  Avatar,
  Modal,
  StarRating,
  SearchIcon,
  FilterIcon,
  RefreshIcon,
  EditIcon,
  EyeIcon,
  AlertCircleIcon,
  CheckIcon,
  XIcon,
} from '../../components/ui'

interface TutorsProps {
  navigate?: Navigate
}

export default function Tutors({ navigate }: TutorsProps) {
  const [tutors, setTutors] = useState<AdminTutor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [subjectFilter, setSubjectFilter] = useState('all')

  // Modals
  const [selectedTutor, setSelectedTutor] = useState<AdminTutor | null>(null)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)

  // Edit Form State
  const [editForm, setEditForm] = useState({
    full_name: '',
    hourly_rate: 40,
    experience_years: 1,
    bio: '',
    subjects: '',
    is_active: true,
  })
  const [updating, setUpdating] = useState(false)

  async function fetchTutors() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('http://localhost:3000/api/admin/tutors')
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      const data = await res.json()
      if (data.success) {
        setTutors(data.tutors || [])
      } else {
        throw new Error(data.error || 'Failed to fetch tutors')
      }
    } catch (err: any) {
      console.error('Error fetching tutors:', err)
      setError(err.message || 'Could not connect to backend.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTutors()
  }, [])

  async function handleToggleActive(tutor: AdminTutor) {
    try {
      const newStatus = !tutor.is_active
      const res = await fetch(`http://localhost:3000/api/admin/tutors/${tutor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus }),
      })
      if (!res.ok) throw new Error('Failed to update tutor active status')

      // Update local state
      setTutors((prev) =>
        prev.map((t) => (t.id === tutor.id ? { ...t, is_active: newStatus } : t))
      )
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  function openEditModal(tutor: AdminTutor) {
    setSelectedTutor(tutor)
    setEditForm({
      full_name: tutor.full_name || tutor.name || '',
      hourly_rate: tutor.hourly_rate || tutor.pricePerHour || 40,
      experience_years: tutor.experience_years || 0,
      bio: tutor.bio || '',
      subjects: (tutor.subjects || []).join(', '),
      is_active: tutor.is_active !== false,
    })
    setEditModalOpen(true)
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTutor) return
    setUpdating(true)
    try {
      const subjectsArray = editForm.subjects
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

      const res = await fetch(`http://localhost:3000/api/admin/tutors/${selectedTutor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: editForm.full_name,
          hourly_rate: editForm.hourly_rate,
          experience_years: editForm.experience_years,
          bio: editForm.bio,
          subjects: subjectsArray,
          is_active: editForm.is_active,
        }),
      })

      if (!res.ok) throw new Error('Failed to save tutor details')

      setEditModalOpen(false)
      fetchTutors()
    } catch (err: any) {
      alert(`Error updating tutor: ${err.message}`)
    } finally {
      setUpdating(false)
    }
  }

  // Filter Logic
  const allSubjects = Array.from(
    new Set(tutors.flatMap((t) => t.subjects || []))
  ).filter(Boolean)

  const filteredTutors = tutors.filter((t) => {
    const matchesSearch =
      (t.full_name || t.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.subjects || []).some((s: string) => s.toLowerCase().includes(search.toLowerCase()))

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
        ? t.is_active !== false
        : t.is_active === false

    const matchesSubject =
      subjectFilter === 'all'
        ? true
        : (t.subjects || []).includes(subjectFilter)

    return matchesSearch && matchesStatus && matchesSubject
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <SectionHeader
        title="Manage Tutors"
        subtitle="View tutor profiles, monitor booking statistics, edit details, and toggle status."
        action={
          <Button variant="outline" size="sm" onClick={fetchTutors} className="gap-2">
            <RefreshIcon size={14} />
            Refresh
          </Button>
        }
      />

      {/* Filter & Search Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            placeholder="Search tutor by name, email, or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<SearchIcon size={16} />}
          />
          <Select
            label=""
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'active', label: 'Active / Enabled Only' },
              { value: 'disabled', label: 'Disabled Only' },
            ]}
          />
          <Select
            label=""
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Subjects' },
              ...allSubjects.map((s) => ({ value: s, label: s })),
            ]}
          />
        </div>
      </Card>

      {/* Content Area */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-white border border-border rounded-lg animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <Card className="p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-3">
            <AlertCircleIcon size={24} />
          </div>
          <h3 className="text-base font-semibold text-foreground">Error loading tutors</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchTutors}>
            Retry
          </Button>
        </Card>
      ) : filteredTutors.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-secondary text-muted-foreground flex items-center justify-center mx-auto mb-3">
            <SearchIcon size={20} />
          </div>
          <h3 className="text-base font-semibold text-foreground">No tutors found</h3>
          <p className="text-xs text-muted-foreground mt-1">Try adjusting your search query or status filter.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/60 text-muted-foreground uppercase text-[11px] font-semibold tracking-wider border-b border-border">
                <tr>
                  <th className="px-5 py-3">Tutor Profile</th>
                  <th className="px-5 py-3">Subject / Rate</th>
                  <th className="px-5 py-3">Rating</th>
                  <th className="px-5 py-3">Bookings</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTutors.map((t) => (
                  <tr key={t.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar src={t.avatar_url || t.avatarUrl} alt={t.full_name || t.name} size="md" />
                        <div>
                          <p className="font-semibold text-foreground">{t.full_name || t.name}</p>
                          <p className="text-xs text-muted-foreground">{t.email || 'No email provided'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-medium text-primary text-xs">
                          {(t.subjects || []).join(', ') || t.subject || 'General'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          ${t.hourly_rate || t.pricePerHour || 40}/hr &bull; {t.experience_years || 0} yrs exp
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <StarRating rating={t.rating || 5.0} size="sm" />
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-semibold text-foreground">{t.bookingCount || 0}</span>
                      <span className="text-xs text-muted-foreground ml-1">sessions</span>
                    </td>
                    <td className="px-5 py-4">
                      {t.is_active !== false ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="destructive">Disabled</Badge>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="xs"
                          title="View Profile"
                          onClick={() => {
                            setSelectedTutor(t)
                            setViewModalOpen(true)
                          }}
                        >
                          <EyeIcon size={14} />
                        </Button>
                        <Button
                          variant="outline"
                          size="xs"
                          title="Edit Tutor"
                          onClick={() => openEditModal(t)}
                        >
                          <EditIcon size={14} />
                        </Button>
                        <Button
                          variant={t.is_active !== false ? 'destructive' : 'primary'}
                          size="xs"
                          onClick={() => handleToggleActive(t)}
                        >
                          {t.is_active !== false ? 'Disable' : 'Enable'}
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

      {/* View Tutor Profile Modal */}
      {selectedTutor && (
        <Modal
          open={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          title="Tutor Profile Overview"
          size="lg"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-4 pb-4 border-b border-border">
              <Avatar
                src={selectedTutor.avatar_url || selectedTutor.avatarUrl}
                alt={selectedTutor.full_name || selectedTutor.name}
                size="xl"
              />
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  {selectedTutor.full_name || selectedTutor.name}
                </h3>
                <p className="text-sm text-muted-foreground">{selectedTutor.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <StarRating rating={selectedTutor.rating || 5.0} size="sm" />
                  <span className="text-xs text-muted-foreground">&bull;</span>
                  <span className="text-xs font-semibold text-primary">
                    ${selectedTutor.hourly_rate || selectedTutor.pricePerHour || 40}/hr
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Subjects & Specializations
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {(selectedTutor.subjects || []).map((s: string) => (
                  <Badge key={s} variant="secondary">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Biography / Summary
              </h4>
              <p className="text-sm text-foreground bg-secondary/30 p-3 rounded-lg border border-border/60 leading-relaxed">
                {selectedTutor.bio || 'No biography provided yet.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
              <div className="bg-white p-3 rounded-lg border border-border">
                <span className="text-muted-foreground block">Experience</span>
                <span className="font-semibold text-foreground text-sm">
                  {selectedTutor.experience_years || 0} years
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-border">
                <span className="text-muted-foreground block">Total Bookings</span>
                <span className="font-semibold text-foreground text-sm">
                  {selectedTutor.bookingCount || 0} sessions
                </span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Tutor Modal */}
      {selectedTutor && (
        <Modal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title="Edit Tutor Profile"
          size="md"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <Input
              label="Full Name"
              value={editForm.full_name}
              onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Hourly Rate ($)"
                type="number"
                min="0"
                value={editForm.hourly_rate}
                onChange={(e) => setEditForm({ ...editForm, hourly_rate: Number(e.target.value) })}
                required
              />
              <Input
                label="Experience (Years)"
                type="number"
                min="0"
                value={editForm.experience_years}
                onChange={(e) => setEditForm({ ...editForm, experience_years: Number(e.target.value) })}
                required
              />
            </div>
            <Input
              label="Subjects (comma separated)"
              value={editForm.subjects}
              onChange={(e) => setEditForm({ ...editForm, subjects: e.target.value })}
              placeholder="e.g. Mathematics, Calculus, Algebra"
              required
            />
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Bio</label>
              <textarea
                className="w-full border border-border rounded-md bg-white text-foreground text-sm p-3 focus:outline-none focus:ring-2 focus:ring-primary/20"
                rows={3}
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="is_active_cb"
                checked={editForm.is_active}
                onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                className="rounded border-border text-primary focus:ring-primary/20"
              />
              <label htmlFor="is_active_cb" className="text-sm font-medium text-foreground cursor-pointer">
                Tutor Account Enabled
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={updating}>
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
