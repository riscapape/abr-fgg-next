'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MarketMenu } from '@/components/market-menu'
import { cn } from '@/lib/utils'

type NavItem = { href: string; label: string }

export function AppNav({ links }: { links: NavItem[] }) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap items-center gap-1">
      {links.map(l =>
        l.href === '#mercado' ? (
          <MarketMenu key="#mercado" />
        ) : (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              'rounded-md px-3 py-2 text-sm transition-colors',
              pathname === l.href
                ? 'bg-muted font-semibold text-foreground'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
          >
            {l.label}
          </Link>
        )
      )}
    </nav>
  )
}