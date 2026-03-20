'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
  Badge, Alert, Button, Input, Select,
} from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type {
  Camper,
  ShiftDraftRow,
  ShiftDraftOrderWithCamper,
  ShiftDraftPickRow,
} from '@/types/database'
import {
  createDraft,
  setDraftOrder as saveDraftOrder,
  startDraft,
  advanceDraft,
  toggleDraftPause,
  deleteDraft,
  updateDraftSettings,
  fetchActiveDraft,
  fetchDraft,
  fetchDraftOrder,
  fetchDraftPicks,
  getAllDraftShiftCategories,
  getAllDraftPositions,
} from '@/lib/shift-draft'

type ViewMode = 'list' | 'setup' | 'live'

export default function AdminShiftDraftPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [draft, setDraft] = useState<ShiftDraftRow | null>(null)
  const [draftOrder, setDraftOrderState] = useState<ShiftDraftOrderWithCamper[]>([])
  const [picks, setPicks] = useState<ShiftDraftPickRow[]>([])
  const [campers, setCampers] = useState<Camper[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Create form
  const [draftName, setDraftName] = useState('Shift Draft 2026')
  const [totalRounds, setTotalRounds] = useState(2)
  const [pickTimeLimit, setPickTimeLimit] = useState(120)

  // Order building
  const [searchTerm, setSearchTerm] = useState('')
  const [orderList, setOrderList] = useState<string[]>([]) // camper IDs in order
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)

  // Timer for active draft
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const loadData = useCallback(async () => {
    try {
      const supabase = createClient()

      // Load all campers
      const { data: camperData } = await supabase
        .from('campers')
        .select('*')
        .order('full_name')
      setCampers(camperData || [])

      // Load active draft
      const activeDraft = await fetchActiveDraft()
      if (activeDraft) {
        setDraft(activeDraft)
        const order = await fetchDraftOrder(activeDraft.id)
        setDraftOrderState(order)
        setOrderList(order.map(o => o.camper_id))
        const draftPicks = await fetchDraftPicks(activeDraft.id)
        setPicks(draftPicks)

        if (activeDraft.status === 'active' || activeDraft.status === 'paused') {
          setViewMode('live')
        } else {
          setViewMode('setup')
        }
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load data' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Real-time subscription for live draft
  useEffect(() => {
    if (!draft || draft.status !== 'active') return

    const supabase = createClient()

    const draftChannel = supabase
      .channel('admin-draft-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'shift_drafts',
        filter: `id=eq.${draft.id}`,
      }, async () => {
        const updated = await fetchDraft(draft.id)
        if (updated) setDraft(updated)
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'shift_draft_picks',
        filter: `draft_id=eq.${draft.id}`,
      }, async () => {
        const updatedPicks = await fetchDraftPicks(draft.id)
        setPicks(updatedPicks)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(draftChannel)
    }
  }, [draft?.id, draft?.status])

  // Timer for current pick
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)

    if (!draft || draft.status !== 'active') {
      setTimeLeft(null)
      return
    }

    const currentPick = picks.find(p =>
      p.round_number === draft.current_round &&
      p.pick_index === draft.current_pick_index &&
      p.status === 'picking'
    )

    if (!currentPick?.turn_started_at) {
      setTimeLeft(null)
      return
    }

    const updateTimer = () => {
      const started = new Date(currentPick.turn_started_at!).getTime()
      const now = Date.now()
      const elapsed = Math.floor((now - started) / 1000)
      const remaining = draft.pick_time_limit_seconds - elapsed
      setTimeLeft(Math.max(0, remaining))
    }

    updateTimer()
    timerRef.current = setInterval(updateTimer, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [draft?.status, draft?.current_round, draft?.current_pick_index, draft?.pick_time_limit_seconds, picks])

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  // ---------- Actions ----------

  const handleCreateDraft = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const newDraft = await createDraft(draftName, totalRounds, pickTimeLimit, user.id)
      setDraft(newDraft)
      setViewMode('setup')
      showMessage('success', 'Draft created!')
    } catch (err) {
      showMessage('error', `Failed to create draft: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleSaveOrder = async () => {
    if (!draft) return
    try {
      await saveDraftOrder(draft.id, orderList)
      const order = await fetchDraftOrder(draft.id)
      setDraftOrderState(order)
      showMessage('success', 'Draft order saved!')
    } catch (err) {
      showMessage('error', `Failed to save order: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleStartDraft = async () => {
    if (!draft) return
    if (orderList.length === 0) {
      showMessage('error', 'Add campers to the draft order first')
      return
    }
    if (!confirm('Start the draft? Campers will be notified. Make sure the order is set.')) return
    try {
      await handleSaveOrder()
      await startDraft(draft.id)
      const updated = await fetchDraft(draft.id)
      if (updated) setDraft(updated)
      const updatedPicks = await fetchDraftPicks(draft.id)
      setPicks(updatedPicks)
      setViewMode('live')
      showMessage('success', 'Draft started! First camper is on the clock.')
    } catch (err) {
      showMessage('error', `Failed to start draft: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleSkipCurrent = async () => {
    if (!draft) return
    try {
      await advanceDraft(draft.id, 'auto_skipped')
      const updated = await fetchDraft(draft.id)
      if (updated) setDraft(updated)
      const updatedPicks = await fetchDraftPicks(draft.id)
      setPicks(updatedPicks)
    } catch (err) {
      showMessage('error', `Failed to skip: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleTogglePause = async () => {
    if (!draft) return
    try {
      await toggleDraftPause(draft.id, draft.status)
      const updated = await fetchDraft(draft.id)
      if (updated) setDraft(updated)
      showMessage('success', updated?.status === 'paused' ? 'Draft paused' : 'Draft resumed')
    } catch (err) {
      showMessage('error', `Failed to toggle pause: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleDeleteDraft = async () => {
    if (!draft) return
    if (!confirm('Delete this draft? This cannot be undone.')) return
    try {
      await deleteDraft(draft.id)
      setDraft(null)
      setDraftOrderState([])
      setPicks([])
      setOrderList([])
      setViewMode('list')
      showMessage('success', 'Draft deleted')
    } catch (err) {
      showMessage('error', `Failed to delete: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleUpdateSettings = async () => {
    if (!draft) return
    try {
      await updateDraftSettings(draft.id, {
        name: draftName,
        total_rounds: totalRounds,
        pick_time_limit_seconds: pickTimeLimit,
      })
      const updated = await fetchDraft(draft.id)
      if (updated) setDraft(updated)
      showMessage('success', 'Settings updated')
    } catch (err) {
      showMessage('error', `Failed to update: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  // ---------- Order management ----------

  const addToOrder = (camperId: string) => {
    if (!orderList.includes(camperId)) {
      setOrderList([...orderList, camperId])
    }
  }

  const removeFromOrder = (camperId: string) => {
    setOrderList(orderList.filter(id => id !== camperId))
  }

  const addAllCampers = () => {
    const allIds = campers.map(c => c.id)
    setOrderList(allIds)
  }

  const shuffleOrder = () => {
    const shuffled = [...orderList]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    setOrderList(shuffled)
  }

  const handleDragStart = (index: number) => {
    dragItem.current = index
  }

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index
  }

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return
    const reordered = [...orderList]
    const [removed] = reordered.splice(dragItem.current, 1)
    reordered.splice(dragOverItem.current, 0, removed)
    setOrderList(reordered)
    dragItem.current = null
    dragOverItem.current = null
  }

  const getCamperById = (id: string) => campers.find(c => c.id === id)

  // ---------- Helpers for live view ----------

  const currentPick = draft?.status === 'active'
    ? picks.find(p =>
        p.round_number === draft.current_round &&
        p.pick_index === draft.current_pick_index &&
        p.status === 'picking'
      )
    : null

  const currentCamper = currentPick ? getCamperById(currentPick.camper_id) : null

  const pickedPositionIds = new Set(
    picks
      .filter(p => p.status === 'picked' && p.shift_category && p.shift_role)
      .map(p => `${p.shift_category}|${p.shift_role}|${p.shift_time ?? ''}`)
  )

  const categories = getAllDraftShiftCategories()

  const filteredCampers = campers.filter(c =>
    !orderList.includes(c.id) && (
      c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.playa_name && c.playa_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  // ---------- Render ----------

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🎯</div>
          <p className="font-bold uppercase tracking-wider">Loading Shift Draft...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/admin" className="text-sm text-gray-500 hover:text-black uppercase tracking-wider mb-1 block">
              ← Back to Admin
            </Link>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-wider">
              🎯 Shift Draft
            </h1>
            <p className="text-gray-600">Set up and run the live shift selection draft</p>
          </div>
          {draft && (
            <Badge variant={
              draft.status === 'active' ? 'success' :
              draft.status === 'paused' ? 'warning' :
              draft.status === 'completed' ? 'default' : 'info'
            }>
              {draft.status.toUpperCase()}
            </Badge>
          )}
        </div>

        {/* Messages */}
        {message && (
          <Alert variant={message.type === 'success' ? 'success' : 'error'} className="mb-6">
            {message.text}
          </Alert>
        )}

        {/* No draft exists - create one */}
        {!draft && viewMode === 'list' && (
          <Card>
            <CardHeader>
              <CardTitle>Create New Draft</CardTitle>
              <CardDescription>Set up a new shift selection draft for all campers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider mb-1">Draft Name</label>
                <Input
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="Shift Draft 2026"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider mb-1">Total Rounds</label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={totalRounds}
                    onChange={(e) => setTotalRounds(Number(e.target.value))}
                  />
                  <p className="text-xs text-gray-500 mt-1">Number of times through the draft order</p>
                </div>
                <div>
                  <label className="block text-sm font-bold uppercase tracking-wider mb-1">Pick Time Limit (sec)</label>
                  <Input
                    type="number"
                    min={30}
                    max={600}
                    value={pickTimeLimit}
                    onChange={(e) => setPickTimeLimit(Number(e.target.value))}
                  />
                  <p className="text-xs text-gray-500 mt-1">Default: 120 sec (2 min)</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleCreateDraft}>Create Draft</Button>
            </CardFooter>
          </Card>
        )}

        {/* Setup mode */}
        {draft && draft.status === 'setup' && viewMode === 'setup' && (
          <div className="space-y-6">
            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Draft Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-wider mb-1">Name</label>
                    <Input
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-wider mb-1">Rounds</label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={totalRounds}
                      onChange={(e) => setTotalRounds(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-wider mb-1">Time Limit (sec)</label>
                    <Input
                      type="number"
                      min={30}
                      max={600}
                      value={pickTimeLimit}
                      onChange={(e) => setPickTimeLimit(Number(e.target.value))}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button onClick={handleUpdateSettings} variant="secondary">Save Settings</Button>
                <Button onClick={handleDeleteDraft} variant="danger">Delete Draft</Button>
              </CardFooter>
            </Card>

            {/* Draft Order */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Available Campers */}
              <Card>
                <CardHeader>
                  <CardTitle>Available Campers ({filteredCampers.length})</CardTitle>
                  <Input
                    placeholder="Search campers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mt-2"
                  />
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[500px] overflow-y-auto">
                    {filteredCampers.map(c => (
                      <button
                        key={c.id}
                        onClick={() => addToOrder(c.id)}
                        className="w-full text-left px-4 py-2 border-b border-gray-100 hover:bg-yellow-50 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold">{c.full_name}</span>
                          {c.playa_name && (
                            <span className="text-gray-500 ml-2">&quot;{c.playa_name}&quot;</span>
                          )}
                        </div>
                        <span className="text-green-600 font-bold">+ Add</span>
                      </button>
                    ))}
                    {filteredCampers.length === 0 && (
                      <p className="p-4 text-gray-500 text-center">
                        {campers.length === orderList.length ? 'All campers added' : 'No matches'}
                      </p>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={addAllCampers} variant="secondary" className="w-full">
                    Add All Campers
                  </Button>
                </CardFooter>
              </Card>

              {/* Draft Order */}
              <Card>
                <CardHeader>
                  <CardTitle>Draft Order ({orderList.length})</CardTitle>
                  <CardDescription>Drag to reorder, or use shuffle</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[500px] overflow-y-auto">
                    {orderList.map((camperId, idx) => {
                      const camper = getCamperById(camperId)
                      return (
                        <div
                          key={camperId}
                          draggable
                          onDragStart={() => handleDragStart(idx)}
                          onDragEnter={() => handleDragEnter(idx)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => e.preventDefault()}
                          className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 hover:bg-gray-50 cursor-grab active:cursor-grabbing"
                        >
                          <span className="text-gray-400 font-mono w-8 text-right">{idx + 1}.</span>
                          <span className="font-bold flex-1">
                            {camper?.full_name || 'Unknown'}
                            {camper?.playa_name && (
                              <span className="text-gray-500 font-normal ml-2">&quot;{camper.playa_name}&quot;</span>
                            )}
                          </span>
                          <button
                            onClick={() => removeFromOrder(camperId)}
                            className="text-red-500 hover:text-red-700 font-bold text-sm"
                          >
                            ✕
                          </button>
                        </div>
                      )
                    })}
                    {orderList.length === 0 && (
                      <p className="p-4 text-gray-500 text-center">
                        Add campers from the left panel
                      </p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button onClick={shuffleOrder} variant="secondary">🎲 Shuffle</Button>
                  <Button onClick={handleSaveOrder} variant="secondary">💾 Save Order</Button>
                  <Button onClick={() => setOrderList([])} variant="danger">Clear</Button>
                </CardFooter>
              </Card>
            </div>

            {/* Shift Grid Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Shift Positions ({getAllDraftPositions().length} total)</CardTitle>
                <CardDescription>These shifts will be available during the draft</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories.map(cat => (
                    <div key={cat.name} className="border-2 border-black p-3">
                      <h4 className="font-bold uppercase text-sm mb-1">{cat.name}</h4>
                      {cat.time && <p className="text-xs text-gray-500 mb-2">{cat.time}</p>}
                      <div className="space-y-1">
                        {cat.positions.map(pos => (
                          <div key={pos.id} className="text-xs flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                            <span>{pos.role}</span>
                            {pos.time && <span className="text-gray-400">({pos.time})</span>}
                            {pos.requiresExp && <Badge variant="warning" className="text-[10px] py-0 px-1">EXP</Badge>}
                            {pos.countsDouble && <Badge variant="info" className="text-[10px] py-0 px-1">2×</Badge>}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Start Draft */}
            <Card className="border-yellow-500 border-4">
              <CardContent className="py-8 text-center">
                <h3 className="text-2xl font-black uppercase mb-2">Ready to Start?</h3>
                <p className="text-gray-600 mb-4">
                  {orderList.length} campers in the draft order · {totalRounds} rounds · {pickTimeLimit}s per pick
                </p>
                <Button
                  onClick={handleStartDraft}
                  className="text-lg px-8 py-3"
                  disabled={orderList.length === 0}
                >
                  🚀 Start Draft
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Live Draft View */}
        {draft && (draft.status === 'active' || draft.status === 'paused' || draft.status === 'completed') && viewMode === 'live' && (
          <div className="space-y-6">
            {/* Live Status Bar */}
            <Card className={cn(
              "border-4",
              draft.status === 'active' ? "border-green-500" :
              draft.status === 'paused' ? "border-yellow-500" :
              "border-gray-400"
            )}>
              <CardContent className="py-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="text-center md:text-left">
                    <h2 className="text-2xl font-black uppercase">{draft.name}</h2>
                    <p className="text-gray-600">
                      Round {draft.current_round} of {draft.total_rounds} · Pick {draft.current_pick_index + 1} of {draftOrder.length}
                    </p>
                  </div>

                  {draft.status === 'completed' ? (
                    <Badge variant="default" className="text-xl px-6 py-2">DRAFT COMPLETE</Badge>
                  ) : (
                    <div className="flex items-center gap-4">
                      {/* Timer */}
                      {draft.status === 'active' && timeLeft !== null && (
                        <div className={cn(
                          "text-4xl font-mono font-black",
                          timeLeft <= 30 ? "text-red-600 animate-pulse" :
                          timeLeft <= 60 ? "text-yellow-600" : "text-green-600"
                        )}>
                          {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                        </div>
                      )}

                      {/* Controls */}
                      <div className="flex gap-2">
                        <Button onClick={handleTogglePause} variant="secondary">
                          {draft.status === 'paused' ? '▶️ Resume' : '⏸️ Pause'}
                        </Button>
                        {draft.status === 'active' && (
                          <Button onClick={handleSkipCurrent} variant="danger">
                            ⏭️ Skip
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Current Picker */}
                {currentCamper && draft.status === 'active' && (
                  <div className="mt-4 p-4 bg-yellow-100 border-2 border-yellow-500 text-center">
                    <p className="text-sm uppercase tracking-wider text-yellow-700 font-bold">Now Picking</p>
                    <p className="text-2xl font-black">
                      {currentCamper.playa_name || currentCamper.full_name}
                    </p>
                    <p className="text-sm text-gray-600">{currentCamper.email}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Draft Board + Pick History */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Shift Grid */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Shift Board</CardTitle>
                    <CardDescription>Green = available, Red = taken</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {categories.map(cat => (
                        <div key={cat.name} className="border-2 border-black p-3">
                          <h4 className="font-bold uppercase text-sm mb-1">{cat.name}</h4>
                          {cat.time && <p className="text-xs text-gray-500 mb-2">{cat.time}</p>}
                          <div className="space-y-1">
                            {cat.positions.map(pos => {
                              const posKey = `${pos.category}|${pos.role}|${pos.time ?? ''}`
                              const taken = pickedPositionIds.has(posKey)
                              const pick = taken
                                ? picks.find(p => p.status === 'picked' && `${p.shift_category}|${p.shift_role}|${p.shift_time ?? ''}` === posKey)
                                : null
                              const picker = pick ? getCamperById(pick.camper_id) : null

                              return (
                                <div
                                  key={pos.id}
                                  className={cn(
                                    "text-xs flex items-center gap-1 p-1 rounded",
                                    taken ? "bg-red-50 line-through text-gray-400" : "bg-green-50"
                                  )}
                                >
                                  <span className={cn(
                                    "w-2 h-2 rounded-full inline-block",
                                    taken ? "bg-red-400" : "bg-green-400"
                                  )} />
                                  <span className="flex-1">{pos.role}</span>
                                  {taken && picker && (
                                    <span className="text-[10px] text-gray-500 truncate max-w-[80px]">
                                      {picker.playa_name || picker.full_name}
                                    </span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Draft Order + Pick Log */}
              <div className="space-y-6">
                {/* Order List */}
                <Card>
                  <CardHeader>
                    <CardTitle>Draft Order</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-[300px] overflow-y-auto">
                      {draftOrder.map((entry, idx) => {
                        const isCurrentPicker = draft.status === 'active' && draft.current_pick_index === idx
                        const camperPicks = picks.filter(
                          p => p.camper_id === entry.camper_id && p.status === 'picked'
                        )
                        return (
                          <div
                            key={entry.id}
                            className={cn(
                              "flex items-center gap-2 px-3 py-2 border-b border-gray-100 text-sm",
                              isCurrentPicker && "bg-yellow-200 font-bold"
                            )}
                          >
                            <span className="text-gray-400 font-mono w-6 text-right">{idx + 1}.</span>
                            <span className="flex-1 truncate">
                              {entry.camper?.playa_name || entry.camper?.full_name || 'Unknown'}
                            </span>
                            {isCurrentPicker && <span className="text-yellow-600">🎯</span>}
                            {camperPicks.length > 0 && (
                              <Badge variant="default" className="text-[10px]">
                                {camperPicks.length} pick{camperPicks.length !== 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Picks */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Picks</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-[300px] overflow-y-auto">
                      {picks
                        .filter(p => p.status === 'picked' || p.status === 'skipped' || p.status === 'auto_skipped')
                        .sort((a, b) => {
                          const aTime = a.picked_at || a.expired_at || ''
                          const bTime = b.picked_at || b.expired_at || ''
                          return bTime.localeCompare(aTime)
                        })
                        .slice(0, 20)
                        .map(pick => {
                          const camper = getCamperById(pick.camper_id)
                          return (
                            <div key={pick.id} className="px-3 py-2 border-b border-gray-100 text-sm">
                              <div className="flex items-center justify-between">
                                <span className="font-bold truncate">
                                  {camper?.playa_name || camper?.full_name || 'Unknown'}
                                </span>
                                <Badge variant={pick.status === 'picked' ? 'success' : 'error'} className="text-[10px]">
                                  R{pick.round_number}
                                </Badge>
                              </div>
                              {pick.status === 'picked' ? (
                                <p className="text-xs text-gray-500">
                                  {pick.shift_role} {pick.shift_time ? `(${pick.shift_time})` : ''}
                                </p>
                              ) : (
                                <p className="text-xs text-red-500">Skipped</p>
                              )}
                            </div>
                          )
                        })}
                      {picks.filter(p => p.status !== 'pending' && p.status !== 'picking').length === 0 && (
                        <p className="p-4 text-gray-500 text-center text-sm">No picks yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
