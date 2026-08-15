'use client'

import { Fragment, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Money } from '@/components/ui/compact'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  calculatePartWear,
  replacePrice,
  downgradePart,
  formatNumber,
  type CarFormula,
  type DriverFormula,
  type TrackFormula,
  type PartSuffix,
} from '@/lib/gpro/formulas'
import type { CarPartKey } from '@/lib/gpro/constants'
import { cn } from '@/lib/utils'

const PARTS: { suffix: PartSuffix; key: CarPartKey; label: string; short: string }[] = [
  { suffix: 'Cha', key: 'chassis', label: 'Chassis', short: 'Chassis' },
  { suffix: 'Mot', key: 'engine', label: 'Motor', short: 'Motor' },
  { suffix: 'Asd', key: 'front_wing', label: 'Asa Dianteira', short: 'Asa D.' },
  { suffix: 'Ast', key: 'rear_wing', label: 'Asa Traseira', short: 'Asa T.' },
  { suffix: 'Ass', key: 'underbody', label: 'Assoalho', short: 'Assoalho' },
  { suffix: 'Lat', key: 'sidepods', label: 'Laterais', short: 'Laterais' },
  { suffix: 'Rad', key: 'radiator', label: 'Radiador', short: 'Radiador' },
  { suffix: 'Cam', key: 'gearbox', label: 'Câmbio', short: 'Câmbio' },
  { suffix: 'Fre', key: 'brakes', label: 'Freios', short: 'Freios' },
  { suffix: 'Sus', key: 'suspension', label: 'Suspensão', short: 'Susp.' },
  { suffix: 'Ele', key: 'electronics', label: 'Eletrônicos', short: 'Eletr.' }
]

const TEST_COST = 1_000_000

type RowState = { risk: string; test: string; actions: Record<string, number> }
type RaceInput = { race_number: number; race_date: string; track: TrackFormula }

const parse = (s: string) => {
  const n = parseInt(s, 10)
  return Number.isNaN(n) ? 0 : n
}

