import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SeasonForm } from '@/components/admin/season-form'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default async function AdminSeasonsPage() {
  const supabase = await createClient()

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'owner') {
    redirect('/dashboard')
  }

  const [tracksRes, seasonsRes] = await Promise.all([
    supabase.from('tracks').select('id, name').order('name'),
    supabase
      .from('seasons')
      .select('id, number, name, start_date, end_date, is_active, test_track_id')
      .order('number', { ascending: false })
  ])

  const tracks = tracksRes.data ?? []
  const seasons = seasonsRes.data ?? []

  const trackName = (id: string | null) =>
    tracks.find(t => t.id === id)?.name ?? '—'

  // Pré-preenche o formulário com o calendário da temporada ativa
  const active = seasons.find(s => s.is_active)
  let defaultRaces: string[] = []
  let defaultTestTrack = ''

  if (active) {
    defaultTestTrack = active.test_track_id ?? ''
    const racesRes = await supabase
      .from('season_races')
      .select('track_id, race_number')
      .eq('season_id', active.id)
      .order('race_number')
    defaultRaces = (racesRes.data ?? []).map(r => r.track_id)
  }

  const nextNumber = (seasons[0]?.number ?? 112) + 1

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Temporadas</h1>
        <p className="text-sm text-muted-foreground">
          Crie novas temporadas com 17 corridas, pista de testes e datas
          calculadas automaticamente.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SeasonForm
            tracks={tracks}
            defaultRaces={defaultRaces}
            defaultTestTrack={defaultTestTrack}
            nextNumber={nextNumber}
          />
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Temporadas existentes</CardTitle>
              <CardDescription>Histórico de temporadas do sistema.</CardDescription>
            </CardHeader>
            <CardContent>
              {seasons.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Nenhuma temporada cadastrada.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Fim</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {seasons.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.number}</TableCell>
                        <TableCell className="text-sm">
                          {s.start_date
                            ? new Date(`${s.start_date}T00:00:00`).toLocaleDateString('pt-BR')
                            : '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {s.end_date
                            ? new Date(`${s.end_date}T00:00:00`).toLocaleDateString('pt-BR')
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              s.is_active
                                ? 'border-green-500 text-green-600'
                                : 'border-muted-foreground text-muted-foreground'
                            }
                          >
                            {s.is_active ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}