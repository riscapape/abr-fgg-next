import Link from 'next/link'
import type { SessionProfile } from '@/types'
import { UserMenu } from '@/components/layout/user-menu'
import { AppNav } from '@/components/layout/app-nav'

export function AppHeader({ profile }: { profile: SessionProfile }) {
  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/dados', label: 'Dados' },
    { href: '/estrategias', label: 'Estratégias' },
    { href: '/desgaste', label: 'Desgaste' },
    { href: '/testes', label: 'Testes' },
    { href: '/qualys', label: 'Qualys' },
    { href: '/planejamento', label: 'Planejamento' },
    { href: '/telemetrias', label: 'Telemetrias' },
    { href: '#mercado', label: 'Mercado' }
  ]

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="text-base font-semibold">
          ABR-FGG
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          <AppNav links={links} />
        </div>

        <div className="flex items-center gap-2">
          <UserMenu profile={profile} links={links} />
        </div>
      </div>
    </header>
  )
}