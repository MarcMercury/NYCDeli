'use client'

import { useState, useEffect, useCallback } from 'react'
import { Badge, ProgressBar } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
  fetchLayoutAudit,
  syncLayoutAll,
  objectTypeLabel,
} from '@/lib/layout-sync'
import type { LayoutAuditSummary } from '@/lib/layout-sync'
import { fetchActiveFloorplan } from '@/lib/floorplan'

/**
 * Compact Layout Sync banner — embedded inside the Inventory tab.
 *
 * Purpose: ensure every trackable object on the camp map is represented
 * in the inventory / electrical lists.  Shows a coverage summary and
 * surfaces ONLY the unlinked objects (missing from inventory or electrical),
 * avoiding duplicate listings of items already tracked.
 */
export default function LayoutSyncTab() {
  const [audit, setAudit] = useState<LayoutAuditSummary | null>(null)
  const [floorplanId, setFloorplanId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{
    inventoryCreated: number
    electricalCreated: number
    scheduleCreated: number
  } | null>(null)
  const [showUnlinked, setShowUnlinked] = useState(false)

  const loadAudit = useCallback(async () => {
    setLoading(true)
    try {
      const fp = await fetchActiveFloorplan()
      if (!fp) {
        setFloorplanId(null)
        setAudit(null)
        return
      }
      setFloorplanId(fp.id)
      const data = await fetchLayoutAudit(fp.id)
      setAudit(data)
    } catch (err) {
      console.error('Failed to load audit:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAudit() }, [loadAudit])

  const handleSync = async () => {
    if (!floorplanId) return
    setSyncing(true)
    setSyncResult(null)
    try {
      const result = await syncLayoutAll(floorplanId)
      setSyncResult(result)
      const data = await fetchLayoutAudit(floorplanId)
      setAudit(data)
      // Notify the parent inventory tab to reload its data
      window.dispatchEvent(new CustomEvent('inventory:refresh'))
    } catch (err) {
      console.error('Sync failed:', err)
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!floorplanId || !audit) {
    return (
      <div className="text-xs text-gray-500 py-1">
        No active floorplan. <a href="/layout" className="underline">Create a layout</a> to enable sync.
      </div>
    )
  }

  const invTotal = audit.totalLinkedInventory + audit.totalUnlinkedInventory
  const elecTotal = audit.totalLinkedElectrical + audit.totalUnlinkedElectrical
  const inventoryPct = invTotal > 0 ? Math.round((audit.totalLinkedInventory / invTotal) * 100) : 100
  const electricalPct = elecTotal > 0 ? Math.round((audit.totalLinkedElectrical / elecTotal) * 100) : 100

  // Only items that NEED attention (unlinked + need a category)
  const unlinkedItems = audit.items.filter(item =>
    (item.needsInventory && !item.coveredByInventory) ||
    (item.needsElectrical && !item.coveredByElectrical)
  )

  const allSynced = unlinkedItems.length === 0

  return (
    <div className="space-y-3">
      {/* ── Compact summary row ── */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div>
          <div className="font-bold uppercase text-gray-500 text-[10px] mb-0.5">Map Objects</div>
          <div className="text-lg font-black">{audit.totalPlaced}</div>
          <div className="text-[10px] text-gray-400">{Object.keys(audit.typeCounts).length} types</div>
        </div>
        <div>
          <div className="font-bold uppercase text-gray-500 text-[10px] mb-0.5">Inventory Coverage</div>
          <div className={cn('text-lg font-black', inventoryPct === 100 ? 'text-green-600' : 'text-red-600')}>
            {inventoryPct}%
          </div>
          <ProgressBar value={inventoryPct} />
          <div className="text-[10px] text-gray-400 mt-0.5">
            {audit.totalLinkedInventory} linked · {audit.totalUnlinkedInventory} missing
          </div>
        </div>
        <div>
          <div className="font-bold uppercase text-gray-500 text-[10px] mb-0.5">Electrical Coverage</div>
          <div className={cn('text-lg font-black', electricalPct === 100 ? 'text-green-600' : 'text-red-600')}>
            {electricalPct}%
          </div>
          <ProgressBar value={electricalPct} />
          <div className="text-[10px] text-gray-400 mt-0.5">
            {audit.totalLinkedElectrical} linked · {audit.totalUnlinkedElectrical} missing
          </div>
        </div>
      </div>

      {/* ── Action row ── */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={handleSync}
          disabled={syncing || allSynced}
          className={cn(
            'px-3 py-1.5 text-xs font-bold text-white border-2 border-black',
            syncing || allSynced ? 'bg-gray-400 cursor-not-allowed' : 'bg-black hover:bg-gray-800'
          )}
          title={allSynced ? 'Everything is already synced' : 'Create inventory + electrical + schedule rows for unlinked map objects'}
        >
          {syncing ? 'Syncing…' : allSynced ? '✓ All Synced' : `⚡ Sync ${unlinkedItems.length} Unlinked`}
        </button>

        <button
          onClick={loadAudit}
          disabled={loading}
          className="px-2 py-1.5 text-xs font-bold border-2 border-black bg-white hover:bg-gray-100"
        >
          ↻ Refresh
        </button>

        {!allSynced && (
          <button
            onClick={() => setShowUnlinked(v => !v)}
            className="px-2 py-1.5 text-xs font-bold border-2 border-black bg-white hover:bg-gray-100"
          >
            {showUnlinked ? 'Hide' : 'Review'} unlinked ({unlinkedItems.length})
          </button>
        )}

        {syncResult && (
          <div className="text-[11px] text-green-700 bg-green-50 border border-green-300 px-2 py-1">
            Created: {syncResult.inventoryCreated} inv · {syncResult.electricalCreated} elec · {syncResult.scheduleCreated} sched
          </div>
        )}
      </div>

      {/* ── Unlinked object list (only shown on demand) ── */}
      {showUnlinked && !allSynced && (
        <div className="border-2 border-black bg-white">
          <div className="px-3 py-2 bg-gray-100 border-b-2 border-black text-[10px] font-bold uppercase tracking-wider text-gray-700">
            Map objects missing from inventory or electrical
          </div>
          <div className="divide-y divide-gray-200 max-h-64 overflow-y-auto">
            {unlinkedItems.map(item => (
              <div key={item.objectId} className="px-3 py-1.5 flex items-center gap-2 text-xs">
                <div className="flex-1 min-w-0 truncate">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-gray-400 ml-2">
                    {objectTypeLabel(item.objectType)} · {item.widthFt}×{item.heightFt} ft
                  </span>
                </div>
                <div className="flex gap-1 shrink-0">
                  {item.needsInventory && !item.coveredByInventory && (
                    <Badge variant="error" className="text-[9px]">INV ✗</Badge>
                  )}
                  {item.needsElectrical && !item.coveredByElectrical && (
                    <Badge variant="error" className="text-[9px]">ELEC ✗</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="px-3 py-1.5 bg-gray-50 text-[10px] text-gray-500 border-t border-gray-200">
            Click <strong>Sync</strong> above to auto-create the missing rows.
          </div>
        </div>
      )}
    </div>
  )
}
