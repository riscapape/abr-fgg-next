'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  calculatePHA,
  calculatePartWear,
  calculatePartWearTest,
  replacePrice,
  downgradePart,
  formatNumber,
  type CarFormula,
  type DriverFormula,
  type TrackFormula,
  type PartSuffix,
  type CarPartKey
} from '@/lib/gpro/formulas'
import { cn } from '@/lib/utils'

const PARTS: { suffix: PartSuffix; key: CarPartKey; label: string }[] = [
  { suffix: 'Cha', key: 'chassis', label: 'Chassis' },
  { suffix: 'Mot', key: 'engine', label: 'Motor' },
  { suffix: 'Asd', key: 'front_wing', label: 'Asa Dianteira' },
  { suffix: 'Ast', key: 'rear_wing', label: 'Asa Traseira' },
  { suffix: 'Ass', key: 'underbody', label: 'Assoalho' },
  { suffix: 'Lat', key: 'sidepods', label: 'Laterais' },
  { suffix: 'Rad', key: 'radiator', label: 'Radiador' },
  { suffix: 'Cam', key: 'gearbox', label: 'Câmbio' },
  { suffix: 'Fre', key: 'brakes', label: 'Freios' },
  { suffix: 'Sus', key: 'suspension', label: 'Suspensão' },
  { suffix: 'Ele', key: 'electronics', label: 'Eletrônicos' }
]

type PartSim = { lvl: number; wear: number; acao: number }

function initSim(car: CarFormula): Record<PartSuffix, PartSim> {
  const base = {} as Record<PartSuffix, PartSim>
  for (const p of PARTS) {
    base[p.suffix] = {
      lvl: car[`${p.key}_lvl`],
      wear: car[`${p.key}_wear`],
      acao: 0
    }
  }
  return base
}

