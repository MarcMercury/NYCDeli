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
  { id: 'all', label: 'All Shifts' },
  { id: 'my-schedule', label: 'My Schedule' },
]

function AssignmentGrid({ 
  assignments, 
  currentCamperId,
  emptyMessage = 'No assignments yet.',
}: { 
  assignments: EnrichedAssignment[]
  currentCamperId?: string
  emptyMessage?: string
}) {
  const sorted = [...assignments].sort((a, b) => {
    if (!a.shift || !b.shift) return 0
    return a.shift.date.localeCompare(b.shift.date) || 
           a.shift.start_time.localeCompare(b.shift.start_time) ||
           (a.shift.role?.name || '').localeCompare(b.shift.role?.name || '')
  })

  if (sorted.length === 0) {
    return (
      <p className="text-center text-gray-500 py-8">
        {emptyMessage}
      </p>
    )
  }

  return (
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
          {sorted.map(assignment => (
            <tr 
              key={assignment.id} 
              className={cn(
                "border-b border-gray-200 hover:bg-gray-50 transition-colors",
                assignment.camper_id === currentCamperId && "bg-yellow-50 hover:bg-yellow-100"
              )}
            >
              <td className="p-3 font-medium">
                {assignment.camper?.playa_name || assignment.camper?.full_name || '—'}
              </td>
              <td className="p-3">
                {assignment.shift?.role?.name || '—'}
              </td>
              <td className="p-3 whitespace-nowrap">
                {assignment.shift ? formatDate(assignment.shift.date) : '—'}
              </td>
              <td className="p-3 whitespace-nowrap">
                {assignment.shift
                  ? `${formatTime(assignment.shift.start_time)} – ${formatTime(assignment.shift.end_time)}`
                  : '—'}
              </td>
              <td className="p-3">
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
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function SchedulePage() {
  const [activeTab, setActiveTab] = useState('all')
  const [email, setEmail] = useState('')
  const [currentCamper, setCurrentCamper] = useState<Camper | null>(null)
  const [assignments, setAssignments] = useState<EnrichedAssignment[]>([])
  const [myAssignments, setMyAssignments] = useState<EnrichedAssignment[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    
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

    const enrichedShifts = shiftsData.map(shift => ({
      ...shift,
      role: roles.find(r => r.id === shift.role_id),
    }))

    const enrichedAssignments = assignmentsData.map(assignment => ({
      ...assignment,
      shift: enrichedShifts.find(s => s.id === assignment.shift_id),
      camper: campers.find(c => c.id === assignment.camper_id),
    }))
    setAssignments(enrichedAssignments)

    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    void fetchData()
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
                  {myAssignments.length} shift{myAssignments.length !== 1 ? 's' : ''} assigned
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {/* All Shifts Tab */}
        <TabPanel tabId="all" activeTab={activeTab}>
          <Card>
            <CardHeader>
              <CardTitle>All Assignments</CardTitle>
              <CardDescription>
                Everyone&apos;s schedule at a glance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AssignmentGrid 
                assignments={assignments} 
                currentCamperId={currentCamper?.id} 
              />
            </CardContent>
          </Card>
        </TabPanel>

        {/* My Schedule Tab */}
        <TabPanel tabId="my-schedule" activeTab={activeTab}>
          {!currentCamper ? (
            <Alert variant="warning">
              Enter your email above to see your personal schedule.
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

              <Card>
                <CardContent>
                  <AssignmentGrid 
                    assignments={myAssignments} 
                    currentCamperId={currentCamper.id}
                    emptyMessage="No shifts assigned yet. Either you haven't been scheduled, or the schedule hasn't been released yet."
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </TabPanel>
      </div>
    </div>
  )
}
