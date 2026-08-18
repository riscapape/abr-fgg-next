// Média das temperaturas da corrida até 1h30m
// (média dos pontos médios dos slots 00-30, 30-60 e 60-90)
export function avgUntil1h30(race: any): number | null {
  if (!race) return null
  const slots = ['00_30', '30_60', '60_90']
  const mids: number[] = []
  for (const s of slots) {
    const mn = Number(race[`race_temp_${s}_min`])
    const mx = Number(race[`race_temp_${s}_max`])
    if (Number.isFinite(mn) && Number.isFinite(mx) && (mn !== 0 || mx !== 0)) {
      mids.push((mn + mx) / 2)
    }
  }
  if (!mids.length) return null
  return mids.reduce((a, b) => a + b, 0) / mids.length
}