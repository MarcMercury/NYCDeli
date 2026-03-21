'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { 
  Card, CardHeader, CardTitle, CardDescription, CardContent,
  Badge, Tabs, TabPanel, Alert, Button
} from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { KitchenRole, KitchenShift, ScheduleAssignment, Camper } from '@/types/database'

type Tab = { id: string; label: string; icon?: React.ReactNode }

const DELI_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

const tabs: Tab[] = [
  { id: 'roles', label: 'Roles & Descriptions' },
  { id: 'signup', label: 'Sign-Up Sheet' },
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

    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    fetchData()
  }, [fetchData])

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
                {deliShiftCategories.map((category, catIdx) => (
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
                          <div key={posIdx} className="py-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 flex items-center justify-center bg-gray-100 border border-gray-300 text-xs font-bold rounded">
                                  {posIdx + 1}
                                </span>
                                <span className="font-medium">{pos.role}</span>
                                {pos.note && (
                                  <span className="text-xs text-gray-500">({pos.note})</span>
                                )}
                              </div>
                              <div className="flex gap-2">
                                {pos.time && (
                                  <Badge variant="info">{pos.time}</Badge>
                                )}
                                {pos.requiresExp && (
                                  <Badge variant="warning">Kitchen Exp. Required</Badge>
                                )}
                                {pos.countsDouble && (
                                  <Badge variant="success">Counts 2\u00d7</Badge>
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

            {/* Special Events Section */}
            <section>
              <h2 className="text-2xl font-black uppercase tracking-wider mb-1">
                🍜 Special Event Shifts
              </h2>
              <p className="text-sm text-gray-600 mb-4">One-off event support shifts</p>
              <div className="space-y-6">
                {specialShiftCategories.map((category, catIdx) => (
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

        {/* Sign-Up Sheet Tab — Grid */}
        <TabPanel tabId="signup" activeTab={activeTab}>
          <div className="space-y-10">
            {/* Deli Shifts Grid */}
            <section>
              <h2 className="text-2xl font-black uppercase tracking-wider mb-1">
                🥪 Deli Shifts (Mon–Sat)
              </h2>
              <p className="text-sm text-gray-600 mb-4">Sign up for your shifts below. Each box = one slot per day.</p>
              <div className="overflow-x-auto">
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
                    {deliShiftCategories.map((category, catIdx) => {
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
                            return (
                              <tr key={`${catIdx}-${posIdx}`} className="hover:bg-gray-50">
                                <td className="border-2 border-black px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{pos.role}</span>
                                    {pos.requiresExp && <Badge variant="warning" className="text-[10px] px-1 py-0">Exp.</Badge>}
                                    {pos.countsDouble && <Badge variant="success" className="text-[10px] px-1 py-0">2×</Badge>}
                                  </div>
                                </td>
                                <td className="border-2 border-black px-2 py-2 text-center text-xs text-gray-600 whitespace-nowrap">{pos.time ?? '—'}</td>
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
            </section>

            {/* Special Events Grid */}
            <section>
              <h2 className="text-2xl font-black uppercase tracking-wider mb-1">
                🍜 Special Event Shifts
              </h2>
              <p className="text-sm text-gray-600 mb-4">One-off events — sign up for a specific role</p>
              {specialShiftCategories.map((category, catIdx) => {
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
