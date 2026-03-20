'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Home', icon: '🥪' },
  { href: '/intake', label: 'Register', icon: '📝' },
  { href: '/events', label: 'Events', icon: '🗓️' },
  { href: '/camp-selection', label: 'Camp Spots', icon: '🏕️' },
  { href: '/layout-view', label: 'Layout', icon: '🗺️' },
  { href: '/kitchen', label: 'Kitchen', icon: '🍳' },
  { href: '/schedule', label: 'Schedule', icon: '📅' },
  { href: '/build-week', label: 'Build Week', icon: '🔨' },
  { href: '/admin', label: 'Admin', icon: '⚙️' },
]

export function Navigation() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

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
          </nav>
        )}
      </div>
    </header>
  )
}
