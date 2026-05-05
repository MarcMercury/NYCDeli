'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import type { FloorplanObjectRow } from '@/types/database'

/* ── CSV path (served from public/) ─────────────────────────────── */
const CSV_PATH =
  '/Campers/NYC%20Deli%20Camp%20Registration%20%2B%20Burning%20Man%2026%20%20(Responses)%20-%20Form%20Responses%201.csv'

/* ── Bucket definitions ─────────────────────────────────────────
 * Buckets are tried in order; the first one whose maxW/maxL covers the
 * tent's short/long sides wins. Sizes below match the layout spot
 * inventory used in the Admin Layout Builder so every spot lands in a
 * named bucket (no real spot should fall through to "Oversized").
 *   - 11×11     → standard small tent (Coleman 10×10, Kodiak 9×8, etc.)
 *   - 11×15     → medium tent (10×14, 10×12.5, Shiftpod III 11×12, ...)
 *   - 13×13     → large square (Shiftpod 12×12, REI 12.6×8.4, ...)
 *   - 14×14     → extra-large square (covers 12×14, 13×14, 14×14 spots)
 *   - 12×18     → long No Bake / 18-ft tents (10×18, 10×17.5, 18×10)
 */
const TENT_BUCKETS = [
  { label: '11×11', maxW: 11, maxL: 11 },
  { label: '11×15', maxW: 11, maxL: 15 },
  { label: '13×13', maxW: 13, maxL: 13 },
  { label: '14×14', maxW: 14, maxL: 14 },
  { label: '12×18', maxW: 12, maxL: 18 },
] as const

type BucketLabel = (typeof TENT_BUCKETS)[number]['label'] | 'Oversized' | 'RV' | 'Unknown'
const ALL_BUCKETS: BucketLabel[] = ['11×11', '11×15', '13×13', '14×14', '12×18', 'Oversized', 'RV', 'Unknown']

/* ── CSV parser (handles quoted fields / newlines) ─────────────── */
function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  const lines: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') { inQ = !inQ; cur += ch }
    else if (ch === '\n' && !inQ) { lines.push(cur); cur = '' }
    else if (ch === '\r' && !inQ) { /* skip */ }
    else cur += ch
  }
  if (cur.trim()) lines.push(cur)
  for (const line of lines) {
    const fields: string[] = []
    let f = ''
    let q = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { if (q && line[i + 1] === '"') { f += '"'; i++ } else q = !q }
      else if (ch === ',' && !q) { fields.push(f); f = '' }
      else f += ch
    }
    fields.push(f)
    rows.push(fields)
  }
  return rows
}

