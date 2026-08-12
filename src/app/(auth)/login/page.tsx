import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">ABR-FGG</CardTitle>
        <CardDescription>Faça login para acessar o sistema</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
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