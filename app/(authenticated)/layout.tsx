import { createClient } from '@/utils/supabase/client'
import { redirect } from 'next/navigation'

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Add your navigation, sidebar, etc. here */}
      <main className="flex-1">{children}</main>
    </div>
  )
} 