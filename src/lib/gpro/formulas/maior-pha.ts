import type { TrackFormula } from './types'

// Determina qual característica é mais exigida pela pista:
// P (Potência), H (Handling/Dirigibilidade) ou A (Aceleração)
export function getMajorPHA(track: TrackFormula): 'P' | 'H' | 'A' | null {
  const { power_req, handling_req, acceleration_req } = track

  if (
    power_req > handling_req &&
    power_req > acceleration_req
  ) {
    return 'P'
  }

  if (
    handling_req > power_req &&
    handling_req > acceleration_req
  ) {
    return 'H'
  }

  if (
    acceleration_req > power_req &&
    acceleration_req > handling_req
  ) {
    return 'A'
  }

  // Empate entre duas ou três
  return null
}