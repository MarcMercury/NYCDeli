'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { 
  Card, CardHeader, CardTitle, CardDescription, CardContent,
  Badge, Alert, Button, Input, Tabs, TabPanel, Textarea
} from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate } from '@/lib/utils'
import { getAllDraftShiftCategories, applyDraftOverrides, isCategoryDeleted, getPositionOverride, type DraftShiftCategory, type DraftShiftPosition, type ShiftOverrides } from '@/lib/shift-draft'
import { withOpsScope } from '@/lib/active-event'
import { fetchDeliSummary, type DeliSummary } from '@/lib/events'
import type { SystemSetting, KitchenShift, ScheduleAssignment } from '@/types/database'

type Tab = { id: string; label: string }

const tabs: Tab[] = [{ id: 'kitchen-shifts', label: 'Kitchen Shifts' }]

function SummaryStat({ value, label, hint }: { value: ReactNode; label: string; hint: string }) {
  return (
    <Card>
      <CardContent className="py-4 text-center">
        <p className="text-3xl font-black">{value}</p>
        <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
        <p className="text-[11px] text-gray-400 truncate" title={hint}>{hint}</p>
      </CardContent>
    </Card>
  )
}

/** Admin tools grouped by the job being done, not by when they were built. */
const ADMIN_GROUPS: {
  title: string
  blurb: string
  links: { href: string; icon: string; label: string; hint: string }[]
}[] = [
  {
    title: 'Run the Event',
    blurb: 'lifecycle, applications and crews',
    links: [
      { href: '/admin/events', icon: '🎪', label: 'Events', hint: 'Stages, modules, roster' },
      { href: '/admin/people', icon: '🗂️', label: 'People & Users', hint: 'Directory, access, approvals' },
      { href: '/admin/shift-draft', icon: '🎯', label: 'Shift Draft', hint: 'Rank, draft, publish' },
      { href: '/events?view=calendar', icon: '🗓️', label: 'Camp Calendar', hint: 'Meetings & deadlines' },
    ],
  },
  {
    title: 'People',
    blurb: 'the permanent record',
    links: [
      { href: '/admin/ideas', icon: '💡', label: 'Forum', hint: 'Ideas & questions' },
    ],
  },
  {
    title: 'Camp Assets & Setup',
    blurb: 'what gets built and what the public sees',
    links: [
      { href: '/admin/layout-builder', icon: '🗺️', label: 'Layout Builder', hint: 'Place everything' },
      { href: '/admin/staking-plan', icon: '🚩', label: 'Staking Plan', hint: 'Print for the field' },
      { href: '/admin/tent-map', icon: '⛺', label: 'Tent Map', hint: 'Who sleeps where' },
      { href: '/admin/home', icon: '🏠', label: 'Home Page', hint: 'Public CTAs' },
    ],
  },
]

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('kitchen-shifts')
  const [shifts, setShifts] = useState<KitchenShift[]>([])
  const [assignments, setAssignments] = useState<ScheduleAssignment[]>([])
  const [summary, setSummary] = useState<DeliSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchErrors, setFetchErrors] = useState<Record<string, string>>({})
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  // Kitchen shift editor state
  const [shiftCategories, setShiftCategories] = useState<DraftShiftCategory[]>([])
  const [rawCategories, setRawCategories] = useState<DraftShiftCategory[]>([])
  const [shiftOverrides, setShiftOverrides] = useState<ShiftOverrides>({})
  const [showDeleted, setShowDeleted] = useState(false)
  const [editingPosition, setEditingPosition] = useState<{ pos: DraftShiftPosition; catIdx: number; posIdx: number } | null>(null)
  const [editForm, setEditForm] = useState<{ role: string; time: string; description: string }>({ role: '', time: '', description: '' })

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const errors: Record<string, string> = {}
    
    const [settingsRes, shiftsRes, assignmentsRes, summaryData] = await Promise.all([
      supabase.from('system_settings').select('*').order('key'),
      withOpsScope(supabase.from('kitchen_shifts').select('*').order('date')),
      supabase.from('schedule_assignments').select('*'),
      fetchDeliSummary(supabase).catch(() => null),
    ])

    if (settingsRes.error) errors.settings = settingsRes.error.message
    if (shiftsRes.error) errors.shifts = shiftsRes.error.message
    if (assignmentsRes.error) errors.assignments = assignmentsRes.error.message
    if (!summaryData) errors.summary = 'Could not load the Deli summary'

    const allSettings = (settingsRes.data || []) as SystemSetting[]
    setShifts(shiftsRes.data || [])
    setAssignments(assignmentsRes.data || [])
    setSummary(summaryData)

    // Load shift categories with any admin overrides applied
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
    setFetchErrors(errors)
    setLastRefreshed(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
     
    fetchData()
  }, [fetchData])

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

        {/* Data Connection Status */}
        {Object.keys(fetchErrors).length > 0 && (
          <Alert variant="error" className="mb-4">
            <strong>Data fetch errors:</strong>{' '}
            {Object.entries(fetchErrors).map(([key, msg]) => (
              <span key={key} className="block text-sm">
                {key}: {msg}
              </span>
            ))}
            <button className="ml-2 underline" onClick={() => fetchData()}>Retry</button>
          </Alert>
        )}

        {/* Deli Summary */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full ${Object.keys(fetchErrors).length === 0 ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-500 uppercase tracking-wider">
              Deli Summary{Object.keys(fetchErrors).length > 0 && ' — Partial Data'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {lastRefreshed && (
              <span className="text-xs text-gray-400">
                Updated {lastRefreshed.toLocaleTimeString()}
              </span>
            )}
            <button
              className="text-xs underline text-gray-500 hover:text-black"
              onClick={() => fetchData()}
            >
              Refresh
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <SummaryStat
            value={summary?.totalCampers ?? '⚠'}
            label="Total Campers"
            hint="Every event, all time"
          />
          <SummaryStat
            value={summary ? summary.activeEventCampers : '⚠'}
            label="Campers On-Event"
            hint={summary?.activeEvent?.name ?? 'No event running'}
          />
          <SummaryStat
            value={summary ? summary.openEventApplications : '⚠'}
            label="Applications"
            hint={summary?.openEvent?.name ?? 'Applications closed'}
          />
          <SummaryStat
            value={summary?.daysUntilNextApplicationEvent ?? '—'}
            label="Days To Next Event"
            hint={summary?.nextApplicationEvent?.name ?? 'Nothing needing applicants'}
          />
        </div>

        <div className="space-y-6 mb-8">
          {ADMIN_GROUPS.map(group => (
            <section key={group.title}>
              <h2 className="text-sm font-black uppercase tracking-[0.2em] border-b-2 border-black pb-1 mb-3">
                {group.title}
                <span className="ml-2 font-bold normal-case tracking-normal text-gray-500">{group.blurb}</span>
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {group.links.map(link => (
                  <Link key={link.href} href={link.href} className="block">
                    <Card className="hover:border-yellow-500 transition-colors h-full">
                      <CardContent className="py-4 text-center">
                        <p className="text-3xl font-black">{link.icon}</p>
                        <p className="text-xs uppercase tracking-wider text-yellow-700 font-bold">{link.label}</p>
                        <p className="text-[11px] text-gray-500 mt-1">{link.hint}</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Tabs */}
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {/* Kitchen Shifts Tab */}
        <TabPanel tabId="kitchen-shifts" activeTab={activeTab}>
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black uppercase tracking-wider">Kitchen Shift Builder</h2>
                <p className="text-sm text-gray-600">
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
              // Find the original index in rawCategories for override keys
              const rawCatIdx = rawCategories.indexOf(cat) !== -1 ? rawCategories.indexOf(cat) : displayIdx
              const catIsDeleted = isCategoryDeleted(shiftOverrides, `deli-${rawCatIdx}`)
              
              // Skip deleted categories when not showing deleted
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
        </TabPanel>
      </div>
    </div>
  )
}
