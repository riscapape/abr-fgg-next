'use client'

import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  calculateWings,
  calculateEngine,
  calculateBrakes,
  calculateGearbox,
  calculateSuspension,
  calculateWingSplit,
  calculateWingAdjustment,
  type CarFormula,
  type DriverFormula,
  type TrackFormula,
  type Weather
} from '@/lib/gpro/formulas'

// ===== Voltas de treino (race_data.practice_laps — jsonb coletado pela extensão) =====
type PracticeLap = {
  volta: number
  lapTime: number
  driverError: number
  netTime: number
  fw: number
  rw: number
  engine: number
  brakes: number
  gear: number
  susp: number
  tyreName: string
}

function parsePracticeLaps(raw: any): PracticeLap[] {
  if (!raw || typeof raw !== 'object') return []
  const laps: PracticeLap[] = []
  for (let i = 1; i <= 8; i++) {
    const l = (raw as any)[`lap_${i}`]
    if (!l) continue
    const net = Number(l.net_time ?? 0)
    const fw = Number(l.fw ?? 0)
    // campos zerados = volta não completada (ou ainda não feita)
    if (!net || !fw) continue
    laps.push({
      volta: i,
      lapTime: Number(l.lap_time ?? 0),
      driverError: Number(l.driver_error ?? 0),
      netTime: net,
      fw,
      rw: Number(l.rw ?? 0),
      engine: Number(l.engine ?? 0),
      brakes: Number(l.brakes ?? 0),
      gear: Number(l.gear ?? 0),
      susp: Number(l.susp ?? 0),
      tyreName: String(l.tyre_name ?? '')
    })
  }
  return laps
}

function splitTime(total: number) {
  const msTotal = Math.round(total * 1000)
  return {
    minutes: Math.floor(msTotal / 60000),
    seconds: Math.floor((msTotal % 60000) / 1000),
    milliseconds: msTotal % 1000
  }
}

