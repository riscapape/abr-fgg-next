'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveTestData(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Não autenticado.')
  }

  const { error } = await supabase.from('race_data').upsert(
    {
      user_id: user.id,
      test_temp: Number(formData.get('test_temp') ?? 0),
      test_weather: String(formData.get('test_weather') ?? 'seco')
    },
    { onConflict: 'user_id' }
  )

  if (error) throw new Error(error.message)
  revalidatePath('/testes')
}