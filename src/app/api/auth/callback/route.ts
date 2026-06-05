import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      let destination = '/pending'
      // Record last sign-in timestamp and route by role
      if (data.user) {
        await supabase
          .from('user_profiles')
          .update({ last_sign_in_at: new Date().toISOString() } as never)
          .eq('id', data.user.id)

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', data.user.id)
          .single() as { data: { role: string } | null }

        if (profile && profile.role !== 'pending') {
          destination = '/'
        }
      }
      return NextResponse.redirect(`${origin}${destination}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
