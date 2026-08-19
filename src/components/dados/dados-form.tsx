'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  CAR_PARTS,
  DRIVER_ATTRIBUTES,
  WEATHER_OPTIONS,
  RACE_TEMP_SLOTS,
  MAX_PART_LEVEL,
  LIMITS,
  calculateDriverTotal,
  validateRange
} from '@/lib/gpro/constants'
import type { CarPartKey, DriverKey, Weather } from '@/lib/gpro/constants'

type Row = Record<string, any> | null

const str = (v: unknown) => (v != null ? String(v) : '')
const str0 = (v: unknown) => (v != null ? String(v) : '0')

function parseNum(s: string): number | null {
  if (s.trim() === '') return null
  const n = Number(s)
  return Number.isNaN(n) ? null : n
}

function Label({ children }: { children: ReactNode }) {
  return <span className="text-sm font-medium">{children}</span>
}

function NumInput({
  value,
  onChange,
  min,
  max,
  step,
  className
}: {
  value: string
  onChange: (v: string) => void
  min?: number
  max?: number
  step?: number | string
  className?: string
}) {
  return (
    <Input
      type="number"
      min={min}
      max={max}
      step={step}
      placeholder="0"
      className={cn('h-8 w-20', className)}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  )
}

function WeatherSelect({
  value,
  onChange
}: {
  value: Weather
  onChange: (w: Weather) => void
}) {
  return (
    <select
      className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
      value={value}
      onChange={e => onChange(e.target.value as Weather)}
    >
      {WEATHER_OPTIONS.map(w => (
        <option key={w.value} value={w.value}>
          {w.label}
        </option>
      ))}
    </select>
  )
}

