import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/login')

  const user = session.user as any
  // Students go to exam pages only
  // Allow admin/examiner to see admin layout; students also see it for now (dashboard shows their exams)

  return (
    <div className="flex min-h-screen bg-surface">
      <AdminSidebar role={user.role} name={user.name ?? user.email ?? ''} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
