'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { buttonVariants } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  MoreVertical,
  Trash2,
  Key,
  UserCog,
  UserX,
  UserCheck
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  updateUserRole,
  resetUserPassword,
  deleteUser,
  setUserActive
} from '@/lib/actions/admin'

type User = {
  id: string
  full_name: string | null
  email: string
  role: 'owner' | 'user'
  is_active: boolean
  created_at: string
}

export function UserList({ users }: { users: User[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null)

  async function handleRoleChange(userId: string, newRole: 'owner' | 'user') {
    setLoadingId(userId)
    try {
      await updateUserRole(userId, newRole)
      toast.success(`Permissão atualizada para ${newRole}.`)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar permissão.')
    } finally {
      setLoadingId(null)
    }
  }

  async function handleResetPassword(userId: string) {
    setLoadingId(userId)
    try {
      await resetUserPassword(userId)
      toast.success('Email de recuperação enviado.')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao resetar senha.')
    } finally {
      setLoadingId(null)
    }
  }

  async function handleToggleActive(userId: string, isActive: boolean) {
    const action = isActive ? 'reativar' : 'desativar'

    if (
      !confirm(
        isActive
          ? 'Tem certeza que deseja reativar este usuário?'
          : 'Tem certeza que deseja desativar este usuário? O login será bloqueado, mas todos os dados (carro, piloto e histórico) serão mantidos.'
      )
    ) {
      return
    }

    setLoadingId(userId)
    try {
      await setUserActive(userId, isActive)
      toast.success(
        isActive ? 'Usuário reativado com sucesso.' : 'Usuário desativado.'
      )
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar status.')
    } finally {
      setLoadingId(null)
    }
  }

  async function handleDelete(userId: string) {
    if (
      !confirm(
        'ATENÇÃO: Deletar remove permanentemente o usuário e TODOS os dados dele (carro, piloto, corridas e telemetria). Para afastamento temporário, use "Desativar". Continuar?'
      )
    ) {
      return
    }

    setLoadingId(userId)
    try {
      await deleteUser(userId)
      toast.success('Usuário deletado com sucesso.')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao deletar usuário.')
    } finally {
      setLoadingId(null)
    }
  }

  if (users.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        Nenhum usuário cadastrado.
      </p>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Criado em</TableHead>
            <TableHead className="w-[70px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map(user => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">
                {user.full_name || 'Sem nome'}
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge variant={user.role === 'owner' ? 'default' : 'secondary'}>
                  {user.role}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={
                    user.is_active
                      ? 'border-green-500 text-green-600'
                      : 'border-red-500 text-red-600'
                  }
                >
                  {user.is_active ? 'Ativo' : 'Desativado'}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(user.created_at).toLocaleDateString('pt-BR')}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className={cn(
                      buttonVariants({ variant: 'ghost', size: 'icon' }),
                      'h-8 w-8'
                    )}
                    disabled={loadingId === user.id}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end">
                    <DropdownMenuGroup>
                      {user.role === 'user' ? (
                        <DropdownMenuItem
                          onClick={() => handleRoleChange(user.id, 'owner')}
                        >
                          <UserCog className="mr-2 h-4 w-4" />
                          Promover para Owner
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => handleRoleChange(user.id, 'user')}
                        >
                          <UserCog className="mr-2 h-4 w-4" />
                          Rebaixar para User
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuItem
                        onClick={() => handleResetPassword(user.id)}
                      >
                        <Key className="mr-2 h-4 w-4" />
                        Resetar Senha
                      </DropdownMenuItem>

                      {user.is_active ? (
                        <DropdownMenuItem
                          onClick={() => handleToggleActive(user.id, false)}
                        >
                          <UserX className="mr-2 h-4 w-4" />
                          Desativar Usuário
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => handleToggleActive(user.id, true)}
                        >
                          <UserCheck className="mr-2 h-4 w-4" />
                          Reativar Usuário
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuItem
                        onClick={() => handleDelete(user.id)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Deletar Usuário
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}