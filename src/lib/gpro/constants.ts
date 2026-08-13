export const CAR_PARTS = [
  { key: 'chassis', label: 'Chassis' },
  { key: 'engine', label: 'Motor' },
  { key: 'front_wing', label: 'Asa Dianteira' },
  { key: 'rear_wing', label: 'Asa Traseira' },
  { key: 'underbody', label: 'Assoalho' },
  { key: 'sidepods', label: 'Laterais' },
  { key: 'radiator', label: 'Radiador' },
  { key: 'gearbox', label: 'Câmbio' },
  { key: 'brakes', label: 'Freios' },
  { key: 'suspension', label: 'Suspensão' },
  { key: 'electronics', label: 'Eletrônicos' }
] as const

export type CarPartKey = (typeof CAR_PARTS)[number]['key']

export const DRIVER_ATTRIBUTES = [
  { key: 'concentration', label: 'Concentração', min: 0, max: 250 },
  { key: 'talent', label: 'Talento', min: 0, max: 250 },
  { key: 'aggression', label: 'Agressividade', min: 0, max: 250 },
  { key: 'experience', label: 'Experiência', min: 0, max: 300 },
  { key: 'technical_knowledge', label: 'Conhecimento Técnico', min: 0, max: 250 },
  { key: 'endurance', label: 'Resistência', min: 0, max: 250 },
  { key: 'charisma', label: 'Carisma', min: 0, max: 250 },
  { key: 'motivation', label: 'Motivação', min: 0, max: 250 },
  { key: 'reputation', label: 'Reputação', min: 0, max: 250 },
  { key: 'weight_kg', label: 'Peso', min: 0, max: 110 },
  { key: 'age', label: 'Idade', min: 0, max: 40 }
] as const

export type DriverKey = (typeof DRIVER_ATTRIBUTES)[number]['key']

export const WEATHER_OPTIONS = [
  { value: 'seco', label: 'Seco' },
  { value: 'chuva', label: 'Chuva' }
] as const

export type Weather = (typeof WEATHER_OPTIONS)[number]['value']

export const RACE_TEMP_SLOTS = [
  { key: '00_30', label: 'Início - 0h30m' },
  { key: '30_60', label: '0h30m - 1h' },
  { key: '60_90', label: '1h - 1h30m' },
  { key: '90_120', label: '1h30m - 2h' }
] as const

// Limites de validação
export const LIMITS = {
  // Carro
  PART_LEVEL: { min: 1, max: 9 },   
  PART_WEAR: { min: 0, max: 100 },

  // Dados da corrida
  AIR_TEMP: { min: -50, max: 50, step: 0.1 },  
  CT_RISK: { min: 0, max: 100 },
  PIT_TIME: { min: 0, max: 60, step: 0.1 },
  RACE_TEMP: { min: -50, max: 50 },            

  // PHA
  PHA: { min: 0, max: 50 }
} as const

export const MAX_PART_LEVEL = 9    

// Fórmula oficial do Total do piloto
export function calculateDriverTotal(
  v: Partial<Record<DriverKey, number | null>>
): number | null {
  const required: DriverKey[] = [
    'concentration',
    'talent',
    'aggression',
    'experience',
    'technical_knowledge',
    'endurance',
    'charisma',
    'motivation',
    'weight_kg'
  ]

  for (const key of required) {
    if (v[key] == null || Number.isNaN(v[key])) return null
  }

  return (
    0.132 +
    0.166 * (v.concentration as number) +
    0.249 * (v.talent as number) +
    0.146 * (v.aggression as number) +
    0.0824 * (v.experience as number) +
    0.124 * (v.technical_knowledge as number) +
    0.147 * (v.endurance as number) +
    0.0829 * (v.charisma as number) +
    0.0828 * (v.motivation as number) -
    0.0827 * (v.weight_kg as number)
  )
}

// Função auxiliar para validar limites
export function validateRange(
  value: number,
  min: number,
  max: number,
  fieldName: string
): string | null {
  if (value < min) {
    return `${fieldName} não pode ser menor que ${min}`
  }
  if (value > max) {
    return `${fieldName} não pode ser maior que ${max}`
  }
  return null
}