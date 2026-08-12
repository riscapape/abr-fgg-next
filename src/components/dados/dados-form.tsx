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
  calculateDriverTotal
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
  className
}: {
  value: string
  onChange: (v: string) => void
  className?: string
}) {
  return (
    <Input
      type="number"
      step="any"
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
  tracks: { id: string; name: string }[]
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

  // ===== Salvar tudo de uma vez =====
  async function handleSave() {
    setLoading(true)

    const carPayload: Record<string, unknown> = { user_id: userId }
    for (const p of CAR_PARTS) {
      const wear = parseNum(carParts[p.key].wear) ?? 0
      if (wear < 0 || wear > 100) {
        toast.error(`Desgaste inválido em ${p.label}. Use 0 a 100.`)
        setLoading(false)
        return
      }
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
    <div className="space-y-6">
      {/* ===== Linha superior ===== */}
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div className="space-y-1">
          <Label>Pista</Label>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
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

        <div className="space-y-1">
          <Label>Pneu</Label>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
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
          <NumInput className="w-full" value={airTemp} onChange={setAirTemp} />
        </div>

        <div className="space-y-1">
          <Label>Risco CT</Label>
          <NumInput className="w-full" value={ctRisk} onChange={setCtRisk} />
        </div>

        <div className="space-y-1">
          <Label>Tempo do pit</Label>
          <NumInput className="w-full" value={pitTime} onChange={setPitTime} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* ===== Coluna 1: Clima + PHA ===== */}
        <div className="space-y-6">
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Temperatura e Clima</h2>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-2 py-2">Q1</th>
                    <th className="px-2 py-2">Q2</th>
                    <th className="px-2 py-2">Corrida</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="px-2 py-1.5">
                      <NumInput className="w-full" value={q1Temp} onChange={setQ1Temp} />
                    </td>
                    <td className="px-2 py-1.5">
                      <NumInput className="w-full" value={q2Temp} onChange={setQ2Temp} />
                    </td>
                    <td className="px-2 py-1.5">
                      <NumInput className="w-full" value={raceTemp} onChange={setRaceTemp} />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1.5">
                      <WeatherSelect value={q1Weather} onChange={setQ1Weather} />
                    </td>
                    <td className="px-2 py-1.5">
                      <WeatherSelect value={q2Weather} onChange={setQ2Weather} />
                    </td>
                    <td className="px-2 py-1.5">
                      <WeatherSelect value={raceWeather} onChange={setRaceWeather} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">PHA dos Testes</h2>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-2 py-2">P</th>
                    <th className="px-2 py-2">H</th>
                    <th className="px-2 py-2">A</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-2 py-1.5">
                      <NumInput className="w-full" value={phaP} onChange={setPhaP} />
                    </td>
                    <td className="px-2 py-1.5">
                      <NumInput className="w-full" value={phaH} onChange={setPhaH} />
                    </td>
                    <td className="px-2 py-1.5">
                      <NumInput className="w-full" value={phaA} onChange={setPhaA} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* ===== Coluna 2: Temperaturas da corrida ===== */}
        <div className="space-y-6">
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
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="block text-xs text-muted-foreground">Max</span>
                      <NumInput
                        className="w-full"
                        value={slots[i].max}
                        onChange={v => updateSlot(i, 'max', v)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

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
        </div>

        {/* ===== Coluna 3: Carro ===== */}
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
                    <td className="px-2 py-1.5">
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
                        className="w-20"
                        value={carParts[part.key].wear}
                        onChange={v => updateCarPart(part.key, 'wear', v)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ===== Coluna 4: Piloto ===== */}
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

      {/* ===== Botão único de salvar ===== */}
      <div className="flex justify-center">
        <Button onClick={handleSave} disabled={loading} className="min-w-40">
          {loading ? 'Salvando...' : 'Salvar Dados'}
        </Button>
      </div>
    </div>
  )
}