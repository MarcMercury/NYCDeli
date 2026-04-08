import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { UserRole, UserProfileRow } from '@/types/database'

/**
 * Auth check for API route handlers. Returns user or a 401 Response.
 * Usage: const authResult = await requireAuthAPI(); if (authResult instanceof Response) return authResult;
 */
export async function requireAuthAPI(): Promise<{ user: { id: string; email?: string }; profile: UserProfileRow } | Response> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: UserProfileRow | null }

  if (!profile || profile.role === 'pending') {
    return Response.json({ error: 'Account not approved' }, { status: 403 })
  }

  return { user, profile }
}

export async function getSession() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getUserProfile(): Promise<UserProfileRow | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: UserProfileRow | null }

  return data
}

export async function requireAuth() {
  const user = await getSession()
  if (!user) {
    redirect('/login')
  }
  return user
}

export async function requireRole(requiredRole: UserRole) {
  const user = await requireAuth()
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: UserProfileRow | null }

  if (!profile) {
    redirect('/login')
  }

  if (requiredRole === 'admin' && profile.role !== 'admin') {
    redirect('/')
  }

  if (requiredRole === 'builder' && profile.role !== 'builder' && profile.role !== 'admin') {
    redirect('/')
  }

  if (requiredRole === 'user' && profile.role === 'pending') {
    redirect('/pending')
  }

  return { user, profile }
}

export async function requireApproved() {
  return requireRole('user')
}

export async function requireBuilder() {
  return requireRole('builder')
}

export async function requireAdmin() {
  return requireRole('admin')
}
