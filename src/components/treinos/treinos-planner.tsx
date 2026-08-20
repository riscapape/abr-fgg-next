'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  calculateZS,
  calculateWingAdjustment,
  calculateWings,
  calculateEngine,
  calculateBrakes,
  calculateGearbox,
  calculateSuspension,
  type CarFormula,
  type DriverFormula,
  type TrackFormula,
  type Weather
} from '@/lib/gpro/formulas'

type PracticeLap = {
  volta: number
  lapTime: number
  driverError: number
  netTime: number
  fw: number
  rw: number
  engine: number
  brakes: number
  gear: number
  susp: number
  tyreName: string
  comment?: string
  comments?: string[]
}

const PART_KEYS = ['wng', 'eng', 'bra', 'gea', 'sus'] as const
type PartKey = (typeof PART_KEYS)[number]

const PART_LABEL: Record<PartKey, string> = {
  wng: 'Asas (D+T)/2',
  eng: 'Motor',
  bra: 'Freios',
  gea: 'Câmbio',
  sus: 'Suspensão'
}

// ===== Comentários do piloto → satisfação por peça (-3..3) =====
// POR ENQUANTO: toda volta = 0 ("Estou satisfeito com o ajuste do carro").
// Quando a lista de textos (-3..3) por peça for colada no COMMENT_TEXTS,
// o parse passa a detectar a satisfação automaticamente pelo texto do comentário.
// ===== Comentários do piloto → satisfação por peça (-3..3) =====
const COMMENT_TEXTS: Record<PartKey, Record<number, string>> = {
  wng: {
    [-3]: 'Asas: Falta ao carro muita velocidade nas retas',
    [-2]: 'Asas: O carro está perdendo alguma velocidade nas retas',
    [-1]: 'Asas: O carro poderia ter um pouco mais de velocidade nas retas',
    [1]: 'Asas: Estou perdendo um pouco de aderência nas curvas',
    [2]: 'Asas: O carro é muito instável em muitas curvas',
    [3]: 'Asas: Não posso dirigir o carro, ele não tem aderência'
  },
  eng: {
    [-3]: 'Motor: Não, não, não!!! Favoreça muito mais as baixas rotações!',
    //[-2]: 'Motor: As rotações estão muito altas',
    [-2]: 'Motor: As revoluções do motor estão muito altas',
    [-1]: 'Motor: Tente favorecer um pouco mais as baixas rotações',
    [1]: 'Motor: Eu sinto que não tenho força suficiente no motor durante as retas',
    [2]: 'Motor: A força do motor nas retas não é suficiente',
    [3]: 'Motor: Você deve tentar favorecer muito mais as altas rotações'
  },
  bra: {
    [-3]: 'Freios: Por favor, coloque o balanço dos freios muito mais para trás',
    [-2]: 'Freios: Eu penso que a eficácia dos freios pode ser maior se movermos o balanço para trás',
    [-1]: 'Freios: Coloque o balanço um pouco mais para trás',
    [1]: 'Freios: Eu gostaria de ter o balanço um pouco mais para frente',
    [2]: 'Freios: Eu penso que a eficácia dos freios pode ser maior se movermos o balanço para frente',
    [3]: 'Freios: Eu me sentiria muito mais confortável se movêssemos o balanço para a frente'
  },
  gea: {
    [-3]: 'Câmbio: Por favor, coloque um pouco menor o intervalo entre as marchas.',
    [-2]: 'Câmbio: A relação do câmbio é muito longa',
    [-1]: 'Câmbio: Eu não posso tirar vantagem da força do motor. Coloque a relação do câmbio um pouco menor',
    [1]: 'Câmbio: Estou muito frequentemente no vermelho. Coloque a relação do câmbio um pouco mais alta',
   // [2]: 'Câmbio: O intervalo entre marchas está muito curto',
    [2]: 'Câmbio: A relação do câmbio é muito curta',
    [3]: 'Câmbio: Eu sinto que o motor vai explodir. Coloque o intervalo de marchas bem maior.'
  },
  sus: {
    [-3]: 'Suspensão: O carro está rígido demais. Diminua muito mais a rigidez',
    [-2]: 'Suspensão: A rigidez da suspensão está muito alta',
    [-1]: 'Suspensão: O carro está muito rígido. Diminua um pouco a rigidez',
    [1]: 'Suspensão: Eu penso que com uma suspensão um pouco mais rígida eu poderei ir mais rápido',
    [2]: 'Suspensão: A rigidez da suspensão está muito baixa',
    [3]: 'Suspensão: A rigidez da suspensão deve ser muito maior'
  }
}

