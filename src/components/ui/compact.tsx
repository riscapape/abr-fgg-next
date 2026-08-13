import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/gpro/formulas'

// Dinheiro: compacto no mobile, completo no desktop.
// O tooltip (title) mostra o valor exato ao passar o mouse / segurar.
export function Money({ value, className }: { value: number; className?: string }) {
  const full = `$${formatNumber(value)}`

  return (
    <span className={cn('whitespace-nowrap', className)} title={full}>
      <span className="sm:hidden">{compactMoney(value)}</span>
      <span className="hidden sm:inline">{full}</span>
    </span>
  )
}

function compactMoney(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(2).replace('.', ',')}M`
  if (abs >= 1_000) return `$${Math.round(v / 1_000)}k`
  return `$${Math.round(v)}`
}

// Rótulo: curto no mobile, longo no desktop
export function L({ short, long }: { short: string; long: string }) {
  return (
    <>
      <span className="sm:hidden">{short}</span>
      <span className="hidden sm:inline">{long}</span>
    </>
  )
}