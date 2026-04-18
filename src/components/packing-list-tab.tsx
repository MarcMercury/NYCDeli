'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Button, Input, Alert, Badge } from '@/components/ui'
import {
  getPackingListAction,
  addPackingListItemAction,
  updatePackingListItemAction,
  deletePackingListItemAction,
  bulkInsertPackingListAction,
  togglePackedAction,
} from '@/app/actions/packing-list'
import type { PackingListItemRow, CamperRow } from '@/types/database'

interface PackingListTabProps {
  camper: CamperRow
}

export default function PackingListTab({ camper }: PackingListTabProps) {
  const [items, setItems] = useState<PackingListItemRow[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Add item form
  const [newItem, setNewItem] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [adding, setAdding] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editItem, setEditItem] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editNotes, setEditNotes] = useState('')

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

  const generateAIList = async () => {
    setGenerating(true)
    setMessage(null)
    try {
      const res = await fetch('/api/ai/packing-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ camper }),
      })
      const data = await res.json()
      if (res.ok && data.items && data.items.length > 0) {
        const result = await bulkInsertPackingListAction(camper.id, data.items)
        if (result.success && result.items) {
          setItems(result.items)
          setMessage({ type: 'success', text: `Generated ${result.items.length} items! You can now edit, add, or remove items.` })
        } else {
          setMessage({ type: 'error', text: result.error || 'Failed to save packing list' })
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to generate packing list' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error generating packing list' })
    }
    setGenerating(false)
  }

  const addItem = async () => {
    if (!newItem.trim()) return
    setAdding(true)
    const result = await addPackingListItemAction({
      camper_id: camper.id,
      item: newItem.trim(),
      category: newCategory.trim() || 'Uncategorized',
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
  }

  const saveEdit = async () => {
    if (!editingId || !editItem.trim()) return
    const result = await updatePackingListItemAction(editingId, {
      item: editItem.trim(),
      category: editCategory.trim() || 'Uncategorized',
      notes: editNotes.trim() || null,
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
    const header = 'Category,Item,Packed,Notes'
    const rows = items.map(i =>
      [i.category, i.item, i.packed ? 'Yes' : 'No', i.notes || '']
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

  // Group items by category
  const grouped = items.reduce<Record<string, PackingListItemRow[]>>((acc, item) => {
    const cat = item.category || 'Uncategorized'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  const totalItems = items.length
  const packedItems = items.filter(i => i.packed).length

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

      {/* AI Generate + Export Controls */}
      <Card className="border-2 border-purple-200">
        <CardHeader>
          <CardTitle>🎒 My Packing List</CardTitle>
          <CardDescription>
            Generate a personalized packing list with AI, then customize it. Check off items as you pack!
          </CardDescription>
        </CardHeader>
        <CardContent>
          {totalItems > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">
                  {packedItems} of {totalItems} items packed
                </span>
                <span className="text-sm font-bold">
                  {totalItems > 0 ? Math.round((packedItems / totalItems) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 border border-black">
                <div
                  className="bg-yellow-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${totalItems > 0 ? (packedItems / totalItems) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <Button
            onClick={generateAIList}
            disabled={generating}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {generating ? '⏳ Generating...' : items.length > 0 ? '🔄 Regenerate with AI' : '✨ Generate My Packing List'}
          </Button>
          {items.length > 0 && (
            <Button onClick={exportCSV} variant="secondary">
              📥 Export CSV
            </Button>
          )}
        </CardFooter>
      </Card>

      {items.length > 0 && generating && (
        <Alert variant="warning">
          Regenerating will replace your current list. Any edits will be lost.
        </Alert>
      )}

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
              placeholder="Category (optional)"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addItem() }}
              className="sm:w-48"
            />
            <Button onClick={addItem} disabled={adding || !newItem.trim()}>
              {adding ? '...' : '+ Add'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Packing List by Category */}
      {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([category, categoryItems]) => (
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
                          className="w-40"
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
                        <span className={item.packed ? 'line-through text-gray-400' : ''}>
                          {item.item}
                        </span>
                        {item.notes && (
                          <p className="text-xs text-gray-400 truncate">{item.notes}</p>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
      ))}

      {items.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-400 text-lg mb-2">No packing list yet</p>
            <p className="text-gray-400 text-sm">
              Click &quot;Generate My Packing List&quot; above to get a personalized AI-generated list,
              or add items manually.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
