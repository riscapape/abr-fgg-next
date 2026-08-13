// Formata número com separador de milhar (padrão brasileiro)
// Ex: 1234567 -> "1.234.567"
export function formatNumber(num: number): string {
  return Math.round(num)
    .toString()
    .replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.')
}