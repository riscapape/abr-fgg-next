import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TdMarketPlanner } from '@/components/mercado/td-market-planner'

export default async function MercadoDtPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Mercado de Diretores Técnicos</h1>
        <p className="text-sm text-muted-foreground">
          Filtre e ordene os DTs disponíveis no mercado do GPRO.
        </p>
      </div>
      <TdMarketPlanner />
    </div>
  )
}