export function DadosForm({
  userId,
  tracks,
  tires,
  defaultTrackId,
  car,
  driver,
  race
}: {
  userId: string
  tracks: { id: string; name: string; race_number?: number }[]
  tires: { id: string; name: string }[]
  defaultTrackId: string | null
  car: Row
  driver: Row
  race: Row
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // ===== Dados da corrida =====
  const [trackId, setTrackId] = useState(race?.track_id ?? defaultTrackId ?? '')
  const [tireId, setTireId] = useState(race?.tire_id ?? tires[0]?.id ?? '')
  const [airTemp, setAirTemp] = useState(str0(race?.air_temp))
  const [ctRisk, setCtRisk] = useState(str0(race?.ct_risk))
  const [pitTime, setPitTime] = useState(str0(race?.pit_time))

  const [q1Temp, setQ1Temp] = useState(str0(race?.q1_temp))
  const [q1Weather, setQ1Weather] = useState<Weather>(race?.q1_weather ?? 'seco')
  const [q2Temp, setQ2Temp] = useState(str0(race?.q2_temp))
  const [q2Weather, setQ2Weather] = useState<Weather>(race?.q2_weather ?? 'seco')
  const [raceTemp, setRaceTemp] = useState(str0(race?.race_temp))
  const [raceWeather, setRaceWeather] = useState<Weather>(race?.race_weather ?? 'seco')

  const [phaP, setPhaP] = useState(str0(race?.pha_p))
  const [phaH, setPhaH] = useState(str0(race?.pha_h))
  const [phaA, setPhaA] = useState(str0(race?.pha_a))

  const [slots, setSlots] = useState(() =>
    RACE_TEMP_SLOTS.map(s => ({
      min: str0(race?.[`race_temp_${s.key}_min`]),
      max: str0(race?.[`race_temp_${s.key}_max`])
    }))
  )

  // Destaque para campos NÃO coletados pela extensão (ajuste manual)
const manualCls = 'border-amber-400/70 bg-amber-400/10'

  function updateSlot(index: number, field: 'min' | 'max', value: string) {
    setSlots(prev => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)))
  }

  // ===== Carro =====
  const [carParts, setCarParts] = useState<Record<CarPartKey, { lvl: number; wear: string }>>(() => {
    const base = {} as Record<CarPartKey, { lvl: number; wear: string }>
    for (const p of CAR_PARTS) {
      base[p.key] = {
        lvl: car?.[`${p.key}_lvl`] ?? 1,
        wear: str(car?.[`${p.key}_wear`])
      }
    }
    return base
  })

  function updateCarPart(key: CarPartKey, field: 'lvl' | 'wear', value: string | number) {
    setCarParts(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }))
  }

  // ===== Piloto =====
  const [driverAttrs, setDriverAttrs] = useState<Record<DriverKey, string>>(() => {
    const base = {} as Record<DriverKey, string>
    for (const a of DRIVER_ATTRIBUTES) base[a.key] = str(driver?.[a.key])
    return base
  })

  function updateDriverAttr(key: DriverKey, value: string) {
    setDriverAttrs(prev => ({ ...prev, [key]: value }))
  }

  // ===== Cálculos ao vivo =====
  const slotAvgs = slots.map(s => {
    const mn = parseNum(s.min)
    const mx = parseNum(s.max)
    return mn != null && mx != null ? (mn + mx) / 2 : null
  })

  const avgUntil90 =
    slotAvgs[0] != null && slotAvgs[1] != null && slotAvgs[2] != null
      ? (slotAvgs[0] + slotAvgs[1] + slotAvgs[2]) / 3
      : null

  const avgUntil120 = slotAvgs.every(v => v != null)
    ? (slotAvgs[0]! + slotAvgs[1]! + slotAvgs[2]! + slotAvgs[3]!) / 4
    : null

  const parsedDriver = {} as Partial<Record<DriverKey, number | null>>
  for (const a of DRIVER_ATTRIBUTES) parsedDriver[a.key] = parseNum(driverAttrs[a.key])
  const driverTotal = calculateDriverTotal(parsedDriver)

  // ===== Validação completa =====
  function validateAll(): string | null {
    // Valida dados da corrida
    const airTempNum = parseNum(airTemp)
    if (airTempNum !== null) {
      const error = validateRange(airTempNum, LIMITS.AIR_TEMP.min, LIMITS.AIR_TEMP.max, 'Temperatura')
      if (error) return error
    }

    const ctRiskNum = parseNum(ctRisk)
    if (ctRiskNum !== null) {
      const error = validateRange(ctRiskNum, LIMITS.CT_RISK.min, LIMITS.CT_RISK.max, 'Risco CT')
      if (error) return error
    }

    const pitTimeNum = parseNum(pitTime)
    if (pitTimeNum !== null) {
      const error = validateRange(pitTimeNum, LIMITS.PIT_TIME.min, LIMITS.PIT_TIME.max, 'Tempo do pit')
      if (error) return error
    }

    const q1TempNum = parseNum(q1Temp)
    if (q1TempNum !== null) {
      const error = validateRange(q1TempNum, LIMITS.RACE_TEMP.min, LIMITS.RACE_TEMP.max, 'Temperatura Q1')
      if (error) return error
    }

    const q2TempNum = parseNum(q2Temp)
    if (q2TempNum !== null) {
      const error = validateRange(q2TempNum, LIMITS.RACE_TEMP.min, LIMITS.RACE_TEMP.max, 'Temperatura Q2')
      if (error) return error
    }

    const raceTempNum = parseNum(raceTemp)
    if (raceTempNum !== null) {
      const error = validateRange(raceTempNum, LIMITS.RACE_TEMP.min, LIMITS.RACE_TEMP.max, 'Temperatura Corrida')
      if (error) return error
    }

    const phaPNum = parseNum(phaP)
    if (phaPNum !== null) {
      const error = validateRange(phaPNum, LIMITS.PHA.min, LIMITS.PHA.max, 'PHA P')
      if (error) return error
    }

    const phaHNum = parseNum(phaH)
    if (phaHNum !== null) {
      const error = validateRange(phaHNum, LIMITS.PHA.min, LIMITS.PHA.max, 'PHA H')
      if (error) return error
    }

    const phaANum = parseNum(phaA)
    if (phaANum !== null) {
      const error = validateRange(phaANum, LIMITS.PHA.min, LIMITS.PHA.max, 'PHA A')
      if (error) return error
    }

    // Valida temperaturas dos slots
    for (let i = 0; i < RACE_TEMP_SLOTS.length; i++) {
      const slotMin = parseNum(slots[i].min)
      const slotMax = parseNum(slots[i].max)
      
      if (slotMin !== null) {
        const error = validateRange(slotMin, LIMITS.RACE_TEMP.min, LIMITS.RACE_TEMP.max, `${RACE_TEMP_SLOTS[i].label} Min`)
        if (error) return error
      }
      
      if (slotMax !== null) {
        const error = validateRange(slotMax, LIMITS.RACE_TEMP.min, LIMITS.RACE_TEMP.max, `${RACE_TEMP_SLOTS[i].label} Max`)
        if (error) return error
      }
    }

    // Valida carro
    for (const p of CAR_PARTS) {
      const wear = parseNum(carParts[p.key].wear)
      if (wear !== null) {
        const error = validateRange(wear, LIMITS.PART_WEAR.min, LIMITS.PART_WEAR.max, `${p.label} Desgaste`)
        if (error) return error
      }
    }

    // Valida piloto
    for (const a of DRIVER_ATTRIBUTES) {
      const value = parseNum(driverAttrs[a.key])
      if (value !== null) {
        const error = validateRange(value, a.min, a.max, a.label)
        if (error) return error
      }
    }

    return null
  }

  // ===== Salvar tudo de uma vez =====
  async function handleSave() {
    const validationError = validateAll()
    if (validationError) {
      toast.error(validationError)
      return
    }

    setLoading(true)

    const carPayload: Record<string, unknown> = { user_id: userId }
    for (const p of CAR_PARTS) {
      const wear = parseNum(carParts[p.key].wear) ?? 0
      carPayload[`${p.key}_lvl`] = carParts[p.key].lvl
      carPayload[`${p.key}_wear`] = wear
    }

    const driverPayload: Record<string, unknown> = { user_id: userId }
    for (const a of DRIVER_ATTRIBUTES) {
      driverPayload[a.key] = parseNum(driverAttrs[a.key])
    }

    const racePayload: Record<string, unknown> = {
      user_id: userId,
      track_id: trackId || null,
      tire_id: tireId || null,
      air_temp: parseNum(airTemp) ?? 0,
      ct_risk: parseNum(ctRisk) ?? 0,
      pit_time: parseNum(pitTime) ?? 0,
      q1_temp: parseNum(q1Temp) ?? 0,
      q1_weather: q1Weather,
      q2_temp: parseNum(q2Temp) ?? 0,
      q2_weather: q2Weather,
      race_temp: parseNum(raceTemp) ?? 0,
      race_weather: raceWeather,
      pha_p: parseNum(phaP) ?? 0,
      pha_h: parseNum(phaH) ?? 0,
      pha_a: parseNum(phaA) ?? 0
    }
    RACE_TEMP_SLOTS.forEach((s, i) => {
      racePayload[`race_temp_${s.key}_min`] = parseNum(slots[i].min) ?? 0
      racePayload[`race_temp_${s.key}_max`] = parseNum(slots[i].max) ?? 0
    })

    const supabase = createClient()

    const [carRes, driverRes, raceRes] = await Promise.all([
      supabase.from('cars').upsert(carPayload, { onConflict: 'user_id' }),
      supabase.from('drivers').upsert(driverPayload, { onConflict: 'user_id' }),
      supabase.from('race_data').upsert(racePayload, { onConflict: 'user_id' })
    ])

    setLoading(false)

    const error = carRes.error ?? driverRes.error ?? raceRes.error

    if (error) {
      toast.error(`Erro ao salvar: ${error.message}`)
      return
    }

    toast.success('Dados salvos com sucesso.')
    router.refresh()
  }

  return (
    <div className="space-y-6" >
      {/* ===== Linha superior ===== */}
            <p className="flex items-center gap-2 rounded-md border border-amber-400/50 bg-amber-400/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
        Campos destacados não são coletados pela extensão — revise e ajuste
        manualmente antes de salvar.
      </p>
           <div className="flex flex-wrap items-end gap-3" >
        <div className="space-y-1">
          <Label>Pista</Label>
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            value={trackId}
            onChange={e => setTrackId(e.target.value)}
          >
            <option value="">Selecione...</option>
            {tracks.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1" >
          <Label>Pneu</Label>
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            
            value={tireId}
            onChange={e => setTireId(e.target.value)}
          >
            {tires.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label>Temperatura</Label>
          <NumInput
            className={`h-8 w-24 ${manualCls}`}
            value={airTemp}
            onChange={setAirTemp}
            min={LIMITS.AIR_TEMP.min}
            max={LIMITS.AIR_TEMP.max}
            step={LIMITS.AIR_TEMP.step}
          />
        </div>

        <div className="space-y-1">
          <Label>Risco CT</Label>
          <NumInput
            className={`h-8 w-24 ${manualCls}`}
            value={ctRisk}
            onChange={setCtRisk}
            min={LIMITS.CT_RISK.min}
            max={LIMITS.CT_RISK.max}
          />
        </div>

                <div className="space-y-1">
          <Label>Tempo do pit</Label>
          <NumInput
            className={`h-8 w-24 ${manualCls}`}
            value={pitTime}
            onChange={setPitTime}
            min={LIMITS.PIT_TIME.min}
            max={LIMITS.PIT_TIME.max}
            step={LIMITS.PIT_TIME.step}
          />
        </div>

        <Button onClick={handleSave} disabled={loading} className="h-8">
          {loading ? 'Salvando...' : 'Salvar Dados'}
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-12">
        {/* ===== Coluna 1: Clima + PHA ===== */}
       <div className="space-y-6 lg:col-span-4">
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Temperatura e Clima</h2>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-2 py-2">Q1</th>
                    <th className="px-2 py-2">Q2</th>
                    <th className="bg-amber-400/10 px-2 py-2 text-center">
                    Corrida
                    
                  </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="px-2 py-1.5">
                      <NumInput
                        className="w-full"
                        value={q1Temp}
                        onChange={setQ1Temp}
                        min={LIMITS.RACE_TEMP.min}
                        max={LIMITS.RACE_TEMP.max}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <NumInput
                        className="w-full"
                        value={q2Temp}
                        onChange={setQ2Temp}
                        min={LIMITS.RACE_TEMP.min}
                        max={LIMITS.RACE_TEMP.max}
                      />
                    </td>
                    <td className={`px-2 py-1.5 ${manualCls}`}>
                      <NumInput
                        className="w-full"
                        value={raceTemp}
                        onChange={setRaceTemp}
                        min={LIMITS.RACE_TEMP.min}
                        max={LIMITS.RACE_TEMP.max}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1.5">
                      <WeatherSelect value={q1Weather} onChange={setQ1Weather} />
                    </td>
                    <td className="px-2 py-1.5">
                      <WeatherSelect value={q2Weather} onChange={setQ2Weather} />
                    </td>
                    <td className={`px-2 py-1.5 ${manualCls}`}>
                      <WeatherSelect value={raceWeather} onChange={setRaceWeather} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Temperaturas da Corrida</h2>
            <div className="grid grid-cols-2 gap-2">
              {RACE_TEMP_SLOTS.map((s, i) => (
                <div key={s.key} className="rounded-md border p-2">
                  <p className="mb-2 text-center text-xs font-medium">{s.label}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="block text-xs text-muted-foreground">Min</span>
                      <NumInput
                        className="w-full"
                        value={slots[i].min}
                        onChange={v => updateSlot(i, 'min', v)}
                        min={LIMITS.RACE_TEMP.min}
                        max={LIMITS.RACE_TEMP.max}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="block text-xs text-muted-foreground">Max</span>
                      <NumInput
                        className="w-full"
                        value={slots[i].max}
                        onChange={v => updateSlot(i, 'max', v)}
                        min={LIMITS.RACE_TEMP.min}
                        max={LIMITS.RACE_TEMP.max}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ===== Coluna 2: PHA e Temperaturas Médias ===== */}
        <div className="space-y-6 lg:col-span-2">
         <div>
          <h3 className="mb-2 text-sm font-semibold">PHA dos Testes</h3>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b">
                  <th className="w-10 px-2 py-1.5 text-center">P</th>
                  <td className="px-2 py-1.5">
                    <NumInput className="w-full" value={phaP} onChange={setPhaP} />
                  </td>
                </tr>
                <tr className="border-b">
                  <th className="w-10 px-2 py-1.5 text-center">H</th>
                  <td className="px-2 py-1.5">
                    <NumInput className="w-full" value={phaH} onChange={setPhaH} />
                  </td>
                </tr>
                <tr>
                  <th className="w-10 px-2 py-1.5 text-center">A</th>
                  <td className="px-2 py-1.5">
                    <NumInput className="w-full" value={phaA} onChange={setPhaA} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Temperatura Média da Corrida</h2>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-2 py-2">Até 1h30m</th>
                    <th className="px-2 py-2">Até 2h00m</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-2 py-2 text-center">
                      {avgUntil90 != null ? `${avgUntil90.toFixed(2)}°C` : '—'}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {avgUntil120 != null ? `${avgUntil120.toFixed(2)}°C` : '—'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
                  {/* ===== PHA dos Testes (vertical, compacto) ===== */}
        
        </div>

        {/* ===== Coluna 3: Carro ===== */}
        <div className="lg:col-span-3">
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Carro</h2>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-2 py-2 text-left">Peça</th>
                  <th className="px-2 py-2 text-left">Nível</th>
                  <th className="px-2 py-2 text-left">%</th>
                </tr>
              </thead>
              <tbody>
                {CAR_PARTS.map(part => (
                  <tr key={part.key} className="border-b last:border-0">
                    <td className="px-2 py-1.5">{part.label}</td>
                    <td className="h-7 w-12 sm:h-8 sm:w-16">
                      <select
                        className="h-8 w-16 rounded-md border border-input bg-background px-2 text-sm"
                        value={carParts[part.key].lvl}
                        onChange={e => updateCarPart(part.key, 'lvl', Number(e.target.value))}
                      >
                        {Array.from({ length: MAX_PART_LEVEL }, (_, i) => i + 1).map(n => (
                         <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <NumInput
                        className="h-7 w-14 sm:h-8 sm:w-20"
                        value={carParts[part.key].wear}
                        onChange={v => updateCarPart(part.key, 'wear', v)}
                        min={LIMITS.PART_WEAR.min}
                        max={LIMITS.PART_WEAR.max}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
          </div>
        {/* ===== Coluna 4: Piloto ===== */}
        <div className="lg:col-span-3">
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Piloto</h2>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-2 py-2 text-left">Atributo</th>
                  <th className="px-2 py-2 text-left">Valor</th>
                </tr>
              </thead>
              <tbody>
                {DRIVER_ATTRIBUTES.map(attr => (
                  <tr key={attr.key} className="border-b last:border-0">
                    <td className="px-2 py-1.5">{attr.label}</td>
                    <td className="px-2 py-1.5">
                      <NumInput
                        className="w-20"
                        value={driverAttrs[attr.key]}
                        onChange={v => updateDriverAttr(attr.key, v)}
                        min={attr.min}
                        max={attr.max}
                      />
                    </td>
                  </tr>
                ))}
                <tr className="border-t bg-muted/50 font-medium">
                  <td className="px-2 py-2">Total</td>
                  <td className="px-2 py-2">
                    {driverTotal != null ? driverTotal.toFixed(2) : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        </div>
      </div>
    </div>
  )
}