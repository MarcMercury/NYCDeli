#!/usr/bin/env python3
"""Surgical refactor of src/app/kitchen/page.tsx (auto-draft migration)."""
from __future__ import annotations
import re
from pathlib import Path

PATH = Path("src/app/kitchen/page.tsx")
src = PATH.read_text()

old_imports = """import type { KitchenRole, KitchenShift, ScheduleAssignment, Camper, ShiftDraftRow, ShiftDraftOrderWithCamper, ShiftDraftPickRow } from '@/types/database'
import {
  fetchActiveDraft,
  fetchDraft,
  fetchDraftOrder,
  fetchDraftPicks,
  makePick,
  getAllDraftShiftCategories,
  applyDraftOverrides,
  applyShiftCategoryOverrides,
  type DraftShiftPosition,
  type ShiftOverrides,
} from '@/lib/shift-draft'"""
new_imports = """import type {
  KitchenRole, KitchenShift, ScheduleAssignment, Camper,
  ShiftDraftRow, ShiftOfferingRow, ShiftDraftRankingRow, ShiftDraftAssignmentRow,
} from '@/types/database'
import {
  fetchActiveDraft,
  fetchOfferings,
  fetchMyRankings,
  fetchAssignments,
  upsertCamperRanking,
  clearCamperRanking,
  applyShiftCategoryOverrides,
  type ShiftOverrides,
} from '@/lib/shift-draft'"""
assert old_imports in src
src = src.replace(old_imports, new_imports)

old_state = """  // Draft state
  const [draft, setDraft] = useState<ShiftDraftRow | null>(null)
  const [draftOrder, setDraftOrder] = useState<ShiftDraftOrderWithCamper[]>([])
  const [picks, setPicks] = useState<ShiftDraftPickRow[]>([])
  const [allCampers, setAllCampers] = useState<Camper[]>([])
  const [currentUser, setCurrentUser] = useState<{ id: string; camperId: string | null }>({ id: '', camperId: null })
  const [draftMessage, setDraftMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [selectedPosition, setSelectedPosition] = useState<DraftShiftPosition | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)"""
new_state = """  // Auto-draft state
  const [draft, setDraft] = useState<ShiftDraftRow | null>(null)
  const [offerings, setOfferings] = useState<ShiftOfferingRow[]>([])
  const [myRankings, setMyRankings] = useState<ShiftDraftRankingRow[]>([])
  const [myAssignments, setMyAssignments] = useState<ShiftDraftAssignmentRow[]>([])
  const [allCampers, setAllCampers] = useState<Camper[]>([])
  const [currentUser, setCurrentUser] = useState<{ id: string; camperId: string | null }>({ id: '', camperId: null })
  const [draftMessage, setDraftMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [savingOffering, setSavingOffering] = useState<string | null>(null)"""
assert old_state in src
src = src.replace(old_state, new_state)

old_fetch = """      const activeDraft = await fetchActiveDraft()
      if (activeDraft) {
        setDraft(activeDraft)
        const order = await fetchDraftOrder(activeDraft.id)
        setDraftOrder(order)
        const draftPicks = await fetchDraftPicks(activeDraft.id)
        setPicks(draftPicks)
      }"""
new_fetch = """      const activeDraft = await fetchActiveDraft()
      if (activeDraft) {
        setDraft(activeDraft)
        const [ofs, asgs] = await Promise.all([
          fetchOfferings(activeDraft.id),
          fetchAssignments(activeDraft.id),
        ])
        setOfferings(ofs)
        const cid = camper?.id
        if (cid) {
          const rks = await fetchMyRankings(activeDraft.id, cid)
          setMyRankings(rks)
          setMyAssignments(asgs.filter(a => a.camper_id === cid))
        } else {
          setMyAssignments([])
        }
      }"""
assert old_fetch in src
src = src.replace(old_fetch, new_fetch)

realtime_re = re.compile(
    r"  // Real-time subscription for draft updates\n  useEffect\(\(\) => \{.*?\n  \}, \[draft\?\.id, draft\?\.status\]\)\n",
    re.DOTALL,
)
assert realtime_re.search(src), "realtime block not found"
src = realtime_re.sub("", src)

timer_re = re.compile(
    r"  // Timer for current pick\n  useEffect\(\(\) => \{.*?\n  \}, \[draft\?\.status, draft\?\.current_round, draft\?\.current_pick_index, draft\?\.pick_time_limit_seconds, picks\]\)\n",
    re.DOTALL,
)
assert timer_re.search(src), "timer block not found"
src = timer_re.sub("", src)

