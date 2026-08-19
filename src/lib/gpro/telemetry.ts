// Port do TelemetryReportGenerator (GMT): completa os campos null do objeto coletado
export function round2(n: number) { return Math.round(n * 100) / 100 }

export function fmtLapTime(sec: number | null) {
  if (sec == null || Number.isNaN(sec)) return '—'
  const ms = Math.round(sec * 1000)
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const r = ms % 1000
  return `${m}:${String(s).padStart(2, '0')}.${String(r).padStart(3, '0')}`
}

export function fmtTotalTime(sec: number) {
  const s = Math.floor(sec)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
    : `${m}:${String(r).padStart(2, '0')}`
}

const TANK_LITERS = 180        // GMT: fuelLeft% * 1.8 = litros
const NO_BAD_FRACTION = 0.82   // GMT: km "noBad" ≈ 82% da vida total do pneu

export function computeTelemetry(data: any, lapLengthKm: number) {
  const race = data?.race ?? {}
  const laps: any[] = race.laps ?? []
  const stintsRaw: any[] = race.stints ?? []
  const pitStops: any[] = race.pit_stops ?? []
  const initialFuel = Number(race.fuel?.initial_fuel_liters ?? 0)

  // ===== Stints: distância, combustível e km de pneu (campos null do JSON) =====
  
    let prevFuel = initialFuel
  const stints = stintsRaw.map((st, i) => {
    // média de temperatura/umidade das voltas do stint (se a extensão não trouxe)
    const stintLaps = laps.filter(
      l => l.lap >= Number(st.laps_start) && l.lap <= Number(st.laps_end)
    )
    const avgOf = (key: string) => {
      const vals = stintLaps.map(l => Number(l[key])).filter(v => Number.isFinite(v))
      if (!vals.length) return null
      return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100
    }
    const isLast = i === stintsRaw.length - 1 || st.end_reason === 'Fim da corrida'
    const fuelLeft = isLast
      ? Number(st.final_fuel_liters ?? race.fuel?.final_fuel_liters ?? 0)
      : Number(st.fuel_remaining_percent_at_end ?? 0) * (TANK_LITERS / 100)
    const fuelUsed = Math.max(0, prevFuel - fuelLeft)
    const distanceKm = Number(st.lap_count ?? 0) * lapLengthKm
    const wearPct = Number(st.tyre_wear_percent ?? 0)
    const tyreTotalKm = wearPct > 0 ? distanceKm / (wearPct / 100) : 0

    
    const out = {
      ...st,
      temp_avg_c: st.temp_avg_c != null ? Number(st.temp_avg_c) : avgOf('temp_c'),
      humidity_avg_percent:
        st.humidity_avg_percent != null ? Number(st.humidity_avg_percent) : avgOf('humidity_percent'),
      distance_km: round2(distanceKm),
      fuel_used_liters: round2(fuelUsed),
      fuel_efficiency_km_per_liter: fuelUsed > 0 ? round2(distanceKm / fuelUsed) : 0,
      tyre_used_km: round2(distanceKm),
      tyre_total_km: round2(tyreTotalKm),
      tyre_no_bad_km: round2(tyreTotalKm * NO_BAD_FRACTION)
    }
    prevFuel = st.refuel_to_liters != null ? Number(st.refuel_to_liters) : fuelLeft
    return out
  })

  // ===== Totais da corrida =====
  const totalDistance = stints.reduce((a, s) => a + s.distance_km, 0)
  const totalFuel = stints.reduce((a, s) => a + s.fuel_used_liters, 0)
  const efficiency = totalFuel > 0 ? totalDistance / totalFuel : 0
  const timedLaps = laps.filter(l => l.time_seconds != null)
  const bestLap = timedLaps.reduce((b: any, l) => (!b || l.time_seconds < b.time_seconds ? l : b), null)
  const pitTime = pitStops.reduce((a, p) => a + Number(p.pit_time_seconds ?? 0), 0)
  const raceTime = timedLaps.reduce((a, l) => a + Number(l.time_seconds ?? 0), 0)

  // ===== Interpolação por volta (Comb% / Pneu%) igual ao generateLaps do GMT =====
  const lapFuel = efficiency > 0 ? lapLengthKm / efficiency : 0
  let fuel = initialFuel
  let si = 0
  let tyreLeft = stints[0]?.tyre_total_km ?? 0
  const lapsCalc = laps.map(l => {
    const st = stints[si]
    const fuel_percent = st ? Math.round((fuel * 100) / TANK_LITERS) : null
    const tyre_percent =
      st && st.tyre_total_km > 0 ? Math.max(0, Math.round((tyreLeft * 100) / st.tyre_total_km)) : null
    const row = { ...l, fuel_percent, tyre_percent }
    if (st) {
      if (l.lap === st.laps_end) {
        if (si + 1 < stints.length) {
          fuel = st.refuel_to_liters != null ? Number(st.refuel_to_liters) : fuel
          si++
          tyreLeft = stints[si].tyre_total_km
        }
      } else {
        fuel = Math.max(0, fuel - lapFuel)
        tyreLeft = Math.max(0, tyreLeft - lapLengthKm)
      }
    }
    return row
  })

  return {
    stints,
    laps: lapsCalc,
    totals: {
      distance_km: round2(totalDistance),
      fuel_used_liters: round2(totalFuel),
      fuel_efficiency: efficiency > 0 ? round2(efficiency) : 0,
      best_lap: bestLap,
      race_time_seconds: raceTime,
      pit_time_seconds: round2(pitTime),
      pit_stops: pitStops.length,
      positions_gained:
        Number(race.positions?.start_position ?? 0) - Number(race.positions?.finish_position ?? 0)
    }
  }
}

