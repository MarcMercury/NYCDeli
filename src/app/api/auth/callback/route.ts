import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Record last sign-in timestamp
      if (data.user) {
        await supabase
          .from('user_profiles')
          .update({ last_sign_in_at: new Date().toISOString() } as never)
          .eq('id', data.user.id)
      }
      return NextResponse.redirect(`${origin}/pending`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
