'use client'

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  calculateStrategies,
  buildCtList,
  distributeStints,
  COMPOUNDS,
  COMPOUND_LABELS,
  calculateCompound,
  baseDurability,
  durabilityAtRisk,
  dryConsumption,
  wetConsumption,
  type TireCompound,
  type TrackFormula,
  type TireFormula,
  type CarFormula,
  type DriverFormula
} from '@/lib/gpro/formulas'
import { cn } from '@/lib/utils'
import { L } from '@/components/ui/compact'

const TIRE_SHORT: Record<string, string> = {
  supermacio: 'Sup.',
  macio: 'Mac.',
  medio: 'Méd.',
  duro: 'Duro',
  chuva: 'Chuva'
}

const BOOST_OPTIONS = [
  { value: 0, label: '0' },
  { value: 2, label: '3' },
  { value: 4, label: '6' },
  { value: 6, label: '9' }
] as const

function tireLeftClass(v: number): string {
  if (v > 0.18) return 'bg-green-600 text-white'
  if (v > 0.08) return 'bg-yellow-600 text-white'
  return 'bg-red-600 text-white'
}

function parseNum(s: string): number | null {
  if (s.trim() === '') return null
  const n = parseFloat(s)
  return Number.isNaN(n) ? null : n
}

function clampStr(value: string, min: number, max: number): string {
  if (value === '' || value === '-') return value
  const n = parseFloat(value)
  if (Number.isNaN(n)) return value
  return String(Math.min(max, Math.max(min, n)))
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}

