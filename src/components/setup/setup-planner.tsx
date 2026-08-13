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

// Lógica de clamp das asas (igual ao SetupTabela original)
function clampDisplay(
  asaD: number,
  asaT: number,
  wing: number,
  side: 'D' | 'T'
): number {
  if (side === 'D') {
    if (asaD > 999) return 999
    if (asaD < 0) return 0
    if (asaT <= 0) return 0 + 2 * wing
    if (asaT >= 999) return 999 + 2 * wing
    return asaD
  }
  if (asaT > 999) return 999
  if (asaT < 0) return 0
  if (asaD >= 999) return 999 - 2 * wing
  if (asaD <= 0) return 0 - 2 * wing
  return asaT
}

function SetupTabela({
  title,
  temperature,
  weather,
  track,
  car,
  driver,
  wing
}: {
  title: string
  temperature: number
  weather: Weather
  track: TrackFormula
  car: CarFormula
  driver: DriverFormula
  wing: number
}) {
  const params = { track, temperature, weather, driver, car }
  const asas = calculateWings(params)
  const asaD = clampDisplay(asas + wing, asas - wing, wing, 'D')
  const asaT = clampDisplay(asas + wing, asas - wing, wing, 'T')

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-2 py-2 text-center">Temp.</th>
              <th className="px-2 py-2 text-center">Clima</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="px-2 py-2 text-center">{temperature}°C</td>
              <td className="px-2 py-2 text-center">{weather}</td>
            </tr>
            <tr className="border-b bg-muted/50">
              <th className="px-2 py-2 text-center">Peça</th>
              <th className="px-2 py-2 text-center">Ajuste</th>
            </tr>
            <tr className="border-b">
              <td className="px-2 py-2 text-center">Asa Diant.</td>
              <td className="px-2 py-2 text-center">{asaD}</td>
            </tr>
            <tr className="border-b">
              <td className="px-2 py-2 text-center">Asa Tras.</td>
              <td className="px-2 py-2 text-center">{asaT}</td>
            </tr>
            <tr className="border-b">
              <td className="px-2 py-2 text-center">Motor</td>
              <td className="px-2 py-2 text-center">{calculateEngine(params)}</td>
            </tr>
            <tr className="border-b">
              <td className="px-2 py-2 text-center">Freios</td>
              <td className="px-2 py-2 text-center">{calculateBrakes(params)}</td>
            </tr>
            <tr className="border-b">
              <td className="px-2 py-2 text-center">Câmbio</td>
              <td className="px-2 py-2 text-center">{calculateGearbox(params)}</td>
            </tr>
            <tr>
              <td className="px-2 py-2 text-center">Suspensão</td>
              <td className="px-2 py-2 text-center">
                {calculateSuspension(params)}
              </td>
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

type AttemptRow = {
  asaD: string
  asaT: string
  min: string
  seg: string
  mil: string
}

const emptyRow = (): AttemptRow => ({
  asaD: '0',
  asaT: '0',
  min: '0',
  seg: '0',
  mil: '0'
})

export function SetupPlanner({
  car,
  driver,
  track,
  q1Temp,
  q1Weather,
  q2Temp,
  q2Weather,
  raceTemp,
  raceWeather
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
}) {
  // Divisão de Asas (-499 a 499)
  const [wingStr, setWingStr] = useState('0')
  const wing = useMemo(() => {
    const n = parseInt(wingStr, 10)
    return Number.isNaN(n) ? 0 : Math.min(499, Math.max(-499, n))
  }, [wingStr])

  // Tentativas de ajuste de asas (Iguais, 1, 2)
  const [rows, setRows] = useState<{
    iguais: AttemptRow
    a1: AttemptRow
    a2: AttemptRow
  }>({ iguais: emptyRow(), a1: emptyRow(), a2: emptyRow() })

  function updateRow(
    key: 'iguais' | 'a1' | 'a2',
    field: keyof AttemptRow,
    value: string
  ) {
    setRows(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }))
  }

  // Fórmula Analyzer: wingSplit com o setup de asas do Q1
  const asasQ1 = calculateWings({
    track,
    temperature: q1Temp,
    weather: q1Weather,
    driver,
    car
  })
  const analyzer = Math.round(
    calculateWingSplit(track, asasQ1, car, driver, q1Temp, q1Weather)
  )

  // Diferença ideal (fórmula das 3 tentativas)
  const difIdeal = useMemo(() => {
    const n = (s: string) => {
      const v = parseInt(s, 10)
      return Number.isNaN(v) ? 0 : v
    }
    return calculateWingAdjustment({
      attempt1: {
        frontWing: n(rows.iguais.asaD),
        rearWing: n(rows.iguais.asaT),
        minutes: n(rows.iguais.min),
        seconds: n(rows.iguais.seg),
        milliseconds: n(rows.iguais.mil)
      },
      attempt2: {
        frontWing: n(rows.a1.asaD),
        rearWing: n(rows.a1.asaT),
        minutes: n(rows.a1.min),
        seconds: n(rows.a1.seg),
        milliseconds: n(rows.a1.mil)
      },
      attempt3: {
        frontWing: n(rows.a2.asaD),
        rearWing: n(rows.a2.asaT),
        minutes: n(rows.a2.min),
        seconds: n(rows.a2.seg),
        milliseconds: n(rows.a2.mil)
      }
    })
  }, [rows])

  const toNum = (s: string) => {
    const v = parseInt(s, 10)
    return Number.isNaN(v) ? 0 : v
  }

  const attemptKeys: { key: 'iguais' | 'a1' | 'a2'; label: string }[] = [
    { key: 'iguais', label: 'Iguais' },
    { key: 'a1', label: '1' },
    { key: 'a2', label: '2' }
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
      </div>
      {/* ===== Setups Q1 / Q2 / Corrida ===== */}
      <div className="grid gap-6 lg:grid-cols-3">
        <SetupTabela
          title="Setup Q1"
          temperature={q1Temp}
          weather={q1Weather}
          track={track}
          car={car}
          driver={driver}
          wing={wing}
        />
        <SetupTabela
          title="Setup Q2"
          temperature={q2Temp}
          weather={q2Weather}
          track={track}
          car={car}
          driver={driver}
          wing={wing}
        />
        <SetupTabela
          title="Setup Corrida"
          temperature={raceTemp}
          weather={raceWeather}
          track={track}
          car={car}
          driver={driver}
          wing={wing}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ===== Indicação do ajuste de asas ===== */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">
                Indicação do ajuste de asas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-2 py-2 text-center">Ajuste</th>
                    <th className="px-2 py-2 text-center">Diferença</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="px-2 py-2 text-center">Iguais</td>
                    <td className="px-2 py-2 text-center">0</td>
                  </tr>
                  <tr className="border-b">
                    <td className="px-2 py-2 text-center">1</td>
                    <td className="px-2 py-2 text-center">{track.setup_split}</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-2 text-center">2</td>
                    <td className="px-2 py-2 text-center">
                      {2 * track.setup_split}
                    </td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Diferença ideal</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-2 py-2 text-center">Diferença de Asas</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-2 py-2 text-center">
                      {Math.round(difIdeal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* ===== Ajustes de Asas (tentativas) ===== */}
        <Card className="lg:col-span-2">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Ajustes de Asas</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-2 py-2" rowSpan={2}></th>
                    <th className="px-2 py-2 text-center" colSpan={2}>
                      Ajuste de Asas
                    </th>
                    <th className="px-2 py-2 text-center" colSpan={3}>
                      Tempo de Volta
                    </th>
                  </tr>
                  <tr className="border-b bg-muted/50">
                    <th className="px-2 py-2 text-center">Asa D</th>
                    <th className="px-2 py-2 text-center">Asa T</th>
                    <th className="px-2 py-2 text-center">min</th>
                    <th className="px-2 py-2 text-center">seg</th>
                    <th className="px-2 py-2 text-center">mil</th>
                  </tr>
                </thead>
                <tbody>
                  {attemptKeys.map(a => (
                    <tr key={a.key} className="border-b last:border-0">
                      <td className="px-2 py-1.5 text-center">{a.label}</td>
                      {(
                        ['asaD', 'asaT', 'min', 'seg', 'mil'] as (keyof AttemptRow)[]
                      ).map(field => (
                        <td key={field} className="px-2 py-1.5 text-center">
                          <Input
                            type="number"
                            className="h-7 w-12 sm:h-8 sm:w-20"
                            value={rows[a.key][field]}
                            onChange={e =>
                              updateRow(a.key, field, e.target.value)
                            }
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Faça 3 tentativas de asa (diferença entre Asa D e Asa T) com seus
              tempos de volta para calcular a diferença ideal.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}