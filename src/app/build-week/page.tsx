'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Card, CardHeader, CardTitle, CardContent,
  Badge, Tabs, TabPanel, ProgressBar
} from '@/components/ui'
import { cn } from '@/lib/utils'
import {
  fetchBuildStagesWithGoals,
  fetchBuildResources,
  fetchBuildProcedures,
  fetchBuildQuestions,
  fetchBuildWeekBuilders,
  updateGoalStatus,
  updateQuestionStatus,
  updateResourceStatus,
  createBuildResource,
  updateBuildResource,
  deleteBuildResource,
  STAGE_ICONS,
  CATEGORY_ICONS,
  RESOURCE_STATUS_COLORS,
} from '@/lib/build-week'
import type {
  BuildStageWithGoals,
  BuildResource,
  BuildProcedure,
  BuildQuestion,
  BuildGoal,
  TaskStatus,
  BuildResourceStatus,
  BuildQuestionStatus,
  BuildCategory,
  Camper,
} from '@/types/database'

type Tab = { id: string; label: string }

const tabs: Tab[] = [
  { id: 'tasks', label: 'Tasks' },
  { id: 'resources', label: 'Resources' },
  { id: 'issues', label: 'Issues' },
  { id: 'info', label: 'Info' },
]

export default function BuildWeekPage() {
  const [activeTab, setActiveTab] = useState('tasks')
  const [stages, setStages] = useState<BuildStageWithGoals[]>([])
  const [resources, setResources] = useState<BuildResource[]>([])
  const [procedures, setProcedures] = useState<BuildProcedure[]>([])
  const [questions, setQuestions] = useState<BuildQuestion[]>([])
  const [builders, setBuilders] = useState<Camper[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({})
  const [resourceStatusFilter, setResourceStatusFilter] = useState<string>('all')
  const [updatingGoals, setUpdatingGoals] = useState<Record<string, boolean>>({})
  const [updatingResources, setUpdatingResources] = useState<Record<string, boolean>>({})
  const [updatingQuestions, setUpdatingQuestions] = useState<Record<string, boolean>>({})
  const [resolutionInputs, setResolutionInputs] = useState<Record<string, string>>({})
  const [showResolutionInput, setShowResolutionInput] = useState<Record<string, boolean>>({})
  const [questionFilter, setQuestionFilter] = useState<'all' | 'open' | 'resolved' | 'deferred'>('all')
  const [expandedRef, setExpandedRef] = useState<Record<string, boolean>>({ schedule: true })
  const [showAddResource, setShowAddResource] = useState(false)
  const [editingResource, setEditingResource] = useState<BuildResource | null>(null)
  const [savingResource, setSavingResource] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [stagesData, resourcesData, proceduresData, questionsData, buildersData] =
        await Promise.all([
          fetchBuildStagesWithGoals(),
          fetchBuildResources(),
          fetchBuildProcedures(),
          fetchBuildQuestions(),
          fetchBuildWeekBuilders(),
        ])
      setStages(stagesData)
      setResources(resourcesData)
      setProcedures(proceduresData)
      setQuestions(questionsData)
      setBuilders(buildersData)
      // Auto-expand the first stage with incomplete goals
      const firstIncomplete = stagesData.find(s => s.goals.some(g => g.status !== 'done'))
      if (firstIncomplete) {
        setExpandedStages({ [firstIncomplete.id]: true })
      }
    } catch {
      // Data will remain empty, UI handles gracefully
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const GOAL_STATUS_CYCLE: Record<TaskStatus, TaskStatus> = {
    pending: 'active',
    active: 'done',
    done: 'pending',
  }

  const handleGoalStatusChange = async (goalId: string, currentStatus: TaskStatus) => {
    const newStatus = GOAL_STATUS_CYCLE[currentStatus]
    setUpdatingGoals(prev => ({ ...prev, [goalId]: true }))
    try {
      await updateGoalStatus(goalId, newStatus)
      setStages(prev =>
        prev.map(stage => ({
          ...stage,
          goals: stage.goals.map(g =>
            g.id === goalId ? { ...g, status: newStatus } : g
          ),
        }))
      )
    } catch {
      // Silently fail
    } finally {
      setUpdatingGoals(prev => ({ ...prev, [goalId]: false }))
    }
  }

  const handleResourceStatusChange = async (resourceId: string, newStatus: BuildResourceStatus) => {
    setUpdatingResources(prev => ({ ...prev, [resourceId]: true }))
    try {
      await updateResourceStatus(resourceId, newStatus)
      setResources(prev =>
        prev.map(r => (r.id === resourceId ? { ...r, status: newStatus } : r))
      )
    } catch {
      // Silently fail
    } finally {
      setUpdatingResources(prev => ({ ...prev, [resourceId]: false }))
    }
  }

  const handleQuestionStatusChange = async (questionId: string, newStatus: BuildQuestionStatus, resolution?: string) => {
    setUpdatingQuestions(prev => ({ ...prev, [questionId]: true }))
    try {
      await updateQuestionStatus(questionId, newStatus, resolution)
      setQuestions(prev =>
        prev.map(q =>
          q.id === questionId
            ? { ...q, status: newStatus, ...(resolution !== undefined ? { resolution } : {}) }
            : q
        )
      )
      setShowResolutionInput(prev => ({ ...prev, [questionId]: false }))
      setResolutionInputs(prev => ({ ...prev, [questionId]: '' }))
    } catch {
      // Silently fail
    } finally {
      setUpdatingQuestions(prev => ({ ...prev, [questionId]: false }))
    }
  }

  const handleAddResource = async (data: ResourceFormData) => {
    setSavingResource(true)
    try {
      const newResource = await createBuildResource(data)
      setResources(prev => [...prev, newResource])
      setShowAddResource(false)
    } catch {
      // Silently fail
    } finally {
      setSavingResource(false)
    }
  }

  const handleEditResource = async (data: ResourceFormData) => {
    if (!editingResource) return
    setSavingResource(true)
    try {
      await updateBuildResource(editingResource.id, data)
      setResources(prev =>
        prev.map(r => (r.id === editingResource.id ? { ...r, ...data } as BuildResource : r))
      )
      setEditingResource(null)
    } catch {
      // Silently fail
    } finally {
      setSavingResource(false)
    }
  }

  const handleDeleteResource = async (resourceId: string) => {
    setUpdatingResources(prev => ({ ...prev, [resourceId]: true }))
    try {
      await deleteBuildResource(resourceId)
      setResources(prev => prev.filter(r => r.id !== resourceId))
    } catch {
      // Silently fail
    } finally {
      setUpdatingResources(prev => ({ ...prev, [resourceId]: false }))
    }
  }

  const getStageProgress = (goals: BuildGoal[]) => {
    if (goals.length === 0) return 0
    return Math.round((goals.filter(g => g.status === 'done').length / goals.length) * 100)
  }

  const filteredResources =
    resourceStatusFilter === 'all'
      ? resources
      : resources.filter(r => r.status === resourceStatusFilter)

  const filteredQuestions =
    questionFilter === 'all' ? questions : questions.filter(q => q.status === questionFilter)

  // Overall stats
  const totalGoals = stages.reduce((sum, s) => sum + s.goals.length, 0)
  const doneGoals = stages.reduce((sum, s) => sum + s.goals.filter(g => g.status === 'done').length, 0)
  const overallProgress = totalGoals > 0 ? Math.round((doneGoals / totalGoals) * 100) : 0
  const openIssueCount = questions.filter(q => q.status === 'open').length
  const needCount = resources.filter(r => r.status === 'need').length

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="font-bold uppercase tracking-wider">Loading Build Week...</p>
      </div>
    )
  }

  const toggleRef = (key: string) =>
    setExpandedRef(prev => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className="min-h-screen py-6 px-4">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* ── Header ── */}
        <div>
          <h1 className="text-2xl font-black uppercase tracking-wider">Build Week</h1>
          <p className="text-xs text-gray-500 mt-0.5">Aug 23 – 28, 2026</p>
        </div>

        {/* ── Progress summary — one glanceable strip ── */}
        <div className="border-2 border-black bg-white p-3">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="font-bold">{doneGoals}/{totalGoals} tasks</span>
            <div className="flex gap-3 text-xs text-gray-400">
              {needCount > 0 && <span className="text-red-500">{needCount} needed</span>}
              {openIssueCount > 0 && <span className="text-yellow-600">{openIssueCount} open issues</span>}
              <span>{builders.length} builders</span>
            </div>
          </div>
          <ProgressBar value={overallProgress} />
        </div>

        {/* ── Tabs ── */}
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {/* ═══════════  TASKS  ═══════════ */}
        <TabPanel tabId="tasks" activeTab={activeTab}>
          <div className="space-y-3">
            {stages.map(stage => {
              const { goals } = stage
              const progress = getStageProgress(goals)
              const isExpanded = expandedStages[stage.id]
              const doneCount = goals.filter(g => g.status === 'done').length
              const isComplete = goals.length > 0 && doneCount === goals.length

              return (
                <div
                  key={stage.id}
                  className={cn(
                    'border-2 bg-white',
                    isComplete ? 'border-green-300' : 'border-black'
                  )}
                >
                  {/* Stage row */}
                  <button
                    onClick={() => setExpandedStages(prev => ({ ...prev, [stage.id]: !prev[stage.id] }))}
                    className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-lg">{STAGE_ICONS[stage.stage] || '📋'}</span>
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-sm uppercase tracking-wide">{stage.title}</span>
                      {stage.date_label && (
                        <span className="text-xs text-gray-400 ml-2">{stage.date_label}</span>
                      )}
                      <ProgressBar value={progress} className="mt-1 h-1" />
                    </div>
                    <span className="text-xs font-bold text-gray-400 tabular-nums">
                      {doneCount}/{goals.length}
                    </span>
                    <span className="text-gray-300">{isExpanded ? '▾' : '▸'}</span>
                  </button>

                  {/* Expanded goal list */}
                  {isExpanded && (
                    <div className="border-t-2 border-inherit divide-y divide-gray-100">
                      {stage.builder_notes && (
                        <p className="px-4 py-2 text-xs text-blue-600 bg-blue-50/60">
                          {stage.builder_notes}
                        </p>
                      )}

                      {goals.length === 0 ? (
                        <p className="text-gray-400 text-sm px-4 py-3">No goals yet.</p>
                      ) : (
                        goals.map(goal => (
                          <GoalRow
                            key={goal.id}
                            goal={goal}
                            updating={!!updatingGoals[goal.id]}
                            nextStatus={GOAL_STATUS_CYCLE[goal.status]}
                            onToggle={() => handleGoalStatusChange(goal.id, goal.status)}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </TabPanel>

        {/* ═══════════  RESOURCES  ═══════════ */}
        <TabPanel tabId="resources" activeTab={activeTab}>
          <div className="mb-4 flex items-center gap-2">
            <select
              value={resourceStatusFilter}
              onChange={e => setResourceStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border-2 border-black bg-white font-bold focus:outline-none"
            >
              <option value="all">All ({resources.length})</option>
              <option value="need">Need ({resources.filter(r => r.status === 'need').length})</option>
              <option value="have">Have ({resources.filter(r => r.status === 'have').length})</option>
              <option value="fix">Fix ({resources.filter(r => r.status === 'fix').length})</option>
              <option value="discard">Discard ({resources.filter(r => r.status === 'discard').length})</option>
            </select>
            <button
              onClick={() => { setShowAddResource(true); setEditingResource(null) }}
              className="ml-auto px-3 py-1.5 text-sm font-bold bg-black text-white hover:bg-gray-800 transition-colors"
            >
              + Add
            </button>
          </div>

          {/* Add / Edit Form */}
          {(showAddResource || editingResource) && (
            <ResourceForm
              resource={editingResource}
              saving={savingResource}
              onSave={editingResource ? handleEditResource : handleAddResource}
              onCancel={() => { setShowAddResource(false); setEditingResource(null) }}
            />
          )}

          {filteredResources.length === 0 ? (
            <p className="text-gray-400 text-sm">No resources match this filter.</p>
          ) : (
            <div className="border-2 border-black bg-white divide-y divide-gray-100">
              {filteredResources.map(resource => (
                <div
                  key={resource.id}
                  className={cn(
                    'px-4 py-2.5 flex items-center gap-3',
                    resource.status === 'discard' && 'opacity-40'
                  )}
                >
                  <span>{CATEGORY_ICONS[resource.category] || '📦'}</span>
                  <div className="flex-1 min-w-0">
                    <span className={cn(
                      'text-sm',
                      resource.status === 'discard' && 'line-through'
                    )}>
                      {resource.name}
                    </span>
                    {resource.quantity && (
                      <span className="text-xs text-gray-400 ml-1">×{resource.quantity}</span>
                    )}
                    {resource.priority === 'critical' && (
                      <span className="ml-1.5 text-[10px] font-bold text-red-600">CRITICAL</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={resource.status}
                      onChange={e => handleResourceStatusChange(resource.id, e.target.value as BuildResourceStatus)}
                      disabled={updatingResources[resource.id]}
                      className={cn(
                        'text-xs font-bold uppercase px-2 py-1 border-2 rounded focus:outline-none',
                        RESOURCE_STATUS_COLORS[resource.status],
                        updatingResources[resource.id] && 'opacity-50'
                      )}
                    >
                      <option value="have">Have</option>
                      <option value="need">Need</option>
                      <option value="fix">Fix</option>
                      <option value="discard">Discard</option>
                    </select>
                    <button
                      onClick={() => { setEditingResource(resource); setShowAddResource(false) }}
                      className="p-1 text-gray-400 hover:text-gray-700 text-xs"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteResource(resource.id)}
                      disabled={updatingResources[resource.id]}
                      className={cn(
                        'p-1 text-gray-400 hover:text-red-600 text-xs',
                        updatingResources[resource.id] && 'opacity-50'
                      )}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabPanel>

        {/* ═══════════  ISSUES  ═══════════ */}
        <TabPanel tabId="issues" activeTab={activeTab}>
          <div className="mb-4">
            <select
              value={questionFilter}
              onChange={e => setQuestionFilter(e.target.value as typeof questionFilter)}
              className="px-3 py-1.5 text-sm border-2 border-black bg-white font-bold focus:outline-none"
            >
              <option value="all">All ({questions.length})</option>
              <option value="open">Open ({questions.filter(q => q.status === 'open').length})</option>
              <option value="resolved">Resolved ({questions.filter(q => q.status === 'resolved').length})</option>
              <option value="deferred">Deferred ({questions.filter(q => q.status === 'deferred').length})</option>
            </select>
          </div>

          {filteredQuestions.length === 0 ? (
            <p className="text-gray-400 text-sm">No issues match this filter.</p>
          ) : (
            <div className="border-2 border-black bg-white divide-y divide-gray-100">
              {filteredQuestions.map(q => (
                <div key={q.id} className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex-shrink-0">
                      {q.status === 'resolved' ? '✅' : q.status === 'deferred' ? '⏸️' : q.is_pain_point ? '🔥' : '❓'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-sm',
                        q.status === 'resolved' && 'line-through text-gray-400'
                      )}>
                        {q.question}
                        {q.is_pain_point && q.status === 'open' && (
                          <span className="ml-1.5 text-[10px] font-bold text-red-600">PAIN POINT</span>
                        )}
                      </p>

                      {q.context && (
                        <p className="text-xs text-gray-400 mt-1">{q.context}</p>
                      )}

                      {q.resolution && (
                        <p className="text-xs text-green-700 mt-1">→ {q.resolution}</p>
                      )}

                      {/* Action buttons — only for actionable states */}
                      {q.status !== 'resolved' && (
                        <div className="flex items-center gap-2 mt-2">
                          {!showResolutionInput[q.id] ? (
                            <>
                              <button
                                onClick={() => setShowResolutionInput(prev => ({ ...prev, [q.id]: true }))}
                                disabled={updatingQuestions[q.id]}
                                className="px-2 py-0.5 text-[11px] font-bold border bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                              >
                                Resolve
                              </button>
                              {q.status === 'open' && (
                                <button
                                  onClick={() => handleQuestionStatusChange(q.id, 'deferred')}
                                  disabled={updatingQuestions[q.id]}
                                  className="px-2 py-0.5 text-[11px] font-bold border bg-gray-50 border-gray-300 text-gray-500 hover:bg-gray-100"
                                >
                                  Defer
                                </button>
                              )}
                              {q.status === 'deferred' && (
                                <button
                                  onClick={() => handleQuestionStatusChange(q.id, 'open')}
                                  disabled={updatingQuestions[q.id]}
                                  className="px-2 py-0.5 text-[11px] font-bold border bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                                >
                                  Reopen
                                </button>
                              )}
                            </>
                          ) : (
                            <div className="flex gap-2 w-full">
                              <input
                                type="text"
                                value={resolutionInputs[q.id] || ''}
                                onChange={e => setResolutionInputs(prev => ({ ...prev, [q.id]: e.target.value }))}
                                placeholder="How was this resolved?"
                                className="flex-1 px-2 py-1 text-sm border-2 border-black focus:outline-none"
                              />
                              <button
                                onClick={() => handleQuestionStatusChange(q.id, 'resolved', resolutionInputs[q.id] || '')}
                                disabled={updatingQuestions[q.id]}
                                className="px-3 py-1 text-xs font-bold bg-green-500 text-white hover:bg-green-600"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setShowResolutionInput(prev => ({ ...prev, [q.id]: false }))}
                                className="px-3 py-1 text-xs font-bold bg-gray-200 hover:bg-gray-300"
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Reopen for resolved items */}
                      {q.status === 'resolved' && (
                        <button
                          onClick={() => handleQuestionStatusChange(q.id, 'open')}
                          disabled={updatingQuestions[q.id]}
                          className="mt-1 px-2 py-0.5 text-[11px] font-bold border bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                        >
                          Reopen
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabPanel>

        {/* ═══════════  INFO (read-only)  ═══════════ */}
        <TabPanel tabId="info" activeTab={activeTab}>
          <p className="text-[11px] text-gray-400 uppercase tracking-wider font-bold mb-4">
            Reference only — nothing to action here
          </p>

          <div className="space-y-2">
            {/* Daily Schedule */}
            <RefSection
              title="Daily Schedule"
              icon="📅"
              isOpen={!!expandedRef.schedule}
              onToggle={() => toggleRef('schedule')}
            >
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-gray-200 text-center text-xs">
                {[
                  { time: '8:00 AM', label: 'Briefing' },
                  { time: '8:30–12:00', label: 'Work Block 1' },
                  { time: '12:00–2:00', label: 'Lunch / Rest' },
                  { time: '2:00–6:00', label: 'Work Block 2' },
                  { time: '6:30 PM', label: 'Debrief' },
                ].map(s => (
                  <div key={s.label} className="bg-white py-2 px-1">
                    <p className="font-bold">{s.time}</p>
                    <p className="text-gray-500">{s.label}</p>
                  </div>
                ))}
              </div>
            </RefSection>

            {/* Safety */}
            <RefSection
              title="Safety & Etiquette"
              icon="🛡️"
              isOpen={!!expandedRef.safety}
              onToggle={() => toggleRef('safety')}
            >
              <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                <li>Hydrate constantly. Sunscreen every 2 hours.</li>
                <li>Closed-toe shoes only. Safety glasses with power tools.</li>
                <li>Don&apos;t know a tool? Ask. Return tools when done.</li>
                <li>Report damaged tools immediately.</li>
                <li>First aid at kitchen. Serious injuries → Rangers / 911.</li>
                <li>Plan free time — don&apos;t work sunrise to sunset.</li>
              </ul>
            </RefSection>

            {/* Build Crew */}
            <RefSection
              title={`Build Crew (${builders.length})`}
              icon="👥"
              isOpen={!!expandedRef.crew}
              onToggle={() => toggleRef('crew')}
            >
              {builders.length === 0 ? (
                <p className="text-gray-400 text-xs">No one signed up yet.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {builders.map(c => (
                    <span key={c.id} className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                      {c.playa_name || c.full_name}
                      {c.build_week_arrival_date && (
                        <span className="text-gray-400 ml-1">
                          {new Date(c.build_week_arrival_date).toLocaleDateString('en-US', { weekday: 'short' })}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </RefSection>

            {/* Tools & Vehicles */}
            {builders.length > 0 && (
              <RefSection
                title="Tools & Vehicles"
                icon="🔧"
                isOpen={!!expandedRef.tools}
                onToggle={() => toggleRef('tools')}
              >
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {Array.from(new Set(builders.flatMap(c => c.tools_bringing))).length === 0 ? (
                    <span className="text-gray-400 text-xs">No tools listed yet.</span>
                  ) : (
                    Array.from(new Set(builders.flatMap(c => c.tools_bringing))).map(tool => (
                      <Badge key={tool} variant="default" className="text-[10px]">{tool}</Badge>
                    ))
                  )}
                </div>
                {builders.filter(c => c.vehicle_info).map(c => (
                  <p key={c.id} className="text-xs text-gray-500">
                    🚗 {c.vehicle_info} ({c.playa_name || c.full_name})
                  </p>
                ))}
              </RefSection>
            )}

            {/* Procedures */}
            {procedures.map(proc => (
              <RefSection
                key={proc.id}
                title={proc.title}
                icon={CATEGORY_ICONS[proc.category] || '📋'}
                isOpen={!!expandedRef[proc.id]}
                onToggle={() => toggleRef(proc.id)}
              >
                {proc.description && (
                  <p className="text-xs text-gray-500 mb-2">{proc.description}</p>
                )}
                <ol className="space-y-1.5">
                  {proc.steps.map((step, i) => (
                    <li key={i} className="flex gap-2 text-xs">
                      <span className="flex-shrink-0 w-5 h-5 bg-black text-white flex items-center justify-center text-[10px] font-bold">
                        {step.order}
                      </span>
                      <div>
                        <span>{step.text}</span>
                        {step.notes && <span className="text-gray-400 italic ml-1">— {step.notes}</span>}
                      </div>
                    </li>
                  ))}
                </ol>
                {proc.reference_links.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-100 space-y-0.5">
                    {proc.reference_links.map((link, i) => (
                      <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline block">
                        {link.title} ↗
                      </a>
                    ))}
                  </div>
                )}
              </RefSection>
            ))}
          </div>
        </TabPanel>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────
   Sub-components — keep the main render lean
   ────────────────────────────────────────── */

/** Single goal row with checkbox. Details on-demand via click. */
function GoalRow({ goal, updating, nextStatus, onToggle }: {
  goal: BuildGoal
  updating: boolean
  nextStatus: TaskStatus
  onToggle: () => void
}) {
  const [open, setOpen] = useState(false)
  const hasDetails = !!(goal.description || goal.notes || goal.responsible_party || goal.estimated_people || goal.required_resources.length)

  return (
    <div className={cn('px-4 py-2', goal.status === 'done' && 'bg-green-50/40')}>
      <div className="flex items-center gap-3">
        {/* Status toggle */}
        <button
          onClick={onToggle}
          disabled={updating}
          className={cn(
            'text-lg flex-shrink-0 hover:scale-110 transition-transform focus:outline-none',
            updating && 'opacity-40 animate-pulse'
          )}
          title={`Mark ${nextStatus}`}
        >
          {goal.status === 'done' ? '✅' : goal.status === 'active' ? '🔄' : '⬜'}
        </button>

        {/* Title */}
        <span
          className={cn(
            'text-sm flex-1',
            goal.status === 'done' && 'line-through text-gray-400'
          )}
        >
          {goal.title}
          {goal.priority === 1 && (
            <span className="ml-1.5 text-[10px] font-bold text-red-600">CRITICAL</span>
          )}
        </span>

        {/* Category chip — small, muted */}
        <span className="hidden sm:inline text-[10px] text-gray-400">
          {CATEGORY_ICONS[goal.category]} {goal.category}
        </span>

        {/* Details toggle */}
        {hasDetails && (
          <button
            onClick={() => setOpen(p => !p)}
            className="text-gray-300 hover:text-gray-500 text-xs"
          >
            {open ? '▾' : 'ⓘ'}
          </button>
        )}
      </div>

      {open && (
        <div className="ml-9 mt-1.5 text-xs text-gray-500 space-y-0.5">
          {goal.description && <p>{goal.description}</p>}
          <div className="flex flex-wrap gap-3">
            {goal.responsible_party && <span>👤 {goal.responsible_party}</span>}
            {goal.estimated_people && <span>👥 ~{goal.estimated_people}</span>}
            {goal.required_resources.length > 0 && <span>🔧 {goal.required_resources.join(', ')}</span>}
          </div>
          {goal.notes && (
            <p className="text-amber-700 bg-amber-50 p-1.5 rounded text-[11px]">
              {goal.notes}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/** Collapsible reference section. */
function RefSection({ title, icon, isOpen, onToggle, children }: {
  title: string
  icon: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border border-gray-200 bg-white">
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-2.5 flex items-center gap-2 hover:bg-gray-50 transition-colors"
      >
        <span>{icon}</span>
        <span className="flex-1 text-sm font-bold">{title}</span>
        <span className="text-gray-300 text-xs">{isOpen ? '▾' : '▸'}</span>
      </button>
      {isOpen && <div className="px-4 pb-3">{children}</div>}
    </div>
  )
}

/* ── Resource Form types & component ── */

type ResourceFormData = {
  name: string
  category: string
  description?: string
  quantity?: string
  status: string
  priority?: string
  stage_needed?: string | null
  notes?: string
}

const CATEGORIES: { value: BuildCategory; label: string }[] = [
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'shelter', label: 'Shelter' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'safety', label: 'Safety' },
  { value: 'layout', label: 'Layout' },
  { value: 'decoration', label: 'Decoration' },
  { value: 'personal', label: 'Personal' },
]

function ResourceForm({ resource, saving, onSave, onCancel }: {
  resource: BuildResource | null
  saving: boolean
  onSave: (data: ResourceFormData) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(resource?.name || '')
  const [category, setCategory] = useState<string>(resource?.category || 'logistics')
  const [description, setDescription] = useState(resource?.description || '')
  const [quantity, setQuantity] = useState(resource?.quantity || '')
  const [status, setStatus] = useState<string>(resource?.status || 'need')
  const [priority, setPriority] = useState(resource?.priority || '')
  const [notes, setNotes] = useState(resource?.notes || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({
      name: name.trim(),
      category,
      description: description.trim() || undefined,
      quantity: quantity.trim() || undefined,
      status,
      priority: priority || undefined,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="border-2 border-black bg-white p-4 mb-4 space-y-3">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
        {resource ? 'Edit Resource' : 'Add Resource'}
      </p>

      {/* Row 1: Name + Category */}
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Resource name *"
          required
          className="flex-1 px-3 py-1.5 text-sm border-2 border-black focus:outline-none"
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="px-2 py-1.5 text-sm border-2 border-black bg-white font-bold focus:outline-none"
        >
          {CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{CATEGORY_ICONS[c.value]} {c.label}</option>
          ))}
        </select>
      </div>

      {/* Row 2: Quantity + Status + Priority */}
      <div className="flex gap-2">
        <input
          type="text"
          value={quantity}
          onChange={e => setQuantity(e.target.value)}
          placeholder="Qty"
          className="w-20 px-2 py-1.5 text-sm border-2 border-black focus:outline-none"
        />
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="px-2 py-1.5 text-sm border-2 border-black bg-white font-bold focus:outline-none"
        >
          <option value="need">Need</option>
          <option value="have">Have</option>
          <option value="fix">Fix</option>
          <option value="discard">Discard</option>
        </select>
        <select
          value={priority}
          onChange={e => setPriority(e.target.value)}
          className="px-2 py-1.5 text-sm border-2 border-black bg-white focus:outline-none"
        >
          <option value="">Normal</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {/* Row 3: Description */}
      <input
        type="text"
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="w-full px-3 py-1.5 text-sm border-2 border-black focus:outline-none"
      />

      {/* Row 4: Notes */}
      <input
        type="text"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        className="w-full px-3 py-1.5 text-sm border-2 border-black focus:outline-none"
      />

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className={cn(
            'px-4 py-1.5 text-sm font-bold bg-black text-white hover:bg-gray-800',
            (saving || !name.trim()) && 'opacity-50 cursor-not-allowed'
          )}
        >
          {saving ? 'Saving…' : resource ? 'Save Changes' : 'Add Resource'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-1.5 text-sm font-bold bg-gray-200 hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
