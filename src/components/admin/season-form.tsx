'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { toast } from 'sonner'
import { createSeason } from '@/lib/actions/admin'
import { computeRaceDates, formatRaceDate } from '@/lib/gpro/season'

const RACE_COUNT = 17

export function SeasonForm({
  tracks,
  defaultRaces,
  defaultTestTrack,
  nextNumber
}: {
  tracks: { id: string; name: string }[]
  defaultRaces: string[]
  defaultTestTrack: string
  nextNumber: number
}) {
  const [startDate, setStartDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [races, setRaces] = useState<string[]>(() =>
    Array.from({ length: RACE_COUNT }, (_, i) => defaultRaces[i] ?? '')
  )

  // Datas calculadas ao vivo conforme a data inicial
  const dates = useMemo(
    () => (startDate ? computeRaceDates(startDate, RACE_COUNT) : []),
    [startDate]
  )

  function updateRace(index: number, value: string) {
    setRaces(prev => prev.map((r, i) => (i === index ? value : r)))
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    try {
      await createSeason(formData)
      toast.success('Temporada criada com sucesso!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar temporada.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nova Temporada</CardTitle>
        <CardDescription>
          Defina a data da 1ª corrida e as datas seguintes são calculadas
          automaticamente (terças e sextas).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="number">Número da temporada</Label>
              <Input
                id="number"
                name="number"
                type="number"
                min={1}
                defaultValue={nextNumber}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Data da 1ª corrida</Label>
              <Input
                id="start_date"
                name="start_date"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="test_track_id">Pista de testes</Label>
              <select
                id="test_track_id"
                name="test_track_id"
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                defaultValue={defaultTestTrack}
                required
              >
                <option value="">Selecione...</option>
                {tracks.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Calendário (17 corridas)</Label>
            <div className="grid gap-2">
              {Array.from({ length: RACE_COUNT }, (_, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3"
                >
                  <span className="text-sm font-medium text-muted-foreground">
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  <select
                    name={`race_${i + 1}`}
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={races[i]}
                    onChange={e => updateRace(i, e.target.value)}
                    required
                  >
                    <option value="">Selecione a pista...</option>
                    {tracks.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>

                  <span className="w-36 text-right text-sm text-muted-foreground">
                    {dates[i] ? formatRaceDate(dates[i]) : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="activate" defaultChecked className="h-4 w-4" />
            Ativar esta temporada (desativa as demais)
          </label>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Criando...' : 'Criar Temporada'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}