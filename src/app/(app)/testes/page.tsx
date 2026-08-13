import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { TestesPlanner } from '@/components/testes/testes-planner'
import { mapCar, mapDriver, mapTrack, mapTire } from '@/lib/gpro/mappers'

export default async function TestesPage() {
  const supabase = await createClient()

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [carRes, driverRes, seasonRes, raceRes, tiresRes] = await Promise.all([
    supabase.from('cars').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('drivers').select('*').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('seasons')
      .select('id, test_track:tracks(*)')
      .eq('is_active', true)
      .maybeSingle(),
    supabase
      .from('race_data')
      .select('tire:tires(*)')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase.from('tires').select('*').order('name')
  ])

  const testTrackRow = (seasonRes.data as any)?.test_track
  const tireRow = (raceRes.data as any)?.tire ?? tiresRes.data?.[0]

  if (!carRes.data || !driverRes.data || !testTrackRow || !tireRow) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Testes</h1>
        <Card>
          <CardContent className="space-y-3 pt-6 text-sm text-muted-foreground">
            <p>
              Configure a temporada (pista de testes) e seus dados para simular
              os testes.
            </p>
            <Link href="/dados" className={buttonVariants()}>
              Ir para Dados
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Testes</h1>
        <p className="text-sm text-muted-foreground">
          Simule o stint de testes: setup, combustível e desgaste dos pneus.
        </p>
      </div>

      <TestesPlanner
        car={mapCar(carRes.data)}
        driver={mapDriver(driverRes.data)}
        testTrack={mapTrack(testTrackRow)}
        tire={mapTire(tireRow)}
      />
    </div>
  )
}