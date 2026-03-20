'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
  Badge, Tabs, TabPanel, Alert, Button
} from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate, formatTime, getSkillDisplayName } from '@/lib/utils'
import type { KitchenRole, KitchenShift, ScheduleAssignment, Camper } from '@/types/database'

type Tab = { id: string; label: string; icon?: React.ReactNode }

const tabs: Tab[] = [
  { id: 'signup', label: 'Sign-Up Sheet' },
  { id: 'roles', label: 'Roles' },
  { id: 'shifts', label: 'Shifts' },
  { id: 'coverage', label: 'Coverage' },
]

interface ShiftPosition {
  role: string
  time?: string
  note?: string
  countsDouble?: boolean
  requiresExp?: boolean
}

interface ShiftCategory {
  name: string
  time?: string
  note?: string
  positions: ShiftPosition[]
}

const deliShiftCategories: ShiftCategory[] = [
  {
    name: 'Deli Shifts (M\u2013Sat)',
    note: 'Core daily shifts running the NYC Deli',
    positions: [
      { role: 'Kitchen Lead', note: 'as needed' },
      { role: 'Kitchen Supervisor', time: '8:30AM\u201312:30PM', requiresExp: true, countsDouble: true },
      { role: 'Camp Manager Day', time: '10AM\u20134PM', countsDouble: true },
      { role: 'Camp Manager Day Deputy', time: '10AM\u20131PM' },
      { role: 'Camp Manager Day Deputy', time: '1PM\u20134PM' },
      { role: 'Camp Manager Night', time: '4PM\u201310PM', countsDouble: true },
      { role: 'Camp Manager Night Deputy', time: '4PM\u20137PM' },
      { role: 'Camp Manager Night Deputy', time: '7PM\u201310PM' },
    ],
  },
  {
    name: 'Prep Crew',
    time: '8:30\u201311:00 AM',
    note: '5 positions',
    positions: [
      { role: 'Prep Crew' },
      { role: 'Prep Crew' },
      { role: 'Prep Crew' },
      { role: 'Prep Crew' },
      { role: 'Prep Crew' },
    ],
  },
  {
    name: 'Order Taker',
    time: '9:30\u201312:00',
    note: '1 position',
    positions: [
      { role: 'Order Taker & Counter', note: 'Basically Entertainer' },
    ],
  },
  {
    name: 'Grill \u2013 Service Shift',
    time: '9:30\u201312:00',
    note: '4 positions',
    positions: [
      { role: 'Grill Lead', requiresExp: true },
      { role: 'Grill' },
      { role: 'Grill' },
      { role: 'Grill' },
    ],
  },
  {
    name: 'Assembly / Deli Service',
    time: '9:30\u201312:00',
    note: '5 positions',
    positions: [
      { role: 'Assembly (Egg + Egg+Cheese)' },
      { role: 'Assembly (Schmearer)' },
      { role: 'Assembly (Bacon)' },
      { role: 'Assembly (Coffee + Milk)' },
      { role: 'Assembly (Sandwich Counter)' },
    ],
  },
  {
    name: 'Runner',
    time: '9:30\u201312:00',
    note: '2 positions',
    positions: [
      { role: 'Runner (Assist)' },
      { role: 'Runner (Assist)' },
    ],
  },
  {
    name: 'Security',
    time: '10:00\u201312:30',
    note: '1 position',
    positions: [
      { role: 'Security' },
    ],
  },
  {
    name: 'Clean-up Crew',
    time: '12:00\u20132:30',
    note: '5 positions',
    positions: [
      { role: 'Clean-up & Service Kitchen Reset' },
      { role: 'Clean-up & Service Kitchen Reset' },
      { role: 'Clean-up & Service Kitchen Reset' },
      { role: 'Clean-up & Service Kitchen Reset' },
      { role: 'Clean-up & Service Kitchen Reset' },
    ],
  },
  {
    name: 'Entertainers',
    time: '10:00\u201312:30',
    note: 'Up to 4 positions',
    positions: [
      { role: 'Entertainer / Bike Manager Shift' },
      { role: 'Entertainer / Bike Manager Shift' },
      { role: 'Entertainer / Line Manager Shift' },
      { role: 'Entertainer / Line Manager Shift' },
    ],
  },
  {
    name: 'Music & DJs',
    time: '9:30\u201312:30',
    note: '3 hours',
    positions: [
      { role: 'DJ' },
    ],
  },
]