/* ── Tent dimension parser ─────────────────────────────────────── */
function parseTentSize(raw: string): { w: number | null; l: number | null; isRV: boolean } {
  if (!raw) return { w: null, l: null, isRV: false }
  const s = raw.trim()
  const lo = s.toLowerCase()

  // RV detection (word-boundary to avoid matching "ever", "river", etc.)
  if (/\brv\b/i.test(s) || /\bsprinter\b/i.test(lo) || /\btrailer\b/i.test(lo) || /\bcamper van\b/i.test(lo) || /\bmotor\b/i.test(lo))
    return { w: null, l: null, isRV: true }

  // No tent / TBD / unknown
  if (/^(no tent|n\/a|na|none|tbd|unknown|\?|-|solo|test)$/i.test(s))
    return { w: null, l: null, isRV: false }

  // Bracket notation: [18][10] -> 18x10
  const bracket = s.match(/\[(\d+\.?\d*)\]\s*\[(\d+\.?\d*)\]/)
  if (bracket) return { w: parseFloat(bracket[1]), l: parseFloat(bracket[2]), isRV: false }

  // "W x L" patterns with optional unit markers (ft, ', ")
  // Handles: 10x10, 10'x10', 14x10, 10.7 W x 12 L, 10 * 17.5, etc.
  let m = s.match(/(\d+\.?\d*)\s*['"]?\s*(?:ft|feet|W)?\s*[xX×*]\s*(\d+\.?\d*)\s*['"]?\s*(?:ft|feet|L)?/)
  if (m) return { w: parseFloat(m[1]), l: parseFloat(m[2]), isRV: false }

  // "W by L"
  m = s.match(/(\d+\.?\d*)\s*by\s*(\d+\.?\d*)/i)
  if (m) return { w: parseFloat(m[1]), l: parseFloat(m[2]), isRV: false }

  // "W'L x H" feet-tick notation: e.g. "10'14"
  m = s.match(/(\d+\.?\d*)\s*'\s*(\d+\.?\d*)/)
  if (m && parseFloat(m[2]) > 3) return { w: parseFloat(m[1]), l: parseFloat(m[2]), isRV: false }

  // "10'L x 9'W" — labeled feet
  m = s.match(/(\d+\.?\d*)\s*'?\s*L\s*[xX×*]\s*(\d+\.?\d*)\s*'?\s*W/i)
  if (m) return { w: parseFloat(m[2]), l: parseFloat(m[1]), isRV: false }

  // "W W x L L x H H" (with W/L/H labels, e.g. Shiftpod format)
  m = s.match(/(\d+\.?\d*)\s*W\s*[xX×*]\s*(\d+\.?\d*)\s*L/i)
  if (m) return { w: parseFloat(m[1]), l: parseFloat(m[2]), isRV: false }

  // Bare "WxL" anywhere in longer text
  m = s.match(/(\d+\.?\d*)\s*[xX×]\s*(\d+\.?\d*)/)
  if (m) return { w: parseFloat(m[1]), l: parseFloat(m[2]), isRV: false }

  return { w: null, l: null, isRV: false }
}

/* ── Classify into bucket ──────────────────────────────────────── */
function toBucket(w: number | null, l: number | null, isRV: boolean): BucketLabel {
  if (isRV) return 'RV'
  if (w == null || l == null || w <= 0 || l <= 0) return 'Unknown'
  const lo = Math.min(w, l)
  const hi = Math.max(w, l)
  for (const b of TENT_BUCKETS) {
    if (lo <= b.maxW && hi <= b.maxL) return b.label
  }
  return 'Oversized'
}

/* ── Classify a floorplan tent object into same buckets ─────────── */
function classifySpot(obj: FloorplanObjectRow): BucketLabel {
  const w = Math.min(obj.width_ft, obj.height_ft)
  const l = Math.max(obj.width_ft, obj.height_ft)
  if (w <= 0 || l <= 0) return 'Unknown'
  for (const b of TENT_BUCKETS) {
    if (w <= b.maxW && l <= b.maxL) return b.label
  }
  return 'Oversized'
}

/* ── Sharing pair detection ────────────────────────────────────── */
function normalize(n: string): string {
  return n.toLowerCase().replace(/[^a-z]/g, '')
}

function isNoSharing(s: string): boolean {
  const lo = s.toLowerCase().trim()
  return ['', 'no', 'n/a', 'na', 'only me!', 'heck no', 'probably not'].includes(lo)
}

function findSharingPairs(
  names: string[],
  sharingMap: Map<string, string>,
): [string, string][] {
  const pairs: [string, string][] = []
  const used = new Set<string>()

  for (const name of names) {
    if (used.has(name)) continue
    const raw = sharingMap.get(name) ?? ''
    if (isNoSharing(raw)) continue

    // Clean the sharing text: strip prefixes like "Yes, ", "Sharing with ", "My wife ", etc.
    const cleaned = raw
      .replace(/^(yes[,!]?\s*)/i, '')
      .replace(/^(sharing\s+(a\s+)?tent\s+with\s*)/i, '')
      .replace(/^(with\s+)/i, '')
      .replace(/^(my\s+(wife|husband|partner|spouse)\s*,?\s*)/i, '')
      .trim()

    // Try to match a camper name
    const cleanedNorm = normalize(cleaned)
    let match: string | null = null

    for (const other of names) {
      if (other === name || used.has(other)) continue
      const otherNorm = normalize(other)

      // Direct substring match (at least 5 chars)
      if (cleanedNorm.length >= 5 && (cleanedNorm.includes(otherNorm) || otherNorm.includes(cleanedNorm))) {
        match = other
        break
      }

      // Word overlap: split both into words and find distinctive matches
      const cleanedWords = new Set(cleaned.toLowerCase().split(/\s+/).filter(w => w.length >= 3))
      const otherWords = other.toLowerCase().replace(/[()]/g, ' ').split(/\s+/).filter(w => w.length >= 3)
      const common = new Set(['yes', 'the', 'and', 'with', 'will', 'also', 'tent', 'sharing', 'partner',
        'wife', 'husband', 'spouse', 'friend', 'people', 'person', 'two', 'our', 'her', 'his', 'not', 'yet',
        'but', 'who', 'she', 'have', 'about', 'that', 'this', 'from', 'are', 'for', 'been'])
      const matchedWords = otherWords.filter(w => cleanedWords.has(w) && !common.has(w))

      if (matchedWords.length >= 2) {
        match = other
        break
      }
      // Single distinctive word (≥4 chars)
      if (matchedWords.length === 1 && matchedWords[0].length >= 4) {
        match = other
        break
      }
    }

    if (match) {
      used.add(name)
      used.add(match)
      pairs.push([name, match])
    }
  }

  return pairs
}

/* ── Per-camper parsed data ────────────────────────────────────── */
interface CamperInfo {
  name: string
  w: number | null
  l: number | null
  isRV: boolean
  bucket: BucketLabel
  sharingWith: string | null  // matched partner name, or null
}

/* ── A "tent need" = one tent required (solo camper or sharing pair) */
interface TentNeed {
  /** Display label (solo name or "A & B") */
  label: string
  /** Short side (ft) — null for Unknown */
  shortSide: number | null
  /** Long side (ft) — null for Unknown */
  longSide: number | null
  isRV: boolean
  bucket: BucketLabel
  campers: CamperInfo[]
}

/* ── A layout spot available for allocation */
interface SpotInfo {
  id: string
  label: string
  shortSide: number
  longSide: number
  bucket: BucketLabel
}

/* ── Allocation result per tent need */
interface Allocation {
  need: TentNeed
  spot: SpotInfo | null          // null = unplaced
}

/* ── Can a spot physically fit a tent? ──────────────────────────── */
function spotFitsTent(spot: SpotInfo, need: TentNeed): boolean {
  if (need.shortSide == null || need.longSide == null) return false
  return spot.shortSide >= need.shortSide && spot.longSide >= need.longSide
}

/* ── Props ─────────────────────────────────────────────────────── */
interface TentSizeSummaryProps {
  objects: FloorplanObjectRow[]
}

export function TentSizeSummary({ objects }: TentSizeSummaryProps) {
  const [csvCampers, setCsvCampers] = useState<CamperInfo[]>([])
  const [sharingPairs, setSharingPairs] = useState<[string, string][]>([])
  const [loading, setLoading] = useState(true)
  const [dataSource, setDataSource] = useState<'supabase' | 'csv' | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [expandedBucket, setExpandedBucket] = useState<string | null>(null)

  const loadFromCSV = useCallback(async (): Promise<{ campers: CamperInfo[]; pairs: [string, string][] } | null> => {
    try {
      const res = await fetch(CSV_PATH)
      if (!res.ok) return null
      const text = await res.text()
      // If we got an HTML page instead of CSV, bail
      if (text.trimStart().startsWith('<')) return null
      const rows = parseCSV(text.startsWith('\uFEFF') ? text.slice(1) : text)
      if (rows.length < 2) return null

      const headers = rows[0]
      const tentCol = headers.findIndex(h => h.toLowerCase().includes('tent size') || h.toLowerCase().includes('tent dimensions'))
      const nameCol = headers.findIndex(h => h.toLowerCase().includes('full name'))
      const sharingCol = headers.findIndex(h => h.toLowerCase().includes('sharing your tent'))

      if (nameCol < 0 || tentCol < 0) return null

      const names: string[] = []
      const sharingMap = new Map<string, string>()
      const camperList: CamperInfo[] = []

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i]
        const name = (row[nameCol] ?? '').trim()
        if (!name) continue

        const tentRaw = (row[tentCol] ?? '').trim()
        const sharingRaw = sharingCol >= 0 ? (row[sharingCol] ?? '').trim() : ''

        const { w, l, isRV } = parseTentSize(tentRaw)
        const bucket = toBucket(w, l, isRV)

        names.push(name)
        sharingMap.set(name, sharingRaw)
        camperList.push({ name, w, l, isRV, bucket, sharingWith: null })
      }

      // Detect sharing pairs
      const pairs = findSharingPairs(names, sharingMap)

      // Mark sharing partners
      const partnerOf = new Map<string, string>()
      for (const [a, b] of pairs) {
        partnerOf.set(a, b)
        partnerOf.set(b, a)
      }
      for (const c of camperList) {
        c.sharingWith = partnerOf.get(c.name) ?? null
      }

      return { campers: camperList, pairs }
    } catch {
      return null
    }
  }, [])

  const loadFromSupabase = useCallback(async (): Promise<{ campers: CamperInfo[]; pairs: [string, string][] } | null> => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('campers')
        .select('id, full_name, shelter_type, shelter_width_ft, shelter_length_ft, sharing_tent_with')
        .order('full_name')
      if (!data || data.length === 0) return null

      type Row = { id: string; full_name: string; shelter_type: string; shelter_width_ft: number; shelter_length_ft: number; sharing_tent_with: string | null }
      const rows = data as unknown as Row[]

      const camperList: CamperInfo[] = []
      const idToName = new Map<string, string>()

      for (const row of rows) {
        const name = row.full_name ?? ''
        if (!name) continue
        idToName.set(row.id, name)
        const isRV = row.shelter_type === 'rv' || row.shelter_type === 'vehicle'
        const w = isRV ? null : (row.shelter_width_ft > 0 ? row.shelter_width_ft : null)
        const l = isRV ? null : (row.shelter_length_ft > 0 ? row.shelter_length_ft : null)
        const bucket = toBucket(w, l, isRV)
        camperList.push({ name, w, l, isRV, bucket, sharingWith: null })
      }

      // Build sharing pairs from the sharing_tent_with FK column
      const pairs: [string, string][] = []
      const pairedIds = new Set<string>()
      for (const row of rows) {
        if (!row.sharing_tent_with || pairedIds.has(row.id)) continue
        const partnerName = idToName.get(row.sharing_tent_with)
        if (!partnerName) continue
        // Only record each pair once (avoid A→B and B→A duplication)
        pairedIds.add(row.id)
        pairedIds.add(row.sharing_tent_with)
        const myName = row.full_name ?? ''
        if (myName) pairs.push([myName, partnerName])
      }

      // Mark sharing partners on camper info
      const partnerOf = new Map<string, string>()
      for (const [a, b] of pairs) {
        partnerOf.set(a, b)
        partnerOf.set(b, a)
      }
      for (const c of camperList) {
        c.sharingWith = partnerOf.get(c.name) ?? null
      }

      return { campers: camperList, pairs }
    } catch {
      return null
    }
  }, [])

  // Initial load: prefer Supabase (live data), fall back to CSV (static snapshot)
  useEffect(() => {
    async function load() {
      try {
        const sbResult = await loadFromSupabase()
        if (sbResult) {
          setCsvCampers(sbResult.campers)
          setSharingPairs(sbResult.pairs)
          setDataSource('supabase')
          return
        }
        const csvResult = await loadFromCSV()
        if (csvResult) {
          setCsvCampers(csvResult.campers)
          setSharingPairs(csvResult.pairs)
          setDataSource('csv')
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [loadFromCSV, loadFromSupabase])

  // Re-fetch when the user tabs back to this page (covers profile edits in another tab)
  useEffect(() => {
    async function onVisible() {
      if (document.visibilityState === 'visible') {
        const result = await loadFromSupabase()
        if (result) {
          setCsvCampers(result.campers)
          setSharingPairs(result.pairs)
          setDataSource('supabase')
        }
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [loadFromSupabase])

  // Realtime subscription: re-fetch from Supabase when campers table changes
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('tent-size-summary-campers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campers' }, async () => {
        const result = await loadFromSupabase()
        if (result) {
          setCsvCampers(result.campers)
          setSharingPairs(result.pairs)
          setDataSource('supabase')
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [loadFromSupabase])

  // ── Build tent needs (one per solo camper or sharing pair) ───────
  const { tentNeeds, spots, allocations, unplaced, shortageByBucket, totalNeeded, totalPlaced } = useMemo(() => {
    // --- 1. Build tent needs from campers ---
    const pairNames = new Set<string>()
    for (const [a, b] of sharingPairs) { pairNames.add(a); pairNames.add(b) }

    const needs: TentNeed[] = []
    const usedInPair = new Set<string>()

    // Sharing pairs → 1 tent per pair (use the larger tent dimensions)
    for (const [a, b] of sharingPairs) {
      const ca = csvCampers.find(c => c.name === a)
      const cb = csvCampers.find(c => c.name === b)
      if (!ca || !cb) continue
      usedInPair.add(a)
      usedInPair.add(b)

      // Pick the larger tent dims (by area), prefer known over unknown
      let w: number | null = null, l: number | null = null, isRV = false
      const areaA = (ca.w ?? 0) * (ca.l ?? 0)
      const areaB = (cb.w ?? 0) * (cb.l ?? 0)
      if (areaA >= areaB && ca.w != null && ca.l != null) {
        w = ca.w; l = ca.l; isRV = ca.isRV
      } else if (cb.w != null && cb.l != null) {
        w = cb.w; l = cb.l; isRV = cb.isRV
      } else if (ca.w != null && ca.l != null) {
        w = ca.w; l = ca.l; isRV = ca.isRV
      }

      const shortSide = w != null && l != null ? Math.min(w, l) : null
      const longSide = w != null && l != null ? Math.max(w, l) : null
      const bucket = toBucket(shortSide, longSide, isRV)

      needs.push({
        label: `${ca.name} & ${cb.name}`,
        shortSide, longSide, isRV, bucket,
        campers: [ca, cb],
      })
    }

    // Solo campers → 1 tent each
    for (const c of csvCampers) {
      if (usedInPair.has(c.name)) continue
      const shortSide = c.w != null && c.l != null ? Math.min(c.w, c.l) : null
      const longSide = c.w != null && c.l != null ? Math.max(c.w, c.l) : null
      needs.push({
        label: c.name,
        shortSide, longSide, isRV: c.isRV, bucket: c.bucket,
        campers: [c],
      })
    }

    // --- 2. Build available spots from layout objects ---
    const tentObjects = objects.filter(o => o.object_type === 'tent')
    const spotList: SpotInfo[] = tentObjects.map(obj => {
      const s = Math.min(obj.width_ft, obj.height_ft)
      const l = Math.max(obj.width_ft, obj.height_ft)
      return {
        id: obj.id,
        label: obj.label || `${obj.width_ft}×${obj.height_ft}`,
        shortSide: s,
        longSide: l,
        bucket: classifySpot(obj),
      }
    })

    // --- 3. Greedy best-fit allocation ---
    // Sort needs: largest (by area) first → hardest to place first
    const sortedNeeds = [...needs]
      .filter(n => !n.isRV && n.shortSide != null && n.longSide != null)
      .sort((a, b) => (b.shortSide! * b.longSide!) - (a.shortSide! * a.longSide!))

    const rvNeeds = needs.filter(n => n.isRV)
    const unknownNeeds = needs.filter(n => !n.isRV && (n.shortSide == null || n.longSide == null))

    const availableSpots = new Set(spotList.map((_, i) => i))
    const allocs: Allocation[] = []

    for (const need of sortedNeeds) {
      // Find the smallest fitting spot (minimize wasted space)
      let bestIdx: number | null = null
      let bestArea = Infinity

      for (const si of availableSpots) {
        const spot = spotList[si]
        if (spotFitsTent(spot, need)) {
          const area = spot.shortSide * spot.longSide
          if (area < bestArea) {
            bestArea = area
            bestIdx = si
          }
        }
      }

      if (bestIdx !== null) {
        allocs.push({ need, spot: spotList[bestIdx] })
        availableSpots.delete(bestIdx)
      } else {
        allocs.push({ need, spot: null })
      }
    }

    // RV and Unknown needs are not allocated to tent spots
    for (const need of [...rvNeeds, ...unknownNeeds]) {
      allocs.push({ need, spot: null })
    }

    const placed = allocs.filter(a => a.spot !== null && !a.need.isRV)
    const unplacedList = allocs.filter(a => a.spot === null && !a.need.isRV && a.need.shortSide != null && a.need.longSide != null)

    // --- 4. Compute shortage: what minimum extra spots are needed ---
    // For each unplaced need, determine the smallest bucket that would fit it
    const shortage = new Map<BucketLabel, number>()
    for (const b of ALL_BUCKETS) shortage.set(b, 0)
    for (const a of unplacedList) {
      const bucket = a.need.bucket
      shortage.set(bucket, (shortage.get(bucket) ?? 0) + 1)
    }

    const tentNeedsCount = sortedNeeds.length
    const tentPlacedCount = placed.length

    return {
      tentNeeds: needs,
      spots: spotList,
      allocations: allocs,
      unplaced: unplacedList,
      shortageByBucket: shortage,
      totalNeeded: tentNeedsCount,
      totalPlaced: tentPlacedCount,
    }
  }, [csvCampers, sharingPairs, objects])

  // Count remaining unused spots
  const unusedSpots = spots.length - totalPlaced

  return (
    <Card className="border-2 border-black">
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setCollapsed(!collapsed)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            ⛺ Tent Size Summary
            {!loading && (
              <Badge className={totalPlaced >= totalNeeded ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}>
                {totalPlaced}/{totalNeeded} placed
              </Badge>
            )}
          </CardTitle>
          <span className="text-gray-400 text-xs">{collapsed ? '▶' : '▼'}</span>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="pt-0 space-y-2">
          {loading ? (
            <p className="text-xs text-gray-400 animate-pulse">Loading camper data...</p>
          ) : (
            <>
              {/* Sharing pairs count */}
              {sharingPairs.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 px-2 py-1.5 space-y-0.5">
                  <p className="text-[10px] text-blue-700 font-bold">
                    🤝 {sharingPairs.length} sharing pair{sharingPairs.length !== 1 ? 's' : ''} ({sharingPairs.length * 2} campers → {sharingPairs.length} tent{sharingPairs.length !== 1 ? 's' : ''}, saving {sharingPairs.length} tent{sharingPairs.length !== 1 ? 's' : ''})
                  </p>
                  <div className="text-[9px] text-blue-600 space-y-0 max-h-[80px] overflow-y-auto">
                    {tentNeeds.filter(n => n.campers.length > 1).map((n, i) => {
                      const dims = n.shortSide != null && n.longSide != null ? ` (${n.shortSide}×${n.longSide})` : ''
                      return <div key={i}>{n.label}{dims}</div>
                    })}
                  </div>
                </div>
              )}

              {/* Tent count math breakdown */}
              <div className="bg-gray-50 border border-gray-200 px-2 py-1.5 text-[10px] text-gray-600 space-y-0.5">
                <div className="font-bold text-gray-700 uppercase tracking-wider text-[9px] mb-0.5">How tent count is calculated:</div>
                <div className="flex justify-between"><span>{csvCampers.length} total campers</span></div>
                <div className="flex justify-between"><span>− {tentNeeds.filter(n => n.isRV).length} RV / no tent needed</span></div>
                <div className="flex justify-between"><span>− {tentNeeds.filter(n => !n.isRV && n.shortSide == null).length} unknown tent size</span></div>
                <div className="flex justify-between"><span>− {sharingPairs.length} saved by sharing (2 campers → 1 tent)</span></div>
                <div className="flex justify-between border-t border-gray-300 pt-0.5 font-bold text-gray-800">
                  <span>= {totalNeeded} tents needed</span>
                </div>
              </div>

              {/* Overall status */}
              <div className={`px-2 py-1.5 border text-xs font-bold ${
                unplaced.length === 0 ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-red-50 border-red-300 text-red-800'
              }`}>
                {unplaced.length === 0
                  ? `✓ All ${totalNeeded} tent${totalNeeded !== 1 ? 's' : ''} can be accommodated` 
                  : `⚠ ${unplaced.length} tent${unplaced.length !== 1 ? 's' : ''} cannot fit — need more spots`}
                {unusedSpots > 0 && (
                  <span className="ml-1 font-normal text-gray-500">({unusedSpots} unused spot{unusedSpots !== 1 ? 's' : ''})</span>
                )}
              </div>

              {/* Shortage breakdown — what more is needed */}
              {unplaced.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Additional spots needed:</p>
                  {ALL_BUCKETS.filter(b => b !== 'RV' && b !== 'Unknown' && (shortageByBucket.get(b) ?? 0) > 0).map(bucket => (
                    <div key={bucket} className="flex items-center justify-between px-2 py-1 border border-red-200 bg-red-50 text-xs">
                      <span className="font-black text-[11px]">{bucket}</span>
                      <span className="text-red-700 font-bold">+{shortageByBucket.get(bucket)} more</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Allocation by bucket */}
              <div className="space-y-1.5">
                {ALL_BUCKETS.map((bucket) => {
                  const bucketNeeds = tentNeeds.filter(n => n.bucket === bucket)
                  const bucketPlaced = allocations.filter(a => a.need.bucket === bucket && a.spot !== null)
                  const bucketUnplaced = allocations.filter(a => a.need.bucket === bucket && a.spot === null && !a.need.isRV && a.need.shortSide != null)
                  const isExpanded = expandedBucket === bucket
                  const isInfoBucket = bucket === 'RV' || bucket === 'Unknown'

                  if (bucketNeeds.length === 0) return null

                  const need = isInfoBucket ? 0 : bucketNeeds.length
                  const placed = bucketPlaced.length

                  return (
                    <div key={bucket}>
                      <button
                        onClick={() => setExpandedBucket(isExpanded ? null : bucket)}
                        className={`w-full text-left px-2 py-1.5 border text-xs flex items-center justify-between ${
                          isInfoBucket ? 'bg-gray-50 border-gray-200'
                          : bucketUnplaced.length === 0 ? 'bg-emerald-50 border-emerald-300'
                          : 'bg-red-50 border-red-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-black text-[11px] min-w-[60px]">{bucket}</span>
                          <span className={`font-bold ${
                            isInfoBucket ? 'text-gray-500'
                            : bucketUnplaced.length === 0 ? 'text-emerald-600'
                            : 'text-red-600'
                          }`}>
                            {isInfoBucket
                              ? `${bucketNeeds.length} camper${bucketNeeds.length !== 1 ? 's' : ''}`
                              : `${placed}/${need} placed`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {!isInfoBucket && need > 0 && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              bucketUnplaced.length === 0 ? 'bg-emerald-200 text-emerald-800'
                              : 'bg-red-200 text-red-800'
                            }`}>
                              {bucketUnplaced.length === 0 ? '✓' : `-${bucketUnplaced.length}`}
                            </span>
                          )}
                          <span className="text-gray-400">{isExpanded ? '▾' : '▸'}</span>
                        </div>
                      </button>

                      {/* Expanded — show each tent need and its allocation */}
                      {isExpanded && bucketNeeds.length > 0 && (
                        <div className="ml-2 mt-1 border-l-2 border-gray-200 pl-2 space-y-0.5 max-h-[250px] overflow-y-auto">
                          {allocations.filter(a => a.need.bucket === bucket).map((a, idx) => {
                            const n = a.need
                            const dims = n.shortSide != null && n.longSide != null ? `${n.shortSide}×${n.longSide}` : '—'
                            const isPlaced = a.spot !== null
                            const isInfo = n.isRV || (n.shortSide == null && n.longSide == null)
                            return (
                              <div key={idx} className={`text-[10px] flex justify-between ${
                                isInfo ? 'text-gray-500' : isPlaced ? 'text-gray-600' : 'text-red-600 font-semibold'
                              }`}>
                                <span className="flex items-center gap-1">
                                  {!isInfo && (isPlaced ? <span className="text-emerald-500">✓</span> : <span className="text-red-500">✗</span>)}
                                  {n.label}
                                </span>
                                <span className="ml-2 whitespace-nowrap flex items-center gap-1">
                                  <span className="text-gray-400">{dims}</span>
                                  {isPlaced && a.spot && (
                                    <span className="text-emerald-500 text-[9px]">→ {a.spot.label}</span>
                                  )}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Unplaced campers list */}
              {unplaced.length > 0 && (
                <div className="border-t pt-1.5 mt-2">
                  <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-1">Cannot fit in layout:</p>
                  <div className="space-y-0.5 max-h-[150px] overflow-y-auto">
                    {unplaced.map((a, idx) => (
                      <div key={idx} className="text-[10px] text-red-600 flex justify-between px-1">
                        <span>✗ {a.need.label}</span>
                        <span className="text-red-400">{a.need.shortSide}×{a.need.longSide} ({a.need.bucket})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Totals */}
              <div className="border-t pt-1.5 mt-2 flex justify-between text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                <span>Tents needed: {totalNeeded}</span>
                <span>Placed: {totalPlaced}</span>
                <span>Layout spots: {spots.length}</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>RV: {tentNeeds.filter(n => n.isRV).length}</span>
                <span>Unknown: {tentNeeds.filter(n => !n.isRV && n.shortSide == null).length}</span>
                <span>Campers: {csvCampers.length}</span>
                <span className={dataSource === 'supabase' ? 'text-emerald-500' : 'text-orange-500'}>
                  {dataSource === 'supabase' ? '● Live' : dataSource === 'csv' ? '● CSV (stale)' : '—'}
                </span>
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  )
}
