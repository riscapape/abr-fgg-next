'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { saveTestData } from '@/lib/actions/testes'
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
  tire,
  initialTemp,
  initialWeather
}: {
  car: CarFormula
  driver: DriverFormula
  testTrack: TrackFormula
  tire: TireFormula
  initialTemp: string
  initialWeather: Weather
}) {
  // Defaults vêm do race_data (test_temp / test_weather); se nunca salvou → 0 / seco
  const [tempStr, setTempStr] = useState(initialTemp)
  const [climate, setClimate] = useState<Weather>(initialWeather)
  const [voltasStr, setVoltasStr] = useState('0')
  const [saving, setSaving] = useState(false)

  const temperature = useMemo(() => {
    const n = parseFloat(tempStr)
    return Number.isNaN(n) ? 0 : Math.min(50, Math.max(-50, n))
  }, [tempStr])

  const voltas = useMemo(() => {
    const n = parseInt(voltasStr, 10)
    return Number.isNaN(n) ? 0 : Math.min(50, Math.max(0, n))
  }, [voltasStr])

  // ===== Setup do stint =====
  const setupParams = { track: testTrack, temperature, weather: climate, driver, car }
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

  // ===== Desgaste final dos pneus (risco 82, como no original) =====
  const durParams = { track: testTrack, tire, temperature, driver, car }
  const lapKm = testTrack.lap_length_km * (voltas + 1)
  const tireWear = [
    { name: 'Supermacio', wear: (1 - lapKm / superSoftDurability(durParams, 82)) * 100 },
    { name: 'Macio', wear: (1 - lapKm / softDurability(durParams, 82)) * 100 },
    { name: 'Médio', wear: (1 - lapKm / mediumDurability(durParams, 82)) * 100 },
    { name: 'Duro', wear: (1 - lapKm / hardDurability(durParams, 82)) * 100 },
    { name: 'Chuva (na chuva)', wear: (1 - lapKm / wetDurability(durParams, 82)) * 100 }
  ]

  async function handleSaveTest() {
    setSaving(true)
    try {
      const fd = new FormData()
      fd.set('test_temp', tempStr === '' ? '0' : tempStr)
      fd.set('test_weather', climate)
      await saveTestData(fd)
      toast.success('Dados do teste salvos.')
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar dados do teste.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ===== Topo: campos + salvar ===== */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <span className="text-sm font-medium">Pista de Testes</span>
          <div className="flex h-8 items-center rounded-md border bg-muted/30 px-3 text-sm">
            {testTrack.name}
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-sm font-medium">Pneu</span>
          <div className="flex h-8 items-center rounded-md border bg-muted/30 px-3 text-sm">
            {tire.name}
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-sm font-medium">Temperatura</span>
          <Input
            type="number"
            min={-50}
            max={50}
            step={0.1}
            className="h-8 w-24"
            value={tempStr}
            onChange={e => setTempStr(e.target.value)}
            onBlur={() => tempStr === '' && setTempStr('0')}
          />
        </div>

        <div className="space-y-1">
          <span className="text-sm font-medium">Clima</span>
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            value={climate}
            onChange={e => setClimate(e.target.value as Weather)}
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
            className="h-8 w-20"
            value={voltasStr}
            onChange={e => setVoltasStr(e.target.value)}
            onBlur={() => voltasStr === '' && setVoltasStr('0')}
          />
        </div>

        <Button variant="outline" onClick={handleSaveTest} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar dados do teste'}
        </Button>
      </div>

      {/* ===== Tabelas ===== */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Setup do stint</CardTitle>
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
                  <td className="px-2 py-1 text-center">{temperature}°C</td>
                  <td className="px-2 py-1 text-center">{climate}</td>
                </tr>
                <tr className="border-b bg-muted/50">
                  <th className="px-2 py-1 text-center">Peça</th>
                  <th className="px-2 py-1 text-center">Ajuste</th>
                </tr>
                <tr className="border-b">
                  <td className="px-2 py-1 text-center">Asa Diant.</td>
                  <td className="px-2 py-1 text-center">{asas}</td>
                </tr>
                <tr className="border-b">
                  <td className="px-2 py-1 text-center">Asa Tras.</td>
                  <td className="px-2 py-1 text-center">{asas}</td>
                </tr>
                <tr className="border-b">
                  <td className="px-2 py-1 text-center">Motor</td>
                  <td className="px-2 py-1 text-center">{motor}</td>
                </tr>
                <tr className="border-b">
                  <td className="px-2 py-1 text-center">Freios</td>
                  <td className="px-2 py-1 text-center">{freios}</td>
                </tr>
                <tr className="border-b">
                  <td className="px-2 py-1 text-center">Câmbio</td>
                  <td className="px-2 py-1 text-center">{cambio}</td>
                </tr>
                <tr>
                  <td className="px-2 py-1 text-center">Suspensão</td>
                  <td className="px-2 py-1 text-center">{suspensao}</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Combustível do stint</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-2 py-1 text-center">Quantidade</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-2 py-1 text-center">
                    {climate === 'chuva' ? combChuva : combSeco} lts
                  </td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base">Desgaste final dos pneus</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-2 py-1 text-center">Pneu</th>
                  <th className="px-2 py-1 text-center">Desgaste</th>
                </tr>
              </thead>
              <tbody>
                {tireWear.map(t => (
                  <tr key={t.name} className="border-b last:border-0">
                    <td className="px-2 py-1">{t.name}</td>
                    <td
                      className={cn(
                        'px-2 py-1 text-center',
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