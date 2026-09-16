import { useState } from 'react'
import type { Navigate } from '../../types'
import { Button, Input, EyeIcon, EyeOffIcon, MailIcon, LockIcon, UserIcon } from '../../components/ui'
import { supabase } from '../../lib/supabase'

interface RegisterProps { navigate: Navigate }

export default function Register({ navigate }: RegisterProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    university: '',
    program: '',
    year: '',
    password: '',
    confirmPassword: '',
  })

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleNext(e: React.FormEvent) {
    e.preventDefault()
    setStep(2)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (form.password !== form.confirmPassword) {
      setError("Passwords don't match.")
      return
    }

    setLoading(true)

    const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim()

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: {
          full_name: fullName,
          university: form.university,
          program: form.program,
          year: form.year,
          timezone: 'America/New_York',
          bio: '',
          phone: '',
        },
      },
    })

    if (signUpError) {
      setLoading(false)
      setError(signUpError.message)
      return
    }

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          full_name: fullName,
          email: form.email.trim(),
          role: 'student',
        }, { onConflict: 'id' })

      if (profileError) {
        setLoading(false)
        setError(profileError.message)
        return
      }
    }

    setLoading(false)

    if (data.session) {
      navigate('dashboard')
    } else {
      setError('Account created. Please check your email to confirm your account, then sign in.')
      setStep(1)
    }
  }

  return (
    <div className="min-h-full bg-background flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
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

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                  s < step ? 'bg-primary text-white' :
                  s === step ? 'bg-primary text-white' :
                  'bg-secondary text-muted-foreground'
                }`}>
                  {s < step ? '✓' : s}
                </div>
                <span className={`text-xs ${s === step ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                  {s === 1 ? 'Personal info' : 'Account setup'}
                </span>
                {s < 2 && <div className="w-12 h-px bg-border" />}
              </div>
            ))}
          </div>

          <h1 className="text-2xl font-semibold text-foreground">
            {step === 1 ? 'Create your account' : 'Set up your password'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {step === 1 ? 'Enter your details to get started' : 'Choose a secure password for your account'}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleNext} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                id="firstName"
                label="First name"
                placeholder="Alex"
                value={form.firstName}
                onChange={(e) => set('firstName', e.target.value)}
                required
              />
              <Input
                id="lastName"
                label="Last name"
                placeholder="Johnson"
                value={form.lastName}
                onChange={(e) => set('lastName', e.target.value)}
                required
              />
            </div>
            <Input
              id="email"
              type="email"
              label="University email"
              placeholder="alex.johnson@university.edu"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              leftIcon={<MailIcon size={15} />}
              hint="Use your official university email address"
              required
            />
            <Input
              id="university"
              label="University"
              placeholder="Westbridge University"
              value={form.university}
              onChange={(e) => set('university', e.target.value)}
              leftIcon={<UserIcon size={15} />}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                id="program"
                label="Program"
                placeholder="BSc Computer Science"
                value={form.program}
                onChange={(e) => set('program', e.target.value)}
                required
              />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="year" className="text-sm font-medium text-foreground">Year</label>
                <select
                  id="year"
                  value={form.year}
                  onChange={(e) => set('year', e.target.value)}
                  className="w-full border border-border rounded-md bg-white text-foreground text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                >
                  <option value="">Select</option>
                  {['1st Year', '2nd Year', '3rd Year', '4th Year', 'Postgraduate'].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <Button type="submit" fullWidth size="lg" className="mt-2">
              Continue
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              label="Password"
              placeholder="Create a strong password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              leftIcon={<LockIcon size={15} />}
              rightIcon={
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
                </button>
              }
              required
            />
            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              label="Confirm password"
              placeholder="Repeat your password"
              value={form.confirmPassword}
              onChange={(e) => set('confirmPassword', e.target.value)}
              leftIcon={<LockIcon size={15} />}
              error={form.confirmPassword && form.password !== form.confirmPassword ? "Passwords don't match" : undefined}
              required
            />

            <div className="flex items-start gap-2 mt-1">
              <input type="checkbox" id="terms" className="mt-0.5 accent-primary" required />
              <label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed">
                I agree to the{' '}
                <span className="text-primary hover:underline cursor-pointer">Terms of Service</span>
                {' '}and{' '}
                <span className="text-primary hover:underline cursor-pointer">Privacy Policy</span>
              </label>
            </div>

            <div className="flex gap-3 mt-2">
              <Button type="button" variant="outline" size="lg" onClick={() => setStep(1)} className="flex-1">
                Back
              </Button>
              <Button type="submit" size="lg" loading={loading} className="flex-1">
                Create account
              </Button>
            </div>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{' '}
          <button
            onClick={() => navigate('login')}
            className="text-primary font-medium hover:text-primary/80 transition-colors"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  )
}
