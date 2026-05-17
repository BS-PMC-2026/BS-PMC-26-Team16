import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED = ['/map', '/User', '/admin']

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isProtected = PROTECTED.some(p => pathname === p || pathname.startsWith(p + '/'))
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)

  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  if (!isProtected) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.nextUrl))
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_approved, user_type')
    .eq('id', user.id)
    .single()

  const canAccess = profile?.user_type === 'admin' || profile?.is_approved === true

  if (!canAccess) {
    return NextResponse.redirect(new URL('/login', request.nextUrl))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
