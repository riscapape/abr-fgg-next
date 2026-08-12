import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { LoginForm } from '@/components/auth/login-form'

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const isDisabled = params.error === 'disabled'

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">ABR-FGG</CardTitle>
        <CardDescription>Faça login para acessar o sistema</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {isDisabled && (
          <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            Conta desativada. Entre em contato com o administrador do sistema.
          </div>
        )}

        <LoginForm />

        <div className="text-sm">
          <Link
            href="/forgot-password"
            className="text-primary underline-offset-4 hover:underline"
          >
            Esqueci minha senha
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}