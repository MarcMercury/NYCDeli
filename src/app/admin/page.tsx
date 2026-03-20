'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { 
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
  Badge, Alert, Button, Input, Tabs, TabPanel, Select
} from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate, getSkillDisplayName } from '@/lib/utils'
import type { Camper, BuildTask, SystemSetting, KitchenShift, ScheduleAssignment, CamperUpdate } from '@/types/database'

type Tab = { id: string; label: string }

const tabs: Tab[] = [
  { id: 'campers', label: 'Campers' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'settings', label: 'Settings' },
]

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('campers')
  const [campers, setCampers] = useState<Camper[]>([])
  const [tasks, setTasks] = useState<BuildTask[]>([])
  const [settings, setSettings] = useState<SystemSetting[]>([])
  const [shifts, setShifts] = useState<KitchenShift[]>([])
  const [assignments, setAssignments] = useState<ScheduleAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCamper, setSelectedCamper] = useState<Camper | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    
    const [campersRes, tasksRes, settingsRes, shiftsRes, assignmentsRes] = await Promise.all([
      supabase.from('campers').select('*').order('created_at', { ascending: false }),
      supabase.from('build_tasks').select('*').order('phase').order('status'),
      supabase.from('system_settings').select('*').order('key'),
      supabase.from('kitchen_shifts').select('*').order('date'),
      supabase.from('schedule_assignments').select('*'),
    ])

    setCampers(campersRes.data || [])
    setTasks(tasksRes.data || [])
    setSettings(settingsRes.data || [])
    setShifts(shiftsRes.data || [])
    setAssignments(assignmentsRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    fetchData()
  }, [fetchData])

  const filteredCampers = campers.filter(c => 
    c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.playa_name && c.playa_name.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const updateCamper = async (camperId: string, updates: CamperUpdate) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('campers')
      .update(updates as never)
      .eq('id', camperId)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Camper updated successfully' })
      fetchData()
    }
  }

  const updateTaskStatus = async (taskId: string, status: 'pending' | 'active' | 'done') => {
    const supabase = createClient()
    const { error } = await supabase
      .from('build_tasks')
      .update({ 
        status, 
        completed_at: status === 'done' ? new Date().toISOString() : null 
      } as never)
      .eq('id', taskId)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Task updated' })
      fetchData()
    }
  }

  const updateSetting = async (key: string, value: string) => {
    const supabase = createClient()
    const { error } = await supabase
      .from('system_settings')
      .update({ value, updated_at: new Date().toISOString() } as never)
      .eq('key', key)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Setting updated' })
      fetchData()
    }
  }

  const deleteCamper = async (camperId: string) => {
    if (!confirm('Are you sure? This will delete the camper and all their assignments.')) return
    
    const supabase = createClient()
    const { error } = await supabase
      .from('campers')
      .delete()
      .eq('id', camperId)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Camper deleted' })
      setSelectedCamper(null)
      fetchData()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⚙️</div>
          <p className="font-bold uppercase tracking-wider">Loading Admin Panel...</p>
          <p className="text-sm text-gray-600">With great power comes great spreadsheets</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-wider mb-2">
            Admin Control
          </h1>
          <p className="text-gray-600">
            Override responsibly. Or don&apos;t. You&apos;re the admin.
          </p>
        </div>

        {/* Warning */}
        <Alert variant="warning" className="mb-8">
          <strong>Admin Mode Active.</strong> Changes here affect the live system. 
          Think before you click. Data has feelings.
        </Alert>

        {/* Message */}
        {message && (
          <Alert 
            variant={message.type === 'success' ? 'success' : 'error'} 
            className="mb-4"
          >
            {message.text}
            <button 
              className="ml-4 underline"
              onClick={() => setMessage(null)}
            >
              Dismiss
            </button>
          </Alert>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-3xl font-black">{campers.length}</p>
              <p className="text-xs uppercase tracking-wider text-gray-500">Registered</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-3xl font-black">{campers.filter(c => c.build_week_attending).length}</p>
              <p className="text-xs uppercase tracking-wider text-gray-500">Build Week</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-3xl font-black">{tasks.filter(t => t.status !== 'done').length}</p>
              <p className="text-xs uppercase tracking-wider text-gray-500">Open Tasks</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-3xl font-black">{assignments.length}</p>
              <p className="text-xs uppercase tracking-wider text-gray-500">Shift Assignments</p>
            </CardContent>
          </Card>
          <Link href="/admin/camp-spots" className="block">
            <Card className="hover:border-yellow-500 transition-colors h-full">
              <CardContent className="py-4 text-center">
                <p className="text-3xl font-black">🏕️</p>
                <p className="text-xs uppercase tracking-wider text-yellow-600 font-bold">Camp Map Admin</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/layout-builder" className="block">
            <Card className="hover:border-yellow-500 transition-colors h-full">
              <CardContent className="py-4 text-center">
                <p className="text-3xl font-black">🗺️</p>
                <p className="text-xs uppercase tracking-wider text-yellow-600 font-bold">Layout Builder</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/applicants" className="block">
            <Card className="hover:border-yellow-500 transition-colors h-full">
              <CardContent className="py-4 text-center">
                <p className="text-3xl font-black">📋</p>
                <p className="text-xs uppercase tracking-wider text-yellow-600 font-bold">Applicant Review</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/permissions" className="block">
            <Card className="hover:border-yellow-500 transition-colors h-full">
              <CardContent className="py-4 text-center">
                <p className="text-3xl font-black">🔐</p>
                <p className="text-xs uppercase tracking-wider text-yellow-600 font-bold">Permissions</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Tabs */}
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {/* Campers Tab */}
        <TabPanel tabId="campers" activeTab={activeTab}>
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Camper List */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>All Campers ({campers.length})</CardTitle>
                  <Input
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mt-2"
                  />
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[600px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-white border-b-2 border-black">
                        <tr>
                          <th className="text-left p-3 font-bold uppercase tracking-wider">Name</th>
                          <th className="text-left p-3 font-bold uppercase tracking-wider hidden md:table-cell">Shelter</th>
                          <th className="text-left p-3 font-bold uppercase tracking-wider hidden md:table-cell">Arrival</th>
                          <th className="text-left p-3 font-bold uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCampers.map(camper => (
                          <tr 
                            key={camper.id}
                            className={cn(
                              "border-b border-gray-200 hover:bg-gray-50 cursor-pointer",
                              selectedCamper?.id === camper.id && "bg-yellow-50"
                            )}
                            onClick={() => setSelectedCamper(camper)}
                          >
                            <td className="p-3">
                              <p className="font-bold">{camper.playa_name || camper.full_name}</p>
                              <p className="text-xs text-gray-500">{camper.email}</p>
                            </td>
                            <td className="p-3 hidden md:table-cell">
                              <Badge>{camper.shelter_type}</Badge>
                            </td>
                            <td className="p-3 hidden md:table-cell">
                              {formatDate(camper.arrival_date)}
                            </td>
                            <td className="p-3">
                              <Button 
                                size="sm" 
                                variant="secondary"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedCamper(camper)
                                }}
                              >
                                Edit
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Camper Detail/Edit */}
            <div>
              {selectedCamper ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Edit Camper</CardTitle>
                    <CardDescription>{selectedCamper.email}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-xs font-bold uppercase">Full Name</label>
                      <Input 
                        value={selectedCamper.full_name}
                        onChange={(e) => setSelectedCamper({...selectedCamper, full_name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase">Playa Name</label>
                      <Input 
                        value={selectedCamper.playa_name || ''}
                        onChange={(e) => setSelectedCamper({...selectedCamper, playa_name: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-bold uppercase">Length (ft)</label>
                        <Input 
                          type="number"
                          value={selectedCamper.shelter_length_ft}
                          onChange={(e) => setSelectedCamper({...selectedCamper, shelter_length_ft: parseFloat(e.target.value)})}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase">Width (ft)</label>
                        <Input 
                          type="number"
                          value={selectedCamper.shelter_width_ft}
                          onChange={(e) => setSelectedCamper({...selectedCamper, shelter_width_ft: parseFloat(e.target.value)})}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-bold uppercase">Layout X</label>
                        <Input 
                          type="number"
                          value={selectedCamper.layout_x || ''}
                          onChange={(e) => setSelectedCamper({...selectedCamper, layout_x: e.target.value ? parseFloat(e.target.value) : null})}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase">Layout Y</label>
                        <Input 
                          type="number"
                          value={selectedCamper.layout_y || ''}
                          onChange={(e) => setSelectedCamper({...selectedCamper, layout_y: e.target.value ? parseFloat(e.target.value) : null})}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedCamper.placement_locked}
                          onChange={(e) => setSelectedCamper({...selectedCamper, placement_locked: e.target.checked})}
                        />
                        <span className="text-sm">Lock Placement</span>
                      </label>
                    </div>
                    <div>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedCamper.is_admin}
                          onChange={(e) => setSelectedCamper({...selectedCamper, is_admin: e.target.checked})}
                        />
                        <span className="text-sm">Is Admin</span>
                      </label>
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase">Skills</label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedCamper.skills.map(skill => (
                          <Badge key={skill}>{getSkillDisplayName(skill)}</Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button 
                      variant="danger" 
                      size="sm"
                      onClick={() => deleteCamper(selectedCamper.id)}
                    >
                      Delete
                    </Button>
                    <Button 
                      onClick={() => updateCamper(selectedCamper.id, selectedCamper)}
                    >
                      Save Changes
                    </Button>
                  </CardFooter>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    Select a camper to edit
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabPanel>

        {/* Schedule Tab */}
        <TabPanel tabId="schedule" activeTab={activeTab}>
          <Card>
            <CardHeader>
              <CardTitle>Schedule Management</CardTitle>
              <CardDescription>
                Create and manage kitchen shifts and assignments.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert variant="info" className="mb-4">
                Shift management coming soon. For now, edit directly in Supabase.
              </Alert>
              
              <div className="space-y-4">
                <h4 className="font-bold">Current Shifts ({shifts.length})</h4>
                {shifts.length === 0 ? (
                  <p className="text-gray-500">No shifts created yet.</p>
                ) : (
                  <div className="space-y-2">
                    {shifts.slice(0, 10).map(shift => (
                      <div key={shift.id} className="border-2 border-black p-3 flex justify-between items-center">
                        <div>
                          <p className="font-bold">{formatDate(shift.date)}</p>
                          <p className="text-sm text-gray-600">{shift.start_time} - {shift.end_time}</p>
                        </div>
                        <Badge>
                          {assignments.filter(a => a.shift_id === shift.id).length} assigned
                        </Badge>
                      </div>
                    ))}
                    {shifts.length > 10 && (
                      <p className="text-sm text-gray-500">+ {shifts.length - 10} more shifts</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabPanel>

        {/* Tasks Tab */}
        <TabPanel tabId="tasks" activeTab={activeTab}>
          <Card>
            <CardHeader>
              <CardTitle>Build Tasks ({tasks.length})</CardTitle>
              <CardDescription>
                Manage build week tasks and their status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tasks.map(task => (
                  <div 
                    key={task.id}
                    className="border-2 border-black p-4 flex flex-wrap justify-between items-start gap-4"
                  >
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge>Phase {task.phase}</Badge>
                        <span className="font-bold">{task.title}</span>
                      </div>
                      <p className="text-sm text-gray-600">{task.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        options={[
                          { value: 'pending', label: 'Pending' },
                          { value: 'active', label: 'Active' },
                          { value: 'done', label: 'Done' },
                        ]}
                        value={task.status}
                        onChange={(e) => updateTaskStatus(task.id, e.target.value as 'pending' | 'active' | 'done')}
                        className="w-32"
                      />
                    </div>
                  </div>
                ))}
                {tasks.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No tasks created yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabPanel>

        {/* Settings Tab */}
        <TabPanel tabId="settings" activeTab={activeTab}>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>
                  Core system configuration values.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {settings.map(setting => (
                    <div key={setting.id}>
                      <label className="text-xs font-bold uppercase tracking-wider">
                        {setting.key.replace(/_/g, ' ')}
                      </label>
                      <div className="flex gap-2">
                        <Input
                          value={setting.value}
                          onChange={(e) => {
                            setSettings(settings.map(s => 
                              s.id === setting.id ? { ...s, value: e.target.value } : s
                            ))
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={() => updateSetting(setting.key, setting.value)}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card variant="error">
              <CardHeader>
                <CardTitle>⚠️ Danger Zone</CardTitle>
                <CardDescription>
                  Actions here can break things. Be careful.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-red-500 p-4">
                  <h4 className="font-bold mb-2">System Sunset</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Disable all forms and convert to read-only mode.
                  </p>
                  <Button 
                    variant="danger"
                    onClick={() => {
                      if (confirm('This will disable all intake forms. Are you sure?')) {
                        updateSetting('intake_open', 'false')
                      }
                    }}
                  >
                    Disable Intake
                  </Button>
                </div>

                <div className="border-2 border-red-500 p-4">
                  <h4 className="font-bold mb-2">Full System Shutdown</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Deactivate the entire system.
                  </p>
                  <Button 
                    variant="danger"
                    onClick={() => {
                      if (confirm('This will shut down the entire system. Are you REALLY sure?')) {
                        updateSetting('system_active', 'false')
                      }
                    }}
                  >
                    Shutdown System
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabPanel>
      </div>
    </div>
  )
}