derived_re = re.compile(
    r"  // ======== Draft Derived State ========\n.*?  // ======== Draft Actions ========\n",
    re.DOTALL,
)
assert derived_re.search(src), "derived state block not found"
new_derived = """  // ======== Auto-Draft Derived State ========

  const rankingByOffering = new Map(myRankings.map(r => [r.offering_id, r.rank]))
  const assignedOfferingIds = new Set(myAssignments.map(a => a.offering_id))
  const draftIsOpen = draft?.status === 'open'
  const draftIsFrozen = draft?.status === 'frozen'
  const draftIsDrafted = draft?.status === 'drafted'

  const offeringsByPool = (() => {
    const groups: Record<'deli'|'special'|'strike', ShiftOfferingRow[]> = { deli: [], special: [], strike: [] }
    for (const o of offerings) groups[o.pool].push(o)
    return groups
  })()

  const offeringByDay = (() => {
    const map = new Map<string, ShiftOfferingRow[]>()
    for (const o of offeringsByPool.deli) {
      const k = o.day_label ?? '\u2014'
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(o)
    }
    return map
  })()

  const getCamperById = (id: string) => allCampers.find(c => c.id === id)

  // ======== Draft Actions ========

"""
src = derived_re.sub(new_derived, src)

actions_re = re.compile(
    r"  const handleSelectPosition = \(pos: DraftShiftPosition\) => \{.*?  const handleCancelPick = \(\) => \{\n    setSelectedPosition\(null\)\n    setConfirming\(false\)\n  \}\n",
    re.DOTALL,
)
assert actions_re.search(src), "live-draft handlers block not found"
new_actions = """  const handleSetRanking = async (offeringId: string, rankStr: string) => {
    if (!draft || !currentUser.camperId || !draftIsOpen) return
    setSavingOffering(offeringId)
    try {
      if (rankStr.trim() === '') {
        await clearCamperRanking(draft.id, offeringId)
      } else {
        const rank = parseInt(rankStr, 10)
        if (!Number.isFinite(rank) || rank < 1) {
          setDraftMessage({ type: 'error', text: 'Rank must be a positive integer.' })
          return
        }
        await upsertCamperRanking(draft.id, offeringId, rank)
      }
      const rks = await fetchMyRankings(draft.id, currentUser.camperId)
      setMyRankings(rks)
    } catch (err) {
      setDraftMessage({ type: 'error', text: err instanceof Error ? err.message : 'Save failed' })
    } finally {
      setSavingOffering(null)
    }
  }

"""
src = actions_re.sub(new_actions, src)

signup_re = re.compile(
    r"        \{/\* Sign-Up Sheet & Draft Tab \*/\}\n        <TabPanel tabId=\"signup\" activeTab=\{activeTab\}>.*?\n        </TabPanel>\n",
    re.DOTALL,
)
assert signup_re.search(src), "signup TabPanel not found"

