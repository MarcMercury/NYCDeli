import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that don't require auth at all — no Supabase calls needed
const publicRoutes = ['/', '/login', '/register', '/pending', '/intake']

// Routes that require admin role (need profile query)
const adminRoutes = ['/admin']

// Routes where pending users must be redirected (need profile query)
const roleCheckRoutes = [
  '/campers', '/ideas', '/kitchen', '/layout', '/layout-view',
  '/map', '/profile', '/resources', '/schedule', '/shift-draft',
  '/build-week', '/camp-selection',
]

function isPublicRoute(pathname: string) {
  return publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )
}

function isAdminRoute(pathname: string) {
  return adminRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  )
}

function needsRoleCheck(pathname: string) {
  return isAdminRoute(pathname) || roleCheckRoutes.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  )
}

function createSupabaseMiddlewareClient(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

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
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  return { supabase, getResponse: () => supabaseResponse }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Public routes: pass through with NO Supabase calls
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // 2. API routes handle their own auth — skip middleware entirely
  if (pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // 3. For protected routes: create client and check auth (1 Supabase call)
  const { supabase, getResponse } = createSupabaseMiddlewareClient(request)
  const { data: { user } } = await supabase.auth.getUser()

  // No user? Redirect to login
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 4. Only query user_profiles when we actually need the role
  if (needsRoleCheck(pathname)) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // Pending users can only see /pending and public routes
    if (profile?.role === 'pending' && pathname !== '/pending') {
      const url = request.nextUrl.clone()
      url.pathname = '/pending'
      return NextResponse.redirect(url)
    }

    // Admin routes require admin role
    if (isAdminRoute(pathname) && profile?.role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return getResponse()
}

export const config = {
  matcher: [
    /*
     * Match only page routes that need protection.
     * Exclude: static files, images, API routes, Next.js internals.
     */
    '/((?!_next/static|_next/image|favicon\\.ico|Images/|Files/|Campers/|api/).*)',
  ],
}
