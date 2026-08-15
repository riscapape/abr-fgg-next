'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import type { SessionProfile } from '@/types'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

function getInitials(name?: string | null, email?: string) {
  const base = name?.trim() || email?.trim() || 'U'
  const parts = base.split(' ')
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function UserMenu({ profile }: { profile: SessionProfile }) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.error(`Erro ao sair: ${error.message}`)
      return
    }
    toast.success('Você saiu da conta.')
    router.replace('/login')
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: 'ghost' }),
          'gap-3 px-2'
        )}
      >
        <Avatar className="h-9 w-9">
          <AvatarFallback>
            {getInitials(profile.fullName, profile.email)}
          </AvatarFallback>
        </Avatar>
        <span className="hidden text-sm font-medium md:block">
          {profile.fullName || profile.email}
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="text-sm font-medium">
              {profile.fullName || 'Usuário'}
            </div>
            <div className="text-xs font-normal text-muted-foreground">
              {profile.email}
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          {/* CORREÇÃO: Usando a prop 'render' do Base UI para o Next.js Link */}
          <DropdownMenuItem render={<Link href="/dashboard" />}>
            Dashboard
          </DropdownMenuItem>

         <DropdownMenuItem render={<Link href="/dados" />}>
            Dados
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/estrategias" />}>
  Estratégias
</DropdownMenuItem>
<DropdownMenuItem render={<Link href="/desgaste" />}>
  Desgaste
</DropdownMenuItem>
<DropdownMenuItem render={<Link href="/testes" />}>
  Testes
</DropdownMenuItem>
<DropdownMenuItem render={<Link href="/setup" />}>
  Setup
</DropdownMenuItem>
<DropdownMenuItem render={<Link href="/planejamento" />}>
  Planejamento
</DropdownMenuItem>
<DropdownMenuItem render={<Link href="/mercado" />}>
  Mercado
</DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/account/profile" />}>
            Minha conta
          </DropdownMenuItem>

         {profile.role === 'owner' && (
  <>
    <DropdownMenuItem render={<Link href="/admin/users" />}>
      Usuários
    </DropdownMenuItem>
    <DropdownMenuItem render={<Link href="/admin/seasons" />}>
      Temporadas
    </DropdownMenuItem>
  </>
)}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleSignOut}
          className="cursor-pointer text-red-600 focus:text-red-600"
        >
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}