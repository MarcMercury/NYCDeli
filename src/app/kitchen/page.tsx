'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { 
  Card, CardHeader, CardTitle, CardDescription, CardContent,
  Badge, Tabs, TabPanel, Alert, Button, Input
} from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type {
  KitchenRole, KitchenShift, ScheduleAssignment, Camper,
  ShiftDraftRow, ShiftOfferingRow, ShiftDraftRankingRow, ShiftDraftAssignmentRow,
} from '@/types/database'
import {
  fetchActiveDraft,
  fetchOfferings,
  fetchMyRankings,
  fetchAssignments,
  upsertCamperRanking,
  clearCamperRanking,
  applyShiftCategoryOverrides,
  type ShiftOverrides,
} from '@/lib/shift-draft'

type Tab = { id: string; label: string; icon?: React.ReactNode }

const DELI_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

const tabs: Tab[] = [
  { id: 'roles', label: 'Roles & Descriptions' },
  { id: 'signup', label: 'Sign-Up Sheet & Draft' },
]

interface ShiftPosition {
  role: string
  description?: string
  time?: string
  note?: string
  countsDouble?: boolean
  requiresExp?: boolean
}

interface ShiftCategory {
  name: string
  description?: string
  time?: string
  note?: string
  positions: ShiftPosition[]
}

const deliShiftCategories: ShiftCategory[] = [
  {
    name: 'Deli Shifts',
    note: 'Core daily shifts running the NYC Deli',
    positions: [
      { role: 'Kitchen Lead', description: 'Oversees all kitchen operations; makes real-time calls on prep, service flow, and staffing', note: 'as needed' },
      { role: 'Kitchen Supervisor', description: 'Opens the kitchen, manages morning prep and service; ensures food safety and quality standards', time: '8:30AM\u201312:30PM', requiresExp: true, countsDouble: true },
      { role: 'Camp Manager Day', description: 'Runs daytime camp operations including supply runs, camper issues, and infrastructure', time: '10AM\u20134PM', countsDouble: true },
      { role: 'Camp Manager Day Deputy', description: 'Supports the Day Camp Manager with errands, logistics, and camper coordination', time: '10AM\u20131PM' },
      { role: 'Camp Manager Day Deputy', description: 'Supports the Day Camp Manager with errands, logistics, and camper coordination', time: '1PM\u20134PM' },
      { role: 'Camp Manager Night', description: 'Manages evening camp operations, noise levels, safety, and overnight readiness', time: '4PM\u201310PM', countsDouble: true },
      { role: 'Camp Manager Night Deputy', description: 'Assists Night Camp Manager with evening duties and closing procedures', time: '4PM\u20137PM' },
      { role: 'Camp Manager Night Deputy', description: 'Assists Night Camp Manager with evening duties and closing procedures', time: '7PM\u201310PM' },
    ],
  },
  {
    name: 'Prep Crew',
    time: '8:30\u201311:00 AM',
    note: '5 positions',
    positions: [
      { role: 'Prep Crew', description: 'Chops, slices, portions, and organizes ingredients for the day\u2019s deli service' },
      { role: 'Prep Crew', description: 'Chops, slices, portions, and organizes ingredients for the day\u2019s deli service' },
      { role: 'Prep Crew', description: 'Chops, slices, portions, and organizes ingredients for the day\u2019s deli service' },
      { role: 'Prep Crew', description: 'Chops, slices, portions, and organizes ingredients for the day\u2019s deli service' },
      { role: 'Prep Crew', description: 'Chops, slices, portions, and organizes ingredients for the day\u2019s deli service' },
    ],
  },
  {
    name: 'Order Taker',
    time: '9:30\u201312:00',
    note: '1 position',
    positions: [
      { role: 'Order Taker & Counter', description: 'Takes customer orders at the counter with energy and flair \u2014 part cashier, part entertainer', note: 'Basically Entertainer' },
    ],
  },
  {
    name: 'Grill \u2013 Service Shift',
    time: '9:30\u201312:00',
    note: '4 positions',
    positions: [
      { role: 'Grill Lead', description: 'Runs the grill station; calls temps, manages ticket flow, and ensures food is cooked safely', requiresExp: true },
      { role: 'Grill', description: 'Works the flat-top and grill cooking eggs, bacon, and proteins to order' },
      { role: 'Grill', description: 'Works the flat-top and grill cooking eggs, bacon, and proteins to order' },
      { role: 'Grill', description: 'Works the flat-top and grill cooking eggs, bacon, and proteins to order' },
    ],
  },
  {
    name: 'Assembly / Deli Service',
    time: '9:30\u201312:00',
    note: '5 positions',
    positions: [
      { role: 'Assembly (Egg + Egg+Cheese)', description: 'Assembles egg and egg-and-cheese sandwiches fresh off the grill' },
      { role: 'Assembly (Schmearer)', description: 'Spreads cream cheese, butter, and condiments on bagels and rolls' },
      { role: 'Assembly (Bacon)', description: 'Handles bacon prep, portioning, and adding bacon to sandwich orders' },
      { role: 'Assembly (Coffee + Milk)', description: 'Brews and serves coffee and milk; keeps the beverage station stocked and clean' },
      { role: 'Assembly (Sandwich Counter)', description: 'Final sandwich assembly \u2014 wraps, bags, and hands completed orders to runners' },
    ],
  },
  {
    name: 'Runner',
    time: '9:30\u201312:00',
    note: '2 positions',
    positions: [
      { role: 'Runner (Assist)', description: 'Delivers finished orders from the counter to customers and assists where needed' },
      { role: 'Runner (Assist)', description: 'Delivers finished orders from the counter to customers and assists where needed' },
    ],
  },
  {
    name: 'Security',
    time: '10:00\u201312:30',
    note: '1 position',
    positions: [
      { role: 'Security', description: 'Manages crowd flow, enforces line order, and keeps the deli perimeter safe and fun' },
    ],
  },
  {
    name: 'Clean-up Crew',
    time: '12:00\u20132:30',
    note: '5 positions',
    positions: [
      { role: 'Clean-up & Kitchen Reset', description: 'Deep cleans all stations, washes dishes, sanitizes surfaces, and resets the kitchen for the next day' },
      { role: 'Clean-up & Kitchen Reset', description: 'Deep cleans all stations, washes dishes, sanitizes surfaces, and resets the kitchen for the next day' },
      { role: 'Clean-up & Kitchen Reset', description: 'Deep cleans all stations, washes dishes, sanitizes surfaces, and resets the kitchen for the next day' },
      { role: 'Clean-up & Kitchen Reset', description: 'Deep cleans all stations, washes dishes, sanitizes surfaces, and resets the kitchen for the next day' },
      { role: 'Clean-up & Kitchen Reset', description: 'Deep cleans all stations, washes dishes, sanitizes surfaces, and resets the kitchen for the next day' },
    ],
  },
  {
    name: 'Entertainers',
    time: '10:00\u201312:30',
    note: 'Up to 4 positions',
    positions: [
      { role: 'Entertainer / Bike Manager', description: 'Manages the bike valet area and entertains the crowd while they wait' },
      { role: 'Entertainer / Bike Manager', description: 'Manages the bike valet area and entertains the crowd while they wait' },
      { role: 'Entertainer / Line Manager', description: 'Keeps the line moving and entertained with games, banter, or conversation' },
      { role: 'Entertainer / Line Manager', description: 'Keeps the line moving and entertained with games, banter, or conversation' },
    ],
  },
  {
    name: 'Music & DJs',
    time: '9:30\u201312:30',
    note: '3 hours',
    positions: [
      { role: 'DJ', description: 'Provides the soundtrack for deli service \u2014 sets the vibe and keeps energy high' },
    ],
  },
]

