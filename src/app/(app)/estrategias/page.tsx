import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { StrategyPlanner } from '@/components/estrategias/strategy-planner'
import { mapCar, mapDriver, mapTire, mapTrack } from '@/lib/gpro/mappers'

export default async function EstrategiasPage() {
  const supabase = await createClient()

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [raceRes, carRes, driverRes] = await Promise.all([
    supabase
      .from('race_data')
      .select('*, track:tracks(*), tire:tires(*)')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase.from('cars').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('drivers').select('*').eq('user_id', user.id).maybeSingle()
  ])

  const trackRow = raceRes.data?.track
  const tireRow = raceRes.data?.tire

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Estratégias</h1>
        <p className="text-sm text-muted-foreground">
          {trackRow
            ? `Melhor estratégia para ${trackRow.name} com ${tireRow?.name}.`
            : 'Calcule a melhor estratégia de corrida com os seus dados.'}
        </p>
      </div>

      {!raceRes.data || !trackRow || !tireRow ? (
        <Card>
          <CardContent className="space-y-3 pt-6 text-sm text-muted-foreground">
            <p>
              Selecione uma pista e um pneu na página de Dados para calcular as
              estratégias de corrida.
            </p>
            <Link href="/dados" className={buttonVariants()}>
              Ir para Dados
            </Link>
          </CardContent>
        </Card>
      ) : (
        <StrategyPlanner
  track={mapTrack(trackRow)}
  tire={mapTire(tireRow)}
  car={mapCar(carRes.data)}
  driver={mapDriver(driverRes.data)}
  initialTemperature={Number(raceRes.data.air_temp ?? 0)}
  initialCtMin={0}                                      // ← mín sempre começa em 0
  initialCtMax={Number(raceRes.data.ct_risk ?? 0)}      // ← máx = Risco CT salvo nos Dados
  initialPitTime={Number(raceRes.data.pit_time ?? 0)}
/>
      )}
    </div>
  )
}