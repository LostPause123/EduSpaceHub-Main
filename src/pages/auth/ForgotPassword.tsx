'use client'

import { useState } from 'react'
import type { Navigate } from '../../types'
import { Button, Input, MailIcon, CheckCircleIcon, ArrowLeftIcon } from '../../components/ui'
import { supabase } from '../../lib/supabase'

interface ForgotPasswordProps {
  navigate: Navigate
}

export default function ForgotPassword({ navigate }: ForgotPasswordProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const cleanEmail = email.trim()

    // 1. Validation: empty email
    if (!cleanEmail) {
      setError('Please enter your university email address.')
      return
    }

    // 2. Validation: email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(cleanEmail)) {
      setError('Please enter a valid email address.')
      return
    }

    setLoading(true)

    try {
      // 3. Supabase Auth resetPasswordForEmail
      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/reset-password`
          : 'http://localhost:3001/reset-password'

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo,
      })

      if (resetError) {
        console.error('Password reset request error:', resetError)
        if (resetError.status === 429) {
          setError('Too many requests. Please wait a moment before trying again.')
        } else {
          setError(resetError.message || 'Unable to send reset instructions. Please try again.')
        }
        return
      }

      // 4. Transition to "Check your email" view on success
      setSent(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.'
      console.error('Password reset unexpected error:', msg)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  function handleTryDifferentEmail() {
    setSent(false)
    setError(null)
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

        {!sent ? (
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
              <h1 className="text-2xl font-semibold text-foreground">Reset password</h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                Enter your university email and we&apos;ll send you instructions to reset your password.
              </p>
            </div>

            {/* Accessible Error Alert */}
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
                id="email"
                type="email"
                label="Email address"
                placeholder="alex.johnson@university.edu"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (error) setError(null)
                }}
                leftIcon={<MailIcon size={15} />}
                autoComplete="email"
                required
              />
              <Button type="submit" fullWidth size="lg" loading={loading} className="cursor-pointer">
                Send reset instructions
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
            <h2 className="text-xl font-semibold text-foreground mb-2">Check your email</h2>
            <p className="text-sm text-muted-foreground mb-1">
              We sent password reset instructions to
            </p>
            <p className="text-sm font-medium text-foreground mb-6">{email}</p>
            <p className="text-xs text-muted-foreground mb-8">
              Didn&apos;t receive it? Check your spam folder, or make sure you used your university email address.
            </p>
            <Button
              variant="outline"
              fullWidth
              onClick={handleTryDifferentEmail}
              className="cursor-pointer"
            >
              Try a different email
            </Button>
            <button
              type="button"
              onClick={() => navigate('login')}
              className="mt-4 text-sm text-primary font-medium hover:text-primary/80 transition-colors cursor-pointer"
            >
              Back to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
