import { createClient } from '@/utils/supabase/client'
import { redirect } from 'next/navigation'
import { Metadata } from 'next'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'GoalSpace - Dashboard',
  description: 'Access your personalized learning spaces and track your progress.',
}

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  // Handle authentication errors
  if (error) {
    console.error('Authentication error:', error.message)
    redirect('/auth?error=session_expired')
  }

  // Redirect to login if no user
  if (!user) {
    redirect('/auth')
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Suspense fallback={<div className="flex h-screen w-full items-center justify-center">Loading...</div>}>
        <main className="flex-1">{children}</main>
      </Suspense>
    </div>
  )
}