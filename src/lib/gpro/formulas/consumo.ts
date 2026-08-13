import type { TrackFormula, CarFormula } from './types'

const FUEL_LEVELS = ['Muito Baixo', 'Baixo', 'Médio', 'Alto', 'Muito Alto'] as const
const COEF_SECO = 0.645
const COEF_PERDA = 0.00125

export interface ConsumptionParams {
  track: TrackFormula
  car: CarFormula
}

// Consumo seco por volta
export function dryConsumption(params: ConsumptionParams): number {
  const { track, car } = params
  const fuelIdx = FUEL_LEVELS.indexOf(track.fuel_consumption as any)

  return (
    COEF_SECO *
    1.05 ** fuelIdx *
    (1 + (car.engine_lvl * 1.8 + car.electronics_lvl * 1.2 - 15) * -0.0096)
  )
}

// Consumo na chuva
export function wetConsumption(params: ConsumptionParams): number {
  return dryConsumption(params) * params.track.rain_coef
}

// Combustível máximo necessário para a corrida
export function maxFuel(params: ConsumptionParams): number {
  return Math.ceil(
    Math.ceil((dryConsumption(params) * params.track.distance_km) / 8.0) * 8.0
  )
}

// Perda de tempo por combustível carregado
export function fuelTimeLoss(params: ConsumptionParams, pits: number): number {
  const { track } = params
  return (
    maxFuel(params) *
    COEF_PERDA *
    track.laps *
    track.lap_length_km *
    ((1.0 / (pits + 1.0)) * 2.0)
  )
}

// Perda de tempo por paradas no pit
export function pitsTimeLoss(track: TrackFormula, pitTime: number, pits: number): number {
  return (track.pit_lane_time + pitTime) * pits
}

// Estratégia com pneus supermacios
export function superSoftStrategy(
  params: ConsumptionParams,
  pitTime: number,
  numPits: number,
  maxPits: number
): number {
  return (
    fuelTimeLoss(params, numPits) -
    fuelTimeLoss(params, maxPits) +
    pitsTimeLoss(params.track, pitTime, numPits)
  )
}

// Estratégia com pneus macios
export function softStrategy(
  params: ConsumptionParams,
  pitTime: number,
  numPits: number,
  maxPits: number,
  compoundDiff: number
): number {
  return (
    superSoftStrategy(params, pitTime, numPits, maxPits) +
    compoundDiff * params.track.laps
  )
}

// Estratégia com pneus médios
export function mediumStrategy(
  params: ConsumptionParams,
  pitTime: number,
  numPits: number,
  maxPits: number,
  compoundDiff: number
): number {
  return (
    superSoftStrategy(params, pitTime, numPits, maxPits) +
    compoundDiff * params.track.laps * 2.0
  )
}

// Estratégia com pneus duros
export function hardStrategy(
  params: ConsumptionParams,
  pitTime: number,
  numPits: number,
  maxPits: number,
  compoundDiff: number
): number {
  return (
    superSoftStrategy(params, pitTime, numPits, maxPits) +
    compoundDiff * params.track.laps * 3.0
  )
}

// Estratégia com pneus de chuva
export function wetStrategy(
  params: ConsumptionParams,
  pitTime: number,
  numPits: number,
  maxPits: number,
  compoundDiff: number
): number {
  return (
    superSoftStrategy(params, pitTime, numPits, maxPits) +
    compoundDiff * params.track.laps * 999.0
  )
}