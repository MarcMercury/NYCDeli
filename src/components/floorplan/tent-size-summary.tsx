'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import type { FloorplanObjectRow } from '@/types/database'

/**
 * Tent size buckets — camper tent dimensions are grouped into these categories.
 * A tent "fits" a bucket if both dimensions are ≤ the bucket dimensions.
 * Buckets are checked in order; first match wins.
 */
const TENT_BUCKETS = [
  { label: '10×10', maxW: 10, maxL: 10 },
  { label: '11×11', maxW: 11, maxL: 11 },
  { label: '11×15', maxW: 11, maxL: 15 },
  { label: '13×13', maxW: 13, maxL: 13 },
] as const

type BucketLabel = (typeof TENT_BUCKETS)[number]['label'] | 'Oversized' | 'RV' | 'Unknown'

interface CamperShelterInfo {
  id: string
  full_name: string
  playa_name: string | null
  shelter_type: string
  shelter_width_ft: number
  shelter_length_ft: number
}

function classifyCamper(c: CamperShelterInfo): BucketLabel {
  if (c.shelter_type === 'rv' || c.shelter_type === 'vehicle') return 'RV'

  const w = Math.min(c.shelter_width_ft, c.shelter_length_ft)
  const l = Math.max(c.shelter_width_ft, c.shelter_length_ft)

  if (w <= 0 || l <= 0) return 'Unknown'

  for (const bucket of TENT_BUCKETS) {
    if (w <= bucket.maxW && l <= bucket.maxL) return bucket.label
  }

  return 'Oversized'
}

/**
 * Classify a floorplan tent object into the same buckets
 * so we can compare "have" vs "need".
 */
function classifySpot(obj: FloorplanObjectRow): BucketLabel {
  const w = Math.min(obj.width_ft, obj.height_ft)
  const l = Math.max(obj.width_ft, obj.height_ft)

  if (w <= 0 || l <= 0) return 'Unknown'

  for (const bucket of TENT_BUCKETS) {
    if (w <= bucket.maxW && l <= bucket.maxL) return bucket.label
  }

  return 'Oversized'
}

interface TentSizeSummaryProps {
  objects: FloorplanObjectRow[]
}

export function TentSizeSummary({ objects }: TentSizeSummaryProps) {
  const [campers, setCampers] = useState<CamperShelterInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [expandedBucket, setExpandedBucket] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('campers')
          .select('id, full_name, playa_name, shelter_type, shelter_width_ft, shelter_length_ft')
          .order('full_name')
        setCampers((data as CamperShelterInfo[]) ?? [])
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Classify all campers into buckets
  const allBuckets: BucketLabel[] = ['10×10', '11×11', '11×15', '13×13', 'Oversized', 'RV', 'Unknown']

  const campersByBucket = new Map<BucketLabel, CamperShelterInfo[]>()
  for (const b of allBuckets) campersByBucket.set(b, [])
  for (const c of campers) {
    const bucket = classifyCamper(c)
    campersByBucket.get(bucket)!.push(c)
  }

  // Count layout tent objects by bucket (only tent types)
  const tentObjects = objects.filter(o => o.object_type === 'tent')
  const haveByBucket = new Map<BucketLabel, number>()
  for (const b of allBuckets) haveByBucket.set(b, 0)
  for (const obj of tentObjects) {
    const bucket = classifySpot(obj)
    haveByBucket.set(bucket, (haveByBucket.get(bucket) ?? 0) + 1)
  }

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

  // Totals
  const totalNeedTent = allBuckets
    .filter(b => b !== 'RV' && b !== 'Unknown')
    .reduce((sum, b) => sum + (campersByBucket.get(b)?.length ?? 0), 0)
  const totalHaveTent = allBuckets
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
              {/* Grid of buckets */}
              <div className="space-y-1.5">
                {allBuckets.map((bucket) => {
                  const need = campersByBucket.get(bucket)?.length ?? 0
                  const have = haveByBucket.get(bucket) ?? 0
                  const isExpanded = expandedBucket === bucket
                  const camperList = campersByBucket.get(bucket) ?? []

                  // Skip empty non-tent buckets
                  if (need === 0 && have === 0) return null

                  return (
                    <div key={bucket}>
                      <button
                        onClick={() => setExpandedBucket(isExpanded ? null : bucket)}
                        className={`w-full text-left px-2 py-1.5 border text-xs flex items-center justify-between ${statusBg(bucket === 'RV' || bucket === 'Unknown' ? 0 : need, have)}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-black text-[11px] min-w-[60px]">{bucket}</span>
                          <span className={`font-bold ${statusColor(bucket === 'RV' || bucket === 'Unknown' ? 0 : need, have)}`}>
                            {bucket === 'RV' ? `${need} camper${need !== 1 ? 's' : ''}` :
                             bucket === 'Unknown' ? `${need} camper${need !== 1 ? 's' : ''}` :
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
                          {camperList.map((c) => (
                            <div key={c.id} className="text-[10px] text-gray-600 flex justify-between">
                              <span>{c.playa_name || c.full_name}</span>
                              <span className="text-gray-400">
                                {c.shelter_width_ft > 0 ? `${c.shelter_width_ft}×${c.shelter_length_ft}` : '—'}
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
                <span>Total tent spots needed: {totalNeedTent}</span>
                <span>Layout has: {totalHaveTent}</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>RV: {campersByBucket.get('RV')?.length ?? 0}</span>
                <span>Unknown: {campersByBucket.get('Unknown')?.length ?? 0}</span>
                <span>Campers: {campers.length}</span>
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  )
}