const specialShiftCategories: ShiftCategory[] = [
  {
    name: 'Friday 8/29 Deep Playa Food Service',
    note: 'Soup for 1,000 \u2013 Supporting food service in Deep Playa',
    positions: [
      { role: 'Kitchen Lead', time: '3PM\u20136:30PM' },
      { role: 'Grill Lead', time: '3PM\u20136:30PM', requiresExp: true },
      { role: 'Supervise 15\u201320 Volunteers (Camp Milk & Honey)', time: '3PM\u20136:30PM' },
      { role: 'Supervise 15\u201320 Volunteers (Camp Milk & Honey)', time: '3PM\u20136:30PM' },
      { role: 'Supervise 15\u201320 Volunteers (Camp Milk & Honey)', time: '3PM\u20136:30PM' },
      { role: 'Transport & Serving Crew', time: '6:30PM\u20139PM' },
      { role: 'Transport & Serving Crew', time: '6:30PM\u20139PM' },
      { role: 'Transport & Serving Crew', time: '6:30PM\u20139PM' },
      { role: 'Transport & Serving Crew', time: '6:30PM\u20139PM' },
    ],
  },
]

const strikeCategories: ShiftCategory[] = [
  {
    name: 'Strike Deco + Public Chill Tent',
    note: 'Sunday 8/31',
    positions: [
      { role: 'Striker', time: '8:30AM\u201311AM' },
      { role: 'Striker', time: '8:30AM\u201311AM' },
      { role: 'Striker', time: '8:30AM\u201311AM' },
      { role: 'Striker', time: '8:30AM\u201311AM' },
    ],
  },
  {
    name: 'Strike Service Kitchen',
    note: 'Sunday 8/31',
    positions: [
      { role: 'Striker', time: '8:30AM\u201311AM' },
      { role: 'Striker', time: '8:30AM\u201311AM' },
      { role: 'Striker', time: '8:30AM\u201311AM' },
    ],
  },
  {
    name: 'Strike Plumbing + Shower Container',
    note: 'Sunday 8/31',
    positions: [
      { role: 'Striker', time: '8:30AM\u201311AM' },
      { role: 'Striker', time: '8:30AM\u201311AM' },
      { role: 'Striker', time: '8:30AM\u201311AM' },
      { role: 'Striker', time: '8:30AM\u201311AM' },
    ],
  },
  {
    name: 'Strike Power',
    note: 'Sunday 8/31',
    positions: [
      { role: 'Striker', time: '8:30AM\u201311AM' },
      { role: 'Striker', time: '8:30AM\u201311AM' },
      { role: 'Striker', time: '8:30AM\u201311AM' },
      { role: 'Striker', time: '8:30AM\u201311AM' },
    ],
  },
  {
    name: 'Strike Lighting + Shade Squares + Evap Coolers + Bike Racks',
    note: 'Sunday 8/31 \u2013 ONLY for campers who must depart Sunday afternoon. This is their Exodus Monday strike commitment and does not count as a shift.',
    positions: [
      { role: 'Striker', time: '8:30AM\u201311AM' },
      { role: 'Striker', time: '8:30AM\u201311AM' },
      { role: 'Striker', time: '8:30AM\u201311AM' },
      { role: 'Striker', time: '8:30AM\u201311AM' },
      { role: 'Striker', time: '8:30AM\u201311AM' },
      { role: 'Striker', time: '8:30AM\u201311AM' },
      { role: 'Striker', time: '8:30AM\u201311AM' },
      { role: 'Striker', time: '8:30AM\u201311AM' },
      { role: 'Striker', time: '8:30AM\u201311AM' },
      { role: 'Striker', time: '8:30AM\u201311AM' },
    ],
  },
]

