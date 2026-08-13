// Tipos para as fórmulas do GPRO

export type Weather = 'seco' | 'chuva'

export interface DriverFormula {
  concentration: number
  talent: number
  aggression: number
  experience: number
  technical_knowledge: number
  endurance: number
  charisma: number
  motivation: number
  reputation: number
  weight_kg: number
  age: number
}

export interface CarFormula {
  chassis_lvl: number
  chassis_wear: number
  engine_lvl: number
  engine_wear: number
  front_wing_lvl: number
  front_wing_wear: number
  rear_wing_lvl: number
  rear_wing_wear: number
  underbody_lvl: number
  underbody_wear: number
  sidepods_lvl: number
  sidepods_wear: number
  radiator_lvl: number
  radiator_wear: number
  gearbox_lvl: number
  gearbox_wear: number
  brakes_lvl: number
  brakes_wear: number
  suspension_lvl: number
  suspension_wear: number
  electronics_lvl: number
  electronics_wear: number
}

export interface TrackFormula {
  id: string
  name: string
  distance_km: number
  laps: number
  lap_length_km: number
  power_req: number
  handling_req: number
  acceleration_req: number
  downforce: string
  overtaking: string
  suspension_req: string
  grip: string
  fuel_consumption: string
  tire_wear: string
  pit_lane_time: number
  corners: number
  rain_coef: number
  durability_coef: number
  tire_coef: number
  setup_wing: number
  setup_engine: number
  setup_brakes: number
  setup_gear: number
  setup_suspension: number
  setup_split: number
  base_wing: number
  wear_chassis: number
  wear_engine: number
  wear_front_wing: number
  wear_rear_wing: number
  wear_underbody: number
  wear_sidepods: number
  wear_radiator: number
  wear_gearbox: number
  wear_brakes: number
  wear_suspension: number
  wear_electronics: number
}

export interface TireFormula {
  id: string
  name: string
  dry_grip: number
  wet_grip: number
  ideal_temp: number
  durability: number
  warmup: number
  price: number
  durability_coef: number
  temp_coef: number
}

// Sufixos usados nas fórmulas de desgaste
export type PartSuffix =
  | 'Cha'
  | 'Mot'
  | 'Asd'
  | 'Ast'
  | 'Ass'
  | 'Lat'
  | 'Rad'
  | 'Cam'
  | 'Fre'
  | 'Sus'
  | 'Ele'

// Mapeamento de sufixo para chave do banco
export const PART_SUFFIX_MAP: Record<
  PartSuffix,
  { lvl: keyof CarFormula; wear: keyof CarFormula; track: keyof TrackFormula }
> = {
  Cha: { lvl: 'chassis_lvl', wear: 'chassis_wear', track: 'wear_chassis' },
  Mot: { lvl: 'engine_lvl', wear: 'engine_wear', track: 'wear_engine' },
  Asd: {
    lvl: 'front_wing_lvl',
    wear: 'front_wing_wear',
    track: 'wear_front_wing'
  },
  Ast: {
    lvl: 'rear_wing_lvl',
    wear: 'rear_wing_wear',
    track: 'wear_rear_wing'
  },
  Ass: {
    lvl: 'underbody_lvl',
    wear: 'underbody_wear',
    track: 'wear_underbody'
  },
  Lat: { lvl: 'sidepods_lvl', wear: 'sidepods_wear', track: 'wear_sidepods' },
  Rad: { lvl: 'radiator_lvl', wear: 'radiator_wear', track: 'wear_radiator' },
  Cam: { lvl: 'gearbox_lvl', wear: 'gearbox_wear', track: 'wear_gearbox' },
  Fre: { lvl: 'brakes_lvl', wear: 'brakes_wear', track: 'wear_brakes' },
  Sus: {
    lvl: 'suspension_lvl',
    wear: 'suspension_wear',
    track: 'wear_suspension'
  },
  Ele: {
    lvl: 'electronics_lvl',
    wear: 'electronics_wear',
    track: 'wear_electronics'
  }
}