import type { DriverFormula } from './types'

// OA (Overall Ability) - mesmo cálculo que está na coluna gerada do banco
export function calculateOA(driver: DriverFormula): number {
  return (
    0.132 +
    0.166 * driver.concentration +
    0.249 * driver.talent +
    0.146 * driver.aggression +
    0.0824 * driver.experience +
    0.124 * driver.technical_knowledge +
    0.147 * driver.endurance +
    0.0829 * driver.charisma +
    0.0828 * driver.motivation -
    0.0827 * driver.weight_kg
  )
}

// OAGMT - Overall para GMT (outra métrica de avaliação)
export function calculateOAGMT(driver: DriverFormula): number {
  return (
    (8 * driver.concentration +
      12 * driver.talent +
      7 * driver.aggression +
      4 * driver.experience +
      6 * driver.technical_knowledge +
      7 * driver.endurance +
      4 * driver.charisma +
      4 * driver.motivation -
      4 * driver.weight_kg) /
    48
  )
}

// ZS - Zeta Score (relacionado ao potencial do piloto)
export function calculateZS(driver: DriverFormula): number {
  return (
    135.0107 -
    0.10172 * driver.experience -
    0.30014 * driver.technical_knowledge
  )
}