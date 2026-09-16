import { useState } from 'react'
import type { Navigate } from '../../types'
import { Button, Input, MailIcon, CheckCircleIcon, ArrowLeftIcon } from '../../components/ui'

interface ForgotPasswordProps { navigate: Navigate }

export default function ForgotPassword({ navigate }: ForgotPasswordProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setSent(true)
    }, 900)
  }

  return (
    <div className="min-h-full bg-background flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                onClick={() => navigate('login')}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
              >
                <ArrowLeftIcon size={14} />
                Back to sign in
              </button>
              <h1 className="text-2xl font-semibold text-foreground">Reset password</h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                Enter your university email and we'll send you instructions to reset your password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                id="email"
                type="email"
                label="Email address"
                placeholder="alex.johnson@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<MailIcon size={15} />}
                required
              />
              <Button type="submit" fullWidth size="lg" loading={loading}>
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
              Didn't receive it? Check your spam folder, or make sure you used your university email address.
            </p>
            <Button
              variant="outline"
              fullWidth
              onClick={() => setSent(false)}
            >
              Try a different email
            </Button>
            <button
              onClick={() => navigate('login')}
              className="mt-4 text-sm text-primary font-medium hover:text-primary/80 transition-colors"
            >
              Back to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
