'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export function EmailForm({ currentEmail }: { currentEmail: string }) {
  const router = useRouter()

  const [email, setEmail] = useState(currentEmail)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!email.trim()) {
      toast.error('Informe o email.')
      return
    }

    setLoading(true)

    const supabase = createClient()

    const { error } = await supabase.auth.updateUser({
      email: email.trim()
    })

    setLoading(false)

    if (error) {
      toast.error(`Erro ao atualizar email: ${error.message}`)
      return
    }

    toast.success('Email atualizado. Se necessário, confirme o novo email.')
    router.refresh()
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

      <Button type="submit" disabled={loading}>
        {loading ? 'Salvando...' : 'Salvar email'}
      </Button>
    </form>
  )
}