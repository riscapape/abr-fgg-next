import { MarketPlanner } from '@/components/mercado/market-planner'

export default function MercadoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Mercado de Pilotos</h1>
        <p className="text-sm text-muted-foreground">
          Filtre e ordene os pilotos disponíveis no mercado do GPRO. Dados salvos no seu navegador.
        </p>
      </div>
      <MarketPlanner />
    </div>
  )
}