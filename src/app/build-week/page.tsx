'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
  Badge, Alert, Tabs, TabPanel, ProgressBar
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
  STAGE_ICONS,
  CATEGORY_ICONS,
  CATEGORY_COLORS,
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
  Camper,
} from '@/types/database'

type Tab = { id: string; label: string }

const tabs: Tab[] = [
  { id: 'timeline', label: 'Timeline' },
  { id: 'resources', label: 'Resources' },
  { id: 'procedures', label: 'Procedures' },
  { id: 'questions', label: 'Questions' },
  { id: 'crew', label: 'Crew' },
]

const PRIORITY_LABELS: Record<number, { label: string; variant: 'error' | 'warning' | 'default' }> = {
  1: { label: 'Critical', variant: 'error' },
  2: { label: 'Important', variant: 'warning' },
  3: { label: 'Nice to have', variant: 'default' },
}

export default function BuildWeekPage() {
  const [activeTab, setActiveTab] = useState('timeline')
  const [stages, setStages] = useState<BuildStageWithGoals[]>([])
  const [resources, setResources] = useState<BuildResource[]>([])
  const [procedures, setProcedures] = useState<BuildProcedure[]>([])
  const [questions, setQuestions] = useState<BuildQuestion[]>([])
  const [builders, setBuilders] = useState<Camper[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({})
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [resourceStatusFilter, setResourceStatusFilter] = useState<string>('all')
  const [updatingGoals, setUpdatingGoals] = useState<Record<string, boolean>>({})
  const [updatingResources, setUpdatingResources] = useState<Record<string, boolean>>({})
  const [updatingQuestions, setUpdatingQuestions] = useState<Record<string, boolean>>({})
  const [resolutionInputs, setResolutionInputs] = useState<Record<string, string>>({})
  const [showResolutionInput, setShowResolutionInput] = useState<Record<string, boolean>>({})

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

      // Expand all stages by default
      const expanded: Record<string, boolean> = {}
      stagesData.forEach(s => { expanded[s.id] = true })
      setExpandedStages(expanded)
    } catch {
      // Data will remain empty, UI handles gracefully
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const toggleStage = (stageId: string) => {
    setExpandedStages(prev => ({ ...prev, [stageId]: !prev[stageId] }))
  }

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
      // Silently fail — UI stays in sync
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

  const getStageProgress = (goals: BuildGoal[]) => {
    if (goals.length === 0) return 0
    const done = goals.filter(g => g.status === 'done').length
    return Math.round((done / goals.length) * 100)
  }

  const allCategories = Array.from(new Set(stages.flatMap(s => s.goals.map(g => g.category))))

  const filteredGoals = (goals: BuildGoal[]) =>
    categoryFilter === 'all' ? goals : goals.filter(g => g.category === categoryFilter)

  const filteredResources =
    resourceStatusFilter === 'all'
      ? resources
      : resources.filter(r => r.status === resourceStatusFilter)

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
        <Alert variant="warning" className="mb-4">
          <strong>August 23–28, 2026</strong> — Early arrivals build the camp.
          If you signed up for this, you already agreed to work.
          Bring water. Bring patience. Leave your ego at home.
        </Alert>

        {/* Safety callout */}
        <Alert variant="error" className="mb-8">
          <strong>🛡️ Priority is safety above all else.</strong> Shelter is primary for builders—we must have shelter for all available as close to arrival as possible. Hydrate constantly. Take breaks. The desert doesn&apos;t care about your schedule.
        </Alert>

        {/* Overall Progress Summary */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
          {stages.map(stage => {
            const progress = getStageProgress(stage.goals)
            return (
              <div key={stage.id} className="border-2 border-black p-3 bg-white text-center">
                <div className="text-2xl mb-1">{STAGE_ICONS[stage.stage] || '📋'}</div>
                <p className="text-xs font-bold uppercase tracking-wider">{stage.stage}</p>
                <p className="text-lg font-black">{progress}%</p>
                <p className="text-[10px] text-gray-500">{stage.goals.length} goals</p>
              </div>
            )
          })}
        </div>

        {/* Tabs */}
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {/* ============================================ */}
        {/* TIMELINE TAB */}
        {/* ============================================ */}
        <TabPanel tabId="timeline" activeTab={activeTab}>
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setCategoryFilter('all')}
              className={cn(
                'px-3 py-1 text-xs font-bold uppercase border-2 border-black transition-colors',
                categoryFilter === 'all' ? 'bg-yellow-400' : 'bg-white hover:bg-gray-100'
              )}
            >
              All Categories
            </button>
            {allCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={cn(
                  'px-3 py-1 text-xs font-bold uppercase border-2 border-black transition-colors',
                  categoryFilter === cat ? 'bg-yellow-400' : 'bg-white hover:bg-gray-100'
                )}
              >
                {CATEGORY_ICONS[cat] || '📦'} {cat}
              </button>
            ))}
          </div>

          <div className="space-y-6">
            {stages.map(stage => {
              const goals = filteredGoals(stage.goals)
              const progress = getStageProgress(stage.goals)
              const isExpanded = expandedStages[stage.id]

              return (
                <Card key={stage.id}>
                  <CardHeader>
                    <button
                      onClick={() => toggleStage(stage.id)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-3xl">{STAGE_ICONS[stage.stage] || '📋'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <CardTitle className="text-xl">{stage.title}</CardTitle>
                            {stage.date_label && (
                              <Badge variant="info">{stage.date_label}</Badge>
                            )}
                            {stage.crew_size && (
                              <Badge variant="default">👥 {stage.crew_size}</Badge>
                            )}
                            <Badge variant={progress === 100 ? 'success' : progress > 0 ? 'warning' : 'default'}>
                              {progress}%
                            </Badge>
                          </div>
                          {stage.description && (
                            <CardDescription className="mt-1">{stage.description}</CardDescription>
                          )}
                        </div>
                        <span className="text-xl">{isExpanded ? '▼' : '▶'}</span>
                      </div>
                    </button>
                    <ProgressBar value={progress} className="mt-3" />
                  </CardHeader>

                  {isExpanded && (
                    <CardContent>
                      {/* Builder Notes */}
                      {stage.builder_notes && (
                        <Alert variant="info" className="mb-4">
                          <strong>Builder Notes:</strong> {stage.builder_notes}
                        </Alert>
                      )}

                      {/* Goals */}
                      {goals.length === 0 ? (
                        <p className="text-gray-500 text-sm py-2">
                          {categoryFilter !== 'all'
                            ? `No ${categoryFilter} goals for this stage.`
                            : 'No goals defined for this stage yet.'}
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {goals.map(goal => (
                            <div
                              key={goal.id}
                              className={cn(
                                'border-2 p-4 transition-colors',
                                goal.status === 'done'
                                  ? 'border-green-400 bg-green-50'
                                  : goal.status === 'active'
                                  ? 'border-blue-400 bg-blue-50'
                                  : 'border-black bg-white'
                              )}
                            >
                              <div className="flex items-start gap-3">
                                {/* Clickable status toggle */}
                                <button
                                  onClick={() => handleGoalStatusChange(goal.id, goal.status)}
                                  disabled={updatingGoals[goal.id]}
                                  className={cn(
                                    'mt-1 text-lg flex-shrink-0 transition-transform hover:scale-125 focus:outline-none',
                                    updatingGoals[goal.id] && 'opacity-50 animate-pulse'
                                  )}
                                  title={`Status: ${goal.status} — Click to change to ${GOAL_STATUS_CYCLE[goal.status]}`}
                                >
                                  {goal.status === 'done' ? '✅' : goal.status === 'active' ? '🔄' : '⬜'}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <span className={cn(
                                      'font-bold',
                                      goal.status === 'done' && 'line-through text-gray-500'
                                    )}>
                                      {goal.title}
                                    </span>
                                    <span className={cn(
                                      'inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase border rounded',
                                      CATEGORY_COLORS[goal.category] || 'bg-gray-100 text-gray-800 border-gray-300'
                                    )}>
                                      {CATEGORY_ICONS[goal.category]} {goal.category}
                                    </span>
                                    {PRIORITY_LABELS[goal.priority] && (
                                      <Badge variant={PRIORITY_LABELS[goal.priority].variant}>
                                        P{goal.priority}: {PRIORITY_LABELS[goal.priority].label}
                                      </Badge>
                                    )}
                                  </div>
                                  {goal.description && (
                                    <p className="text-sm text-gray-600 mb-2">{goal.description}</p>
                                  )}
                                  <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                                    {goal.responsible_party && (
                                      <span>👤 {goal.responsible_party}</span>
                                    )}
                                    {goal.estimated_people && (
                                      <span>👥 ~{goal.estimated_people} people</span>
                                    )}
                                    {goal.required_resources.length > 0 && (
                                      <span>🔧 {goal.required_resources.join(', ')}</span>
                                    )}
                                  </div>
                                  {goal.notes && (
                                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2 mt-2 rounded">
                                      💡 {goal.notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  )}

                  <CardFooter>
                    <p className="text-xs text-gray-500">
                      {stage.goals.filter(g => g.status === 'done').length}/{stage.goals.length} goals complete
                    </p>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        </TabPanel>

        {/* ============================================ */}
        {/* RESOURCES TAB */}
        {/* ============================================ */}
        <TabPanel tabId="resources" activeTab={activeTab}>
          {/* Status Filter */}
          <div className="flex flex-wrap gap-2 mb-6">
            {['all', 'have', 'need', 'fix', 'discard'].map(status => (
              <button
                key={status}
                onClick={() => setResourceStatusFilter(status)}
                className={cn(
                  'px-3 py-1 text-xs font-bold uppercase border-2 border-black transition-colors',
                  resourceStatusFilter === status ? 'bg-yellow-400' : 'bg-white hover:bg-gray-100'
                )}
              >
                {status === 'all' ? 'All' : status === 'have' ? '✅ Have' : status === 'need' ? '🔴 Need' : status === 'fix' ? '🔧 Fix' : '🗑️ Discard'}
              </button>
            ))}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="border-2 border-green-500 bg-green-50 p-3 text-center">
              <p className="text-2xl font-black">{resources.filter(r => r.status === 'have').length}</p>
              <p className="text-xs font-bold uppercase text-green-700">We Have</p>
            </div>
            <div className="border-2 border-red-500 bg-red-50 p-3 text-center">
              <p className="text-2xl font-black">{resources.filter(r => r.status === 'need').length}</p>
              <p className="text-xs font-bold uppercase text-red-700">We Need</p>
            </div>
            <div className="border-2 border-yellow-500 bg-yellow-50 p-3 text-center">
              <p className="text-2xl font-black">{resources.filter(r => r.status === 'fix').length}</p>
              <p className="text-xs font-bold uppercase text-yellow-700">Needs Fix</p>
            </div>
            <div className="border-2 border-gray-400 bg-gray-50 p-3 text-center">
              <p className="text-2xl font-black">{resources.filter(r => r.status === 'discard').length}</p>
              <p className="text-xs font-bold uppercase text-gray-600">Discard</p>
            </div>
          </div>

          {/* Resource List */}
          <div className="space-y-3">
            {filteredResources.length === 0 ? (
              <Alert variant="info">No resources matching this filter.</Alert>
            ) : (
              filteredResources.map(resource => (
                <div
                  key={resource.id}
                  className={cn(
                    'border-2 p-4',
                    resource.status === 'discard' ? 'border-gray-300 opacity-60' : 'border-black',
                    'bg-white'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">{CATEGORY_ICONS[resource.category] || '📦'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={cn(
                          'font-bold',
                          resource.status === 'discard' && 'line-through text-gray-500'
                        )}>
                          {resource.name}
                        </span>
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase border rounded',
                          RESOURCE_STATUS_COLORS[resource.status]
                        )}>
                          {resource.status}
                        </span>
                        {resource.priority && (
                          <Badge variant={resource.priority === 'critical' ? 'error' : resource.priority === 'important' ? 'warning' : 'default'}>
                            {resource.priority}
                          </Badge>
                        )}
                        {resource.stage_needed && (
                          <Badge variant="info">
                            {STAGE_ICONS[resource.stage_needed]} {resource.stage_needed}
                          </Badge>
                        )}
                      </div>
                      {resource.description && (
                        <p className="text-sm text-gray-600">{resource.description}</p>
                      )}
                      {resource.quantity && (
                        <p className="text-xs text-gray-500 mt-1">Qty: {resource.quantity}</p>
                      )}
                      {resource.notes && (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2 mt-2 rounded">
                          💡 {resource.notes}
                        </p>
                      )}
                      {/* Resource status change buttons */}
                      <div className="flex flex-wrap gap-1 mt-3">
                        {(['have', 'need', 'fix', 'discard'] as const).map(status => (
                          <button
                            key={status}
                            onClick={() => handleResourceStatusChange(resource.id, status)}
                            disabled={resource.status === status || updatingResources[resource.id]}
                            className={cn(
                              'px-2 py-0.5 text-[10px] font-bold uppercase border rounded transition-colors',
                              resource.status === status
                                ? cn(RESOURCE_STATUS_COLORS[status], 'ring-2 ring-black')
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-100',
                              updatingResources[resource.id] && 'opacity-50 cursor-not-allowed'
                            )}
                          >
                            {status === 'have' ? '✅ Have' : status === 'need' ? '🔴 Need' : status === 'fix' ? '🔧 Fix' : '🗑️ Discard'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabPanel>

        {/* ============================================ */}
        {/* PROCEDURES TAB */}
        {/* ============================================ */}
        <TabPanel tabId="procedures" activeTab={activeTab}>
          <div className="space-y-8">
            {procedures.length === 0 ? (
              <Alert variant="info">No procedures documented yet.</Alert>
            ) : (
              procedures.map(proc => (
                <Card key={proc.id}>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{CATEGORY_ICONS[proc.category] || '📋'}</span>
                      <div>
                        <CardTitle>{proc.title}</CardTitle>
                        {proc.description && (
                          <CardDescription>{proc.description}</CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Steps */}
                    <div className="space-y-3 mb-6">
                      {proc.steps.map((step, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-black text-white flex items-center justify-center font-bold text-sm">
                            {step.order}
                          </div>
                          <div className="flex-1 pt-1">
                            <p className="text-sm font-medium">{step.text}</p>
                            {step.notes && (
                              <p className="text-xs text-gray-500 mt-1 italic">↳ {step.notes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Reference Links */}
                    {proc.reference_links.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-bold text-sm uppercase tracking-wider mb-2">📚 References</h4>
                        <div className="space-y-1">
                          {proc.reference_links.map((link, i) => (
                            <a
                              key={i}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-sm text-blue-600 hover:text-blue-800 underline"
                            >
                              {link.title} ↗
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Open Questions for this Procedure */}
                    {proc.open_questions.length > 0 && (
                      <div className="border-2 border-yellow-400 bg-yellow-50 p-4">
                        <h4 className="font-bold text-sm uppercase tracking-wider mb-2">❓ Open Questions</h4>
                        <ul className="space-y-1">
                          {proc.open_questions.map((q, i) => (
                            <li key={i} className="text-sm text-yellow-800 flex gap-2">
                              <span className="flex-shrink-0">•</span>
                              <span>{q}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Notes */}
                    {proc.notes && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-3 mt-4 rounded">
                        💡 {proc.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabPanel>

        {/* ============================================ */}
        {/* QUESTIONS & PAIN POINTS TAB */}
        {/* ============================================ */}
        <TabPanel tabId="questions" activeTab={activeTab}>
          {/* Pain Points */}
          <div className="mb-8">
            <h3 className="text-xl font-black uppercase tracking-wider mb-4 flex items-center gap-2">
              🔥 Known Pain Points
            </h3>
            <div className="space-y-3">
              {questions.filter(q => q.is_pain_point).length === 0 ? (
                <Alert variant="info">No pain points documented yet.</Alert>
              ) : (
                questions.filter(q => q.is_pain_point).map(q => (
                  <div
                    key={q.id}
                    className="border-2 border-red-300 bg-red-50 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg">⚠️</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold">{q.question}</span>
                          <span className={cn(
                            'inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase border rounded',
                            CATEGORY_COLORS[q.category]
                          )}>
                            {q.category}
                          </span>
                          <Badge variant={q.status === 'resolved' ? 'success' : q.status === 'deferred' ? 'default' : 'warning'}>
                            {q.status}
                          </Badge>
                        </div>
                        {q.context && (
                          <p className="text-sm text-gray-600">{q.context}</p>
                        )}
                        {q.resolution && (
                          <p className="text-sm text-green-700 bg-green-50 border border-green-200 p-2 mt-2 rounded">
                            ✅ Resolution: {q.resolution}
                          </p>
                        )}
                        {/* Action buttons */}
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          {q.status !== 'resolved' && !showResolutionInput[q.id] && (
                            <button
                              onClick={() => setShowResolutionInput(prev => ({ ...prev, [q.id]: true }))}
                              disabled={updatingQuestions[q.id]}
                              className="px-2 py-1 text-xs font-bold uppercase border-2 border-green-500 bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                            >
                              ✅ Resolve
                            </button>
                          )}
                          {q.status !== 'deferred' && (
                            <button
                              onClick={() => handleQuestionStatusChange(q.id, 'deferred')}
                              disabled={updatingQuestions[q.id]}
                              className={cn(
                                'px-2 py-1 text-xs font-bold uppercase border-2 border-gray-400 bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors',
                                updatingQuestions[q.id] && 'opacity-50 cursor-not-allowed'
                              )}
                            >
                              ⏸️ Defer
                            </button>
                          )}
                          {q.status !== 'open' && (
                            <button
                              onClick={() => handleQuestionStatusChange(q.id, 'open')}
                              disabled={updatingQuestions[q.id]}
                              className={cn(
                                'px-2 py-1 text-xs font-bold uppercase border-2 border-yellow-400 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors',
                                updatingQuestions[q.id] && 'opacity-50 cursor-not-allowed'
                              )}
                            >
                              🔄 Reopen
                            </button>
                          )}
                        </div>
                        {/* Resolution input */}
                        {showResolutionInput[q.id] && (
                          <div className="mt-3 flex gap-2">
                            <input
                              type="text"
                              value={resolutionInputs[q.id] || ''}
                              onChange={e => setResolutionInputs(prev => ({ ...prev, [q.id]: e.target.value }))}
                              placeholder="How was this resolved?"
                              className="flex-1 px-3 py-1 text-sm border-2 border-black focus:outline-none focus:ring-2 focus:ring-yellow-400"
                            />
                            <button
                              onClick={() => handleQuestionStatusChange(q.id, 'resolved', resolutionInputs[q.id] || '')}
                              disabled={updatingQuestions[q.id]}
                              className="px-3 py-1 text-xs font-bold uppercase bg-green-500 text-white border-2 border-green-600 hover:bg-green-600 transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setShowResolutionInput(prev => ({ ...prev, [q.id]: false }))}
                              className="px-3 py-1 text-xs font-bold uppercase bg-gray-200 border-2 border-gray-300 hover:bg-gray-300 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Open Questions */}
          <div>
            <h3 className="text-xl font-black uppercase tracking-wider mb-4 flex items-center gap-2">
              ❓ Open Questions
            </h3>
            <div className="space-y-3">
              {questions.filter(q => !q.is_pain_point).length === 0 ? (
                <Alert variant="info">No open questions documented yet.</Alert>
              ) : (
                questions.filter(q => !q.is_pain_point).map(q => (
                  <div
                    key={q.id}
                    className={cn(
                      'border-2 p-4',
                      q.status === 'resolved'
                        ? 'border-green-400 bg-green-50'
                        : q.status === 'deferred'
                        ? 'border-gray-300 bg-gray-50'
                        : 'border-yellow-400 bg-yellow-50'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg">
                        {q.status === 'resolved' ? '✅' : q.status === 'deferred' ? '⏸️' : '❓'}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={cn(
                            'font-bold',
                            q.status === 'resolved' && 'line-through text-gray-500'
                          )}>
                            {q.question}
                          </span>
                          <span className={cn(
                            'inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase border rounded',
                            CATEGORY_COLORS[q.category]
                          )}>
                            {q.category}
                          </span>
                          <Badge variant={q.status === 'resolved' ? 'success' : q.status === 'deferred' ? 'default' : 'warning'}>
                            {q.status}
                          </Badge>
                        </div>
                        {q.context && (
                          <p className="text-sm text-gray-600">{q.context}</p>
                        )}
                        {q.resolution && (
                          <p className="text-sm text-green-700 bg-green-50 border border-green-200 p-2 mt-2 rounded">
                            ✅ Resolution: {q.resolution}
                          </p>
                        )}
                        {/* Action buttons */}
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          {q.status !== 'resolved' && !showResolutionInput[q.id] && (
                            <button
                              onClick={() => setShowResolutionInput(prev => ({ ...prev, [q.id]: true }))}
                              disabled={updatingQuestions[q.id]}
                              className="px-2 py-1 text-xs font-bold uppercase border-2 border-green-500 bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                            >
                              ✅ Resolve
                            </button>
                          )}
                          {q.status !== 'deferred' && (
                            <button
                              onClick={() => handleQuestionStatusChange(q.id, 'deferred')}
                              disabled={updatingQuestions[q.id]}
                              className={cn(
                                'px-2 py-1 text-xs font-bold uppercase border-2 border-gray-400 bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors',
                                updatingQuestions[q.id] && 'opacity-50 cursor-not-allowed'
                              )}
                            >
                              ⏸️ Defer
                            </button>
                          )}
                          {q.status !== 'open' && (
                            <button
                              onClick={() => handleQuestionStatusChange(q.id, 'open')}
                              disabled={updatingQuestions[q.id]}
                              className={cn(
                                'px-2 py-1 text-xs font-bold uppercase border-2 border-yellow-400 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors',
                                updatingQuestions[q.id] && 'opacity-50 cursor-not-allowed'
                              )}
                            >
                              🔄 Reopen
                            </button>
                          )}
                        </div>
                        {/* Resolution input */}
                        {showResolutionInput[q.id] && (
                          <div className="mt-3 flex gap-2">
                            <input
                              type="text"
                              value={resolutionInputs[q.id] || ''}
                              onChange={e => setResolutionInputs(prev => ({ ...prev, [q.id]: e.target.value }))}
                              placeholder="How was this resolved?"
                              className="flex-1 px-3 py-1 text-sm border-2 border-black focus:outline-none focus:ring-2 focus:ring-yellow-400"
                            />
                            <button
                              onClick={() => handleQuestionStatusChange(q.id, 'resolved', resolutionInputs[q.id] || '')}
                              disabled={updatingQuestions[q.id]}
                              className="px-3 py-1 text-xs font-bold uppercase bg-green-500 text-white border-2 border-green-600 hover:bg-green-600 transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setShowResolutionInput(prev => ({ ...prev, [q.id]: false }))}
                              className="px-3 py-1 text-xs font-bold uppercase bg-gray-200 border-2 border-gray-300 hover:bg-gray-300 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabPanel>

        {/* ============================================ */}
        {/* CREW TAB */}
        {/* ============================================ */}
        <TabPanel tabId="crew" activeTab={activeTab}>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Builder List */}
            <Card>
              <CardHeader>
                <CardTitle>Build Crew ({builders.length})</CardTitle>
                <CardDescription>Who&apos;s showing up to build?</CardDescription>
              </CardHeader>
              <CardContent>
                {builders.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No one has signed up for build week yet.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {builders.map(camper => (
                      <div
                        key={camper.id}
                        className="border-2 border-black p-3 bg-white"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold">
                              {camper.playa_name || camper.full_name}
                            </p>
                            {camper.build_week_arrival_date && (
                              <p className="text-xs text-gray-600">
                                Arrives: {new Date(camper.build_week_arrival_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                              </p>
                            )}
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
                            🔧 {camper.tools_bringing.slice(0, 4).join(', ')}
                            {camper.tools_bringing.length > 4 && ` +${camper.tools_bringing.length - 4} more`}
                          </p>
                        )}
                        {camper.vehicle_info && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            🚗 {camper.vehicle_info}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tools & Resources from Crew */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>🔧 Tools Available</CardTitle>
                  <CardDescription>Pooled from builder sign-ups</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set(builders.flatMap(c => c.tools_bringing))).length === 0 ? (
                      <span className="text-gray-500 text-sm">No tools listed yet</span>
                    ) : (
                      Array.from(new Set(builders.flatMap(c => c.tools_bringing))).map(tool => (
                        <Badge key={tool} variant="default">{tool}</Badge>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>🚗 Vehicles</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {builders.filter(c => c.vehicle_info).length === 0 ? (
                      <span className="text-gray-500 text-sm">No vehicles listed yet</span>
                    ) : (
                      builders.filter(c => c.vehicle_info).map(c => (
                        <p key={c.id} className="text-sm">
                          {c.vehicle_info}{' '}
                          <span className="text-gray-400">({c.playa_name || c.full_name})</span>
                        </p>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Safety & Etiquette */}
              <Card>
                <CardHeader>
                  <CardTitle>🛡️ Build Etiquette & Safety</CardTitle>
                </CardHeader>
                <CardContent className="prose prose-sm max-w-none">
                  <ul className="space-y-2 list-disc list-inside text-sm">
                    <li>Builders should have free time—don&apos;t plan to work waking to sleeping.</li>
                    <li>Hydrate constantly. Wear sunscreen. Reapply every 2 hours.</li>
                    <li>Wear appropriate footwear. No sandals. Safety glasses with power tools.</li>
                    <li>If you don&apos;t know how to use a tool, ask. No shame in that.</li>
                    <li>Return tools to the designated area when done—we lose massive time looking for things.</li>
                    <li>Report damaged tools immediately.</li>
                    <li>First aid kit at the kitchen area. For serious injuries, call Rangers or 911.</li>
                    <li>Communicate clearly. Respect the leads.</li>
                  </ul>
                </CardContent>
              </Card>

              {/* Daily Schedule */}
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
                      <span className="font-bold">8:30 – 12:00</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-2">
                      <span>Lunch / Rest</span>
                      <span className="font-bold">12:00 – 2:00</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 pb-2">
                      <span>Work Block 2</span>
                      <span className="font-bold">2:00 – 6:00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Evening Debrief</span>
                      <span className="font-bold">6:30 PM</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-4">
                    Schedule adjusts based on conditions and weather. Take breaks as needed.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabPanel>
      </div>
    </div>
  )
}
