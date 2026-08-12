'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { toast } from 'sonner'
import { createUser } from '@/lib/actions/admin'

export function CreateUserForm() {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    try {
      await createUser(formData)
      toast.success('Usuário criado com sucesso!')
      
      // Limpa o formulário
      const form = document.getElementById('create-user-form') as HTMLFormElement
      if (form) form.reset()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar usuário.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar Novo Usuário</CardTitle>
        <CardDescription>
          Adicione um novo manager ao sistema. O usuário receberá um email com as credenciais.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="create-user-form" action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nome Completo</Label>
            <Input
              id="full_name"
              name="full_name"
              placeholder="João Silva"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="joao@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha Temporária</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              required
              minLength={8}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Criando...' : 'Criar Usuário'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}