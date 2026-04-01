'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
  fetchElectricalConfig,
  updateElectricalConfig,
  fetchDistroBoxes,
  createDistroBox,
  updateDistroBox,
  deleteDistroBox,
  fetchElectricalLoadItems,
  createElectricalLoadItem,
  updateElectricalLoadItem,
  deleteElectricalLoadItem,
} from '@/lib/build-week'
import type {
  ElectricalLoadConfig,
  ElectricalDistroBox,
  ElectricalLoadItem,
} from '@/types/database'

// ─── Helpers ───

function calcMaxWatts(kw: number): number {
  return kw * 1000
}

function calcMaxAmps(kw: number, voltage: number): number {
  return (kw * 1000) / voltage
}

function pctClass(pct: number): string {
  if (pct >= 100) return 'text-red-700 bg-red-100 border-red-400'
  if (pct >= 80) return 'text-yellow-700 bg-yellow-100 border-yellow-400'
  return 'text-green-700 bg-green-100 border-green-400'
}

function barColor(pct: number): string {
  if (pct >= 100) return 'bg-red-500'
  if (pct >= 80) return 'bg-yellow-500'
  return 'bg-green-500'
}

// ─── Main Component ───

export default function ElectricalLoadTab() {
  const [config, setConfig] = useState<ElectricalLoadConfig | null>(null)
  const [boxes, setBoxes] = useState<ElectricalDistroBox[]>([])
  const [items, setItems] = useState<ElectricalLoadItem[]>([])
  const [loading, setLoading] = useState(true)

  // Generator edit
  const [editingGen, setEditingGen] = useState(false)
  const [genKw, setGenKw] = useState('')

  // Distro box add/edit
  const [showAddBox, setShowAddBox] = useState(false)
  const [editingBox, setEditingBox] = useState<ElectricalDistroBox | null>(null)

  // Item add/edit
  const [showAddItem, setShowAddItem] = useState(false)
  const [editingItem, setEditingItem] = useState<ElectricalLoadItem | null>(null)

  // Saving states
  const [savingGen, setSavingGen] = useState(false)
  const [savingBox, setSavingBox] = useState(false)
  const [savingItem, setSavingItem] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [cfg, bx, it] = await Promise.all([
        fetchElectricalConfig(),
        fetchDistroBoxes(),
        fetchElectricalLoadItems(),
      ])
      setConfig(cfg)
      setBoxes(bx)
      setItems(it)
      if (cfg) setGenKw(String(cfg.generator_kw))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // ─── Computed values ───

  const totalAmps = useMemo(() => items.reduce((s, i) => s + i.total_amps, 0), [items])
  const totalWatts = useMemo(() => items.reduce((s, i) => s + i.total_wattage, 0), [items])
  const generatorKw = config?.generator_kw ?? 125
  const generatorMaxWatts = calcMaxWatts(generatorKw)
  const generatorMaxAmps = calcMaxAmps(generatorKw, 120)
  const generatorWattPct = Math.round((totalWatts / generatorMaxWatts) * 100)
  const generatorAmpPct = Math.round((totalAmps / generatorMaxAmps) * 100)

  const boxLoads = useMemo(() => {
    const loads: Record<string, { amps: number; watts: number; items: ElectricalLoadItem[] }> = {}
    for (const b of boxes) {
      loads[b.id] = { amps: 0, watts: 0, items: [] }
    }
    // Unassigned bucket
    loads['unassigned'] = { amps: 0, watts: 0, items: [] }
    for (const item of items) {
      const key = item.distro_box_id ?? 'unassigned'
      if (!loads[key]) loads[key] = { amps: 0, watts: 0, items: [] }
      loads[key].amps += item.total_amps
      loads[key].watts += item.total_wattage
      loads[key].items.push(item)
    }
    return loads
  }, [boxes, items])

  // ─── Handlers ───

  const handleSaveGenerator = async () => {
    if (!config) return
    setSavingGen(true)
    try {
      await updateElectricalConfig(config.id, { generator_kw: Number(genKw) || 125 })
      setConfig({ ...config, generator_kw: Number(genKw) || 125 })
      setEditingGen(false)
    } finally {
      setSavingGen(false)
    }
  }

  const handleDeleteItem = async (id: string) => {
    await deleteElectricalLoadItem(id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const handleDeleteBox = async (id: string) => {
    await deleteDistroBox(id)
    setBoxes(prev => prev.filter(b => b.id !== id))
    // Items referencing this box get set to null (DB handles via ON DELETE SET NULL)
    setItems(prev => prev.map(i => i.distro_box_id === id ? { ...i, distro_box_id: null } : i))
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Loading electrical data…</div>
  }

  return (
    <div className="space-y-6">
      {/* ═══════ GENERATOR SUMMARY ═══════ */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            ⚡ Generator &amp; System Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Generator KW setting */}
          <div className="flex items-center gap-3">
            <span className="font-bold text-sm">Generator:</span>
            {editingGen ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={genKw}
                  onChange={e => setGenKw(e.target.value)}
                  className="w-24 border border-gray-300 px-2 py-1 text-sm"
                  min={1}
                />
                <span className="text-sm text-gray-500">KW</span>
                <button
                  onClick={handleSaveGenerator}
                  disabled={savingGen}
                  className="px-3 py-1 text-xs font-bold bg-black text-white hover:bg-gray-800 disabled:bg-gray-400"
                >
                  {savingGen ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => { setEditingGen(false); setGenKw(String(generatorKw)) }}
                  className="px-3 py-1 text-xs font-bold bg-gray-200 hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono">{generatorKw} KW</span>
                <span className="text-xs text-gray-400">
                  ({generatorMaxWatts.toLocaleString()}W / {Math.round(generatorMaxAmps)}A @ 120V)
                </span>
                <button
                  onClick={() => setEditingGen(true)}
                  className="px-2 py-0.5 text-xs bg-gray-100 hover:bg-gray-200 border border-gray-300"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          {/* System load bars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-bold">Total Wattage</span>
                <span className={cn('px-2 py-0.5 border text-xs font-mono', pctClass(generatorWattPct))}>
                  {totalWatts.toLocaleString()}W / {generatorMaxWatts.toLocaleString()}W ({generatorWattPct}%)
                </span>
              </div>
              <div className="w-full h-4 bg-gray-200 border border-gray-300">
                <div
                  className={cn('h-full transition-all', barColor(generatorWattPct))}
                  style={{ width: `${Math.min(generatorWattPct, 100)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-bold">Total Amperage</span>
                <span className={cn('px-2 py-0.5 border text-xs font-mono', pctClass(generatorAmpPct))}>
                  {totalAmps}A / {Math.round(generatorMaxAmps)}A ({generatorAmpPct}%)
                </span>
              </div>
              <div className="w-full h-4 bg-gray-200 border border-gray-300">
                <div
                  className={cn('h-full transition-all', barColor(generatorAmpPct))}
                  style={{ width: `${Math.min(generatorAmpPct, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Overload warnings */}
          {generatorWattPct >= 100 && (
            <div className="bg-red-100 border-2 border-red-500 px-4 py-2 text-sm font-bold text-red-800">
              🚨 GENERATOR OVERLOADED — total wattage exceeds capacity!
            </div>
          )}
          {generatorWattPct >= 80 && generatorWattPct < 100 && (
            <div className="bg-yellow-100 border-2 border-yellow-500 px-4 py-2 text-sm font-bold text-yellow-800">
              ⚠️ Generator at {generatorWattPct}% capacity — approaching limit
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════ DISTRO BOX BREAKDOWN ═══════ */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">📦 Distro Box Loads</CardTitle>
            <button
              onClick={() => { setShowAddBox(true); setEditingBox(null) }}
              className="px-3 py-1 text-xs font-bold bg-black text-white hover:bg-gray-800"
            >
              + Add Distro Box
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {showAddBox && (
            <DistroBoxForm
              initial={editingBox}
              saving={savingBox}
              onSave={async (data) => {
                setSavingBox(true)
                try {
                  if (editingBox) {
                    await updateDistroBox(editingBox.id, data)
                    setBoxes(prev => prev.map(b => b.id === editingBox.id ? { ...b, ...data } : b))
                  } else {
                    const created = await createDistroBox(data)
                    setBoxes(prev => [...prev, created])
                  }
                  setShowAddBox(false)
                  setEditingBox(null)
                } finally {
                  setSavingBox(false)
                }
              }}
              onCancel={() => { setShowAddBox(false); setEditingBox(null) }}
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {boxes.map(box => {
              const load = boxLoads[box.id] || { amps: 0, watts: 0, items: [] }
              const ampPct = Math.round((load.amps / box.max_amps) * 100)
              const maxWatts = box.max_amps * box.voltage
              const wattPct = Math.round((load.watts / maxWatts) * 100)
              const overloaded = ampPct >= 100

              return (
                <div
                  key={box.id}
                  className={cn(
                    'border-2 p-3 space-y-2',
                    overloaded ? 'border-red-500 bg-red-50' : 'border-black bg-white'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">Distro {box.name}</span>
                      {overloaded && <Badge className="bg-red-600 text-white text-[10px]">OVERLOADED</Badge>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditingBox(box); setShowAddBox(true) }}
                        className="px-1.5 py-0.5 text-[10px] bg-gray-100 hover:bg-gray-200 border"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteBox(box.id)}
                        className="px-1.5 py-0.5 text-[10px] bg-red-50 hover:bg-red-100 border border-red-300 text-red-600"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    Max {box.max_amps}A / {maxWatts.toLocaleString()}W @ {box.voltage}V
                    {box.notes && <span className="ml-2 italic">— {box.notes}</span>}
                  </div>

                  {/* Amp bar */}
                  <div>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span>Amps</span>
                      <span className={cn('px-1 border font-mono', pctClass(ampPct))}>
                        {load.amps}A / {box.max_amps}A ({ampPct}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-200 border border-gray-300">
                      <div
                        className={cn('h-full transition-all', barColor(ampPct))}
                        style={{ width: `${Math.min(ampPct, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Watt bar */}
                  <div>
                    <div className="flex justify-between text-[10px] mb-0.5">
                      <span>Watts</span>
                      <span className={cn('px-1 border font-mono', pctClass(wattPct))}>
                        {load.watts.toLocaleString()}W / {maxWatts.toLocaleString()}W ({wattPct}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-200 border border-gray-300">
                      <div
                        className={cn('h-full transition-all', barColor(wattPct))}
                        style={{ width: `${Math.min(wattPct, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Items on this distro */}
                  {load.items.length > 0 && (
                    <div className="text-[10px] text-gray-500 pt-1 border-t border-gray-200">
                      {load.items.map(i => (
                        <span key={i.id} className="inline-block mr-2">
                          {i.name} ({i.total_amps}A)
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Unassigned items warning */}
          {boxLoads['unassigned']?.items.length > 0 && (
            <div className="border-2 border-yellow-500 bg-yellow-50 p-3">
              <div className="font-bold text-sm text-yellow-800 mb-1">
                ⚠️ Unassigned Items ({boxLoads['unassigned'].items.length})
              </div>
              <div className="text-xs text-yellow-700">
                {boxLoads['unassigned'].items.map(i => (
                  <span key={i.id} className="inline-block mr-3">{i.name} ({i.total_amps}A / {i.total_wattage}W)</span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════ LOAD ITEMS TABLE ═══════ */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">🔌 Electrical Load Items</CardTitle>
            <button
              onClick={() => { setShowAddItem(true); setEditingItem(null) }}
              className="px-3 py-1 text-xs font-bold bg-black text-white hover:bg-gray-800"
            >
              + Add Item
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {showAddItem && (
            <LoadItemForm
              initial={editingItem}
              boxes={boxes}
              saving={savingItem}
              onSave={async (data) => {
                setSavingItem(true)
                try {
                  if (editingItem) {
                    await updateElectricalLoadItem(editingItem.id, data)
                    setItems(prev => prev.map(i => i.id === editingItem.id ? { ...i, ...data } : i))
                  } else {
                    const created = await createElectricalLoadItem(data)
                    setItems(prev => [...prev, created])
                  }
                  setShowAddItem(false)
                  setEditingItem(null)
                } finally {
                  setSavingItem(false)
                }
              }}
              onCancel={() => { setShowAddItem(false); setEditingItem(null) }}
            />
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2 border-black text-left">
                  <th className="py-2 px-2 font-bold">Item</th>
                  <th className="py-2 px-1">Location</th>
                  <th className="py-2 px-1 text-right">V</th>
                  <th className="py-2 px-1 text-right">A</th>
                  <th className="py-2 px-1 text-right">W</th>
                  <th className="py-2 px-1">Plug</th>
                  <th className="py-2 px-1 text-right">Qty</th>
                  <th className="py-2 px-1 text-right font-bold">Tot A</th>
                  <th className="py-2 px-1 text-right font-bold">Tot W</th>
                  <th className="py-2 px-1">Distro</th>
                  <th className="py-2 px-1">Note</th>
                  <th className="py-2 px-1"></th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const box = boxes.find(b => b.id === item.distro_box_id)
                  return (
                    <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-1.5 px-2 font-medium">{item.name}</td>
                      <td className="py-1.5 px-1 text-gray-500">{item.location || '—'}</td>
                      <td className="py-1.5 px-1 text-right font-mono">{item.voltage}</td>
                      <td className="py-1.5 px-1 text-right font-mono">{item.amperage}</td>
                      <td className="py-1.5 px-1 text-right font-mono">{item.wattage}</td>
                      <td className="py-1.5 px-1">{item.plug_type}</td>
                      <td className="py-1.5 px-1 text-right font-mono">{item.quantity}</td>
                      <td className="py-1.5 px-1 text-right font-mono font-bold">{item.total_amps}</td>
                      <td className="py-1.5 px-1 text-right font-mono font-bold">{item.total_wattage.toLocaleString()}</td>
                      <td className="py-1.5 px-1">
                        {box ? (
                          <Badge className="text-[10px] bg-blue-100 text-blue-800 border-blue-300">
                            {box.name}
                          </Badge>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="py-1.5 px-1 text-gray-400 max-w-[120px] truncate" title={item.notes || ''}>
                        {item.notes || ''}
                      </td>
                      <td className="py-1.5 px-1">
                        <div className="flex gap-1">
                          <button
                            onClick={() => { setEditingItem(item); setShowAddItem(true) }}
                            className="px-1 py-0.5 text-[10px] bg-gray-100 hover:bg-gray-200 border"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="px-1 py-0.5 text-[10px] bg-red-50 hover:bg-red-100 border border-red-300 text-red-600"
                          >
                            ×
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-black font-bold">
                  <td className="py-2 px-2" colSpan={6}>TOTALS</td>
                  <td className="py-2 px-1 text-right">{items.reduce((s, i) => s + i.quantity, 0)}</td>
                  <td className="py-2 px-1 text-right">{totalAmps}</td>
                  <td className="py-2 px-1 text-right">{totalWatts.toLocaleString()}</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Distro Box Form ───

function DistroBoxForm({
  initial, saving, onSave, onCancel,
}: {
  initial: ElectricalDistroBox | null
  saving: boolean
  onSave: (data: { name: string; max_amps: number; voltage: number; notes?: string }) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [maxAmps, setMaxAmps] = useState(String(initial?.max_amps ?? 100))
  const [voltage, setVoltage] = useState(String(initial?.voltage ?? 120))
  const [notes, setNotes] = useState(initial?.notes ?? '')

  return (
    <div className="border-2 border-black bg-yellow-50 p-4 mb-4 space-y-3">
      <div className="font-bold text-sm">{initial ? 'Edit' : 'Add'} Distro Box</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-[10px] font-bold mb-0.5">Name</label>
          <input value={name} onChange={e => setName(e.target.value)}
            className="w-full border border-gray-300 px-2 py-1 text-sm" placeholder="e.g. RV-1" />
        </div>
        <div>
          <label className="block text-[10px] font-bold mb-0.5">Max Amps</label>
          <input type="number" value={maxAmps} onChange={e => setMaxAmps(e.target.value)}
            className="w-full border border-gray-300 px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="block text-[10px] font-bold mb-0.5">Voltage</label>
          <input type="number" value={voltage} onChange={e => setVoltage(e.target.value)}
            className="w-full border border-gray-300 px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="block text-[10px] font-bold mb-0.5">Notes</label>
          <input value={notes} onChange={e => setNotes(e.target.value)}
            className="w-full border border-gray-300 px-2 py-1 text-sm" placeholder="optional" />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onSave({ name, max_amps: Number(maxAmps) || 100, voltage: Number(voltage) || 120, notes: notes || undefined })}
          disabled={saving || !name.trim()}
          className={cn('px-4 py-1.5 text-sm font-bold text-white', saving || !name.trim() ? 'bg-gray-400' : 'bg-black hover:bg-gray-800')}
        >
          {saving ? 'Saving…' : initial ? 'Update' : 'Add'}
        </button>
        <button onClick={onCancel} className="px-4 py-1.5 text-sm font-bold bg-gray-200 hover:bg-gray-300">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Load Item Form ───

function LoadItemForm({
  initial, boxes, saving, onSave, onCancel,
}: {
  initial: ElectricalLoadItem | null
  boxes: ElectricalDistroBox[]
  saving: boolean
  onSave: (data: {
    name: string; location?: string; voltage: number; amperage: number; wattage: number;
    plug_type: string; quantity: number; total_amps: number; total_wattage: number;
    notes?: string; distro_box_id?: string | null
  }) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [location, setLocation] = useState(initial?.location ?? '')
  const [voltage, setVoltage] = useState(String(initial?.voltage ?? 120))
  const [amperage, setAmperage] = useState(String(initial?.amperage ?? 0))
  const [wattage, setWattage] = useState(String(initial?.wattage ?? 0))
  const [plugType, setPlugType] = useState(initial?.plug_type ?? 'standard')
  const [quantity, setQuantity] = useState(String(initial?.quantity ?? 1))
  const [totalAmps, setTotalAmps] = useState(String(initial?.total_amps ?? 0))
  const [totalWattage, setTotalWattage] = useState(String(initial?.total_wattage ?? 0))
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [distroBoxId, setDistroBoxId] = useState(initial?.distro_box_id ?? '')

  // Auto-calc suggestions (user can override)
  const suggestedTotalAmps = Math.ceil(Number(amperage) * Number(quantity))
  const suggestedTotalWatts = Math.ceil(Number(wattage) * Number(quantity))

  return (
    <div className="border-2 border-black bg-yellow-50 p-4 mb-4 space-y-3">
      <div className="font-bold text-sm">{initial ? 'Edit' : 'Add'} Electrical Load Item</div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="col-span-2">
          <label className="block text-[10px] font-bold mb-0.5">Item Name</label>
          <input value={name} onChange={e => setName(e.target.value)}
            className="w-full border border-gray-300 px-2 py-1 text-sm" placeholder="e.g. Swamp Cooler" />
        </div>
        <div>
          <label className="block text-[10px] font-bold mb-0.5">Location</label>
          <input value={location} onChange={e => setLocation(e.target.value)}
            className="w-full border border-gray-300 px-2 py-1 text-sm" placeholder="e.g. Kitchen" />
        </div>
        <div>
          <label className="block text-[10px] font-bold mb-0.5">Plug Type</label>
          <select value={plugType} onChange={e => setPlugType(e.target.value)}
            className="w-full border border-gray-300 px-2 py-1 text-sm bg-white">
            <option value="standard">Standard (15A)</option>
            <option value="TT-30">TT-30 (RV 30A)</option>
            <option value="L5-30">L5-30 (Twist 30A)</option>
            <option value="L14-30">L14-30 (240V 30A)</option>
            <option value="50A">50A RV</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        <div>
          <label className="block text-[10px] font-bold mb-0.5">Voltage</label>
          <input type="number" value={voltage} onChange={e => setVoltage(e.target.value)}
            className="w-full border border-gray-300 px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="block text-[10px] font-bold mb-0.5">Amperage (ea)</label>
          <input type="number" value={amperage} onChange={e => setAmperage(e.target.value)}
            className="w-full border border-gray-300 px-2 py-1 text-sm" step="0.25" />
        </div>
        <div>
          <label className="block text-[10px] font-bold mb-0.5">Wattage (ea)</label>
          <input type="number" value={wattage} onChange={e => setWattage(e.target.value)}
            className="w-full border border-gray-300 px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="block text-[10px] font-bold mb-0.5">Quantity</label>
          <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)}
            className="w-full border border-gray-300 px-2 py-1 text-sm" min={1} />
        </div>
        <div>
          <label className="block text-[10px] font-bold mb-0.5">
            Total Amps
            <button type="button" onClick={() => setTotalAmps(String(suggestedTotalAmps))}
              className="ml-1 text-blue-600 underline text-[9px]">calc</button>
          </label>
          <input type="number" value={totalAmps} onChange={e => setTotalAmps(e.target.value)}
            className="w-full border border-gray-300 px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="block text-[10px] font-bold mb-0.5">
            Total Watts
            <button type="button" onClick={() => setTotalWattage(String(suggestedTotalWatts))}
              className="ml-1 text-blue-600 underline text-[9px]">calc</button>
          </label>
          <input type="number" value={totalWattage} onChange={e => setTotalWattage(e.target.value)}
            className="w-full border border-gray-300 px-2 py-1 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-bold mb-0.5">Distro Box</label>
          <select value={distroBoxId} onChange={e => setDistroBoxId(e.target.value)}
            className="w-full border border-gray-300 px-2 py-1 text-sm bg-white">
            <option value="">— Unassigned —</option>
            {boxes.map(b => (
              <option key={b.id} value={b.id}>Distro {b.name} ({b.max_amps}A)</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold mb-0.5">Notes</label>
          <input value={notes} onChange={e => setNotes(e.target.value)}
            className="w-full border border-gray-300 px-2 py-1 text-sm" placeholder="optional" />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSave({
            name,
            location: location || undefined,
            voltage: Number(voltage) || 120,
            amperage: Number(amperage) || 0,
            wattage: Number(wattage) || 0,
            plug_type: plugType,
            quantity: Number(quantity) || 1,
            total_amps: Number(totalAmps) || 0,
            total_wattage: Number(totalWattage) || 0,
            notes: notes || undefined,
            distro_box_id: distroBoxId || null,
          })}
          disabled={saving || !name.trim()}
          className={cn('px-4 py-1.5 text-sm font-bold text-white', saving || !name.trim() ? 'bg-gray-400' : 'bg-black hover:bg-gray-800')}
        >
          {saving ? 'Saving…' : initial ? 'Update' : 'Add'}
        </button>
        <button onClick={onCancel} className="px-4 py-1.5 text-sm font-bold bg-gray-200 hover:bg-gray-300">
          Cancel
        </button>
      </div>
    </div>
  )
}
