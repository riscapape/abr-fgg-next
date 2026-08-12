'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!email) {
      toast.error('Informe o email.')
      return
    }

    setLoading(true)

    const supabase = createClient()

    const redirectTo = `${window.location.origin}/auth/callback?next=/update-password`

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo
    })

    setLoading(false)

    if (error) {
      toast.error(`Erro ao enviar email: ${error.message}`)
      return
    }

    setSent(true)
    toast.success('Se a conta existir, você receberá um email.')
  }

  if (sent) {
    return (
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>
          Se existir uma conta com este email, você receberá um link para
          redefinir sua senha.
        </p>

        <Button type="button" variant="secondary" onClick={() => setSent(false)}>
          Enviar outro email
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={event => setEmail(event.target.value)}
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Enviando...' : 'Enviar link de recuperação'}
      </Button>
    </form>
  )
}