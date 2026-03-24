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
  fetchBuildInventory,
  fetchBuildSchedule,
  createScheduleItem,
  updateScheduleItem,
  deleteScheduleItem,
  reorderScheduleItems,
  updateGoalStatus,
  updateQuestionStatus,
  updateBuildQuestion,
  deleteBuildQuestion,
  updateResourceStatus,
  createBuildResource,
  updateBuildResource,
  deleteBuildResource,
  createBuildQuestion,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  STAGE_ICONS,
  CATEGORY_ICONS,
  RESOURCE_STATUS_COLORS,
  INVENTORY_CATEGORY_ICONS,
  BUILD_SCHEDULE_DAYS,
  BUILD_SCHEDULE_DAY_LABELS,
  SCHEDULE_CATEGORY_ICONS,
  SCHEDULE_CATEGORY_COLORS,
} from '@/lib/build-week'
import type {
  BuildStageWithGoals,
  BuildResource,
  BuildProcedure,
  BuildQuestion,
  BuildGoal,
  BuildInventory,
  BuildScheduleItem,
  BuildScheduleDay,
  BuildScheduleCategory,
  TaskStatus,
  BuildResourceStatus,
  BuildQuestionStatus,
  BuildCategory,
  InventoryCategory,
  Camper,
} from '@/types/database'

type Tab = { id: string; label: string }

const tabs: Tab[] = [
  { id: 'tasks', label: 'Tasks' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'issues', label: "Q's & Issues" },
  { id: 'shade', label: 'Shade Guide' },
  { id: 'schedule', label: 'Build Schedule' },
]

type UnifiedItem = {
  id: string
  source: 'resource' | 'checklist'
  name: string
  category: string
  size: string
  sizeW: string
  sizeL: string
  count: number
  need: number | null
  status: string
  question: string
  originalResource?: BuildResource
  originalInventory?: BuildInventory
}

