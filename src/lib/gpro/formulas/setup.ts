import type {
  TrackFormula,
  CarFormula,
  DriverFormula,
  Weather
} from './types'

export interface SetupParams {
  track: TrackFormula
  temperature: number
  weather: Weather
  driver: DriverFormula
  car: CarFormula
}

// Limita o setup entre 0 e 999
function clampSetup(value: number): number {
  return Math.max(0, Math.min(999, Math.round(value)))
}

// Setup das asas
export function calculateWings(params: SetupParams): number {
  const { track, temperature, weather, driver, car } = params
  const climaCoef = weather === 'chuva' ? 0.3 : 5.75
  const rainOffset = weather === 'chuva' ? 281.0 : 0.0

  return clampSetup(
    (track.setup_wing + temperature * climaCoef + rainOffset) *
      ((765 - driver.talent) / 765) +
      -10 * car.chassis_lvl +
      15 * car.front_wing_lvl +
      15 * car.rear_wing_lvl +
      -8 * car.underbody_lvl +
      (25 * car.chassis_wear) / 100 +
      (-28 * car.front_wing_wear) / 100 +
      (-28 * car.rear_wing_wear) / 100 +
      (15 * car.underbody_wear) / 100
  )
}

// Setup do motor
export function calculateEngine(params: SetupParams): number {
  const { track, temperature, weather, driver, car } = params
  const climaCoef = weather === 'chuva' ? 0.8 : -3.0
  const rainOffset = weather === 'chuva' ? -193.5 : 0.0

  return clampSetup(
    (track.setup_engine - -30.0 + temperature * climaCoef + rainOffset) *
      ((-605 - driver.experience) / -605) +
      -30.0 +
      0.3 * driver.aggression +
      16 * car.engine_lvl +
      5 * car.radiator_lvl +
      3 * car.electronics_lvl +
      (-50 * car.engine_wear) / 100 +
      (-7 * car.radiator_wear) / 100 +
      (-5 * car.electronics_wear) / 100
  )
}

// Setup dos freios
export function calculateBrakes(params: SetupParams): number {
  const { track, temperature, weather, driver, car } = params
  const climaCoef = weather === 'chuva' ? 4.0 : 6.0
  const rainOffset = weather === 'chuva' ? 105.5 : 0.0

  return clampSetup(
    track.setup_brakes +
      temperature * climaCoef +
      rainOffset +
      -0.5 * driver.talent +
      6 * car.chassis_lvl +
      -29 * car.brakes_lvl +
      6 * car.electronics_lvl +
      (-14 * car.chassis_wear) / 100 +
      (71 * car.brakes_wear) / 100 +
      (-9 * car.electronics_wear) / 100
  )
}

// Setup do câmbio
export function calculateGearbox(params: SetupParams): number {
  const { track, temperature, weather, driver, car } = params
  const climaCoef = weather === 'chuva' ? -8.0 : -4.0
  const rainOffset = weather === 'chuva' ? -4.5 : 0.0

  return clampSetup(
    track.setup_gear +
      temperature * climaCoef +
      rainOffset +
      0.5 * driver.concentration +
      -41 * car.gearbox_lvl +
      9 * car.electronics_lvl +
      (108 * car.gearbox_wear) / 100 +
      (-14 * car.electronics_wear) / 100
  )
}

// Setup da suspensão
export function calculateSuspension(params: SetupParams): number {
  const { track, temperature, weather, driver, car } = params
  const climaCoef = weather === 'chuva' ? -1.0 : -6.0
  const rainOffset =
    weather === 'chuva'
      ? driver.technical_knowledge * 0.11 + -258.0
      : 0.0

  return clampSetup(
    track.setup_suspension +
      temperature * climaCoef +
      rainOffset +
      0.75 * driver.experience +
      2.0 * driver.weight_kg +
      -14 * car.chassis_lvl +
      -12 * car.underbody_lvl +
      6 * car.sidepods_lvl +
      31 * car.suspension_lvl +
      (36 * car.chassis_wear) / 100 +
      (22 * car.underbody_wear) / 100 +
      (-11 * car.sidepods_wear) / 100 +
      (-69 * car.suspension_wear) / 100
  )
}

// Setup completo do carro
export function fullSetup(params: SetupParams) {
  return {
    wing: calculateWings(params),
    engine: calculateEngine(params),
    brakes: calculateBrakes(params),
    gearbox: calculateGearbox(params),
    suspension: calculateSuspension(params)
  }
}