const specialShiftCategories: ShiftCategory[] = [
  {
    name: 'Friday 9/4 Deep Playa Food Service',
    note: 'Soup for 1,000 \u2013 Supporting food service in Deep Playa',
    positions: [
      { role: 'Kitchen Lead', description: 'Leads kitchen operations for the deep playa soup service', time: '3PM\u20136:30PM' },
      { role: 'Grill Lead', description: 'Runs the cooking station for the deep playa event', time: '3PM\u20136:30PM', requiresExp: true },
      { role: 'Volunteer Supervisor', description: 'Supervises 15\u201320 external volunteers from Camp Milk & Honey', time: '3PM\u20136:30PM' },
      { role: 'Volunteer Supervisor', description: 'Supervises 15\u201320 external volunteers from Camp Milk & Honey', time: '3PM\u20136:30PM' },
      { role: 'Volunteer Supervisor', description: 'Supervises 15\u201320 external volunteers from Camp Milk & Honey', time: '3PM\u20136:30PM' },
      { role: 'Transport & Serving', description: 'Transports prepared food to deep playa and serves 1,000+ attendees', time: '6:30PM\u20139PM' },
      { role: 'Transport & Serving', description: 'Transports prepared food to deep playa and serves 1,000+ attendees', time: '6:30PM\u20139PM' },
      { role: 'Transport & Serving', description: 'Transports prepared food to deep playa and serves 1,000+ attendees', time: '6:30PM\u20139PM' },
      { role: 'Transport & Serving', description: 'Transports prepared food to deep playa and serves 1,000+ attendees', time: '6:30PM\u20139PM' },
    ],
  },
]