// Normaliza (minúsculas, sem acentos, sem pontuação) p/ casamento tolerante
const normText = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

// Frases pré-normalizadas (uma vez só)
const COMMENT_LOOKUP = (() => {
  const lookup: { part: PartKey; factor: number; phrase: string }[] = []
  for (const part of PART_KEYS) {
    for (const [factor, phrase] of Object.entries(COMMENT_TEXTS[part])) {
      lookup.push({ part, factor: Number(factor), phrase: normText(phrase) })
    }
  }
  return lookup
})()

// "Estou satisfeito com o ajuste do carro" → tudo 0 (nenhuma frase de peça casa)
// Até 5 comentários por volta; cada frase aponta uma peça diferente.
// "Estou satisfeito..." não casa com nenhuma peça → tudo 0 (OK).
function parseLapComments(comments?: string[]): Record<PartKey, number> {
  const base: Record<PartKey, number> = { wng: 0, eng: 0, bra: 0, gea: 0, sus: 0 }
  if (!comments || !comments.length) return base
  for (const c of comments) {
    const text = normText(c)
    for (const entry of COMMENT_LOOKUP) {
      if (text.includes(entry.phrase)) base[entry.part] = entry.factor
    }
  }
  return base
}

// ===== Port de PracticeHelper.PartSetup (sem diretor técnico) =====
class PartSetup {
  ia: [number, number] = [0, 999]
  hints = new Map<number, number>()
  offset = 0
  hsz: number
  constructor(public sz: number) {
    this.hsz = (sz - 1) * 0.5
  }
  addHint(point: number, sat: number) {
    this.hints.set(Math.round(point), sat)
    const lk = sat - 0.5
    const lb =
      sat === -3 ? 0 : lk < 0
        ? Math.ceil(point + lk * this.sz + 0.5)
        : Math.floor(point + lk * this.sz + 0.5)
    const uk = sat + 0.5
    const ub =
      sat === 3 ? 999 : uk < 0
        ? Math.ceil(point + uk * this.sz - 0.5)
        : Math.floor(point + uk * this.sz - 0.5)
    this.ia = [Math.max(this.ia[0], lb), Math.min(this.ia[1], ub)]
  }
  get rawIdeal() { return Math.floor((this.ia[0] + this.ia[1]) / 2) }
  get ideal() { return this.rawIdeal + this.offset }
  get error() { return Math.ceil((this.ia[1] - this.ia[0]) / 2) }
  next() {
    const lia = (this.ia[0] + this.ia[1]) / 2
    const guess = lia > 200 ? lia - this.hsz : lia + this.hsz
    const c = Math.ceil(guess)
    return this.hints.has(c) ? Math.floor(guess) : c
  }
}

function fmtTime(t: number | null) {
  if (t == null || Number.isNaN(t)) return '—'
  const ms = Math.round(t * 1000)
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const r = ms % 1000
  return `${m}:${String(s).padStart(2, '0')}.${String(r).padStart(3, '0')}`
}

function clampWings(front: number, rear: number, ws: number): [number, number] {
  let f = front + ws
  let r = rear - ws
  if (f < 0) { r += f; f = 0 }
  else if (r > 999) { f += r - 999; r = 999 }
  else if (r < 0) { f += r; r = 0 }
  else if (f > 999) { r += f - 999; f = 999 }
  return [f, r]
}

