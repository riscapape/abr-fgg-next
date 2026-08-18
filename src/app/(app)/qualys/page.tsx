import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { TreinosPlanner } from '@/components/treinos/treinos-planner'
import { mapCar, mapDriver, mapTrack } from '@/lib/gpro/mappers'
import type { Weather } from '@/lib/gpro/formulas'

export default async function TreinosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

    const [carRes, driverRes, raceRes] = await Promise.all([
    supabase.from('cars').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('drivers').select('*').eq('user_id', user.id).maybeSingle(),
    supabase
      .from('race_data')
      .select('practice_laps, air_temp, q2_temp, q2_weather, race_temp, race_weather, track:tracks(*)')
      .eq('user_id', user.id)
      .maybeSingle()
  ])

  const trackRow = (raceRes.data as any)?.track
  const raw = (raceRes.data as any)?.practice_laps

  const laps: any[] = []
  if (raw && typeof raw === 'object') {
    for (let i = 1; i <= 8; i++) {
      const l = (raw as any)[`lap_${i}`]
      if (!l) continue
      const net = Number(l.net_time ?? 0)
      if (!net) continue
      laps.push({
        volta: i,
        lapTime: Number(l.lap_time ?? 0),
        driverError: Number(l.driver_error ?? 0),
        netTime: net,
        fw: Number(l.fw ?? 0),
        rw: Number(l.rw ?? 0),
        engine: Number(l.engine ?? 0),
        brakes: Number(l.brakes ?? 0),
        gear: Number(l.gear ?? 0),
        susp: Number(l.susp ?? 0),
        tyreName: String(l.tyre_name ?? ''),
        comment: String(l.comment ?? ''),
        comments: Array.isArray(l.comments)
          ? (l.comments as any[]).map(String)
          : l.comment
            ? [String(l.comment)]
            : []
      })
    }
  }

  if (!driverRes.data || !trackRow || laps.length === 0) {
    return (
      <div className="space-y-6">
       <h1 className="text-2xl font-semibold">Qualys</h1>
        <Card>
          <CardContent className="space-y-3 pt-6 text-sm text-muted-foreground">
            <p>
              Faça voltas de treino no GPRO e colete-as com a extensão ABR-FGG
              Collector para refinar o setup aqui.
            </p>
           <Link href="/dados" className={buttonVariants()}>Ir para Dados</Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Treinos</h1>
        <p className="text-sm text-muted-foreground">
          Refine o setup volta a volta (zona de satisfação do piloto + split de asas).
        </p>
      </div>
            <TreinosPlanner
        car={mapCar(carRes.data)}
        driver={mapDriver(driverRes.data)}
        track={mapTrack(trackRow)}
        laps={laps}
        q2Temp={Number(raceRes.data?.q2_temp ?? 0)}
        q2Weather={(raceRes.data?.q2_weather ?? 'seco') as Weather}
               raceTemp={Number(raceRes.data?.air_temp ?? 0)}
        raceWeather={(raceRes.data?.race_weather ?? 'seco') as Weather}
      />
    </div>
  )
}