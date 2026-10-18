'use client'

import { useRouter } from 'next/navigation'
import ForgotPassword from '@/pages/auth/ForgotPassword'

export default function ForgotPasswordPage() {
  const router = useRouter()
  return (
    <ForgotPassword
      navigate={(target) => {
        if (typeof target === 'string') {
          router.push(target === 'login' ? '/' : `/${target}`)
        } else {
          router.push(target.page === 'login' ? '/' : `/${target.page}`)
        }
      }}
    />
  )
}