const strikeCategories: ShiftCategory[] = [
  {
    name: 'Strike Deco + Public Chill Tent',
    note: 'Sunday 9/6',
    positions: [
      { role: 'Striker \u2013 Deco + Chill Tent', description: 'Tears down decorations and disassembles the public chill tent', time: '8:30AM\u201311AM' },
      { role: 'Striker \u2013 Deco + Chill Tent', description: 'Tears down decorations and disassembles the public chill tent', time: '8:30AM\u201311AM' },
      { role: 'Striker \u2013 Deco + Chill Tent', description: 'Tears down decorations and disassembles the public chill tent', time: '8:30AM\u201311AM' },
      { role: 'Striker \u2013 Deco + Chill Tent', description: 'Tears down decorations and disassembles the public chill tent', time: '8:30AM\u201311AM' },
    ],
  },
  {
    name: 'Strike Service Kitchen',
    note: 'Sunday 9/6',
    positions: [
      { role: 'Striker \u2013 Service Kitchen', description: 'Breaks down the service kitchen \u2014 packs equipment, cleans, and loads out', time: '8:30AM\u201311AM' },
      { role: 'Striker \u2013 Service Kitchen', description: 'Breaks down the service kitchen \u2014 packs equipment, cleans, and loads out', time: '8:30AM\u201311AM' },
      { role: 'Striker \u2013 Service Kitchen', description: 'Breaks down the service kitchen \u2014 packs equipment, cleans, and loads out', time: '8:30AM\u201311AM' },
    ],
  },
  {
    name: 'Strike Plumbing + Shower Container',
    note: 'Sunday 9/6',
    positions: [
      { role: 'Striker \u2013 Plumbing/Shower', description: 'Disconnects plumbing, drains lines, and disassembles the shower container', time: '8:30AM\u201311AM' },
      { role: 'Striker \u2013 Plumbing/Shower', description: 'Disconnects plumbing, drains lines, and disassembles the shower container', time: '8:30AM\u201311AM' },
      { role: 'Striker \u2013 Plumbing/Shower', description: 'Disconnects plumbing, drains lines, and disassembles the shower container', time: '8:30AM\u201311AM' },
      { role: 'Striker \u2013 Plumbing/Shower', description: 'Disconnects plumbing, drains lines, and disassembles the shower container', time: '8:30AM\u201311AM' },
    ],
  },
  {
    name: 'Strike Power',
    note: 'Sunday 9/6',
    positions: [
      { role: 'Striker \u2013 Power', description: 'Disconnects electrical systems, coils cabling, and packs generators', time: '8:30AM\u201311AM' },
      { role: 'Striker \u2013 Power', description: 'Disconnects electrical systems, coils cabling, and packs generators', time: '8:30AM\u201311AM' },
      { role: 'Striker \u2013 Power', description: 'Disconnects electrical systems, coils cabling, and packs generators', time: '8:30AM\u201311AM' },
      { role: 'Striker \u2013 Power', description: 'Disconnects electrical systems, coils cabling, and packs generators', time: '8:30AM\u201311AM' },
    ],
  },
  {
    name: 'Strike Lighting + Shade Squares + Evap Coolers + Bike Racks',
    note: 'Sunday 9/6 \u2013 ONLY for campers who must depart Sunday afternoon. This is their Exodus Monday strike commitment and does not count as a shift.',
    positions: [
      { role: 'Striker \u2013 Lighting/Shade/Bikes', description: 'Removes lighting rigs, shade squares, evap coolers, and bike racks', time: '8:30AM\u201311AM' },
      { role: 'Striker \u2013 Lighting/Shade/Bikes', description: 'Removes lighting rigs, shade squares, evap coolers, and bike racks', time: '8:30AM\u201311AM' },
      { role: 'Striker \u2013 Lighting/Shade/Bikes', description: 'Removes lighting rigs, shade squares, evap coolers, and bike racks', time: '8:30AM\u201311AM' },
      { role: 'Striker \u2013 Lighting/Shade/Bikes', description: 'Removes lighting rigs, shade squares, evap coolers, and bike racks', time: '8:30AM\u201311AM' },
      { role: 'Striker \u2013 Lighting/Shade/Bikes', description: 'Removes lighting rigs, shade squares, evap coolers, and bike racks', time: '8:30AM\u201311AM' },
      { role: 'Striker \u2013 Lighting/Shade/Bikes', description: 'Removes lighting rigs, shade squares, evap coolers, and bike racks', time: '8:30AM\u201311AM' },
      { role: 'Striker \u2013 Lighting/Shade/Bikes', description: 'Removes lighting rigs, shade squares, evap coolers, and bike racks', time: '8:30AM\u201311AM' },
      { role: 'Striker \u2013 Lighting/Shade/Bikes', description: 'Removes lighting rigs, shade squares, evap coolers, and bike racks', time: '8:30AM\u201311AM' },
      { role: 'Striker \u2013 Lighting/Shade/Bikes', description: 'Removes lighting rigs, shade squares, evap coolers, and bike racks', time: '8:30AM\u201311AM' },
      { role: 'Striker \u2013 Lighting/Shade/Bikes', description: 'Removes lighting rigs, shade squares, evap coolers, and bike racks', time: '8:30AM\u201311AM' },
    ],
  },
]

interface ShiftWithAssignments extends KitchenShift {
  role?: KitchenRole
  assignments?: (ScheduleAssignment & { camper?: Camper })[]
}

/** Deduplicate positions by role+time for grid rows */
function getUniquePositions(categories: ShiftCategory[]): ShiftPosition[] {
  const seen = new Set<string>()
  const result: ShiftPosition[] = []
  for (const cat of categories) {
    for (const pos of cat.positions) {
      const key = `${pos.role}|${pos.time ?? ''}`
      if (!seen.has(key)) {
        seen.add(key)
        result.push(pos)
      }
    }
  }
  return result
}

interface ConsolidatedPosition extends ShiftPosition {
  count: number
}

/** Consolidate duplicate positions into single entries with counts */
function consolidatePositions(positions: ShiftPosition[]): ConsolidatedPosition[] {
  const groups: ConsolidatedPosition[] = []
  for (const pos of positions) {
    const existing = groups.find(
      g => g.role === pos.role && g.description === pos.description && (g.time ?? '') === (pos.time ?? '')
    )
    if (existing) {
      existing.count++
    } else {
      groups.push({ ...pos, count: 1 })
    }
  }
  return groups
}

/** Count how many slots exist for a given role+time */
function countSlots(categories: ShiftCategory[], role: string, time?: string): number {
  let count = 0
  for (const cat of categories) {
    for (const pos of cat.positions) {
      if (pos.role === role && (pos.time ?? '') === (time ?? '')) count++
    }
  }
  return count
}

