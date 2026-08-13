import type { TrackFormula, CarFormula, DriverFormula, Weather } from './types'

// Calcula o valor ideal de wing/split para a pista
export function calculateWingSplit(
  track: TrackFormula,
  setupWing: number,
  car: CarFormula,
  driver: DriverFormula,
  temperature: number,
  weather: Weather
): number {
  const coefClima = weather === 'chuva' ? 58.8818967363256 : 0.0

  return (
    track.base_wing +
    driver.talent * -0.246534498671854 +
    (3.69107049712848 * (car.front_wing_lvl + car.rear_wing_lvl)) / 2 +
    setupWing * -0.189968386659174 +
    temperature * 0.376337780506523 +
    coefClima
  )
}