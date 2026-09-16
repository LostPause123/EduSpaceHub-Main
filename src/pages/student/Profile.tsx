import { useEffect, useState } from 'react'
import type { Navigate } from '../../types'
import { Card, Button, Input, Textarea, Avatar, Divider, Toast } from '../../components/ui'
import { supabase } from '../../lib/supabase'

interface ProfileProps { navigate: Navigate }

interface UserProfile {
  id: string
  full_name: string | null
  email: string | null
  role: string | null
  avatar_url: string | null
}

interface FormState {
  firstName: string
  lastName: string
  email: string
  phone: string
  university: string
  program: string
  year: string
  timezone: string
  bio: string
}

const emptyForm: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  university: '',
  program: '',
  year: '',
  timezone: 'America/New_York',
  bio: '',
}

export default function Profile({ navigate }: ProfileProps) {
  const [activeSection, setActiveSection] = useState('personal')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showToast, setShowToast] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [notifPrefs, setNotifPrefs] = useState({ email: true, reminders: true, marketing: false })
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' })

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    try {
      setLoading(true)
      setError(null)

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user) {
        navigate('login')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      const metadata = user.user_metadata ?? {}
      const fullName = profile?.full_name ?? metadata.full_name ?? user.email?.split('@')[0] ?? ''
      const parts = fullName.trim().split(/\s+/)

      setForm({
        firstName: parts[0] ?? '',
        lastName: parts.slice(1).join(' '),
        email: profile?.email ?? user.email ?? '',
        phone: metadata.phone ?? '',
        university: metadata.university ?? '',
        program: metadata.program ?? '',
        year: metadata.year ?? '',
        timezone: metadata.timezone ?? 'America/New_York',
        bio: metadata.bio ?? '',
      })
      setAvatarUrl(profile?.avatar_url ?? metadata.avatar_url ?? null)
      setNotifPrefs({
        email: metadata.notification_email ?? true,
        reminders: metadata.notification_reminders ?? true,
        marketing: metadata.notification_marketing ?? false,
      })
    } catch (err) {
      console.error('Profile load error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load your profile.')
    } finally {
      setLoading(false)
    }
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    try {
      setSaving(true)
      setError(null)

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user) {
        navigate('login')
        return
      }

      const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim()

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          email: form.email.trim(),
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      const { data: updatedUser, error: metadataError } = await supabase.auth.updateUser({
        email: form.email.trim() || undefined,
        data: {
          full_name: fullName,
          phone: form.phone,
          university: form.university,
          program: form.program,
          year: form.year,
          timezone: form.timezone,
          bio: form.bio,
          notification_email: notifPrefs.email,
          notification_reminders: notifPrefs.reminders,
          notification_marketing: notifPrefs.marketing,
        },
      })

      if (metadataError) throw metadataError

      if (updatedUser.user?.user_metadata) {
        setAvatarUrl(updatedUser.user.user_metadata.avatar_url ?? avatarUrl)
      }

      setShowToast(true)
      window.setTimeout(() => setShowToast(false), 2500)
    } catch (err) {
      console.error('Profile save error:', err)
      setError(err instanceof Error ? err.message : 'Failed to save your changes.')
    } finally {
      setSaving(false)
    }
  }

  async function handlePasswordUpdate() {
    try {
      setSaving(true)
      setError(null)

      if (passwords.next.length < 8) {
        throw new Error('New password must be at least 8 characters.')
      }
      if (passwords.next !== passwords.confirm) {
        throw new Error("Passwords don't match.")
      }

      const { error: passwordError } = await supabase.auth.updateUser({
        password: passwords.next,
      })

      if (passwordError) throw passwordError

      setPasswords({ current: '', next: '', confirm: '' })
      setShowToast(true)
      window.setTimeout(() => setShowToast(false), 2500)
    } catch (err) {
      console.error('Password update error:', err)
      setError(err instanceof Error ? err.message : 'Failed to update your password.')
    } finally {
      setSaving(false)
    }
  }

  const sections = [
    { id: 'personal', label: 'Personal information' },
    { id: 'academic', label: 'Academic details' },
    { id: 'password', label: 'Password' },
    { id: 'notifications', label: 'Notification preferences' },
  ]

  if (loading) {
    return (
      <div className="px-6 lg:px-8 py-8 max-w-4xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 lg:px-8 py-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold text-foreground mb-8">Profile settings</h1>

      {error && (
        <Card className="p-4 mb-5 border-destructive/30 bg-destructive/5">
          <p className="text-sm text-destructive">{error}</p>
        </Card>
      )}

      <div className="grid lg:grid-cols-4 gap-6">
        <nav className="lg:col-span-1">
          <div className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`px-3 py-2 rounded-md text-sm font-medium text-left whitespace-nowrap transition-colors ${
                  activeSection === s.id
                    ? 'bg-primary-50 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="lg:col-span-3 flex flex-col gap-5">
          {activeSection === 'personal' && (
            <>
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Profile photo</h3>
                <div className="flex items-center gap-4">
                  <Avatar
                    src={avatarUrl ?? undefined}
                    alt={`${form.firstName} ${form.lastName}`.trim() || 'Profile'}
                    size="xl"
                    className="w-16 h-16"
                  />
                  <div>
                    <Button variant="outline" size="sm" disabled>Upload new photo</Button>
                    <p className="text-xs text-muted-foreground mt-1.5">JPG, PNG or GIF · Max 2MB</p>
                  </div>
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Personal information</h3>
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Input id="firstName" label="First name" value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
                    <Input id="lastName" label="Last name" value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
                  </div>
                  <Input id="email" type="email" label="Email address" value={form.email} onChange={(e) => set('email', e.target.value)} hint="Must be your university email" />
                  <Input id="phone" type="tel" label="Phone number" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5">Timezone</label>
                    <select value={form.timezone} onChange={(e) => set('timezone', e.target.value)} className="w-full border border-border rounded-md bg-white text-foreground text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                      {['America/New_York','America/Chicago','America/Denver','America/Los_Angeles','Europe/London','Europe/Paris','Asia/Tokyo','Asia/Kolkata','Australia/Sydney'].map((tz) => (
                        <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <Textarea id="bio" label="About me" value={form.bio} onChange={(e) => set('bio', e.target.value)} rows={4} hint="Share a bit about your learning goals" />
                </div>
                <div className="mt-5 pt-4 border-t border-border flex justify-end">
                  <Button loading={saving} onClick={handleSave}>Save changes</Button>
                </div>
              </Card>
            </>
          )}

          {activeSection === 'academic' && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Academic details</h3>
              <div className="flex flex-col gap-4">
                <Input id="university" label="University" value={form.university} onChange={(e) => set('university', e.target.value)} />
                <Input id="program" label="Program / degree" value={form.program} onChange={(e) => set('program', e.target.value)} />
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Year of study</label>
                  <select value={form.year} onChange={(e) => set('year', e.target.value)} className="w-full border border-border rounded-md bg-white text-foreground text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                    {['1st Year','2nd Year','3rd Year','4th Year','Postgraduate','PhD'].map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-border flex justify-end">
                <Button loading={saving} onClick={handleSave}>Save changes</Button>
              </div>
            </Card>
          )}

          {activeSection === 'password' && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Change password</h3>
              <div className="flex flex-col gap-4">
                <Input id="currentPassword" type="password" label="Current password" value={passwords.current} onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))} placeholder="Enter current password" />
                <Divider />
                <Input id="newPassword" type="password" label="New password" value={passwords.next} onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))} placeholder="At least 8 characters" hint="Use a mix of uppercase, lowercase, numbers, and symbols" />
                <Input id="confirmPassword" type="password" label="Confirm new password" value={passwords.confirm} onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))} placeholder="Repeat new password" error={passwords.confirm && passwords.next !== passwords.confirm ? "Passwords don't match" : undefined} />
              </div>
              <div className="mt-5 pt-4 border-t border-border flex justify-end">
                <Button loading={saving} onClick={handlePasswordUpdate}>Update password</Button>
              </div>
            </Card>
          )}

          {activeSection === 'notifications' && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Notification preferences</h3>
              <div className="flex flex-col gap-4">
                {[
                  { key: 'email' as const, label: 'Email notifications', desc: 'Receive booking confirmations and updates via email' },
                  { key: 'reminders' as const, label: 'Session reminders', desc: 'Get reminders 2 hours and 24 hours before each session' },
                  { key: 'marketing' as const, label: 'Product updates', desc: 'News about new features and platform improvements' },
                ].map(({ key, label, desc }) => (
                  <div key={key} className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                    </div>
                    <button onClick={() => setNotifPrefs((p) => ({ ...p, [key]: !p[key] }))} className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${notifPrefs[key] ? 'bg-primary' : 'bg-secondary'}`}>
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${notifPrefs[key] ? 'translate-x-5' : 'translate-x-1'}`} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-5 pt-4 border-t border-border flex justify-end">
                <Button loading={saving} onClick={handleSave}>Save preferences</Button>
              </div>
            </Card>
          )}

          {activeSection === 'personal' && (
            <Card className="p-5 border-destructive/20">
              <h3 className="text-sm font-semibold text-destructive mb-1">Danger zone</h3>
              <p className="text-xs text-muted-foreground mb-4">These actions are irreversible. Please be certain.</p>
              <Button variant="outline" size="sm" className="border-destructive text-destructive hover:bg-destructive/5">Delete account</Button>
            </Card>
          )}
        </div>
      </div>

      <Toast message="Changes saved successfully" type="success" visible={showToast} />
    </div>
  )
}