export function SeasonPlanner({
  userId,
  seasonId,
  car,
  driver,
  races,
  savedPlans
}: {
  userId: string
  seasonId: string
  car: CarFormula
  driver: DriverFormula
  races: RaceInput[]
  savedPlans: Record<number, any>
}) {
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

    const { todayISO, cutoffActive } = useMemo(() => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(new Date())
    const get = (t: string) => parts.find(p => p.type === t)?.value ?? '0'
    return {
      todayISO: `${get('year')}-${get('month')}-${get('day')}`,
      cutoffActive: parseInt(get('hour'), 10) >= 18
    }
  }, [])

  const [rows, setRows] = useState<Record<number, RowState>>(() => {
    const base = {} as Record<number, RowState>
    for (const race of races) {
      const saved = savedPlans[race.race_number]
      base[race.race_number] = {
        risk: String(saved?.risk ?? 0),
        test: String(saved?.test_laps ?? 0),
        actions: { ...(saved?.actions ?? {}) }
      }
    }
    return base
  })

  function update(raceNumber: number, patch: Partial<RowState>) {
    setDirty(true)
    setRows(prev => ({
      ...prev,
      [raceNumber]: { ...prev[raceNumber], ...patch }
    }))
  }

  function updateAction(raceNumber: number, suffix: string, value: number) {
    setDirty(true)
    setRows(prev => ({
      ...prev,
      [raceNumber]: {
        ...prev[raceNumber],
        actions: { ...prev[raceNumber].actions, [suffix]: value }
      }
    }))
  }

  // ===== Simulação encadeada (só corridas futuras; parte do carro atual) =====
    const results = useMemo(() => {
    const levels = {} as Record<PartSuffix, number>
    const wears = {} as Record<PartSuffix, number>
    for (const p of PARTS) {
      levels[p.suffix] = car[`${p.key}_lvl`]
      wears[p.suffix] = car[`${p.key}_wear`]
    }

    return races.map(race => {
            const past =
        race.race_date !== '' &&
        (cutoffActive ? race.race_date <= todayISO : race.race_date < todayISO)
      const row = rows[race.race_number]

      const pre = {} as Record<PartSuffix, { lvl: number; wear: number }>
      for (const p of PARTS) {
        pre[p.suffix] = { lvl: levels[p.suffix], wear: wears[p.suffix] }
      }

      const fim = {} as Record<PartSuffix, number>
      const critical = {} as Record<PartSuffix, boolean>
      let gastos = 0

      if (!past && row) {
        const risk = parse(row.risk)

        // aplica as ações
        const simCar = { ...car } as CarFormula
        for (const p of PARTS) {
          const a = row.actions[p.suffix] ?? 0
          if (a > 0) {
            levels[p.suffix] = a
            wears[p.suffix] = 0
            gastos += replacePrice(p.suffix, a)?.price ?? 0
          } else if (a < 0) {
            const down = downgradePart(pre[p.suffix].lvl, a, pre[p.suffix].wear)
            levels[p.suffix] = Math.abs(a)
            wears[p.suffix] = down?.newWear ?? 0
          }
          ;(simCar as any)[`${p.key}_lvl`] = levels[p.suffix]
          ;(simCar as any)[`${p.key}_wear`] = wears[p.suffix]
        }

        // desgaste da corrida (com as ações aplicadas) + crítico
        for (const p of PARTS) {
          const raceWear = calculatePartWear(race.track, driver, simCar, p.suffix, risk)
          wears[p.suffix] = Math.min(100, wears[p.suffix] + raceWear)
          fim[p.suffix] = wears[p.suffix]

          // crítico: se SEM a ação (mantendo peça no estado anterior), o Fim
          // passaria de 90% — significa que a substituição está segurando o 90
          const a = row.actions[p.suffix] ?? 0
          if (a > 0) {
            const carAntes = { ...car } as CarFormula
            ;(carAntes as any)[`${p.key}_lvl`] = pre[p.suffix].lvl
            ;(carAntes as any)[`${p.key}_wear`] = pre[p.suffix].wear
            const raceWearSemAcao = calculatePartWear(
              race.track,
              driver,
              carAntes,
              p.suffix,
              risk
            )
            const fimSemAcao = Math.min(
              100,
              pre[p.suffix].wear + raceWearSemAcao
            )
            critical[p.suffix] = fimSemAcao >= 90
          } else {
            critical[p.suffix] = false
          }
        }

        // regra do teste
        if (parse(row.test) > 0) gastos += TEST_COST
      }

      return { race_number: race.race_number, past, pre, fim, critical, gastos }
    })
  }, [races, rows, car, driver, todayISO])

  const totalGastos = results.reduce((a, r) => a + r.gastos, 0)

    function optionsFor(suffix: PartSuffix, pre: { lvl: number; wear: number }) {
    const acoes = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5, -6, -7, -8]
    return acoes
      .filter(a => a <= pre.lvl + 1 && a > -pre.lvl)
      .map(a => {
        if (a === 0) {
          return { value: 0, label: `= (${Math.round(pre.wear)}%)` }
        }
        if (a > 0) {
          return { value: a, label: `$ ${a} (0%)` }
        }
        const down = downgradePart(pre.lvl, a, pre.wear)
        return {
          value: a,
          label: `↓ ${Math.abs(a)} (${down?.newWear ?? 0}%)`
        }
      })
  }

  // ===== Salvar (1 upsert em lote) =====
  async function handleSave() {
    setSaving(true)
    const supabase = createClient()

    const payload = races.map(r => ({
      user_id: userId,
      season_id: seasonId,
      race_number: r.race_number,
      risk: parse(rows[r.race_number]?.risk ?? '0'),
      test_laps: parse(rows[r.race_number]?.test ?? '0'),
      actions: rows[r.race_number]?.actions ?? {}
    }))

    const { error } = await supabase
      .from('season_plan_races')
      .upsert(payload, { onConflict: 'user_id,season_id,race_number' })

    setSaving(false)

    if (error) {
      toast.error(`Erro ao salvar planejamento: ${error.message}`)
      return
    }

    setDirty(false)
    toast.success('Planejamento salvo com sucesso.')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar planejamento'}
        </Button>
        {dirty && (
          <span className="text-xs font-medium text-amber-600">
            • alterações não salvas
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-muted/50">
              <th rowSpan={2} className="px-1.5 py-1">Gastos</th>
              <th rowSpan={2} className="px-1.5 py-1">Corrida</th>
              <th rowSpan={2} className="px-1.5 py-1">Risco</th>
              <th rowSpan={2} className="px-1.5 py-1">Teste</th>
              {PARTS.map(p => (
                <th key={p.suffix} colSpan={2} className="border-l px-1.5 py-1">
                  {p.short}
                </th>
              ))}
            </tr>
                      <tr className="border-b bg-muted/50">
              {PARTS.map(p => (
                <Fragment key={p.suffix}>
                <th rowSpan={2} className="px-1.5 py-1">Ação</th>
                  <th className="px-1 py-1">Fim</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {races.map((race, i) => {
              const res = results[i]
              const row = rows[race.race_number]
              return (
                <tr
                  key={race.race_number}
                  className={cn('border-b last:border-0', res.past && 'opacity-50')}
                >
                  <td className="px-1.5 py-1 text-center">
                    {res.past ? '—' : <Money value={res.gastos} />}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap">
                    {race.track.name}
                  </td>
                  <td className="px-1 py-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      disabled={res.past}
                      className="h-7 w-12 rounded-md border border-input bg-background text-center"
                      value={row?.risk ?? '0'}
                      onChange={e => update(race.race_number, { risk: e.target.value })}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      type="number"
                      min={0}
                      max={50}
                      disabled={res.past}
                      className="h-7 w-12 rounded-md border border-input bg-background text-center"
                      value={row?.test ?? '0'}
                      onChange={e => update(race.race_number, { test: e.target.value })}
                    />
                  </td>
                    {PARTS.map(p => (
                    <Fragment key={p.suffix}>
                                              <td className="border-l px-1 py-1">
                        <select
                          disabled={res.past}
                          className={cn(
                            'h-7 w-20 rounded-md border border-input bg-background px-1',
                            !res.past &&
                              res.critical[p.suffix] &&
                              'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                          )}
                          value={row?.actions?.[p.suffix] ?? 0}
                          onChange={e =>
                            updateAction(
                              race.race_number,
                              p.suffix,
                              parseInt(e.target.value)
                            )
                          }
                        >
                          {optionsFor(p.suffix, res.pre[p.suffix]).map(o => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td
                        className={cn(
                          'px-1 py-1 text-center',
                          !res.past && res.fim[p.suffix] >= 90 && 'font-semibold text-red-600'
                        )}
                      >
                        {res.past ? '—' : `${res.fim[p.suffix] ?? 0}%`}
                      </td>
                    </Fragment>
                  ))}
                </tr>
              )
            })}
            <tr>
              <td className="px-1.5 py-1 text-center">
                <Money value={totalGastos} />
              </td>
              <td colSpan={3} className="px-1.5 py-1 text-right font-semibold">
                Total
              </td>
              <td colSpan={22} />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}