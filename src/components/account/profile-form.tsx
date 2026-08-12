'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export function ProfileForm({
  userId,
  initialName
}: {
  userId: string
  initialName: string
}) {
  const router = useRouter()

  const [fullName, setFullName] = useState(initialName)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!fullName.trim()) {
      toast.error('Informe o nome.')
      return
    }

    setLoading(true)

    const supabase = createClient()

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim()
      })
      .eq('id', userId)

    setLoading(false)

    if (error) {
      toast.error(`Erro ao atualizar nome: ${error.message}`)
      return
    }

    toast.success('Nome atualizado com sucesso.')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Nome</Label>
        <Input
          id="fullName"
          type="text"
          placeholder="Seu nome"
          value={fullName}
          onChange={event => setFullName(event.target.value)}
          required
        />
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? 'Salvando...' : 'Salvar nome'}
      </Button>
    </form>
  )
}