'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
  Badge, Alert, Button,
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
  fetchActiveDraft,
  fetchDraft,
  fetchDraftOrder,
  fetchDraftPicks,
  makePick,
  getAllDraftShiftCategories,
  type DraftShiftPosition,
} from '@/lib/shift-draft'

export default function ShiftDraftPage() {
  const [draft, setDraft] = useState<ShiftDraftRow | null>(null)
  const [draftOrder, setDraftOrder] = useState<ShiftDraftOrderWithCamper[]>([])
  const [picks, setPicks] = useState<ShiftDraftPickRow[]>([])
  const [currentUser, setCurrentUser] = useState<{ id: string; camperId: string | null }>({ id: '', camperId: null })
  const [campers, setCampers] = useState<Camper[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [selectedPosition, setSelectedPosition] = useState<DraftShiftPosition | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Timer
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const loadData = useCallback(async () => {
    try {
      const supabase = createClient()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Find this user's camper record
      const { data: camper } = await supabase
        .from('campers')
        .select('id')
        .eq('email', user.email!)
        .single() as unknown as { data: { id: string } | null }

      setCurrentUser({ id: user.id, camperId: camper?.id || null })

      // Load all campers for name lookups
      const { data: allCampers } = await supabase
        .from('campers')
        .select('*')
      setCampers(allCampers || [])

      // Load active draft
      const activeDraft = await fetchActiveDraft()
      if (activeDraft) {
        setDraft(activeDraft)
        const order = await fetchDraftOrder(activeDraft.id)
        setDraftOrder(order)
        const draftPicks = await fetchDraftPicks(activeDraft.id)
        setPicks(draftPicks)
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load draft data' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Real-time subscription
  useEffect(() => {
    if (!draft || (draft.status !== 'active' && draft.status !== 'paused')) return

    const supabase = createClient()

    const channel = supabase
      .channel('camper-draft-updates')
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
      supabase.removeChannel(channel)
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

  // ======== Derived State ========

  const myPosition = draftOrder.find(o => o.camper_id === currentUser.camperId)
  const myPositionIndex = myPosition ? draftOrder.indexOf(myPosition) : -1

  const isMyTurn = draft?.status === 'active' && currentUser.camperId && (() => {
    const currentPick = picks.find(p =>
      p.round_number === draft.current_round &&
      p.pick_index === draft.current_pick_index &&
      p.status === 'picking'
    )
    return currentPick?.camper_id === currentUser.camperId
  })()

  const myPicks = picks.filter(
    p => p.camper_id === currentUser.camperId && p.status === 'picked'
  )

  const currentPickerInfo = (() => {
    if (!draft || draft.status !== 'active') return null
    const pick = picks.find(p =>
      p.round_number === draft.current_round &&
      p.pick_index === draft.current_pick_index &&
      p.status === 'picking'
    )
    if (!pick) return null
    const camper = campers.find(c => c.id === pick.camper_id)
    return camper
  })()

  const pickedPositionIds = new Set(
    picks
      .filter(p => p.status === 'picked' && p.shift_category && p.shift_role)
      .map(p => `${p.shift_category}|${p.shift_role}|${p.shift_time ?? ''}`)
  )

  const categories = getAllDraftShiftCategories()

  const getCamperById = (id: string) => campers.find(c => c.id === id)

  // ======== Actions ========

  const handleSelectPosition = (pos: DraftShiftPosition) => {
    if (!isMyTurn) return
    const posKey = `${pos.category}|${pos.role}|${pos.time ?? ''}`
    if (pickedPositionIds.has(posKey)) return
    setSelectedPosition(pos)
    setConfirming(true)
  }

  const handleConfirmPick = async () => {
    if (!draft || !currentUser.camperId || !selectedPosition) return
    setSubmitting(true)
    try {
      await makePick(
        draft.id,
        currentUser.camperId,
        selectedPosition.category,
        selectedPosition.role,
        selectedPosition.time ?? null,
      )
      setMessage({ type: 'success', text: `You picked: ${selectedPosition.role}${selectedPosition.time ? ` (${selectedPosition.time})` : ''}` })
      setSelectedPosition(null)
      setConfirming(false)
      // Data will refresh via realtime
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to submit pick: ${err instanceof Error ? err.message : 'Unknown error'}` })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelPick = () => {
    setSelectedPosition(null)
    setConfirming(false)
  }

  // ======== Render ========

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

  if (!draft) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h1 className="text-3xl font-black uppercase tracking-wider mb-4">Shift Draft</h1>
          <Card>
            <CardContent className="py-12">
              <p className="text-gray-600 text-lg">No active draft right now.</p>
              <p className="text-gray-400 mt-2">Check back when the admin starts the shift draft.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (draft.status === 'setup') {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h1 className="text-3xl font-black uppercase tracking-wider mb-4">Shift Draft</h1>
          <Card>
            <CardContent className="py-12">
              <p className="text-xl font-bold">Draft is being set up...</p>
              <p className="text-gray-500 mt-2">The admin is configuring the draft order. Hang tight!</p>
              {myPosition && (
                <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-300 inline-block">
                  <p className="text-sm uppercase tracking-wider text-yellow-700">Your Draft Position</p>
                  <p className="text-4xl font-black">#{myPosition.draft_position}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-wider">
            🎯 Shift Draft
          </h1>
          <p className="text-gray-600">{draft.name}</p>
        </div>

        {/* Messages */}
        {message && (
          <Alert variant={message.type === 'success' ? 'success' : 'error'} className="mb-6">
            {message.text}
            <button className="ml-4 underline" onClick={() => setMessage(null)}>Dismiss</button>
          </Alert>
        )}

        {/* Confirmation Modal */}
        {confirming && selectedPosition && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full border-4 border-yellow-500">
              <CardHeader>
                <CardTitle>Confirm Your Pick</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-yellow-50 border-2 border-yellow-300">
                  <p className="text-sm uppercase tracking-wider text-gray-500">{selectedPosition.category}</p>
                  <p className="text-xl font-black">{selectedPosition.role}</p>
                  {selectedPosition.time && (
                    <p className="text-gray-600">{selectedPosition.time}</p>
                  )}
                  {selectedPosition.note && (
                    <p className="text-xs text-gray-400 mt-1">{selectedPosition.note}</p>
                  )}
                </div>
                <p className="text-sm text-gray-600 text-center">
                  This choice is final. Are you sure?
                </p>
              </CardContent>
              <div className="flex gap-2 p-4 border-t-2 border-gray-200">
                <Button onClick={handleCancelPick} variant="secondary" className="flex-1" disabled={submitting}>
                  Cancel
                </Button>
                <Button onClick={handleConfirmPick} className="flex-1" disabled={submitting}>
                  {submitting ? 'Submitting...' : '✅ Confirm Pick'}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Status Banner */}
        <Card className={cn(
          "mb-6 border-4",
          isMyTurn ? "border-green-500 bg-green-50" :
          draft.status === 'paused' ? "border-yellow-500" :
          draft.status === 'completed' ? "border-gray-400" :
          "border-blue-500"
        )}>
          <CardContent className="py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-center md:text-left">
                {isMyTurn ? (
                  <>
                    <p className="text-3xl font-black text-green-700 uppercase animate-pulse">
                      🎯 It&apos;s Your Turn!
                    </p>
                    <p className="text-gray-600">Select a shift from the board below</p>
                  </>
                ) : draft.status === 'completed' ? (
                  <>
                    <p className="text-2xl font-black uppercase">Draft Complete</p>
                    <p className="text-gray-600">All rounds have been completed</p>
                  </>
                ) : draft.status === 'paused' ? (
                  <>
                    <p className="text-2xl font-black text-yellow-700 uppercase">Draft Paused</p>
                    <p className="text-gray-600">Waiting for admin to resume...</p>
                  </>
                ) : (
                  <>
                    <p className="text-xl font-black uppercase">
                      {currentPickerInfo
                        ? `${currentPickerInfo.playa_name || currentPickerInfo.full_name} is picking...`
                        : 'Waiting...'}
                    </p>
                    <p className="text-gray-600">
                      Round {draft.current_round} of {draft.total_rounds} · Pick {draft.current_pick_index + 1} of {draftOrder.length}
                    </p>
                  </>
                )}
              </div>

              {/* Timer */}
              {draft.status === 'active' && timeLeft !== null && (
                <div className={cn(
                  "text-5xl font-mono font-black",
                  isMyTurn && timeLeft <= 30 ? "text-red-600 animate-pulse" :
                  timeLeft <= 30 ? "text-red-600" :
                  timeLeft <= 60 ? "text-yellow-600" : "text-green-600"
                )}>
                  {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                </div>
              )}
            </div>

            {/* Position info */}
            {myPosition && draft.status !== 'completed' && (
              <div className="mt-4 text-center md:text-left">
                <p className="text-sm text-gray-500">
                  Your draft position: <span className="font-bold">#{myPosition.draft_position}</span>
                  {myPicks.length > 0 && (
                    <> · Picks made: <span className="font-bold">{myPicks.length}</span></>
                  )}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Picks */}
        {myPicks.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Your Picks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {myPicks.map(pick => (
                  <div key={pick.id} className="bg-green-50 border-2 border-green-300 px-4 py-2 rounded">
                    <p className="font-bold text-sm">{pick.shift_role}</p>
                    {pick.shift_time && <p className="text-xs text-gray-500">{pick.shift_time}</p>}
                    <p className="text-xs text-gray-400">{pick.shift_category}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content: Shift Grid + Draft Order */}
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Shift Grid */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Shift Board</CardTitle>
                <CardDescription>
                  {isMyTurn
                    ? 'Click an available (green) shift to select it'
                    : 'Green = available, Red = taken'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {categories.map(cat => (
                    <div key={cat.name} className="border-2 border-black p-3">
                      <h4 className="font-bold uppercase text-sm mb-1">{cat.name}</h4>
                      {cat.time && <p className="text-xs text-gray-500 mb-2">{cat.time}</p>}
                      {cat.note && <p className="text-xs text-gray-400 mb-2">{cat.note}</p>}
                      <div className="space-y-1">
                        {cat.positions.map(pos => {
                          const posKey = `${pos.category}|${pos.role}|${pos.time ?? ''}`
                          const taken = pickedPositionIds.has(posKey)
                          const pick = taken
                            ? picks.find(p => p.status === 'picked' && `${p.shift_category}|${p.shift_role}|${p.shift_time ?? ''}` === posKey)
                            : null
                          const picker = pick ? getCamperById(pick.camper_id) : null
                          const isMyPick = pick?.camper_id === currentUser.camperId

                          return (
                            <button
                              key={pos.id}
                              disabled={taken || !isMyTurn}
                              onClick={() => handleSelectPosition(pos)}
                              className={cn(
                                "w-full text-left text-xs flex items-center gap-1 p-1.5 rounded transition-colors",
                                taken
                                  ? isMyPick
                                    ? "bg-blue-100 border border-blue-300"
                                    : "bg-red-50 text-gray-400 cursor-not-allowed"
                                  : isMyTurn
                                    ? "bg-green-50 hover:bg-green-200 cursor-pointer border border-green-300"
                                    : "bg-green-50"
                              )}
                            >
                              <span className={cn(
                                "w-2 h-2 rounded-full inline-block flex-shrink-0",
                                taken
                                  ? isMyPick ? "bg-blue-500" : "bg-red-400"
                                  : "bg-green-400"
                              )} />
                              <span className={cn("flex-1", taken && !isMyPick && "line-through")}>
                                {pos.role}
                              </span>
                              {pos.time && !cat.time && (
                                <span className="text-gray-400 text-[10px]">{pos.time}</span>
                              )}
                              {taken && picker && (
                                <span className="text-[10px] text-gray-500 truncate max-w-[70px]">
                                  {isMyPick ? '(You)' : picker.playa_name || picker.full_name}
                                </span>
                              )}
                              {pos.requiresExp && <Badge variant="warning" className="text-[10px] py-0 px-1">EXP</Badge>}
                              {pos.countsDouble && <Badge variant="info" className="text-[10px] py-0 px-1">2×</Badge>}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Draft Order Sidebar */}
          <div>
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle className="text-sm">Draft Order</CardTitle>
                <CardDescription className="text-xs">
                  Round {draft.current_round}/{draft.total_rounds}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[60vh] overflow-y-auto">
                  {draftOrder.map((entry, idx) => {
                    const isCurrentPicker = draft.status === 'active' && draft.current_pick_index === idx
                    const isMe = entry.camper_id === currentUser.camperId
                    const camperPicks = picks.filter(
                      p => p.camper_id === entry.camper_id && p.status === 'picked'
                    )
                    return (
                      <div
                        key={entry.id}
                        className={cn(
                          "flex items-center gap-1 px-3 py-1.5 border-b border-gray-100 text-xs",
                          isCurrentPicker && "bg-yellow-200 font-bold",
                          isMe && !isCurrentPicker && "bg-blue-50"
                        )}
                      >
                        <span className="text-gray-400 font-mono w-5 text-right">{idx + 1}.</span>
                        <span className="flex-1 truncate">
                          {isMe ? (
                            <span className="text-blue-700 font-bold">You</span>
                          ) : (
                            entry.camper?.playa_name || entry.camper?.full_name || 'Unknown'
                          )}
                        </span>
                        {isCurrentPicker && <span>🎯</span>}
                        {camperPicks.length > 0 && (
                          <Badge variant="default" className="text-[9px] py-0 px-1">
                            {camperPicks.length}
                          </Badge>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