function fmtTime(total: number) {
  if (!total || total <= 0) return '—'
  const { minutes, seconds, milliseconds } = splitTime(total)
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`
}

export function SetupPlanner({
  car,
  driver,
  track,
  q1Temp,
  q1Weather,
  q2Temp,
  q2Weather,
  raceTemp,
  raceWeather,
  practiceLaps
}: {
  car: CarFormula
  driver: DriverFormula
  track: TrackFormula
  q1Temp: number
  q1Weather: Weather
  q2Temp: number
  q2Weather: Weather
  raceTemp: number
  raceWeather: Weather
  practiceLaps?: any
}) {
  const [wingStr, setWingStr] = useState('0')
  const wing = useMemo(() => {
    const n = parseInt(wingStr, 10)
    return Number.isNaN(n) ? 0 : Math.min(499, Math.max(-499, n))
  }, [wingStr])

  // ----- Voltas completadas (do banco) -----
  const laps = useMemo(() => parsePracticeLaps(practiceLaps), [practiceLaps])

  // Dropdown 1..n ao lado de cada tentativa do ajuste de asas
  const [sel, setSel] = useState<string[]>(['', '', ''])
  const selectedLaps = sel.map(v => laps.find(l => String(l.volta) === v))

  const difIdeal = useMemo(() => {
    const [t1, t2, t3] = selectedLaps
    if (!t1 || !t2 || !t3) return 0
    const att = (l: PracticeLap) => ({
      frontWing: l.fw,
      rearWing: l.rw,
      ...splitTime(l.netTime)
    })
    const v = calculateWingAdjustment({
      attempt1: att(t1),
      attempt2: att(t2),
      attempt3: att(t3)
    })
    return Number.isFinite(v) ? v : 0
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, laps])

  // ----- Fórmula Analyzer -----
  const asasQ1 = calculateWings({ track, temperature: q1Temp, weather: q1Weather, driver, car })
  const analyzer = Math.round(calculateWingSplit(track, asasQ1, car, driver, q1Temp, q1Weather))

  // ----- Setups -----
  const mkSetup = (temperature: number, weather: Weather) => {
    const p = { track, temperature, weather, driver, car }
    return {
      asas: calculateWings(p),
      motor: calculateEngine(p),
      freios: calculateBrakes(p),
      cambio: calculateGearbox(p),
      suspensao: calculateSuspension(p)
    }
  }
  const setups = [
    { titulo: 'Setup Q1', temp: q1Temp, clima: q1Weather, s: mkSetup(q1Temp, q1Weather) },
    { titulo: 'Setup Q2', temp: q2Temp, clima: q2Weather, s: mkSetup(q2Temp, q2Weather) },
    { titulo: 'Setup Corrida', temp: raceTemp, clima: raceWeather, s: mkSetup(raceTemp, raceWeather) }
  ]

  return (
    <div className="space-y-6">
      {/* ===== Topo ===== */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <span className="text-sm font-medium">Pista</span>
          <div className="flex h-8 items-center rounded-md border bg-muted/30 px-3 text-sm">
            {track.name}
          </div>
        </div>
        <div className="space-y-1">
          <span className="text-sm font-medium">Divisão de Asas</span>
          <Input
            type="number"
            min={-499}
            max={499}
            className="h-8 w-20"
            value={wingStr}
            onChange={e => setWingStr(e.target.value)}
            onBlur={() => wingStr === '' && setWingStr('0')}
          />
        </div>
        <div className="space-y-1">
          <span className="text-sm font-medium">Fórmula Analyzer</span>
          <div className="flex h-8 items-center justify-center rounded-md border bg-muted/30 px-3 text-sm font-semibold">
            {analyzer}
          </div>
        </div>
        <div className="space-y-1">
          <span className="text-sm font-medium">Diferença ideal</span>
          <div className="flex h-8 items-center justify-center rounded-md border bg-muted/30 px-3 text-sm font-semibold">
            {Math.round(difIdeal)}
          </div>
        </div>
      </div>

      {/* ===== Setups Q1 / Q2 / Corrida ===== */}
      <div className="grid gap-6 lg:grid-cols-3">
        {setups.map(({ titulo, temp, clima, s }) => (
          <Card key={titulo}>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">{titulo}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-2 py-1 text-center">Temp.</th>
                    <th className="px-2 py-1 text-center">Clima</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="px-2 py-1 text-center">{temp}°C</td>
                    <td className="px-2 py-1 text-center">{clima}</td>
                  </tr>
                  <tr className="border-b bg-muted/50">
                    <th className="px-2 py-1 text-center">Peça</th>
                    <th className="px-2 py-1 text-center">Ajuste</th>
                  </tr>
                  <tr className="border-b">
                    <td className="px-2 py-1 text-center">Asa Diant.</td>
                    <td className="px-2 py-1 text-center">{s.asas + wing}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-2 py-1 text-center">Asa Tras.</td>
                    <td className="px-2 py-1 text-center">{s.asas - wing}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-2 py-1 text-center">Motor</td>
                    <td className="px-2 py-1 text-center">{s.motor}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-2 py-1 text-center">Freios</td>
                    <td className="px-2 py-1 text-center">{s.freios}</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-2 py-1 text-center">Câmbio</td>
                    <td className="px-2 py-1 text-center">{s.cambio}</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1 text-center">Suspensão</td>
                    <td className="px-2 py-1 text-center">{s.suspensao}</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ===== Indicação do ajuste de asas ===== */}          
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Indicação do ajuste de asas</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-2 py-1 text-center">Ajuste</th>
                  <th className="px-2 py-1 text-center">Diferença</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-2 py-1 text-center">Iguais</td>
                  <td className="px-2 py-1 text-center">0</td>
                </tr>
                <tr className="border-b">
                  <td className="px-2 py-1 text-center">1</td>
                  <td className="px-2 py-1 text-center">{track.setup_split}</td>
                </tr>
                <tr>
                  <td className="px-2 py-1 text-center">2</td>
                  <td className="px-2 py-1 text-center">{2 * track.setup_split}</td>
                </tr>
                <tr>
                  <td className="px-2 py-1 text-center font-semibold">Ideal</td>
                  <td className="px-2 py-1 text-center font-semibold">{Math.round(difIdeal)}</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
        {/* ===== Ajustes de Asas (dropdown 1..n por tentativa) ===== */}
        <Card className="lg:col-span-2">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Ajustes de Asas</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-2 py-1 text-center">Tentativa</th>
                    <th className="px-2 py-1 text-center">Volta de treino</th>
                    <th className="px-2 py-1 text-center">Asa D</th>
                    <th className="px-2 py-1 text-center">Asa T</th>
                    <th className="px-2 py-1 text-center">min</th>
                    <th className="px-2 py-1 text-center">seg</th>
                    <th className="px-2 py-1 text-center">mil</th>
                  </tr>
                </thead>
                <tbody>
                  {[0, 1, 2].map(i => {
                    const lap = selectedLaps[i]
                    const t = lap ? splitTime(lap.netTime) : null
                    return (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-2 py-1 text-center">{i + 1}</td>
                        <td className="px-2 py-1 text-center">
                          <select
                            className="h-7 w-20 rounded-md border border-input bg-background px-1 text-center"
                            value={sel[i]}
                            onChange={e =>
                              setSel(p => p.map((x, idx) => (idx === i ? e.target.value : x)))
                            }
                            disabled={laps.length === 0}
                          >
                            <option value="">—</option>
                            {laps.map(l => (
                              <option key={l.volta} value={String(l.volta)}>
                                {l.volta}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1 text-center">{lap?.fw ?? '—'}</td>
                        <td className="px-2 py-1 text-center">{lap?.rw ?? '—'}</td>
                        <td className="px-2 py-1 text-center">{t?.minutes ?? '—'}</td>
                        <td className="px-2 py-1 text-center">{t?.seconds ?? '—'}</td>
                        <td className="px-2 py-1 text-center">{t?.milliseconds ?? '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Escolha 3 voltas de treino coletadas pela extensão — Asa D/T e o tempo líquido
              entram sozinhos no cálculo da diferença ideal.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ===== Dados das voltas de treino (do banco) ===== */}
      {laps.length > 0 ? (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">
            Dados das voltas de treino ({laps.length}/8) — {track.name}
          </h2>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-2 py-1 text-center">Volta</th>
                  <th className="px-2 py-1 text-center">Tempo de volta</th>
                  <th className="px-2 py-1 text-center">Erro do piloto</th>
                  <th className="px-2 py-1 text-center">Tempo líquido</th>
                  <th className="px-2 py-1 text-center">AsaD</th>
                  <th className="px-2 py-1 text-center">AsaT</th>
                  <th className="px-2 py-1 text-center">Motor</th>
                  <th className="px-2 py-1 text-center">Freios</th>
                  <th className="px-2 py-1 text-center">Câmb</th>
                  <th className="px-2 py-1 text-center">Susp</th>
                  <th className="px-2 py-1 text-center">Pneus</th>
                </tr>
              </thead>
              <tbody>
                {laps.map(l => (
                  <tr key={l.volta} className="border-b last:border-0">
                    <td className="px-2 py-1 text-center">{l.volta}</td>
                    <td className="px-2 py-1 text-center">{fmtTime(l.lapTime)}</td>
                    <td className="px-2 py-1 text-center">
                      {l.driverError ? `${l.driverError.toFixed(3)}s` : '—'}
                    </td>
                    <td className="px-2 py-1 text-center font-semibold">{fmtTime(l.netTime)}</td>
                    <td className="px-2 py-1 text-center">{l.fw}</td>
                    <td className="px-2 py-1 text-center">{l.rw}</td>
                    <td className="px-2 py-1 text-center">{l.engine}</td>
                    <td className="px-2 py-1 text-center">{l.brakes}</td>
                    <td className="px-2 py-1 text-center">{l.gear}</td>
                    <td className="px-2 py-1 text-center">{l.susp}</td>
                    <td className="px-2 py-1 text-center">{l.tyreName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nenhuma volta de treino completada ainda — colete pela extensão na página
          Qualify.asp do GPRO.
        </p>
      )}
    </div>
  )
}