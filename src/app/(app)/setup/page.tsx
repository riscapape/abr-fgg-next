import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { SetupPlanner } from '@/components/setup/setup-planner'
import { mapCar, mapDriver, mapTrack } from '@/lib/gpro/mappers'
import type { Weather } from '@/lib/gpro/formulas'

export default async function SetupPage() {
  const supabase = await createClient()

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [carRes, driverRes, raceRes] = await Promise.all([
    supabase.from('cars').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('drivers').select('*').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('race_data')
      .select(
        'q1_temp, q1_weather, q2_temp, q2_weather, race_temp, race_weather, track:tracks(*), practice_laps'
      )
      .eq('user_id', user.id)
      .maybeSingle()
  ])

  const trackRow = (raceRes.data as any)?.track

  if (!carRes.data || !driverRes.data || !trackRow || !raceRes.data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Setup</h1>
        <Card>
          <CardContent className="space-y-3 pt-6 text-sm text-muted-foreground">
            <p>
              Selecione a pista e preencha as temperaturas/climas na página de
              Dados para calcular o setup.
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
        <h1 className="text-2xl font-semibold">Setup</h1>
        <p className="text-sm text-muted-foreground">
          Setup completo para Q1, Q2 e Corrida, com ajuste de asas.
        </p>
      </div>

      <SetupPlanner
        car={mapCar(carRes.data)}
        driver={mapDriver(driverRes.data)}
        track={mapTrack(trackRow)}
        q1Temp={Number(raceRes.data.q1_temp ?? 0)}
        q1Weather={(raceRes.data.q1_weather ?? 'seco') as Weather}
        q2Temp={Number(raceRes.data.q2_temp ?? 0)}
        q2Weather={(raceRes.data.q2_weather ?? 'seco') as Weather}
        raceTemp={Number(raceRes.data.race_temp ?? 0)}
        raceWeather={(raceRes.data.race_weather ?? 'seco') as Weather}
        practiceLaps={(raceRes.data as any)?.practice_laps ?? null}
      />
    </div>
  )
}