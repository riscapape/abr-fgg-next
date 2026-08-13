import type { CarFormula } from './types'

export interface PHAResult {
  p: number // Power
  h: number // Handling
  a: number // Acceleration
}

// Calcula PHA do carro baseado nos níveis das peças
export function calculatePHA(car: CarFormula): PHAResult {
  const p =
    0.8 * car.chassis_lvl +
    5.78 * car.engine_lvl +
    0.25 * car.front_wing_lvl +
    0.25 * car.rear_wing_lvl +
    0.2 * car.underbody_lvl +
    0.3 * car.sidepods_lvl +
    1.2 * car.radiator_lvl +
    3.2 * car.gearbox_lvl +
    0 * car.brakes_lvl +
    0 * car.suspension_lvl +
    1.4 * car.electronics_lvl

  const h =
    1.8 * car.chassis_lvl +
    0.6 * car.engine_lvl +
    2.4 * car.front_wing_lvl +
    2.4 * car.rear_wing_lvl +
    1.2 * car.underbody_lvl +
    0.7 * car.sidepods_lvl +
    0 * car.radiator_lvl +
    0.7 * car.gearbox_lvl +
    2.0 * car.brakes_lvl +
    1.6 * car.suspension_lvl +
    0 * car.electronics_lvl

  const a =
    1.4 * car.chassis_lvl +
    2.1 * car.engine_lvl +
    1.2 * car.front_wing_lvl +
    1.2 * car.rear_wing_lvl +
    0.5 * car.underbody_lvl +
    0 * car.sidepods_lvl +
    0.2 * car.radiator_lvl +
    4.1 * car.gearbox_lvl +
    0 * car.brakes_lvl +
    1.2 * car.suspension_lvl +
    1.4 * car.electronics_lvl

  return { p, h, a }
}