'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { 
  Card, CardHeader, CardTitle, CardDescription, CardContent,
  Badge, Tabs, TabPanel, Alert, Button, Input
} from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate, formatTime } from '@/lib/utils'
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
  createDraft,
  seedDefaultOfferings,
} from '@/lib/shift-draft'

type Tab = { id: string; label: string; icon?: React.ReactNode }

const tabs: Tab[] = [
  { id: 'roles', label: 'Roles & Descriptions' },
  { id: 'signup', label: 'Sign-Up Sheet & Draft' },
  { id: 'full-schedule', label: 'Full Schedule' },
]

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

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

export default function KitchenPage() {
  const [activeTab, setActiveTab] = useState('roles')
  const [shifts, setShifts] = useState<ShiftWithAssignments[]>([])
  const [loading, setLoading] = useState(true)

  // Auto-draft state
  const [draft, setDraft] = useState<ShiftDraftRow | null>(null)
  const [offerings, setOfferings] = useState<ShiftOfferingRow[]>([])
  const [myRankings, setMyRankings] = useState<ShiftDraftRankingRow[]>([])
  const [myAssignments, setMyAssignments] = useState<ShiftDraftAssignmentRow[]>([])
  const [currentUser, setCurrentUser] = useState<{ id: string; camperId: string | null }>({ id: '', camperId: null })
  const [draftMessage, setDraftMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [savingOffering, setSavingOffering] = useState<string | null>(null)
  const [openingRanking, setOpeningRanking] = useState(false)
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
          setDisplayDeliCategories(applyShiftCategoryOverrides(deliShiftCategories, overrides, 'deli'))
          setDisplaySpecialCategories(applyShiftCategoryOverrides(specialShiftCategories, overrides, 'special'))
          setDisplayStrikeCategories(applyShiftCategoryOverrides(strikeCategories, overrides, 'strike'))
        } catch { /* ignore malformed */ }
      }

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

  // ======== Ranking Grid (day × shift matrix) ========
  // Rows = distinct shift (pool/category/role/time), grouped by type/role.
  // Columns = days of the week. Each cell maps to a single offering.
  type GridRow = {
    key: string
    pool: ShiftOfferingRow['pool']
    category: string
    role: string
    time_label: string | null
    counts_double: boolean
    requires_exp: boolean
    note: string | null
    cells: Map<string, ShiftOfferingRow>
  }
  const rankingGrid = (() => {
    const poolRank: Record<string, number> = { deli: 0, special: 1, strike: 2 }
    const daysPresent = DAY_ORDER.filter(d => offerings.some(o => (o.day_label ?? '') === d))
    const sorted = [...offerings].sort((a, b) => {
      if (poolRank[a.pool] !== poolRank[b.pool]) return poolRank[a.pool] - poolRank[b.pool]
      return a.sort_order - b.sort_order
    })
    const rowMap = new Map<string, GridRow>()
    const order: string[] = []
    for (const o of sorted) {
      const key = `${o.pool}|${o.category}|${o.role}|${o.time_label ?? ''}`
      if (!rowMap.has(key)) {
        rowMap.set(key, {
          key, pool: o.pool, category: o.category, role: o.role, time_label: o.time_label,
          counts_double: o.counts_double, requires_exp: o.requires_exp, note: o.note, cells: new Map(),
        })
        order.push(key)
      }
      rowMap.get(key)!.cells.set(o.day_label ?? '', o)
    }
    const sections: { category: string; pool: ShiftOfferingRow['pool']; rows: GridRow[] }[] = []
    for (const k of order) {
      const r = rowMap.get(k)!
      let sec = sections[sections.length - 1]
      if (!sec || sec.category !== r.category || sec.pool !== r.pool) {
        sec = { category: r.category, pool: r.pool, rows: [] }
        sections.push(sec)
      }
      sec.rows.push(r)
    }
    return { days: daysPresent, sections, totalCells: offerings.length }
  })()

  const usedRanks = new Set(myRankings.map(r => r.rank))
  const availableRanks = (currentRank: number | null): number[] => {
    const opts: number[] = []
    for (let i = 1; i <= rankingGrid.totalCells; i++) {
      if (!usedRanks.has(i) || i === currentRank) opts.push(i)
    }
    return opts
  }

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

  // Admin: create a draft and seed all shifts so the ranking grid populates.
  const handleOpenRanking = async () => {
    if (!isAdmin) return
    setOpeningRanking(true)
    setDraftMessage(null)
    try {
      const { data: { user } } = await createClient().auth.getUser()
      if (!user) throw new Error('Not signed in')
      const newDraft = await createDraft({ name: 'Kitchen Shift Ranking', created_by: user.id })
      await seedDefaultOfferings(newDraft.id)
      await fetchData()
      setDraftMessage({ type: 'success', text: 'Ranking is now open — all shifts are populated below.' })
    } catch (err) {
      setDraftMessage({ type: 'error', text: err instanceof Error ? err.message : 'Could not open ranking' })
    } finally {
      setOpeningRanking(false)
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
                {isAdmin ? (
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <span>
                      No active shift ranking yet. Click to open ranking — this creates a draft and
                      populates every shift from the Roles &amp; Descriptions tab for all campers.
                    </span>
                    <Button onClick={handleOpenRanking} disabled={openingRanking}>
                      {openingRanking ? 'Opening…' : 'Open Camper Ranking'}
                    </Button>
                  </div>
                ) : (
                  'No active shift ranking yet. An admin will open it soon; check back later.'
                )}
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
                  {draftIsOpen && (
                    <p className="mt-2 text-xs text-gray-600 border-t border-gray-200 pt-2">
                      <Badge variant="warning" className="text-[9px] mr-1">2×</Badge> counts as two shifts toward your quota.{' '}
                      <Badge variant="default" className="text-[9px] mx-1">EXP</Badge> experience helpful — just a hint, not a requirement. Rank it if you&apos;re up for it.
                    </p>
                  )}
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
              <Card>
                <CardHeader>
                  <CardTitle>Rank Your Shifts</CardTitle>
                  <CardDescription>
                    Pick a rank for every shift/day you&apos;d like — 1 is your top choice. Each number can
                    only be used once across the whole grid, so a number disappears from the other
                    drop-downs once you use it. Leave a cell blank if you don&apos;t want it.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!currentUser.camperId && (
                    <Alert variant="warning">
                      Your login isn&apos;t linked to a camper profile yet, so rankings can&apos;t be saved.
                      Reach out to an admin to get linked.
                    </Alert>
                  )}

                  <div className="flex items-center justify-between text-xs">
                    <p className="text-gray-600">
                      <span className="font-black">{myRankings.length}</span> of{' '}
                      <span className="font-black">{rankingGrid.totalCells}</span> shifts ranked.
                    </p>
                    <p className="text-gray-500">
                      <Badge variant="warning" className="text-[9px] mr-1">2×</Badge> counts as two shifts ·{' '}
                      <Badge variant="default" className="text-[9px] mx-1">EXP</Badge> experience helpful
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="text-xs border-collapse">
                      <thead>
                        <tr>
                          <th className="sticky left-0 z-10 bg-black text-white px-2 py-2 text-left font-black uppercase tracking-wider min-w-[180px]">
                            Shift
                          </th>
                          {rankingGrid.days.map(day => (
                            <th key={day} className="bg-black text-white px-2 py-2 font-black uppercase tracking-wider min-w-[64px] text-center">
                              {day}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rankingGrid.sections.map(section => (
                          <React.Fragment key={`${section.pool}-${section.category}`}>
                            <tr>
                              <td
                                colSpan={rankingGrid.days.length + 1}
                                className="bg-gray-100 border-y border-gray-300 px-2 py-1 font-black uppercase text-[10px] tracking-wider text-gray-700"
                              >
                                {section.category}
                                {section.pool !== 'deli' && (
                                  <Badge variant="default" className="ml-2 text-[9px] capitalize">{section.pool}</Badge>
                                )}
                              </td>
                            </tr>
                            {section.rows.map(row => (
                              <tr key={row.key} className="border-b border-gray-200">
                                <td className="sticky left-0 z-10 bg-white border-r border-gray-200 px-2 py-1 text-left align-top">
                                  <div className="font-bold leading-tight">
                                    {row.role}
                                    {row.counts_double && <Badge variant="warning" className="ml-1 text-[9px]">2×</Badge>}
                                    {row.requires_exp && (
                                      <Badge
                                        variant="default"
                                        className="ml-1 text-[9px]"
                                        title="Experience helpful — a hint, not a requirement. Anyone can rank this."
                                      >
                                        EXP
                                      </Badge>
                                    )}
                                  </div>
                                  {row.time_label && (
                                    <div className="text-[10px] text-gray-500">{row.time_label}</div>
                                  )}
                                </td>
                                {rankingGrid.days.map(day => {
                                  const o = row.cells.get(day)
                                  if (!o) {
                                    return <td key={day} className="border-l border-gray-100 bg-gray-50/60" />
                                  }
                                  const currentRank = rankingByOffering.get(o.id) ?? null
                                  const assigned = assignedOfferingIds.has(o.id)
                                  return (
                                    <td
                                      key={day}
                                      className={cn(
                                        "border-l border-gray-100 p-0.5 text-center",
                                        assigned && "bg-green-50",
                                      )}
                                    >
                                      <select
                                        value={currentRank ?? ''}
                                        disabled={!draftIsOpen || !currentUser.camperId || savingOffering === o.id}
                                        onChange={(e) => handleSetRanking(o.id, e.target.value)}
                                        title={o.description ?? undefined}
                                        className={cn(
                                          "w-full text-xs rounded border px-1 py-1 cursor-pointer disabled:cursor-default disabled:opacity-60",
                                          currentRank
                                            ? "border-blue-500 bg-blue-50 font-black text-blue-700"
                                            : "border-gray-200 text-gray-400",
                                        )}
                                      >
                                        <option value="">—</option>
                                        {availableRanks(currentRank).map(n => (
                                          <option key={n} value={n}>{n}</option>
                                        ))}
                                      </select>
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabPanel>

        {/* Full Schedule Tab — visible to every camper */}
        <TabPanel tabId="full-schedule" activeTab={activeTab}>
          <FullScheduleTable shifts={shifts} highlightCamperId={currentUser.camperId} />
        </TabPanel>


      </div>
    </div>
  )
}

/* ── Full schedule table — flattens kitchen_shifts × schedule_assignments ── */
function FullScheduleTable({
  shifts,
  highlightCamperId,
}: {
  shifts: ShiftWithAssignments[]
  highlightCamperId: string | null
}) {
  type Row = {
    key: string
    camperId: string
    name: string
    role: string
    date: string
    startTime: string
    endTime: string
    status: ScheduleAssignment['status']
  }

  const rows: Row[] = []
  for (const shift of shifts) {
    for (const a of shift.assignments ?? []) {
      rows.push({
        key: a.id,
        camperId: a.camper_id,
        name: a.camper?.playa_name || a.camper?.full_name || '—',
        role: shift.role?.name ?? '—',
        date: shift.date,
        startTime: shift.start_time,
        endTime: shift.end_time,
        status: a.status,
      })
    }
  }
  rows.sort((a, b) =>
    a.date.localeCompare(b.date) ||
    a.startTime.localeCompare(b.startTime) ||
    a.role.localeCompare(b.role) ||
    a.name.localeCompare(b.name)
  )

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Full Schedule</CardTitle>
          <CardDescription>Everyone&apos;s shifts. Yours are highlighted.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-8">
            No assignments yet. The schedule will populate once a draft has been published.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Full Schedule</CardTitle>
        <CardDescription>
          Everyone&apos;s shifts at a glance. Yours are highlighted.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left p-3 font-bold uppercase tracking-wider">Name</th>
                <th className="text-left p-3 font-bold uppercase tracking-wider">Shift / Role</th>
                <th className="text-left p-3 font-bold uppercase tracking-wider">Date</th>
                <th className="text-left p-3 font-bold uppercase tracking-wider">Time</th>
                <th className="text-left p-3 font-bold uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr
                  key={r.key}
                  className={cn(
                    "border-b border-gray-200 hover:bg-gray-50 transition-colors",
                    highlightCamperId && r.camperId === highlightCamperId && "bg-yellow-50 hover:bg-yellow-100"
                  )}
                >
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3">{r.role}</td>
                  <td className="p-3 whitespace-nowrap">{formatDate(r.date)}</td>
                  <td className="p-3 whitespace-nowrap">
                    {formatTime(r.startTime)} – {formatTime(r.endTime)}
                  </td>
                  <td className="p-3">
                    <Badge
                      variant={
                        r.status === 'confirmed' ? 'success' :
                        r.status === 'completed' ? 'info' :
                        r.status === 'no-show' ? 'error' : 'warning'
                      }
                    >
                      {r.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
