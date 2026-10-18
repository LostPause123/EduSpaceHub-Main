'use client'

import { useEffect, useState } from 'react'
import type { Navigate } from '../../types'
import {
  SectionHeader,
  Card,
  Badge,
  Button,
  Input,
  Avatar,
  UserIcon,
  MailIcon,
  CheckIcon,
  AlertCircleIcon,
} from '../../components/ui'
import { supabase } from '../../lib/supabase'

interface ProfileProps {
  navigate?: Navigate
}

export default function Profile({ navigate }: ProfileProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [adminData, setAdminData] = useState({
    id: '',
    full_name: '',
    email: '',
    role: 'admin',
    avatar_url: '',
    created_at: '',
  })

  async function loadAdminProfile() {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('No authenticated user session found.')
        return
      }

      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (profErr) {
        throw new Error(profErr.message)
      }

      setAdminData({
        id: user.id,
        full_name: profile?.full_name || user.user_metadata?.full_name || 'Administrator',
        email: profile?.email || user.email || '',
        role: profile?.role || 'admin',
        avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url || '',
        created_at: profile?.created_at || user.created_at || new Date().toISOString(),
      })
    } catch (err: any) {
      console.error('Error loading admin profile:', err)
      setError(err.message || 'Failed to load profile details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAdminProfile()
  }, [])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSuccessMessage(null)
    setError(null)
    try {
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({
          full_name: adminData.full_name.trim(),
          avatar_url: adminData.avatar_url.trim(),
        })
        .eq('id', adminData.id)

      if (updateErr) {
        throw new Error(updateErr.message)
      }

      setSuccessMessage('Admin profile updated successfully!')
    } catch (err: any) {
      console.error('Error updating admin profile:', err)
      setError(err.message || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="h-8 w-40 bg-border/60 rounded animate-pulse" />
        <div className="h-64 bg-white border border-border rounded-xl animate-pulse p-6" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <SectionHeader
        title="Admin Profile Settings"
        subtitle="Manage your system administrator account details and preferences."
      />

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm flex items-center gap-2">
          <CheckIcon size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm flex items-center gap-2">
          <AlertCircleIcon size={18} />
          <span>{error}</span>
        </div>
      )}

      <Card className="p-6">
        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* Top Avatar Preview */}
          <div className="flex items-center gap-4 pb-6 border-b border-border">
            <Avatar src={adminData.avatar_url} alt={adminData.full_name} size="xl" />
            <div>
              <h3 className="text-lg font-bold text-foreground">{adminData.full_name}</h3>
              <p className="text-xs text-muted-foreground">{adminData.email}</p>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="destructive" className="uppercase text-[10px] font-bold">
                  System Administrator
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Input
              label="Account ID"
              value={adminData.id}
              disabled
              hint="Unique Supabase system user identifier"
            />

            <Input
              label="Email Address"
              value={adminData.email}
              disabled
              leftIcon={<MailIcon size={15} />}
              hint="Managed via Supabase Auth"
            />

            <Input
              label="Full Name"
              value={adminData.full_name}
              onChange={(e) => setAdminData({ ...adminData, full_name: e.target.value })}
              leftIcon={<UserIcon size={15} />}
              required
            />

            <Input
              label="Avatar Image URL"
              value={adminData.avatar_url}
              onChange={(e) => setAdminData({ ...adminData, avatar_url: e.target.value })}
              placeholder="https://images.unsplash.com/..."
              hint="Enter a valid direct image link for profile picture"
            />
          </div>

          <div className="pt-4 border-t border-border flex justify-end">
            <Button type="submit" loading={saving} size="md">
              Save Profile Changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
