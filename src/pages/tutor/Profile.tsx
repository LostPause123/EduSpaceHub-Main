'use client'

import { useEffect, useState } from 'react'
import type { Navigate, TutorProfileData } from '../../types'
import {
  SectionHeader,
  Card,
  Badge,
  Button,
  Avatar,
  Input,
  GraduationCapIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  RefreshIcon,
  UserIcon,
} from '../../components/ui'
import { supabase } from '../../lib/supabase'

interface TutorProfileProps {
  navigate?: Navigate
}

export default function TutorProfile({ navigate }: TutorProfileProps) {
  const [profile, setProfile] = useState<TutorProfileData | null>(null)
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [subjectsStr, setSubjectsStr] = useState('')
  const [hourlyRate, setHourlyRate] = useState<number>(40)
  const [experienceYears, setExperienceYears] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function fetchProfile() {
    setLoading(true)
    setErrorMsg(null)
    try {
      // 1. Get authenticated user
      const { data: { user }, error: userErr } = await supabase.auth.getUser()
      if (userErr || !user) throw new Error('Not authenticated. Please log in again.')

      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      let success = false
      if (token) {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
          const res = await fetch(`${apiUrl}/api/tutor/profile`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
          if (res.ok) {
            const data = await res.json()
            if (data.success && data.profile) {
              const p = data.profile
              setProfile(p)
              setFullName(p.name || '')
              setBio(p.bio || '')
              setSubjectsStr((p.subjects || []).join(', '))
              setHourlyRate(p.hourly_rate ?? 40)
              setExperienceYears(p.experience_years ?? 0)
              success = true
            }
          }
        } catch (err) {
          console.warn('API error, falling back to direct Supabase query:', err)
        }
      }

      if (!success) {
        // Direct Supabase query fallback for this authenticated user
        const { data: prof, error: profErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profErr) throw profErr

        const { data: tut, error: tutErr } = await supabase
          .from('tutors')
          .select('*')
          .eq('profile_id', user.id)
          .single()

        if (tutErr) throw tutErr

        if (prof && tut) {
          const p: TutorProfileData = {
            id: tut.id,
            profileId: prof.id,
            name: prof.full_name || 'Tutor',
            email: prof.email || user.email || '',
            avatarUrl: prof.avatar_url,
            bio: tut.bio || '',
            subjects: tut.subjects || [],
            hourly_rate: tut.hourly_rate ?? 40,
            experience_years: tut.experience_years ?? 0,
            rating: tut.rating ?? 5.0,
            is_active: tut.is_active !== false,
          }
          setProfile(p)
          setFullName(p.name)
          setBio(p.bio)
          setSubjectsStr((p.subjects || []).join(', '))
          setHourlyRate(p.hourly_rate)
          setExperienceYears(p.experience_years)
        }
      }
    } catch (err: any) {
      console.error('Error fetching tutor profile:', err)
      setErrorMsg(err.message || 'Failed to load profile.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSuccessMsg(null)
    setErrorMsg(null)

    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser()
      if (userErr || !user) throw new Error('Not authenticated')

      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const subjects = subjectsStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

      const payload = {
        full_name: fullName.trim(),
        bio: bio.trim(),
        subjects,
        hourly_rate: Number(hourlyRate),
        experience_years: Number(experienceYears),
      }

      let apiSuccess = false
      if (token) {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
          const res = await fetch(`${apiUrl}/api/tutor/profile`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          })
          if (res.ok) {
            const data = await res.json()
            if (data.success) apiSuccess = true
          }
        } catch (err) {
          console.warn('API update failed, trying Supabase direct:', err)
        }
      }

      if (!apiSuccess) {
        // Direct Supabase update using verified user.id
        await supabase
          .from('profiles')
          .update({ full_name: payload.full_name, updated_at: new Date().toISOString() })
          .eq('id', user.id)

        await supabase
          .from('tutors')
          .update({
            bio: payload.bio,
            subjects: payload.subjects,
            hourly_rate: payload.hourly_rate,
            experience_years: payload.experience_years,
            updated_at: new Date().toISOString(),
          })
          .eq('profile_id', user.id)
      }

      setSuccessMsg('Profile updated successfully!')
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err: any) {
      console.error('Error updating profile:', err)
      setErrorMsg(err.message || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <SectionHeader
        title="Tutor Profile & Teaching Information"
        subtitle="Manage your tutor bio, subjects taught, and hourly rates visible to students."
        action={
          <Button variant="outline" size="sm" onClick={fetchProfile} className="gap-2 cursor-pointer">
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

      {errorMsg && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
          <AlertCircleIcon size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <div className="h-32 bg-white border border-border rounded-xl animate-pulse" />
          <div className="h-64 bg-white border border-border rounded-xl animate-pulse" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Top Profile Summary Card */}
          <Card className="p-6 bg-white border border-border">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Avatar src={profile?.avatarUrl || undefined} alt={fullName} size="xl" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-foreground">{fullName || profile?.name || 'Tutor'}</h3>
                  <Badge variant="default" className="text-xs bg-primary text-white">
                    Tutor
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{profile?.email}</p>
                <div className="flex items-center gap-3 text-xs pt-1">
                  <span className="font-semibold text-primary">★ {profile?.rating?.toFixed(1) ?? '5.0'} Rating</span>
                  <span>•</span>
                  <span className="text-muted-foreground">{experienceYears} Years Experience</span>
                  <span>•</span>
                  <span className="font-bold text-foreground">${hourlyRate}/hr</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Edit Form Fields */}
          <Card className="p-6 bg-white border border-border space-y-5">
            <h4 className="text-sm font-bold text-foreground border-b border-border/80 pb-3">
              Teaching Profile Details
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Full Name
                </label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Account Email (read-only)
                </label>
                <Input
                  value={profile?.email || ''}
                  disabled
                  className="bg-secondary/40 text-muted-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Hourly Rate ($ USD)
                </label>
                <Input
                  type="number"
                  min={10}
                  max={500}
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Years of Experience
                </label>
                <Input
                  type="number"
                  min={0}
                  max={50}
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">
                Subjects Taught (comma-separated)
              </label>
              <Input
                value={subjectsStr}
                onChange={(e) => setSubjectsStr(e.target.value)}
                placeholder="e.g. Mathematics, Physics, Biology"
                required
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Enter the subjects you specialize in, separated by commas.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">
                About / Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                placeholder="Tell students about your teaching philosophy, background, and expertise..."
                className="w-full text-xs p-3 rounded-lg border border-border bg-white text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-border">
              <Button
                type="submit"
                disabled={saving}
                className="bg-primary text-white hover:bg-primary/90 cursor-pointer"
              >
                {saving ? 'Saving Changes...' : 'Save Profile Changes'}
              </Button>
            </div>
          </Card>
        </form>
      )}
    </div>
  )
}
