import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TelemetryBrowser } from '@/components/telemetrias/telemetry-browser'

export default async function TelemetriasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [telRes, profilesRes, tracksRes] = await Promise.all([
        supabase.from('race_telemetry').select('*').order('collected_at', { ascending: false }),
    supabase.from('profiles').select('*'),
    supabase.from('tracks').select('name, lap_length_km')
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Telemetrias</h1>
        <p className="text-sm text-muted-foreground">
          Corridas coletadas por todos os managers — clique em uma linha para o detalhe completo.
        </p>
      </div>
      <TelemetryBrowser
        rows={telRes.data ?? []}
        profiles={profilesRes.data ?? []}
        tracks={tracksRes.data ?? []}
      />
    </div>
  )
}