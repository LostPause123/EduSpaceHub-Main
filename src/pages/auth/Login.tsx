import { useState } from 'react'
import type { Navigate } from '../../types'
import { Button, Input, EyeIcon, EyeOffIcon, MailIcon, LockIcon, GraduationCapIcon } from '../../components/ui'
import { supabase } from '../../lib/supabase'

interface LoginProps { navigate: Navigate }

export default function Login({ navigate }: LoginProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setLoading(false)

    if (signInError) {
      setError(signInError.message)
      return
    }

    navigate('dashboard')
  }

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-[#FAFAF8] text-foreground overflow-hidden">
      {/* Subtle Mint/Green Background Decorative Circles */}
      <div
        className="pointer-events-none absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-36 -left-36 w-[420px] h-[420px] rounded-full bg-primary/8 blur-3xl"
        aria-hidden="true"
      />

      {/* Top Header */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-xs">
            <GraduationCapIcon size={18} />
          </div>
          <span className="font-semibold text-lg text-foreground tracking-tight">EduSpace</span>
        </div>

        {/* Need help? Contact us */}
        <div className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 font-medium">
          <span>Need help?</span>
          <button
            type="button"
            onClick={() => alert('For support, please email support@eduspace.edu')}
            className="text-primary hover:text-primary/80 hover:underline transition-colors cursor-pointer"
          >
            Contact us
          </button>
        </div>
      </header>

      {/* Main Center Content: Login Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-[420px]">
          {/* Card */}
          <div className="bg-white border border-border/80 rounded-2xl p-7 sm:p-9 shadow-[0_4px_24px_rgba(0,0,0,0.03)] backdrop-blur-xs">
            {/* Header with Graduation Cap Icon Badge */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center text-primary mb-3 shadow-xs">
                <GraduationCapIcon size={22} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">Sign in to your student account</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 rounded-lg border border-destructive/25 bg-destructive/5 px-3.5 py-2.5 text-xs text-destructive flex items-start gap-2">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                id="email"
                type="email"
                label="Email address"
                placeholder="alex.johnson@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<MailIcon size={15} />}
                autoComplete="email"
                required
              />

              <div>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  label="Password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  leftIcon={<LockIcon size={15} />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
                    </button>
                  }
                  autoComplete="current-password"
                  required
                />
                <div className="flex justify-end mt-1.5">
                  <button
                    type="button"
                    onClick={() => navigate('forgot-password')}
                    className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              <Button type="submit" fullWidth size="lg" loading={loading} className="mt-1 font-medium shadow-xs">
                Sign in
              </Button>
            </form>

            {/* Create Account Prompt */}
            <div className="mt-5 text-center">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate('register')}
                  className="text-primary font-semibold hover:underline transition-colors"
                >
                  Create account
                </button>
              </p>
            </div>

            {/* Divider */}
            <div className="my-5 flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider">or continue with</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Social Logins */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="flex items-center justify-center gap-2 px-3 py-2 border border-border rounded-lg text-xs sm:text-sm font-medium text-foreground bg-white hover:bg-secondary/60 active:bg-secondary transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 px-3 py-2 border border-border rounded-lg text-xs sm:text-sm font-medium text-foreground bg-white hover:bg-secondary/60 active:bg-secondary transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                </svg>
                University SSO
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Tagline */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 text-center">
        <p className="text-xs text-muted-foreground font-medium">
          &ldquo;Better learning. A brighter you.&rdquo; <span className="text-foreground/70 font-semibold">— EduSpace</span>
        </p>
      </footer>
    </div>
  )
}
