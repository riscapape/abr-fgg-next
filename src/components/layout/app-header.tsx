import Link from 'next/link'
import { UserMenu } from '@/components/layout/user-menu'
import type { SessionProfile } from '@/types'

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
    { href: '/mercado', label: 'Mercado' },
    ...(profile.role === 'owner'
      ? [
          { href: '/admin/users', label: 'Usuários' },
          { href: '/admin/seasons', label: 'Temporadas' }
        ]
      : [])
  ]

  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="mx-auto flex h-12 w-full max-w-6xl items-center justify-between px-3 sm:h-14 sm:px-4">
        <Link
          href="/dashboard"
          className="whitespace-nowrap text-base font-semibold"
        >
          ABR-FGG
        </Link>

        {/* Nav desktop */}
        <nav className="hidden items-center gap-4 text-sm md:flex">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className="text-muted-foreground hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <UserMenu profile={profile} />
      </div>

      {/* Abas roláveis no mobile */}
      <nav className="flex gap-1 overflow-x-auto border-t px-2 py-1 md:hidden">
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className="whitespace-nowrap rounded-md px-2.5 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}