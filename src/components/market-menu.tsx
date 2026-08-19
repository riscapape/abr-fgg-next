'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export function MarketMenu() {
  const pathname = usePathname()
  const active = pathname.startsWith('/mercado')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'rounded-md px-3 py-2 text-sm font-medium outline-none transition-colors',
          active
            ? 'bg-muted text-foreground'
            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
        )}
      >
        Mercado
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-32">
        <DropdownMenuItem render={<Link href="/mercado" />}>Pilotos</DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/mercado-dt" />}>DTs</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}