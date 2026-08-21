import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })

          response = NextResponse.next({ request })

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        }
      }
    }
  )

  const {
    data: { user }
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  const publicPaths = ['/login', '/forgot-password', '/auth/callback']
  const isPublic = publicPaths.some(path => pathname.startsWith(path))

  // Verifica se o usuário está ativo
  let isActive = true
  if (user) {
   const {
  data: profile,
  error: profileError,
} = await supabase
  .from('profiles')
  .select('is_active')
  .eq('id', user.id)
  .maybeSingle()

if (profileError) {
  console.error('Erro ao verificar perfil:', profileError)
  
  // fail closed
  isActive = false
} else {
  isActive = profile?.is_active === true
}
  }

  // Usuário desativado tentando acessar área protegida -> volta pro login
  if (user && !isActive && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = '?error=disabled'
    return NextResponse.redirect(url)
  }

  // Não logado tentando acessar área protegida -> login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // Logado e ativo no login -> dashboard
  if (user && isActive && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}