import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SeasonPlanner } from '@/components/planejamento/season-planner'
import { mapCar, mapDriver, mapTrack } from '@/lib/gpro/mappers'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import Link from 'next/link'

export default async function PlanejamentoPage() {
  const supabase = await createClient()

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [carRes, driverRes, seasonRes] = await Promise.all([
    supabase.from('cars').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('drivers').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('seasons').select('id').eq('is_active', true).maybeSingle(),
    supabase.from('race_data').select('pha_p, pha_h, pha_a').eq('user_id', user.id).maybeSingle(),
  ])

    const raceRes = await supabase
    .from('race_data')
    .select('pha_p, pha_h, pha_a')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!carRes.data || !driverRes.data || !seasonRes.data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Planejamento</h1>
        <Card>
          <CardContent className="space-y-3 pt-6 text-sm text-muted-foreground">
            <p>Configure a temporada ativa e seus dados para planejar.</p>
            <Link href="/dados" className={buttonVariants()}>
              Ir para Dados
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const [racesRes, plansRes] = await Promise.all([
    supabase
      .from('season_races')
      .select('race_number, race_date, track:tracks(*)')
      .eq('season_id', seasonRes.data.id)
      .order('race_number', { ascending: true }),
    supabase
      .from('season_plan_races')
      .select('*')
      .eq('user_id', user.id)
      .eq('season_id', seasonRes.data.id)
  ])

  const races = (racesRes.data ?? []).map((r: any) => ({
    race_number: r.race_number,
    race_date: r.race_date ?? '',
    track: mapTrack(r.track)
  }))

  const savedPlans: Record<number, any> = {}
  for (const p of plansRes.data ?? []) {
    savedPlans[p.race_number] = p
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Planejamento da temporada</h1>
        <p className="text-sm text-muted-foreground">
          Simule substituições de peças corrida a corrida. Corridas anteriores
          ficam desabilitadas automaticamente.
        </p>
      </div>

      <SeasonPlanner
        userId={user.id}
        seasonId={seasonRes.data.id}
        car={mapCar(carRes.data)}
        driver={mapDriver(driverRes.data)}
        races={races}
        savedPlans={savedPlans}
        phaTestes={{
          p: Number(raceRes.data?.pha_p ?? 0),
          h: Number(raceRes.data?.pha_h ?? 0),
          a: Number(raceRes.data?.pha_a ?? 0)
        }}
      />
    </div>
  )
}