'use client'

import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  calculateWings,
  calculateEngine,
  calculateBrakes,
  calculateGearbox,
  calculateSuspension,
  dryConsumption,
  wetConsumption,
  superSoftDurability,
  softDurability,
  mediumDurability,
  hardDurability,
  wetDurability,
  type CarFormula,
  type DriverFormula,
  type TrackFormula,
  type TireFormula,
  type Weather
} from '@/lib/gpro/formulas'
import { cn } from '@/lib/utils'

export function TestesPlanner({
  car,
  driver,
  testTrack,
  tire
}: {
  car: CarFormula
  driver: DriverFormula
  testTrack: TrackFormula
  tire: TireFormula
}) {
  const [tempStr, setTempStr] = useState('0')
  const [clima, setClima] = useState<Weather>('seco')
  const [voltasStr, setVoltasStr] = useState('0')

  const temperature = useMemo(() => {
    const n = parseFloat(tempStr)
    return Number.isNaN(n) ? 0 : Math.min(50, Math.max(-50, n))
  }, [tempStr])

  const voltas = useMemo(() => {
    const n = parseInt(voltasStr, 10)
    return Number.isNaN(n) ? 0 : Math.min(50, Math.max(0, n))
  }, [voltasStr])

  // ===== Setup do stint =====
  const setupParams = {
    track: testTrack,
    temperature,
    weather: clima,
    driver,
    car
  }

  const asas = calculateWings(setupParams)
  const motor = calculateEngine(setupParams)
  const freios = calculateBrakes(setupParams)
  const cambio = calculateGearbox(setupParams)
  const suspensao = calculateSuspension(setupParams)

  // ===== Combustível do stint =====
  const consumption = { track: testTrack, car }

  const combSeco = Math.ceil(
    ((dryConsumption(consumption) * testTrack.distance_km) / testTrack.laps) *
      (voltas + 1)
  )
  const combChuva = Math.ceil(
    ((wetConsumption(consumption) * testTrack.distance_km) / testTrack.laps) *
      (voltas + 1)
  )

  // ===== Desgaste final dos pneus (risco 82, voltas + 1) =====
  const durParams = { track: testTrack, tire, temperature, driver, car }
  const kmRodados = testTrack.lap_length_km * (voltas + 1)

  const tiresWear = [
    { name: 'Supermacio', dur: superSoftDurability(durParams, 82) },
    { name: 'Macio', dur: softDurability(durParams, 82) },
    { name: 'Médio', dur: mediumDurability(durParams, 82) },
    { name: 'Duro', dur: hardDurability(durParams, 82) },
    { name: 'Chuva (na chuva)', dur: wetDurability(durParams, 82) }
  ].map(t => ({ ...t, wear: (1 - kmRodados / t.dur) * 100 }))

  return (
    <div className="space-y-6">
      {/* ===== Topo ===== */}
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div className="space-y-1">
          <span className="text-sm font-medium">Pista de Testes</span>
          <div className="flex h-9 items-center rounded-md border bg-muted/30 px-3 text-sm">
            {testTrack.name}
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-sm font-medium">Pneu</span>
          <div className="flex h-9 items-center rounded-md border bg-muted/30 px-3 text-sm">
            {tire.name}
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-sm font-medium">Temperatura</span>
          <Input
            type="number"
            min={-50}
            max={50}
            className="h-9 w-full"
            value={tempStr}
            onChange={e => setTempStr(e.target.value)}
            onBlur={() => tempStr === '' && setTempStr('0')}
          />
        </div>

        <div className="space-y-1">
          <span className="text-sm font-medium">Clima</span>
          <select
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            value={clima}
            onChange={e => setClima(e.target.value as Weather)}
          >
            <option value="seco">Seco</option>
            <option value="chuva">Chuva</option>
          </select>
        </div>

        <div className="space-y-1">
          <span className="text-sm font-medium">Voltas do stint</span>
          <Input
            type="number"
            min={0}
            max={50}
            className="h-9 w-full"
            value={voltasStr}
            onChange={e => setVoltasStr(e.target.value)}
            onBlur={() => voltasStr === '' && setVoltasStr('0')}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ===== Setup do stint ===== */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Setup do stint</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-2 py-2 text-center">Temp.</th>
                  <th className="px-2 py-2 text-center">Clima</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="px-2 py-2 text-center">{temperature}°C</td>
                  <td className="px-2 py-2 text-center">{clima}</td>
                </tr>
                <tr className="border-b bg-muted/50">
                  <th className="px-2 py-2 text-center">Peça</th>
                  <th className="px-2 py-2 text-center">Ajuste</th>
                </tr>
                <tr className="border-b">
                  <td className="px-2 py-2 text-center">Asa Diant.</td>
                  <td className="px-2 py-2 text-center">{asas}</td>
                </tr>
                <tr className="border-b">
                  <td className="px-2 py-2 text-center">Asa Tras.</td>
                  <td className="px-2 py-2 text-center">{asas}</td>
                </tr>
                <tr className="border-b">
                  <td className="px-2 py-2 text-center">Motor</td>
                  <td className="px-2 py-2 text-center">{motor}</td>
                </tr>
                <tr className="border-b">
                  <td className="px-2 py-2 text-center">Freios</td>
                  <td className="px-2 py-2 text-center">{freios}</td>
                </tr>
                <tr className="border-b">
                  <td className="px-2 py-2 text-center">Câmbio</td>
                  <td className="px-2 py-2 text-center">{cambio}</td>
                </tr>
                <tr>
                  <td className="px-2 py-2 text-center">Suspensão</td>
                  <td className="px-2 py-2 text-center">{suspensao}</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* ===== Combustível do stint ===== */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Combustível do stint</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-2 py-2 text-center">Quantidade</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-2 py-2 text-center">
                    {clima === 'chuva' ? combChuva : combSeco} lts
                  </td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* ===== Desgaste final dos pneus ===== */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Desgaste final dos pneus</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-2 py-2 text-left">Pneu</th>
                  <th className="px-2 py-2 text-center">Desgaste</th>
                </tr>
              </thead>
              <tbody>
                {tiresWear.map(t => (
                  <tr key={t.name} className="border-b last:border-0">
                    <td className="px-2 py-2">{t.name}</td>
                    <td
                      className={cn(
                        'px-2 py-2 text-center',
                        t.wear < 0 && 'font-semibold text-red-600'
                      )}
                    >
                      {t.wear.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}