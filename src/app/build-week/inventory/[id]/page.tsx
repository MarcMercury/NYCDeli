'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  fetchInventoryItemById,
  fetchBuildResourceById,
  updateInventoryItem,
  updateBuildResource,
  CATEGORY_ICONS,
  INVENTORY_CATEGORY_ICONS,
  CATEGORY_COLORS,
  RESOURCE_STATUS_COLORS,
} from '@/lib/build-week'
import type { BuildInventory, BuildResource } from '@/types/database'

type ItemData =
  | { source: 'checklist'; item: BuildInventory }
  | { source: 'resource'; item: BuildResource }

export default function InventoryItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<ItemData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      // Try inventory first, then resources
      const inv = await fetchInventoryItemById(id)
      if (inv) {
        setData({ source: 'checklist', item: inv })
        setDescription(inv.description || '')
        setNotes(inv.notes || '')
        setLoading(false)
        return
      }
      const res = await fetchBuildResourceById(id)
      if (res) {
        setData({ source: 'resource', item: res })
        setDescription(res.description || '')
        setNotes(res.notes || '')
        setLoading(false)
        return
      }
      setNotFound(true)
      setLoading(false)
    }
    load()
  }, [id])

  async function handleSave() {
    if (!data) return
    setSaving(true)
    try {
      if (data.source === 'checklist') {
        await updateInventoryItem(data.item.id, { description, notes })
        setData({ source: 'checklist', item: { ...data.item, description, notes } })
      } else {
        await updateBuildResource(data.item.id, { description, notes })
        setData({ source: 'resource', item: { ...data.item, description, notes } })
      }
      setEditing(false)
    } catch (e) {
      console.error('Failed to save', e)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 text-lg">Loading…</div>
      </div>
    )
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-gray-700">Item not found</h1>
        <Link href="/build-week" className="text-blue-600 hover:underline">← Back to Build Week</Link>
      </div>
    )
  }

  const { source, item } = data
  const category = item.category
  const icon = (source === 'checklist' ? INVENTORY_CATEGORY_ICONS[category] : CATEGORY_ICONS[category]) || '📦'
  const colorClass = CATEGORY_COLORS[category] || 'bg-gray-100 text-gray-800 border-gray-300'

  // Shared fields
  const name = item.name
  const desc = item.description
  const itemNotes = item.notes
  const installDay = item.install_day
  const confirmedWorking = item.confirmed_working

  // Source-specific fields
  const isChecklist = source === 'checklist'
  const inv = isChecklist ? (item as BuildInventory) : null
  const res = !isChecklist ? (item as BuildResource) : null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link href="/build-week" className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1 mb-6">
          ← Back to Build Week Inventory
        </Link>

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
            <span className="text-3xl">{icon}</span>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 truncate">{name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn('text-xs font-semibold px-2 py-0.5 rounded border uppercase', colorClass)}>
                  {category.replace(/_/g, ' ')}
                </span>
                <span className="text-xs text-gray-400">
                  {isChecklist ? 'Checklist Item' : 'Material'}
                </span>
              </div>
            </div>
          </div>

          {/* Details grid */}
          <div className="px-6 py-5 space-y-6">
            {/* Status row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {isChecklist && inv && (
                <>
                  <DetailCard label="Expected" value={String(inv.quantity_expected)} />
                  <DetailCard label="Actual" value={String(inv.quantity_actual)} highlight={inv.quantity_actual < inv.quantity_expected} />
                  <DetailCard
                    label="Status"
                    value={inv.verified ? 'Verified ✅' : 'Pending'}
                    className={inv.verified ? 'text-green-700' : 'text-yellow-700'}
                  />
                </>
              )}
              {!isChecklist && res && (
                <>
                  <DetailCard label="Count" value={String(res.count)} />
                  {res.quantity && <DetailCard label="Quantity" value={res.quantity} />}
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Status</p>
                    <span className={cn(
                      'text-sm font-bold uppercase px-2 py-0.5 rounded border',
                      RESOURCE_STATUS_COLORS[res.status] || ''
                    )}>
                      {res.status}
                    </span>
                  </div>
                  {res.priority && (
                    <DetailCard
                      label="Priority"
                      value={res.priority}
                      className={res.priority === 'critical' ? 'text-red-600 font-bold' : ''}
                    />
                  )}
                </>
              )}
            </div>

            {/* Size */}
            {isChecklist && inv && (inv.size_w || inv.size_l) && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Dimensions</p>
                <p className="text-sm text-gray-700">
                  {inv.size_w && <>W: {inv.size_w}</>}
                  {inv.size_w && inv.size_l && ' × '}
                  {inv.size_l && <>L: {inv.size_l}</>}
                </p>
              </div>
            )}

            {/* Install day */}
            {installDay && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Install Day</p>
                <p className="text-sm text-gray-700">
                  📅 {new Date(installDay + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </p>
              </div>
            )}

            {/* Working status */}
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Confirmed Working</p>
              <p className="text-sm">{confirmedWorking ? '✅ Yes' : '❌ No'}</p>
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Description</p>
                {!editing && (
                  <button onClick={() => setEditing(true)} className="text-xs text-blue-600 hover:underline">
                    Edit
                  </button>
                )}
              </div>
              {editing ? (
                <div className="space-y-3">
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 min-h-[100px]"
                    placeholder="Add a description…"
                  />
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Notes</p>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 min-h-[80px]"
                      placeholder="Add notes…"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-4 py-1.5 bg-yellow-400 text-black font-bold text-sm rounded hover:bg-yellow-500 disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        setDescription(desc || '')
                        setNotes(itemNotes || '')
                        setEditing(false)
                      }}
                      className="px-4 py-1.5 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className={cn('text-sm', desc ? 'text-gray-700 whitespace-pre-wrap' : 'text-gray-400 italic')}>
                    {desc || 'No description yet. Click Edit to add one.'}
                  </p>
                  {itemNotes && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Notes</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{itemNotes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Verified info (checklist only) */}
            {isChecklist && inv?.verified && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                <p className="text-sm text-green-800">
                  <strong>Verified</strong>
                  {inv.verified_by && <> by {inv.verified_by}</>}
                  {inv.verified_at && <> on {new Date(inv.verified_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>}
                </p>
              </div>
            )}

            {/* Timestamps */}
            <div className="border-t border-gray-100 pt-4 flex gap-6 text-xs text-gray-400">
              <span>Created: {new Date(item.created_at).toLocaleDateString()}</span>
              <span>Updated: {new Date(item.updated_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailCard({ label, value, highlight, className }: { label: string; value: string; highlight?: boolean; className?: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={cn('text-lg font-bold', highlight ? 'text-red-600' : 'text-gray-900', className)}>{value}</p>
    </div>
  )
}
