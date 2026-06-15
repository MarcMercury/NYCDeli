'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
  Badge, Alert, Button, Input,
} from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type {
  Camper,
  ShiftDraftRow,
  ShiftDraftOrderWithCamper,
  ShiftOfferingRow,
  ShiftDraftRankingRow,
  ShiftDraftAssignmentRow,
} from '@/types/database'
import {
  fetchAllDrafts,
  fetchDraft,
  fetchOfferings,
  fetchDraftOrder,
  fetchAllRankings,
  fetchAssignments,
  createDraft,
  updateDraftSettings,
  deleteDraft,
  seedDefaultOfferings,
  setDraftOrder,
  freezeDraftRankings,
  unfreezeDraftRankings,
  publishDraft,
  runAutoDraft,
  swapAssignments,
  type AutoDraftResult,
} from '@/lib/shift-draft'
import { OfferingsEditor } from './offerings-editor'

export default function AdminShiftDraftPage() {
  const supabase = createClient()

  const [drafts, setDrafts] = useState<ShiftDraftRow[]>([])
  const [activeDraft, setActiveDraft] = useState<ShiftDraftRow | null>(null)
  const [campers, setCampers] = useState<Camper[]>([])
  const [offerings, setOfferings] = useState<ShiftOfferingRow[]>([])
  const [order, setOrderState] = useState<ShiftDraftOrderWithCamper[]>([])
  const [rankings, setRankings] = useState<ShiftDraftRankingRow[]>([])
  const [assignments, setAssignments] = useState<ShiftDraftAssignmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

  // Create-draft form
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('Shift Draft 2026')
  const [newDeli, setNewDeli] = useState(4)
  const [newSpecial, setNewSpecial] = useState(0)
  const [newStrike, setNewStrike] = useState(1)
  const [newSnake, setNewSnake] = useState(3)

  // Order builder
  const [orderList, setOrderListState] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const dragItem = useRef<number | null>(null)
  const dragOver = useRef<number | null>(null)

  // Auto-draft preview
  const [seedInput, setSeedInput] = useState<string>('')
  const [preview, setPreview] = useState<AutoDraftResult | null>(null)

  // Offerings editor
  const [showOfferingsEditor, setShowOfferingsEditor] = useState(false)

  // Assignment swapping
  const [swapSelected, setSwapSelected] = useState<string[]>([])

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [list, { data: camperData }] = await Promise.all([
        fetchAllDrafts(),
        supabase.from('campers').select('*').order('full_name'),
      ])
      setDrafts(list)
      setCampers((camperData ?? []) as Camper[])
      const current = list.find(d => d.status !== 'archived') ?? list[0] ?? null
      if (current) {
        await loadDraftDetails(current.id)
      } else {
        setActiveDraft(null)
        setOfferings([])
        setOrderState([])
        setRankings([])
        setAssignments([])
      }
    } catch (e) {
      setMsg({ type: 'error', text: e instanceof Error ? e.message : 'Load failed' })
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadDraftDetails = useCallback(async (draftId: string) => {
    const [draft, ofs, ord, rks, asgs] = await Promise.all([
      fetchDraft(draftId),
      fetchOfferings(draftId),
      fetchDraftOrder(draftId),
      fetchAllRankings(draftId),
      fetchAssignments(draftId),
    ])
    setActiveDraft(draft)
    setOfferings(ofs)
    setOrderState(ord)
    setRankings(rks)
    setAssignments(asgs)
    setOrderListState(ord.map(o => o.camper_id))
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // ===== Create draft =====
  const handleCreate = async () => {
    setBusy('create')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')
      const d = await createDraft({
        name: newName,
        deli_quota: newDeli,
        special_quota: newSpecial,
        strike_quota: newStrike,
        snake_start_round: newSnake,
        created_by: user.id,
      })
      setMsg({ type: 'success', text: `Created draft "${d.name}".` })
      setShowCreate(false)
      await loadAll()
      await loadDraftDetails(d.id)
    } catch (e) {
      setMsg({ type: 'error', text: e instanceof Error ? e.message : 'Create failed' })
    } finally {
      setBusy(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this draft and all its rankings/assignments?')) return
    setBusy('delete')
    try {
      await deleteDraft(id)
      setMsg({ type: 'success', text: 'Draft deleted.' })
      await loadAll()
    } catch (e) {
      setMsg({ type: 'error', text: e instanceof Error ? e.message : 'Delete failed' })
    } finally {
      setBusy(null)
    }
  }

  const handleSeedDefaults = async () => {
    if (!activeDraft) return
    setBusy('seed')
    try {
      const n = await seedDefaultOfferings(activeDraft.id)
      setMsg({ type: 'success', text: `Seeded ${n} new offerings.` })
      await loadDraftDetails(activeDraft.id)
    } catch (e) {
      setMsg({ type: 'error', text: e instanceof Error ? e.message : 'Seed failed' })
    } finally {
      setBusy(null)
    }
  }

  const handleSaveSettings = async () => {
    if (!activeDraft) return
    setBusy('settings')
    try {
      await updateDraftSettings(activeDraft.id, {
        name: activeDraft.name,
        deli_quota: activeDraft.deli_quota,
        special_quota: activeDraft.special_quota,
        strike_quota: activeDraft.strike_quota,
        snake_start_round: activeDraft.snake_start_round,
      })
      setMsg({ type: 'success', text: 'Settings saved.' })
    } catch (e) {
      setMsg({ type: 'error', text: e instanceof Error ? e.message : 'Save failed' })
    } finally {
      setBusy(null)
    }
  }

  // ===== Order =====
  const addToOrder = (id: string) => {
    if (orderList.includes(id)) return
    setOrderListState([...orderList, id])
  }
  const removeFromOrder = (id: string) => setOrderListState(orderList.filter(x => x !== id))
  const handleSaveOrder = async () => {
    if (!activeDraft) return
    setBusy('order')
    try {
      await setDraftOrder(activeDraft.id, orderList)
      setMsg({ type: 'success', text: `Saved order (${orderList.length} campers).` })
      await loadDraftDetails(activeDraft.id)
    } catch (e) {
      setMsg({ type: 'error', text: e instanceof Error ? e.message : 'Save failed' })
    } finally {
      setBusy(null)
    }
  }

  const handleDragStart = (i: number) => { dragItem.current = i }
  const handleDragEnter = (i: number) => { dragOver.current = i }
  const handleDragEnd = () => {
    if (dragItem.current === null || dragOver.current === null) return
    const next = [...orderList]
    const [moved] = next.splice(dragItem.current, 1)
    next.splice(dragOver.current, 0, moved)
    setOrderListState(next)
    dragItem.current = null
    dragOver.current = null
  }

  // ===== Freeze / publish / draft =====
  const handleFreeze = async () => {
    if (!activeDraft) return
    setBusy('freeze')
    try {
      await freezeDraftRankings(activeDraft.id)
      setMsg({ type: 'success', text: 'Rankings frozen.' })
      await loadDraftDetails(activeDraft.id)
    } catch (e) {
      setMsg({ type: 'error', text: e instanceof Error ? e.message : 'Freeze failed' })
    } finally {
      setBusy(null)
    }
  }
  const handleUnfreeze = async () => {
    if (!activeDraft) return
    setBusy('unfreeze')
    try {
      await unfreezeDraftRankings(activeDraft.id)
      setMsg({ type: 'success', text: 'Rankings reopened.' })
      await loadDraftDetails(activeDraft.id)
    } catch (e) {
      setMsg({ type: 'error', text: e instanceof Error ? e.message : 'Unfreeze failed' })
    } finally {
      setBusy(null)
    }
  }
  const handlePublish = async () => {
    if (!activeDraft) return
    if (!confirm('Archive this draft? Campers will see it as final.')) return
    setBusy('publish')
    try {
      await publishDraft(activeDraft.id)
      setMsg({ type: 'success', text: 'Draft archived/published.' })
      await loadDraftDetails(activeDraft.id)
    } catch (e) {
      setMsg({ type: 'error', text: e instanceof Error ? e.message : 'Publish failed' })
    } finally {
      setBusy(null)
    }
  }

  const handleAutoDraft = async (dryRun: boolean) => {
    if (!activeDraft) return
    setBusy(dryRun ? 'dry' : 'commit')
    try {
      const seed = seedInput.trim() === '' ? undefined : Number(seedInput)
      const result = await runAutoDraft(activeDraft.id, { seed, dryRun })
      setPreview(result)
      // After a dry run, lock the seed into the box so that Commit reproduces
      // exactly what was previewed. Admin can clear it to reshuffle.
      if (dryRun) setSeedInput(String(result.seed))
      setMsg({
        type: 'success',
        text: dryRun
          ? `Dry run: ${result.count} assignments (seed ${result.seed}). Seed locked in — Commit will reproduce this exact result. Clear the seed to reshuffle.`
          : `Auto-draft committed: ${result.count} assignments (seed ${result.seed}).`,
      })
      if (!dryRun) await loadDraftDetails(activeDraft.id)
    } catch (e) {
      setMsg({ type: 'error', text: e instanceof Error ? e.message : 'Auto-draft failed' })
    } finally {
      setBusy(null)
    }
  }

  // ===== Manual assignment swap =====
  const toggleSwapSelect = (assignmentId: string) => {
    setSwapSelected(prev => {
      if (prev.includes(assignmentId)) return prev.filter(x => x !== assignmentId)
      if (prev.length >= 2) return [prev[1], assignmentId] // keep most recent two
      return [...prev, assignmentId]
    })
  }

  const handleSwap = async () => {
    if (swapSelected.length !== 2 || !activeDraft) return
    setBusy('swap')
    try {
      await swapAssignments(swapSelected[0], swapSelected[1])
      setMsg({ type: 'success', text: 'Swapped the two campers’ shifts.' })
      setSwapSelected([])
      await loadDraftDetails(activeDraft.id)
    } catch (e) {
      setMsg({ type: 'error', text: e instanceof Error ? e.message : 'Swap failed' })
    } finally {
      setBusy(null)
    }
  }

  // ===== Derived =====
  const status = activeDraft?.status ?? null
  const camperById = (id: string) => campers.find(c => c.id === id)
  const offeringById = (id: string) => offerings.find(o => o.id === id)

  const rankingCountByCamper = (() => {
    const m = new Map<string, number>()
    for (const r of rankings) m.set(r.camper_id, (m.get(r.camper_id) ?? 0) + 1)
    return m
  })()

  const assignmentsByCamper = (() => {
    const m = new Map<string, ShiftDraftAssignmentRow[]>()
    for (const a of assignments) {
      if (!m.has(a.camper_id)) m.set(a.camper_id, [])
      m.get(a.camper_id)!.push(a)
    }
    return m
  })()

  // Campers who ranked shifts but are NOT in the draft order — these would be
  // silently dropped by the auto-draft (it only iterates shift_draft_order).
  const orderedIds = new Set(order.map(o => o.camper_id))
  const rankedNotInOrder = Array.from(rankingCountByCamper.keys()).filter(id => !orderedIds.has(id))

  const handleAddMissingToOrder = async () => {
    if (!activeDraft || rankedNotInOrder.length === 0) return
    setBusy('order')
    try {
      const next = [...orderList, ...rankedNotInOrder.filter(id => !orderList.includes(id))]
      await setDraftOrder(activeDraft.id, next)
      setMsg({ type: 'success', text: `Added ${rankedNotInOrder.length} ranked camper(s) to the order.` })
      await loadDraftDetails(activeDraft.id)
    } catch (e) {
      setMsg({ type: 'error', text: e instanceof Error ? e.message : 'Update failed' })
    } finally {
      setBusy(null)
    }
  }

  const offeringsByPool = (() => {
    const g: Record<'deli'|'special'|'strike', ShiftOfferingRow[]> = { deli: [], special: [], strike: [] }
    for (const o of offerings) g[o.pool].push(o)
    return g
  })()

  const filteredCampers = campers.filter(c => {
    const t = searchTerm.toLowerCase()
    if (!t) return true
    return (
      c.full_name.toLowerCase().includes(t) ||
      (c.playa_name ?? '').toLowerCase().includes(t) ||
      c.email.toLowerCase().includes(t)
    )
  })

  // ===== Render =====
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🎲</div>
          <p className="font-bold uppercase tracking-wider">Loading auto-draft control panel…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-wider">Shift Auto-Draft</h1>
            <p className="text-gray-600">Ranked-preference draft engine</p>
          </div>
          <Link href="/admin" className="text-sm underline">← Admin Home</Link>
        </div>

        {msg && (
          <Alert variant={msg.type === 'success' ? 'success' : msg.type === 'info' ? 'info' : 'error'}>
            {msg.text}
            <button className="ml-3 underline" onClick={() => setMsg(null)}>Dismiss</button>
          </Alert>
        )}

        {/* Drafts list / new draft */}
        <Card>
          <CardHeader>
            <CardTitle>Drafts</CardTitle>
            <CardDescription>Select an active draft or create a new one.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {drafts.map(d => (
                <button
                  key={d.id}
                  onClick={() => loadDraftDetails(d.id)}
                  className={cn(
                    "border-2 px-3 py-1 rounded text-sm",
                    activeDraft?.id === d.id ? "border-black bg-black text-white" : "border-gray-300 hover:border-black",
                  )}
                >
                  {d.name} <Badge className="ml-2">{d.status}</Badge>
                </button>
              ))}
              <Button size="sm" onClick={() => setShowCreate(s => !s)}>
                {showCreate ? 'Cancel' : '+ New Draft'}
              </Button>
            </div>
            {showCreate && (
              <div className="border-2 border-black p-4 space-y-2">
                <Input value={newName} onChange={e => setNewName(e.currentTarget.value)} placeholder="Draft name" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <label className="text-xs">Deli quota
                    <Input type="number" min={0} value={newDeli} onChange={e => setNewDeli(parseInt(e.currentTarget.value || '0', 10))} />
                  </label>
                  <label className="text-xs">Special quota
                    <Input type="number" min={0} value={newSpecial} onChange={e => setNewSpecial(parseInt(e.currentTarget.value || '0', 10))} />
                  </label>
                  <label className="text-xs">Strike quota
                    <Input type="number" min={0} value={newStrike} onChange={e => setNewStrike(parseInt(e.currentTarget.value || '0', 10))} />
                  </label>
                  <label className="text-xs">Snake-start round
                    <Input type="number" min={1} value={newSnake} onChange={e => setNewSnake(parseInt(e.currentTarget.value || '1', 10))} />
                  </label>
                </div>
                <Button onClick={handleCreate} disabled={busy === 'create'}>Create</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {!activeDraft && (
          <Alert variant="info">No drafts exist yet — create one above.</Alert>
        )}

        {activeDraft && (
          <>
            {/* Settings + status */}
            <Card>
              <CardHeader>
                <CardTitle>Settings — {activeDraft.name}</CardTitle>
                <CardDescription>
                  Status: <Badge>{status}</Badge>
                  {activeDraft.ranking_frozen_at && <span className="ml-2 text-xs">Frozen at {new Date(activeDraft.ranking_frozen_at).toLocaleString()}</span>}
                  {activeDraft.drafted_at && <span className="ml-2 text-xs">Drafted at {new Date(activeDraft.drafted_at).toLocaleString()}</span>}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                  <label className="text-xs">Name
                    <Input value={activeDraft.name} onChange={e => setActiveDraft({ ...activeDraft, name: e.currentTarget.value })} />
                  </label>
                  <label className="text-xs">Deli quota
                    <Input type="number" min={0} value={activeDraft.deli_quota} onChange={e => setActiveDraft({ ...activeDraft, deli_quota: parseInt(e.currentTarget.value || '0', 10) })} />
                  </label>
                  <label className="text-xs">Special quota
                    <Input type="number" min={0} value={activeDraft.special_quota} onChange={e => setActiveDraft({ ...activeDraft, special_quota: parseInt(e.currentTarget.value || '0', 10) })} />
                  </label>
                  <label className="text-xs">Strike quota
                    <Input type="number" min={0} value={activeDraft.strike_quota} onChange={e => setActiveDraft({ ...activeDraft, strike_quota: parseInt(e.currentTarget.value || '0', 10) })} />
                  </label>
                  <label className="text-xs">Snake-start round
                    <Input type="number" min={1} value={activeDraft.snake_start_round} onChange={e => setActiveDraft({ ...activeDraft, snake_start_round: parseInt(e.currentTarget.value || '1', 10) })} />
                  </label>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleSaveSettings} disabled={busy === 'settings'}>Save Settings</Button>
                  <Button variant="danger" onClick={() => handleDelete(activeDraft.id)} disabled={busy === 'delete'}>Delete Draft</Button>
                </div>
              </CardContent>
            </Card>

            {/* Offerings */}
            <Card>
              <CardHeader>
                <CardTitle>Offerings ({offerings.length})</CardTitle>
                <CardDescription>The shifts campers can rank.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={handleSeedDefaults} disabled={busy === 'seed'}>
                    {offerings.length === 0 ? 'Load default catalog' : 'Re-seed missing defaults'}
                  </Button>
                  <Button variant="secondary" onClick={() => setShowOfferingsEditor(s => !s)}>
                    {showOfferingsEditor ? 'Hide editor' : 'Edit offerings'}
                  </Button>
                  <span className="text-xs text-gray-600">
                    Deli: {offeringsByPool.deli.length} · Special: {offeringsByPool.special.length} · Strike: {offeringsByPool.strike.length}
                  </span>
                </div>
                {showOfferingsEditor && (
                  <OfferingsEditor
                    draftId={activeDraft.id}
                    offerings={offerings}
                    locked={status !== 'open'}
                    lockedReason={
                      status === 'archived'
                        ? 'This draft is published/archived — offerings are read-only.'
                        : 'Rankings are frozen. Editing offerings now can invalidate camper rankings — unfreeze first.'
                    }
                    onChange={() => loadDraftDetails(activeDraft.id)}
                  />
                )}
              </CardContent>
            </Card>

            {/* Camper Draft Order */}
            <Card>
              <CardHeader>
                <CardTitle>Camper Draft Order ({orderList.length})</CardTitle>
                <CardDescription>Who picks first in each round. Drag to reorder.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Input value={searchTerm} onChange={e => setSearchTerm(e.currentTarget.value)} placeholder="Search campers…" />
                    <div className="mt-2 max-h-72 overflow-y-auto border-2 border-gray-200">
                      {filteredCampers.filter(c => !orderList.includes(c.id)).map(c => (
                        <button
                          key={c.id}
                          className="w-full text-left text-xs px-2 py-1 border-b border-gray-100 hover:bg-gray-50"
                          onClick={() => addToOrder(c.id)}
                        >
                          + {c.playa_name || c.full_name} <span className="text-gray-400">({c.email})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase font-bold mb-1">Order ({orderList.length})</p>
                    <div className="border-2 border-black max-h-72 overflow-y-auto">
                      {orderList.map((id, i) => {
                        const c = camperById(id)
                        return (
                          <div
                            key={id}
                            draggable
                            onDragStart={() => handleDragStart(i)}
                            onDragEnter={() => handleDragEnter(i)}
                            onDragEnd={handleDragEnd}
                            onDragOver={e => e.preventDefault()}
                            className="flex items-center gap-2 px-2 py-1 border-b border-gray-100 cursor-move hover:bg-gray-50"
                          >
                            <span className="font-mono text-xs w-6">{i + 1}.</span>
                            <span className="text-xs flex-1 truncate">
                              {c ? (c.playa_name || c.full_name) : id}
                            </span>
                            <button className="text-xs text-red-700" onClick={() => removeFromOrder(id)}>×</button>
                          </div>
                        )
                      })}
                      {orderList.length === 0 && <div className="p-4 text-xs text-gray-500">Empty — pick from the left.</div>}
                    </div>
                  </div>
                </div>
                <Button onClick={handleSaveOrder} disabled={busy === 'order'}>Save Order</Button>
              </CardContent>
            </Card>

            {/* Ranking progress */}
            <Card>
              <CardHeader>
                <CardTitle>Ranking Progress</CardTitle>
                <CardDescription>How many shifts each camper has ranked.</CardDescription>
              </CardHeader>
              <CardContent>
                {rankedNotInOrder.length > 0 && (
                  <Alert variant="error" className="mb-3">
                    <strong>{rankedNotInOrder.length} camper{rankedNotInOrder.length === 1 ? '' : 's'} ranked shifts but {rankedNotInOrder.length === 1 ? 'is' : 'are'} not in the draft order.</strong>{' '}
                    The auto-draft only assigns campers in the order list — these campers will be skipped entirely.
                    <ul className="mt-1 list-disc list-inside">
                      {rankedNotInOrder.map(id => {
                        const c = camperById(id)
                        return <li key={id}>{c ? (c.playa_name || c.full_name) : id} <span className="text-gray-600">({rankingCountByCamper.get(id) ?? 0} ranked)</span></li>
                      })}
                    </ul>
                    <Button size="sm" className="mt-2" onClick={handleAddMissingToOrder} disabled={busy === 'order'}>
                      Add {rankedNotInOrder.length === 1 ? 'them' : 'all'} to order (bottom)
                    </Button>
                  </Alert>
                )}
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b-2 border-black">
                      <th className="text-left py-1 font-black">#</th>
                      <th className="text-left py-1 font-black">Camper</th>
                      <th className="text-left py-1 font-black">Ranked</th>
                      <th className="text-left py-1 font-black">Assigned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.map((o, i) => {
                      const c = o.camper
                      const ranked = rankingCountByCamper.get(o.camper_id) ?? 0
                      const asg = assignmentsByCamper.get(o.camper_id) ?? []
                      return (
                        <tr key={o.id} className="border-b border-gray-100">
                          <td className="py-1 font-mono">{i + 1}</td>
                          <td className="py-1">{c ? (c.playa_name || c.full_name) : o.camper_id}</td>
                          <td className="py-1">{ranked}</td>
                          <td className="py-1">{asg.length}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Freeze + Auto-draft + Publish */}
            <Card>
              <CardHeader>
                <CardTitle>Run the Draft</CardTitle>
                <CardDescription>
                  1. Freeze rankings · 2. Dry-run to preview · 3. Commit · 4. Manually adjust if needed · 5. Publish.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {status === 'open' && (
                    <Button onClick={handleFreeze} disabled={busy === 'freeze'}>1. Freeze Rankings</Button>
                  )}
                  {(status === 'frozen' || status === 'drafted') && (
                    <Button variant="secondary" onClick={handleUnfreeze} disabled={busy === 'unfreeze'}>← Unfreeze</Button>
                  )}
                </div>

                {(status === 'frozen' || status === 'drafted') && (
                  <div className="border-2 border-black p-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="text-xs">Seed (optional)
                        <Input value={seedInput} onChange={e => setSeedInput(e.currentTarget.value)} placeholder="leave blank for random" className="w-40" />
                      </label>
                      <Button variant="secondary" onClick={() => handleAutoDraft(true)} disabled={busy === 'dry'}>Dry Run</Button>
                      <Button onClick={() => handleAutoDraft(false)} disabled={busy === 'commit'}>Commit Auto-Draft</Button>
                    </div>
                    {preview && (
                      <div className="text-xs">
                        <p className="font-bold uppercase">Last result: {preview.count} assignments · seed {preview.seed} {preview.dry_run ? '· DRY RUN' : ''}</p>
                      </div>
                    )}
                  </div>
                )}

                {status === 'drafted' && (
                  <Button variant="secondary" onClick={handlePublish} disabled={busy === 'publish'}>Archive (Publish Final)</Button>
                )}
              </CardContent>
            </Card>

            {/* Assignments table */}
            {assignments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Assignments ({assignments.length})</CardTitle>
                  <CardDescription>
                    Result of the auto-draft. Select two rows to swap the campers between those slots.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="text-xs text-gray-600">
                      {swapSelected.length === 0 && 'Select two assignments to swap.'}
                      {swapSelected.length === 1 && 'Select one more assignment.'}
                      {swapSelected.length === 2 && 'Ready to swap.'}
                    </span>
                    <Button size="sm" onClick={handleSwap} disabled={swapSelected.length !== 2 || busy === 'swap'}>
                      Swap selected
                    </Button>
                    {swapSelected.length > 0 && (
                      <Button size="sm" variant="secondary" onClick={() => setSwapSelected([])}>Clear</Button>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b-2 border-black">
                          <th className="text-left py-1 font-black w-8"></th>
                          <th className="text-left py-1 font-black">Camper</th>
                          <th className="text-left py-1 font-black">Pool</th>
                          <th className="text-left py-1 font-black">Role</th>
                          <th className="text-left py-1 font-black">Day</th>
                          <th className="text-left py-1 font-black">Time</th>
                          <th className="text-left py-1 font-black">Source</th>
                          <th className="text-left py-1 font-black">R</th>
                          <th className="text-left py-1 font-black">Rank</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignments.map(a => {
                          const c = camperById(a.camper_id)
                          const o = offeringById(a.offering_id)
                          const selected = swapSelected.includes(a.id)
                          return (
                            <tr
                              key={a.id}
                              className={cn("border-b border-gray-100", selected && "bg-yellow-100")}
                            >
                              <td className="py-1">
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => toggleSwapSelect(a.id)}
                                  aria-label="Select for swap"
                                />
                              </td>
                              <td className="py-1">{c ? (c.playa_name || c.full_name) : a.camper_id}</td>
                              <td className="py-1">{o?.pool}</td>
                              <td className="py-1">{o?.role}</td>
                              <td className="py-1">{o?.day_label ?? ''}</td>
                              <td className="py-1">{o?.time_label ?? ''}</td>
                              <td className="py-1">{a.source}</td>
                              <td className="py-1">{a.assigned_round ?? ''}</td>
                              <td className="py-1">{a.rank_used ?? ''}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