function exportToCSV(filename: string, headers: string[], rows: string[][]) {
  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      row.map(cell => `"${(cell ?? '').replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

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
  const [editingQuestion, setEditingQuestion] = useState<BuildQuestion | null>(null)
  const [expandedRef, setExpandedRef] = useState<Record<string, boolean>>({ schedule: true })
  const [showAddResource, setShowAddResource] = useState(false)
  const [editingResource, setEditingResource] = useState<BuildResource | null>(null)
  const [savingResource, setSavingResource] = useState(false)
  const [inventory, setInventory] = useState<BuildInventory[]>([])
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState<string>('all')
  const [showAddInventory, setShowAddInventory] = useState(false)
  const [editingInventory, setEditingInventory] = useState<BuildInventory | null>(null)
  const [savingInventory, setSavingInventory] = useState(false)
  const [updatingInventory, setUpdatingInventory] = useState<Record<string, boolean>>({})
  const [showAddQuestion, setShowAddQuestion] = useState(false)
  const [savingQuestion, setSavingQuestion] = useState(false)
  const [unifiedCategoryFilter, setUnifiedCategoryFilter] = useState<string>('all')
  const [unifiedStatusFilter, setUnifiedStatusFilter] = useState<string>('all')
  const [addItemType, setAddItemType] = useState<'resource' | 'checklist' | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})
  const [scheduleItems, setScheduleItems] = useState<BuildScheduleItem[]>([])
  const [editingScheduleItem, setEditingScheduleItem] = useState<BuildScheduleItem | null>(null)
  const [showAddScheduleItem, setShowAddScheduleItem] = useState(false)
  const [savingScheduleItem, setSavingScheduleItem] = useState(false)
  const [expandedScheduleDays, setExpandedScheduleDays] = useState<Record<string, boolean>>(
    () => Object.fromEntries(BUILD_SCHEDULE_DAYS.map(d => [d, true]))
  )

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }))
  }

  const fetchData = useCallback(async () => {
    try {
      const [stagesData, resourcesData, proceduresData, questionsData, buildersData, inventoryData, scheduleData] =
        await Promise.all([
          fetchBuildStagesWithGoals(),
          fetchBuildResources(),
          fetchBuildProcedures(),
          fetchBuildQuestions(),
          fetchBuildWeekBuilders(),
          fetchBuildInventory(),
          fetchBuildSchedule(),
        ])
      setStages(stagesData)
      setResources(resourcesData)
      setProcedures(proceduresData)
      setQuestions(questionsData)
      setBuilders(buildersData)
      setInventory(inventoryData)
      setScheduleItems(scheduleData)
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

  const handleAddQuestion = async (data: QuestionFormData) => {
    setSavingQuestion(true)
    try {
      const newQuestion = await createBuildQuestion(data)
      setQuestions(prev => [...prev, newQuestion])
      setShowAddQuestion(false)
    } catch {
      // Silently fail
    } finally {
      setSavingQuestion(false)
    }
  }

  const handleEditQuestion = async (data: QuestionFormData) => {
    if (!editingQuestion) return
    setSavingQuestion(true)
    try {
      await updateBuildQuestion(editingQuestion.id, data)
      setQuestions(prev =>
        prev.map(q => q.id === editingQuestion.id
          ? { ...q, question: data.question, category: data.category as BuildCategory, context: data.context ?? null, is_pain_point: data.is_pain_point ?? q.is_pain_point }
          : q
        )
      )
      setEditingQuestion(null)
    } catch {
      // Silently fail
    } finally {
      setSavingQuestion(false)
    }
  }

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Delete this question/issue?')) return
    setUpdatingQuestions(prev => ({ ...prev, [questionId]: true }))
    try {
      await deleteBuildQuestion(questionId)
      setQuestions(prev => prev.filter(q => q.id !== questionId))
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

  const handleResourceCount = async (resourceId: string, count: number) => {
    setUpdatingResources(prev => ({ ...prev, [resourceId]: true }))
    try {
      await updateBuildResource(resourceId, { count })
      setResources(prev =>
        prev.map(r => (r.id === resourceId ? { ...r, count } : r))
      )
    } catch {
      // Silently fail
    } finally {
      setUpdatingResources(prev => ({ ...prev, [resourceId]: false }))
    }
  }

  const handleResourceConfirmedWorking = async (resource: BuildResource) => {
    const nowConfirmed = !resource.confirmed_working
    setUpdatingResources(prev => ({ ...prev, [resource.id]: true }))
    try {
      await updateBuildResource(resource.id, { confirmed_working: nowConfirmed })
      setResources(prev =>
        prev.map(r => (r.id === resource.id ? { ...r, confirmed_working: nowConfirmed } : r))
      )
    } catch {
      // Silently fail
    } finally {
      setUpdatingResources(prev => ({ ...prev, [resource.id]: false }))
    }
  }

  const handleInventoryConfirmedWorking = async (item: BuildInventory) => {
    const nowConfirmed = !item.confirmed_working
    setUpdatingInventory(prev => ({ ...prev, [item.id]: true }))
    try {
      await updateInventoryItem(item.id, { confirmed_working: nowConfirmed })
      setInventory(prev =>
        prev.map(i => (i.id === item.id ? { ...i, confirmed_working: nowConfirmed } : i))
      )
    } catch {
      // Silently fail
    } finally {
      setUpdatingInventory(prev => ({ ...prev, [item.id]: false }))
    }
  }

  const handleInventoryVerify = async (item: BuildInventory) => {
    const nowVerified = !item.verified
    setUpdatingInventory(prev => ({ ...prev, [item.id]: true }))
    try {
      await updateInventoryItem(item.id, {
        verified: nowVerified,
        verified_at: nowVerified ? new Date().toISOString() : null,
      })
      setInventory(prev =>
        prev.map(i =>
          i.id === item.id
            ? { ...i, verified: nowVerified, verified_at: nowVerified ? new Date().toISOString() : null }
            : i
        )
      )
    } catch {
      // Silently fail
    } finally {
      setUpdatingInventory(prev => ({ ...prev, [item.id]: false }))
    }
  }

  const handleInventoryQuantity = async (itemId: string, quantity_actual: number) => {
    setUpdatingInventory(prev => ({ ...prev, [itemId]: true }))
    try {
      await updateInventoryItem(itemId, { quantity_actual })
      setInventory(prev =>
        prev.map(i => (i.id === itemId ? { ...i, quantity_actual } : i))
      )
    } catch {
      // Silently fail
    } finally {
      setUpdatingInventory(prev => ({ ...prev, [itemId]: false }))
    }
  }

  const handleAddInventory = async (data: InventoryFormData) => {
    setSavingInventory(true)
    try {
      const newItem = await createInventoryItem(data)
      setInventory(prev => [...prev, newItem])
      setShowAddInventory(false)
    } catch {
      // Silently fail
    } finally {
      setSavingInventory(false)
    }
  }

  const handleEditInventory = async (data: InventoryFormData) => {
    if (!editingInventory) return
    setSavingInventory(true)
    try {
      await updateInventoryItem(editingInventory.id, data)
      setInventory(prev =>
        prev.map(i => (i.id === editingInventory.id ? { ...i, ...data } as BuildInventory : i))
      )
      setEditingInventory(null)
    } catch {
      // Silently fail
    } finally {
      setSavingInventory(false)
    }
  }

  const handleDeleteInventory = async (itemId: string) => {
    setUpdatingInventory(prev => ({ ...prev, [itemId]: true }))
    try {
      await deleteInventoryItem(itemId)
      setInventory(prev => prev.filter(i => i.id !== itemId))
    } catch {
      // Silently fail
    } finally {
      setUpdatingInventory(prev => ({ ...prev, [itemId]: false }))
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

  const filteredInventory =
    inventoryCategoryFilter === 'all'
      ? inventory
      : inventory.filter(i => i.category === inventoryCategoryFilter)

  const inventoryCategories = Array.from(new Set(inventory.map(i => i.category))).sort()
  const verifiedCount = inventory.filter(i => i.verified).length

  // Overall stats
  const totalGoals = stages.reduce((sum, s) => sum + s.goals.length, 0)
  const doneGoals = stages.reduce((sum, s) => sum + s.goals.filter(g => g.status === 'done').length, 0)
  const overallProgress = totalGoals > 0 ? Math.round((doneGoals / totalGoals) * 100) : 0
  const openIssueCount = questions.filter(q => q.status === 'open').length
  const needCount = resources.filter(r => r.status === 'need').length

  // ── Unified inventory: merge resources + checklist items ──
  const unifiedItems: UnifiedItem[] = [
    ...resources.map(r => ({
      id: r.id,
      source: 'resource' as const,
      name: r.name,
      category: r.category,
      size: r.quantity || '',
      sizeW: '',
      sizeL: '',
      count: r.count,
      need: null as number | null,
      status: r.status,
      question: r.notes || '',
      originalResource: r,
    })),
    ...inventory.map(i => ({
      id: i.id,
      source: 'checklist' as const,
      name: i.name,
      category: i.category,
      size: i.description || '',
      sizeW: i.size_w || '',
      sizeL: i.size_l || '',
      count: i.quantity_actual,
      need: i.quantity_expected as number | null,
      status: i.verified ? 'verified' : i.confirmed_working ? 'working' : 'pending',
      question: i.notes || '',
      originalInventory: i,
    })),
  ]

  const allCategories = Array.from(new Set(unifiedItems.map(i => i.category))).sort()
  const allStatuses = Array.from(new Set(unifiedItems.map(i => i.status))).sort()

  const filteredUnifiedItems = unifiedItems
    .filter(i => unifiedCategoryFilter === 'all' || i.category === unifiedCategoryFilter)
    .filter(i => unifiedStatusFilter === 'all' || i.status === unifiedStatusFilter)

  const handleExportInventory = () => {
    const headers = ['Item', 'Category', 'Type', 'Size', 'Size (W)', 'Size (L)', 'Count', '# Needed', 'Status', 'Question / Notes']
    const rows = filteredUnifiedItems.map(item => [
      item.name,
      item.category,
      item.source === 'resource' ? 'Material' : 'Checklist',
      item.size,
      item.sizeW,
      item.sizeL,
      String(item.count),
      item.need != null ? String(item.need) : '',
      item.status,
      item.question,
    ])
    exportToCSV('build-week-inventory.csv', headers, rows)
  }

  const handleExportQuestions = () => {
    const headers = ['Question', 'Category', 'Status', 'Pain Point', 'Context', 'Resolution']
    const rows = filteredQuestions.map(q => [
      q.question,
      q.category,
      q.status,
      q.is_pain_point ? 'Yes' : 'No',
      q.context || '',
      q.resolution || '',
    ])
    exportToCSV('build-week-questions.csv', headers, rows)
  }

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
              {openIssueCount > 0 && <span className="text-yellow-600">{openIssueCount} open</span>}
              {inventory.length > 0 && <span>{verifiedCount}/{inventory.length} verified</span>}
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

        {/* ═══════════  INVENTORY  ═══════════ */}
        <TabPanel tabId="inventory" activeTab={activeTab}>
          {/* ── Summary strip ── */}
          <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-gray-400">
            <span>{resources.length + inventory.length} items</span>
            <span>{verifiedCount}/{inventory.length} verified</span>
            {needCount > 0 && <span className="text-red-500">{needCount} needed</span>}
            <span>{resources.filter(r => r.status === 'have').length} have</span>
            {resources.filter(r => r.status === 'fix').length > 0 && (
              <span className="text-amber-600">{resources.filter(r => r.status === 'fix').length} fix</span>
            )}
          </div>

          {/* ── Filter + action bar ── */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <select
              value={unifiedCategoryFilter}
              onChange={e => setUnifiedCategoryFilter(e.target.value)}
              className="px-2 py-1.5 text-xs border-2 border-black bg-white font-bold focus:outline-none"
            >
              <option value="all">All Categories ({unifiedItems.length})</option>
              {allCategories.map(cat => (
                <option key={cat} value={cat}>
                  {(INVENTORY_CATEGORY_ICONS[cat] || CATEGORY_ICONS[cat] || '📦')} {CATEGORIES.find(c => c.value === cat)?.label || INVENTORY_CATEGORIES.find(c => c.value === cat)?.label || cat} ({unifiedItems.filter(i => i.category === cat).length})
                </option>
              ))}
            </select>
            <select
              value={unifiedStatusFilter}
              onChange={e => setUnifiedStatusFilter(e.target.value)}
              className="px-2 py-1.5 text-xs border-2 border-black bg-white font-bold focus:outline-none"
            >
              <option value="all">All Statuses</option>
              {allStatuses.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)} ({unifiedItems.filter(i => i.status === s).length})</option>
              ))}
            </select>
            <div className="ml-auto flex gap-2">
              <button
                onClick={handleExportInventory}
                className="px-3 py-1 text-xs font-bold border-2 border-black bg-white hover:bg-gray-100 transition-colors"
                title="Export as CSV"
              >
                📥 Export
              </button>
              <button
                onClick={() => { setAddItemType('resource'); setShowAddResource(true); setEditingResource(null); setShowAddInventory(false); setEditingInventory(null) }}
                className="px-3 py-1 text-xs font-bold bg-black text-white hover:bg-gray-800 transition-colors"
              >
                + Material
              </button>
              <button
                onClick={() => { setAddItemType('checklist'); setShowAddInventory(true); setEditingInventory(null); setShowAddResource(false); setEditingResource(null) }}
                className="px-3 py-1 text-xs font-bold bg-black text-white hover:bg-gray-800 transition-colors"
              >
                + Checklist
              </button>
            </div>
          </div>

          {/* ── Add Forms (new items only) ── */}
          {showAddResource && !editingResource && (
            <ResourceForm
              resource={null}
              saving={savingResource}
              onSave={handleAddResource}
              onCancel={() => { setShowAddResource(false); setAddItemType(null) }}
            />
          )}
          {showAddInventory && !editingInventory && (
            <InventoryForm
              item={null}
              saving={savingInventory}
              onSave={handleAddInventory}
              onCancel={() => { setShowAddInventory(false); setAddItemType(null) }}
            />
          )}

          {filteredUnifiedItems.length === 0 ? (
            <p className="text-gray-400 text-sm">No items match this filter.</p>
          ) : (
            <div className="space-y-2">
              {allCategories
                .filter(cat => unifiedCategoryFilter === 'all' || cat === unifiedCategoryFilter)
                .map(cat => {
                  const catItems = filteredUnifiedItems.filter(i => i.category === cat)
                  if (catItems.length === 0) return null
                  const isExpanded = !!expandedCategories[cat]
                  const catLabel = CATEGORIES.find(c => c.value === cat)?.label || INVENTORY_CATEGORIES.find(c => c.value === cat)?.label || cat
                  const catIcon = INVENTORY_CATEGORY_ICONS[cat] || CATEGORY_ICONS[cat] || '📦'
                  return (
                    <div key={cat} className="border-2 border-black bg-white">
                      {/* ── Category header (collapsible) ── */}
                      <button
                        onClick={() => toggleCategory(cat)}
                        className="w-full flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 transition-colors text-left"
                      >
                        <span className="text-sm">{catIcon}</span>
                        <span className="font-bold text-sm uppercase tracking-wide flex-1">{catLabel}</span>
                        <span className="text-xs font-bold text-gray-400 tabular-nums">{catItems.length} item{catItems.length !== 1 ? 's' : ''}</span>
                        <span className="text-gray-300">{isExpanded ? '▾' : '▸'}</span>
                      </button>

                      {isExpanded && (
                        <>
                          {/* ── Table header ── */}
                          <div className="hidden sm:grid grid-cols-[1fr_60px_60px_60px_60px_90px_1fr_auto] gap-2 px-4 py-2 border-b border-gray-200 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                            <span>Item</span>
                            <span>Size (W)</span>
                            <span>Size (L)</span>
                            <span className="text-center">Count</span>
                            <span className="text-center"># Needed</span>
                            <span>Status</span>
                            <span>Question</span>
                            <span className="w-16"></span>
                          </div>

                          {/* ── Rows ── */}
                          <div className="divide-y divide-gray-100">
                            {catItems.map(item => (
                              <div
                                key={`${item.source}-${item.id}`}
                                className={cn(
                                  'px-4 py-2.5',
                                  item.status === 'verified' && 'bg-green-50/40',
                                  item.status === 'discard' && 'opacity-40',
                                )}
                              >
                                {/* ── Inline Edit Form ── */}
                                {item.source === 'resource' && editingResource?.id === item.id ? (
                                  <ResourceForm
                                    resource={editingResource}
                                    saving={savingResource}
                                    onSave={handleEditResource}
                                    onCancel={() => { setEditingResource(null); setAddItemType(null) }}
                                  />
                                ) : item.source === 'checklist' && editingInventory?.id === item.id ? (
                                  <InventoryForm
                                    item={editingInventory}
                                    saving={savingInventory}
                                    onSave={handleEditInventory}
                                    onCancel={() => { setEditingInventory(null); setAddItemType(null) }}
                                  />
                                ) : (
                                  <>
                                {/* Desktop: grid layout */}
                                <div className="hidden sm:grid grid-cols-[1fr_60px_60px_60px_60px_90px_1fr_auto] gap-2 items-center">
                                  {/* Item name */}
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className={cn(
                                        'text-sm truncate',
                                        item.status === 'discard' && 'line-through',
                                        item.status === 'verified' && 'line-through text-gray-400',
                                      )}>
                                        {item.name}
                                      </span>
                                      {item.source === 'resource' && item.originalResource?.priority === 'critical' && (
                                        <span className="text-[10px] font-bold text-red-600 flex-shrink-0">CRITICAL</span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-gray-400">
                                      {item.source === 'resource' ? 'Material' : 'Checklist'}
                                    </span>
                                  </div>

                                  {/* Size (W) */}
                                  <span className="text-xs text-gray-500 truncate">{item.sizeW || '—'}</span>

                                  {/* Size (L) */}
                                  <span className="text-xs text-gray-500 truncate">{item.sizeL || '—'}</span>

                                  {/* Count */}
                                  {item.source === 'resource' && item.originalResource ? (
                                    <input
                                      type="number"
                                      min={0}
                                      value={item.originalResource.count}
                                      onChange={e => handleResourceCount(item.id, Math.max(0, parseInt(e.target.value) || 0))}
                                      disabled={updatingResources[item.id]}
                                      className={cn(
                                        'w-14 text-center text-sm font-bold border-2 py-0.5 focus:outline-none',
                                        item.originalResource.count > 0 ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-300 bg-gray-50 text-gray-500'
                                      )}
                                    />
                                  ) : item.originalInventory ? (
                                    <input
                                      type="number"
                                      min={0}
                                      value={item.originalInventory.quantity_actual}
                                      onChange={e => handleInventoryQuantity(item.id, Math.max(0, parseInt(e.target.value) || 0))}
                                      disabled={updatingInventory[item.id]}
                                      className={cn(
                                        'w-14 text-center text-sm font-bold border-2 py-0.5 focus:outline-none',
                                        item.originalInventory.quantity_actual >= item.originalInventory.quantity_expected
                                          ? 'border-green-400 bg-green-50 text-green-700'
                                          : 'border-red-300 bg-red-50 text-red-700'
                                      )}
                                    />
                                  ) : (
                                    <span className="text-center text-sm">{item.count}</span>
                                  )}

                                  {/* # Needed */}
                                  <span className={cn(
                                    'text-center text-sm font-bold',
                                    item.need != null && item.count < item.need ? 'text-red-600' : 'text-gray-400'
                                  )}>
                                    {item.need != null ? item.need : '—'}
                                  </span>

                                  {/* Status */}
                                  {item.source === 'resource' && item.originalResource ? (
                                    <select
                                      value={item.originalResource.status}
                                      onChange={e => handleResourceStatusChange(item.id, e.target.value as BuildResourceStatus)}
                                      disabled={updatingResources[item.id]}
                                      className={cn(
                                        'text-xs font-bold uppercase px-2 py-1 border-2 rounded focus:outline-none',
                                        RESOURCE_STATUS_COLORS[item.originalResource.status],
                                        updatingResources[item.id] && 'opacity-50'
                                      )}
                                    >
                                      <option value="have">Have</option>
                                      <option value="need">Need</option>
                                      <option value="fix">Fix</option>
                                      <option value="discard">Discard</option>
                                    </select>
                                  ) : item.originalInventory ? (
                                    <button
                                      onClick={() => handleInventoryVerify(item.originalInventory!)}
                                      disabled={updatingInventory[item.id]}
                                      className={cn(
                                        'text-xs font-bold px-2 py-1 border-2 rounded transition-colors',
                                        item.originalInventory.verified
                                          ? 'border-green-500 bg-green-50 text-green-700'
                                          : item.originalInventory.confirmed_working
                                          ? 'border-blue-400 bg-blue-50 text-blue-700'
                                          : 'border-gray-300 bg-gray-50 text-gray-500 hover:border-gray-400',
                                        updatingInventory[item.id] && 'opacity-40 animate-pulse'
                                      )}
                                    >
                                      {item.originalInventory.verified ? '✅ Verified' : item.originalInventory.confirmed_working ? '🔧 Working' : '⬜ Pending'}
                                    </button>
                                  ) : (
                                    <span className="text-xs text-gray-400">{item.status}</span>
                                  )}

                                  {/* Question / Notes */}
                                  <span className="text-xs text-gray-500 truncate" title={item.question}>
                                    {item.question || '—'}
                                  </span>

                                  {/* Actions */}
                                  <div className="flex items-center gap-1 w-16 justify-end">
                                    {item.source === 'resource' && item.originalResource && (
                                      <>
                                        <button
                                          onClick={() => handleResourceConfirmedWorking(item.originalResource!)}
                                          disabled={updatingResources[item.id]}
                                          className={cn(
                                            'text-xs px-1 py-0.5 border rounded',
                                            item.originalResource.confirmed_working
                                              ? 'border-green-500 bg-green-50 text-green-700'
                                              : 'border-gray-300 bg-gray-50 text-gray-400',
                                            updatingResources[item.id] && 'opacity-40'
                                          )}
                                          title={item.originalResource.confirmed_working ? 'Unmark working' : 'Mark working'}
                                        >
                                          {item.originalResource.confirmed_working ? '✅' : '⬜'}
                                        </button>
                                        <button
                                          onClick={() => { setEditingResource(item.originalResource!); setShowAddResource(false) }}
                                          className="p-1 text-gray-400 hover:text-gray-700 text-xs"
                                          title="Edit"
                                        >
                                          ✏️
                                        </button>
                                        <button
                                          onClick={() => handleDeleteResource(item.id)}
                                          disabled={updatingResources[item.id]}
                                          className={cn('p-1 text-gray-400 hover:text-red-600 text-xs', updatingResources[item.id] && 'opacity-50')}
                                          title="Delete"
                                        >
                                          🗑️
                                        </button>
                                      </>
                                    )}
                                    {item.source === 'checklist' && item.originalInventory && (
                                      <>
                                        <button
                                          onClick={() => handleInventoryConfirmedWorking(item.originalInventory!)}
                                          disabled={updatingInventory[item.id]}
                                          className={cn(
                                            'text-xs px-1 py-0.5 border rounded',
                                            item.originalInventory.confirmed_working
                                              ? 'border-green-500 bg-green-50 text-green-700'
                                              : 'border-gray-300 bg-gray-50 text-gray-400',
                                            updatingInventory[item.id] && 'opacity-40'
                                          )}
                                          title={item.originalInventory.confirmed_working ? 'Unmark working' : 'Mark working'}
                                        >
                                          {item.originalInventory.confirmed_working ? '✅' : '⬜'}
                                        </button>
                                        <button
                                          onClick={() => { setEditingInventory(item.originalInventory!); setShowAddInventory(false) }}
                                          className="p-1 text-gray-400 hover:text-gray-700 text-xs"
                                          title="Edit"
                                        >
                                          ✏️
                                        </button>
                                        <button
                                          onClick={() => handleDeleteInventory(item.id)}
                                          disabled={updatingInventory[item.id]}
                                          className={cn('p-1 text-gray-400 hover:text-red-600 text-xs', updatingInventory[item.id] && 'opacity-50')}
                                          title="Delete"
                                        >
                                          🗑️
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Mobile: stacked layout */}
                                <div className="sm:hidden space-y-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className={cn(
                                      'text-sm font-bold flex-1',
                                      item.status === 'discard' && 'line-through',
                                      item.status === 'verified' && 'line-through text-gray-400',
                                    )}>
                                      {item.name}
                                    </span>
                                    <span className="text-[10px] text-gray-400">
                                      {item.source === 'resource' ? 'Material' : 'Checklist'}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 ml-2">
                                    {(item.sizeW || item.sizeL) && <span>W: {item.sizeW || '—'} × L: {item.sizeL || '—'}</span>}
                                    <span>Count: <strong className={item.need != null && item.count < item.need ? 'text-red-600' : ''}>{item.count}</strong></span>
                                    {item.need != null && <span># Needed: <strong>{item.need}</strong></span>}
                                    <span className={cn(
                                      'font-bold uppercase',
                                      item.status === 'need' ? 'text-red-600' : item.status === 'have' || item.status === 'verified' ? 'text-green-600' : ''
                                    )}>
                                      {item.status}
                                    </span>
                                  </div>
                                  {item.question && (
                                    <p className="text-xs text-amber-600 ml-2">{item.question}</p>
                                  )}
                                  <div className="flex items-center gap-2 ml-2">
                                    {item.source === 'resource' && item.originalResource && (
                                      <>
                                        <select
                                          value={item.originalResource.status}
                                          onChange={e => handleResourceStatusChange(item.id, e.target.value as BuildResourceStatus)}
                                          disabled={updatingResources[item.id]}
                                          className={cn(
                                            'text-[11px] font-bold uppercase px-1.5 py-0.5 border-2 rounded focus:outline-none',
                                            RESOURCE_STATUS_COLORS[item.originalResource.status]
                                          )}
                                        >
                                          <option value="have">Have</option>
                                          <option value="need">Need</option>
                                          <option value="fix">Fix</option>
                                          <option value="discard">Discard</option>
                                        </select>
                                        <button onClick={() => { setEditingResource(item.originalResource!); setShowAddResource(false) }} className="p-1 text-gray-400 hover:text-gray-700 text-xs">✏️</button>
                                        <button onClick={() => handleDeleteResource(item.id)} disabled={updatingResources[item.id]} className="p-1 text-gray-400 hover:text-red-600 text-xs">🗑️</button>
                                      </>
                                    )}
                                    {item.source === 'checklist' && item.originalInventory && (
                                      <>
                                        <button
                                          onClick={() => handleInventoryVerify(item.originalInventory!)}
                                          disabled={updatingInventory[item.id]}
                                          className={cn(
                                            'text-[11px] font-bold px-1.5 py-0.5 border-2 rounded',
                                            item.originalInventory.verified ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-300 text-gray-500'
                                          )}
                                        >
                                          {item.originalInventory.verified ? '✅ Verified' : '⬜ Verify'}
                                        </button>
                                        <button onClick={() => { setEditingInventory(item.originalInventory!); setShowAddInventory(false) }} className="p-1 text-gray-400 hover:text-gray-700 text-xs">✏️</button>
                                        <button onClick={() => handleDeleteInventory(item.id)} disabled={updatingInventory[item.id]} className="p-1 text-gray-400 hover:text-red-600 text-xs">🗑️</button>
                                      </>
                                    )}
                                  </div>
                                </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
            </div>
          )}
        </TabPanel>

        {/* ═══════════  Q'S & ISSUES  ═══════════ */}
        <TabPanel tabId="issues" activeTab={activeTab}>
          <div className="flex items-center gap-2 mb-4">
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
            <button
              onClick={handleExportQuestions}
              className="px-3 py-1 text-xs font-bold border-2 border-black bg-white hover:bg-gray-100 transition-colors"
              title="Export as CSV"
            >
              📥 Export
            </button>
            <button
              onClick={() => setShowAddQuestion(true)}
              className="ml-auto px-3 py-1 text-xs font-bold bg-black text-white hover:bg-gray-800 transition-colors"
            >
              + Add
            </button>
          </div>

          {showAddQuestion && (
            <QuestionForm
              saving={savingQuestion}
              onSave={handleAddQuestion}
              onCancel={() => setShowAddQuestion(false)}
            />
          )}

          {editingQuestion && (
            <QuestionForm
              initialData={editingQuestion}
              saving={savingQuestion}
              onSave={handleEditQuestion}
              onCancel={() => setEditingQuestion(null)}
            />
          )}

          {filteredQuestions.length === 0 ? (
            <p className="text-gray-400 text-sm">No items match this filter.</p>
          ) : (
            <div className="border-2 border-black bg-white overflow-x-auto">
              {/* Table header */}
              <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-0 text-[11px] font-black uppercase tracking-wider bg-gray-100 border-b-2 border-black">
                <div className="px-3 py-2">Status</div>
                <div className="px-3 py-2">Question / Issue</div>
                <div className="px-3 py-2 text-center">Actions</div>
                <div className="px-3 py-2 text-center">Edit</div>
                <div className="px-3 py-2 text-center">Delete</div>
              </div>

              {/* Table rows */}
              {filteredQuestions.map(q => (
                <div key={q.id} className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-0 border-b border-gray-100 last:border-b-0 items-center hover:bg-gray-50 transition-colors">
                  {/* Status icon */}
                  <div className="px-3 py-2.5 flex-shrink-0 text-center">
                    {q.status === 'resolved' ? '✅' : q.status === 'deferred' ? '⏸️' : q.is_pain_point ? '🔥' : '❓'}
                  </div>

                  {/* Question text + context + resolution */}
                  <div className="px-3 py-2.5 min-w-0">
                    {showResolutionInput[q.id] ? (
                      <div className="flex gap-2 w-full">
                        <input
                          type="text"
                          value={resolutionInputs[q.id] || ''}
                          onChange={e => setResolutionInputs(prev => ({ ...prev, [q.id]: e.target.value }))}
                          placeholder="How was this resolved?"
                          className="flex-1 px-2 py-1 text-sm border-2 border-black focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => handleQuestionStatusChange(q.id, 'resolved', resolutionInputs[q.id] || '')}
                          disabled={updatingQuestions[q.id]}
                          className="px-3 py-1 text-xs font-bold bg-green-500 text-white hover:bg-green-600 whitespace-nowrap"
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
                    ) : (
                      <>
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
                          <p className="text-xs text-gray-400 mt-0.5">{q.context}</p>
                        )}
                        {q.resolution && (
                          <p className="text-xs text-green-700 mt-0.5">→ {q.resolution}</p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Action buttons column */}
                  <div className="px-3 py-2.5 flex items-center gap-1.5">
                    {q.status === 'open' && (
                      <>
                        <button
                          onClick={() => setShowResolutionInput(prev => ({ ...prev, [q.id]: true }))}
                          disabled={updatingQuestions[q.id]}
                          className="px-2 py-0.5 text-[11px] font-bold border bg-green-50 border-green-300 text-green-700 hover:bg-green-100 whitespace-nowrap"
                        >
                          Resolve
                        </button>
                        <button
                          onClick={() => handleQuestionStatusChange(q.id, 'deferred')}
                          disabled={updatingQuestions[q.id]}
                          className="px-2 py-0.5 text-[11px] font-bold border bg-gray-50 border-gray-300 text-gray-500 hover:bg-gray-100 whitespace-nowrap"
                        >
                          Defer
                        </button>
                      </>
                    )}
                    {q.status === 'deferred' && (
                      <>
                        <button
                          onClick={() => setShowResolutionInput(prev => ({ ...prev, [q.id]: true }))}
                          disabled={updatingQuestions[q.id]}
                          className="px-2 py-0.5 text-[11px] font-bold border bg-green-50 border-green-300 text-green-700 hover:bg-green-100 whitespace-nowrap"
                        >
                          Resolve
                        </button>
                        <button
                          onClick={() => handleQuestionStatusChange(q.id, 'open')}
                          disabled={updatingQuestions[q.id]}
                          className="px-2 py-0.5 text-[11px] font-bold border bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100 whitespace-nowrap"
                        >
                          Reopen
                        </button>
                      </>
                    )}
                    {q.status === 'resolved' && (
                      <button
                        onClick={() => handleQuestionStatusChange(q.id, 'open')}
                        disabled={updatingQuestions[q.id]}
                        className="px-2 py-0.5 text-[11px] font-bold border bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100 whitespace-nowrap"
                      >
                        Reopen
                      </button>
                    )}
                  </div>

                  {/* Edit button */}
                  <div className="px-3 py-2.5 text-center">
                    <button
                      onClick={() => setEditingQuestion(q)}
                      className="px-2 py-0.5 text-[11px] font-bold border bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
                      title="Edit"
                    >
                      ✏️
                    </button>
                  </div>

                  {/* Delete button */}
                  <div className="px-3 py-2.5 text-center">
                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      disabled={updatingQuestions[q.id]}
                      className="px-2 py-0.5 text-[11px] font-bold border bg-red-50 border-red-300 text-red-700 hover:bg-red-100"
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

        {/* ═══════════  SHADE GUIDE  ═══════════ */}
        <TabPanel tabId="shade" activeTab={activeTab}>
          <div className="space-y-2">
            {/* Hero / PDF Link */}
            <div className="border-2 border-black bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⛺</span>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider">Shade Structure Build Guide</h2>
                  <p className="text-xs text-gray-600 mt-1">
                    Everything the team needs to know about building shade structures for the playa.
                    Read the full guide before build week — it covers structure types, materials, anchoring, wind resistance, and more.
                  </p>
                  <a
                    href="https://futureturtles.com/2026/Guide%20to%20Burning%20Man%20Shade%20Structures.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 text-xs font-bold bg-black text-white hover:bg-gray-800 transition-colors"
                  >
                    📄 Read Full PDF Guide ↗
                  </a>
                </div>
              </div>
            </div>

            {/* Structure Types */}
            <RefSection
              title="Common Shade Structure Types"
              icon="🏗️"
              isOpen={!!expandedRef.shadeTypes}
              onToggle={() => toggleRef('shadeTypes')}
            >
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-bold">Monkey Hut (Hoop Shade)</p>
                  <p className="text-xs text-gray-600">
                    Curved hoops of EMT conduit or PVC covered with shade cloth. Simple, affordable, and proven on the playa.
                    Great for covering a row of tents or a communal hangout area. Typically 10–20 ft wide.
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold">Carport / Costco Canopy</p>
                  <p className="text-xs text-gray-600">
                    Pre-fab steel carport frames (10×20, 10×30) with aluminet or shade cloth draped over them.
                    Fast to assemble. Must be heavily anchored — these act as sails in high wind.
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold">Custom EMT Frame</p>
                  <p className="text-xs text-gray-600">
                    Custom-built steel or EMT conduit frame structures. More labor-intensive but can be designed
                    for specific camp layouts. Use swaged fittings or Maker Pipe connectors for joints.
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold">Hexayurt</p>
                  <p className="text-xs text-gray-600">
                    Rigid panel shelters made from polyiso insulation boards. Excellent for sleeping — keeps heat out
                    during the day and warmth in at night. Requires tape hinges and careful assembly.
                  </p>
                </div>
              </div>
            </RefSection>

            {/* Key Design Principles */}
            <RefSection
              title="Key Design Principles"
              icon="📐"
              isOpen={!!expandedRef.shadeDesign}
              onToggle={() => toggleRef('shadeDesign')}
            >
              <ul className="text-xs text-gray-600 space-y-1.5 list-disc list-inside">
                <li><strong>Wind is #1 threat.</strong> Structures must survive 75+ mph gusts. Over-anchor everything. If it can catch wind, it will.</li>
                <li><strong>Orientation matters.</strong> Align long axis with prevailing wind (typically 3 o&apos;clock / 9 o&apos;clock direction). Minimize broad faces perpendicular to wind.</li>
                <li><strong>Ventilation.</strong> Leave gaps for air to flow through — a fully enclosed shade sail becomes a parachute. Open sides on the leeward end.</li>
                <li><strong>UV protection.</strong> Aluminet reflects ~70% of radiant heat and lasts years. Standard tarps degrade fast and don&apos;t breathe.</li>
                <li><strong>Height.</strong> Higher structures catch more wind. Keep shade at the minimum usable height — 7 ft clearance is plenty.</li>
                <li><strong>Redundancy.</strong> Every connection point should have a backup. Zip ties fail, knots loosen, ratchet straps walk. Use multiple attachment methods.</li>
                <li><strong>MOOP-proof everything.</strong> Cap open pipe ends. Secure loose fabric edges. Tape over sharp fittings. Nothing should be able to break off and blow away.</li>
              </ul>
            </RefSection>

            {/* Anchoring */}
            <RefSection
              title="Anchoring & Staking"
              icon="⚓"
              isOpen={!!expandedRef.shadeAnchoring}
              onToggle={() => toggleRef('shadeAnchoring')}
            >
              <div className="space-y-2">
                <p className="text-xs text-gray-600">
                  The playa surface is hardpan clay, 6–12 inches deep, over softer alkaline silt. Your anchoring must account for both layers.
                </p>
                <ul className="text-xs text-gray-600 space-y-1.5 list-disc list-inside">
                  <li><strong>Rebar stakes (3/8&quot; or 1/2&quot;, 18–24&quot; long)</strong> — The standard. Pound at a 45° angle away from the structure. Minimum 4 per structure leg, more on wind-facing sides.</li>
                  <li><strong>Lag bolts</strong> — 12&quot;+ lag bolts screwed into playa with an impact driver. Excellent holding power. Use fender washers to create attachment points.</li>
                  <li><strong>Deadman anchors</strong> — Bury a cross-bar (pipe, wood) 12–18&quot; deep with cable attached. Best for soft playa areas.</li>
                  <li><strong>Guy wires</strong> — Run from the top of the structure to stakes at a 45° angle. Use turnbuckles or ratchet straps to tension. Essential for tall structures.</li>
                </ul>
                <p className="text-xs text-amber-700 bg-amber-50 p-2 mt-2">
                  ⚠️ Always cap exposed rebar with tennis balls, rebar caps, or pipe caps. Uncapped rebar is the #1 cause of serious injuries at Burning Man.
                </p>
              </div>
            </RefSection>

            {/* Materials Checklist */}
            <RefSection
              title="Common Materials"
              icon="🔩"
              isOpen={!!expandedRef.shadeMaterials}
              onToggle={() => toggleRef('shadeMaterials')}
            >
              <div className="text-xs text-gray-600">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {[
                    'EMT conduit (3/4" or 1")',
                    'Aluminet / shade cloth',
                    'Ratchet straps (1" and 2")',
                    'Rebar stakes (18–24")',
                    'Zip ties (UV-rated)',
                    'Hose clamps',
                    'Bungee cords / ball bungees',
                    'Paracord / guy wire',
                    'Swaged fittings / Maker Pipe',
                    'Duct tape (Gorilla brand)',
                    'Tennis balls / rebar caps',
                    'Turnbuckles',
                    'Carabiners',
                    'Fender washers',
                    'Lag bolts (12")',
                    'Wire / safety wire',
                  ].map(item => (
                    <span key={item} className="py-0.5">• {item}</span>
                  ))}
                </div>
              </div>
            </RefSection>

            {/* ━━━ RATCHET STRAPS HOW-TO ━━━ */}
            <div className="border-2 border-blue-300 bg-blue-50/40">
              <button
                onClick={() => toggleRef('ratchetStraps')}
                className="w-full text-left px-4 py-2.5 flex items-center gap-2 hover:bg-blue-50 transition-colors"
              >
                <span>🔧</span>
                <span className="flex-1 text-sm font-bold">How to Use Ratchet Straps</span>
                <span className="text-[10px] font-bold text-blue-600 mr-2">MUST-READ</span>
                <span className="text-gray-300 text-xs">{expandedRef.ratchetStraps ? '▾' : '▸'}</span>
              </button>
              {expandedRef.ratchetStraps && (
                <div className="px-4 pb-4">
                  <p className="text-xs text-gray-600 mb-3">
                    Ratchet straps are the backbone of shade structure assembly on the playa. Learn how to use them properly — a loose strap will fail in wind, an over-tightened one will bend your frame.
                  </p>

                  {/* Parts of a Ratchet Strap */}
                  <div className="mb-4">
                    <p className="text-xs font-bold mb-1">Parts of a Ratchet Strap</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <div className="bg-white p-2 border border-gray-200">
                        <span className="font-bold">Fixed End</span> — Short strap sewn directly to the ratchet axle. This side stays anchored.
                      </div>
                      <div className="bg-white p-2 border border-gray-200">
                        <span className="font-bold">Free End</span> — Long strap that threads through the ratchet. This wraps around the object.
                      </div>
                      <div className="bg-white p-2 border border-gray-200">
                        <span className="font-bold">Ratchet Mechanism</span> — The lever that tensions the strap by winding it around the axle.
                      </div>
                      <div className="bg-white p-2 border border-gray-200">
                        <span className="font-bold">Release Lever</span> — Pull to fully open the ratchet and release all tension.
                      </div>
                    </div>
                  </div>

                  {/* Step by step */}
                  <div className="mb-4">
                    <p className="text-xs font-bold mb-2">Step-by-Step: Threading &amp; Tensioning</p>
                    <ol className="space-y-2">
                      {[
                        { step: 'Open the ratchet', detail: 'Pull the release lever to fully open the ratchet mechanism until it\'s flat. The axle slot should be visible and accessible.' },
                        { step: 'Thread the free end', detail: 'Feed the free (long) end of the strap up through the bottom of the axle slot and pull it through. Make sure the strap sits flat with no twists.' },
                        { step: 'Position and wrap', detail: 'Route the fixed end around one anchor point and the free end around the other (pole, rebar, frame joint). Remove all slack by pulling the free end tight by hand.' },
                        { step: 'Ratchet to tension', detail: 'Pump the ratchet handle up and down to take up slack. The strap should be taut but not deforming the frame — you want firm tension, not maximum cranking.' },
                        { step: 'Lock it closed', detail: 'Once tensioned, close the ratchet handle flat against the body. It locks automatically. Tuck or tie off any excess strap so it doesn\'t flap in the wind.' },
                        { step: 'To release', detail: 'Pull the release lever fully open (past center), then pull the strap free from the axle. The mechanism fully opens and all tension is released.' },
                      ].map((s, i) => (
                        <li key={i} className="flex gap-2 text-xs">
                          <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                            {i + 1}
                          </span>
                          <div>
                            <span className="font-bold">{s.step}</span>
                            <span className="text-gray-600"> — {s.detail}</span>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Common mistakes */}
                  <div className="mb-4">
                    <p className="text-xs font-bold mb-1">Common Mistakes</p>
                    <ul className="text-xs text-red-700 space-y-1 list-disc list-inside bg-red-50 p-2 border border-red-200">
                      <li><strong>Twisted straps</strong> — A twist reduces strength by ~50% and causes abrasion wear. Always keep flat.</li>
                      <li><strong>Over-tensioning</strong> — Cranking too hard bends EMT conduit and can crack fittings. Firm, not maximum.</li>
                      <li><strong>No tail management</strong> — Loose flapping tails shred in wind and become MOOP. Tie off or roll excess strap.</li>
                      <li><strong>Wrong size</strong> — Use 1&quot; straps for light duty (shade cloth to frame). Use 2&quot; straps for structural loads (frame to anchors).</li>
                      <li><strong>Sun degradation</strong> — Polyester straps last longer than nylon in UV. Replace any strap with fraying or fading.</li>
                    </ul>
                  </div>

                  {/* Pro tips */}
                  <div className="mb-4">
                    <p className="text-xs font-bold mb-1">Pro Tips for the Playa</p>
                    <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
                      <li>Bring 2× as many ratchet straps as you think you need. They break, get lost, and you always find new uses.</li>
                      <li>Color-code straps by size/purpose with tape so anyone can grab the right one.</li>
                      <li>Check strap tension daily — temperature swings cause thermal expansion and loosening.</li>
                      <li>Spray ratchet mechanisms with silicone lube before the burn — playa dust jams them.</li>
                      <li>Practice threading ratchet straps at home. On the playa in 100°F heat is not the time to learn.</li>
                    </ul>
                  </div>

                  {/* Videos */}
                  <div>
                    <p className="text-xs font-bold mb-2">📹 Video Resources</p>
                    <div className="space-y-1.5">
                      <a
                        href="https://www.youtube.com/watch?v=UVY8cGt-mM0"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline block"
                      >
                        How to Use a Ratchet Strap (Basic tutorial) ↗
                      </a>
                      <a
                        href="https://www.youtube.com/watch?v=H5YjJMFjP0M"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline block"
                      >
                        How to Thread &amp; Release a Ratchet Strap ↗
                      </a>
                      <a
                        href="https://www.youtube.com/results?search_query=burning+man+shade+structure+build"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline block"
                      >
                        🔍 Search: Burning Man Shade Structure Builds (YouTube) ↗
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Assembly Overview */}
            <RefSection
              title="General Assembly Steps"
              icon="🔨"
              isOpen={!!expandedRef.shadeAssembly}
              onToggle={() => toggleRef('shadeAssembly')}
            >
              <ol className="space-y-2">
                {[
                  { step: 'Lay out your footprint', detail: 'Mark corners with rebar. Verify dimensions against your camp layout before cutting or assembling anything.' },
                  { step: 'Assemble frame on the ground', detail: 'Connect all frame joints, fittings, and cross-braces while the structure is flat. Much easier than working overhead.' },
                  { step: 'Attach shade cloth to frame', detail: 'Drape aluminet or shade cloth and secure with ball bungees, zip ties, or hose clamps while it\'s still on the ground.' },
                  { step: 'Raise the structure', detail: 'Lift with enough people (minimum 4 for a carport). Have someone ready at each leg to drop it onto rebar stakes.' },
                  { step: 'Stake and anchor legs', detail: 'Pound rebar at 45° angles. Use ratchet straps to secure legs to rebar. Minimum 2 stakes per leg, 4 on wind-facing sides.' },
                  { step: 'Run guy wires / straps', detail: 'Attach guy lines from the top of the frame to buried stakes at 45° angle out from the base. Tension with turnbuckles or ratchet straps.' },
                  { step: 'Tension the shade cloth', detail: 'Pull aluminet taut and secure all edges. Loose fabric flaps in wind, causes noise, and will eventually tear free.' },
                  { step: 'MOOP check', detail: 'Walk the entire structure. Cap all rebar, secure all loose ends, tape sharp edges, tie off strap tails.' },
                ].map((s, i) => (
                  <li key={i} className="flex gap-2 text-xs">
                    <span className="flex-shrink-0 w-5 h-5 bg-black text-white flex items-center justify-center text-[10px] font-bold">
                      {i + 1}
                    </span>
                    <div>
                      <span className="font-bold">{s.step}</span>
                      <span className="text-gray-600"> — {s.detail}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </RefSection>

            {/* External Resources */}
            <RefSection
              title="Additional Resources"
              icon="🔗"
              isOpen={!!expandedRef.shadeLinks}
              onToggle={() => toggleRef('shadeLinks')}
            >
              <div className="space-y-1.5">
                <a
                  href="https://futureturtles.com/2026/Guide%20to%20Burning%20Man%20Shade%20Structures.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline block"
                >
                  📄 Future Turtles — Complete Shade Structure Guide (PDF) ↗
                </a>
                <a
                  href="https://burningman.org/event/preparation/playa-living/shade/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline block"
                >
                  🏜️ Burning Man Official — Shade on the Playa ↗
                </a>
                <a
                  href="https://www.youtube.com/results?search_query=monkey+hut+burning+man+build"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline block"
                >
                  🔍 Search: Monkey Hut Build Videos (YouTube) ↗
                </a>
                <a
                  href="https://www.youtube.com/results?search_query=carport+shade+structure+burning+man"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline block"
                >
                  🔍 Search: Carport Shade Structure Videos (YouTube) ↗
                </a>
              </div>
            </RefSection>
          </div>
        </TabPanel>

        {/* ═══════════  BUILD SCHEDULE  ═══════════ */}
        <TabPanel tabId="schedule" activeTab={activeTab}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] text-gray-400 uppercase tracking-wider font-bold">
              Day-by-day build plan — tap items to edit, drag to reorder
            </p>
            <button
              onClick={() => { setEditingScheduleItem(null); setShowAddScheduleItem(true) }}
              className="text-xs bg-black text-white px-3 py-1.5 hover:bg-gray-800 transition-colors"
            >
              + Add Item
            </button>
          </div>

          <div className="space-y-3">
            {BUILD_SCHEDULE_DAYS.map(day => {
              const dayItems = scheduleItems.filter(item => item.day === day)
              const completedCount = dayItems.filter(i => i.completed).length
              const isExpanded = expandedScheduleDays[day] !== false

              return (
                <div key={day} className="border border-gray-200 bg-white">
                  <button
                    onClick={() => setExpandedScheduleDays(prev => ({ ...prev, [day]: !isExpanded }))}
                    className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-lg">📅</span>
                    <span className="flex-1 font-bold text-sm">
                      {BUILD_SCHEDULE_DAY_LABELS[day]}
                    </span>
                    {dayItems.length > 0 && (
                      <span className="text-[10px] text-gray-400">
                        {completedCount}/{dayItems.length} done
                      </span>
                    )}
                    {dayItems.some(i => i.is_delivery) && (
                      <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                        🚚 Deliveries
                      </span>
                    )}
                    <span className="text-gray-300 text-xs">{isExpanded ? '▾' : '▸'}</span>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-100">
                      {dayItems.length === 0 ? (
                        <p className="px-4 py-3 text-xs text-gray-400 italic">No items scheduled</p>
                      ) : (
                        <div className="divide-y divide-gray-50">
                          {dayItems.map((item, idx) => (
                            <ScheduleItemRow
                              key={item.id}
                              item={item}
                              isFirst={idx === 0}
                              isLast={idx === dayItems.length - 1}
                              onToggleComplete={async () => {
                                const updated = await updateScheduleItem(item.id, { completed: !item.completed })
                                setScheduleItems(prev => prev.map(i => i.id === item.id ? updated : i))
                              }}
                              onEdit={() => { setEditingScheduleItem(item); setShowAddScheduleItem(true) }}
                              onDelete={async () => {
                                await deleteScheduleItem(item.id)
                                setScheduleItems(prev => prev.filter(i => i.id !== item.id))
                              }}
                              onMoveUp={async () => {
                                if (idx === 0) return
                                const prev = dayItems[idx - 1]
                                const updates = [
                                  { id: item.id, sort_order: prev.sort_order, day },
                                  { id: prev.id, sort_order: item.sort_order, day },
                                ]
                                await reorderScheduleItems(updates)
                                setScheduleItems(items =>
                                  items.map(i => {
                                    const u = updates.find(u => u.id === i.id)
                                    return u ? { ...i, sort_order: u.sort_order } : i
                                  }).sort((a, b) => a.sort_order - b.sort_order)
                                )
                              }}
                              onMoveDown={async () => {
                                if (idx === dayItems.length - 1) return
                                const next = dayItems[idx + 1]
                                const updates = [
                                  { id: item.id, sort_order: next.sort_order, day },
                                  { id: next.id, sort_order: item.sort_order, day },
                                ]
                                await reorderScheduleItems(updates)
                                setScheduleItems(items =>
                                  items.map(i => {
                                    const u = updates.find(u => u.id === i.id)
                                    return u ? { ...i, sort_order: u.sort_order } : i
                                  }).sort((a, b) => a.sort_order - b.sort_order)
                                )
                              }}
                              onMoveToDay={async (newDay: string) => {
                                const targetDayItems = scheduleItems.filter(i => i.day === newDay)
                                const maxSort = targetDayItems.length > 0
                                  ? Math.max(...targetDayItems.map(i => i.sort_order))
                                  : 0
                                const updated = await updateScheduleItem(item.id, {
                                  day: newDay as BuildScheduleDay,
                                  sort_order: maxSort + 10,
                                })
                                setScheduleItems(prev =>
                                  prev.map(i => i.id === item.id ? updated : i)
                                    .sort((a, b) => a.sort_order - b.sort_order)
                                )
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </TabPanel>

        {/* Schedule Item Form Modal */}
        {showAddScheduleItem && (
          <ScheduleItemForm
            initial={editingScheduleItem}
            saving={savingScheduleItem}
            onSave={async (formData) => {
              setSavingScheduleItem(true)
              try {
                if (editingScheduleItem) {
                  const updated = await updateScheduleItem(editingScheduleItem.id, formData)
                  setScheduleItems(prev =>
                    prev.map(i => i.id === editingScheduleItem.id ? updated : i)
                      .sort((a, b) => a.sort_order - b.sort_order)
                  )
                } else {
                  const dayItems = scheduleItems.filter(i => i.day === formData.day)
                  const maxSort = dayItems.length > 0
                    ? Math.max(...dayItems.map(i => i.sort_order))
                    : 0
                  const created = await createScheduleItem({
                    ...formData,
                    sort_order: maxSort + 10,
                    completed: false,
                  } as Omit<BuildScheduleItem, 'id' | 'created_at' | 'updated_at'>)
                  setScheduleItems(prev => [...prev, created].sort((a, b) => a.sort_order - b.sort_order))
                }
                setShowAddScheduleItem(false)
                setEditingScheduleItem(null)
              } finally {
                setSavingScheduleItem(false)
              }
            }}
            onCancel={() => { setShowAddScheduleItem(false); setEditingScheduleItem(null) }}
          />
        )}
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
  { value: 'shelter', label: 'Shade Structure Materials' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'logistics', label: 'Tools' },
  { value: 'safety', label: 'Safety' },
  { value: 'layout', label: 'Layout' },
  { value: 'decoration', label: 'Decoration' },
  { value: 'personal', label: 'Personal' },
  { value: 'shade_structure', label: 'Shade Structure' },
  { value: 'tool', label: 'Tool' },
  { value: 'large_equipment', label: 'Large Equipment/Vehicle' },
  { value: 'container', label: 'Container' },
  { value: 'av_equip', label: 'A/V Equip' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'other', label: 'Other' },
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

/* ── Inventory Form types & component ── */

type InventoryFormData = {
  name: string
  category: string
  description?: string
  size_w?: string
  size_l?: string
  quantity_expected: number
  notes?: string
}

const INVENTORY_CATEGORIES: { value: InventoryCategory; label: string }[] = [
  { value: 'shade_structure', label: 'Shade Structure' },
  { value: 'tool', label: 'Tool' },
  { value: 'large_equipment', label: 'Large Equipment/Vehicle' },
  { value: 'container', label: 'Container' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'av_equip', label: 'A/V Equip' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'layout', label: 'Layout' },
  { value: 'other', label: 'Other' },
]

function InventoryForm({ item, saving, onSave, onCancel }: {
  item: BuildInventory | null
  saving: boolean
  onSave: (data: InventoryFormData) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(item?.name || '')
  const [category, setCategory] = useState<string>(item?.category || 'other')
  const [description, setDescription] = useState(item?.description || '')
  const [sizeW, setSizeW] = useState(item?.size_w || '')
  const [sizeL, setSizeL] = useState(item?.size_l || '')
  const [quantityExpected, setQuantityExpected] = useState(item?.quantity_expected ?? 1)
  const [notes, setNotes] = useState(item?.notes || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onSave({
      name: name.trim(),
      category,
      description: description.trim() || undefined,
      size_w: sizeW.trim() || undefined,
      size_l: sizeL.trim() || undefined,
      quantity_expected: Math.max(1, quantityExpected),
      notes: notes.trim() || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="border-2 border-black bg-white p-4 mb-4 space-y-3">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
        {item ? 'Edit Item' : 'Add Inventory Item'}
      </p>

      {/* Row 1: Name + Category */}
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Item name *"
          required
          className="flex-1 px-3 py-1.5 text-sm border-2 border-black focus:outline-none"
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="px-2 py-1.5 text-sm border-2 border-black bg-white font-bold focus:outline-none"
        >
          {INVENTORY_CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{INVENTORY_CATEGORY_ICONS[c.value]} {c.label}</option>
          ))}
        </select>
      </div>

      {/* Row 2: Size (W), Size (L), Qty needed */}
      <div className="flex gap-2 items-center">
        <label className="text-xs font-bold text-gray-500">Size (W):</label>
        <input
          type="text"
          value={sizeW}
          onChange={e => setSizeW(e.target.value)}
          placeholder="Width"
          className="w-20 px-2 py-1.5 text-sm border-2 border-black focus:outline-none"
        />
        <label className="text-xs font-bold text-gray-500">Size (L):</label>
        <input
          type="text"
          value={sizeL}
          onChange={e => setSizeL(e.target.value)}
          placeholder="Length"
          className="w-20 px-2 py-1.5 text-sm border-2 border-black focus:outline-none"
        />
        <label className="text-xs font-bold text-gray-500"># Needed:</label>
        <input
          type="number"
          min={1}
          value={quantityExpected}
          onChange={e => setQuantityExpected(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-20 px-2 py-1.5 text-sm border-2 border-black focus:outline-none text-center"
        />
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
          {saving ? 'Saving…' : item ? 'Save Changes' : 'Add Item'}
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

// ── Question / Issue Form ──

type QuestionFormData = {
  question: string
  category: string
  context?: string
  is_pain_point?: boolean
}

function QuestionForm({ initialData, saving, onSave, onCancel }: {
  initialData?: { question: string; category: string; context?: string | null; is_pain_point?: boolean }
  saving: boolean
  onSave: (data: QuestionFormData) => void
  onCancel: () => void
}) {
  const [question, setQuestion] = useState(initialData?.question || '')
  const [category, setCategory] = useState<string>(initialData?.category || 'logistics')
  const [context, setContext] = useState(initialData?.context || '')
  const [isPainPoint, setIsPainPoint] = useState(initialData?.is_pain_point || false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return
    onSave({
      question: question.trim(),
      category,
      context: context.trim() || undefined,
      is_pain_point: isPainPoint,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="border-2 border-black bg-gray-50 p-3 mb-4 space-y-2">
      <input
        type="text"
        value={question}
        onChange={e => setQuestion(e.target.value)}
        placeholder="Question or issue *"
        className="w-full px-3 py-1.5 text-sm border-2 border-black focus:outline-none"
        autoFocus
      />

      <div className="flex gap-2">
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="px-3 py-1.5 text-sm border-2 border-black bg-white font-bold focus:outline-none"
        >
          {CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>

        <label className="flex items-center gap-1.5 text-sm font-bold cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isPainPoint}
            onChange={e => setIsPainPoint(e.target.checked)}
            className="w-4 h-4"
          />
          🔥 Pain Point
        </label>
      </div>

      <input
        type="text"
        value={context}
        onChange={e => setContext(e.target.value)}
        placeholder="Context / details (optional)"
        className="w-full px-3 py-1.5 text-sm border-2 border-black focus:outline-none"
      />

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={saving || !question.trim()}
          className={cn(
            'px-4 py-1.5 text-sm font-bold bg-black text-white hover:bg-gray-800',
            (saving || !question.trim()) && 'opacity-50 cursor-not-allowed'
          )}
        >
          {saving ? 'Saving…' : initialData ? 'Save' : 'Add'}
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

/* ── Schedule Item Row ── */

function ScheduleItemRow({
  item,
  isFirst,
  isLast,
  onToggleComplete,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onMoveToDay,
}: {
  item: BuildScheduleItem
  isFirst: boolean
  isLast: boolean
  onToggleComplete: () => void
  onEdit: () => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onMoveToDay: (day: string) => void
}) {
  const [showActions, setShowActions] = useState(false)
  const [showMoveMenu, setShowMoveMenu] = useState(false)

  return (
    <div className={cn('px-4 py-2.5 group', item.completed && 'bg-green-50/40')}>
      <div className="flex items-center gap-2">
        {/* Completion toggle */}
        <button
          onClick={onToggleComplete}
          className="text-lg flex-shrink-0 hover:scale-110 transition-transform"
          title={item.completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {item.completed ? '✅' : '⬜'}
        </button>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-sm',
              item.completed && 'line-through text-gray-400'
            )}>
              {item.is_delivery && <span className="mr-1">🚚</span>}
              {item.title}
            </span>
          </div>
          {item.description && (
            <p className="text-[11px] text-gray-400 mt-0.5 truncate">{item.description}</p>
          )}
        </div>

        {/* Category badge */}
        <span className={cn(
          'hidden sm:inline text-[10px] px-1.5 py-0.5 rounded',
          SCHEDULE_CATEGORY_COLORS[item.category] || 'bg-gray-100 text-gray-600'
        )}>
          {SCHEDULE_CATEGORY_ICONS[item.category]} {item.category}
        </span>

        {item.time_slot && (
          <span className="hidden sm:inline text-[10px] text-gray-400">
            {item.time_slot === 'morning' ? '🌅 AM' : item.time_slot === 'afternoon' ? '☀️ PM' : '📆 All day'}
          </span>
        )}

        {item.assigned_to && (
          <span className="hidden sm:inline text-[10px] text-gray-400">
            👤 {item.assigned_to}
          </span>
        )}

        {/* Actions toggle */}
        <button
          onClick={() => { setShowActions(p => !p); setShowMoveMenu(false) }}
          className="text-gray-300 hover:text-gray-600 text-xs px-1"
        >
          ⋯
        </button>
      </div>

      {/* Action buttons */}
      {showActions && (
        <div className="ml-8 mt-2 flex flex-wrap gap-1.5">
          <button
            onClick={onEdit}
            className="text-[10px] px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded"
          >
            ✏️ Edit
          </button>
          {!isFirst && (
            <button
              onClick={onMoveUp}
              className="text-[10px] px-2 py-1 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded"
            >
              ↑ Up
            </button>
          )}
          {!isLast && (
            <button
              onClick={onMoveDown}
              className="text-[10px] px-2 py-1 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded"
            >
              ↓ Down
            </button>
          )}
          <div className="relative">
            <button
              onClick={() => setShowMoveMenu(p => !p)}
              className="text-[10px] px-2 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded"
            >
              📅 Move to…
            </button>
            {showMoveMenu && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 shadow-lg rounded z-20 py-1 min-w-[120px]">
                {BUILD_SCHEDULE_DAYS.filter(d => d !== item.day).map(d => (
                  <button
                    key={d}
                    onClick={() => { onMoveToDay(d); setShowMoveMenu(false); setShowActions(false) }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50"
                  >
                    {BUILD_SCHEDULE_DAY_LABELS[d]}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => { if (confirm('Delete this schedule item?')) onDelete() }}
            className="text-[10px] px-2 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded"
          >
            🗑 Delete
          </button>
        </div>
      )}

      {item.notes && (
        <p className="ml-8 mt-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded">
          {item.notes}
        </p>
      )}
    </div>
  )
}

/* ── Schedule Item Form ── */

const SCHEDULE_CATEGORIES: { value: string; label: string }[] = [
  { value: 'delivery', label: '🚚 Delivery / Receiving' },
  { value: 'infrastructure', label: '🏗️ Infrastructure' },
  { value: 'shade', label: '⛱️ Shade' },
  { value: 'kitchen', label: '🍳 Kitchen' },
  { value: 'electrical', label: '⚡ Electrical' },
  { value: 'plumbing', label: '🚿 Plumbing' },
  { value: 'layout', label: '📐 Layout' },
  { value: 'decoration', label: '🎨 Decoration' },
  { value: 'logistics', label: '📦 Logistics' },
  { value: 'safety', label: '🛡️ Safety' },
  { value: 'other', label: '🏷️ Other' },
]

function ScheduleItemForm({
  initial,
  saving,
  onSave,
  onCancel,
}: {
  initial: BuildScheduleItem | null
  saving: boolean
  onSave: (data: {
    title: string
    description: string | null
    day: BuildScheduleDay
    category: BuildScheduleCategory
    time_slot: string | null
    is_delivery: boolean
    assigned_to: string | null
    notes: string | null
  }) => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initial?.title || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [day, setDay] = useState<string>(initial?.day || 'monday')
  const [category, setCategory] = useState<string>(initial?.category || 'other')
  const [timeSlot, setTimeSlot] = useState(initial?.time_slot || '')
  const [isDelivery, setIsDelivery] = useState(initial?.is_delivery || false)
  const [assignedTo, setAssignedTo] = useState(initial?.assigned_to || '')
  const [notes, setNotes] = useState(initial?.notes || '')

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <form
        onSubmit={e => {
          e.preventDefault()
          if (!title.trim()) return
          onSave({
            title: title.trim(),
            description: description.trim() || null,
            day: day as BuildScheduleDay,
            category: category as BuildScheduleCategory,
            time_slot: timeSlot || null,
            is_delivery: isDelivery,
            assigned_to: assignedTo.trim() || null,
            notes: notes.trim() || null,
          })
        }}
        className="bg-white p-5 w-full max-w-md space-y-3 shadow-xl max-h-[85vh] overflow-y-auto"
      >
        <h3 className="text-sm font-bold">
          {initial ? 'Edit Schedule Item' : 'Add Schedule Item'}
        </h3>

        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Task title *"
          required
          className="w-full border border-gray-300 px-3 py-1.5 text-sm focus:ring-1 focus:ring-black focus:border-black"
        />

        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={2}
          className="w-full border border-gray-300 px-3 py-1.5 text-sm focus:ring-1 focus:ring-black focus:border-black"
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-gray-500 uppercase font-bold">Day</label>
            <select
              value={day}
              onChange={e => setDay(e.target.value)}
              className="w-full border border-gray-300 px-2 py-1.5 text-sm"
            >
              {BUILD_SCHEDULE_DAYS.map(d => (
                <option key={d} value={d}>{BUILD_SCHEDULE_DAY_LABELS[d]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-gray-500 uppercase font-bold">Category</label>
            <select
              value={category}
              onChange={e => {
                setCategory(e.target.value)
                if (e.target.value === 'delivery') setIsDelivery(true)
              }}
              className="w-full border border-gray-300 px-2 py-1.5 text-sm"
            >
              {SCHEDULE_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-gray-500 uppercase font-bold">Time Slot</label>
            <select
              value={timeSlot}
              onChange={e => setTimeSlot(e.target.value)}
              className="w-full border border-gray-300 px-2 py-1.5 text-sm"
            >
              <option value="">Not specified</option>
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="all_day">All Day</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-gray-500 uppercase font-bold">Assigned To</label>
            <input
              value={assignedTo}
              onChange={e => setAssignedTo(e.target.value)}
              placeholder="Person or crew"
              className="w-full border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isDelivery}
            onChange={e => setIsDelivery(e.target.checked)}
            className="w-4 h-4"
          />
          🚚 This is a delivery / receiving item
        </label>

        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          rows={2}
          className="w-full border border-gray-300 px-3 py-1.5 text-sm focus:ring-1 focus:ring-black focus:border-black"
        />

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className={cn(
              'px-4 py-1.5 text-sm font-bold text-white',
              saving || !title.trim() ? 'bg-gray-400' : 'bg-black hover:bg-gray-800'
            )}
          >
            {saving ? 'Saving…' : initial ? 'Update' : 'Add'}
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
    </div>
  )
}
