'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { 
  Card, CardHeader, CardTitle, CardDescription, CardContent,
  Badge, Tabs, TabPanel, Alert, Button, Input
} from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { KitchenRole, KitchenShift, ScheduleAssignment, Camper, ShiftDraftRow, ShiftDraftOrderWithCamper, ShiftDraftPickRow } from '@/types/database'
import {
  fetchActiveDraft,
  fetchDraft,
  fetchDraftOrder,
  fetchDraftPicks,
  makePick,
  getAllDraftShiftCategories,
  type DraftShiftPosition,
} from '@/lib/shift-draft'

type Tab = { id: string; label: string; icon?: React.ReactNode }

const DELI_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

const tabs: Tab[] = [
  { id: 'roles', label: 'Roles & Descriptions' },
  { id: 'signup', label: 'Sign-Up Sheet & Draft' },
  { id: 'coverage', label: 'Coverage' },
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
    name: 'Deli Shifts (M\u2013Sat)',
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
    name: 'Friday 8/29 Deep Playa Food Service',
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
    note: 'Sunday 8/31',
    positions: [
      { role: 'Striker \u2013 Deco + Chill Tent', description: 'Tears down decorations and disassembles the public chill tent', time: '8:30AM\u201311AM' },
      { role: 'Striker \u2013 Deco + Chill Tent', description: 'Tears down decorations and disassembles the public chill tent', time: '8:30AM\u201311AM' },
      { role: 'Striker \u2013 Deco + Chill Tent', description: 'Tears down decorations and disassembles the public chill tent', time: '8:30AM\u201311AM' },
      { role: 'Striker \u2013 Deco + Chill Tent', description: 'Tears down decorations and disassembles the public chill tent', time: '8:30AM\u201311AM' },
    ],
  },
  {
    name: 'Strike Service Kitchen',
    note: 'Sunday 8/31',
    positions: [
      { role: 'Striker \u2013 Service Kitchen', description: 'Breaks down the service kitchen \u2014 packs equipment, cleans, and loads out', time: '8:30AM\u201311AM' },
      { role: 'Striker \u2013 Service Kitchen', description: 'Breaks down the service kitchen \u2014 packs equipment, cleans, and loads out', time: '8:30AM\u201311AM' },
      { role: 'Striker \u2013 Service Kitchen', description: 'Breaks down the service kitchen \u2014 packs equipment, cleans, and loads out', time: '8:30AM\u201311AM' },
    ],
  },
  {
    name: 'Strike Plumbing + Shower Container',
    note: 'Sunday 8/31',
    positions: [
      { role: 'Striker \u2013 Plumbing/Shower', description: 'Disconnects plumbing, drains lines, and disassembles the shower container', time: '8:30AM\u201311AM' },
      { role: 'Striker \u2013 Plumbing/Shower', description: 'Disconnects plumbing, drains lines, and disassembles the shower container', time: '8:30AM\u201311AM' },
      { role: 'Striker \u2013 Plumbing/Shower', description: 'Disconnects plumbing, drains lines, and disassembles the shower container', time: '8:30AM\u201311AM' },
      { role: 'Striker \u2013 Plumbing/Shower', description: 'Disconnects plumbing, drains lines, and disassembles the shower container', time: '8:30AM\u201311AM' },
    ],
  },
  {
    name: 'Strike Power',
    note: 'Sunday 8/31',
    positions: [
      { role: 'Striker \u2013 Power', description: 'Disconnects electrical systems, coils cabling, and packs generators', time: '8:30AM\u201311AM' },
      { role: 'Striker \u2013 Power', description: 'Disconnects electrical systems, coils cabling, and packs generators', time: '8:30AM\u201311AM' },
      { role: 'Striker \u2013 Power', description: 'Disconnects electrical systems, coils cabling, and packs generators', time: '8:30AM\u201311AM' },
      { role: 'Striker \u2013 Power', description: 'Disconnects electrical systems, coils cabling, and packs generators', time: '8:30AM\u201311AM' },
    ],
  },
  {
    name: 'Strike Lighting + Shade Squares + Evap Coolers + Bike Racks',
    note: 'Sunday 8/31 \u2013 ONLY for campers who must depart Sunday afternoon. This is their Exodus Monday strike commitment and does not count as a shift.',
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
  const [roles, setRoles] = useState<KitchenRole[]>([])
  const [shifts, setShifts] = useState<ShiftWithAssignments[]>([])
  const [loading, setLoading] = useState(true)

  // Draft state
  const [draft, setDraft] = useState<ShiftDraftRow | null>(null)
  const [draftOrder, setDraftOrder] = useState<ShiftDraftOrderWithCamper[]>([])
  const [picks, setPicks] = useState<ShiftDraftPickRow[]>([])
  const [allCampers, setAllCampers] = useState<Camper[]>([])
  const [currentUser, setCurrentUser] = useState<{ id: string; camperId: string | null }>({ id: '', camperId: null })
  const [draftMessage, setDraftMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [selectedPosition, setSelectedPosition] = useState<DraftShiftPosition | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  // Admin editing state
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminEditing, setAdminEditing] = useState(false)
  const [editingCell, setEditingCell] = useState<{ catIdx: number; posIdx: number; field: 'role' | 'time' | 'description' } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [adminMessage, setAdminMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  // Display categories (with admin overrides applied)
  const [displayDeliCategories, setDisplayDeliCategories] = useState<ShiftCategory[]>(deliShiftCategories)
  const [displaySpecialCategories, setDisplaySpecialCategories] = useState<ShiftCategory[]>(specialShiftCategories)

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
          const overrides = JSON.parse(overrideSetting.value) as Record<string, { role?: string; time?: string; description?: string }>
          const applyOverrides = (cats: ShiftCategory[], prefix: string): ShiftCategory[] =>
            cats.map((cat, catIdx) => ({
              ...cat,
              positions: cat.positions.map((pos, posIdx) => {
                const ov = overrides[`${prefix}-${catIdx}-${posIdx}`]
                if (!ov) return pos
                return {
                  ...pos,
                  ...(ov.role && { role: ov.role }),
                  ...(ov.time && { time: ov.time }),
                  ...(ov.description && { description: ov.description }),
                }
              }),
            }))
          setDisplayDeliCategories(applyOverrides(deliShiftCategories, 'deli'))
          setDisplaySpecialCategories(applyOverrides(specialShiftCategories, 'special'))
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
        const order = await fetchDraftOrder(activeDraft.id)
        setDraftOrder(order)
        const draftPicks = await fetchDraftPicks(activeDraft.id)
        setPicks(draftPicks)
      }
    } catch {
      // Draft loading is non-critical
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    fetchData()
  }, [fetchData])

  // Real-time subscription for draft updates
  useEffect(() => {
    if (!draft || (draft.status !== 'active' && draft.status !== 'paused')) return

    const supabase = createClient()

    const channel = supabase
      .channel('kitchen-draft-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'shift_drafts',
        filter: `id=eq.${draft.id}`,
      }, async () => {
        const updated = await fetchDraft(draft.id)
        if (updated) setDraft(updated)
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'shift_draft_picks',
        filter: `draft_id=eq.${draft.id}`,
      }, async () => {
        const updatedPicks = await fetchDraftPicks(draft.id)
        setPicks(updatedPicks)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [draft?.id, draft?.status])

  // Timer for current pick
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)

    if (!draft || draft.status !== 'active') {
      setTimeLeft(null)
      return
    }

    const currentPick = picks.find(p =>
      p.round_number === draft.current_round &&
      p.pick_index === draft.current_pick_index &&
      p.status === 'picking'
    )

    if (!currentPick?.turn_started_at) {
      setTimeLeft(null)
      return
    }

    const updateTimer = () => {
      const started = new Date(currentPick.turn_started_at!).getTime()
      const now = Date.now()
      const elapsed = Math.floor((now - started) / 1000)
      const remaining = draft.pick_time_limit_seconds - elapsed
      setTimeLeft(Math.max(0, remaining))
    }

    updateTimer()
    timerRef.current = setInterval(updateTimer, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [draft?.status, draft?.current_round, draft?.current_pick_index, draft?.pick_time_limit_seconds, picks])

  // ======== Draft Derived State ========

  const myPosition = draftOrder.find(o => o.camper_id === currentUser.camperId)

  const isMyTurn = draft?.status === 'active' && currentUser.camperId && (() => {
    const currentPick = picks.find(p =>
      p.round_number === draft.current_round &&
      p.pick_index === draft.current_pick_index &&
      p.status === 'picking'
    )
    return currentPick?.camper_id === currentUser.camperId
  })()

  const myPicks = picks.filter(
    p => p.camper_id === currentUser.camperId && p.status === 'picked'
  )

  const currentPickerInfo = (() => {
    if (!draft || draft.status !== 'active') return null
    const pick = picks.find(p =>
      p.round_number === draft.current_round &&
      p.pick_index === draft.current_pick_index &&
      p.status === 'picking'
    )
    if (!pick) return null
    return allCampers.find(c => c.id === pick.camper_id) ?? null
  })()

  const pickedPositionIds = new Set(
    picks
      .filter(p => p.status === 'picked' && p.shift_category && p.shift_role)
      .map(p => `${p.shift_category}|${p.shift_role}|${p.shift_time ?? ''}`)
  )

  const draftCategories = getAllDraftShiftCategories()

  const getCamperById = (id: string) => allCampers.find(c => c.id === id)

  // Optimistic update helper for admin position edits
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

  /** Get the camper name who picked a specific position key */
  const getPickedCamperForSlot = (category: string, role: string, time?: string) => {
    const posKey = `${category}|${role}|${time ?? ''}`
    const pick = picks.find(p => p.status === 'picked' && `${p.shift_category}|${p.shift_role}|${p.shift_time ?? ''}` === posKey)
    if (!pick) return null
    const camper = getCamperById(pick.camper_id)
    return camper ? (camper.playa_name || camper.full_name) : 'Taken'
  }

  // ======== Draft Actions ========

  const handleSelectPosition = (pos: DraftShiftPosition) => {
    if (!isMyTurn) return
    const posKey = `${pos.category}|${pos.role}|${pos.time ?? ''}`
    if (pickedPositionIds.has(posKey)) return
    setSelectedPosition(pos)
    setConfirming(true)
  }

  const handleConfirmPick = async () => {
    if (!draft || !currentUser.camperId || !selectedPosition) return
    setSubmitting(true)
    try {
      await makePick(
        draft.id,
        currentUser.camperId,
        selectedPosition.category,
        selectedPosition.role,
        selectedPosition.time ?? null,
      )
      setDraftMessage({ type: 'success', text: `You picked: ${selectedPosition.role}${selectedPosition.time ? ` (${selectedPosition.time})` : ''}` })
      setSelectedPosition(null)
      setConfirming(false)
    } catch (err) {
      setDraftMessage({ type: 'error', text: `Failed to submit pick: ${err instanceof Error ? err.message : 'Unknown error'}` })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelPick = () => {
    setSelectedPosition(null)
    setConfirming(false)
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
          <div className="space-y-10">
            {/* Deli Shifts Section */}
            <section>
              <h2 className="text-2xl font-black uppercase tracking-wider mb-1">
                🥪 Deli Shifts (M\u2013Sat)
              </h2>
              <p className="text-sm text-gray-600 mb-4">Daily service shifts to keep the deli running</p>
              <div className="space-y-6">
                {displayDeliCategories.map((category, catIdx) => (
                  <Card key={catIdx}>
                    <CardHeader className="pb-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <CardTitle className="text-lg">{category.name}</CardTitle>
                        <div className="flex gap-2">
                          {category.time && (
                            <Badge variant="info">{category.time}</Badge>
                          )}
                          {category.note && (
                            <Badge variant="default">{category.note}</Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <div className="divide-y divide-gray-200">
                        {category.positions.map((pos, posIdx) => (
                          <div key={posIdx} className={cn("py-2", adminEditing && "hover:bg-yellow-50 rounded px-1")}>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-1">
                                <span className="w-6 h-6 flex items-center justify-center bg-gray-100 border border-gray-300 text-xs font-bold rounded">
                                  {posIdx + 1}
                                </span>
                                {adminEditing && editingCell?.catIdx === catIdx && editingCell?.posIdx === posIdx && editingCell?.field === 'role' ? (
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
                                    className={cn("font-medium", adminEditing && "cursor-pointer hover:underline")}
                                    onClick={() => { if (adminEditing) { setEditingCell({ catIdx, posIdx, field: 'role' }); setEditValue(pos.role) } }}
                                  >
                                    {pos.role}
                                  </span>
                                )}
                                {pos.note && !adminEditing && (
                                  <span className="text-xs text-gray-500">({pos.note})</span>
                                )}
                              </div>
                              <div className="flex gap-2 items-center">
                                {adminEditing && editingCell?.catIdx === catIdx && editingCell?.posIdx === posIdx && editingCell?.field === 'time' ? (
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
                                    className={cn(adminEditing && "cursor-pointer hover:ring-2 ring-yellow-400")}
                                    onClick={() => { if (adminEditing) { setEditingCell({ catIdx, posIdx, field: 'time' }); setEditValue(pos.time || '') } }}
                                  >
                                    {pos.time}
                                  </Badge>
                                ) : adminEditing ? (
                                  <button className="text-xs text-blue-500 underline" onClick={() => { setEditingCell({ catIdx, posIdx, field: 'time' }); setEditValue('') }}>+ time</button>
                                ) : null}
                                {pos.requiresExp && (
                                  <Badge variant="warning">Kitchen Exp. Required</Badge>
                                )}
                                {pos.countsDouble && (
                                  <Badge variant="success">Counts 2×</Badge>
                                )}
                              </div>
                            </div>
                            {adminEditing && editingCell?.catIdx === catIdx && editingCell?.posIdx === posIdx && editingCell?.field === 'description' ? (
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
                                className={cn("text-xs text-gray-500 ml-8 mt-0.5", adminEditing && "cursor-pointer hover:underline hover:text-gray-700")}
                                onClick={() => { if (adminEditing) { setEditingCell({ catIdx, posIdx, field: 'description' }); setEditValue(pos.description || '') } }}
                              >
                                {pos.description}
                              </p>
                            ) : adminEditing ? (
                              <button className="text-xs text-blue-500 underline ml-8 mt-0.5" onClick={() => { setEditingCell({ catIdx, posIdx, field: 'description' }); setEditValue('') }}>+ description</button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Special Events Section */}
            <section>
              <h2 className="text-2xl font-black uppercase tracking-wider mb-1">
                🍜 Special Event Shifts
              </h2>
              <p className="text-sm text-gray-600 mb-4">One-off event support shifts</p>
              <div className="space-y-6">
                {displaySpecialCategories.map((category, catIdx) => (
                  <Card key={catIdx} variant="warning">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                      {category.note && (
                        <CardDescription>{category.note}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="pt-2">
                      <div className="divide-y divide-gray-200">
                        {category.positions.map((pos, posIdx) => (
                          <div key={posIdx} className="py-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 flex items-center justify-center bg-gray-100 border border-gray-300 text-xs font-bold rounded">
                                  {posIdx + 1}
                                </span>
                                <span className="font-medium">{pos.role}</span>
                              </div>
                              <div className="flex gap-2">
                                {pos.time && (
                                  <Badge variant="info">{pos.time}</Badge>
                                )}
                                {pos.requiresExp && (
                                  <Badge variant="warning">Kitchen Exp. Required</Badge>
                                )}
                              </div>
                            </div>
                            {pos.description && (
                              <p className="text-xs text-gray-500 ml-8 mt-0.5">{pos.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Strike Section */}
            <section>
              <h2 className="text-2xl font-black uppercase tracking-wider mb-1">
                🔨 Strike Shifts
              </h2>
              <p className="text-sm text-gray-600 mb-4">Teardown and pack-out \u2014 everyone pitches in</p>
              <div className="space-y-6">
                {strikeCategories.map((category, catIdx) => (
                  <Card key={catIdx}>
                    <CardHeader className="pb-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <CardTitle className="text-lg">{category.name}</CardTitle>
                        {category.note && (
                          <Badge variant={category.note.includes('does not count') ? 'error' : 'default'}>
                            {category.note.includes('ONLY') ? 'Sunday Departure Only' : category.note}
                          </Badge>
                        )}
                      </div>
                      {category.note && category.note.includes('ONLY') && (
                        <Alert variant="warning" className="mt-2">
                          <strong>Note:</strong> {category.note}
                        </Alert>
                      )}
                    </CardHeader>
                    <CardContent className="pt-2">
                      <div className="divide-y divide-gray-200">
                        {category.positions.map((pos, posIdx) => (
                          <div key={posIdx} className="py-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 flex items-center justify-center bg-gray-100 border border-gray-300 text-xs font-bold rounded">
                                  {posIdx + 1}
                                </span>
                                <span className="font-medium">{pos.role}</span>
                              </div>
                              {pos.time && (
                                <Badge variant="info">{pos.time}</Badge>
                              )}
                            </div>
                            {pos.description && (
                              <p className="text-xs text-gray-500 ml-8 mt-0.5">{pos.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </div>
        </TabPanel>

        {/* Sign-Up Sheet & Draft Tab */}
        <TabPanel tabId="signup" activeTab={activeTab}>
          <div className="space-y-10">

            {/* Draft Status Banner */}
            {draft && (draft.status === 'active' || draft.status === 'paused') && (
              <Card className={cn(
                "border-4",
                isMyTurn ? "border-green-500 bg-green-50" :
                draft.status === 'paused' ? "border-yellow-500" :
                "border-blue-500"
              )}>
                <CardContent className="py-6">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="text-center md:text-left">
                      {isMyTurn ? (
                        <>
                          <p className="text-3xl font-black text-green-700 uppercase animate-pulse">
                            🎯 It&apos;s Your Turn!
                          </p>
                          <p className="text-gray-600">Select a shift from the board below</p>
                        </>
                      ) : draft.status === 'paused' ? (
                        <>
                          <p className="text-2xl font-black text-yellow-700 uppercase">Draft Paused</p>
                          <p className="text-gray-600">Waiting for admin to resume...</p>
                        </>
                      ) : (
                        <>
                          <p className="text-xl font-black uppercase">
                            🎯 {currentPickerInfo
                              ? `${currentPickerInfo.playa_name || currentPickerInfo.full_name} is picking...`
                              : 'Waiting...'}
                          </p>
                          <p className="text-gray-600">
                            Round {draft.current_round} of {draft.total_rounds} · Pick {draft.current_pick_index + 1} of {draftOrder.length}
                          </p>
                        </>
                      )}
                    </div>

                    {draft.status === 'active' && timeLeft !== null && (
                      <div className={cn(
                        "text-5xl font-mono font-black",
                        isMyTurn && timeLeft <= 30 ? "text-red-600 animate-pulse" :
                        timeLeft <= 30 ? "text-red-600" :
                        timeLeft <= 60 ? "text-yellow-600" : "text-green-600"
                      )}>
                        {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                      </div>
                    )}
                  </div>

                  {myPosition && (
                    <div className="mt-4 text-center md:text-left">
                      <p className="text-sm text-gray-500">
                        Your draft position: <span className="font-bold">#{myPosition.draft_position}</span>
                        {myPicks.length > 0 && (
                          <> · Picks made: <span className="font-bold">{myPicks.length}</span></>
                        )}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Draft Complete Banner */}
            {draft && draft.status === 'completed' && (
              <Alert variant="success">
                <strong>Draft Complete!</strong> All rounds have been completed. Shift assignments are shown below.
              </Alert>
            )}

            {/* Draft Setup Banner */}
            {draft && draft.status === 'setup' && (
              <Alert variant="info">
                <strong>Draft Coming Soon!</strong> The shift draft is being set up. Your position: {myPosition ? `#${myPosition.draft_position}` : 'Not yet assigned'}.
              </Alert>
            )}

            {/* No Draft Banner */}
            {!draft && (
              <Alert variant="info">
                The shift draft has not started yet. Sign-up slots will fill in as the draft progresses.
              </Alert>
            )}

            {/* Draft Messages */}
            {draftMessage && (
              <Alert variant={draftMessage.type === 'success' ? 'success' : 'error'}>
                {draftMessage.text}
                <button className="ml-4 underline" onClick={() => setDraftMessage(null)}>Dismiss</button>
              </Alert>
            )}

            {/* Confirmation Modal */}
            {confirming && selectedPosition && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <Card className="max-w-md w-full border-4 border-yellow-500">
                  <CardHeader>
                    <CardTitle>Confirm Your Pick</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center p-4 bg-yellow-50 border-2 border-yellow-300">
                      <p className="text-sm uppercase tracking-wider text-gray-500">{selectedPosition.category}</p>
                      <p className="text-xl font-black">{selectedPosition.role}</p>
                      {selectedPosition.time && (
                        <p className="text-gray-600">{selectedPosition.time}</p>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 text-center">
                      This choice is final. Are you sure?
                    </p>
                  </CardContent>
                  <div className="flex gap-2 p-4 border-t-2 border-gray-200">
                    <Button onClick={handleCancelPick} variant="secondary" className="flex-1" disabled={submitting}>
                      Cancel
                    </Button>
                    <Button onClick={handleConfirmPick} className="flex-1" disabled={submitting}>
                      {submitting ? 'Submitting...' : '✅ Confirm Pick'}
                    </Button>
                  </div>
                </Card>
              </div>
            )}

            {/* My Picks */}
            {myPicks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Picks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {myPicks.map(pick => (
                      <div key={pick.id} className="bg-green-50 border-2 border-green-300 px-4 py-2 rounded">
                        <p className="font-bold text-sm">{pick.shift_role}</p>
                        {pick.shift_time && <p className="text-xs text-gray-500">{pick.shift_time}</p>}
                        <p className="text-xs text-gray-400">{pick.shift_category}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Main Content: Sign-Up Grid + Draft Order */}
            <div className={cn("grid gap-6", draft && (draft.status === 'active' || draft.status === 'paused') ? "lg:grid-cols-4" : "")}>
              {/* Sign-Up Sheet / Draft Board */}
              <div className={cn(draft && (draft.status === 'active' || draft.status === 'paused') ? "lg:col-span-3" : "")}>

                {/* Deli Shifts Grid */}
                <section className="mb-10">
                  <h2 className="text-2xl font-black uppercase tracking-wider mb-1">
                    🥪 Deli Shifts (Mon–Sat)
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">
                    {draft && (draft.status === 'active' || draft.status === 'paused')
                      ? 'Click a green slot to draft it when it\'s your turn'
                      : 'Sign up for your shifts below. Each box = one slot per day.'}
                  </p>

                  {/* Draft-style interactive board for active drafts */}
                  {draft && (draft.status === 'active' || draft.status === 'paused' || draft.status === 'completed') ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {draftCategories.map(cat => (
                        <div key={cat.name} className="border-2 border-black p-3">
                          <h4 className="font-bold uppercase text-sm mb-1">{cat.name}</h4>
                          {cat.time && <p className="text-xs text-gray-500 mb-2">{cat.time}</p>}
                          {cat.note && <p className="text-xs text-gray-400 mb-2">{cat.note}</p>}
                          <div className="space-y-1">
                            {cat.positions.map(pos => {
                              const posKey = `${pos.category}|${pos.role}|${pos.time ?? ''}`
                              const taken = pickedPositionIds.has(posKey)
                              const pick = taken
                                ? picks.find(p => p.status === 'picked' && `${p.shift_category}|${p.shift_role}|${p.shift_time ?? ''}` === posKey)
                                : null
                              const picker = pick ? getCamperById(pick.camper_id) : null
                              const isMyPick = pick?.camper_id === currentUser.camperId

                              return (
                                <button
                                  key={pos.id}
                                  disabled={taken || !isMyTurn}
                                  onClick={() => handleSelectPosition(pos)}
                                  className={cn(
                                    "w-full text-left text-xs flex items-center gap-1 p-1.5 rounded transition-colors",
                                    taken
                                      ? isMyPick
                                        ? "bg-blue-100 border border-blue-300"
                                        : "bg-red-50 text-gray-400 cursor-not-allowed"
                                      : isMyTurn
                                        ? "bg-green-50 hover:bg-green-200 cursor-pointer border border-green-300"
                                        : "bg-green-50"
                                  )}
                                >
                                  <span className={cn(
                                    "w-2 h-2 rounded-full inline-block flex-shrink-0",
                                    taken
                                      ? isMyPick ? "bg-blue-500" : "bg-red-400"
                                      : "bg-green-400"
                                  )} />
                                  <span className={cn("flex-1", taken && !isMyPick && "line-through")}>
                                    {pos.role}
                                  </span>
                                  {pos.time && !cat.time && (
                                    <span className="text-gray-400 text-[10px]">{pos.time}</span>
                                  )}
                                  {taken && picker && (
                                    <span className="text-[10px] text-gray-500 truncate max-w-[80px]">
                                      {isMyPick ? '(You)' : picker.playa_name || picker.full_name}
                                    </span>
                                  )}
                                  {pos.requiresExp && <Badge variant="warning" className="text-[10px] py-0 px-1">EXP</Badge>}
                                  {pos.countsDouble && <Badge variant="info" className="text-[10px] py-0 px-1">2×</Badge>}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Static sign-up grid when no active draft */
                    <div className="overflow-x-auto">
                      {adminEditing && (
                        <Alert variant="info" className="mb-2">
                          <strong>Admin Edit Mode:</strong> Click on any role name or time cell in the grid to edit it inline.
                        </Alert>
                      )}
                      <table className="w-full border-collapse border-2 border-black text-sm">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border-2 border-black px-3 py-2 text-left font-bold uppercase tracking-wider">Role / Position</th>
                            <th className="border-2 border-black px-2 py-2 text-center font-bold uppercase tracking-wider w-20">Time</th>
                            <th className="border-2 border-black px-2 py-2 text-center font-bold uppercase tracking-wider w-10">#</th>
                            {DELI_DAYS.map(day => (
                              <th key={day} className="border-2 border-black px-3 py-2 text-center font-bold uppercase tracking-wider">{day}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {displayDeliCategories.map((category, catIdx) => {
                            const uniquePositions = getUniquePositions([category])
                            return (
                              <React.Fragment key={`cat-${catIdx}`}>
                                <tr className="bg-yellow-50">
                                  <td colSpan={3 + DELI_DAYS.length} className="border-2 border-black px-3 py-1.5 font-bold text-xs uppercase tracking-wider">
                                    {category.name}
                                    {category.note && <span className="font-normal text-gray-500 ml-2">— {category.note}</span>}
                                  </td>
                                </tr>
                                {uniquePositions.map((pos, posIdx) => {
                                  const slots = countSlots([category], pos.role, pos.time)
                                  const gridCellKey = `deli-${catIdx}-${posIdx}`
                                  return (
                                    <tr key={`${catIdx}-${posIdx}`} className={cn("hover:bg-gray-50", adminEditing && "hover:bg-yellow-50")}>
                                      <td className="border-2 border-black px-3 py-2">
                                        {adminEditing && editingCell?.catIdx === catIdx + 100 && editingCell?.posIdx === posIdx && editingCell?.field === 'role' ? (
                                          <div className="flex gap-1 items-center">
                                            <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="text-xs py-0.5" autoFocus onKeyDown={(e) => { if (e.key === 'Escape') setEditingCell(null) }} />
                                            <button className="text-xs text-green-600 font-bold" onClick={async () => {
                                              const { updateShiftPositionAction } = await import('@/app/actions/admin')
                                              await updateShiftPositionAction(gridCellKey, { role: editValue, category: category.name })
                                              updateDisplayPosition(catIdx, posIdx, 'role', editValue)
                                              setAdminMessage({ type: 'success', text: `Updated role` })
                                              setEditingCell(null)
                                            }}>✓</button>
                                            <button className="text-xs text-gray-400" onClick={() => setEditingCell(null)}>✕</button>
                                          </div>
                                        ) : (
                                          <div
                                            className={cn("flex items-center gap-2", adminEditing && "cursor-pointer hover:underline")}
                                            onClick={() => { if (adminEditing) { setEditingCell({ catIdx: catIdx + 100, posIdx, field: 'role' }); setEditValue(pos.role) } }}
                                          >
                                            <span className="font-medium">{pos.role}</span>
                                            {pos.requiresExp && <Badge variant="warning" className="text-[10px] px-1 py-0">Exp.</Badge>}
                                            {pos.countsDouble && <Badge variant="success" className="text-[10px] px-1 py-0">2×</Badge>}
                                            {adminEditing && <span className="text-[10px] text-blue-400">✎</span>}
                                          </div>
                                        )}
                                      </td>
                                      <td className="border-2 border-black px-2 py-2 text-center text-xs text-gray-600 whitespace-nowrap">
                                        {adminEditing && editingCell?.catIdx === catIdx + 100 && editingCell?.posIdx === posIdx && editingCell?.field === 'time' ? (
                                          <div className="flex gap-1 items-center">
                                            <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="text-xs py-0.5 w-24" autoFocus onKeyDown={(e) => { if (e.key === 'Escape') setEditingCell(null) }} />
                                            <button className="text-xs text-green-600 font-bold" onClick={async () => {
                                              const { updateShiftPositionAction } = await import('@/app/actions/admin')
                                              await updateShiftPositionAction(gridCellKey, { time: editValue, category: category.name })
                                              updateDisplayPosition(catIdx, posIdx, 'time', editValue)
                                              setAdminMessage({ type: 'success', text: `Updated time` })
                                              setEditingCell(null)
                                            }}>✓</button>
                                            <button className="text-xs text-gray-400" onClick={() => setEditingCell(null)}>✕</button>
                                          </div>
                                        ) : (
                                          <span
                                            className={cn(adminEditing && "cursor-pointer hover:underline")}
                                            onClick={() => { if (adminEditing) { setEditingCell({ catIdx: catIdx + 100, posIdx, field: 'time' }); setEditValue(pos.time ?? '') } }}
                                          >
                                            {pos.time ?? '—'}{adminEditing && <span className="text-[10px] text-blue-400 ml-0.5">✎</span>}
                                          </span>
                                        )}
                                      </td>
                                      <td className="border-2 border-black px-2 py-2 text-center text-xs font-bold">{slots}</td>
                                      {DELI_DAYS.map(day => (
                                        <td key={day} className="border-2 border-black px-2 py-2 text-center">
                                          <div className="min-h-[28px] flex flex-col gap-0.5 items-center justify-center">
                                            {Array.from({ length: slots }, (_, i) => (
                                              <div key={i} className="w-full h-6 border border-dashed border-gray-300 rounded bg-gray-50" />
                                            ))}
                                          </div>
                                        </td>
                                      ))}
                                    </tr>
                                  )
                                })}
                              </React.Fragment>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

            {/* Special Events Grid */}
            <section>
              <h2 className="text-2xl font-black uppercase tracking-wider mb-1">
                🍜 Special Event Shifts
              </h2>
              <p className="text-sm text-gray-600 mb-4">One-off events — sign up for a specific role</p>
              {displaySpecialCategories.map((category, catIdx) => {
                const uniquePositions = getUniquePositions([category])
                return (
                  <div key={catIdx} className="overflow-x-auto mb-6">
                    <table className="w-full border-collapse border-2 border-black text-sm">
                      <thead>
                        <tr className="bg-orange-50">
                          <th className="border-2 border-black px-3 py-2 text-left font-bold uppercase tracking-wider">{category.name}</th>
                          <th className="border-2 border-black px-2 py-2 text-center font-bold uppercase tracking-wider w-20">Time</th>
                          <th className="border-2 border-black px-2 py-2 text-center font-bold uppercase tracking-wider w-10">#</th>
                          <th className="border-2 border-black px-3 py-2 text-center font-bold uppercase tracking-wider">Sign-Up</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uniquePositions.map((pos, posIdx) => {
                          const slots = countSlots([category], pos.role, pos.time)
                          return (
                            <tr key={posIdx} className="hover:bg-gray-50">
                              <td className="border-2 border-black px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{pos.role}</span>
                                  {pos.requiresExp && <Badge variant="warning" className="text-[10px] px-1 py-0">Exp.</Badge>}
                                </div>
                              </td>
                              <td className="border-2 border-black px-2 py-2 text-center text-xs text-gray-600 whitespace-nowrap">{pos.time ?? '—'}</td>
                              <td className="border-2 border-black px-2 py-2 text-center text-xs font-bold">{slots}</td>
                              <td className="border-2 border-black px-2 py-2">
                                <div className="flex gap-1 flex-wrap justify-center">
                                  {Array.from({ length: slots }, (_, i) => (
                                    <div key={i} className="w-24 h-6 border border-dashed border-gray-300 rounded bg-gray-50" />
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              })}
            </section>

            {/* Strike Grid */}
            <section>
              <h2 className="text-2xl font-black uppercase tracking-wider mb-1">
                🔨 Strike Shifts (Sun 8/31)
              </h2>
              <p className="text-sm text-gray-600 mb-4">Teardown and pack-out — everyone pitches in</p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border-2 border-black text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border-2 border-black px-3 py-2 text-left font-bold uppercase tracking-wider">Strike Category</th>
                      <th className="border-2 border-black px-2 py-2 text-center font-bold uppercase tracking-wider w-20">Time</th>
                      <th className="border-2 border-black px-2 py-2 text-center font-bold uppercase tracking-wider w-10">#</th>
                      <th className="border-2 border-black px-3 py-2 text-center font-bold uppercase tracking-wider">Sign-Up</th>
                    </tr>
                  </thead>
                  <tbody>
                    {strikeCategories.map((category, catIdx) => {
                      const uniquePositions = getUniquePositions([category])
                      return (
                        <React.Fragment key={`scat-${catIdx}`}>
                          <tr className="bg-red-50">
                            <td colSpan={4} className="border-2 border-black px-3 py-1.5 font-bold text-xs uppercase tracking-wider">
                              {category.name}
                              {category.note && <span className="font-normal text-gray-500 ml-2">— {category.note}</span>}
                            </td>
                          </tr>
                          {uniquePositions.map((pos, posIdx) => {
                            const slots = countSlots([category], pos.role, pos.time)
                            return (
                              <tr key={`${catIdx}-${posIdx}`} className="hover:bg-gray-50">
                                <td className="border-2 border-black px-3 py-2 font-medium">{pos.role}</td>
                                <td className="border-2 border-black px-2 py-2 text-center text-xs text-gray-600 whitespace-nowrap">{pos.time ?? '—'}</td>
                                <td className="border-2 border-black px-2 py-2 text-center text-xs font-bold">{slots}</td>
                                <td className="border-2 border-black px-2 py-2">
                                  <div className="flex gap-1 flex-wrap justify-center">
                                    {Array.from({ length: slots }, (_, i) => (
                                      <div key={i} className="w-24 h-6 border border-dashed border-gray-300 rounded bg-gray-50" />
                                    ))}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <Alert variant="warning" className="mt-4">
                <strong>Strike Lighting/Shade/Bikes:</strong> ONLY for campers who must depart Sunday afternoon. This is their Exodus Monday strike commitment and does <strong>not</strong> count as a regular shift.
              </Alert>
            </section>

              </div>

              {/* Draft Order Sidebar (visible during active/paused drafts) */}
              {draft && (draft.status === 'active' || draft.status === 'paused') && (
                <div>
                  <Card className="sticky top-20">
                    <CardHeader>
                      <CardTitle className="text-sm">Draft Order</CardTitle>
                      <CardDescription className="text-xs">
                        Round {draft.current_round}/{draft.total_rounds}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="max-h-[60vh] overflow-y-auto">
                        {draftOrder.map((entry, idx) => {
                          const isCurrentPicker = draft.status === 'active' && draft.current_pick_index === idx
                          const isMe = entry.camper_id === currentUser.camperId
                          const camperPicks = picks.filter(
                            p => p.camper_id === entry.camper_id && p.status === 'picked'
                          )
                          return (
                            <div
                              key={entry.id}
                              className={cn(
                                "flex items-center gap-1 px-3 py-1.5 border-b border-gray-100 text-xs",
                                isCurrentPicker && "bg-yellow-200 font-bold",
                                isMe && !isCurrentPicker && "bg-blue-50"
                              )}
                            >
                              <span className="text-gray-400 font-mono w-5 text-right">{idx + 1}.</span>
                              <span className="flex-1 truncate">
                                {isMe ? (
                                  <span className="text-blue-700 font-bold">You</span>
                                ) : (
                                  entry.camper?.playa_name || entry.camper?.full_name || 'Unknown'
                                )}
                              </span>
                              {isCurrentPicker && <span>🎯</span>}
                              {camperPicks.length > 0 && (
                                <Badge variant="default" className="text-[9px] py-0 px-1">
                                  {camperPicks.length}
                                </Badge>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </TabPanel>

        {/* Coverage Tab */}
        <TabPanel tabId="coverage" activeTab={activeTab}>
          <div className="space-y-6">
            <Alert variant="info">
              This view shows overall shift coverage. Green = good. Red = someone needs to step up.
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>Coverage Summary</CardTitle>
                <CardDescription>
                  Are we staffed? Let&apos;s find out.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {roles.map(role => {
                    const roleShifts = shifts.filter(s => s.role_id === role.id)
                    const totalShifts = roleShifts.length
                    const fullyStaffed = roleShifts.filter(s => 
                      (s.assignments?.length || 0) >= s.min_coverage
                    ).length
                    const percentage = totalShifts > 0 ? Math.round((fullyStaffed / totalShifts) * 100) : 0

                    return (
                      <div key={role.id} className="border-2 border-black p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold">{role.name}</span>
                          <Badge variant={percentage >= 80 ? 'success' : percentage >= 50 ? 'warning' : 'error'}>
                            {fullyStaffed} / {totalShifts} shifts covered
                          </Badge>
                        </div>
                        <div className="h-4 bg-gray-200 border border-black">
                          <div 
                            className={cn(
                              "h-full transition-all",
                              percentage >= 80 && "bg-green-500",
                              percentage >= 50 && percentage < 80 && "bg-yellow-500",
                              percentage < 50 && "bg-red-500",
                            )}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {percentage}% of shifts have minimum coverage
                        </p>
                      </div>
                    )
                  })}
                </div>

                {roles.length === 0 && (
                  <p className="text-center text-gray-500">No roles to show coverage for.</p>
                )}
              </CardContent>
            </Card>

            {/* Call to Action */}
            <Card variant="warning">
              <CardContent className="py-6 text-center">
                <h3 className="font-bold text-xl mb-2">Need Help?</h3>
                <p className="mb-4">
                  If you see red, we need you. Check your schedule and sign up for shifts.
                </p>
                <Button onClick={() => setActiveTab('shifts')}>
                  View Open Shifts
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabPanel>
      </div>
    </div>
  )
}
