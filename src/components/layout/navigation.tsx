'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { getOpsEvent } from '@/lib/active-event'
import { hasFeature } from '@/lib/events'
import { signOut } from '@/app/actions/auth'
import type { EventFeatureKey, EventRow, UserRole } from '@/types/database'

const publicNavItems = [
  { href: '/', label: 'Home', icon: '🥪' },
  { href: '/events', label: 'Events', icon: '📅' },
  { href: '/calendar', label: 'Calendar', icon: '🗓️' },
  { href: '/intake', label: 'Register', icon: '📝' },
]

// `feature` items disappear when the current event doesn't use that module.
const baseNavItems: { href: string; label: string; icon: string; feature?: EventFeatureKey }[] = [
  { href: '/', label: 'Home', icon: '🥪' },
  { href: '/events', label: 'Events', icon: '📅' },
  { href: '/calendar', label: 'Calendar', icon: '🗓️' },
  { href: '/campers', label: 'Campers', icon: '🐀', feature: 'directory' },
  { href: '/my-deli', label: 'My Deli', icon: '👤' },
  { href: '/profile', label: 'Profile', icon: '🎒' },
  { href: '/map', label: 'Camp Map', icon: '🏕️', feature: 'layout' },
  { href: '/kitchen', label: 'Kitchen', icon: '🍳', feature: 'kitchen' },
  { href: '/resources', label: 'Resources', icon: '📚' },
]

const buildWeekNavItem = { href: '/build-week', label: 'Build Week', icon: '🔨', feature: 'build_week' as EventFeatureKey }
const adminNavItem = { href: '/admin', label: 'Admin', icon: '⚙️' }
const nowNavItem = { href: '/now', label: 'Now', icon: '🔥' }

export function Navigation() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [opsEvent, setOpsEvent] = useState<EventRow | null>(null)

  useEffect(() => {
    getOpsEvent().then(setOpsEvent)
  }, [])

  useEffect(() => {
    const supabase = createClient()

    const syncNav = async (userId: string | undefined) => {
      if (userId) {
        setIsLoggedIn(true)
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', userId)
          .single() as unknown as { data: { role: UserRole } | null }
        setUserRole(profile?.role || null)
      } else {
        setIsLoggedIn(false)
        setUserRole(null)
      }
    }

    // Use getSession() for instant read from cookies (no network call)
    supabase.auth.getSession().then(({ data: { session } }) => {
      syncNav(session?.user?.id)
    })

    // Listen for auth changes (fires on login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        syncNav(session?.user?.id)
      }
    )

    return () => subscription.unsubscribe()
  }, [pathname])

  const navItems = (() => {
    if (!isLoggedIn) return publicNavItems
    // Pending applicants keep their account surfaces (home, events, calendar,
    // and their own profile) while the rest of the camp stays gated.
    if (userRole === 'pending') {
      return [...publicNavItems.slice(0, 3), { href: '/my-deli', label: 'My Deli', icon: '👤' }]
    }

    const items = [...baseNavItems]
    if (userRole === 'builder' || userRole === 'admin') items.push(buildWeekNavItem)

    // Once the team is onsite, the stripped-down view leads.
    const onsite = opsEvent ? ['build', 'live'].includes(opsEvent.stage) : false
    const visible = items.filter(item => !item.feature || hasFeature(opsEvent, item.feature))
    if (onsite) visible.splice(1, 0, nowNavItem)

    if (userRole === 'admin') visible.push(adminNavItem)
    return visible
  })()

  return (
    <header className="bg-yellow-400 border-b-4 border-black sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/Images/logo.png"
              alt="NYC Deli Rats Logo"
              width={40}
              height={40}
              className="rounded-sm"
            />
            <span className="font-black text-xl uppercase tracking-wider text-black hidden sm:block">
              NYC Deli Rats
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-3 py-2 text-sm font-bold uppercase tracking-wider transition-all",
                    "hover:bg-black hover:text-yellow-400",
                    "border-2 border-transparent",
                    isActive && "bg-black text-yellow-400"
                  )}
                >
                  <span className="mr-1">{item.icon}</span>
                  {item.label}
                </Link>
              )
            })}
            {isLoggedIn ? (
              <form action={signOut}>
                <button
                  type="submit"
                  className="px-3 py-2 text-sm font-bold uppercase tracking-wider transition-all hover:bg-black hover:text-yellow-400 border-2 border-transparent"
                >
                  🚪 Sign Out
                </button>
              </form>
            ) : (
              <Link
                href="/login"
                className={cn(
                  "px-3 py-2 text-sm font-bold uppercase tracking-wider transition-all",
                  "hover:bg-black hover:text-yellow-400",
                  "border-2 border-transparent",
                  pathname === '/login' && "bg-black text-yellow-400"
                )}
              >
                🔑 Sign In
              </Link>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 border-2 border-black bg-white"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <span className="text-xl">{mobileOpen ? '✕' : '☰'}</span>
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <nav className="md:hidden py-4 border-t-2 border-black">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "block px-4 py-3 text-sm font-bold uppercase tracking-wider transition-all",
                    "hover:bg-black hover:text-yellow-400",
                    isActive && "bg-black text-yellow-400"
                  )}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              )
            })}
            {isLoggedIn ? (
              <form action={signOut}>
                <button
                  type="submit"
                  onClick={() => setMobileOpen(false)}
                  className="block w-full text-left px-4 py-3 text-sm font-bold uppercase tracking-wider transition-all hover:bg-black hover:text-yellow-400"
                >
                  <span className="mr-2">🚪</span>
                  Sign Out
                </button>
              </form>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block px-4 py-3 text-sm font-bold uppercase tracking-wider transition-all",
                  "hover:bg-black hover:text-yellow-400",
                  pathname === '/login' && "bg-black text-yellow-400"
                )}
              >
                <span className="mr-2">🔑</span>
                Sign In
              </Link>
            )}
          </nav>
        )}
      </div>
    </header>
  )
}
