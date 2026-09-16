import type { Metadata } from 'next'
import '../src/index.css'

export const metadata: Metadata = {
  title: 'EduSpace Tutoring Hub',
  description: 'AI-first University Tutoring and Mentorship Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-background text-foreground">
        {children}
      </body>
    </html>
  )
}
