'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
  Badge, Alert, Button, Tabs, TabPanel, Checkbox, ProgressBar
} from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate, getStatusColor } from '@/lib/utils'
import type { BuildTask, Camper, ChecklistTemplate, ChecklistItem } from '@/types/database'

type Tab = { id: string; label: string }

const tabs: Tab[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'checklists', label: 'Checklists' },
  { id: 'resources', label: 'Resources' },
]

const phaseNames: Record<number, string> = {
  1: 'Infrastructure',
  2: 'Structures',
  3: 'Kitchen',
  4: 'Final Setup',
}

const phaseIcons: Record<number, string> = {
  1: '⚡',
  2: '🏗️',
  3: '🍳',
  4: '✨',
}

export default function BuildWeekPage() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [earlyArrivals, setEarlyArrivals] = useState<Camper[]>([])
  const [tasks, setTasks] = useState<BuildTask[]>([])
  const [checklists, setChecklists] = useState<ChecklistTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [localChecklistState, setLocalChecklistState] = useState<Record<string, string[]>>({})

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    
    const [campersRes, tasksRes, checklistsRes] = await Promise.all([
      supabase.from('campers').select('*').eq('build_week_attending', true).order('build_week_arrival_date'),
      supabase.from('build_tasks').select('*').order('phase').order('due_date'),
      supabase.from('checklist_templates').select('*').eq('type', 'camp').order('phase'),
    ])

    setEarlyArrivals((campersRes.data as Camper[]) || [])
    setTasks((tasksRes.data as BuildTask[]) || [])
    setChecklists((checklistsRes.data as ChecklistTemplate[]) || [])
    
    // Initialize local checklist state
    const initialState: Record<string, string[]> = {}
    ;(checklistsRes.data as ChecklistTemplate[] | null)?.forEach(c => {
      initialState[c.id] = []
    })
    setLocalChecklistState(initialState)
    
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const toggleChecklistItem = (checklistId: string, itemId: string) => {
    setLocalChecklistState(prev => {
      const current = prev[checklistId] || []
      const isChecked = current.includes(itemId)
      return {
        ...prev,
        [checklistId]: isChecked 
          ? current.filter(id => id !== itemId)
          : [...current, itemId]
      }
    })
  }

  const getTasksByPhase = (phase: number) => tasks.filter(t => t.phase === phase)
  
  const getPhaseProgress = (phase: number) => {
    const phaseTasks = getTasksByPhase(phase)
    if (phaseTasks.length === 0) return 0
    const completed = phaseTasks.filter(t => t.status === 'done').length
    return Math.round((completed / phaseTasks.length) * 100)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🔨</div>
          <p className="font-bold uppercase tracking-wider">Loading Build Week...</p>
          <p className="text-sm text-gray-600">Organizing the controlled chaos</p>
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
            Build Week
          </h1>
          <p className="text-gray-600">
            The camp doesn&apos;t build itself. That&apos;s your job.
          </p>
        </div>

        {/* Hero Alert */}
        <Alert variant="warning" className="mb-8">
          <strong>August 23-30, 2026</strong> — Early arrivals build the camp. 
          If you signed up for this, you already agreed to work. 
          Bring water. Bring patience. Leave your ego at home.
        </Alert>

        {/* Tabs */}
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {/* Dashboard Tab */}
        <TabPanel tabId="dashboard" activeTab={activeTab}>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Early Arrivals */}
            <Card>
              <CardHeader>
                <CardTitle>Early Arrivals ({earlyArrivals.length})</CardTitle>
                <CardDescription>
                  Who&apos;s showing up to build?
                </CardDescription>
              </CardHeader>
              <CardContent>
                {earlyArrivals.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No one has signed up for build week yet.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {earlyArrivals.map(camper => (
                      <div 
                        key={camper.id}
                        className="border-2 border-black p-3 bg-white"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold">
                              {camper.playa_name || camper.full_name}
                            </p>
                            <p className="text-xs text-gray-600">
                              Arrives: {camper.build_week_arrival_date && formatDate(camper.build_week_arrival_date)}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {camper.skills.slice(0, 3).map(skill => (
                              <Badge key={skill} variant="default" className="text-[10px]">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        {camper.tools_bringing.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            Bringing: {camper.tools_bringing.slice(0, 3).join(', ')}
                            {camper.tools_bringing.length > 3 && ` +${camper.tools_bringing.length - 3} more`}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Phase Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Build Progress</CardTitle>
                <CardDescription>
                  How close are we?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[1, 2, 3, 4].map(phase => (
                  <div key={phase}>
                    <div className="flex items-center gap-2 mb-1">
                      <span>{phaseIcons[phase]}</span>
                      <span className="font-bold text-sm">Phase {phase}: {phaseNames[phase]}</span>
                    </div>
                    <ProgressBar 
                      value={getPhaseProgress(phase)} 
                      showPercentage 
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {getTasksByPhase(phase).filter(t => t.status === 'done').length} / {getTasksByPhase(phase).length} tasks complete
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Resources Summary */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Resources Available</CardTitle>
                <CardDescription>
                  Tools and vehicles from early arrivals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-bold text-sm uppercase tracking-wider mb-2">Tools</h4>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(new Set(earlyArrivals.flatMap(c => c.tools_bringing)))
                        .slice(0, 15)
                        .map(tool => (
                          <Badge key={tool} variant="default">{tool}</Badge>
                        ))
                      }
                      {earlyArrivals.flatMap(c => c.tools_bringing).length === 0 && (
                        <span className="text-gray-500">No tools listed yet</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm uppercase tracking-wider mb-2">Vehicles</h4>
                    <div className="space-y-1">
                      {earlyArrivals
                        .filter(c => c.vehicle_info)
                        .slice(0, 5)
                        .map(c => (
                          <p key={c.id} className="text-sm">
                            {c.vehicle_info} <span className="text-gray-400">({c.playa_name || c.full_name})</span>
                          </p>
                        ))
                      }
                      {!earlyArrivals.some(c => c.vehicle_info) && (
                        <span className="text-gray-500">No vehicles listed yet</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabPanel>

        {/* Tasks Tab */}
        <TabPanel tabId="tasks" activeTab={activeTab}>
          <div className="space-y-8">
            {[1, 2, 3, 4].map(phase => (
              <div key={phase}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{phaseIcons[phase]}</span>
                  <h3 className="text-xl font-black uppercase tracking-wider">
                    Phase {phase}: {phaseNames[phase]}
                  </h3>
                  <Badge variant={getPhaseProgress(phase) === 100 ? 'success' : 'warning'}>
                    {getPhaseProgress(phase)}%
                  </Badge>
                </div>

                {getTasksByPhase(phase).length === 0 ? (
                  <Alert variant="info">
                    No tasks for this phase yet.
                  </Alert>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {getTasksByPhase(phase).map(task => (
                      <Card 
                        key={task.id}
                        variant={task.status === 'done' ? 'success' : 'default'}
                      >
                        <CardContent className="py-4">
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <h4 className={cn(
                              "font-bold",
                              task.status === 'done' && "line-through text-gray-500"
                            )}>
                              {task.title}
                            </h4>
                            <Badge className={getStatusColor(task.status)}>
                              {task.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                          <div className="flex flex-wrap gap-2 text-xs">
                            {task.due_date && (
                              <span className="text-gray-500">
                                Due: {formatDate(task.due_date)}
                              </span>
                            )}
                            {task.estimated_hours && (
                              <span className="text-gray-500">
                                ~{task.estimated_hours}h
                              </span>
                            )}
                            {task.required_tools.length > 0 && (
                              <span className="text-gray-500">
                                Tools: {task.required_tools.join(', ')}
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabPanel>

        {/* Checklists Tab */}
        <TabPanel tabId="checklists" activeTab={activeTab}>
          <div className="space-y-6">
            {checklists.length === 0 ? (
              <Alert variant="info">
                No camp checklists created yet.
              </Alert>
            ) : (
              checklists.map(checklist => {
                const items = checklist.items as ChecklistItem[]
                const completed = localChecklistState[checklist.id] || []
                const progress = items.length > 0 
                  ? Math.round((completed.length / items.length) * 100) 
                  : 0

                return (
                  <Card key={checklist.id}>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{phaseIcons[checklist.phase || 1]}</span>
                        <div className="flex-1">
                          <CardTitle>{checklist.name}</CardTitle>
                          <CardDescription>
                            {checklist.phase && `Phase ${checklist.phase}: ${phaseNames[checklist.phase]}`}
                          </CardDescription>
                        </div>
                        <Badge variant={progress === 100 ? 'success' : 'warning'}>
                          {completed.length}/{items.length}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ProgressBar value={progress} className="mb-4" />
                      <div className="space-y-2">
                        {items.map((item) => (
                          <div 
                            key={item.id}
                            className={cn(
                              "border-2 border-black p-3 cursor-pointer transition-colors",
                              completed.includes(item.id) 
                                ? "bg-green-100 border-green-500" 
                                : "bg-white hover:bg-gray-50"
                            )}
                            onClick={() => toggleChecklistItem(checklist.id, item.id)}
                          >
                            <Checkbox
                              label={item.text}
                              checked={completed.includes(item.id)}
                              onChange={() => {}}
                            />
                            {item.required && !completed.includes(item.id) && (
                              <span className="text-xs text-red-500 ml-6">Required</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                    <CardFooter>
                      <p className="text-xs text-gray-500">
                        Note: This is a local preview. Actual checklist completion is tracked in the admin system.
                      </p>
                    </CardFooter>
                  </Card>
                )
              })
            )}
          </div>
        </TabPanel>

        {/* Resources Tab */}
        <TabPanel tabId="resources" activeTab={activeTab}>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>🏗️ Build Etiquette</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <ul className="space-y-2 list-disc list-inside">
                  <li>Hydrate constantly. The desert doesn&apos;t care about your schedule.</li>
                  <li>Wear sunscreen. Reapply every 2 hours. Yes, really.</li>
                  <li>If you don&apos;t know how to use a tool, ask.</li>
                  <li>Clean up after yourself. Leave no trace starts now.</li>
                  <li>Take breaks. Exhaustion leads to mistakes.</li>
                  <li>Communicate clearly. No one can read minds.</li>
                  <li>Respect the leads. They&apos;ve done this before.</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>🔧 Tool Safety</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <ul className="space-y-2 list-disc list-inside">
                  <li>Wear appropriate footwear. No sandals on the build site.</li>
                  <li>Safety glasses when using power tools.</li>
                  <li>Gloves when handling rough materials.</li>
                  <li>Never leave tools unattended.</li>
                  <li>Return tools to the designated area when done.</li>
                  <li>Report damaged tools immediately.</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>⚠️ Emergency Procedures</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <ul className="space-y-2 list-disc list-inside">
                  <li>First aid kit located at kitchen area.</li>
                  <li>In case of injury, stop work and notify a lead.</li>
                  <li>For serious injuries, call Rangers or 911.</li>
                  <li>Know where the fire extinguishers are.</li>
                  <li>If you feel sick, stop immediately and hydrate in shade.</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>📅 Daily Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between border-b border-gray-200 pb-2">
                    <span>Morning Briefing</span>
                    <span className="font-bold">8:00 AM</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 pb-2">
                    <span>Work Block 1</span>
                    <span className="font-bold">8:30 - 12:00</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 pb-2">
                    <span>Lunch Break</span>
                    <span className="font-bold">12:00 - 2:00</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 pb-2">
                    <span>Work Block 2</span>
                    <span className="font-bold">2:00 - 6:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Evening Debrief</span>
                    <span className="font-bold">6:30 PM</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  Schedule may adjust based on conditions. Leads will communicate changes.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabPanel>
      </div>
    </div>
  )
}