// ===== Volta sugerida p/ ajuste de asas (port de getWingSplitPracticeLap) =====
function wingSplitPracticeLap(
  laps: PracticeLap[],
  trackSplit: number,
  bestSplit: number,
  initial: { asas: number; motor: number; freios: number; cambio: number; suspensao: number }
): { wngF: number; wngR: number; eng: number; bra: number; gea: number; sus: number } {
  // maior grupo com mesmo setup não-asa (empate → melhor tempo líquido)
  const groups = new Map<string, PracticeLap[]>()
  for (const l of laps) {
    const k = `${l.engine}|${l.brakes}|${l.gear}|${l.susp}|${l.tyreName}`
    groups.set(k, [...(groups.get(k) ?? []), l])
  }
  let best: PracticeLap[] | null = null
  for (const g of groups.values()) {
    if (
      !best ||
      g.length > best.length ||
      (g.length === best.length && g[0].netTime < best[0].netTime)
    ) {
      best = g
    }
  }

  const ref0 = trackSplit !== 0 ? trackSplit : 70

  // sem voltas: setup da fórmula com o split da pista
  if (!best || best.length === 0) {
    const wings = clampWings(initial.asas, initial.asas, trackSplit)
    return {
      wngF: wings[0],
      wngR: wings[1],
      eng: initial.motor,
      bra: initial.freios,
      gea: initial.cambio,
      sus: initial.suspensao
    }
  }

  const build = (ref: number) => {
    let base = best![0]
    let wings: [number, number]
    if (best!.length === 1) {
      wings = clampWings(base.fw, base.rw, ref)
    } else if (best!.length === 2) {
      wings = clampWings(base.fw, base.rw, ref * 2)
      if (best![1].fw === wings[0] && best![1].rw === wings[1]) {
        base = best![1]
        wings = clampWings(base.fw, base.rw, ref * 2)
      }
    } else {
      // 3+ voltas no grupo: usa a Sugerida (bestWingSplit)
      wings = clampWings(base.fw, base.rw, bestSplit)
    }
    return {
      wngF: wings[0],
      wngR: wings[1],
      eng: base.engine,
      bra: base.brakes,
      gea: base.gear,
      sus: base.susp
    }
  }

  // se o setup sugerido já foi usado, inverte/amplia o split (ref × −1.5) e tenta de novo
  let ref = ref0
  let settings = build(ref)
  for (let count = 0; count < 5; count++) {
    const used = laps.some(
      l =>
        l.fw === settings.wngF && l.rw === settings.wngR &&
        l.engine === settings.eng && l.brakes === settings.bra &&
        l.gear === settings.gea && l.susp === settings.sus
    )
    if (!used) return settings
    ref = Math.trunc(ref * -1.5)
    settings = build(ref)
  }
  return settings
}

