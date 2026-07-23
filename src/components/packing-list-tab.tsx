'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button, Input, Alert, Badge, Select } from '@/components/ui'
import {
  getPackingListAction,
  addPackingListItemAction,
  updatePackingListItemAction,
  deletePackingListItemAction,
  bulkInsertPackingListAction,
  updateStatusAction,
  syncMissingBaseItemsAction,
} from '@/app/actions/packing-list'
import { BASE_PACKING_LIST, PACKING_CATEGORIES } from '@/lib/base-packing-list'
import type { PackingListItemRow, PackingItemStatus, CamperRow } from '@/types/database'

interface PackingListTabProps {
  camper: CamperRow
}

type PriorityFilter = 'all' | 'must' | 'nice' | 'optional'
type StatusFilter = 'all' | PackingItemStatus

// Tap-to-cycle order for the status button (includes all selectable statuses)
const ALL_STATUSES: PackingItemStatus[] = ['need', 'ordered', 'have', 'packed', 'camp_provided', 'na']
// Statuses that count as "handled" (no more action needed) for progress/completion
const RESOLVED_STATUSES: PackingItemStatus[] = ['packed', 'camp_provided', 'na']

const STATUS_CONFIG = {
  need: { label: 'Need', icon: '⬜', color: 'bg-gray-100 text-gray-700 border-gray-300', barColor: 'bg-gray-300' },
  ordered: { label: 'Ordered', icon: '📦', color: 'bg-amber-100 text-amber-800 border-amber-300', barColor: 'bg-amber-400' },
  have: { label: 'Have', icon: '✅', color: 'bg-blue-100 text-blue-800 border-blue-300', barColor: 'bg-blue-400' },
  packed: { label: 'Packed', icon: '🎒', color: 'bg-green-100 text-green-800 border-green-300', barColor: 'bg-green-500' },
  camp_provided: { label: 'Camp Provided', icon: '⛺', color: 'bg-purple-100 text-purple-800 border-purple-300', barColor: 'bg-purple-400' },
  na: { label: 'N/A', icon: '🚫', color: 'bg-gray-100 text-gray-400 border-gray-200', barColor: 'bg-gray-300' },
} as const

const PRIORITY_LABELS = {
  must: 'Essential',
  nice: 'Recommended',
  optional: 'Optional',
} as const

