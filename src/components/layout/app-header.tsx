import Link from 'next/link'
import { UserMenu } from '@/components/layout/user-menu'
import type { SessionProfile } from '@/types'

export function AppHeader({ profile }: { profile: SessionProfile }) {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-semibold">
            GPRO Manager
          </Link>

          <nav className="hidden items-center gap-4 text-sm md:flex">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
              Dashboard
            </Link>

            <Link href="/car" className="text-muted-foreground hover:text-foreground">
              Carro
            </Link>

            <Link href="/driver" className="text-muted-foreground hover:text-foreground">
              Piloto
            </Link>

            {profile.role === 'owner' && (
              <Link href="/admin/users" className="text-muted-foreground hover:text-foreground">
                Administração
              </Link>
            )}
          </nav>
        </div>

        <UserMenu profile={profile} />
      </div>
    </header>
  )
}