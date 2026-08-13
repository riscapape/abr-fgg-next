// Ajuste de asas baseado em 3 tentativas de tempo
export interface WingAttempt {
  frontWing: number
  rearWing: number
  minutes: number
  seconds: number
  milliseconds: number
}

export interface WingAttempts {
  attempt1: WingAttempt
  attempt2: WingAttempt
  attempt3: WingAttempt
}

// Calcula o ajuste ideal das asas com base em 3 tentativas
export function calculateWingAdjustment(attempts: WingAttempts): number {
  const split1 = (attempts.attempt1.frontWing - attempts.attempt1.rearWing) / 2.0
  const split2 = (attempts.attempt2.frontWing - attempts.attempt2.rearWing) / 2.0
  const split3 = (attempts.attempt3.frontWing - attempts.attempt3.rearWing) / 2.0

  const time1 =
    attempts.attempt1.minutes * 60 +
    attempts.attempt1.seconds +
    attempts.attempt1.milliseconds / 1000
  const time2 =
    attempts.attempt2.minutes * 60 +
    attempts.attempt2.seconds +
    attempts.attempt2.milliseconds / 1000
  const time3 =
    attempts.attempt3.minutes * 60 +
    attempts.attempt3.seconds +
    attempts.attempt3.milliseconds / 1000

  // Da = determinante para coeficiente a
  const Da =
    split1 * time2 +
    split2 * time3 +
    split3 * time1 -
    split3 * time2 -
    split2 * time1 -
    split1 * time3

  // Db = determinante para coeficiente b
  const Db =
    split2 ** 2 * time1 +
    split3 ** 2 * time2 +
    split1 ** 2 * time3 -
    split3 ** 2 * time1 -
    split1 ** 2 * time2 -
    split2 ** 2 * time3

  if (Da === 0) return 0

  return (-1 * Db) / (2 * Da)
}