import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { WearPlanner } from '@/components/desgaste/wear-planner'
import { mapCar, mapDriver, mapTrack } from '@/lib/gpro/mappers'
import type { TrackFormula } from '@/lib/gpro/formulas'

export default async function DesgastePage() {
  const supabase = await createClient()

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [carRes, driverRes, raceRes, seasonRes] = await Promise.all([
    supabase.from('cars').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('drivers').select('*').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('race_data')
      .select('track_id, ct_risk, pha_p, pha_h, pha_a')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('seasons')
      .select('id, test_track:tracks(*)')
      .eq('is_active', true)
      .maybeSingle()
  ])

  // Pistas da temporada ativa (ordenadas pelas corridas)
  let tracks: TrackFormula[] = []
  if (seasonRes.data) {
    const racesRes = await supabase
      .from('season_races')
      .select('race_number, track:tracks(*)')
      .eq('season_id', seasonRes.data.id)
      .order('race_number', { ascending: true })
    tracks = (racesRes.data ?? []).map((r: any) => mapTrack(r.track))
  }
  if (tracks.length === 0) {
    const allRes = await supabase.from('tracks').select('*').order('name')
    tracks = (allRes.data ?? []).map(mapTrack)
  }

  if (!carRes.data || !driverRes.data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Desgaste</h1>
        <Card>
          <CardContent className="space-y-3 pt-6 text-sm text-muted-foreground">
            <p>Preencha seus dados na página de Dados para planejar o desgaste.</p>
            <Link href="/dados" className={buttonVariants()}>
              Ir para Dados
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const testTrackRow = (seasonRes.data as any)?.test_track

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Desgaste</h1>
        <p className="text-sm text-muted-foreground">
          Planeje substituições de peças, voltas de teste e custos da corrida.
        </p>
      </div>

      <WearPlanner
        car={mapCar(carRes.data)}
        driver={mapDriver(driverRes.data)}
        tracks={tracks}
        defaultTrackId={raceRes.data?.track_id ?? tracks[0]?.id ?? ''}
        testTrack={testTrackRow ? mapTrack(testTrackRow) : null}
        phaTestes={{
          p: Number(raceRes.data?.pha_p ?? 0),
          h: Number(raceRes.data?.pha_h ?? 0),
          a: Number(raceRes.data?.pha_a ?? 0)
        }}
        defaultRisk={Number(raceRes.data?.ct_risk ?? 0)}
      />
    </div>
  )
}