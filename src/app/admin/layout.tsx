import { createSupabaseServerClient } from '@/lib/supabase/server'
import AdminLogoutButton from './logout-button'

const ADMIN_EMAILS = [
  'jeehoon0310@gmail.com',
  'frindlelab@gmail.com',
  'jihoon.park@dplanex.com',
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const isAdmin = user && ADMIN_EMAILS.includes(user.email ?? '')

  if (!isAdmin) {
    return <>{children}</>
  }

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="text-sm text-muted-foreground">{user.email}</span>
        <AdminLogoutButton />
      </div>
      {children}
    </div>
  )
}
