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
  { key: 'concentration', label: 'Concentração' },
  { key: 'talent', label: 'Talento' },
  { key: 'aggression', label: 'Agressividade' },
  { key: 'experience', label: 'Experiência' },
  { key: 'technical_knowledge', label: 'Conhecimento Técnico' },
  { key: 'endurance', label: 'Resistência' },
  { key: 'charisma', label: 'Carisma' },
  { key: 'motivation', label: 'Motivação' },
  { key: 'reputation', label: 'Reputação' },
  { key: 'weight_kg', label: 'Peso' },
  { key: 'age', label: 'Idade' }
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

export const MAX_PART_LEVEL = 100

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