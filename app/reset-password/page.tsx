'use client'

import { useRouter } from 'next/navigation'
import ResetPassword from '@/pages/auth/ResetPassword'

export default function ResetPasswordPage() {
  const router = useRouter()
  return (
    <ResetPassword
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
