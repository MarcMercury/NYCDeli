'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
  Badge, Button, Input, Tabs
} from '@/components/ui'
import type { Tab } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { resolveTentMateIds } from '@/lib/tent-mates'
import { getOpsEvent, isInformationStage } from '@/lib/active-event'
import type {
  UserProfileRow, CamperRow, CamperPhotoRow, EventRow, EventParticipantRow,
} from '@/types/database'

/**
 * One person in the directory.
 *
 * A camper row belongs to a single event, so the same human has one row per
 * event they attended. Entries are keyed by email — the identity that survives
 * across events — and carry the newest camper row plus every event that person
 * has a row for.
 */
interface DirectoryEntry {
  key: string
  profile: UserProfileRow | null
  camper: CamperRow | null
  photos: CamperPhotoRow[]
  events: EventRow[]
}

const EVENT_TAB = 'event'
const ALL_TAB = 'all'

/** "Burning Man 2026" -> "BM 26". */
function shortEventLabel(event: EventRow): string {
  const initials = event.name
    .replace(/\d{4}/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word[0].toUpperCase())
    .join('')
  const year = event.year ?? (event.start_date ? Number(event.start_date.slice(0, 4)) : null)
  if (!initials) return event.name
  return year ? `${initials} ${String(year).slice(2)}` : initials
}

function entryKey(record: { email?: string | null; id: string }): string {
  return (record.email || '').trim().toLowerCase() || record.id
}

function displayName(entry: DirectoryEntry): string {
  return entry.camper?.full_name || entry.profile?.email || entry.camper?.email || 'Unknown'
}

function byDisplayName(a: DirectoryEntry, b: DirectoryEntry): number {
  return displayName(a).localeCompare(displayName(b), undefined, { sensitivity: 'base' })
}

/** Newest first: by event start date, then by when the row was created. */
function camperRecency(camper: CamperRow, eventsById: Map<string, EventRow>): string {
  const event = camper.event_id ? eventsById.get(camper.event_id) : undefined
  return `${event?.start_date ?? '0000-00-00'}|${camper.created_at}`
}

