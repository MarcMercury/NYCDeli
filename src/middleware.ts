import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that don't require auth at all
const publicRoutes = ['/', '/login', '/register', '/pending', '/api/auth']

// Routes that require admin role
const adminRoutes = ['/admin']

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

export async function middleware(request: NextRequest) {
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

  // Refresh the session
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Public routes: allow through
  if (isPublicRoute(pathname)) {
    return supabaseResponse
  }

  // Static assets and API routes (non-auth) pass through
  if (pathname.startsWith('/_next') || pathname.startsWith('/Images') || pathname.includes('.')) {
    return supabaseResponse
  }

  // No user? Redirect to login
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Check user profile for role-based access
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Pending users can only see /pending and public routes
  if (profile?.role === 'pending' && pathname !== '/pending' && pathname !== '/intake') {
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

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|Images/).*)',
  ],
}
