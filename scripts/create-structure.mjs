import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

const dirs = [
  'src/app/(auth)/login',
  'src/app/(auth)/forgot-password',
  'src/app/(auth)/update-password',
  'src/app/(app)/account/profile',
  'src/app/(app)/admin/users',
  'src/app/(app)/car',
  'src/app/(app)/dashboard',
  'src/app/(app)/driver',
  'src/app/auth/callback',
  'src/components/account',
  'src/components/auth',
  'src/components/layout',
  'src/lib/actions',
  'src/lib/supabase',
  'src/lib/validators',
  'src/types'
]

for (const dir of dirs) {
  const fullPath = path.join(root, dir)
  fs.mkdirSync(fullPath, { recursive: true })
  console.log(`Pasta criada: ${dir}`)
}

console.log('Estrutura criada com sucesso.')