export function WearPlanner({
  car,
  driver,
  tracks,
  defaultTrackId,
  testTrack,
  phaTestes,
  defaultRisk
}: {
  car: CarFormula
  driver: DriverFormula
  tracks: TrackFormula[]
  defaultTrackId: string
  testTrack: TrackFormula | null
  phaTestes: { p: number; h: number; a: number }
  defaultRisk: number
}) {
  const [trackId, setTrackId] = useState(defaultTrackId)
  const track = useMemo(
    () => tracks.find(t => t.id === trackId) ?? tracks[0] ?? null,
    [tracks, trackId]
  )

  const [riskStr, setRiskStr] = useState(String(defaultRisk))
  const risk = useMemo(() => {
    const n = parseInt(riskStr, 10)
    return Number.isNaN(n) ? 0 : Math.min(100, Math.max(0, n))
  }, [riskStr])

  // 10 stints de teste (0–50 voltas cada)
  const [testLaps, setTestLaps] = useState<string[]>(Array(10).fill('0'))

  // Simulação do carro (nível/desgaste/ação por peça)
  const [sim, setSim] = useState<Record<PartSuffix, PartSim>>(() => initSim(car))

  const simCar = useMemo(() => {
    const c: CarFormula = { ...car }
    for (const p of PARTS) {
      c[`${p.key}_lvl`] = sim[p.suffix].lvl
      c[`${p.key}_wear`] = sim[p.suffix].wear
    }
    return c
  }, [car, sim])

  const phaCar = useMemo(() => calculatePHA(car), [car])
  const phaSim = useMemo(() => calculatePHA(simCar), [simCar])

  function updateTestLap(idx: number, value: string) {
    setTestLaps(prev =>
      prev.map((s, i) => {
        if (i !== idx) return s
        if (value === '') return ''
        const n = parseInt(value, 10)
        if (Number.isNaN(n)) return s
        return String(Math.min(50, Math.max(0, n)))
      })
    )
  }

  function handleTestLapBlur(idx: number) {
    setTestLaps(prev => prev.map((s, i) => (i === idx && s === '' ? '0' : s)))
  }

  function handleSelect(part: (typeof PARTS)[number], acao: number) {
    const carLvl = car[`${part.key}_lvl`]
    const carWear = car[`${part.key}_wear`]

    setSim(prev => {
      if (acao === 0) {
        return { ...prev, [part.suffix]: { lvl: carLvl, wear: carWear, acao: 0 } }
      }
      if (acao > 0) {
        return { ...prev, [part.suffix]: { lvl: acao, wear: 0, acao } }
      }
      const down = downgradePart(carLvl, acao, carWear)
      return {
        ...prev,
        [part.suffix]: { lvl: Math.abs(acao), wear: down?.newWear ?? 0, acao }
      }
    })
  }

  function reset() {
    setSim(initSim(car))
    setTestLaps(Array(10).fill('0'))
  }

  function optionsFor(part: (typeof PARTS)[number]) {
    const carLvl = car[`${part.key}_lvl`]
    const carWear = car[`${part.key}_wear`]
    const acoes = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5, -6, -7, -8]

    return acoes
      .filter(a => a <= carLvl + 1 && a > -carLvl)
      .map(a => {
        if (a === 0) return { value: 0, label: 'Não substituir' }
        if (a > 0) {
          const price = replacePrice(part.suffix, a)?.price ?? 0
          return {
            value: a,
            label: `Substituir pelo nível ${a} ($${formatNumber(price)})`
          }
        }
        const down = downgradePart(carLvl, a, carWear)
        return {
          value: a,
          label: `Rebaixar para o nível ${Math.abs(a)} (Desg: ${down?.newWear ?? 0}%)`
        }
      })
  }

  const parsedLaps = testLaps.map(s => {
    const n = parseInt(s, 10)
    return Number.isNaN(n) ? 0 : n
  })

  // ===== Linhas da tabela do carro =====
  const rows =
    track && testTrack
      ? PARTS.map(p => {
          const s = sim[p.suffix]

          // Desgaste da corrida (com o carro simulado e o risco atual)
          const pistaWear = calculatePartWear(track, driver, simCar, p.suffix, risk)

          // Desgaste por volta de teste (pista de testes, risco 67)
          const perLap = calculatePartWearTest(testTrack, driver, simCar, p.suffix)

          // Soma dos desgastes dos stints de teste
          const testeWear = parsedLaps.reduce(
            (acc, n) => acc + Math.ceil(perLap * n),
            0
          )

          const total = pistaWear + s.wear + testeWear

          const priceSimLvl = replacePrice(p.suffix, s.lvl)?.price ?? 0
          const gastoPeca =
            s.acao > 0 ? replacePrice(p.suffix, s.acao)?.price ?? 0 : 0
          const gastoDesgaste = Math.round(
            (priceSimLvl * ((total > 100 ? 100 : total) - s.wear)) / 100
          )

          return { ...p, s, pistaWear, testeWear, total, gastoPeca, gastoDesgaste }
        })
      : []

  const totalPecas = rows.reduce((a, r) => a + r.gastoPeca, 0)
  const totalDesgastes = rows.reduce((a, r) => a + r.gastoDesgaste, 0)

  const phaRows = (['p', 'h', 'a'] as const).map(k => {
    const current = Math.round(phaCar[k] + phaTestes[k])
    const simTotal = Math.round(phaSim[k] + phaTestes[k])
    return { k, current, diff: simTotal - current, simTotal }
  })

  if (!track || !testTrack) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma pista disponível. Configure a temporada no painel do owner.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {/* ===== Topo: pista, testes, risco e PHA ===== */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <span className="text-sm font-medium">Pista</span>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={trackId}
            onChange={e => setTrackId(e.target.value)}
          >
            {tracks.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <span className="text-sm font-medium">Pista de Testes</span>
          <div className="flex h-9 items-center rounded-md border bg-muted/30 px-3 text-sm">
            {testTrack.name}
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-sm font-medium">Risco CT</span>
          <Input
            type="number"
            min={0}
            max={100}
            className="h-9 w-full"
            value={riskStr}
            onChange={e => setRiskStr(e.target.value)}
            onBlur={() => riskStr === '' && setRiskStr('0')}
          />
        </div>

        <div className="rounded-md border">
          <table className="w-full text-sm">
            <tbody>
              {phaRows.map(r => (
                <tr key={r.k} className="border-b last:border-0">
                  <td className="px-3 py-1 font-semibold uppercase">{r.k}</td>
                  <td className="px-3 py-1 text-center">{r.current}</td>
                  <td
                    className={cn(
                      'px-3 py-1 text-center',
                      r.diff >= 0 ? 'text-green-600' : 'text-red-600'
                    )}
                  >
                    {r.diff}
                  </td>
                  <td
                    className={cn(
                      'px-3 py-1 text-center',
                      r.diff >= 0 ? 'text-green-600' : 'text-red-600'
                    )}
                  >
                    {r.simTotal}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== Stints e voltas de testes (acima da tabela do carro) ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stints e voltas de testes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  {[1, 2, 3, 4, 5].map(n => (
                    <th key={n} className="px-2 py-2 text-center">
                      {n}º stint
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  {testLaps.slice(0, 5).map((v, i) => (
                    <td key={i} className="px-2 py-1.5 text-center">
                      <Input
                        type="number"
                        min={0}
                        max={50}
                        className="mx-auto h-8 w-20 text-center"
                        value={v}
                        onChange={e => updateTestLap(i, e.target.value)}
                        onBlur={() => handleTestLapBlur(i)}
                      />
                    </td>
                  ))}
                </tr>
                <tr className="border-b bg-muted/50">
                  {[6, 7, 8, 9, 10].map(n => (
                    <th key={n} className="px-2 py-2 text-center">
                      {n}º stint
                    </th>
                  ))}
                </tr>
                <tr>
                  {testLaps.slice(5, 10).map((v, i) => (
                    <td key={i + 5} className="px-2 py-1.5 text-center">
                      <Input
                        type="number"
                        min={0}
                        max={50}
                        className="mx-auto h-8 w-20 text-center"
                        value={v}
                        onChange={e => updateTestLap(i + 5, e.target.value)}
                        onBlur={() => handleTestLapBlur(i + 5)}
                      />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <Button variant="secondary" onClick={reset}>
            Redefinir Valores
          </Button>
        </CardContent>
      </Card>

      {/* ===== Tabela do carro ===== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Carro</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-2 py-2 text-left">Peça</th>
                  <th className="px-2 py-2 text-center">Nível</th>
                  <th className="px-2 py-2 text-center">%</th>
                  <th className="px-2 py-2 text-left">Simulação da ação</th>
                  <th className="px-2 py-2 text-center">Pista</th>
                  <th className="px-2 py-2 text-center">Teste</th>
                  <th className="px-2 py-2 text-center">Total</th>
                  <th className="px-2 py-2 text-center">$ Peças</th>
                  <th className="px-2 py-2 text-center">$ Desgastes</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.suffix} className="border-b last:border-0">
                    <td className="px-2 py-1.5">{r.label}</td>
                    <td className="px-2 py-1.5 text-center">
                      {car[`${r.key}_lvl`]}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {car[`${r.key}_wear`]}%
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        className="h-8 w-full min-w-56 rounded-md border border-input bg-background px-2 text-sm"
                        value={r.s.acao}
                        onChange={e => handleSelect(r, parseInt(e.target.value))}
                      >
                        {optionsFor(r).map(o => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5 text-center">{r.pistaWear}%</td>
                    <td className="px-2 py-1.5 text-center">{r.testeWear}%</td>
                    <td
                      className={cn(
                        'px-2 py-1.5 text-center',
                        r.total >= 90 && 'font-semibold text-red-600'
                      )}
                    >
                      {r.total}%
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      ${formatNumber(r.gastoPeca)}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      ${formatNumber(r.gastoDesgaste)}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={7} className="px-2 py-2 text-right font-semibold">
                    Total
                  </td>
                  <td className="px-2 py-2 text-center">
                    ${formatNumber(totalPecas)}
                  </td>
                  <td className="px-2 py-2 text-center">
                    ${formatNumber(totalDesgastes)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}