new_signup = '''        {/* Sign-Up Sheet & Draft Tab \u2014 Rankings */}
        <TabPanel tabId="signup" activeTab={activeTab}>
          <div className="space-y-6">
            {!draft && (
              <Alert variant="info">
                No active shift draft yet. An admin will create one and seed the offerings; check back soon.
              </Alert>
            )}

            {draft && (
              <Card className={cn(
                "border-4",
                draftIsOpen ? "border-blue-500" :
                draftIsFrozen ? "border-yellow-500 bg-yellow-50" :
                draftIsDrafted ? "border-green-500 bg-green-50" :
                "border-gray-300"
              )}>
                <CardContent className="py-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <p className="font-black uppercase tracking-wider">{draft.name}</p>
                      <p className="text-sm text-gray-600">
                        Status:{" "}
                        {draftIsOpen && <Badge variant="default">Rankings open</Badge>}
                        {draftIsFrozen && <Badge variant="warning">Frozen \u2014 awaiting auto-draft</Badge>}
                        {draftIsDrafted && <Badge variant="success">Drafted</Badge>}
                        {!draftIsOpen && !draftIsFrozen && !draftIsDrafted && <Badge>{draft.status}</Badge>}
                      </p>
                    </div>
                    <div className="text-sm">
                      {draftIsOpen && (
                        <p>Rank as many shifts as you want \u2014 lower number = higher priority. Quotas: {draft.deli_quota} deli, {draft.special_quota} special, {draft.strike_quota} strike.</p>
                      )}
                      {draftIsFrozen && <p>Rankings are locked. Auto-draft will run shortly.</p>}
                      {draftIsDrafted && <p>The auto-draft has been run. Your assignments are highlighted below.</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {draftMessage && (
              <Alert variant={draftMessage.type === 'success' ? 'success' : 'error'}>
                {draftMessage.text}
                <button className="ml-3 underline" onClick={() => setDraftMessage(null)}>Dismiss</button>
              </Alert>
            )}

            {draft && currentUser.camperId && draftIsDrafted && myAssignments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Assigned Shifts</CardTitle>
                  <CardDescription>{myAssignments.length} shift{myAssignments.length === 1 ? '' : 's'} assigned</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    {myAssignments.map(a => {
                      const o = offerings.find(x => x.id === a.offering_id)
                      if (!o) return null
                      return (
                        <li key={a.id} className="flex items-center gap-2">
                          <Badge variant="success">{o.pool}</Badge>
                          <span className="font-bold">{o.role}</span>
                          {o.time_label && <span className="text-gray-600">{o.time_label}</span>}
                          {o.day_label && <span className="text-gray-600">\u00b7 {o.day_label}</span>}
                        </li>
                      )
                    })}
                  </ul>
                </CardContent>
              </Card>
            )}

            {draft && offerings.length > 0 && (
              <>
                {(['deli', 'special', 'strike'] as const).map(pool => {
                  const list = offeringsByPool[pool]
                  if (list.length === 0) return null
                  const groups: { label: string; items: ShiftOfferingRow[] }[] =
                    pool === 'deli'
                      ? Array.from(offeringByDay.entries()).map(([k, v]) => ({ label: k, items: v }))
                      : [{ label: pool === 'special' ? 'Special / Deep Playa' : 'Strike', items: list }]

                  return (
                    <Card key={pool}>
                      <CardHeader>
                        <CardTitle className="capitalize">{pool} Pool</CardTitle>
                        <CardDescription>
                          {pool === 'deli' && 'Daily kitchen + camp shifts (Mon\u2013Sat).'}
                          {pool === 'special' && 'Deep Playa Friday food service.'}
                          {pool === 'strike' && 'Sunday teardown \u2014 Sunday departures only.'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {groups.map(group => (
                          <div key={group.label}>
                            <h4 className="font-bold uppercase text-xs tracking-wider text-gray-700 mb-2">{group.label}</h4>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs border-collapse">
                                <thead>
                                  <tr className="border-b-2 border-black">
                                    <th className="text-left py-1 pr-2 font-black uppercase w-16">Rank</th>
                                    <th className="text-left py-1 pr-2 font-black uppercase">Role</th>
                                    <th className="text-left py-1 pr-2 font-black uppercase">Time</th>
                                    <th className="text-left py-1 pr-2 font-black uppercase">Cap</th>
                                    <th className="text-left py-1 pr-2 font-black uppercase">Notes</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {group.items.map(o => {
                                    const rank = rankingByOffering.get(o.id) ?? ''
                                    const assigned = assignedOfferingIds.has(o.id)
                                    return (
                                      <tr
                                        key={o.id}
                                        className={cn(
                                          "border-b border-gray-200",
                                          assigned && "bg-green-50",
                                        )}
                                      >
                                        <td className="py-1 pr-2">
                                          <Input
                                            type="number"
                                            min={1}
                                            defaultValue={rank === '' ? '' : String(rank)}
                                            disabled={!draftIsOpen || !currentUser.camperId || savingOffering === o.id}
                                            onBlur={(e) => handleSetRanking(o.id, e.currentTarget.value)}
                                            className="w-14 text-xs"
                                            placeholder="\u2014"
                                          />
                                        </td>
                                        <td className="py-1 pr-2">
                                          <span className="font-bold">{o.role}</span>
                                          {o.counts_double && <Badge variant="warning" className="ml-2 text-[9px]">2\u00d7</Badge>}
                                          {o.requires_exp && <Badge variant="default" className="ml-1 text-[9px]">EXP</Badge>}
                                        </td>
                                        <td className="py-1 pr-2 text-gray-600">{o.time_label ?? '\u2014'}</td>
                                        <td className="py-1 pr-2">{o.capacity}</td>
                                        <td className="py-1 pr-2 text-gray-500">
                                          {o.description}
                                          {o.note && <div className="italic text-[10px]">{o.note}</div>}
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )
                })}
              </>
            )}
          </div>
        </TabPanel>
'''

src = signup_re.sub(new_signup, src)

PATH.write_text(src)
print("OK", PATH, "lines:", src.count("\n") + 1)
