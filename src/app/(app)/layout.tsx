import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppHeader } from '@/components/layout/app-header'
import type { SessionProfile } from '@/types'

export default async function AppLayout({
  children
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, is_active')
    .eq('id', user.id)
    .maybeSingle()

  // Verifica se o usuário está ativo
  if (profile?.is_active === false) {
    redirect('/login?error=disabled')
  }

  const sessionProfile: SessionProfile = {
    id: user.id,
    email: user.email ?? '',
    fullName: profile?.full_name ?? null,
    role: profile?.role ?? 'user'
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader profile={sessionProfile} />
      <main className="mx-auto w-full max-w-6xl p-4 md:p-6">{children}</main>
    </div>
  )
}