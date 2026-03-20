'use client'

import { useState, useEffect } from 'react'
import { 
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
  Badge, Tabs, TabPanel, Alert, Button
} from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate, formatTime, getSkillDisplayName } from '@/lib/utils'
import type { KitchenRole, KitchenShift, ScheduleAssignment, Camper } from '@/types/database'

type Tab = { id: string; label: string; icon?: React.ReactNode }

const tabs: Tab[] = [
  { id: 'roles', label: 'Roles' },
  { id: 'shifts', label: 'Shifts' },
  { id: 'coverage', label: 'Coverage' },
]

interface ShiftWithAssignments extends KitchenShift {
  role?: KitchenRole
  assignments?: (ScheduleAssignment & { camper?: Camper })[]
}

export default function KitchenPage() {
  const [activeTab, setActiveTab] = useState('roles')
  const [roles, setRoles] = useState<KitchenRole[]>([])
  const [shifts, setShifts] = useState<ShiftWithAssignments[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
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

        {/* Tabs */}
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

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
