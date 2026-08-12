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

  const [carRes, driverRes, raceRes, tracksRes, tiresRes, seasonRes] =
    await Promise.all([
      supabase.from('cars').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('drivers').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('race_data').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('tracks').select('id, name').order('name'),
      supabase.from('tires').select('id, name').order('name'),
      supabase.from('seasons').select('id').eq('is_active', true).maybeSingle()
    ])

  // Pista padrão = 1ª corrida da temporada ativa (ex: Estoril)
  let defaultTrackId: string | null = null
  if (seasonRes.data) {
    const race1 = await supabase
      .from('season_races')
      .select('track_id')
      .eq('season_id', seasonRes.data.id)
      .order('race_number', { ascending: true })
      .limit(1)
      .maybeSingle()

    defaultTrackId = race1.data?.track_id ?? null
  }

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
        tracks={tracksRes.data ?? []}
        tires={tiresRes.data ?? []}
        defaultTrackId={defaultTrackId}
        car={carRes.data}
        driver={driverRes.data}
        race={raceRes.data}
      />
    </div>
  )
}