export default function PackingListTab({ camper }: PackingListTabProps) {
  const [items, setItems] = useState<PackingListItemRow[]>([])
  const [loading, setLoading] = useState(true)
  const [populating, setPopulating] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Filters
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // Collapsed categories (start with all collapsed)
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set())
  const collapseInitialized = useRef(false)

  // Add item form
  const [showAddForm, setShowAddForm] = useState(false)
  const [newItem, setNewItem] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newPriority, setNewPriority] = useState<'must' | 'nice' | 'optional'>('must')
  const [adding, setAdding] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editItem, setEditItem] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editPriority, setEditPriority] = useState<'must' | 'nice' | 'optional'>('must')
  const [editStatus, setEditStatus] = useState<PackingItemStatus>('need')

  const fetchItems = useCallback(async () => {
    const result = await getPackingListAction(camper.id)
    if (result.success && result.items) {
      let finalItems = result.items
      // Sync any missing items from the base list (e.g. newly added categories)
      if (result.items.length > 0) {
        const syncResult = await syncMissingBaseItemsAction(
          camper.id,
          BASE_PACKING_LIST.map(entry => ({
            category: entry.category,
            item: entry.item,
            priority: entry.priority,
            notes: entry.notes,
          }))
        )
        if (syncResult.success && syncResult.items) {
          finalItems = syncResult.items
        }
      }
      setItems(finalItems)
      // Collapse all categories by default the first time items load
      if (!collapseInitialized.current && finalItems.length > 0) {
        setCollapsedCats(new Set(finalItems.map(i => i.category || 'Uncategorized')))
        collapseInitialized.current = true
      }
    }
    setLoading(false)
  }, [camper.id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    void fetchItems()
  }, [fetchItems])

  const loadBaseList = async () => {
    setPopulating(true)
    setMessage(null)
    const result = await bulkInsertPackingListAction(
      camper.id,
      BASE_PACKING_LIST.map(entry => ({
        category: entry.category,
        item: entry.item,
        priority: entry.priority,
        notes: entry.notes,
      }))
    )
    if (result.success && result.items) {
      setItems(result.items)
      setMessage({ type: 'success', text: `Loaded ${result.items.length} items! Tap status buttons to track your progress.` })
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to load base packing list' })
    }
    setPopulating(false)
  }

  const cycleStatus = async (item: PackingListItemRow) => {
    const currentIdx = ALL_STATUSES.indexOf(item.status)
    const nextStatus = ALL_STATUSES[(currentIdx + 1) % ALL_STATUSES.length]
    // Optimistic update
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: nextStatus } : i))
    const result = await updateStatusAction(item.id, nextStatus)
    if (!result.success) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: item.status } : i))
    }
  }

  const addItem = async () => {
    if (!newItem.trim()) return
    setAdding(true)
    const result = await addPackingListItemAction({
      camper_id: camper.id,
      item: newItem.trim(),
      category: newCategory.trim() || 'Uncategorized',
      priority: newPriority,
      sort_order: items.length,
    })
    if (result.success && result.item) {
      setItems(prev => [...prev, result.item!])
      setNewItem('')
      setNewCategory('')
      setShowAddForm(false)
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to add item' })
    }
    setAdding(false)
  }

  const startEdit = (item: PackingListItemRow) => {
    setEditingId(item.id)
    setEditItem(item.item)
    setEditCategory(item.category)
    setEditNotes(item.notes || '')
    setEditPriority(item.priority || 'must')
    setEditStatus(item.status || 'need')
  }

  const saveEdit = async () => {
    if (!editingId || !editItem.trim()) return
    const result = await updatePackingListItemAction(editingId, {
      item: editItem.trim(),
      category: editCategory.trim() || 'Uncategorized',
      notes: editNotes.trim() || null,
      priority: editPriority,
      status: editStatus,
    })
    if (result.success && result.item) {
      setItems(prev => prev.map(i => i.id === editingId ? result.item! : i))
      setEditingId(null)
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update item' })
    }
  }

  const deleteItem = async (itemId: string) => {
    const result = await deletePackingListItemAction(itemId)
    if (result.success) {
      setItems(prev => prev.filter(i => i.id !== itemId))
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to delete item' })
    }
  }

  const toggleCategory = (cat: string) => {
    setCollapsedCats(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const exportCSV = () => {
    const header = 'Category,Item,Priority,Status,Notes'
    const rows = items.map(i =>
      [i.category, i.item, PRIORITY_LABELS[i.priority] || i.priority, STATUS_CONFIG[i.status]?.label || i.status, i.notes || '']
        .map(v => `"${v.replace(/"/g, '""')}"`)
        .join(',')
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `packing-list-${camper.playa_name || camper.full_name || 'camper'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Filter items
  const filteredItems = useMemo(() => items.filter(i => {
    if (priorityFilter !== 'all' && i.priority !== priorityFilter) return false
    if (statusFilter !== 'all' && i.status !== statusFilter) return false
    return true
  }), [items, priorityFilter, statusFilter])

  // Group by category
  const grouped = useMemo(() => filteredItems.reduce<Record<string, PackingListItemRow[]>>((acc, item) => {
    const cat = item.category || 'Uncategorized'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {}), [filteredItems])

  const sortedCategories = useMemo(() => Object.keys(grouped).sort((a, b) => {
    const idxA = (PACKING_CATEGORIES as readonly string[]).indexOf(a)
    const idxB = (PACKING_CATEGORIES as readonly string[]).indexOf(b)
    if (idxA >= 0 && idxB >= 0) return idxA - idxB
    if (idxA >= 0) return -1
    if (idxB >= 0) return 1
    return a.localeCompare(b)
  }), [grouped])

  // Stats
  const statusCounts = useMemo(() => ({
    need: items.filter(i => i.status === 'need').length,
    ordered: items.filter(i => i.status === 'ordered').length,
    have: items.filter(i => i.status === 'have').length,
    packed: items.filter(i => i.status === 'packed').length,
    camp_provided: items.filter(i => i.status === 'camp_provided').length,
    na: items.filter(i => i.status === 'na').length,
  }), [items])
  const totalItems = items.length
  // Items that still require action tracking (exclude N/A) and count of resolved items
  const trackableItems = totalItems - statusCounts.na
  const resolvedCount = statusCounts.packed + statusCounts.camp_provided

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {message && (
        <Alert variant={message.type === 'success' ? 'success' : 'error'}>
          {message.text}
        </Alert>
      )}

      {/* Universal list disclosure */}
      <p className="text-[11px] leading-snug text-gray-500">
        This is a universal packing list made up of dozens of campers&rsquo; lists. Some items on this list may be provided by your camp &mdash; check with your camp with questions.
      </p>

      {/* Header Card */}
      <Card className="border-2 border-yellow-300">
        <CardHeader className="pb-3">
          <CardTitle>🎒 My Packing List</CardTitle>
          <CardDescription>
            {items.length === 0
              ? 'Load the camp packing guide, then customize it. Tap status buttons to track each item through your packing journey!'
              : 'Tap an item\'s status to cycle it: Need → Ordered → Have → Packed → Camp Provided → N/A'
            }
          </CardDescription>
        </CardHeader>

        {totalItems > 0 && (
          <CardContent className="pt-0 pb-3">
            {/* Status summary - tappable stat boxes */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {ALL_STATUSES.map(s => {
                const cfg = STATUS_CONFIG[s]
                const count = statusCounts[s]
                const isActive = statusFilter === s
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(isActive ? 'all' : s)}
                    className={`rounded-lg p-2 text-center border-2 transition-all ${
                      isActive ? 'border-black ring-2 ring-black/10 scale-[1.02]' : 'border-transparent hover:border-gray-200'
                    } ${cfg.color}`}
                  >
                    <div className="text-lg leading-none">{cfg.icon}</div>
                    <div className="text-xl font-black leading-tight">{count}</div>
                    <div className="text-[10px] font-bold uppercase tracking-wide">{cfg.label}</div>
                  </button>
                )
              })}
            </div>

            {/* Stacked progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-3 border border-black overflow-hidden flex">
              {(['ordered', 'have', 'packed', 'camp_provided'] as PackingItemStatus[]).map(s => {
                const pct = trackableItems > 0 ? (statusCounts[s] / trackableItems) * 100 : 0
                return pct > 0 ? (
                  <div
                    key={s}
                    className={`${STATUS_CONFIG[s].barColor} h-full transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                    title={`${STATUS_CONFIG[s].label}: ${statusCounts[s]}`}
                  />
                ) : null
              })}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-gray-400">
                {resolvedCount} of {trackableItems} ready{statusCounts.na > 0 ? ` · ${statusCounts.na} N/A` : ''}
              </span>
              <span className="text-[10px] font-bold text-gray-500">
                {trackableItems > 0 ? Math.round((resolvedCount / trackableItems) * 100) : 0}%
              </span>
            </div>
          </CardContent>
        )}

        <CardFooter className="flex flex-wrap gap-2 pt-0">
          {items.length === 0 ? (
            <Button
              onClick={loadBaseList}
              disabled={populating}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
            >
              {populating ? '⏳ Loading...' : '📋 Load Camp Packing Guide'}
            </Button>
          ) : (
            <>
              <Button onClick={() => {
                setShowAddForm(!showAddForm)
                if (!showAddForm && items.length > 0 && !newCategory) {
                  setNewCategory(items[0].category)
                }
              }} variant="secondary" className="text-sm">
                {showAddForm ? '✕ Cancel' : '+ Add Item'}
              </Button>
              <Button onClick={exportCSV} variant="secondary" className="text-sm">
                📥 Export CSV
              </Button>
              <Button
                onClick={loadBaseList}
                disabled={populating}
                variant="secondary"
                className="text-sm text-gray-400"
              >
                {populating ? '⏳...' : '🔄 Reset List'}
              </Button>
            </>
          )}
        </CardFooter>
      </Card>

      {/* Add Item Form (toggled) */}
      {showAddForm && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Item name"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addItem() }}
                className="flex-1"
                autoFocus
              />
              <Select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                options={[
                  ...Array.from(new Set(items.map(i => i.category))).sort((a, b) => {
                    const idxA = (PACKING_CATEGORIES as readonly string[]).indexOf(a)
                    const idxB = (PACKING_CATEGORIES as readonly string[]).indexOf(b)
                    if (idxA >= 0 && idxB >= 0) return idxA - idxB
                    if (idxA >= 0) return -1
                    if (idxB >= 0) return 1
                    return a.localeCompare(b)
                  }).map(c => ({ value: c, label: c })),
                ]}
                className="sm:w-48"
              />
              <Select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as 'must' | 'nice' | 'optional')}
                options={[
                  { value: 'must', label: 'Essential' },
                  { value: 'nice', label: 'Recommended' },
                  { value: 'optional', label: 'Optional' },
                ]}
                className="sm:w-32"
              />
              <Button onClick={addItem} disabled={adding || !newItem.trim()}>
                {adding ? '...' : 'Add'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status filter pills */}
      {items.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-gray-400">Show:</span>
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-0.5 text-xs font-bold border rounded-full transition-colors ${
              statusFilter === 'all'
                ? 'bg-black text-white border-black'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            All {items.length}
          </button>
          {ALL_STATUSES.map(s => {
            const cfg = STATUS_CONFIG[s]
            const isActive = statusFilter === s
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(isActive ? 'all' : s)}
                className={`px-2.5 py-0.5 text-xs font-bold border rounded-full transition-colors ${
                  isActive ? 'bg-black text-white border-black' : `${cfg.color} hover:opacity-80`
                }`}
              >
                {cfg.icon} {cfg.label} {statusCounts[s]}
              </button>
            )
          })}
        </div>
      )}

      {/* Category cards */}
      {sortedCategories.map(category => {
        const categoryItems = grouped[category]
        const catDone = categoryItems.filter(i => RESOLVED_STATUSES.includes(i.status)).length
        const isCollapsed = collapsedCats.has(category)
        const allDone = catDone === categoryItems.length

        return (
          <Card key={category} className={allDone ? 'opacity-70' : ''}>
            <button
              onClick={() => toggleCategory(category)}
              className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 rounded-t-lg transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{isCollapsed ? '▶' : '▼'}</span>
                <span className="font-semibold text-sm">{category}</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Mini status dots */}
                <div className="hidden sm:flex items-center gap-1 text-[10px] text-gray-400">
                  {categoryItems.filter(i => i.status === 'packed').length > 0 && (
                    <span>🎒{categoryItems.filter(i => i.status === 'packed').length}</span>
                  )}
                  {categoryItems.filter(i => i.status === 'have').length > 0 && (
                    <span>✅{categoryItems.filter(i => i.status === 'have').length}</span>
                  )}
                  {categoryItems.filter(i => i.status === 'ordered').length > 0 && (
                    <span>📦{categoryItems.filter(i => i.status === 'ordered').length}</span>
                  )}
                </div>
                <Badge variant={allDone ? 'success' : catDone > 0 ? 'warning' : 'default'}>
                  {catDone}/{categoryItems.length}
                </Badge>
              </div>
            </button>
            {!isCollapsed && (
              <CardContent className="pt-0 pb-2">
                <ul className="divide-y divide-gray-50">
                  {categoryItems.map(item => (
                    <li key={item.id} className="py-1.5">
                      {editingId === item.id ? (
                        <div className="space-y-2 py-1">
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Input value={editItem} onChange={(e) => setEditItem(e.target.value)} placeholder="Item" className="flex-1" />
                            <Input value={editCategory} onChange={(e) => setEditCategory(e.target.value)} placeholder="Category" className="sm:w-32" />
                            <Select
                              value={editPriority}
                              onChange={(e) => setEditPriority(e.target.value as 'must' | 'nice' | 'optional')}
                              options={[{ value: 'must', label: 'Essential' }, { value: 'nice', label: 'Recommended' }, { value: 'optional', label: 'Optional' }]}
                              className="sm:w-32"
                            />
                            <Select
                              value={editStatus}
                              onChange={(e) => setEditStatus(e.target.value as PackingItemStatus)}
                              options={ALL_STATUSES.map(s => ({ value: s, label: STATUS_CONFIG[s].label }))}
                              className="sm:w-40"
                            />
                          </div>
                          <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Notes (optional)" />
                          <div className="flex gap-2">
                            <Button onClick={saveEdit} className="text-xs px-3 py-1">Save</Button>
                            <Button onClick={() => setEditingId(null)} variant="secondary" className="text-xs px-3 py-1">Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group">
                          {/* Status button - tap to cycle */}
                          <button
                            onClick={() => cycleStatus(item)}
                            className={`flex-shrink-0 min-w-[70px] px-1.5 py-1 text-[11px] font-bold rounded-md border transition-all hover:scale-105 active:scale-95 ${STATUS_CONFIG[item.status].color}`}
                            title={`Click to change status (current: ${STATUS_CONFIG[item.status].label}). Cycles Need → Ordered → Have → Packed → Camp Provided → N/A.`}
                          >
                            {STATUS_CONFIG[item.status].icon} {STATUS_CONFIG[item.status].label}
                          </button>

                          {/* Item name + priority + notes */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-sm ${RESOLVED_STATUSES.includes(item.status) ? 'line-through text-gray-400' : ''}`}>
                                {item.item}
                              </span>
                            </div>
                            {item.notes && (
                              <p className="text-[11px] text-gray-400 truncate">{item.notes}</p>
                            )}
                          </div>

                          {/* Actions - visible on hover */}
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <button onClick={() => startEdit(item)} className="text-xs p-1 text-gray-400 hover:text-black rounded" aria-label="Edit">✏️</button>
                            <button onClick={() => deleteItem(item.id)} className="text-xs p-1 text-gray-400 hover:text-red-600 rounded" aria-label="Delete">🗑️</button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            )}
          </Card>
        )
      })}

      {/* Empty state */}
      {items.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-4xl mb-4">🎒</p>
            <p className="text-gray-600 text-lg font-bold mb-2">Ready to start packing?</p>
            <p className="text-gray-400 text-sm max-w-md mx-auto">
              Load the camp guide with {BASE_PACKING_LIST.length} items across {PACKING_CATEGORIES.length} categories.
              Track each item from Need → Ordered → Have → Packed!
            </p>
          </CardContent>
        </Card>
      )}

      {filteredItems.length === 0 && items.length > 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-400">No items match the current filters.</p>
            <button
              onClick={() => { setPriorityFilter('all'); setStatusFilter('all') }}
              className="text-sm text-blue-500 hover:underline mt-1"
            >
              Clear filters
            </button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
