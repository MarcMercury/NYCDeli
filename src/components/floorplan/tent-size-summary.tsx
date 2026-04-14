'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import type { FloorplanObjectRow } from '@/types/database'

/* ── CSV path (served from public/) ─────────────────────────────── */
const CSV_PATH =
  '/Campers/NYC%20Deli%20Camp%20Registration%20%2B%20Burning%20Man%2026%20%20(Responses)%20-%20Form%20Responses%201.csv'

/* ── Bucket definitions (10×10 merged into 11×11) ──────────────── */
const TENT_BUCKETS = [
  { label: '11×11', maxW: 11, maxL: 11 },
  { label: '11×15', maxW: 11, maxL: 15 },
  { label: '13×13', maxW: 13, maxL: 13 },
] as const

type BucketLabel = (typeof TENT_BUCKETS)[number]['label'] | 'Oversized' | 'RV' | 'Unknown'
const ALL_BUCKETS: BucketLabel[] = ['11×11', '11×15', '13×13', 'Oversized', 'RV', 'Unknown']

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

/* ── Props ─────────────────────────────────────────────────────── */
interface TentSizeSummaryProps {
  objects: FloorplanObjectRow[]
}

export function TentSizeSummary({ objects }: TentSizeSummaryProps) {
  const [csvCampers, setCsvCampers] = useState<CamperInfo[]>([])
  const [sharingPairs, setSharingPairs] = useState<[string, string][]>([])
  const [loading, setLoading] = useState(true)
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
        .select('full_name, shelter_type, shelter_width_ft, shelter_length_ft, notes')
        .order('full_name')
      if (!data || data.length === 0) return null

      type Row = { full_name: string; shelter_type: string; shelter_width_ft: number; shelter_length_ft: number; notes: string | null }
      const rows = data as unknown as Row[]

      const names: string[] = []
      const sharingMap = new Map<string, string>()
      const camperList: CamperInfo[] = []

      for (const row of rows) {
        const name = row.full_name ?? ''
        if (!name) continue
        const isRV = row.shelter_type === 'rv' || row.shelter_type === 'vehicle'
        const w = isRV ? null : (row.shelter_width_ft > 0 ? row.shelter_width_ft : null)
        const l = isRV ? null : (row.shelter_length_ft > 0 ? row.shelter_length_ft : null)
        const bucket = toBucket(w, l, isRV)

        // Extract sharing info from notes field: "Tent sharing with: ..."
        const sharingMatch = (row.notes ?? '').match(/Tent sharing with:\s*(.+?)(?:\.|$)/i)
        const sharingRaw = sharingMatch ? sharingMatch[1].trim() : ''

        names.push(name)
        sharingMap.set(name, sharingRaw)
        camperList.push({ name, w, l, isRV, bucket, sharingWith: null })
      }

      const pairs = findSharingPairs(names, sharingMap)
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
        const result = await loadFromSupabase() ?? await loadFromCSV()
        if (result) {
          setCsvCampers(result.campers)
          setSharingPairs(result.pairs)
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
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [loadFromSupabase])

  // ── Compute need counts (sharing pairs = 1 tent, not 2) ────────
  const { campersByBucket, needByBucket, totalCampers } = useMemo(() => {
    const byBucket = new Map<BucketLabel, CamperInfo[]>()
    for (const b of ALL_BUCKETS) byBucket.set(b, [])
    for (const c of csvCampers) byBucket.get(c.bucket)!.push(c)

    // For each bucket, need = solo + sharing-pairs
    const need = new Map<BucketLabel, number>()
    const pairNames = new Set<string>()
    for (const [a, b] of sharingPairs) { pairNames.add(a); pairNames.add(b) }

    for (const bucket of ALL_BUCKETS) {
      const list = byBucket.get(bucket)!
      const soloCount = list.filter(c => !pairNames.has(c.name)).length

      // Count pairs where the "best" (non-unknown) bucket matches this bucket
      let pairCount = 0
      for (const [a, b] of sharingPairs) {
        const ca = csvCampers.find(c => c.name === a)
        const cb = csvCampers.find(c => c.name === b)
        // Pick the pair's bucket: prefer non-Unknown
        let pairBucket = ca?.bucket ?? 'Unknown'
        if (pairBucket === 'Unknown' && cb) pairBucket = cb.bucket
        if (pairBucket === bucket) pairCount++
      }

      need.set(bucket, soloCount + pairCount)
    }

    return { campersByBucket: byBucket, needByBucket: need, totalCampers: csvCampers.length }
  }, [csvCampers, sharingPairs])

  // ── Count layout tent objects by bucket ────────────────────────
  const haveByBucket = useMemo(() => {
    const tentObjects = objects.filter(o => o.object_type === 'tent')
    const have = new Map<BucketLabel, number>()
    for (const b of ALL_BUCKETS) have.set(b, 0)
    for (const obj of tentObjects) {
      const bucket = classifySpot(obj)
      have.set(bucket, (have.get(bucket) ?? 0) + 1)
    }
    return have
  }, [objects])

  const statusColor = (need: number, have: number) => {
    if (need === 0) return 'text-gray-400'
    if (have >= need) return 'text-emerald-600'
    if (have >= need * 0.75) return 'text-yellow-600'
    return 'text-red-600'
  }

  const statusBg = (need: number, have: number) => {
    if (need === 0) return 'bg-gray-50 border-gray-200'
    if (have >= need) return 'bg-emerald-50 border-emerald-300'
    if (have >= need * 0.75) return 'bg-yellow-50 border-yellow-300'
    return 'bg-red-50 border-red-300'
  }

  // Totals (tent buckets only, excluding RV/Unknown)
  const totalNeedTent = ALL_BUCKETS
    .filter(b => b !== 'RV' && b !== 'Unknown')
    .reduce((sum, b) => sum + (needByBucket.get(b) ?? 0), 0)
  const totalHaveTent = ALL_BUCKETS
    .filter(b => b !== 'RV' && b !== 'Unknown')
    .reduce((sum, b) => sum + (haveByBucket.get(b) ?? 0), 0)

  return (
    <Card className="border-2 border-black">
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setCollapsed(!collapsed)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            ⛺ Tent Size Summary
            {!loading && (
              <Badge className={totalHaveTent >= totalNeedTent ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}>
                {totalHaveTent}/{totalNeedTent}
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
                <p className="text-[10px] text-blue-600 font-medium">
                  🤝 {sharingPairs.length} sharing pair{sharingPairs.length !== 1 ? 's' : ''} detected ({sharingPairs.length * 2} campers → {sharingPairs.length} tent{sharingPairs.length !== 1 ? 's' : ''})
                </p>
              )}

              {/* Grid of buckets */}
              <div className="space-y-1.5">
                {ALL_BUCKETS.map((bucket) => {
                  const need = needByBucket.get(bucket) ?? 0
                  const have = haveByBucket.get(bucket) ?? 0
                  const isExpanded = expandedBucket === bucket
                  const camperList = campersByBucket.get(bucket) ?? []

                  if (need === 0 && have === 0 && camperList.length === 0) return null

                  return (
                    <div key={bucket}>
                      <button
                        onClick={() => setExpandedBucket(isExpanded ? null : bucket)}
                        className={`w-full text-left px-2 py-1.5 border text-xs flex items-center justify-between ${statusBg(bucket === 'RV' || bucket === 'Unknown' ? 0 : need, have)}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-black text-[11px] min-w-[60px]">{bucket}</span>
                          <span className={`font-bold ${statusColor(bucket === 'RV' || bucket === 'Unknown' ? 0 : need, have)}`}>
                            {bucket === 'RV' ? `${camperList.length} camper${camperList.length !== 1 ? 's' : ''}` :
                             bucket === 'Unknown' ? `${camperList.length} camper${camperList.length !== 1 ? 's' : ''}` :
                             `Need: ${need}  Have: ${have}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {bucket !== 'RV' && bucket !== 'Unknown' && need > 0 && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              have >= need ? 'bg-emerald-200 text-emerald-800' :
                              have > 0 ? 'bg-yellow-200 text-yellow-800' :
                              'bg-red-200 text-red-800'
                            }`}>
                              {have >= need ? '✓' : `-${need - have}`}
                            </span>
                          )}
                          <span className="text-gray-400">{isExpanded ? '▾' : '▸'}</span>
                        </div>
                      </button>

                      {/* Expanded camper list */}
                      {isExpanded && camperList.length > 0 && (
                        <div className="ml-2 mt-1 border-l-2 border-gray-200 pl-2 space-y-0.5 max-h-[200px] overflow-y-auto">
                          {camperList.map((c, idx) => (
                            <div key={idx} className="text-[10px] text-gray-600 flex justify-between">
                              <span>
                                {c.name}
                                {c.sharingWith && (
                                  <span className="text-blue-500 ml-1">🤝 {c.sharingWith}</span>
                                )}
                              </span>
                              <span className="text-gray-400 ml-2 whitespace-nowrap">
                                {c.w != null && c.l != null ? `${c.w}×${c.l}` : '—'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Totals */}
              <div className="border-t pt-1.5 mt-2 flex justify-between text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                <span>Tent spots needed: {totalNeedTent}</span>
                <span>Layout has: {totalHaveTent}</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>RV: {campersByBucket.get('RV')?.length ?? 0}</span>
                <span>Unknown: {campersByBucket.get('Unknown')?.length ?? 0}</span>
                <span>Campers: {totalCampers}</span>
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  )
}
