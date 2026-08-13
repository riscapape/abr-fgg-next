import type { TrackFormula, TireFormula } from './types'

// Calcula o coeficiente do composto do pneu para a pista
// considerando a temperatura e as características do pneu
export function calculateCompound(
  track: TrackFormula,
  temperature: number,
  tire: TireFormula
): number {
  return track.tire_coef * (50.0 - temperature) + tire.temp_coef
}