export default function KitchenPage() {
  const [activeTab, setActiveTab] = useState('roles')
  const [_roles, setRoles] = useState<KitchenRole[]>([])
  const [_shifts, setShifts] = useState<ShiftWithAssignments[]>([])
  const [loading, setLoading] = useState(true)

  // Auto-draft state
  const [draft, setDraft] = useState<ShiftDraftRow | null>(null)
  const [offerings, setOfferings] = useState<ShiftOfferingRow[]>([])
  const [myRankings, setMyRankings] = useState<ShiftDraftRankingRow[]>([])
  const [myAssignments, setMyAssignments] = useState<ShiftDraftAssignmentRow[]>([])
  const [allCampers, setAllCampers] = useState<Camper[]>([])
  const [currentUser, setCurrentUser] = useState<{ id: string; camperId: string | null }>({ id: '', camperId: null })
  const [draftMessage, setDraftMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [savingOffering, setSavingOffering] = useState<string | null>(null)
  // Admin editing state
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminEditing, setAdminEditing] = useState(false)
  const [editingCell, setEditingCell] = useState<{ catIdx: number; posIdx: number; field: 'role' | 'time' | 'description' } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [adminMessage, setAdminMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  // Display categories (with admin overrides applied)
  const [displayDeliCategories, setDisplayDeliCategories] = useState<ShiftCategory[]>(deliShiftCategories)
  const [displaySpecialCategories, setDisplaySpecialCategories] = useState<ShiftCategory[]>(specialShiftCategories)
  const [displayStrikeCategories, setDisplayStrikeCategories] = useState<ShiftCategory[]>(strikeCategories)
  const [shiftOverrides, setShiftOverrides] = useState<ShiftOverrides>({})
  // Collapsible state for roles tab (all collapsed by default)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  const toggleSection = useCallback((id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleCategory = useCallback((key: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    
    // Fetch roles
    const { data: rolesData } = await supabase
      .from('kitchen_roles')
      .select('*')
      .order('name')

    // Fetch shifts with role info
    const { data: shiftsData } = await supabase
      .from('kitchen_shifts')
      .select('*')
      .order('date')
      .order('start_time')

    // Fetch assignments
    const { data: assignmentsData } = await supabase
      .from('schedule_assignments')
      .select('*, camper:campers(*)')

    const typedRoles = rolesData as KitchenRole[] | null
    const typedShifts = shiftsData as KitchenShift[] | null
    
    if (typedRoles) setRoles(typedRoles)
    
    if (typedShifts && typedRoles) {
      const enrichedShifts = typedShifts.map(shift => ({
        ...shift,
        role: typedRoles.find(r => r.id === shift.role_id),
        assignments: (assignmentsData as ScheduleAssignment[] | null)?.filter(a => a.shift_id === shift.id) || [],
      }))
      setShifts(enrichedShifts)
    }

    // Draft data
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: camper } = await supabase
          .from('campers')
          .select('id')
          .eq('email', user.email!)
          .single() as unknown as { data: { id: string } | null }
        setCurrentUser({ id: user.id, camperId: camper?.id || null })
        
        // Check if user is admin
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', user.id)
          .single() as unknown as { data: { role: string } | null }
        setIsAdmin(profile?.role === 'admin')
      }

      // Load shift position overrides
      const { data: overrideSetting } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'shift_position_overrides')
        .single() as unknown as { data: { value: string } | null }

      if (overrideSetting) {
        try {
          const overrides = JSON.parse(overrideSetting.value) as Record<string, unknown>
          setShiftOverrides(overrides)
          setDisplayDeliCategories(applyShiftCategoryOverrides(deliShiftCategories, overrides, 'deli'))
          setDisplaySpecialCategories(applyShiftCategoryOverrides(specialShiftCategories, overrides, 'special'))
          setDisplayStrikeCategories(applyShiftCategoryOverrides(strikeCategories, overrides, 'strike'))
        } catch { /* ignore malformed */ }
      }

      const { data: camperData } = await supabase
        .from('campers')
        .select('*')
        .order('full_name')
      setAllCampers(camperData || [])

      const activeDraft = await fetchActiveDraft()
      if (activeDraft) {
        setDraft(activeDraft)
        const [ofs, asgs] = await Promise.all([
          fetchOfferings(activeDraft.id),
          fetchAssignments(activeDraft.id),
        ])
        setOfferings(ofs)
        // Resolve current user's camper id (scoped above is out of reach here)
        let cid: string | null = null
        const { data: { user: u2 } } = await supabase.auth.getUser()
        if (u2?.email) {
          const { data: c2 } = await supabase
            .from('campers')
            .select('id')
            .eq('email', u2.email)
            .maybeSingle() as unknown as { data: { id: string } | null }
          cid = c2?.id ?? null
        }
        if (cid) {
          const rks = await fetchMyRankings(activeDraft.id, cid)
          setMyRankings(rks)
          setMyAssignments(asgs.filter(a => a.camper_id === cid))
        } else {
          setMyAssignments([])
        }
      }
    } catch {
      // Draft loading is non-critical
    }

    setLoading(false)
  }, [])

  useEffect(() => {
     
    fetchData()
  }, [fetchData])



  // ======== Auto-Draft Derived State ========

  const rankingByOffering = new Map(myRankings.map(r => [r.offering_id, r.rank]))
  const assignedOfferingIds = new Set(myAssignments.map(a => a.offering_id))
  const draftIsOpen = draft?.status === 'open'
  const draftIsFrozen = draft?.status === 'frozen'
  const draftIsDrafted = draft?.status === 'drafted'

  const offeringsByPool = (() => {
    const groups: Record<'deli'|'special'|'strike', ShiftOfferingRow[]> = { deli: [], special: [], strike: [] }
    for (const o of offerings) groups[o.pool].push(o)
    return groups
  })()

  const offeringByDay = (() => {
    const map = new Map<string, ShiftOfferingRow[]>()
    for (const o of offeringsByPool.deli) {
      const k = o.day_label ?? '—'
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(o)
    }
    return map
  })()

  const getCamperById = (id: string) => allCampers.find(c => c.id === id)

  // Optimistic update helper for admin position edits (roles tab)
  const updateDisplayPosition = (catIdx: number, posIdx: number, field: 'role' | 'time' | 'description', value: string) => {
    setDisplayDeliCategories(prev => prev.map((cat, ci) =>
      ci === catIdx ? {
        ...cat,
        positions: cat.positions.map((p, pi) =>
          pi === posIdx ? { ...p, [field]: value } : p
        ),
      } : cat
    ))
  }

  // ======== Draft Actions ========


  const handleSetRanking = async (offeringId: string, rankStr: string) => {
    if (!draft || !currentUser.camperId || !draftIsOpen) return
    setSavingOffering(offeringId)
    try {
      if (rankStr.trim() === '') {
        await clearCamperRanking(draft.id, offeringId)
      } else {
        const rank = parseInt(rankStr, 10)
        if (!Number.isFinite(rank) || rank < 1) {
          setDraftMessage({ type: 'error', text: 'Rank must be a positive integer.' })
          return
        }
        await upsertCamperRanking(draft.id, offeringId, rank)
      }
      const rks = await fetchMyRankings(draft.id, currentUser.camperId)
      setMyRankings(rks)
    } catch (err) {
      setDraftMessage({ type: 'error', text: err instanceof Error ? err.message : 'Save failed' })
    } finally {
      setSavingOffering(null)
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🥪</div>
          <p className="font-bold uppercase tracking-wider">Loading Kitchen Data...</p>
          <p className="text-sm text-gray-600">Organizing sandwich chaos</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-wider mb-2">
            Kitchen Operations
          </h1>
          <p className="text-gray-600">
            Sandwiches don&apos;t make themselves.
          </p>
        </div>

        {/* Hero Message */}
        <Alert variant="warning" className="mb-8">
          <strong>The Deal:</strong> You signed up for kitchen participation. We remember. 
          Here&apos;s how it works and what we expect. Miss your shift, and there will be consequences. 
          Mostly judgment. Lots of judgment.
        </Alert>

        {/* Admin Controls */}
        {isAdmin && (
          <div className="mb-6">
            <Card className={cn("border-2", adminEditing ? "border-yellow-500 bg-yellow-50" : "border-gray-300")}>
              <CardContent className="py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold uppercase tracking-wider">⚙️ Admin Mode</span>
                  {adminEditing && (
                    <Badge variant="warning">Editing Enabled</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={adminEditing ? 'danger' : 'secondary'}
                    onClick={() => {
                      setAdminEditing(!adminEditing)
                      setEditingCell(null)
                    }}
                  >
                    {adminEditing ? 'Exit Edit Mode' : 'Edit Shifts & Times'}
                  </Button>
                </div>
              </CardContent>
            </Card>
            {adminMessage && (
              <Alert variant={adminMessage.type === 'success' ? 'success' : 'error'} className="mt-2">
                {adminMessage.text}
                <button className="ml-4 underline" onClick={() => setAdminMessage(null)}>Dismiss</button>
              </Alert>
            )}
          </div>
        )}

        {/* Tabs */}
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {/* Roles & Descriptions Tab */}
        <TabPanel tabId="roles" activeTab={activeTab}>
          <div className="space-y-6">
            {/* Deli Shifts Section */}
            <section>
              <button
                className="w-full flex items-center gap-3 text-left py-2 group"
                onClick={() => toggleSection('deli')}
              >
                {expandedSections.has('deli') ? (
                  <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
                )}
                <h2 className="text-2xl font-black uppercase tracking-wider">
                  🥪 Deli Shifts
                </h2>
                <span className="text-sm text-gray-500 font-normal normal-case tracking-normal">
                  {displayDeliCategories.reduce((sum, c) => sum + c.positions.length, 0)} positions across {displayDeliCategories.length} categories
                </span>
              </button>
              {expandedSections.has('deli') && (
                <div className="space-y-3 mt-2">
                  {displayDeliCategories.map((category, catIdx) => {
                    const catKey = `deli-${catIdx}`
                    const isExpanded = expandedCategories.has(catKey)
                    const consolidated = consolidatePositions(category.positions)
                    return (
                      <Card key={catIdx}>
                        <CardHeader
                          className="pb-2 cursor-pointer select-none"
                          onClick={() => toggleCategory(catKey)}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              )}
                              <CardTitle className="text-lg">{category.name}</CardTitle>
                            </div>
                            <div className="flex gap-2">
                              {category.time && <Badge variant="info">{category.time}</Badge>}
                              <Badge variant="default">
                                {category.positions.length} position{category.positions.length !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        {isExpanded && (
                          <CardContent className="pt-2">
                            {adminEditing ? (
                              <div className="divide-y divide-gray-200">
                                {category.positions.map((pos, posIdx) => (
                                  <div key={posIdx} className="py-2 hover:bg-yellow-50 rounded px-1">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 flex-1">
                                        <span className="w-6 h-6 flex items-center justify-center bg-gray-100 border border-gray-300 text-xs font-bold rounded">
                                          {posIdx + 1}
                                        </span>
                                        {editingCell?.catIdx === catIdx && editingCell?.posIdx === posIdx && editingCell?.field === 'role' ? (
                                          <div className="flex gap-1 items-center flex-1">
                                            <Input
                                              value={editValue}
                                              onChange={(e) => setEditValue(e.target.value)}
                                              className="text-sm py-0.5"
                                              autoFocus
                                              onKeyDown={(e) => { if (e.key === 'Escape') setEditingCell(null) }}
                                            />
                                            <button className="text-xs text-green-600 font-bold" onClick={async () => {
                                              const { updateShiftPositionAction } = await import('@/app/actions/admin')
                                              await updateShiftPositionAction(`deli-${catIdx}-${posIdx}`, { role: editValue, category: category.name })
                                              updateDisplayPosition(catIdx, posIdx, 'role', editValue)
                                              setAdminMessage({ type: 'success', text: `Updated role` })
                                              setEditingCell(null)
                                            }}>✓</button>
                                            <button className="text-xs text-gray-400" onClick={() => setEditingCell(null)}>✕</button>
                                          </div>
                                        ) : (
                                          <span
                                            className="font-medium cursor-pointer hover:underline"
                                            onClick={() => { setEditingCell({ catIdx, posIdx, field: 'role' }); setEditValue(pos.role) }}
                                          >
                                            {pos.role}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex gap-2 items-center">
                                        {editingCell?.catIdx === catIdx && editingCell?.posIdx === posIdx && editingCell?.field === 'time' ? (
                                          <div className="flex gap-1 items-center">
                                            <Input
                                              value={editValue}
                                              onChange={(e) => setEditValue(e.target.value)}
                                              className="text-xs py-0.5 w-32"
                                              placeholder="e.g. 9:30–12:00"
                                              autoFocus
                                              onKeyDown={(e) => { if (e.key === 'Escape') setEditingCell(null) }}
                                            />
                                            <button className="text-xs text-green-600 font-bold" onClick={async () => {
                                              const { updateShiftPositionAction } = await import('@/app/actions/admin')
                                              await updateShiftPositionAction(`deli-${catIdx}-${posIdx}`, { time: editValue, category: category.name })
                                              updateDisplayPosition(catIdx, posIdx, 'time', editValue)
                                              setAdminMessage({ type: 'success', text: `Updated time` })
                                              setEditingCell(null)
                                            }}>✓</button>
                                            <button className="text-xs text-gray-400" onClick={() => setEditingCell(null)}>✕</button>
                                          </div>
                                        ) : pos.time ? (
                                          <Badge
                                            variant="info"
                                            className="cursor-pointer hover:ring-2 ring-yellow-400"
                                            onClick={() => { setEditingCell({ catIdx, posIdx, field: 'time' }); setEditValue(pos.time || '') }}
                                          >
                                            {pos.time}
                                          </Badge>
                                        ) : (
                                          <button className="text-xs text-blue-500 underline" onClick={() => { setEditingCell({ catIdx, posIdx, field: 'time' }); setEditValue('') }}>+ time</button>
                                        )}
                                        {pos.requiresExp && <Badge variant="warning">Kitchen Exp. Required</Badge>}
                                        {pos.countsDouble && <Badge variant="success">Counts 2×</Badge>}
                                      </div>
                                    </div>
                                    {editingCell?.catIdx === catIdx && editingCell?.posIdx === posIdx && editingCell?.field === 'description' ? (
                                      <div className="ml-8 mt-1 flex gap-1 items-start">
                                        <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="text-xs py-0.5 flex-1" autoFocus onKeyDown={(e) => { if (e.key === 'Escape') setEditingCell(null) }} />
                                        <button className="text-xs text-green-600 font-bold mt-1" onClick={async () => {
                                          const { updateShiftPositionAction } = await import('@/app/actions/admin')
                                          await updateShiftPositionAction(`deli-${catIdx}-${posIdx}`, { description: editValue, category: category.name })
                                          updateDisplayPosition(catIdx, posIdx, 'description', editValue)
                                          setAdminMessage({ type: 'success', text: `Updated description` })
                                          setEditingCell(null)
                                        }}>✓</button>
                                        <button className="text-xs text-gray-400 mt-1" onClick={() => setEditingCell(null)}>✕</button>
                                      </div>
                                    ) : pos.description ? (
                                      <p
                                        className="text-xs text-gray-500 ml-8 mt-0.5 cursor-pointer hover:underline hover:text-gray-700"
                                        onClick={() => { setEditingCell({ catIdx, posIdx, field: 'description' }); setEditValue(pos.description || '') }}
                                      >
                                        {pos.description}
                                      </p>
                                    ) : (
                                      <button className="text-xs text-blue-500 underline ml-8 mt-0.5" onClick={() => { setEditingCell({ catIdx, posIdx, field: 'description' }); setEditValue('') }}>+ description</button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="divide-y divide-gray-200">
                                {consolidated.map((pos, posIdx) => (
                                  <div key={posIdx} className="py-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold">{pos.role}</span>
                                        {pos.count > 1 && (
                                          <Badge variant="default">{pos.count} people</Badge>
                                        )}
                                      </div>
                                      <div className="flex gap-2 flex-wrap">
                                        {pos.time && <Badge variant="info">{pos.time}</Badge>}
                                        {pos.requiresExp && <Badge variant="warning">Kitchen Exp. Required</Badge>}
                                        {pos.countsDouble && <Badge variant="success">Counts 2×</Badge>}
                                      </div>
                                    </div>
                                    {pos.description && (
                                      <p className="text-sm text-gray-600 mt-1">{pos.description}</p>
                                    )}
                                    {pos.note && (
                                      <p className="text-xs text-gray-400 mt-0.5 italic">{pos.note}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        )}
                      </Card>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Special Events Section */}
            <section>
              <button
                className="w-full flex items-center gap-3 text-left py-2 group"
                onClick={() => toggleSection('special')}
              >
                {expandedSections.has('special') ? (
                  <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
                )}
                <h2 className="text-2xl font-black uppercase tracking-wider">
                  🍜 Special Event Shifts
                </h2>
                <span className="text-sm text-gray-500 font-normal normal-case tracking-normal">
                  {displaySpecialCategories.reduce((sum, c) => sum + c.positions.length, 0)} positions
                </span>
              </button>
              {expandedSections.has('special') && (
                <div className="space-y-3 mt-2">
                  {displaySpecialCategories.map((category, catIdx) => {
                    const catKey = `special-${catIdx}`
                    const isExpanded = expandedCategories.has(catKey)
                    const consolidated = consolidatePositions(category.positions)
                    return (
                      <Card key={catIdx} variant="warning">
                        <CardHeader
                          className="pb-2 cursor-pointer select-none"
                          onClick={() => toggleCategory(catKey)}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              )}
                              <CardTitle className="text-lg">{category.name}</CardTitle>
                            </div>
                            <Badge variant="default">
                              {category.positions.length} position{category.positions.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          {category.note && (
                            <CardDescription className="ml-6">{category.note}</CardDescription>
                          )}
                        </CardHeader>
                        {isExpanded && (
                          <CardContent className="pt-2">
                            <div className="divide-y divide-gray-200">
                              {consolidated.map((pos, posIdx) => (
                                <div key={posIdx} className="py-3">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold">{pos.role}</span>
                                      {pos.count > 1 && (
                                        <Badge variant="default">{pos.count} people</Badge>
                                      )}
                                    </div>
                                    <div className="flex gap-2 flex-wrap">
                                      {pos.time && <Badge variant="info">{pos.time}</Badge>}
                                      {pos.requiresExp && <Badge variant="warning">Kitchen Exp. Required</Badge>}
                                    </div>
                                  </div>
                                  {pos.description && (
                                    <p className="text-sm text-gray-600 mt-1">{pos.description}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Strike Section */}
            <section>
              <button
                className="w-full flex items-center gap-3 text-left py-2 group"
                onClick={() => toggleSection('strike')}
              >
                {expandedSections.has('strike') ? (
                  <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
                )}
                <h2 className="text-2xl font-black uppercase tracking-wider">
                  🔨 Strike Shifts
                </h2>
                <span className="text-sm text-gray-500 font-normal normal-case tracking-normal">
                  {displayStrikeCategories.reduce((sum, c) => sum + c.positions.length, 0)} positions across {displayStrikeCategories.length} crews
                </span>
              </button>
              {expandedSections.has('strike') && (
                <div className="space-y-3 mt-2">
                  {displayStrikeCategories.map((category, catIdx) => {
                    const catKey = `strike-${catIdx}`
                    const isExpanded = expandedCategories.has(catKey)
                    const consolidated = consolidatePositions(category.positions)
                    return (
                      <Card key={catIdx}>
                        <CardHeader
                          className="pb-2 cursor-pointer select-none"
                          onClick={() => toggleCategory(catKey)}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              )}
                              <CardTitle className="text-lg">{category.name}</CardTitle>
                            </div>
                            <div className="flex gap-2">
                              {category.note && (
                                <Badge variant={category.note.includes('does not count') ? 'error' : 'default'}>
                                  {category.note.includes('ONLY') ? 'Sunday Departure Only' : category.note}
                                </Badge>
                              )}
                              <Badge variant="default">
                                {category.positions.length} position{category.positions.length !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                          </div>
                          {category.note && category.note.includes('ONLY') && (
                            <Alert variant="warning" className="mt-2">
                              <strong>Note:</strong> {category.note}
                            </Alert>
                          )}
                        </CardHeader>
                        {isExpanded && (
                          <CardContent className="pt-2">
                            <div className="divide-y divide-gray-200">
                              {consolidated.map((pos, posIdx) => (
                                <div key={posIdx} className="py-3">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold">{pos.role}</span>
                                      {pos.count > 1 && (
                                        <Badge variant="default">{pos.count} people</Badge>
                                      )}
                                    </div>
                                    {pos.time && <Badge variant="info">{pos.time}</Badge>}
                                  </div>
                                  {pos.description && (
                                    <p className="text-sm text-gray-600 mt-1">{pos.description}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    )
                  })}
                </div>
              )}
            </section>
          </div>
        </TabPanel>

        {/* Sign-Up Sheet & Draft Tab — Rankings */}
        <TabPanel tabId="signup" activeTab={activeTab}>
          <div className="space-y-6">
            {!draft && (
              <Alert variant="info">
                No active shift draft yet. An admin will create one and seed the offerings; check back soon.
              </Alert>
            )}

            {draft && (
              <Card className={cn(
                "border-4",
                draftIsOpen ? "border-blue-500" :
                draftIsFrozen ? "border-yellow-500 bg-yellow-50" :
                draftIsDrafted ? "border-green-500 bg-green-50" :
                "border-gray-300"
              )}>
                <CardContent className="py-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <p className="font-black uppercase tracking-wider">{draft.name}</p>
                      <p className="text-sm text-gray-600">
                        Status:{" "}
                        {draftIsOpen && <Badge variant="default">Rankings open</Badge>}
                        {draftIsFrozen && <Badge variant="warning">Frozen — awaiting auto-draft</Badge>}
                        {draftIsDrafted && <Badge variant="success">Drafted</Badge>}
                        {!draftIsOpen && !draftIsFrozen && !draftIsDrafted && <Badge>{draft.status}</Badge>}
                      </p>
                    </div>
                    <div className="text-sm">
                      {draftIsOpen && (
                        <p>Rank as many shifts as you want — lower number = higher priority. Quotas: {draft.deli_quota} deli, {draft.special_quota} special, {draft.strike_quota} strike.</p>
                      )}
                      {draftIsFrozen && <p>Rankings are locked. Auto-draft will run shortly.</p>}
                      {draftIsDrafted && <p>The auto-draft has been run. Your assignments are highlighted below.</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {draftMessage && (
              <Alert variant={draftMessage.type === 'success' ? 'success' : 'error'}>
                {draftMessage.text}
                <button className="ml-3 underline" onClick={() => setDraftMessage(null)}>Dismiss</button>
              </Alert>
            )}

            {draft && currentUser.camperId && draftIsDrafted && myAssignments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Assigned Shifts</CardTitle>
                  <CardDescription>{myAssignments.length} shift{myAssignments.length === 1 ? '' : 's'} assigned</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    {myAssignments.map(a => {
                      const o = offerings.find(x => x.id === a.offering_id)
                      if (!o) return null
                      return (
                        <li key={a.id} className="flex items-center gap-2">
                          <Badge variant="success">{o.pool}</Badge>
                          <span className="font-bold">{o.role}</span>
                          {o.time_label && <span className="text-gray-600">{o.time_label}</span>}
                          {o.day_label && <span className="text-gray-600">· {o.day_label}</span>}
                        </li>
                      )
                    })}
                  </ul>
                </CardContent>
              </Card>
            )}

            {draft && offerings.length > 0 && (
              <>
                {(['deli', 'special', 'strike'] as const).map(pool => {
                  const list = offeringsByPool[pool]
                  if (list.length === 0) return null
                  const groups: { label: string; items: ShiftOfferingRow[] }[] =
                    pool === 'deli'
                      ? Array.from(offeringByDay.entries()).map(([k, v]) => ({ label: k, items: v }))
                      : [{ label: pool === 'special' ? 'Special / Deep Playa' : 'Strike', items: list }]

                  return (
                    <Card key={pool}>
                      <CardHeader>
                        <CardTitle className="capitalize">{pool} Pool</CardTitle>
                        <CardDescription>
                          {pool === 'deli' && 'Daily kitchen + camp shifts (Mon–Sat).'}
                          {pool === 'special' && 'Deep Playa Friday food service.'}
                          {pool === 'strike' && 'Sunday teardown — Sunday departures only.'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {groups.map(group => (
                          <div key={group.label}>
                            <h4 className="font-bold uppercase text-xs tracking-wider text-gray-700 mb-2">{group.label}</h4>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs border-collapse">
                                <thead>
                                  <tr className="border-b-2 border-black">
                                    <th className="text-left py-1 pr-2 font-black uppercase w-16">Rank</th>
                                    <th className="text-left py-1 pr-2 font-black uppercase">Role</th>
                                    <th className="text-left py-1 pr-2 font-black uppercase">Time</th>
                                    <th className="text-left py-1 pr-2 font-black uppercase">Cap</th>
                                    <th className="text-left py-1 pr-2 font-black uppercase">Notes</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {group.items.map(o => {
                                    const rank = rankingByOffering.get(o.id) ?? ''
                                    const assigned = assignedOfferingIds.has(o.id)
                                    return (
                                      <tr
                                        key={o.id}
                                        className={cn(
                                          "border-b border-gray-200",
                                          assigned && "bg-green-50",
                                        )}
                                      >
                                        <td className="py-1 pr-2">
                                          <Input
                                            type="number"
                                            min={1}
                                            defaultValue={rank === '' ? '' : String(rank)}
                                            disabled={!draftIsOpen || !currentUser.camperId || savingOffering === o.id}
                                            onBlur={(e) => handleSetRanking(o.id, e.currentTarget.value)}
                                            className="w-14 text-xs"
                                            placeholder="—"
                                          />
                                        </td>
                                        <td className="py-1 pr-2">
                                          <span className="font-bold">{o.role}</span>
                                          {o.counts_double && <Badge variant="warning" className="ml-2 text-[9px]">2×</Badge>}
                                          {o.requires_exp && <Badge variant="default" className="ml-1 text-[9px]">EXP</Badge>}
                                        </td>
                                        <td className="py-1 pr-2 text-gray-600">{o.time_label ?? '—'}</td>
                                        <td className="py-1 pr-2">{o.capacity}</td>
                                        <td className="py-1 pr-2 text-gray-500">
                                          {o.description}
                                          {o.note && <div className="italic text-[10px]">{o.note}</div>}
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )
                })}
              </>
            )}
          </div>
        </TabPanel>


      </div>
    </div>
  )
}
