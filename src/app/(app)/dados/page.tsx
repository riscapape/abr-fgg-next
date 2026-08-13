import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DadosForm } from '@/components/dados/dados-form'

export default async function DadosPage() {
  const supabase = await createClient()

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [raceRes, carRes, driverRes, tiresRes, seasonRes] = await Promise.all([
    supabase
      .from('race_data')
      .select('*, track:tracks(*), tire:tires(*)')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase.from('cars').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('drivers').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('tires').select('id, name').order('name'),
    supabase.from('seasons').select('id').eq('is_active', true).maybeSingle()
  ])

  // ===== Pistas da temporada ativa, na ordem das corridas (1–17) =====
  let tracks: { id: string; name: string; race_number?: number }[] = []

  if (seasonRes.data) {
    const racesRes = await supabase
      .from('season_races')
      .select('race_number, track:tracks(id, name)')
      .eq('season_id', seasonRes.data.id)
      .order('race_number', { ascending: true })

    tracks = (racesRes.data ?? []).map((r: any) => ({
      id: r.track?.id ?? '',
      name: r.track?.name ?? '',
      race_number: r.race_number
    }))
  }

  // Fallback: sem temporada ativa, lista todas as pistas
  if (tracks.length === 0) {
    const allRes = await supabase.from('tracks').select('id, name').order('name')
    tracks = (allRes.data ?? []).map((t: any) => ({ id: t.id, name: t.name }))
  }

  const defaultTrackId =
    tracks.find(t => t.race_number === 1)?.id ?? tracks[0]?.id ?? ''

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dados</h1>
        <p className="text-sm text-muted-foreground">
          Preencha os dados da corrida, do carro e do piloto e salve tudo de uma vez.
        </p>
      </div>

      <DadosForm
        userId={user.id}
        tracks={tracks}
        tires={tiresRes.data ?? []}
        defaultTrackId={defaultTrackId}
        car={carRes.data}
        driver={driverRes.data}
        race={raceRes.data}
      />
    </div>
  )
}