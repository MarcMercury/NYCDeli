'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { getOpsEvent, isInformationStage } from '@/lib/active-event'
import { signOut } from '@/app/actions/auth'
import type { EventRow, UserRole } from '@/types/database'

interface NavItem {
  href: string
  label: string
  icon: string
  /** Hidden in the offseason — it only describes one event's operations. */
  eventOnly?: boolean
}

/**
 * Five destinations, maximum. Everything the camp does answers one of them:
 * what's happening (Events), what we're running right now (Camp), who we are
 * (Rats), how any of it works (Resources). Personal account surfaces live in
 * the account menu on the right rather than the main row.
 */
const publicNavItems: NavItem[] = [
  { href: '/', label: 'Home', icon: '🥪' },
  { href: '/events', label: 'Events', icon: '📅' },
  { href: '/resources', label: 'Resources', icon: '📚' },
  { href: '/intake', label: 'Register', icon: '📝' },
]

const memberNavItems: NavItem[] = [
  { href: '/', label: 'Home', icon: '🥪' },
  { href: '/events', label: 'Events', icon: '📅' },
  { href: '/camp', label: 'Camp', icon: '🏕️', eventOnly: true },
  { href: '/campers', label: 'Rats', icon: '🐀' },
  { href: '/resources', label: 'Resources', icon: '📚' },
]

const nowNavItem: NavItem = { href: '/now', label: 'Now', icon: '🔥' }

const accountLinks: { href: string; label: string; icon: string; adminOnly?: boolean }[] = [
  { href: '/profile', label: 'Your Profile', icon: '👤' },
  { href: '/profile?tab=my-schedule', label: 'Your Schedule', icon: '⏰' },
  { href: '/profile?tab=packing-list', label: 'Packing List', icon: '🎒' },
  { href: '/ideas', label: 'Ideas & Questions', icon: '💡' },
  { href: '/admin', label: 'Admin', icon: '⚙️', adminOnly: true },
]

export function Navigation() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [opsEvent, setOpsEvent] = useState<EventRow | null>(null)
  const accountRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    setAccountOpen(false)
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!accountOpen) return
    const close = (e: MouseEvent) => {
      if (!accountRef.current?.contains(e.target as Node)) setAccountOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [accountOpen])

  const navItems = (() => {
    if (!isLoggedIn) return publicNavItems
    // Pending applicants keep their account surfaces; /pending carries the
    // same My NYC Deli panel the rest of the camp gets under Profile.
    if (userRole === 'pending') {
      return [
        { href: '/', label: 'Home', icon: '🥪' },
        { href: '/events', label: 'Events', icon: '📅' },
        { href: '/pending', label: 'My Deli', icon: '👤' },
      ]
    }

    const offseason = isInformationStage(opsEvent)
    const visible = memberNavItems.filter(item => !(item.eventOnly && offseason))

    // Once the team is onsite, the stripped-down view leads.
    if (opsEvent && ['build', 'live'].includes(opsEvent.stage)) visible.splice(1, 0, nowNavItem)

    return visible
  })()

  const visibleAccountLinks = accountLinks.filter(link => !link.adminOnly || userRole === 'admin')

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
            {isLoggedIn && userRole !== 'pending' ? (
              <div className="relative ml-1" ref={accountRef}>
                <button
                  onClick={() => setAccountOpen(v => !v)}
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                  className={cn(
                    'px-3 py-2 text-sm font-bold uppercase tracking-wider border-2 border-black transition-all',
                    pathname.startsWith('/profile') || pathname.startsWith('/admin')
                      ? 'bg-black text-yellow-400'
                      : 'bg-white hover:bg-black hover:text-yellow-400'
                  )}
                >
                  👤 You ▾
                </button>
                {accountOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-1 w-56 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  >
                    {visibleAccountLinks.map(link => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="block px-4 py-2 text-sm font-bold uppercase tracking-wider hover:bg-yellow-400"
                      >
                        <span className="mr-2">{link.icon}</span>
                        {link.label}
                      </Link>
                    ))}
                    <form action={signOut} className="border-t-2 border-black">
                      <button
                        type="submit"
                        className="w-full text-left px-4 py-2 text-sm font-bold uppercase tracking-wider hover:bg-black hover:text-yellow-400"
                      >
                        <span className="mr-2">🚪</span>
                        Sign Out
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ) : isLoggedIn ? (
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
              <>
                {userRole !== 'pending' && (
                  <div className="mt-2 pt-2 border-t-2 border-black">
                    {visibleAccountLinks.map(link => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileOpen(false)}
                        className="block px-4 py-3 text-sm font-bold uppercase tracking-wider hover:bg-black hover:text-yellow-400"
                      >
                        <span className="mr-2">{link.icon}</span>
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}
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
              </>
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
