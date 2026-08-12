import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UserList } from '@/components/admin/user-list'
import { CreateUserForm } from '@/components/admin/create-user-form'
import { listUsers } from '@/lib/actions/admin'

export default async function AdminUsersPage() {
  const supabase = await createClient()

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Verifica se é owner
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'owner') {
    redirect('/dashboard')
  }

  // Busca todos os usuários
  const users = await listUsers()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Administração de Usuários</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie os managers cadastrados no sistema.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <CreateUserForm />
        </div>

        <div className="lg:col-span-2">
          <UserList users={users} />
        </div>
      </div>
    </div>
  )
}