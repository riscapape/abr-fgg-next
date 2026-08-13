import type {
  CarFormula,
  DriverFormula,
  TrackFormula,
  TireFormula
} from './formulas/types'

const n = (v: unknown) => Number(v ?? 0)

export function mapCar(row: any): CarFormula {
  return {
    chassis_lvl: n(row?.chassis_lvl),
    chassis_wear: n(row?.chassis_wear),
    engine_lvl: n(row?.engine_lvl),
    engine_wear: n(row?.engine_wear),
    front_wing_lvl: n(row?.front_wing_lvl),
    front_wing_wear: n(row?.front_wing_wear),
    rear_wing_lvl: n(row?.rear_wing_lvl),
    rear_wing_wear: n(row?.rear_wing_wear),
    underbody_lvl: n(row?.underbody_lvl),
    underbody_wear: n(row?.underbody_wear),
    sidepods_lvl: n(row?.sidepods_lvl),
    sidepods_wear: n(row?.sidepods_wear),
    radiator_lvl: n(row?.radiator_lvl),
    radiator_wear: n(row?.radiator_wear),
    gearbox_lvl: n(row?.gearbox_lvl),
    gearbox_wear: n(row?.gearbox_wear),
    brakes_lvl: n(row?.brakes_lvl),
    brakes_wear: n(row?.brakes_wear),
    suspension_lvl: n(row?.suspension_lvl),
    suspension_wear: n(row?.suspension_wear),
    electronics_lvl: n(row?.electronics_lvl),
    electronics_wear: n(row?.electronics_wear)
  }
}

export function mapDriver(row: any): DriverFormula {
  return {
    concentration: n(row?.concentration),
    talent: n(row?.talent),
    aggression: n(row?.aggression),
    experience: n(row?.experience),
    technical_knowledge: n(row?.technical_knowledge),
    endurance: n(row?.endurance),
    charisma: n(row?.charisma),
    motivation: n(row?.motivation),
    reputation: n(row?.reputation),
    weight_kg: n(row?.weight_kg),
    age: n(row?.age)
  }
}

export function mapTire(row: any): TireFormula {
  return {
    id: row?.id ?? '',
    name: row?.name ?? '',
    dry_grip: n(row?.dry_grip),
    wet_grip: n(row?.wet_grip),
    ideal_temp: n(row?.ideal_temp),
    durability: n(row?.durability),
    warmup: n(row?.warmup),
    price: n(row?.price),
    durability_coef: n(row?.durability_coef) || 1,
    temp_coef: n(row?.temp_coef)
  }
}

export function mapTrack(row: any): TrackFormula {
  return {
    id: row?.id ?? '',
    name: row?.name ?? '',
    distance_km: n(row?.distance_km),
    laps: n(row?.laps),
    lap_length_km: n(row?.lap_length_km),
    power_req: n(row?.power_req),
    handling_req: n(row?.handling_req),
    acceleration_req: n(row?.acceleration_req),
    downforce: row?.downforce ?? '',
    overtaking: row?.overtaking ?? '',
    suspension_req: row?.suspension_req ?? '',
    grip: row?.grip ?? '',
    fuel_consumption: row?.fuel_consumption ?? 'Médio',
    tire_wear: row?.tire_wear ?? '',
    pit_lane_time: n(row?.pit_lane_time),
    corners: n(row?.corners),
    rain_coef: n(row?.rain_coef),
    durability_coef: n(row?.durability_coef) || 1,
    tire_coef: n(row?.tire_coef),
    setup_wing: n(row?.setup_wing),
    setup_engine: n(row?.setup_engine),
    setup_brakes: n(row?.setup_brakes),
    setup_gear: n(row?.setup_gear),
    setup_suspension: n(row?.setup_suspension),
    setup_split: n(row?.setup_split),
    base_wing: n(row?.base_wing),
    wear_chassis: n(row?.wear_chassis),
    wear_engine: n(row?.wear_engine),
    wear_front_wing: n(row?.wear_front_wing),
    wear_rear_wing: n(row?.wear_rear_wing),
    wear_underbody: n(row?.wear_underbody),
    wear_sidepods: n(row?.wear_sidepods),
    wear_radiator: n(row?.wear_radiator),
    wear_gearbox: n(row?.wear_gearbox),
    wear_brakes: n(row?.wear_brakes),
    wear_suspension: n(row?.wear_suspension),
    wear_electronics: n(row?.wear_electronics)
  }
}