export function StrategyPlanner({
  track,
  tire,
  car,
  driver,
  initialTemperature,
  initialCtMin,
  initialCtMax,
  initialPitTime
}: {
  track: TrackFormula
  tire: TireFormula
  car: CarFormula
  driver: DriverFormula
  initialTemperature: number
  initialCtMin: number
  initialCtMax: number
  initialPitTime: number
}) {
  // ===== Campos editáveis (default = dados salvos) =====
  const [tempStr, setTempStr] = useState(String(initialTemperature))
  const [ctMinStr, setCtMinStr] = useState(String(initialCtMin))
  const [ctMaxStr, setCtMaxStr] = useState(String(initialCtMax))
  const [pitStr, setPitStr] = useState(String(initialPitTime))

  const temperature = parseNum(tempStr) ?? 0
  const ctMin = parseNum(ctMinStr) ?? 0
  const ctMax = parseNum(ctMaxStr) ?? 0
  const pitTime = parseNum(pitStr) ?? 0

  // Lista de CTs: mín, máx e múltiplos de 5 entre eles
  const ctList = useMemo(() => buildCtList(ctMin, ctMax), [ctMin, ctMax])

  // CT usado no planejador de stints
  const [selectedCt, setSelectedCt] = useState<number | null>(null)
  const effectiveCt =
    selectedCt != null && ctList.includes(selectedCt)
      ? selectedCt
      : ctList[0] ?? 0

    // ===== Estratégias calculadas para cada CT do intervalo =====
  const allByCt = useMemo(
    () =>
      ctList.map(ct => ({
        ct,
        all: calculateStrategies({
          track,
          tire,
          car,
          driver,
          temperature,
          risk: ct,
          pitTime
        })
      })),
    [ctList, track, tire, car, driver, temperature, pitTime]
  )

  // ===== As 10 melhores de TODOS os riscos juntos =====
  const combinedBest = useMemo(
    () =>
      allByCt
        .flatMap(({ ct, all }) => all.map(s => ({ ...s, ct })))
        .filter(s => s.valid && s.tire !== 'chuva')
        .sort((a, b) => a.loss - b.loss)
        .slice(0, 10),
    [allByCt]
  )

  const firstBest = useMemo(
    () =>
      (allByCt[0]?.all ?? [])
        .filter(s => s.valid && s.tire !== 'chuva')
        .sort((a, b) => a.loss - b.loss)[0],
    [allByCt]
  )

  const [pits, setPits] = useState<number | null>(null)
  const [compound, setCompound] = useState<TireCompound | null>(null)

  const effectivePits = pits ?? firstBest?.pits ?? 0
  const effectiveCompound = compound ?? firstBest?.tire ?? 'supermacio'

  const [stints, setStints] = useState<string[]>(() =>
    distributeStints(track.laps, firstBest?.pits ?? 0).map(String)
  )
  const [boosts, setBoosts] = useState<number[]>(Array(8).fill(0))

  function changePits(n: number) {
    setPits(n)
    setStints(distributeStints(track.laps, n).map(String))
  }

  function updateStint(idx: number, value: string) {
    setStints(prev =>
      prev.map((s, i) => {
        if (i !== idx) return s
        if (value === '') return ''
        const n = parseInt(value, 10)
        if (Number.isNaN(n)) return s
        return String(Math.min(99, n))
      })
    )
  }

  function handleStintBlur(idx: number) {
    setStints(prev =>
      prev.map((s, i) => {
        if (i !== idx) return s
        const n = parseInt(s, 10)
        return Number.isNaN(n) || n === 0 ? '1' : s
      })
    )
  }

  function updateBoost(idx: number, value: number) {
    setBoosts(prev => prev.map((b, i) => (i === idx ? value : b)))
  }

     function applyBest() {
    const best = combinedBest[0]
    if (!best) return

    setPits(best.pits)
    setCompound(best.tire)
    setSelectedCt(best.ct) // ⬅️ seta também o risco CT da melhor estratégia
    setStints(distributeStints(track.laps, best.pits).map(String))
  }

  // Estratégia selecionada no planejador, calculada com o CT escolhido
  const selected = useMemo(() => {
    const all = calculateStrategies({
      track,
      tire,
      car,
      driver,
      temperature,
      risk: effectiveCt,
      pitTime
    })
    return (
      all.find(s => s.tire === effectiveCompound && s.pits === effectivePits) ??
      null
    )
  }, [
    track,
    tire,
    car,
    driver,
    temperature,
    effectiveCt,
    pitTime,
    effectiveCompound,
    effectivePits
  ])

  const parsedStints = stints.map(s => {
    const n = parseInt(s, 10)
    return Number.isNaN(n) ? 0 : n
  })
  const totalLaps = parsedStints.reduce((a, b) => a + b, 0) || track.laps

  const difCompostos = calculateCompound(track, temperature, tire)
  const durabBase = baseDurability({ track, tire, temperature, driver, car })
  const consumption = { track, car }

  return (
    <div className="space-y-6">
      {/* ===== Topo: leitura + campos editáveis ===== */}
            <div className="flex flex-wrap items-end gap-3">
        <Info label="Pista" value={track.name} />
        <Info label="Pneu" value={tire.name} />

        <div className="space-y-1">
          <span className="text-sm font-medium">Temperatura</span>
          <Input
            type="number"
            min={-50}
            max={50}
            step={0.1}
            className="h-8 w-24"
            value={tempStr}
            onChange={e => setTempStr(e.target.value)}
            onBlur={() => tempStr === '' && setTempStr('0')}
          />
        </div>

        <div className="space-y-1">
          <span className="text-sm font-medium">Risco CT mín</span>
          <Input
            type="number"
            min={0}
            max={100}
            className="h-8 w-20"
            value={ctMinStr}
            onChange={e => setCtMinStr(e.target.value)}
            onBlur={() => ctMinStr === '' && setCtMinStr('0')}
          />
        </div>

        <div className="space-y-1">
          <span className="text-sm font-medium">Risco CT máx</span>
          <Input
            type="number"
            min={0}
            max={100}
            className="h-8 w-20"
            value={ctMaxStr}
            onChange={e => setCtMaxStr(e.target.value)}
            onBlur={() => ctMaxStr === '' && setCtMaxStr('0')}
          />
        </div>

        <div className="space-y-1">
          <span className="text-sm font-medium">Tempo do pit</span>
          <Input
            type="number"
            min={0}
            max={60}
            step={0.1}
            className="h-8 w-24"
            value={pitStr}
            onChange={e => setPitStr(e.target.value)}
            onBlur={() => pitStr === '' && setPitStr('0')}
          />
        </div>
      </div>

        <div className="grid gap-6 lg:grid-cols-2">
        {/* ===== Melhores estratégias (todos os riscos juntos) ===== */}

                {/* ===== Melhores estratégias (todos os riscos juntos) ===== */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Melhores estratégias</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-2 py-2 text-center">#</th>
                  <th className="px-2 py-2 text-left">Estratégia</th>
                  <th className="px-2 py-2 text-center"><L short="CT" long="Risco CT" /></th>
                  <th className="px-2 py-2 text-center">Tempo</th>
                  <th className="px-2 py-2 text-center">% Pneu</th>
                </tr>
              </thead>
              <tbody>
                {combinedBest.map((s, idx) => (
                  <tr key={`${s.id}-${s.ct}`} className="border-b last:border-0">
                    <td className="px-2 py-1.5 text-center">{idx + 1}</td>
                    <td className="px-2 py-1.5">
                    <L short={`${TIRE_SHORT[s.tire]} ${s.pits}p`} long={s.name} />
                  </td>
                    <td className="px-2 py-1.5 text-center">{s.ct}</td>
                    <td className="px-2 py-1.5 text-center">
                      {idx === 0
                        ? '0.0 s'
                        : `+ ${(s.loss - combinedBest[0].loss).toFixed(1)} s`}
                    </td>
                    <td
                      className={`px-2 py-1.5 text-center ${tireLeftClass(s.tireLeft)}`}
                    >
                      {(s.tireLeft * 100).toFixed(1)} %
                    </td>
                  </tr>
                ))}
                {combinedBest.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-2 py-4 text-center text-muted-foreground"
                    >
                      Nenhuma estratégia válida com os dados atuais.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* ===== Monte sua estratégia ===== */}
                <Card>
          <CardHeader>
            <CardTitle className="text-base">Monte sua estratégia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1">
                <span className="text-sm font-medium">CT</span>
                <select
                  className="h-9 w-20 rounded-md border border-input bg-background px-2 text-sm"
                  value={effectiveCt}
                  onChange={e => setSelectedCt(Number(e.target.value))}
                >
                  {ctList.map(ct => (
                    <option key={ct} value={ct}>
                      {ct}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-sm font-medium">Pits</span>
                <select
                  className="h-9 w-20 rounded-md border border-input bg-background px-2 text-sm"
                  value={effectivePits}
                  onChange={e => changePits(Number(e.target.value))}
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7].map(n => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-sm font-medium">Composto</span>
                <select
                  className="h-9 w-40 rounded-md border border-input bg-background px-2 text-sm"
                  value={effectiveCompound}
                  onChange={e => setCompound(e.target.value as TireCompound)}
                >
                  {COMPOUNDS.map(c => (
                    <option key={c} value={c}>
                      {COMPOUND_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>

              <Button variant="outline" onClick={applyBest}>
                Melhor estratégia
              </Button>
            </div>

            <p
              className={cn(
                'text-sm',
                totalLaps !== track.laps
                  ? 'font-medium text-amber-600'
                  : 'text-muted-foreground'
              )}
            >
              Total de Voltas: {totalLaps} de {track.laps}
            </p>

            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-2 py-2 text-center">Stint</th>
                    <th className="px-2 py-2 text-center">Voltas</th>
                    <th className="px-2 py-2 text-center">Seco</th>
                    <th className="px-2 py-2 text-center">Chuva</th>
                    <th className="px-2 py-2 text-center">Pneu</th>
                    <th className="px-2 py-2 text-center">Boosts</th>
                  </tr>
                </thead>
                <tbody>
                  {stints.map((stintStr, idx) => {
                    const laps = parseInt(stintStr, 10)
                    const stintLaps = Number.isNaN(laps) || laps === 0 ? 1 : laps
                    const boost = boosts[idx] ?? 0

                    const dry = Math.ceil(
                      dryConsumption(consumption) * track.lap_length_km * stintLaps +
                        boost
                    )
                    const wet = Math.ceil(
                      wetConsumption(consumption) * track.lap_length_km * stintLaps +
                        boost
                    )
                    const left = selected
                      ? (selected.wear - track.lap_length_km * stintLaps) /
                        selected.wear
                      : 0

                    return (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="px-2 py-1.5 text-center">{idx + 1}°</td>
                        <td className="px-2 py-1.5 text-center">
                          <Input
                            type="number"
                            min={1}
                            max={99}
                            className="mx-auto h-7 w-12 text-center sm:h-8 sm:w-20"
                            value={stintStr}
                            onChange={e => updateStint(idx, e.target.value)}
                            onBlur={() => handleStintBlur(idx)}
                          />
                        </td>
                        <td className="px-2 py-1.5 text-center">{dry} lts</td>
                        <td className="px-2 py-1.5 text-center">{wet} lts</td>
                        <td
                          className={`px-2 py-1.5 text-center ${tireLeftClass(left)}`}
                        >
                          {(left * 100).toFixed(1)} %
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <select
                            className="h-7 w-12 sm:h-8 sm:w-16"
                            value={boost}
                            onChange={e => updateBoost(idx, Number(e.target.value))}
                          >
                            {BOOST_OPTIONS.map(o => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
                      </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-md border text-center text-sm">
                <p className="border-b bg-muted/50 px-2 py-2 font-medium">
                  Diferença de Compostos
                </p>
                <p className="px-2 py-2">{difCompostos.toFixed(3)} s</p>
              </div>

               <div className="rounded-md border text-center text-sm">
                <p className="border-b bg-muted/50 px-2 py-2 font-medium">
                  Durabilidade XS CT 0
                </p>
                <p className="px-2 py-2">{durabBase.toFixed(3)} km</p>
                <p className="border-t bg-muted/30 px-2 py-2 text-xs text-muted-foreground">
                  No CT {effectiveCt}:{' '}
                  {durabilityAtRisk(durabBase, effectiveCt).toFixed(3)} km
                </p>
              </div>
            </div>

            {selected && !selected.valid && (
              <p className="text-sm text-red-600">
                Atenção: esta combinação não completa a corrida com o desgaste
                disponível no CT {effectiveCt}.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}