'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
  Badge, Alert, Button, Input, Textarea
} from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate } from '@/lib/utils'
import { getAllDraftShiftCategories, applyDraftOverrides, isCategoryDeleted, getPositionOverride, type DraftShiftCategory, type DraftShiftPosition, type ShiftOverrides } from '@/lib/shift-draft'
import { withOpsScope } from '@/lib/active-event'
import type { SystemSetting, KitchenShift, ScheduleAssignment } from '@/types/database'

export default function AdminKitchenShiftsPage() {
  const [shifts, setShifts] = useState<KitchenShift[]>([])
  const [assignments, setAssignments] = useState<ScheduleAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [shiftCategories, setShiftCategories] = useState<DraftShiftCategory[]>([])
  const [rawCategories, setRawCategories] = useState<DraftShiftCategory[]>([])
  const [shiftOverrides, setShiftOverrides] = useState<ShiftOverrides>({})
  const [showDeleted, setShowDeleted] = useState(false)
  const [editingPosition, setEditingPosition] = useState<{ pos: DraftShiftPosition; catIdx: number; posIdx: number } | null>(null)
  const [editForm, setEditForm] = useState<{ role: string; time: string; description: string }>({ role: '', time: '', description: '' })

  const fetchData = useCallback(async () => {
    const supabase = createClient()

    const [settingsRes, shiftsRes, assignmentsRes] = await Promise.all([
      supabase.from('system_settings').select('*').order('key'),
      withOpsScope(supabase.from('kitchen_shifts').select('*').order('date')),
      supabase.from('schedule_assignments').select('*'),
    ])

    const allSettings = (settingsRes.data || []) as SystemSetting[]
    setShifts(shiftsRes.data || [])
    setAssignments(assignmentsRes.data || [])

    const baseCategories = getAllDraftShiftCategories()
    setRawCategories(baseCategories)
    const overrideSetting = allSettings.find(s => s.key === 'shift_position_overrides')
    let parsedOverrides: ShiftOverrides = {}
    if (overrideSetting) {
      try {
        parsedOverrides = JSON.parse(overrideSetting.value) as ShiftOverrides
      } catch { /* ignore malformed overrides */ }
    }
    setShiftOverrides(parsedOverrides)
    setShiftCategories(applyDraftOverrides(baseCategories, parsedOverrides, 'deli'))
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🍳</div>
          <p className="font-bold uppercase tracking-wider">Loading Kitchen Shifts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/admin" className="text-sm font-bold uppercase tracking-wider underline">← Admin</Link>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-wider mt-2">Kitchen Shift Builder</h1>
            <p className="text-gray-600">
              View and edit all kitchen shift positions, times, and roles. Changes here affect the draft board.
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showDeleted}
                onChange={(e) => setShowDeleted(e.target.checked)}
                className="rounded"
              />
              <span className="text-gray-500">Show Deleted</span>
            </label>
            <Link href="/admin/shift-draft">
              <Button>🎯 Go to Shift Draft</Button>
            </Link>
          </div>
        </div>

        {message && (
          <Alert variant={message.type === 'success' ? 'success' : 'error'}>
            {message.text}
            <button className="ml-4 underline" onClick={() => setMessage(null)}>Dismiss</button>
          </Alert>
        )}

        {/* Position Editor Modal */}
        {editingPosition && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full border-4 border-yellow-500">
              <CardHeader>
                <CardTitle>Edit Shift Position</CardTitle>
                <CardDescription>Category: {editingPosition.pos.category}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase">Role Name</label>
                  <Input
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase">Time</label>
                  <Input
                    value={editForm.time}
                    onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                    placeholder="e.g. 9:30AM–12:00PM"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase">Description</label>
                  <Textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={3}
                  />
                </div>
              </CardContent>
              <div className="flex gap-2 p-4 border-t-2 border-gray-200">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setEditingPosition(null)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={async () => {
                    const { updateShiftPositionAction } = await import('@/app/actions/admin')
                    const result = await updateShiftPositionAction(`deli-${editingPosition.catIdx}-${editingPosition.posIdx}`, {
                      role: editForm.role,
                      time: editForm.time,
                      description: editForm.description,
                      category: editingPosition.pos.category,
                    })
                    if (result.success) {
                      setMessage({ type: 'success', text: `Updated position: ${editForm.role}` })
                      setEditingPosition(null)
                      fetchData()
                    } else {
                      setMessage({ type: 'error', text: result.error || 'Update failed' })
                    }
                  }}
                >
                  Save Changes
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Shift Categories Grid */}
        {(showDeleted ? rawCategories : shiftCategories).map((cat, displayIdx) => {
          const rawCatIdx = rawCategories.indexOf(cat) !== -1 ? rawCategories.indexOf(cat) : displayIdx
          const catIsDeleted = isCategoryDeleted(shiftOverrides, `deli-${rawCatIdx}`)

          if (catIsDeleted && !showDeleted) return null

          return (
          <Card key={rawCatIdx} className={catIsDeleted ? 'opacity-50 border-red-300 border-2' : ''}>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">{cat.name}</CardTitle>
                  {catIsDeleted && <Badge variant="error">DELETED</Badge>}
                </div>
                <div className="flex gap-2 items-center">
                  {cat.time && <Badge variant="info">{cat.time}</Badge>}
                  {cat.note && <Badge variant="default">{cat.note}</Badge>}
                  <Badge variant="success">{cat.positions.length} positions</Badge>
                  {catIsDeleted ? (
                    <button
                      className="text-xs text-green-600 hover:text-green-800 underline font-bold"
                      onClick={async () => {
                        const { restoreShiftCategoryAction } = await import('@/app/actions/admin')
                        const result = await restoreShiftCategoryAction(`deli-${rawCatIdx}`)
                        if (result.success) {
                          setMessage({ type: 'success', text: `Restored category: ${cat.name}` })
                          fetchData()
                        } else {
                          setMessage({ type: 'error', text: result.error || 'Restore failed' })
                        }
                      }}
                    >
                      Restore
                    </button>
                  ) : (
                    <button
                      className="text-xs text-red-600 hover:text-red-800 underline font-bold"
                      onClick={async () => {
                        if (!confirm(`Delete the entire "${cat.name}" section? This will remove all ${cat.positions.length} positions from the kitchen, draft, and schedule pages.`)) return
                        const { deleteShiftCategoryAction } = await import('@/app/actions/admin')
                        const result = await deleteShiftCategoryAction(`deli-${rawCatIdx}`)
                        if (result.success) {
                          setMessage({ type: 'success', text: `Deleted section: ${cat.name}` })
                          fetchData()
                        } else {
                          setMessage({ type: 'error', text: result.error || 'Delete failed' })
                        }
                      }}
                    >
                      Delete Section
                    </button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-200 bg-gray-50">
                      <th className="text-left p-2 pl-4 font-bold uppercase tracking-wider text-xs">#</th>
                      <th className="text-left p-2 font-bold uppercase tracking-wider text-xs">Role</th>
                      <th className="text-left p-2 font-bold uppercase tracking-wider text-xs">Time</th>
                      <th className="text-left p-2 font-bold uppercase tracking-wider text-xs hidden md:table-cell">Description</th>
                      <th className="text-left p-2 font-bold uppercase tracking-wider text-xs">Tags</th>
                      <th className="text-left p-2 pr-4 font-bold uppercase tracking-wider text-xs">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cat.positions.map((pos, posIdx) => {
                      const posKey = `deli-${rawCatIdx}-${posIdx}`
                      const posOverride = getPositionOverride(shiftOverrides, posKey)
                      const posIsDeleted = posOverride?.deleted === true

                      if (posIsDeleted && !showDeleted) return null

                      return (
                      <tr key={pos.id} className={cn(
                        "border-b border-gray-100",
                        posIsDeleted ? "bg-red-50 opacity-60" : "hover:bg-yellow-50"
                      )}>
                        <td className="p-2 pl-4 text-gray-400 font-mono text-xs">{posIdx + 1}</td>
                        <td className={cn("p-2 font-medium", posIsDeleted && "line-through")}>{pos.role}</td>
                        <td className="p-2 text-gray-600 text-xs whitespace-nowrap">{pos.time || cat.time || '—'}</td>
                        <td className="p-2 text-gray-500 text-xs hidden md:table-cell max-w-xs truncate">{pos.description || '—'}</td>
                        <td className="p-2">
                          <div className="flex gap-1">
                            {pos.requiresExp && <Badge variant="warning" className="text-[10px] py-0 px-1">EXP</Badge>}
                            {pos.countsDouble && <Badge variant="info" className="text-[10px] py-0 px-1">2×</Badge>}
                            {posIsDeleted && <Badge variant="error" className="text-[10px] py-0 px-1">DELETED</Badge>}
                          </div>
                        </td>
                        <td className="p-2 pr-4">
                          <div className="flex gap-2">
                            {posIsDeleted ? (
                              <button
                                className="text-xs text-green-600 hover:text-green-800 underline font-medium"
                                onClick={async () => {
                                  const { restoreShiftPositionAction } = await import('@/app/actions/admin')
                                  const result = await restoreShiftPositionAction(posKey)
                                  if (result.success) {
                                    setMessage({ type: 'success', text: `Restored: ${pos.role}` })
                                    fetchData()
                                  } else {
                                    setMessage({ type: 'error', text: result.error || 'Restore failed' })
                                  }
                                }}
                              >
                                Restore
                              </button>
                            ) : (
                              <>
                                <button
                                  className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                                  onClick={() => {
                                    setEditingPosition({ pos, catIdx: rawCatIdx, posIdx })
                                    setEditForm({
                                      role: pos.role,
                                      time: pos.time || '',
                                      description: pos.description || '',
                                    })
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  className="text-xs text-red-600 hover:text-red-800 underline font-medium"
                                  onClick={async () => {
                                    if (!confirm(`Delete "${pos.role}" position? It will be removed from all shift pages.`)) return
                                    const { deleteShiftPositionAction } = await import('@/app/actions/admin')
                                    const result = await deleteShiftPositionAction(posKey)
                                    if (result.success) {
                                      setMessage({ type: 'success', text: `Deleted: ${pos.role}` })
                                      fetchData()
                                    } else {
                                      setMessage({ type: 'error', text: result.error || 'Delete failed' })
                                    }
                                  }}
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          )
        })}

        {/* Current DB Shifts */}
        <Card>
          <CardHeader>
            <CardTitle>Database Shifts ({shifts.length})</CardTitle>
            <CardDescription>
              Shifts stored in the kitchen_shifts table (used by the legacy schedule system).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {shifts.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No shifts in database. The draft system uses the shift positions above.</p>
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
