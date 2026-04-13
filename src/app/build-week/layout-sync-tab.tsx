'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge, ProgressBar } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
  fetchLayoutAudit,
  syncLayoutAll,
  objectTypeLabel,
  isTrackableType,
  isElectricalType,
} from '@/lib/layout-sync'
import type { LayoutAuditSummary } from '@/lib/layout-sync'
import { fetchActiveFloorplan } from '@/lib/floorplan'

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
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [linkFilter, setLinkFilter] = useState<'all' | 'linked' | 'unlinked'>('all')

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
      // Reload the audit after sync
      const data = await fetchLayoutAudit(floorplanId)
      setAudit(data)
    } catch (err) {
      console.error('Sync failed:', err)
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-6 w-6 border-2 border-black border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!floorplanId || !audit) {
    return (
      <div className="text-center py-12 text-gray-500 text-sm">
        No active floorplan found. Create a layout first.
      </div>
    )
  }

  // Group items by type for the summary view
  const typeGroups = new Map<string, typeof audit.items>()
  for (const item of audit.items) {
    const key = item.objectType
    if (!typeGroups.has(key)) typeGroups.set(key, [])
    typeGroups.get(key)!.push(item)
  }

  // Sort groups by count descending
  const sortedGroups = [...typeGroups.entries()].sort((a, b) => b[1].length - a[1].length)

  // Filtered items
  const filteredItems = audit.items.filter(item => {
    if (typeFilter !== 'all' && item.objectType !== typeFilter) return false
    if (linkFilter === 'linked' && !item.coveredByInventory && !item.coveredByElectrical) return false
    if (linkFilter === 'unlinked' && (item.coveredByInventory || item.coveredByElectrical || (!item.needsInventory && !item.needsElectrical))) return false
    return true
  })

  const inventoryPct = audit.totalLinkedInventory + audit.totalUnlinkedInventory > 0
    ? Math.round((audit.totalLinkedInventory / (audit.totalLinkedInventory + audit.totalUnlinkedInventory)) * 100)
    : 100

  const electricalPct = audit.totalLinkedElectrical + audit.totalUnlinkedElectrical > 0
    ? Math.round((audit.totalLinkedElectrical / (audit.totalLinkedElectrical + audit.totalUnlinkedElectrical)) * 100)
    : 100

  return (
    <div className="space-y-4">
      {/* ── Sync Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase text-gray-500">Layout Objects</span>
              <span className="text-lg font-black">{audit.totalPlaced}</span>
            </div>
            <p className="text-[10px] text-gray-400">
              {Object.keys(audit.typeCounts).length} types across the map
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase text-gray-500">Inventory Sync</span>
              <span className={cn('text-lg font-black', inventoryPct === 100 ? 'text-green-600' : 'text-red-600')}>
                {inventoryPct}%
              </span>
            </div>
            <ProgressBar value={inventoryPct} />
            <p className="text-[10px] text-gray-400 mt-1">
              {audit.totalLinkedInventory} linked · {audit.totalUnlinkedInventory} missing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase text-gray-500">Electrical Sync</span>
              <span className={cn('text-lg font-black', electricalPct === 100 ? 'text-green-600' : 'text-red-600')}>
                {electricalPct}%
              </span>
            </div>
            <ProgressBar value={electricalPct} />
            <p className="text-[10px] text-gray-400 mt-1">
              {audit.totalLinkedElectrical} linked · {audit.totalUnlinkedElectrical} missing
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Sync Button ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSync}
          disabled={syncing}
          className={cn(
            'px-4 py-2 text-sm font-bold text-white',
            syncing ? 'bg-gray-400' : 'bg-black hover:bg-gray-800'
          )}
        >
          {syncing ? 'Syncing…' : '⚡ Sync Layout → Inventory + Electrical + Schedule'}
        </button>

        <button
          onClick={loadAudit}
          disabled={loading}
          className="px-3 py-2 text-sm font-bold bg-gray-200 hover:bg-gray-300"
        >
          ↻ Refresh
        </button>

        {syncResult && (
          <div className="text-xs text-green-700 bg-green-50 border border-green-300 px-3 py-1.5">
            Created: {syncResult.inventoryCreated} inventory · {syncResult.electricalCreated} electrical · {syncResult.scheduleCreated} schedule items
          </div>
        )}
      </div>

      {/* ── Type Summary Table ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Objects by Type</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-black text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-50">
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-center px-3 py-2">Placed</th>
                  <th className="text-center px-3 py-2">In Inventory</th>
                  <th className="text-center px-3 py-2">In Electrical</th>
                  <th className="text-center px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedGroups.map(([type, items]) => {
                  const trackable = isTrackableType(type as never)
                  const electrical = isElectricalType(type as never)
                  const coveredInv = items.filter(i => i.coveredByInventory).length
                  const coveredElec = items.filter(i => i.coveredByElectrical).length
                  const allGood = (!trackable || coveredInv === items.length) && (!electrical || coveredElec === items.length)

                  return (
                    <tr key={type} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{objectTypeLabel(type as never)}</td>
                      <td className="text-center px-3 py-2">{items.length}</td>
                      <td className="text-center px-3 py-2">
                        {trackable ? (
                          <span className={coveredInv === items.length ? 'text-green-600' : 'text-red-600 font-bold'}>
                            {coveredInv}/{items.length}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="text-center px-3 py-2">
                        {electrical ? (
                          <span className={coveredElec === items.length ? 'text-green-600' : 'text-red-600 font-bold'}>
                            {coveredElec}/{items.length}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="text-center px-3 py-2">
                        {!trackable ? (
                          <Badge variant="info" className="text-[10px]">skip</Badge>
                        ) : allGood ? (
                          <Badge variant="default" className="text-[10px] bg-green-100 text-green-800 border-green-300">✓ synced</Badge>
                        ) : (
                          <Badge variant="error" className="text-[10px]">missing</Badge>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Detailed Object List ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Detail View</CardTitle>
            <div className="flex gap-2">
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="text-xs border border-gray-300 px-2 py-1"
              >
                <option value="all">All types</option>
                {sortedGroups.map(([type]) => (
                  <option key={type} value={type}>{objectTypeLabel(type as never)}</option>
                ))}
              </select>
              <select
                value={linkFilter}
                onChange={e => setLinkFilter(e.target.value as 'all' | 'linked' | 'unlinked')}
                className="text-xs border border-gray-300 px-2 py-1"
              >
                <option value="all">All</option>
                <option value="linked">Linked only</option>
                <option value="unlinked">Unlinked only</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredItems.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">
              {linkFilter === 'unlinked' ? 'All items are synced!' : 'No items match the filter.'}
            </p>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredItems.map(item => (
                <div key={item.objectId} className="px-3 py-2 flex items-center gap-3 text-sm hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-gray-400 text-xs ml-2">
                      {objectTypeLabel(item.objectType)} · {item.widthFt}×{item.heightFt} ft
                    </span>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {item.needsInventory && (
                      item.coveredByInventory ? (
                        <Badge variant="default" className="text-[9px] bg-green-100 text-green-800 border-green-300">
                          INV ✓
                        </Badge>
                      ) : (
                        <Badge variant="error" className="text-[9px]">INV ✗</Badge>
                      )
                    )}
                    {item.needsElectrical && (
                      item.coveredByElectrical ? (
                        <Badge variant="default" className="text-[9px] bg-blue-100 text-blue-800 border-blue-300">
                          ELEC ✓
                        </Badge>
                      ) : (
                        <Badge variant="error" className="text-[9px]">ELEC ✗</Badge>
                      )
                    )}
                    {item.resourceItem && (
                      <Badge variant="default" className="text-[9px] bg-purple-100 text-purple-800 border-purple-300">
                        RES ✓
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
