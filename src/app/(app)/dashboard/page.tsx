import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { CAR_PARTS } from '@/lib/gpro/constants'
import { cn } from '@/lib/utils'

const DAY_MS = 86_400_000

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function parseDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`)
}

function formatFull(d: Date): string {
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

function daysLabel(days: number): string {
  if (days < 0) return 'Concluída'
  if (days === 0) return 'É hoje!'
  if (days === 1) return 'Falta 1 dia'
  return `Faltam ${days} dias`
}

function wearClass(wear: number): string {
  if (wear >= 70) return 'border-red-500 text-red-600'
  if (wear >= 40) return 'border-amber-500 text-amber-600'
  return 'border-green-500 text-green-600'
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value ?? '—'}</p>
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [profileRes, seasonRes, carRes, driverRes, raceDataRes] =
    await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
      supabase
        .from('seasons')
        .select('id, number, name, test_track:tracks(name)')
        .eq('is_active', true)
        .maybeSingle(),
      supabase.from('cars').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('drivers').select('*').eq('user_id', user.id).maybeSingle(),
      supabase
        .from('race_data')
        .select('track:tracks(name), tire:tires(name)')
        .eq('user_id', user.id)
        .maybeSingle()
    ])

  const season = seasonRes.data
  const car = carRes.data
  const driver = driverRes.data

  let races: any[] = []
  if (season) {
    const racesRes = await supabase
      .from('season_races')
      .select(
        'race_number, race_date, track:tracks(id, name, country, power_req, handling_req, acceleration_req, downforce, overtaking, tire_wear, pit_lane_time, corners)'
      )
      .eq('season_id', season.id)
      .order('race_number', { ascending: true })
    races = racesRes.data ?? []
  }

  const today = startOfToday()

  const nextRace =
    races.find(r => r.race_date && parseDate(r.race_date) >= today) ?? null

  const nextDays = nextRace?.race_date
    ? Math.round((parseDate(nextRace.race_date).getTime() - today.getTime()) / DAY_MS)
    : null

  // ===== Resumo do carro =====
  const levels = CAR_PARTS.map(p => Number(car?.[`${p.key}_lvl`] ?? 0))
  const avgLevel = levels.length
    ? (levels.reduce((a, b) => a + b, 0) / levels.length).toFixed(1)
    : '0'

  const mostWorn = CAR_PARTS.map(p => ({
    label: p.label,
    wear: Number(car?.[`${p.key}_wear`] ?? 0)
  }))
    .sort((a, b) => b.wear - a.wear)
    .slice(0, 4)

  const hasCriticalWear = mostWorn.some(w => w.wear >= 70)

  return (
    <div className="space-y-6">
      {/* ===== Cabeçalho ===== */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            Olá, {profileRes.data?.full_name || 'Manager'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {season
              ? `Temporada ${season.number} • Corrida ${nextRace?.race_number ?? '—'} de ${races.length}`
              : 'Nenhuma temporada ativa'}
          </p>
        </div>
        <Link href="/dados" className={buttonVariants()}>
          Editar Dados
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ===== Próxima corrida ===== */}
        <Card className="lg:col-span-2">
          {nextRace ? (
            <>
              <CardHeader>
                <CardDescription>
                  Próxima corrida • Corrida {nextRace.race_number}
                </CardDescription>
                <CardTitle className="text-3xl">
                  {nextRace.track?.name}
                </CardTitle>
                <CardDescription>
                  {nextRace.track?.country} • {formatFull(parseDate(nextRace.race_date))} •{' '}
                  <span className="font-semibold text-foreground">
                    {nextDays != null ? daysLabel(nextDays) : ''}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat label="Potência" value={nextRace.track?.power_req} />
                  <Stat label="Dirigibilidade" value={nextRace.track?.handling_req} />
                  <Stat label="Aceleração" value={nextRace.track?.acceleration_req} />
                  <Stat label="Curvas" value={nextRace.track?.corners} />
                  <Stat label="Downforce" value={nextRace.track?.downforce} />
                  <Stat label="Ultrapassagem" value={nextRace.track?.overtaking} />
                  <Stat label="Desgaste de pneus" value={nextRace.track?.tire_wear} />
                  <Stat label="Tempo do pit" value={`${nextRace.track?.pit_lane_time}s`} />
                </div>

                <Separator className="my-4" />

                <div className="flex flex-wrap gap-2 text-sm">
                  <Badge variant="outline">
                   Pista selecionada: {(raceDataRes.data as any)?.track?.name ?? '—'}
                  </Badge>
                  <Badge variant="outline">
                   Pneu selecionado: {(raceDataRes.data as any)?.tire?.name ?? '—'}
                  </Badge>
                  <Badge variant="outline">
                    Pista de testes: {(season as any)?.test_track?.name ?? '—'}
                  </Badge>
                </div>
              </CardContent>
            </>
          ) : (
            <CardHeader>
              <CardTitle>Próxima corrida</CardTitle>
              <CardDescription>
                {season
                  ? 'Nenhuma corrida futura agendada.'
                  : 'Nenhuma temporada ativa. O owner pode criar uma em Administração → Temporadas.'}
              </CardDescription>
            </CardHeader>
          )}
        </Card>

        {/* ===== Piloto ===== */}
        <Card>
          <CardHeader>
            <CardTitle>Piloto</CardTitle>
            <CardDescription>Resumo dos atributos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-md border p-3">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-2xl font-semibold">
                {driver?.total != null ? Number(driver.total).toFixed(2) : '—'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Stat label="Concentração" value={driver?.concentration ?? '—'} />
              <Stat label="Talento" value={driver?.talent ?? '—'} />
              <Stat label="Experiência" value={driver?.experience ?? '—'} />
              <Stat label="Resistência" value={driver?.endurance ?? '—'} />
              <Stat
                label="Peso"
                value={driver?.weight_kg != null ? `${driver.weight_kg} kg` : '—'}
              />
              <Stat label="Idade" value={driver?.age ?? '—'} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ===== Carro ===== */}
        <Card>
          <CardHeader>
            <CardTitle>Carro</CardTitle>
            <CardDescription>
              Nível médio das peças: {avgLevel}
              {hasCriticalWear && (
                <Badge variant="outline" className="ml-2 border-red-500 text-red-600">
                  Atenção ao desgaste!
                </Badge>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">Peças com maior desgaste</p>
            {mostWorn.map(w => (
              <div
                key={w.label}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span>{w.label}</span>
                <Badge variant="outline" className={wearClass(w.wear)}>
                  {w.wear.toFixed(1)}%
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ===== Calendário ===== */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Calendário da Temporada {season?.number ?? ''}</CardTitle>
            <CardDescription>Corridas às terças e sextas</CardDescription>
          </CardHeader>
          <CardContent>
            {races.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma corrida cadastrada.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {races.map(r => {
                  const d = r.race_date ? parseDate(r.race_date) : null
                  const days = d
                    ? Math.round((d.getTime() - today.getTime()) / DAY_MS)
                    : null
                  const isNext = nextRace && r.race_number === nextRace.race_number

                  return (
                    <div
                      key={r.race_number}
                      className={cn(
                        'flex items-center justify-between rounded-md border px-3 py-2 text-sm',
                        isNext && 'border-primary bg-primary/5',
                        days != null && days < 0 && 'opacity-60'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 text-xs text-muted-foreground">
                          {String(r.race_number).padStart(2, '0')}
                        </span>
                        <span className="font-medium">{r.track?.name}</span>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        {d
                          ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                          : '—'}
                        <span className="block">
                          {days != null ? daysLabel(days) : ''}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}