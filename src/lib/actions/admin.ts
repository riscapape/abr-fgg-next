'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Cliente com SERVICE_ROLE_KEY (ignora RLS, uso administrativo)
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Verifica se o usuário logado é owner
async function requireOwner() {
  const supabase = await createServerClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Não autenticado')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'owner') {
    throw new Error('Acesso negado. Apenas owners podem acessar esta função.')
  }

  return user
}

// Lista todos os usuários
export async function listUsers() {
  await requireOwner()

  const admin = createAdminClient()

   const { data: profiles, error } = await admin
    .from('profiles')
    .select('id, full_name, role, is_active, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Erro ao listar usuários: ${error.message}`)
  }

  // Busca emails dos usuários (do auth.users)
  const { data: users, error: usersError } = await admin.auth.admin.listUsers()

  if (usersError) {
    throw new Error(`Erro ao listar usuários auth: ${usersError.message}`)
  }

  // Mescla profiles com emails
  const merged = profiles.map(profile => {
    const authUser = users.users.find(u => u.id === profile.id)
    return {
      ...profile,
      email: authUser?.email || 'Email não encontrado'
    }
  })

  return merged
}

// Cria novo usuário
export async function createUser(formData: FormData) {
  await requireOwner()

  const fullName = String(formData.get('full_name') || '').trim()
  const email = String(formData.get('email') || '').trim()
  const password = String(formData.get('password') || '').trim()

  if (!fullName || !email || !password) {
    throw new Error('Todos os campos são obrigatórios.')
  }

  if (password.length < 8) {
    throw new Error('A senha deve ter pelo menos 8 caracteres.')
  }

  const admin = createAdminClient()

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Confirma email automaticamente
    user_metadata: {
      full_name: fullName
    }
  })

  if (error) {
    throw new Error(`Erro ao criar usuário: ${error.message}`)
  }

  revalidatePath('/admin/users')
  return data
}

// Muda role de um usuário
export async function updateUserRole(userId: string, newRole: 'owner' | 'user') {
  const currentUser = await requireOwner()

  // Impede que o owner remova sua própria flag de owner
  if (currentUser.id === userId && newRole === 'user') {
    throw new Error('Você não pode remover sua própria permissão de owner.')
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId)

  if (error) {
    throw new Error(`Erro ao atualizar role: ${error.message}`)
  }

  revalidatePath('/admin/users')
}

// Reseta senha (envia email de recuperação)
export async function resetUserPassword(userId: string) {
  await requireOwner()

  const admin = createAdminClient()

  // Busca email do usuário
  const { data: user, error: userError } = await admin.auth.admin.getUserById(userId)

  if (userError || !user) {
    throw new Error('Usuário não encontrado.')
  }

  const { error } = await admin.auth.resetPasswordForEmail(user.user.email!, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?next=/update-password`
  })

  if (error) {
    throw new Error(`Erro ao enviar email de recuperação: ${error.message}`)
  }
}

// Deleta usuário
export async function deleteUser(userId: string) {
  const currentUser = await requireOwner()

  // Impede que o owner delete a si mesmo
  if (currentUser.id === userId) {
    throw new Error('Você não pode deletar sua própria conta.')
  }

  const admin = createAdminClient()

  const { error } = await admin.auth.admin.deleteUser(userId)

  if (error) {
    throw new Error(`Erro ao deletar usuário: ${error.message}`)
  }

  revalidatePath('/admin/users')
}

// Ativa ou desativa um usuário (preserva todos os dados para telemetria futura)
export async function setUserActive(userId: string, isActive: boolean) {
  const currentUser = await requireOwner()

  if (currentUser.id === userId) {
    throw new Error('Você não pode desativar sua própria conta.')
  }

  const admin = createAdminClient()

  const { error } = await admin
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', userId)

  if (error) {
    throw new Error(`Erro ao atualizar status: ${error.message}`)
  }

  if (isActive) {
    // Remove o banimento do Auth
    const { error: unbanError } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: 'none'
    })
    if (unbanError) {
      throw new Error(`Erro ao reativar login: ${unbanError.message}`)
    }
  } else {
    // Bane o login no nível do Auth (impede novos logins)
    const { error: banError } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: '876000h'
    })
    if (banError) {
      throw new Error(`Erro ao bloquear login: ${banError.message}`)
    }
  }

  revalidatePath('/admin/users')
}