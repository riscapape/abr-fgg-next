// Calcula as datas das corridas: terças e sextas
// sexta (5) -> terça (2): +4 dias | terça (2) -> sexta (5): +3 dias
export function computeRaceDates(startISO: string, totalRaces: number): Date[] {
  const current = new Date(`${startISO}T00:00:00`)
  if (Number.isNaN(current.getTime())) return []

  // Se a data inicial não for terça nem sexta, avança para o próximo dia de corrida
  while (current.getDay() !== 2 && current.getDay() !== 5) {
    current.setDate(current.getDate() + 1)
  }

  const dates: Date[] = []
  for (let i = 0; i < totalRaces; i++) {
    dates.push(new Date(current))
    current.setDate(current.getDate() + (current.getDay() === 5 ? 4 : 3))
  }
  return dates
}

// Converte Date para YYYY-MM-DD sem problemas de fuso horário
export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Ex.: "sex 14/08/2026"
export function formatRaceDate(d: Date): string {
  const weekday = d.toLocaleDateString('pt-BR', { weekday: 'short' })
  return `${weekday} ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
}