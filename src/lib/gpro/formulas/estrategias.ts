import { calculateCompound } from './composto'
import {
  superSoftStrategy,
  softStrategy,
  mediumStrategy,
  hardStrategy,
  wetStrategy,
  type ConsumptionParams
} from './consumo'
import {
  superSoftDurability,
  softDurability,
  mediumDurability,
  hardDurability,
  wetDurability,
  riskFactor,
  type DurabilityParams
} from './durabilidade'
import type { CarFormula, DriverFormula, TrackFormula, TireFormula } from './types'

export type TireCompound = 'supermacio' | 'macio' | 'medio' | 'duro' | 'chuva'

export const COMPOUNDS: TireCompound[] = [
  'supermacio',
  'macio',
  'medio',
  'duro',
  'chuva'
]

export const COMPOUND_LABELS: Record<TireCompound, string> = {
  supermacio: 'Supermacio',
  macio: 'Macio',
  medio: 'Médio',
  duro: 'Duro',
  chuva: 'Chuva'
}

export interface RaceStrategy {
  id: string
  tire: TireCompound
  pits: number
  name: string
  loss: number      // perda de tempo da estratégia (s)
  wear: number      // durabilidade do composto com o risco (km)
  maxKm: number     // km do stint mais longo
  valid: boolean    // completa a corrida?
  tireLeft: number  // sobra de pneu (0 a 1)
}

export interface StrategyParams {
  track: TrackFormula
  tire: TireFormula
  car: CarFormula
  driver: DriverFormula
  temperature: number
  risk: number
  pitTime: number
}

// Gera as 40 estratégias (5 compostos x 0-7 pits)
export function calculateStrategies(params: StrategyParams): RaceStrategy[] {
  const { track, tire, car, driver, temperature, risk, pitTime } = params

  const consumption: ConsumptionParams = { track, car }
  const durability: DurabilityParams = { track, tire, temperature, driver, car }
  const difCompostos = calculateCompound(track, temperature, tire)

  const wearByCompound: Record<TireCompound, number> = {
    supermacio: superSoftDurability(durability, risk),
    macio: softDurability(durability, risk),
    medio: mediumDurability(durability, risk),
    duro: hardDurability(durability, risk),
    chuva: wetDurability(durability, risk)
  }

  const strategies: RaceStrategy[] = []

  for (let pits = 0; pits <= 7; pits++) {
    const maxStintLaps = Math.ceil(track.laps / (pits + 1))
    const maxKm = maxStintLaps * track.lap_length_km

    const losses: Record<TireCompound, number> = {
      supermacio: superSoftStrategy(consumption, pitTime, pits, 7),
      macio: softStrategy(consumption, pitTime, pits, 7, difCompostos),
      medio: mediumStrategy(consumption, pitTime, pits, 7, difCompostos),
      duro: hardStrategy(consumption, pitTime, pits, 7, difCompostos),
      chuva: wetStrategy(consumption, pitTime, pits, 7, difCompostos)
    }

    for (const compound of COMPOUNDS) {
      const wear = wearByCompound[compound]

            strategies.push({
        id: `${compound}${pits}`,
        tire: compound,
        pits,
        name: `${COMPOUND_LABELS[compound]} - ${pits} pit${pits > 1 ? 's' : ''}`,
        // ⬇️ tempo ajustado ao risco CT com o coeficiente do composto:
        // perda * (coef ^ riscoCT)
        loss: losses[compound] * riskFactor(compound, risk),
        wear,
        maxKm,
        valid: wear - maxKm > track.lap_length_km,
        tireLeft: (wear - maxKm) / wear
      })
    }
  }

  return strategies
}

// Ranking: apenas estratégias válidas e fora de chuva, ordenadas por perda
export function bestStrategies(strategies: RaceStrategy[], limit = 10): RaceStrategy[] {
  return strategies
    .filter(s => s.valid && s.tire !== 'chuva')
    .sort((a, b) => a.loss - b.loss)
    .slice(0, limit)
}

// Distribui as voltas entre os stints (pits + 1 stints)
export function distributeStints(totalLaps: number, pits: number): number[] {
  const stintsCount = pits + 1
  const base = Math.floor(totalLaps / stintsCount)
  let rest = totalLaps % stintsCount

  const stints: number[] = []
  for (let i = 0; i < stintsCount; i++) {
    if (rest > 0) {
      stints.push(base + 1)
      rest--
    } else {
      stints.push(base)
    }
  }
  return stints
}

// Gera a lista de CTs: mín, máx e os múltiplos de 5 entre eles
// Ex.: min 3, max 31 -> [3, 5, 10, 15, 20, 25, 30, 31]
export function buildCtList(min: number, max: number): number[] {
  const lo = Math.min(min, max)
  const hi = Math.max(min, max)

  const set = new Set<number>()
  set.add(lo)
  set.add(hi)

  for (let v = Math.ceil(lo / 5) * 5; v <= hi; v += 5) {
    if (v > lo && v < hi) set.add(v)
  }

  return [...set].sort((a, b) => a - b)
}