export function TreinosPlanner({
  car, driver, track, laps,
  q1Temp, q1Weather, q2Temp, q2Weather, raceTemp, raceWeather
}: {
  car: CarFormula
  driver: DriverFormula
  track: TrackFormula
  laps: PracticeLap[]
  q1Temp: number
  q1Weather: Weather
  q2Temp: number
  q2Weather: Weather
  raceTemp: number
  raceWeather: Weather
}) {
  const zs = Math.round(calculateZS(driver)) // ZS do piloto (DT = 0)

     const [mode, setMode] = useState<'ideal' | 'refinar' | 'inicial' | 'asas'>('ideal')

  const calc = useMemo(() => {
    const ps = {
      wng: new PartSetup(zs),
      eng: new PartSetup(zs),
      bra: new PartSetup(zs),
      gea: new PartSetup(zs),
      sus: new PartSetup(zs)
    } as Record<PartKey, PartSetup>

        // Comentário de todas as voltas = 0 por enquanto;
    // quando a extensão salvar o comentário real no banco, ele entra sozinho aqui.
    for (const l of laps) {
           const f = parseLapComments(l.comments)
      ps.wng.addHint((l.fw + l.rw) / 2, f.wng)
      ps.eng.addHint(l.engine, f.eng)
      ps.bra.addHint(l.brakes, f.bra)
      ps.gea.addHint(l.gear, f.gea)
      ps.sus.addHint(l.susp, f.sus)
    }

  const mkSetup = (temperature: number, weather: Weather) => {
    const p = { track, temperature, weather, driver, car }
    return {
      asas: calculateWings(p),
      motor: calculateEngine(p),
      freios: calculateBrakes(p),
      cambio: calculateGearbox(p),
      suspensao: calculateSuspension(p)
    }
  }
    // ===== Split de asas (port de calculateWingSplit) =====
    const baseSplit = track.setup_split || 70
    const groups = new Map<string, PracticeLap[]>()
    for (const l of laps) {
      const k = `${l.engine}|${l.brakes}|${l.gear}|${l.susp}|${l.tyreName}`
      groups.set(k, [...(groups.get(k) ?? []), l])
    }
    let bestGroup: PracticeLap[] = []
    for (const g of groups.values()) if (g.length > bestGroup.length) bestGroup = g

    const bySplit = new Map<number, number>()
    for (const l of bestGroup) {
      bySplit.set(Math.floor((l.fw - l.rw) / 2), Math.round(l.netTime * 1000))
    }
    const pts = [...bySplit.entries()].map(([s, t]) => ({ s, t }))

    let suggested = pts.length
      ? pts.reduce((a, b) => (b.t < a.t ? b : a)).s
      : 0
    if (pts.length >= 3) {
      const toAttempt = (p: { s: number; t: number }) => ({
        frontWing: p.s * 2,
        rearWing: 0,
        minutes: Math.floor(p.t / 60000),
        seconds: Math.floor((p.t % 60000) / 1000),
        milliseconds: p.t % 1000
      })
      const v = calculateWingAdjustment({
        attempt1: toAttempt(pts[0]),
        attempt2: toAttempt(pts[1]),
        attempt3: toAttempt(pts[2])
      })
      if (Number.isFinite(v) && Math.abs(v) < Math.abs(2.5 * baseSplit)) {
        suggested = Math.round(v)
      }
    }

    // adjustWingSplit: desloca o ideal das asas pelo split sugerido
    const rawW = ps.wng.rawIdeal
    const [wingFront, wingRear] = clampWings(rawW, rawW, suggested)
    ps.wng.offset = wingFront - rawW

    // médias (linha M. da ferramenta)
    const n = laps.length || 1
    const avg = {
      tempo: laps.reduce((a, l) => a + l.lapTime, 0) / n,
      erro: laps.reduce((a, l) => a + l.driverError, 0) / n,
      liquido: laps.reduce((a, l) => a + l.netTime, 0) / n
    }

    return { ps, baseSplit, suggested, wingFront, wingRear, avg }
  }, [laps, zs, track.setup_split])

    // Divisão de asas: default = sugerida pelos treinos (editável)
  const [wingStr, setWingStr] = useState(() => String(calc.suggested))
    // % de chuva no setup misto da corrida (seco = 100 − wetPct, soma sempre 100%)
  const [wetPct, setWetPct] = useState(() => (raceWeather === 'chuva' ? 100 : 0))
  const wing = useMemo(() => {
    const n = parseInt(wingStr, 10)
    return Number.isNaN(n) ? 0 : Math.min(499, Math.max(-499, n))
  }, [wingStr])

  const mkSetup = (temperature: number, weather: Weather) => {
    const p = { track, temperature, weather, driver, car }
    return {
      asas: calculateWings(p),
      motor: calculateEngine(p),
      freios: calculateBrakes(p),
      cambio: calculateGearbox(p),
      suspensao: calculateSuspension(p)
    }
  }

     const q1Setup = mkSetup(q1Temp, q1Weather)
   const q2Setup = mkSetup(q2Temp, q2Weather)

  // ===== Setup Corrida misto (seco/chuva) =====
  const drySetup = mkSetup(raceTemp, 'seco')
  const wetSetup = mkSetup(raceTemp, 'chuva')
  const blend = (a: number, b: number) =>
    Math.round((a * (100 - wetPct) + b * wetPct) / 100)
  const raceSetup = {
    asas: blend(drySetup.asas, wetSetup.asas),
    motor: blend(drySetup.motor, wetSetup.motor),
    freios: blend(drySetup.freios, wetSetup.freios),
    cambio: blend(drySetup.cambio, wetSetup.cambio),
    suspensao: blend(drySetup.suspensao, wetSetup.suspensao)
  }

    // ===== Antes × Depois do refino =====
  const [showRefined, setShowRefined] = useState(true)
  const hasLaps = laps.length > 0
  const applyRef = showRefined && hasLaps
  const off = {
    asas: applyRef ? calc.ps.wng.rawIdeal - q1Setup.asas : 0,
    motor: applyRef ? calc.ps.eng.ideal - q1Setup.motor : 0,
    freios: applyRef ? calc.ps.bra.ideal - q1Setup.freios : 0,
    cambio: applyRef ? calc.ps.gea.ideal - q1Setup.cambio : 0,
    suspensao: applyRef ? calc.ps.sus.ideal - q1Setup.suspensao : 0
  }
  const applyOff = (s: { asas: number; motor: number; freios: number; cambio: number; suspensao: number }) => ({
    asas: s.asas + off.asas,
    motor: s.motor + off.motor,
    freios: s.freios + off.freios,
    cambio: s.cambio + off.cambio,
    suspensao: s.suspensao + off.suspensao
  })
    const q1F = applyOff(q1Setup)
  const q2F = applyOff(q2Setup)
  const dryF = applyOff(drySetup)
  const wetF = applyOff(wetSetup)
  const raceF = applyOff(raceSetup)

  // ===== Valores "Use:" por modo =====
  const use = useMemo(() => {
    const { ps, suggested, wingFront, wingRear } = calc
    if (mode === 'inicial') {
      return { wngF: 500, wngR: 500, eng: 500, bra: 500, gea: 500, sus: 500 }
    }
       if (mode === 'refinar') {
      // refina com asas IGUAIS (sem split) — isola o feedback das demais peças
      const nextW = ps.wng.next()
      return {
        wngF: nextW, wngR: nextW,
        eng: ps.eng.next(), bra: ps.bra.next(), gea: ps.gea.next(), sus: ps.sus.next()
      }
    }
     if (mode === 'asas') {
      return wingSplitPracticeLap(
        laps,
        track.setup_split || 70,
        calc.suggested,
        mkSetup(raceTemp, raceWeather)
      )
    }
       // ideal: "antes do refino" ou sem voltas → fórmula pura (Q1); "depois" → refinado
    if (laps.length === 0 || !showRefined) {
      return {
        wngF: q1Setup.asas + wing,
        wngR: q1Setup.asas - wing,
        eng: q1Setup.motor,
        bra: q1Setup.freios,
        gea: q1Setup.cambio,
        sus: q1Setup.suspensao
      }
    }
    // com voltas: ideal refinado pelo PartSetup + split sugerido
    return {
      wngF: wingFront,
      wngR: wingRear,
      eng: ps.eng.ideal,
      bra: ps.bra.ideal,
      gea: ps.gea.ideal,
      sus: ps.sus.ideal
    }
  }, [mode, calc, wing, laps, showRefined, q1Temp, q1Weather, q2Temp, q2Weather, raceTemp, raceWeather, track.setup_split])
  const rows: { label: string; ideal: string; use: number }[] = [
    { label: 'Asa Dianteira', ideal: `${calc.wingFront} ±${calc.ps.wng.error}`, use: use.wngF },
    { label: 'Asa Traseira', ideal: `${calc.wingRear} ±${calc.ps.wng.error}`, use: use.wngR },
    { label: 'Motor', ideal: `${calc.ps.eng.ideal} ±${calc.ps.eng.error}`, use: use.eng },
    { label: 'Freio', ideal: `${calc.ps.bra.ideal} ±${calc.ps.bra.error}`, use: use.bra },
    { label: 'Câmbio', ideal: `${calc.ps.gea.ideal} ±${calc.ps.gea.error}`, use: use.gea },
    { label: 'Suspensão', ideal: `${calc.ps.sus.ideal} ±${calc.ps.sus.error}`, use: use.sus }
  ]

  return (
    <div className="space-y-6">
      {/* ===== Voltas de treino ===== */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">
            Voltas de treino ({laps.length}/8) — {track.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0">
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-2 py-1">#</th>
                  <th className="px-2 py-1">Tempo</th>
                  <th className="px-2 py-1">Erro</th>
                  <th className="px-2 py-1">Líquido</th>
                  <th className="px-2 py-1">AsD</th>
                  <th className="px-2 py-1">AsT</th>
                  <th className="px-2 py-1">Mot</th>
                  <th className="px-2 py-1">Fre</th>
                  <th className="px-2 py-1">Câm</th>
                  <th className="px-2 py-1">Sus</th>
                 <th className="px-2 py-1 text-center">Pneus</th>
                  <th className="px-2 py-1">Feedback</th>
                </tr>
              </thead>
                           <tbody>
                {laps.length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-2 py-4 text-center text-muted-foreground">
                      Nenhuma volta de treino completada — use o modo "volta inicial"
                      (tudo 500) para começar os treinos no GPRO.
                    </td>
                  </tr>
                )}
                {laps.map(l => (
                  <tr key={l.volta} className="border-b last:border-0">
                    <td className="px-2 py-1 text-center font-semibold">{l.volta}</td>
                    <td className="px-2 py-1 text-center">{fmtTime(l.lapTime)}</td>
                    <td className="px-2 py-1 text-center">{fmtTime(l.driverError)}</td>
                    <td className="px-2 py-1 text-center font-semibold">{fmtTime(l.netTime)}</td>
                    <td className="px-2 py-1 text-center">{l.fw}</td>
                    <td className="px-2 py-1 text-center">{l.rw}</td>
                    <td className="px-2 py-1 text-center">{l.engine}</td>
                    <td className="px-2 py-1 text-center">{l.brakes}</td>
                    <td className="px-2 py-1 text-center">{l.gear}</td>
                    <td className="px-2 py-1 text-center">{l.susp}</td>
                    <td className="px-2 py-1 text-center">{l.tyreName}</td>
                    <td className="px-2 py-1 text-center text-xs text-muted-foreground">
                      {(() => {
                        const f = parseLapComments(l.comments)
                        const parts: string[] = []
                        if (f.wng) parts.push(`Asas ${f.wng > 0 ? '+' : ''}${f.wng}`)
                        if (f.eng) parts.push(`Motor ${f.eng > 0 ? '+' : ''}${f.eng}`)
                        if (f.bra) parts.push(`Freios ${f.bra > 0 ? '+' : ''}${f.bra}`)
                        if (f.gea) parts.push(`Câmbio ${f.gea > 0 ? '+' : ''}${f.gea}`)
                        if (f.sus) parts.push(`Susp ${f.sus > 0 ? '+' : ''}${f.sus}`)
                        return parts.length ? parts.join(', ') : 'OK'
                      })()}
                    </td>
                  </tr>
                ))}
                {laps.length > 0 && (
                  <tr className="bg-muted/30">
                    <td className="px-2 py-1 text-center font-semibold">M.</td>
                    <td className="px-2 py-1 text-center">{fmtTime(calc.avg.tempo)}</td>
                    <td className="px-2 py-1 text-center">{fmtTime(calc.avg.erro)}</td>
                    <td className="px-2 py-1 text-center">{fmtTime(calc.avg.liquido)}</td>
                    <td colSpan={8} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm">
            <span>
              Dif. de asas base: <strong>{calc.baseSplit}</strong>
            </span>
            <span>
              Sugerida: <strong>{calc.suggested}</strong>
            </span>
            <span className="text-xs text-muted-foreground">
              ZS piloto: {zs} • DT: 0
            </span>
          </div>         
        </CardContent>
      </Card>

      {/* ===== Ajuste ideal + Use ===== */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">O que deseja fazer?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0">
          <select
            className="h-8 w-72 rounded-md border border-input bg-background px-2 text-sm"
            value={mode}
            onChange={e => setMode(e.target.value as any)}
          >
            <option value="ideal">Desejo usar o ajuste ideal</option>
            <option value="refinar">Desejo refinar o ajuste</option>
            <option value="inicial">Desejo calcular valores para a volta inicial</option>
            <option value="asas">Desejo fazer uma volta de ajuste de asas</option>
          </select>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-2 py-1" rowSpan={2}>Peça</th>
                  <th className="px-2 py-1" colSpan={2}>ZS</th>
                  <th className="px-2 py-1" colSpan={2}>Ajuste Ideal</th>
                  <th className="px-2 py-1" rowSpan={2}>Use:</th>
                </tr>
                <tr className="border-b bg-muted/50">
                  <th className="px-2 py-1">Piloto</th>
                  <th className="px-2 py-1">DT</th>
                  <th className="px-2 py-1">Ajuste</th>
                  <th className="px-2 py-1">±Erro</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.label} className="border-b last:border-0">
                    <td className="px-2 py-1 font-medium">{r.label}</td>
                    <td className="px-2 py-1 text-center">{zs}</td>
                    <td className="px-2 py-1 text-center">0</td>
                    <td className="px-2 py-1 text-center font-semibold">
                      {r.ideal.split(' ')[0]}
                    </td>
                    <td className="px-2 py-1 text-center text-red-600">
                      {r.ideal.split(' ')[1]}
                    </td>
                    <td className="px-2 py-1 text-center font-semibold text-blue-700">
                      {r.use}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground">
            "Use" são os valores para a próxima volta de treino no GPRO: no modo{' '}
            <strong>ideal</strong>, o meio do intervalo; em <strong>refinar</strong>, o
            ponto de sondagem (o ±Erro cai pela metade a cada volta); em{' '}
            <strong>volta inicial</strong>, tudo 500 para começar do zero.
          </p>
        </CardContent>
      </Card>
            {/* ===== Divisão de asas + Setups Q2 / Corrida ===== */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <span className="text-sm font-medium">Divisão de Asas</span>
            <Input
              type="number"
              min={-499}
              max={499}
              className="h-8 w-24"
              value={wingStr}
              onChange={e => setWingStr(e.target.value)}
              onBlur={() => wingStr === '' && setWingStr(String(calc.suggested))}
            />
          </div>
                 <div className="space-y-1">
            <span className="text-sm font-medium">Setup exibido</span>
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
              value={applyRef ? 'depois' : 'antes'}
              onChange={e => setShowRefined(e.target.value === 'depois')}
              disabled={!hasLaps}
            >
              <option value="antes">Antes do refino (fórmula)</option>
              <option value="depois">Depois do refino (treinos)</option>
            </select>
          </div>
          <p className="text-xs text-muted-foreground">
            Default = sugerida pelos treinos ({calc.suggested}). "Depois" aplica o
            refino (refinado − fórmula Q1) sobre o setup de cada sessão.
          </p>
          
        </div>

                      <div className="grid gap-6 lg:grid-cols-3">
        {/* ===== Setup Q1 ===== */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Setup Q1</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-2 py-1 text-center">Temp.</th>
                  <th className="px-2 py-1 text-center">Clima</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-2 py-1 text-center">{q1Temp}°C</td>
                  <td className="px-2 py-1 text-center">{q1Weather}</td>
                </tr>
                <tr className="border-b bg-muted/50">
                  <th className="px-2 py-1 text-center">Peça</th>
                  <th className="px-2 py-1 text-center">Ajuste</th>
                </tr>
                <tr className="border-b"><td className="px-2 py-1 text-center">Asa Diant.</td><td className="px-2 py-1 text-center">{q1F.asas + wing}</td></tr>
                <tr className="border-b"><td className="px-2 py-1 text-center">Asa Tras.</td><td className="px-2 py-1 text-center">{q1F.asas - wing}</td></tr>
                <tr className="border-b"><td className="px-2 py-1 text-center">Motor</td><td className="px-2 py-1 text-center">{q1F.motor}</td></tr>
                <tr className="border-b"><td className="px-2 py-1 text-center">Freios</td><td className="px-2 py-1 text-center">{q1F.freios}</td></tr>
                <tr className="border-b"><td className="px-2 py-1 text-center">Câmbio</td><td className="px-2 py-1 text-center">{q1F.cambio}</td></tr>
                <tr><td className="px-2 py-1 text-center">Suspensão</td><td className="px-2 py-1 text-center">{q1F.suspensao}</td></tr>
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* ===== Setup Q2 (clima definido) ===== */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Setup Q2</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-2 py-1 text-center">Temp.</th>
                  <th className="px-2 py-1 text-center">Clima</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-2 py-1 text-center">{q2Temp}°C</td>
                  <td className="px-2 py-1 text-center">{q2Weather}</td>
                </tr>
                <tr className="border-b bg-muted/50">
                  <th className="px-2 py-1 text-center">Peça</th>
                  <th className="px-2 py-1 text-center">Ajuste</th>
                </tr>
                <tr className="border-b"><td className="px-2 py-1 text-center">Asa Diant.</td><td className="px-2 py-1 text-center">{q2F.asas + wing}</td></tr>
                <tr className="border-b"><td className="px-2 py-1 text-center">Asa Tras.</td><td className="px-2 py-1 text-center">{q2F.asas - wing}</td></tr>
                <tr className="border-b"><td className="px-2 py-1 text-center">Motor</td><td className="px-2 py-1 text-center">{q2F.motor}</td></tr>
                <tr className="border-b"><td className="px-2 py-1 text-center">Freios</td><td className="px-2 py-1 text-center">{q2F.freios}</td></tr>
                <tr className="border-b"><td className="px-2 py-1 text-center">Câmbio</td><td className="px-2 py-1 text-center">{q2F.cambio}</td></tr>
                <tr><td className="px-2 py-1 text-center">Suspensão</td><td className="px-2 py-1 text-center">{q2F.suspensao}</td></tr>
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* ===== Setup Corrida MISTO (seco/chuva) ===== */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Setup Corrida (misto seco/chuva)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0">
            <div className="flex items-center gap-3 text-xs sm:text-sm">
              <span className="w-24 whitespace-nowrap">Seco {100 - wetPct}%</span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={wetPct}
                onChange={e => setWetPct(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <span className="w-24 whitespace-nowrap text-right">Chuva {wetPct}%</span>
            </div>

            <table className="w-full text-xs sm:text-sm">
                           <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-2 py-1">Peça</th>
                  <th className="px-2 py-1 text-center">Seco</th>
                  <th className="px-2 py-1 text-center">Misto</th>
                  <th className="px-2 py-1 text-center">Chuva</th>
                </tr>
              </thead>
                          <tbody>
                <tr className="border-b">
                  <td className="px-2 py-1">Temperatura</td>
                  <td className="px-2 py-1 text-center">{raceTemp}°C</td>
                  <td className="px-2 py-1 text-center font-semibold">{raceTemp}°C</td>
                  <td className="px-2 py-1 text-center">{raceTemp}°C</td>
                </tr>
                <tr className="border-b">
                  <td className="px-2 py-1">Asa Diant.</td>
                  <td className="px-2 py-1 text-center">{dryF.asas + wing}</td>
                  <td className="px-2 py-1 text-center font-semibold">{raceF.asas + wing}</td>
                  <td className="px-2 py-1 text-center">{wetF.asas + wing}</td>
                </tr>
                <tr className="border-b">
                  <td className="px-2 py-1">Asa Tras.</td>
                  <td className="px-2 py-1 text-center">{dryF.asas - wing}</td>
                  <td className="px-2 py-1 text-center font-semibold">{raceF.asas - wing}</td>
                  <td className="px-2 py-1 text-center">{wetF.asas - wing}</td>
                </tr>
                <tr className="border-b">
                  <td className="px-2 py-1">Motor</td>
                  <td className="px-2 py-1 text-center">{dryF.motor}</td>
                  <td className="px-2 py-1 text-center font-semibold">{raceF.motor}</td>
                  <td className="px-2 py-1 text-center">{wetF.motor}</td>
                </tr>
                <tr className="border-b">
                  <td className="px-2 py-1">Freios</td>
                  <td className="px-2 py-1 text-center">{dryF.freios}</td>
                  <td className="px-2 py-1 text-center font-semibold">{raceF.freios}</td>
                  <td className="px-2 py-1 text-center">{wetF.freios}</td>
                </tr>
                <tr className="border-b">
                  <td className="px-2 py-1">Câmbio</td>
                  <td className="px-2 py-1 text-center">{dryF.cambio}</td>
                  <td className="px-2 py-1 text-center font-semibold">{raceF.cambio}</td>
                  <td className="px-2 py-1 text-center">{wetF.cambio}</td>
                </tr>
                <tr>
                  <td className="px-2 py-1">Suspensão</td>
                  <td className="px-2 py-1 text-center">{dryF.suspensao}</td>
                  <td className="px-2 py-1 text-center font-semibold">{raceF.suspensao}</td>
                  <td className="px-2 py-1 text-center">{wetF.suspensao}</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
      <p className="text-xs text-muted-foreground">
        {hasLaps
          ? 'Setups Q2/Corrida = fórmula da sessão + refino dos treinos (refinado − fórmula Q1). Asas usam a Divisão de Asas acima.'
          : 'Sem voltas de treino ainda — setups Q2/Corrida são apenas a fórmula de cada sessão.'}
      </p>
      </div>
    </div>
  )
}