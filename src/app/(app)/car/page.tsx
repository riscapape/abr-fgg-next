import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'

export default function CarPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Carro</CardTitle>
        <CardDescription>
          Aqui você vai gerenciar nível e desgaste das peças.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground">
          Página do carro em construção.
        </p>
      </CardContent>
    </Card>
  )
}