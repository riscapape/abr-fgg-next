import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'

export default function AdminUsersPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Administração de usuários</CardTitle>
        <CardDescription>
          Aqui o owner poderá criar, listar e gerenciar usuários.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground">
          Painel administrativo em construção.
        </p>
      </CardContent>
    </Card>
  )
}