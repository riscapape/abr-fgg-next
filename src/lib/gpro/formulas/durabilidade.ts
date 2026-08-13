import type {
  TrackFormula,
  TireFormula,
  DriverFormula,
  CarFormula
} from './types'

// Constantes para cada tipo de composto
const COEF_SUPERMACIO = 0.99816
const COEF_MACIO = 0.99709
const COEF_MEDIO = 0.99637
const COEF_DURO = 0.99585
const COEF_CHUVA = 0.99608

// Fator de progressão entre compostos
const COMPOUND_STEP = 1.354

export interface DurabilityParams {
  track: TrackFormula
  tire: TireFormula
  temperature: number
  driver: DriverFormula
  car: CarFormula
}

// Durabilidade base (composto supermacio, risco 0)
export function baseDurability(params: DurabilityParams): number {
  const { track, tire, temperature, driver, car } = params

  return (
    (100 / track.durability_coef) *
    tire.durability_coef *
    0.9885 ** temperature *
    1.00927 ** (car.suspension_lvl - 1) *
    1.00023 ** driver.experience *
    0.99985 ** driver.weight_kg *
    0.99967 ** driver.aggression
  )
}

// Durabilidade para cada tipo de composto e risco
export function superSoftDurability(params: DurabilityParams, risk: number): number {
  return baseDurability(params) * COEF_SUPERMACIO ** risk
}

export function softDurability(params: DurabilityParams, risk: number): number {
  return baseDurability(params) * COMPOUND_STEP * COEF_MACIO ** risk
}

export function mediumDurability(params: DurabilityParams, risk: number): number {
  return baseDurability(params) * COMPOUND_STEP ** 2 * COEF_MEDIO ** risk
}

export function hardDurability(params: DurabilityParams, risk: number): number {
  return baseDurability(params) * COMPOUND_STEP ** 3 * COEF_DURO ** risk
}

export function wetDurability(params: DurabilityParams, risk: number): number {
  return baseDurability(params) * COMPOUND_STEP ** 4 * COEF_CHUVA ** risk
}

// Retorna todas as durabilidades de uma vez
export function allDurabilities(params: DurabilityParams, risk: number) {
  return {
    base: baseDurability(params),
    superSoft: superSoftDurability(params, risk),
    soft: softDurability(params, risk),
    medium: mediumDurability(params, risk),
    hard: hardDurability(params, risk),
    wet: wetDurability(params, risk)
  }
}