interface ShiftWithAssignments extends KitchenShift {
  role?: KitchenRole
  assignments?: (ScheduleAssignment & { camper?: Camper })[]
}

export default function KitchenPage() {
  const [activeTab, setActiveTab] = useState('signup')
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

        {/* Sign-Up Sheet Tab */}
        <TabPanel tabId="signup" activeTab={activeTab}>
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
                          <div key={posIdx} className="flex flex-wrap items-center justify-between gap-2 py-2">
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
                          <div key={posIdx} className="flex flex-wrap items-center justify-between gap-2 py-2">
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
                          <div key={posIdx} className="flex flex-wrap items-center justify-between gap-2 py-2">
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
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </div>
        </TabPanel>

        {/* Roles Tab */}
        <TabPanel tabId="roles" activeTab={activeTab}>
          <div className="grid md:grid-cols-2 gap-6">
            {roles.map(role => (
              <Card key={role.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle>{role.name}</CardTitle>
                    <Badge variant="info">
                      {role.min_per_shift}-{role.max_per_shift} per shift
                    </Badge>
                  </div>
                  <CardDescription>{role.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      Responsibilities
                    </h4>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {role.responsibilities.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      Shift Expectations
                    </h4>
                    <p className="text-sm">{role.shift_expectations}</p>
                  </div>

                  {role.requires_skills.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                        Required Skills
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {role.requires_skills.map(skill => (
                          <Badge key={skill} variant="default">
                            {getSkillDisplayName(skill)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="bg-red-50 border-t-2 border-red-300">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-red-700 mb-1">
                      ⚠️ If You Fail
                    </h4>
                    <p className="text-sm text-red-800 italic">
                      &ldquo;{role.failure_consequences}&rdquo;
                    </p>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>

          {roles.length === 0 && (
            <Alert variant="info">
              No kitchen roles defined yet. Check back later.
            </Alert>
          )}
        </TabPanel>

        {/* Shifts Tab */}
        <TabPanel tabId="shifts" activeTab={activeTab}>
          <div className="space-y-4">
            {shifts.length === 0 ? (
              <Alert variant="info">
                No shifts scheduled yet. The schedule will be posted closer to the event.
              </Alert>
            ) : (
              // Group shifts by date
              Object.entries(
                shifts.reduce((acc, shift) => {
                  const date = shift.date
                  if (!acc[date]) acc[date] = []
                  acc[date].push(shift)
                  return acc
                }, {} as Record<string, ShiftWithAssignments[]>)
              ).map(([date, dateShifts]) => (
                <Card key={date}>
                  <CardHeader>
                    <CardTitle>{formatDate(date)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dateShifts.map(shift => (
                        <div 
                          key={shift.id}
                          className={cn(
                            "border-2 border-black p-4",
                            (shift.assignments?.length || 0) >= shift.min_coverage
                              ? "bg-green-50"
                              : "bg-yellow-50"
                          )}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold">{shift.role?.name || 'Unknown Role'}</span>
                              <Badge>
                                {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                              </Badge>
                            </div>
                            <Badge 
                              variant={(shift.assignments?.length || 0) >= shift.min_coverage ? 'success' : 'warning'}
                            >
                              {shift.assignments?.length || 0} / {shift.min_coverage} minimum
                            </Badge>
                          </div>
                          
                          {shift.assignments && shift.assignments.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {shift.assignments.map(assignment => (
                                <span 
                                  key={assignment.id}
                                  className={cn(
                                    "text-xs px-2 py-1 border",
                                    assignment.status === 'confirmed' && "bg-green-100 border-green-400",
                                    assignment.status === 'scheduled' && "bg-yellow-100 border-yellow-400",
                                    assignment.status === 'completed' && "bg-blue-100 border-blue-400",
                                    assignment.status === 'no-show' && "bg-red-100 border-red-400 line-through",
                                  )}
                                >
                                  {assignment.camper?.playa_name || assignment.camper?.full_name || 'Unknown'}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 italic">No one assigned yet</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
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
