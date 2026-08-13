import type { PartSuffix } from './types'
import { formatNumber } from './format-number'

// Preços base de cada peça (nível 1)
const BASE_PRICES: Record<PartSuffix, number> = {
  Cha: 1292539,
  Mot: 3311737,
  Asd: 1551354,
  Ast: 1504126,
  Ass: 510128,
  Lat: 459831,
  Rad: 454545,
  Cam: 3098104,
  Fre: 697674,
  Sus: 1181545,
  Ele: 938416
}

const LVL_COEF = 1.2385

export interface ReplacePlan {
  description: string
  level: number
  price: number
  formattedPrice: string
}

export interface DowngradePlan {
  description: string
  level: number
  newWear: number
}

// Calcula o preço para substituir uma peça pelo nível especificado
export function replacePrice(suffix: PartSuffix, level: number): ReplacePlan | null {
  if (level <= 0) return null

  const base = BASE_PRICES[suffix]
  const price = Math.round(base * LVL_COEF ** (level - 1))

  return {
    description: `Substituir pelo nível ${level} ($${formatNumber(price)})`,
    level,
    price,
    formattedPrice: formatNumber(price)
  }
}

// Calcula o efeito de rebaixar uma peça (reduz desgaste)
export function downgradePart(
  currentLevel: number,
  deltaLevel: number,
  currentWear: number
): DowngradePlan | null {
  if (deltaLevel >= 0) return null

  const wear = Math.min(currentWear, 100)
  const reduction = 1 - (deltaLevel + currentLevel) * 0.15
  const newWear = Math.floor(reduction > 0 ? wear * reduction : 0)

  return {
    description: `Rebaixar para o nível ${Math.abs(deltaLevel)} (Desg: ${newWear}%)`,
    level: Math.abs(deltaLevel),
    newWear
  }
}

// Calcula o preço de todas as peças em um determinado nível
export function allReplacePrices(level: number): Record<PartSuffix, ReplacePlan> {
  const suffixes: PartSuffix[] = [
    'Cha', 'Mot', 'Asd', 'Ast', 'Ass',
    'Lat', 'Rad', 'Cam', 'Fre', 'Sus', 'Ele'
  ]

  const result = {} as Record<PartSuffix, ReplacePlan>
  for (const suffix of suffixes) {
    result[suffix] = replacePrice(suffix, level)!
  }
  return result
}