export default function CampersPage() {
  const [allEntries, setAllEntries] = useState<DirectoryEntry[]>([])
  const [eventEntries, setEventEntries] = useState<DirectoryEntry[]>([])
  const [opsEvent, setOpsEvent] = useState<EventRow | null>(null)
  const [canSeeEventTab, setCanSeeEventTab] = useState(false)
  const [activeTab, setActiveTab] = useState(ALL_TAB)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCamper, setSelectedCamper] = useState<DirectoryEntry | null>(null)
  const [campersById, setCampersById] = useState<Map<string, CamperRow>>(new Map())
  const [offseason, setOffseason] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  const fetchDirectory = useCallback(async () => {
    const supabase = createClient()
    const event = await getOpsEvent()
    const { data: { user } } = await supabase.auth.getUser()

    const [profilesRes, campersRes, photosRes, eventsRes, participantsRes] = await Promise.all([
      supabase.from('user_profiles').select('*').in('role', ['user', 'builder', 'admin']),
      // Deliberately unscoped: the full directory spans every event.
      supabase.from('campers').select('*'),
      supabase.from('camper_photos').select('*').order('display_order'),
      supabase.from('events').select('*'),
      event
        ? supabase.from('event_participants').select('*').eq('event_id', event.id)
        : Promise.resolve({ data: [] }),
    ])

    const profiles = (profilesRes.data ?? []) as unknown as UserProfileRow[]
    const campers = (campersRes.data ?? []) as unknown as CamperRow[]
    const photos = (photosRes.data ?? []) as unknown as CamperPhotoRow[]
    const events = (eventsRes.data ?? []) as unknown as EventRow[]
    const participants = (participantsRes.data ?? []) as unknown as EventParticipantRow[]

    const eventsById = new Map(events.map(e => [e.id, e]))
    const profilesByKey = new Map(profiles.map(p => [entryKey(p), p]))
    setCampersById(new Map(campers.map(c => [c.id, c])))

    const photosByUser = new Map<string, CamperPhotoRow[]>()
    photos.forEach(p => {
      const existing = photosByUser.get(p.user_id) || []
      existing.push(p)
      photosByUser.set(p.user_id, existing)
    })

    // ── Tab 2: everyone who has ever camped with the Deli ──
    const byKey = new Map<string, DirectoryEntry>()
    profiles.forEach(profile => {
      const key = entryKey(profile)
      byKey.set(key, { key, profile, camper: null, photos: photosByUser.get(profile.id) ?? [], events: [] })
    })

    const newestFirst = [...campers].sort(
      (a, b) => camperRecency(b, eventsById).localeCompare(camperRecency(a, eventsById))
    )
    newestFirst.forEach(camper => {
      const key = entryKey(camper)
      let entry = byKey.get(key)
      if (!entry) {
        const profile = profilesByKey.get(key) ?? null
        entry = { key, profile, camper: null, photos: profile ? photosByUser.get(profile.id) ?? [] : [], events: [] }
        byKey.set(key, entry)
      }
      entry.camper ??= camper
      const camperEvent = camper.event_id ? eventsById.get(camper.event_id) : undefined
      if (camperEvent && !entry.events.some(e => e.id === camperEvent.id)) entry.events.push(camperEvent)
    })

    // ── Tab 1: the roster of the current event ──
    const participantCamperIds = new Set(
      participants.map(p => p.camper_id).filter((id): id is string => !!id)
    )
    const eventCampers = event
      ? campers.filter(c => c.event_id === event.id || participantCamperIds.has(c.id))
      : []
    const roster: DirectoryEntry[] = eventCampers.map(camper => {
      const key = entryKey(camper)
      const profile = profilesByKey.get(key) ?? null
      return {
        key,
        profile,
        camper,
        photos: profile ? photosByUser.get(profile.id) ?? [] : [],
        events: event ? [event] : [],
      }
    })

    // Only people going to the current event get tab 1. Campers from a past
    // event who are not on this roster keep the full directory, nothing more.
    const myProfile = user ? profiles.find(p => p.id === user.id) ?? null : null
    const myEmail = (user?.email || myProfile?.email || '').trim().toLowerCase()
    const attending =
      myProfile?.role === 'admin' ||
      (!!myProfile?.person_id && participants.some(
        p => p.person_id === myProfile.person_id && p.status !== 'withdrawn' && p.status !== 'no_show'
      )) ||
      eventCampers.some(c => c.id === myProfile?.camper_id || (!!myEmail && entryKey(c) === myEmail))

    const showEventTab = !!event && roster.length > 0 && attending

    setIsAdmin(myProfile?.role === 'admin')
    setOpsEvent(event)
    setOffseason(isInformationStage(event))
    setAllEntries([...byKey.values()].sort(byDisplayName))
    setEventEntries(roster.sort(byDisplayName))
    setCanSeeEventTab(showEventTab)
    setActiveTab(showEventTab ? EVENT_TAB : ALL_TAB)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchDirectory()
  }, [fetchDirectory])

  const tabs: Tab[] = useMemo(() => {
    const list: Tab[] = []
    if (canSeeEventTab && opsEvent) {
      list.push({ id: EVENT_TAB, label: `${shortEventLabel(opsEvent)} Rats`, icon: '🔥' })
    }
    list.push({ id: ALL_TAB, label: 'Full Camper Directory', icon: '📖' })
    return list
  }, [canSeeEventTab, opsEvent])

  const source = activeTab === EVENT_TAB ? eventEntries : allEntries
  const filtered = source.filter(entry => {
    const term = searchTerm.toLowerCase()
    return (
      (entry.profile?.email || entry.camper?.email || '').toLowerCase().includes(term) ||
      (entry.camper?.full_name || '').toLowerCase().includes(term) ||
      (entry.camper?.playa_name || '').toLowerCase().includes(term)
    )
  })

  const getPhotoUrl = (path: string) => {
    const supabase = createClient()
    const { data } = supabase.storage.from('camper-photos').getPublicUrl(path)
    return data.publicUrl
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="h-36 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const showTentBadges = activeTab === EVENT_TAB && !offseason
  // The full directory spans every event; non-admins only get the public blurb there.
  const showContactDetails = isAdmin || activeTab === EVENT_TAB

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-black uppercase tracking-wider">🐀 Camp Directory</h1>
      </div>

      {tabs.length > 1 && (
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="mb-6" />
      )}

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="inline-flex items-center gap-3 border-2 border-black bg-yellow-50 px-4 py-2">
          <span className="text-3xl font-black tabular-nums">{source.length}</span>
          <span className="text-xs font-bold uppercase tracking-widest text-gray-600">
            {activeTab === EVENT_TAB ? 'On This Roster' : 'Camper Count'}
          </span>
        </div>
        <p className="text-sm text-gray-600">
          {activeTab === EVENT_TAB && opsEvent
            ? `Everyone camping at ${opsEvent.name}.`
            : 'Everyone who has ever camped with NYC Deli.'}
        </p>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Search by name, playa name, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Selected Camper Modal */}
      {selectedCamper && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedCamper(null)}
        >
          <Card
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto border-2 border-yellow-400 bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">{displayName(selectedCamper)}</CardTitle>
                  <CardDescription>
                    {selectedCamper.camper?.playa_name && (
                      <span className="text-yellow-700 font-bold">
                        &quot;{selectedCamper.camper.playa_name}&quot;
                      </span>
                    )}
                  </CardDescription>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedCamper(null)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Photos */}
              {selectedCamper.photos.length > 0 && (
                <div className="flex gap-4 flex-wrap">
                  {selectedCamper.photos.map(photo => (
                    <div key={photo.id} className="w-32 h-32 border-2 border-black overflow-hidden">
                      <Image
                        src={getPhotoUrl(photo.storage_path)}
                        alt="Camper photo"
                        className="w-full h-full object-cover"
                        width={128}
                        height={128}
                        unoptimized
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Deli history */}
              {selectedCamper.events.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-1">Deli Events</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedCamper.events.map(e => (
                      <Badge key={e.id} variant="default">{e.name}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Bio */}
              {selectedCamper.profile?.bio && (
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-1">About</h4>
                  <p className="text-sm">{selectedCamper.profile.bio}</p>
                </div>
              )}

              {/* Contact & Info */}
              {showContactDetails && selectedCamper.camper && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div className="min-w-0">
                    <span className="text-gray-500 block">Email</span>
                    <span className="font-bold break-all">{selectedCamper.camper.email}</span>
                  </div>
                  {selectedCamper.camper.phone && (
                    <div className="min-w-0">
                      <span className="text-gray-500 block">Phone</span>
                      <span className="font-bold">{selectedCamper.camper.phone}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500 block">Shelter</span>
                    <span className="font-bold capitalize">{selectedCamper.camper.shelter_type}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Arrival</span>
                    <span className="font-bold">{selectedCamper.camper.arrival_date}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Build Week</span>
                    <span className="font-bold">{selectedCamper.camper.build_week_attending ? 'Yes' : 'No'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Kitchen</span>
                    <span className="font-bold">{selectedCamper.camper.kitchen_participation ? 'Yes' : 'No'}</span>
                  </div>
                  {(() => {
                    const mates = resolveTentMateIds(selectedCamper.camper.id, [...campersById.values()])
                      .map(id => campersById.get(id))
                      .filter((c): c is CamperRow => !!c)
                    if (mates.length === 0) return null
                    return (
                      <div>
                        <span className="text-gray-500 block">Sharing Tent With</span>
                        <span className="font-bold">
                          {mates.map(m => m.playa_name ? `${m.full_name} ("${m.playa_name}")` : m.full_name).join(', ')}
                        </span>
                      </div>
                    )
                  })()}
                </div>
              )}

              {showContactDetails && selectedCamper.camper?.skills && selectedCamper.camper.skills.length > 0 && (
                <div>
                  <span className="text-gray-500 block text-sm mb-1">Skills</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedCamper.camper.skills.map(s => (
                      <Badge key={s} variant="default">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Directory Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
        {filtered.map(entry => (
          <button
            key={entry.key}
            onClick={() => setSelectedCamper(entry)}
            className={cn(
              'text-left border-2 border-black p-2 transition-all hover:bg-yellow-50 hover:border-yellow-400',
              selectedCamper?.key === entry.key && 'bg-yellow-50 border-yellow-400'
            )}
          >
            {/* Avatar / First Photo */}
            <div className="w-full aspect-square bg-gray-100 border border-gray-200 mb-2 overflow-hidden flex items-center justify-center">
              {entry.photos.length > 0 ? (
                <Image
                  src={getPhotoUrl(entry.photos[0].storage_path)}
                  alt={entry.camper?.full_name || 'Camper'}
                  className="w-full h-full object-cover"
                  width={160}
                  height={160}
                  unoptimized
                />
              ) : (
                <span className="text-2xl">🐀</span>
              )}
            </div>

            <h3 className="font-bold text-xs leading-tight truncate">{displayName(entry)}</h3>
            {entry.camper?.playa_name && (
              <p className="text-[11px] text-yellow-700 font-bold truncate">
                &quot;{entry.camper.playa_name}&quot;
              </p>
            )}
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {entry.profile?.role === 'admin' && <Badge variant="info" className="px-1.5 py-0 text-[10px]">Admin</Badge>}
              {entry.camper?.build_week_attending && <Badge variant="default" className="px-1.5 py-0 text-[10px]">Builder</Badge>}
              {activeTab === ALL_TAB && entry.events.map(e => (
                <Badge key={e.id} variant="default" className="px-1.5 py-0 text-[10px]">
                  {shortEventLabel(e)}
                </Badge>
              ))}
              {/* Tent sharing belongs to a specific event — once it's archived
                  the tag is history, so it stays on the detail view only. */}
              {showTentBadges && entry.camper && (() => {
                const mates = resolveTentMateIds(entry.camper.id, [...campersById.values()])
                  .map(id => campersById.get(id))
                  .filter((c): c is CamperRow => !!c)
                if (mates.length === 0) return null
                const label = mates.map(m => m.playa_name || m.full_name).join(', ')
                return (
                  <Badge variant="info" className="px-1.5 py-0 text-[10px]">
                    🏕️ w/ {label}
                  </Badge>
                )
              })()}
            </div>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-4">🔍</p>
          <p className="font-bold uppercase tracking-wider">No campers found</p>
        </div>
      )}
    </div>
  )
}
