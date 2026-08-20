// ===== Relógio da corrida: sempre horário de Brasília, troca às 17h do dia da corrida =====

// "Agora" com os campos de parede = horário de Brasília (sem converter fuso depois)
export function nowBrazil(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
}

// Parse de data "calendário" (YYYY-MM-DD) sem o deslocamento de UTC
export function parseDay(iso: string | Date): Date {
  if (iso instanceof Date) return new Date(iso.getFullYear(), iso.getMonth(), iso.getDate())
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

// Corte da corrida: 17h00 de Brasília no dia da corrida
export function raceCutoff(raceDay: Date): Date {
  const d = parseDay(raceDay)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 17, 0, 0, 0)
}

// A corrida já "virou"? (agora >= 17h do dia dela)
export function raceSwitched(raceDay: Date): boolean {
  return nowBrazil().getTime() >= raceCutoff(raceDay).getTime()
}

// Índice da corrida atual: a primeira cujo corte de 17h ainda não passou
export function pickCurrentRace(raceDays: Date[]): number {
  const now = nowBrazil().getTime()
  for (let i = 0; i < raceDays.length; i++) {
    if (now < raceCutoff(raceDays[i]).getTime()) return i
  }
  return raceDays.length - 1
}

// Rótulo amigável p/ o dashboard (Hoje / Amanhã / Em X dias)
export function raceDayLabel(raceDay: Date): string {
  const now = nowBrazil()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const day = parseDay(raceDay)
  const diff = Math.round((day.getTime() - today.getTime()) / 86400000)
  if (diff <= 0) return 'Hoje'
  if (diff === 1) return 'Amanhã'
  return `Em ${diff} dias`
}

// Data formatada p/ exibição (dd/mm) sempre em Brasília
export function fmtRaceDay(raceDay: Date): string {
  const d = parseDay(raceDay)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}