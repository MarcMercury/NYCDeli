'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Card, CardHeader, CardTitle, CardDescription, CardContent,
  Badge, Input, Alert, Button, Tabs, TabPanel
} from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate, formatTime, getStatusColor } from '@/lib/utils'
import type { KitchenRole, KitchenShift, ScheduleAssignment, Camper } from '@/types/database'

interface EnrichedAssignment extends ScheduleAssignment {
  shift?: KitchenShift & { role?: KitchenRole }
  camper?: Camper
}

type Tab = { id: string; label: string }

const tabs: Tab[] = [
  { id: 'calendar', label: 'Calendar View' },
  { id: 'my-schedule', label: 'My Schedule' },
  { id: 'all', label: 'All Assignments' },
]

export default function SchedulePage() {
  const [activeTab, setActiveTab] = useState('calendar')
  const [email, setEmail] = useState('')
  const [currentCamper, setCurrentCamper] = useState<Camper | null>(null)
  const [assignments, setAssignments] = useState<EnrichedAssignment[]>([])
  const [myAssignments, setMyAssignments] = useState<EnrichedAssignment[]>([])
  const [shifts, setShifts] = useState<(KitchenShift & { role?: KitchenRole })[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    
    // Fetch all data
    const [rolesRes, shiftsRes, assignmentsRes, campersRes] = await Promise.all([
      supabase.from('kitchen_roles').select('*'),
      supabase.from('kitchen_shifts').select('*').order('date').order('start_time'),
      supabase.from('schedule_assignments').select('*'),
      supabase.from('campers').select('*'),
    ])

    const roles = (rolesRes.data as KitchenRole[]) || []
    const shiftsData = (shiftsRes.data as KitchenShift[]) || []
    const assignmentsData = (assignmentsRes.data as ScheduleAssignment[]) || []
    const campers = (campersRes.data as Camper[]) || []

    // Enrich shifts with roles
    const enrichedShifts = shiftsData.map(shift => ({
      ...shift,
      role: roles.find(r => r.id === shift.role_id),
    }))
    setShifts(enrichedShifts)

    // Enrich assignments
    const enrichedAssignments = assignmentsData.map(assignment => ({
      ...assignment,
      shift: enrichedShifts.find(s => s.id === assignment.shift_id),
      camper: campers.find(c => c.id === assignment.camper_id),
    }))
    setAssignments(enrichedAssignments)

    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const lookupSchedule = async () => {
    if (!email) return
    
    const supabase = createClient()
    const { data: camperData } = await supabase
      .from('campers')
      .select('*')
      .eq('email', email.toLowerCase())
      .single()

    const camper = camperData as Camper | null
    if (camper) {
      setCurrentCamper(camper)
      setMyAssignments(assignments.filter(a => a.camper_id === camper.id))
      setActiveTab('my-schedule')
    } else {
      alert("No camper found with that email. Check spelling or register first.")
    }
  }

  // Group shifts by date for calendar view
  const shiftsByDate = shifts.reduce((acc, shift) => {
    const date = shift.date
    if (!acc[date]) acc[date] = []
    acc[date].push(shift)
    return acc
  }, {} as Record<string, typeof shifts>)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">📅</div>
          <p className="font-bold uppercase tracking-wider">Loading Schedule...</p>
          <p className="text-sm text-gray-600">Organizing your obligations</p>
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
            Schedule
          </h1>
          <p className="text-gray-600">
            This is non-negotiable. Plan accordingly.
          </p>
        </div>

        {/* Lookup Box */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Find Your Schedule</CardTitle>
            <CardDescription>
              Enter your email to see your assigned shifts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
              />
              <Button onClick={lookupSchedule}>
                Look Up
              </Button>
            </div>
            {currentCamper && (
              <div className="mt-4 p-4 bg-green-50 border-2 border-green-400">
                <p className="font-bold">
                  ✓ Found: {currentCamper.playa_name || currentCamper.full_name}
                </p>
                <p className="text-sm text-gray-600">
                  {myAssignments.length} shifts assigned
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {/* Calendar View Tab */}
        <TabPanel tabId="calendar" activeTab={activeTab}>
          <div className="space-y-6">
            {Object.keys(shiftsByDate).length === 0 ? (
              <Alert variant="info">
                No shifts scheduled yet. Check back closer to the event.
              </Alert>
            ) : (
              Object.entries(shiftsByDate).map(([date, dateShifts]) => (
                <Card key={date}>
                  <CardHeader>
                    <CardTitle>{formatDate(date)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      {dateShifts.map(shift => {
                        const shiftAssignments = assignments.filter(a => a.shift_id === shift.id)
                        const isFull = shiftAssignments.length >= shift.min_coverage
                        const isMyShift = currentCamper && shiftAssignments.some(a => a.camper_id === currentCamper.id)

                        return (
                          <div 
                            key={shift.id}
                            className={cn(
                              "border-2 border-black p-4 transition-colors",
                              isFull && "bg-green-50",
                              !isFull && "bg-yellow-50",
                              isMyShift && "ring-4 ring-yellow-400"
                            )}
                          >
                            <div className="flex flex-wrap justify-between items-start gap-2">
                              <div>
                                <h4 className="font-bold">{shift.role?.name || 'Unknown Role'}</h4>
                                <p className="text-sm text-gray-600">
                                  {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Badge variant={isFull ? 'success' : 'warning'}>
                                  {shiftAssignments.length}/{shift.min_coverage}
                                </Badge>
                                {isMyShift && (
                                  <Badge variant="info">Your Shift</Badge>
                                )}
                              </div>
                            </div>
                            
                            {shiftAssignments.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {shiftAssignments.map(a => (
                                  <span 
                                    key={a.id}
                                    className={cn(
                                      "text-xs px-2 py-1 border",
                                      getStatusColor(a.status),
                                      a.camper_id === currentCamper?.id && "font-bold"
                                    )}
                                  >
                                    {a.camper?.playa_name || a.camper?.full_name || '?'}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabPanel>

        {/* My Schedule Tab */}
        <TabPanel tabId="my-schedule" activeTab={activeTab}>
          {!currentCamper ? (
            <Alert variant="warning">
              Enter your email above to see your personal schedule.
            </Alert>
          ) : myAssignments.length === 0 ? (
            <Alert variant="info">
              No shifts assigned yet. Either you haven&apos;t been scheduled, or the schedule 
              hasn&apos;t been released yet. Check back later.
            </Alert>
          ) : (
            <div className="space-y-4">
              <Card variant="warning">
                <CardContent className="py-4">
                  <p className="font-bold text-center">
                    You have {myAssignments.length} shift{myAssignments.length !== 1 ? 's' : ''} assigned.
                    {' '}Don&apos;t miss them.
                  </p>
                </CardContent>
              </Card>

              {myAssignments
                .sort((a, b) => {
                  if (!a.shift || !b.shift) return 0
                  return a.shift.date.localeCompare(b.shift.date) || 
                         a.shift.start_time.localeCompare(b.shift.start_time)
                })
                .map(assignment => (
                  <Card key={assignment.id}>
                    <CardContent className="py-4">
                      <div className="flex flex-wrap justify-between items-start gap-4">
                        <div>
                          <h4 className="font-bold text-lg">
                            {assignment.shift?.role?.name || 'Unknown Role'}
                          </h4>
                          <p className="text-gray-600">
                            {assignment.shift && formatDate(assignment.shift.date)}
                          </p>
                          <p className="text-sm">
                            {assignment.shift && (
                              <>
                                {formatTime(assignment.shift.start_time)} - {formatTime(assignment.shift.end_time)}
                              </>
                            )}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge 
                            variant={
                              assignment.status === 'confirmed' ? 'success' :
                              assignment.status === 'completed' ? 'info' :
                              assignment.status === 'no-show' ? 'error' : 'warning'
                            }
                          >
                            {assignment.status}
                          </Badge>
                          {assignment.locked && (
                            <Badge variant="error">🔒 Locked</Badge>
                          )}
                        </div>
                      </div>
                      {assignment.notes && (
                        <p className="mt-2 text-sm text-gray-600 italic">
                          Note: {assignment.notes}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))
              }
            </div>
          )}
        </TabPanel>

        {/* All Assignments Tab */}
        <TabPanel tabId="all" activeTab={activeTab}>
          <Card>
            <CardHeader>
              <CardTitle>All Assignments</CardTitle>
              <CardDescription>
                Everyone&apos;s schedule at a glance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No assignments yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-black">
                        <th className="text-left p-2 font-bold uppercase tracking-wider">Camper</th>
                        <th className="text-left p-2 font-bold uppercase tracking-wider">Role</th>
                        <th className="text-left p-2 font-bold uppercase tracking-wider">Date</th>
                        <th className="text-left p-2 font-bold uppercase tracking-wider">Time</th>
                        <th className="text-left p-2 font-bold uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments
                        .sort((a, b) => {
                          if (!a.shift || !b.shift) return 0
                          return a.shift.date.localeCompare(b.shift.date) || 
                                 a.shift.start_time.localeCompare(b.shift.start_time)
                        })
                        .map(assignment => (
                          <tr 
                            key={assignment.id} 
                            className={cn(
                              "border-b border-gray-200",
                              assignment.camper_id === currentCamper?.id && "bg-yellow-50"
                            )}
                          >
                            <td className="p-2">
                              {assignment.camper?.playa_name || assignment.camper?.full_name || '?'}
                            </td>
                            <td className="p-2">{assignment.shift?.role?.name || '?'}</td>
                            <td className="p-2">
                              {assignment.shift && formatDate(assignment.shift.date)}
                            </td>
                            <td className="p-2">
                              {assignment.shift && (
                                <>
                                  {formatTime(assignment.shift.start_time)} - {formatTime(assignment.shift.end_time)}
                                </>
                              )}
                            </td>
                            <td className="p-2">
                              <Badge 
                                variant={
                                  assignment.status === 'confirmed' ? 'success' :
                                  assignment.status === 'completed' ? 'info' :
                                  assignment.status === 'no-show' ? 'error' : 'warning'
                                }
                              >
                                {assignment.status}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabPanel>
      </div>
    </div>
  )
}
