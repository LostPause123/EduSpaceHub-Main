'use client'

import { useState } from 'react'
import type { Navigate } from '../../types'
import {
  Button,
  Input,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
} from '../../components/ui'
import { supabase } from '../../lib/supabase'

interface ResetPasswordProps {
  navigate: Navigate
}

export default function ResetPassword({ navigate }: ResetPasswordProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    // 1. Validation: length requirement
    if (!password) {
      setError('Please enter a new password.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    // 2. Validation: match confirmation
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      // 3. Supabase updateUser password
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) {
        console.error('Update password error:', updateError)
        setError(updateError.message || 'Failed to update password. Please try again.')
        return
      }

      setSuccess(true)
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while resetting your password.'
      console.error('Unexpected password reset error:', msg)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-full bg-background flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          </div>
          <span className="font-semibold text-foreground tracking-tight">EduSpace</span>
        </div>

        {!success ? (
          <>
            <div className="mb-8">
              <button
                type="button"
                onClick={() => navigate('login')}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 cursor-pointer"
              >
                <ArrowLeftIcon size={14} />
                Back to sign in
              </button>
              <h1 className="text-2xl font-semibold text-foreground">Set new password</h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                Please enter a new password for your account. Must be at least 6 characters.
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div
                role="alert"
                aria-live="polite"
                className="mb-4 rounded-lg border border-destructive/25 bg-destructive/5 px-3.5 py-2.5 text-xs text-destructive flex items-start gap-2"
              >
                <svg
                  className="w-4 h-4 shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span className="leading-snug">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                label="New password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (error) setError(null)
                }}
                leftIcon={<LockIcon size={15} />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
                  </button>
                }
                autoComplete="new-password"
                required
              />

              <Input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                label="Confirm new password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  if (error) setError(null)
                }}
                leftIcon={<LockIcon size={15} />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1 cursor-pointer"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
                  </button>
                }
                autoComplete="new-password"
                required
              />

              <Button type="submit" fullWidth size="lg" loading={loading} className="mt-1 cursor-pointer">
                Reset password
              </Button>
            </form>
          </>
        ) : (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-5">
              <div className="text-primary">
                <CheckCircleIcon size={28} />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Password reset successful</h2>
            <p className="text-sm text-muted-foreground mb-8">
              Your password has been updated successfully. You can now sign in with your new credentials.
            </p>
            <Button
              fullWidth
              size="lg"
              onClick={() => navigate('login')}
              className="cursor-pointer font-medium"
            >
              Sign in to EduSpace
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
