'use client'

import { useEffect, useState } from 'react'
import type { Navigate, AdminStudent } from '../../types'
import {
  SectionHeader,
  Card,
  Badge,
  Button,
  Input,
  Avatar,
  Modal,
  SearchIcon,
  RefreshIcon,
  EyeIcon,
  AlertCircleIcon,
  CalendarIcon,
  BookmarkIcon,
} from '../../components/ui'

interface StudentsProps {
  navigate?: Navigate
}

export default function Students({ navigate }: StudentsProps) {
  const [students, setStudents] = useState<AdminStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // Student Profile Modal
  const [selectedStudent, setSelectedStudent] = useState<AdminStudent | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  async function fetchStudents() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('http://localhost:3000/api/admin/students')
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      const data = await res.json()
      if (data.success) {
        setStudents(data.students || [])
      } else {
        throw new Error(data.error || 'Failed to load students')
      }
    } catch (err: any) {
      console.error('Error fetching students:', err)
      setError(err.message || 'Could not connect to backend server.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [])

  const filteredStudents = students.filter((s) => {
    const query = search.toLowerCase()
    return (
      (s.full_name || s.name || '').toLowerCase().includes(query) ||
      (s.email || '').toLowerCase().includes(query)
    )
  })

  function formatDate(isoStr?: string) {
    if (!isoStr) return 'N/A'
    const date = new Date(isoStr)
    if (isNaN(date.getTime())) return 'N/A'
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <SectionHeader
        title="Manage Students"
        subtitle="Monitor registered student accounts and review their tutoring engagement."
        action={
          <Button variant="outline" size="sm" onClick={fetchStudents} className="gap-2">
            <RefreshIcon size={14} />
            Refresh
          </Button>
        }
      />

      {/* Filter / Search */}
      <Card className="p-4">
        <div className="max-w-md">
          <Input
            placeholder="Search student by name or email address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<SearchIcon size={16} />}
          />
        </div>
      </Card>

      {/* Table Content */}
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
          <h3 className="text-base font-semibold text-foreground">Error loading students</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchStudents}>
            Retry
          </Button>
        </Card>
      ) : filteredStudents.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-secondary text-muted-foreground flex items-center justify-center mx-auto mb-3">
            <SearchIcon size={20} />
          </div>
          <h3 className="text-base font-semibold text-foreground">No students found</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {search ? 'Try adjusting your search criteria.' : 'No registered students found in database.'}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/60 text-muted-foreground uppercase text-[11px] font-semibold tracking-wider border-b border-border">
                <tr>
                  <th className="px-5 py-3">Student Name</th>
                  <th className="px-5 py-3">Email Address</th>
                  <th className="px-5 py-3">Registration Date</th>
                  <th className="px-5 py-3">Bookings</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar src={s.avatar_url || s.avatarUrl} alt={s.full_name || s.name} size="md" />
                        <div>
                          <p className="font-semibold text-foreground">{s.full_name || s.name}</p>
                          <p className="text-xs text-muted-foreground">ID: {s.id.slice(0, 8)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-foreground font-medium">
                      {s.email || 'N/A'}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground text-xs">
                      <span className="flex items-center gap-1.5">
                        <CalendarIcon size={14} />
                        {formatDate(s.created_at)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-bold text-foreground">{s.bookingCount || 0}</span>
                      <span className="text-xs text-muted-foreground ml-1">sessions</span>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant="success">Active Student</Badge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        variant="outline"
                        size="xs"
                        className="gap-1"
                        onClick={() => {
                          setSelectedStudent(s)
                          setModalOpen(true)
                        }}
                      >
                        <EyeIcon size={14} />
                        View Profile
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Student View Modal */}
      {selectedStudent && (
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Student Profile Details"
          size="md"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b border-border">
              <Avatar
                src={selectedStudent.avatar_url || selectedStudent.avatarUrl}
                alt={selectedStudent.full_name || selectedStudent.name}
                size="lg"
              />
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  {selectedStudent.full_name || selectedStudent.name}
                </h3>
                <p className="text-sm text-muted-foreground">{selectedStudent.email}</p>
                <Badge variant="secondary" className="mt-1">Student Role</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-3 rounded-lg border border-border">
                <span className="text-muted-foreground block">Account ID</span>
                <span className="font-mono text-foreground font-medium text-xs break-all">
                  {selectedStudent.id}
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-border">
                <span className="text-muted-foreground block">Registered On</span>
                <span className="font-semibold text-foreground text-sm">
                  {formatDate(selectedStudent.created_at)}
                </span>
              </div>
            </div>

            <div className="bg-primary-50/50 p-4 rounded-lg border border-primary-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <BookmarkIcon size={18} />
                <span>Total Bookings Placed</span>
              </div>
              <span className="text-xl font-bold text-primary">
                {selectedStudent.bookingCount}
              </span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
