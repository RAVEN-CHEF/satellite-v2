import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PUBLIC_ROUTES  = ['/login']
const API_ROUTES     = ['/api/']
const ADMIN_ROUTES   = ['/dashboard/admin']
const PROTECTED_BASE = '/dashboard'

export async function middleware(request) {
  const { pathname } = request.nextUrl

  // ── Bypass public routes ────────────────────────────────────────────────
  if (PUBLIC_ROUTES.some(r => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  // ── Build supabase SSR client (reads cookies, refreshes session) ─────────
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll:  () => request.cookies.getAll(),
        setAll:  (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // ── Protect dashboard routes ─────────────────────────────────────────────
  if (pathname.startsWith(PROTECTED_BASE)) {
    if (!user) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // ── Protect API routes (require authenticated user) ───────────────────────
  if (pathname.startsWith('/api/')) {
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
  }

  // ── Protect admin routes (require admin or raven role) ────────────────────
  if (ADMIN_ROUTES.some(r => pathname.startsWith(r))) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const ravenEmail = process.env.RAVEN_EMAIL
    const isRaven    = user.email === ravenEmail
    const isAdmin    = profile?.role === 'admin'

    if (!isRaven && !isAdmin) {
      const dashUrl = request.nextUrl.clone()
      dashUrl.pathname = '/dashboard'
      return NextResponse.redirect(dashUrl)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
