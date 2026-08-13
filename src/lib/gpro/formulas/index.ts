// Piloto
export { calculateOA, calculateOAGMT, calculateZS } from './piloto'

// PHA
export { calculatePHA, type PHAResult } from './pha'
export { getMajorPHA } from './maior-pha'

// Composto do pneu
export { calculateCompound } from './composto'

// Wing/Split
export { calculateWingSplit } from './wing-split'

// Desgaste de peças
export {
  driverCoef,
  levelCoef,
  calculatePartWear,
  calculatePartWearTest,
  calculateAllWear
} from './desgaste'

// Durabilidade dos pneus
export {
  baseDurability,
  superSoftDurability,
  softDurability,
  mediumDurability,
  hardDurability,
  wetDurability,
  allDurabilities,
  RISK_COEF_BY_COMPOUND,
  riskFactor,
  durabilityAtRisk,
  type DurabilityParams
} from './durabilidade'

// Consumo e estratégias
export {
  dryConsumption,
  wetConsumption,
  maxFuel,
  fuelTimeLoss,
  pitsTimeLoss,
  superSoftStrategy,
  softStrategy,
  mediumStrategy,
  hardStrategy,
  wetStrategy,
  type ConsumptionParams
} from './consumo'

// Setup do carro
export {
  calculateWings,
  calculateEngine,
  calculateBrakes,
  calculateGearbox,
  calculateSuspension,
  fullSetup,
  type SetupParams
} from './setup'

// Ajuste de asas (3 tentativas)
export { calculateWingAdjustment, type WingAttempt, type WingAttempts } from './asas'

// Planejamento de peças
export {
  replacePrice,
  downgradePart,
  allReplacePrices,
  type ReplacePlan,
  type DowngradePlan
} from './planejamento'

// Utilitários
export { formatNumber } from './format-number'

// Tipos
export type {
  Weather,
  DriverFormula,
  CarFormula,
  TrackFormula,
  TireFormula,
  PartSuffix
} from './types'
export { PART_SUFFIX_MAP } from './types'

// Estratégias de corrida
export {
  calculateStrategies,
  bestStrategies,
  distributeStints,
   buildCtList,
  COMPOUNDS,
  COMPOUND_LABELS,
  type RaceStrategy,
  type TireCompound,
  type StrategyParams
} from './estrategias'