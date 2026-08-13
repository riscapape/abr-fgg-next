import type {
  TrackFormula,
  CarFormula,
  DriverFormula,
  PartSuffix
} from './types'
import { PART_SUFFIX_MAP } from './types'

// Coeficiente do piloto para reduzir desgaste
export function driverCoef(driver: DriverFormula): number {
  const coefCon = 0.0008
  const coefTal = 0.0005
  const coefExp = 0.0005

  return (
    (1.0 + driver.concentration * coefCon) *
    (1.0 + driver.talent * coefTal) *
    (1.0 + driver.experience * coefExp)
  )
}

// Polinômio que calcula o coeficiente de desgaste baseado no nível da peça
export function levelCoef(pieceLvl: number): number {
  const coef_8 = -0.0121527777775693
  const coef_7 = 0.459325396817217
  const coef_6 = -7.260416666532
  const coef_5 = 62.3194444432347
  const coef_4 = -314.692708326878
  const coef_3 = 942.090277756945
  const coef_2 = -1580.53472218276
  const coef_1 = 1227.63095234109
  const coef_0 = -99.9999999836494

  return (
    (coef_8 * pieceLvl ** 8.0 +
      coef_7 * pieceLvl ** 7.0 +
      coef_6 * pieceLvl ** 6.0 +
      coef_5 * pieceLvl ** 5.0 +
      coef_4 * pieceLvl ** 4.0 +
      coef_3 * pieceLvl ** 3.0 +
      coef_2 * pieceLvl ** 2.0 +
      coef_1 * pieceLvl ** 1.0 +
      coef_0 * pieceLvl ** 0.0) /
    10000.0
  )
}

// Calcula o desgaste de uma peça específica na corrida
export function calculatePartWear(
  track: TrackFormula,
  driver: DriverFormula,
  car: CarFormula,
  suffix: PartSuffix,
  risk: number
): number {
  const map = PART_SUFFIX_MAP[suffix]
  const coefDesg = track[map.track] as number
  const coefLvl = levelCoef(car[map.lvl] as number)

  return Math.ceil((coefDesg * (1 + risk * coefLvl)) / driverCoef(driver))
}

// Calcula o desgaste por volta em testes
export function calculatePartWearTest(
  track: TrackFormula,
  driver: DriverFormula,
  car: CarFormula,
  suffix: PartSuffix
): number {
  return (
    Math.ceil((calculatePartWear(track, driver, car, suffix, 67) / track.laps) * 10) /
    10 /
    3.7
  )
}

// Calcula desgaste de todas as peças de uma vez
export function calculateAllWear(
  track: TrackFormula,
  driver: DriverFormula,
  car: CarFormula,
  risk: number
): Record<PartSuffix, number> {
  const suffixes: PartSuffix[] = [
    'Cha', 'Mot', 'Asd', 'Ast', 'Ass',
    'Lat', 'Rad', 'Cam', 'Fre', 'Sus', 'Ele'
  ]

  const result = {} as Record<PartSuffix, number>
  for (const suffix of suffixes) {
    result[suffix] = calculatePartWear(track, driver, car, suffix, risk)
  }
  return result
}