'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button, Input, Alert, Badge, Select } from '@/components/ui'
import {
  getPackingListAction,
  addPackingListItemAction,
  updatePackingListItemAction,
  deletePackingListItemAction,
  bulkInsertPackingListAction,
  togglePackedAction,
} from '@/app/actions/packing-list'
import { BASE_PACKING_LIST, PACKING_CATEGORIES } from '@/lib/base-packing-list'
import type { PackingListItemRow, CamperRow } from '@/types/database'

interface PackingListTabProps {
  camper: CamperRow
}

type PriorityFilter = 'all' | 'must' | 'nice' | 'optional'

const PRIORITY_COLORS = {
  must: 'bg-red-100 text-red-800 border-red-200',
  nice: 'bg-blue-100 text-blue-800 border-blue-200',
  optional: 'bg-gray-100 text-gray-600 border-gray-200',
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

  // Filter
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')

  // Add item form
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

  const fetchItems = useCallback(async () => {
    const result = await getPackingListAction(camper.id)
    if (result.success && result.items) {
      setItems(result.items)
    }
    setLoading(false)
  }, [camper.id])

  useEffect(() => {
    fetchItems()
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
      setMessage({ type: 'success', text: `Loaded ${result.items.length} items from the camp packing guide. Customize it for your burn!` })
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to load base packing list' })
    }
    setPopulating(false)
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
  }

  const saveEdit = async () => {
    if (!editingId || !editItem.trim()) return
    const result = await updatePackingListItemAction(editingId, {
      item: editItem.trim(),
      category: editCategory.trim() || 'Uncategorized',
      notes: editNotes.trim() || null,
      priority: editPriority,
    })
    if (result.success && result.item) {
      setItems(prev => prev.map(i => i.id === editingId ? result.item! : i))
      setEditingId(null)
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to update item' })
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  const deleteItem = async (itemId: string) => {
    const result = await deletePackingListItemAction(itemId)
    if (result.success) {
      setItems(prev => prev.filter(i => i.id !== itemId))
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to delete item' })
    }
  }

  const togglePacked = async (item: PackingListItemRow) => {
    const result = await togglePackedAction(item.id, !item.packed)
    if (result.success && result.item) {
      setItems(prev => prev.map(i => i.id === item.id ? result.item! : i))
    }
  }

  const exportCSV = () => {
    const header = 'Category,Item,Priority,Packed,Notes'
    const rows = items.map(i =>
      [i.category, i.item, PRIORITY_LABELS[i.priority] || i.priority, i.packed ? 'Yes' : 'No', i.notes || '']
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
  const filteredItems = priorityFilter === 'all'
    ? items
    : items.filter(i => i.priority === priorityFilter)

  // Group filtered items by category, preserving PACKING_CATEGORIES order
  const grouped = filteredItems.reduce<Record<string, PackingListItemRow[]>>((acc, item) => {
    const cat = item.category || 'Uncategorized'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  // Sort categories: known categories first in order, then unknowns alphabetically
  const sortedCategories = Object.keys(grouped).sort((a, b) => {
    const idxA = (PACKING_CATEGORIES as readonly string[]).indexOf(a)
    const idxB = (PACKING_CATEGORIES as readonly string[]).indexOf(b)
    if (idxA >= 0 && idxB >= 0) return idxA - idxB
    if (idxA >= 0) return -1
    if (idxB >= 0) return 1
    return a.localeCompare(b)
  })

  const totalItems = items.length
  const packedItems = items.filter(i => i.packed).length
  const mustItems = items.filter(i => i.priority === 'must')
  const mustPacked = mustItems.filter(i => i.packed).length

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
    <div className="space-y-6">
      {message && (
        <Alert variant={message.type === 'success' ? 'success' : 'error'}>
          {message.text}
        </Alert>
      )}

      {/* Header + Controls */}
      <Card className="border-2 border-yellow-300">
        <CardHeader>
          <CardTitle>🎒 My Packing List</CardTitle>
          <CardDescription>
            {items.length === 0
              ? 'Load the curated NYC Deli Rats camp packing guide, then customize it for your burn. Remove what you don\'t need, add your own items, and check things off as you pack!'
              : 'Check off items as you pack. Edit, add, or remove anything. Export when ready.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {totalItems > 0 && (
            <div className="space-y-3">
              {/* Overall progress */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-600">
                    {packedItems} of {totalItems} items packed
                  </span>
                  <span className="text-sm font-bold">
                    {Math.round((packedItems / totalItems) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 border border-black">
                  <div
                    className="bg-yellow-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${(packedItems / totalItems) * 100}%` }}
                  />
                </div>
              </div>
              {/* Essentials progress */}
              {mustItems.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-red-600">
                      Essentials: {mustPacked} of {mustItems.length}
                    </span>
                    <span className="text-xs font-bold text-red-600">
                      {Math.round((mustPacked / mustItems.length) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-red-100 rounded-full h-2 border border-red-200">
                    <div
                      className="bg-red-400 h-full rounded-full transition-all duration-300"
                      style={{ width: `${(mustPacked / mustItems.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
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
              <Button
                onClick={loadBaseList}
                disabled={populating}
                variant="secondary"
                className="text-sm"
              >
                {populating ? '⏳ Resetting...' : '🔄 Reset to Base List'}
              </Button>
              <Button onClick={exportCSV} variant="secondary" className="text-sm">
                📥 Export CSV
              </Button>
            </>
          )}
        </CardFooter>
      </Card>

      {items.length > 0 && populating && (
        <Alert variant="warning">
          Resetting will replace your current list with the base camp guide. Custom items and edits will be lost.
        </Alert>
      )}

      {items.length > 0 && (
        <>
          {/* Priority Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Filter:</span>
            {(['all', 'must', 'nice', 'optional'] as PriorityFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setPriorityFilter(f)}
                className={`px-3 py-1 text-xs font-bold border-2 rounded-full transition-colors ${
                  priorityFilter === f
                    ? 'bg-black text-white border-black'
                    : f === 'must' ? 'border-red-300 text-red-700 hover:bg-red-50'
                    : f === 'nice' ? 'border-blue-300 text-blue-700 hover:bg-blue-50'
                    : f === 'optional' ? 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {f === 'all' ? `All (${items.length})` :
                 f === 'must' ? `Essential (${items.filter(i => i.priority === 'must').length})` :
                 f === 'nice' ? `Recommended (${items.filter(i => i.priority === 'nice').length})` :
                 `Optional (${items.filter(i => i.priority === 'optional').length})`}
              </button>
            ))}
          </div>

          {/* Add Item Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add Item</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  placeholder="Item name"
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addItem() }}
                  className="flex-1"
                />
                <Input
                  placeholder="Category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addItem() }}
                  className="sm:w-44"
                />
                <Select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as 'must' | 'nice' | 'optional')}
                  options={[
                    { value: 'must', label: 'Essential' },
                    { value: 'nice', label: 'Recommended' },
                    { value: 'optional', label: 'Optional' },
                  ]}
                  className="sm:w-36"
                />
                <Button onClick={addItem} disabled={adding || !newItem.trim()}>
                  {adding ? '...' : '+ Add'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Packing List by Category */}
      {sortedCategories.map(category => {
        const categoryItems = grouped[category]
        return (
          <Card key={category}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{category}</CardTitle>
                <Badge variant={
                  categoryItems.every(i => i.packed) ? 'success' :
                  categoryItems.some(i => i.packed) ? 'warning' : 'default'
                }>
                  {categoryItems.filter(i => i.packed).length}/{categoryItems.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="divide-y divide-gray-100">
                {categoryItems.map(item => (
                  <li key={item.id} className="py-2">
                    {editingId === item.id ? (
                      /* Edit mode */
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            value={editItem}
                            onChange={(e) => setEditItem(e.target.value)}
                            placeholder="Item name"
                            className="flex-1"
                          />
                          <Input
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            placeholder="Category"
                            className="w-36"
                          />
                          <Select
                            value={editPriority}
                            onChange={(e) => setEditPriority(e.target.value as 'must' | 'nice' | 'optional')}
                            options={[
                              { value: 'must', label: 'Essential' },
                              { value: 'nice', label: 'Recommended' },
                              { value: 'optional', label: 'Optional' },
                            ]}
                            className="w-36"
                          />
                        </div>
                        <Input
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="Notes (optional)"
                        />
                        <div className="flex gap-2">
                          <Button onClick={saveEdit} className="text-xs px-3 py-1">
                            Save
                          </Button>
                          <Button onClick={cancelEdit} variant="secondary" className="text-xs px-3 py-1">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* Display mode */
                      <div className="flex items-center gap-3 group">
                        <button
                          onClick={() => togglePacked(item)}
                          className={`flex-shrink-0 w-5 h-5 border-2 rounded transition-colors ${
                            item.packed
                              ? 'bg-green-500 border-green-600 text-white'
                              : 'border-gray-300 hover:border-yellow-400'
                          }`}
                          aria-label={item.packed ? 'Mark as not packed' : 'Mark as packed'}
                        >
                          {item.packed && (
                            <svg className="w-full h-full" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={item.packed ? 'line-through text-gray-400' : ''}>
                              {item.item}
                            </span>
                            <span className={`inline-flex text-[10px] font-bold px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.must}`}>
                              {PRIORITY_LABELS[item.priority] || 'Essential'}
                            </span>
                          </div>
                          {item.notes && (
                            <p className="text-xs text-gray-400 mt-0.5">{item.notes}</p>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button
                            onClick={() => startEdit(item)}
                            className="text-xs px-2 py-1 text-gray-500 hover:text-black hover:bg-gray-100 rounded"
                            aria-label="Edit item"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="text-xs px-2 py-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                            aria-label="Delete item"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )
      })}

      {items.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-4xl mb-4">🎒</p>
            <p className="text-gray-600 text-lg font-bold mb-2">Ready to start packing?</p>
            <p className="text-gray-400 text-sm max-w-md mx-auto">
              Load the curated camp packing guide with {BASE_PACKING_LIST.length} items across {PACKING_CATEGORIES.length} categories.
              Each item is tagged as Essential, Recommended, or Optional. Customize it to fit your burn!
            </p>
          </CardContent>
        </Card>
      )}

      {filteredItems.length === 0 && items.length > 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-400">No items match the current filter.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
