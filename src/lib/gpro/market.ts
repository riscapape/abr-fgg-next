export const MARKET_COLUMNS = [
  'id', 'name', 'nationality', 'age', 'weight_kg', 'salary', 'sign_fee', 'offers',
  'reputation', 'concentration', 'talent', 'aggression', 'experience',
  'technical_knowledge', 'endurance', 'charisma', 'motivation', 'total'
] as const

export type MarketDriver = {
  [key: string]: any
}

export interface MarketData { updated_at: string; drivers: MarketDriver[] }

const LS_KEY = 'abr_market_v1'

const normKey = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')

// Mapeamento das chaves do GPRO para os nossos campos
const KEY_MAP: [string, string[]][] = [
  ['id', ['id']],
  ['name', ['name', 'nome', 'driver', 'piloto']],
  ['nationality', ['nat', 'nationality', 'nacionalidade', 'country', 'pais']],
  ['age', ['age', 'idade']],
  ['weight_kg', ['wei', 'weight', 'peso', 'weightkg']],
  ['salary', ['sal', 'salary', 'salario']],
  ['sign_fee', ['fee', 'signfee', 'taxa', 'taxadeadmissao']],
  ['offers', ['off', 'offers', 'ofertas']],
  ['reputation', ['rep', 'reputation', 'reputacao']],
  ['concentration', ['con', 'concentration', 'concentracao']],
  ['talent', ['tal', 'talent', 'talento']],
  ['aggression', ['agg', 'aggressiveness', 'aggression', 'agressividade']],
  ['experience', ['exp', 'experience', 'experiencia']],
  ['technical_knowledge', ['tei', 'technicalknowledge', 'conhecimentotecnico']],
  ['endurance', ['sta', 'stamina', 'resistencia', 'endurance']],
  ['charisma', ['cha', 'charisma', 'carisma']],
  ['motivation', ['mot', 'motivation', 'motivacao']],
  ['total', ['oa', 'total', 'overall']]
]

export function normalizeDrivers(rawList: any[]): MarketDriver[] {
  return rawList
    .map(raw => {
      if (!raw || typeof raw !== 'object') return null
      const lookup: Record<string, any> = {}
      for (const [k, v] of Object.entries(raw)) lookup[normKey(k)] = v
      const d: MarketDriver = {}
      for (const [col, cands] of KEY_MAP) {
        for (const c of cands) {
          if (lookup[c] !== undefined) {
            d[col] = col === 'name' || col === 'nationality' ? String(lookup[c]) : Number(lookup[c]) || 0
            break
          }
        }
        if (d[col] === undefined) d[col] = col === 'name' ? '—' : 0
      }
      return d
    })
    .filter(Boolean) as MarketDriver[]
}

export function saveMarket(drivers: MarketDriver[]): boolean {
  const rows = drivers.map(d => MARKET_COLUMNS.map(c => d[c]))
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ updated_at: new Date().toISOString(), rows }))
    return true
  } catch {
    return false
  }
}

export function loadMarket(): MarketData | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const drivers = (parsed.rows ?? []).map((r: any[]) =>
      Object.fromEntries(MARKET_COLUMNS.map((c, i) => [c, r[i]]))
    ) as MarketDriver[]
    return { updated_at: parsed.updated_at ?? '', drivers }
  } catch {
    return null
  }
}

export const ATTR_FILTERS = [
  { key: 'total', label: 'Total', defMax: 250 },
  { key: 'concentration', label: 'Concentração', defMax: 250 },
  { key: 'talent', label: 'Talento', defMax: 250 },
  { key: 'aggression', label: 'Agressividade', defMax: 250 },
  { key: 'experience', label: 'Experiência', defMax: 300 },
  { key: 'technical_knowledge', label: 'Conhecimento Técnico', defMax: 250 },
  { key: 'endurance', label: 'Resistência', defMax: 250 },
  { key: 'charisma', label: 'Carisma', defMax: 250 },
  { key: 'motivation', label: 'Motivação', defMax: 250 },
  { key: 'reputation', label: 'Reputação', defMax: 250 },
  { key: 'weight_kg', label: 'Peso', defMax: 250 },
  { key: 'age', label: 'Idade', defMax: 99 }
]

export const SORT_OPTIONS = [
  { value: '---', label: '---' },
  { value: 'total', label: 'Total' },
  { value: 'concentration', label: 'Concentração' },
  { value: 'talent', label: 'Talento' },
  { value: 'aggression', label: 'Agressividade' },
  { value: 'experience', label: 'Experiência' },
  { value: 'technical_knowledge', label: 'Conhecimento Técnico' },
  { value: 'endurance', label: 'Resistência' },
  { value: 'charisma', label: 'Carisma' },
  { value: 'motivation', label: 'Motivação' },
  { value: 'reputation', label: 'Reputação' },
  { value: 'weight_kg', label: 'Peso' },
  { value: 'age', label: 'Idade' },
  { value: 'salary', label: 'Salário' },
  { value: 'sign_fee', label: 'Taxa' },
  { value: 'offers', label: 'Ofertas' }
]