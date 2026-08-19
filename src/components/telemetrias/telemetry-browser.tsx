'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { computeTelemetry, fmtLapTime, fmtTotalTime } from '@/lib/gpro/telemetry'

const CAR_PARTS: [string, string][] = [
  ['chassis', 'Chassi'], ['engine', 'Motor'], ['front_wing', 'Asa Diant.'],
  ['rear_wing', 'Asa Tras.'], ['underbody', 'Assoalho'], ['sidepods', 'Laterais'],
  ['radiator', 'Radiador'], ['gearbox', 'Câmbio'], ['brakes', 'Freios'],
  ['suspension', 'Suspensão'], ['electronics', 'Eletrônicos']
]

const DRIVER_ATTRS: [string, string][] = [
  ['total', 'Total'], ['concentration', 'Concentração'], ['talent', 'Talento'],
  ['aggression', 'Agressividade'], ['experience', 'Experiência'],
  ['technical_knowledge', 'Conhec. Técnico'], ['endurance', 'Resistência'],
  ['charisma', 'Carisma'], ['motivation', 'Motivação'], ['reputation', 'Reputação'],
  ['weight', 'Peso']
]

export function TelemetryBrowser({ rows, profiles, tracks }: {
  rows: any[]; profiles: any[]; tracks: any[]
}) {
  const [selIdx, setSelIdx] = useState(0)

  const profilesM = useMemo(() => {
    const m: Record<string, any> = {}
    for (const p of profiles) m[p.id] = p
    return m
  }, [profiles])
  const tracksM = useMemo(() => {
    const m: Record<string, any> = {}
    for (const t of tracks) m[t.name] = t
    return m
  }, [tracks])

  const name = (id: string) =>
    profilesM[id]?.full_name ?? profilesM[id]?.name ?? profilesM[id]?.email ?? 'Manager'

  const sel = rows[selIdx]
  const d = sel?.data ?? {}

  const calc = useMemo(() => {
    if (!sel) return null
    const lapLength = Number(
      tracksM[d?.meta?.track_name ?? sel.track_name]?.lap_length_km ?? 0
    )
    return computeTelemetry(d, lapLength)
  }, [sel, tracksM])

  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">Nenhuma telemetria coletada ainda.</p>
  }

  const t = calc?.totals

  return (
    <div className="space-y-6">
      {/* ===== Lista de todos os usuários ===== */}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-xs sm:text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-2 py-1">Manager</th>
              <th className="px-2 py-1">Corrida</th>
              <th className="px-2 py-1">Pista</th>
              <th className="px-2 py-1">Grupo</th>
              <th className="px-2 py-1 text-center">Largada</th>
              <th className="px-2 py-1 text-center">Chegada</th>
              <th className="px-2 py-1 text-center">Eff (km/l)</th>
              <th className="px-2 py-1 text-center">Coletada</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.id}
                onClick={() => setSelIdx(i)}
                className={cn(
                  'cursor-pointer border-b last:border-0 hover:bg-muted/40',
                  i === selIdx && 'bg-muted/60'
                )}
              >
                <td className="px-2 py-1 font-medium">{name(r.user_id)}</td>
                <td className="px-2 py-1">S{r.season}R{r.race_number}</td>
                <td className="px-2 py-1">{r.track_name ?? r.data?.meta?.track_name ?? '—'}</td>
                <td className="px-2 py-1">{r.group_name ?? r.data?.meta?.group_name ?? '—'}</td>
                <td className="px-2 py-1 text-center">{r.data?.race?.positions?.start_position ?? '—'}</td>
                <td className="px-2 py-1 text-center font-semibold">{r.data?.race?.positions?.finish_position ?? '—'}</td>
                                <td className="px-2 py-1 text-center">
                  {(() => {
                    const lapLen = Number(
                      tracksM[r.track_name ?? r.data?.meta?.track_name]?.lap_length_km ?? 0
                    )
                    return lapLen ? computeTelemetry(r.data, lapLen).totals.fuel_efficiency : '—'
                  })()}
                </td>
                                <td className="px-2 py-1 text-center text-muted-foreground">
                  {r.collected_at
                    ? new Date(r.collected_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sel && calc && (
        <div className="space-y-6">
          {/* ===== Resumo ===== */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">
                {name(sel.user_id)} — {d?.meta?.track_name} (S{sel.season}R{sel.race_number})
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 p-4 pt-0 text-xs sm:text-sm md:grid-cols-2">
              <div className="space-y-1">
                <p>Posições: <strong>{d?.race?.positions?.start_position}</strong> → <strong>{d?.race?.positions?.finish_position}</strong> ({t!.positions_gained >= 0 ? '+' : ''}{t!.positions_gained})</p>
                <p>Distância: <strong>{t!.distance_km} km</strong> • Melhor volta: <strong>{fmtLapTime(t!.best_lap?.time_seconds ?? null)}</strong></p>
                <p>Tempo de corrida: <strong>{fmtTotalTime(t!.race_time_seconds)}</strong> + pits <strong>{t!.pit_time_seconds}s</strong> ({t!.pit_stops} paradas)</p>
                <p>Energia: <strong>{d?.energy?.race?.before_percent}%</strong> → <strong>{d?.energy?.race?.after_percent}%</strong></p>
              </div>
              <div className="space-y-1">
                <p>Combustível: início <strong>{d?.race?.fuel?.initial_fuel_liters} l</strong>, fim <strong>{d?.race?.fuel?.final_fuel_liters} l</strong>, consumido <strong>{t!.fuel_used_liters} l</strong></p>
                <p>Eficiência: <strong>{t!.fuel_efficiency} km/l</strong></p>
                <p>Riscos: ult. <strong>{d?.risks?.values?.overtake}</strong>, def. <strong>{d?.risks?.values?.defend}</strong>, seco <strong>{d?.risks?.values?.clean_dry}</strong>, molhado <strong>{d?.risks?.values?.clean_wet}</strong>, defeito <strong>{d?.risks?.values?.failure}</strong></p>
                <p>Pneu: <strong>{d?.tyre_supplier?.name}</strong> (pico {d?.tyre_supplier?.peak_temp_c}°) • PHA carro: <strong>{d?.car_characteristic?.power}/{d?.car_characteristic?.handling}/{d?.car_characteristic?.acceleration}</strong></p>
              </div>
            </CardContent>
          </Card>

          {/* ===== Stints (com os cálculos que faltavam) ===== */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Stints ({calc.stints.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-2 py-1">Voltas</th>
                      <th className="px-2 py-1">Composto</th>
                      <th className="px-2 py-1">Motivo fim</th>
                      <th className="px-2 py-1 text-center">Dist. km</th>
                      <th className="px-2 py-1 text-center">Desgaste</th>
                      <th className="px-2 py-1 text-center">Temp</th>
                      <th className="px-2 py-1 text-center">Umi</th>
                      <th className="px-2 py-1 text-center">Comb. usado</th>
                      <th className="px-2 py-1 text-center">Eff km/l</th>
                      <th className="px-2 py-1 text-center">Pneu (usado/noBad/total)</th>
                      <th className="px-2 py-1 text-center">Reab.</th>
                      <th className="px-2 py-1 text-center">Pit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calc.stints.map((s: any) => (
                      <tr key={s.stint} className="border-b last:border-0">
                        <td className="px-2 py-1 text-center">{s.laps_start}–{s.laps_end}</td>
                        <td className="px-2 py-1">{s.compound}</td>
                        <td className="px-2 py-1">{s.end_reason}</td>
                        <td className="px-2 py-1 text-center">{s.distance_km}</td>
                        <td className="px-2 py-1 text-center">{s.tyre_wear_percent}%</td>
                        <td className="px-2 py-1 text-center">
                          {s.temp_avg_c != null ? `${s.temp_avg_c}°C` : '—'}
                        </td>
                        <td className="px-2 py-1 text-center">
                          {s.humidity_avg_percent != null ? `${s.humidity_avg_percent}%` : '—'}
                        </td>
                        <td className="px-2 py-1 text-center">{s.fuel_used_liters} l</td>
                        <td className="px-2 py-1 text-center">{s.fuel_efficiency_km_per_liter}</td>
                        <td className="px-2 py-1 text-center">
                          {s.tyre_used_km} / {s.tyre_no_bad_km} / {s.tyre_total_km} km
                        </td>
                        <td className="px-2 py-1 text-center">{s.refuel_to_liters != null ? `${s.refuel_to_liters} l` : '—'}</td>
                        <td className="px-2 py-1 text-center">{s.pit_time_seconds != null ? `${s.pit_time_seconds}s` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* ===== Carro (desgaste) ===== */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base">Carro — desgaste da corrida</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-2 py-1">Peça (nível)</th>
                      <th className="px-2 py-1 text-center">Início</th>
                      <th className="px-2 py-1 text-center">Fim</th>
                      <th className="px-2 py-1 text-center">Desgaste</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CAR_PARTS.map(([key, label]) => {
                      const start = Number(d?.car?.wear_start?.[key] ?? 0)
                      const end = Number(d?.car?.wear_end?.[key] ?? 0)
                      return (
                        <tr key={key} className="border-b last:border-0">
                          <td className="px-2 py-1">{label} {d?.car?.levels?.[key]}</td>
                          <td className="px-2 py-1 text-center">{start}%</td>
                          <td className="px-2 py-1 text-center">{end}%</td>
                          <td className={cn('px-2 py-1 text-center', end - start > 25 && 'font-semibold text-red-600')}>
                            {end < 99 ? `${end - start}%` : '*'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* ===== Piloto (antes + delta) ===== */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-base">Piloto — {d?.driver?.name}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-2 py-1">Atributo</th>
                      <th className="px-2 py-1 text-center">Antes</th>
                      <th className="px-2 py-1 text-center">Delta</th>
                      <th className="px-2 py-1 text-center">Depois</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DRIVER_ATTRS.map(([key, label]) => {
                      const before = Number(d?.driver?.before?.[key] ?? 0)
                      const delta = Number(d?.driver?.delta?.[key] ?? 0)
                      return (
                        <tr key={key} className="border-b last:border-0">
                          <td className="px-2 py-1">{label}</td>
                          <td className="px-2 py-1 text-center">{before}</td>
                          <td className={cn('px-2 py-1 text-center', delta > 0 && 'text-green-600', delta < 0 && 'text-red-600')}>
                            {delta !== 0 ? `${delta > 0 ? '+' : ''}${delta}` : '—'}
                          </td>
                          <td className="px-2 py-1 text-center font-semibold">{before + delta}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          {/* ===== Voltas (interpoladas como no GMT) ===== */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Voltas ({calc.laps.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="max-h-[560px] overflow-auto rounded-md border">
                <table className="w-full text-xs sm:text-sm">
                  <thead className="sticky top-0 bg-muted/95">
                    <tr>
                      <th className="px-2 py-1">#</th>
                      <th className="px-2 py-1">Tempo</th>
                      <th className="px-2 py-1 text-center">Pos</th>
                      <th className="px-2 py-1">Composto</th>
                      <th className="px-2 py-1">Clima</th>
                      <th className="px-2 py-1 text-center">Temp</th>
                      <th className="px-2 py-1 text-center">Umi</th>
                      <th className="px-2 py-1 text-center">Comb*</th>
                      <th className="px-2 py-1 text-center">Pneu*</th>
                      <th className="px-2 py-1">Eventos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calc.laps.map((l: any) => (
                      <tr key={l.lap} className="border-b last:border-0">
                        <td className="px-2 py-1 text-center">{l.lap}</td>
                        <td className="px-2 py-1 text-center">{fmtLapTime(l.time_seconds)}</td>
                        <td className="px-2 py-1 text-center">{l.position}</td>
                        <td className="px-2 py-1">{l.tyre}</td>
                        <td className="px-2 py-1">{l.weather}</td>
                        <td className="px-2 py-1 text-center">{l.temp_c}°C</td>
                        <td className="px-2 py-1 text-center">{l.humidity_percent}%</td>
                        <td className="px-2 py-1 text-center">{l.fuel_percent != null ? `${l.fuel_percent}%` : '—'}</td>
                        <td className="px-2 py-1 text-center">{l.tyre_percent != null ? `${l.tyre_percent}%` : '—'}</td>
                        <td className="px-2 py-1">{l.event ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                * Combustível e pneu por volta são interpolações (média aritmética), como no GMT —
                trocas de clima causam discrepâncias.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}