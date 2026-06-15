'use client'

import { useState } from 'react'
import { Button, Input, Select, Checkbox, Badge, Alert } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { ShiftOfferingRow, DraftPool } from '@/types/database'
import { upsertOffering, deleteOffering } from '@/lib/shift-draft'

const POOL_OPTIONS: { value: DraftPool; label: string }[] = [
  { value: 'deli', label: 'Deli' },
  { value: 'special', label: 'Special' },
  { value: 'strike', label: 'Strike' },
]

type EditableOffering = Partial<ShiftOfferingRow> & { draft_id: string; pool: DraftPool }

function blankOffering(draftId: string, pool: DraftPool): EditableOffering {
  return {
    draft_id: draftId,
    pool,
    category: '',
    role: '',
    time_label: '',
    day_label: '',
    day_date: null,
    capacity: 1,
    requires_exp: false,
    counts_double: false,
    description: '',
    note: '',
    sort_order: 0,
  }
}

interface OfferingRowProps {
  offering: EditableOffering
  isNew?: boolean
  disabled: boolean
  onSaved: () => void
  onCancel?: () => void
}

function OfferingRow({ offering, isNew, disabled, onSaved, onCancel }: OfferingRowProps) {
  const [draft, setDraft] = useState<EditableOffering>(offering)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const set = <K extends keyof EditableOffering>(key: K, value: EditableOffering[K]) =>
    setDraft(d => ({ ...d, [key]: value }))

  const save = async () => {
    if (!draft.role?.trim()) { setErr('Role is required'); return }
    if (!draft.category?.trim()) { setErr('Category is required'); return }
    setBusy(true)
    setErr(null)
    try {
      await upsertOffering({
        ...draft,
        capacity: Math.max(1, Number(draft.capacity) || 1),
        time_label: draft.time_label?.trim() || null,
        day_label: draft.day_label?.trim() || null,
        day_date: draft.day_date || null,
        description: draft.description?.trim() || null,
        note: draft.note?.trim() || null,
      })
      if (isNew) setDraft(blankOffering(offering.draft_id, offering.pool))
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!draft.id) return
    if (!confirm(`Delete "${draft.role}"? This also removes any camper rankings for it.`)) return
    setBusy(true)
    setErr(null)
    try {
      await deleteOffering(draft.id)
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cn('border-2 p-2 space-y-2', isNew ? 'border-dashed border-gray-400' : 'border-gray-200')}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <label className="text-[10px] uppercase font-bold">Role
          <Input value={draft.role ?? ''} onChange={e => set('role', e.currentTarget.value)} disabled={disabled || busy} />
        </label>
        <label className="text-[10px] uppercase font-bold">Category
          <Input value={draft.category ?? ''} onChange={e => set('category', e.currentTarget.value)} disabled={disabled || busy} />
        </label>
        <label className="text-[10px] uppercase font-bold">Pool
          <Select
            options={POOL_OPTIONS}
            value={draft.pool}
            onChange={e => set('pool', e.currentTarget.value as DraftPool)}
            disabled={disabled || busy}
          />
        </label>
        <label className="text-[10px] uppercase font-bold">Capacity
          <Input type="number" min={1} value={draft.capacity ?? 1} onChange={e => set('capacity', parseInt(e.currentTarget.value || '1', 10))} disabled={disabled || busy} />
        </label>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <label className="text-[10px] uppercase font-bold">Time label
          <Input value={draft.time_label ?? ''} onChange={e => set('time_label', e.currentTarget.value)} placeholder="9:30–12:00" disabled={disabled || busy} />
        </label>
        <label className="text-[10px] uppercase font-bold">Day label
          <Input value={draft.day_label ?? ''} onChange={e => set('day_label', e.currentTarget.value)} placeholder="Mon" disabled={disabled || busy} />
        </label>
        <label className="text-[10px] uppercase font-bold">Day date
          <Input type="date" value={draft.day_date ?? ''} onChange={e => set('day_date', e.currentTarget.value || null)} disabled={disabled || busy} />
        </label>
      </div>
      <label className="text-[10px] uppercase font-bold block">Description
        <Input value={draft.description ?? ''} onChange={e => set('description', e.currentTarget.value)} disabled={disabled || busy} />
      </label>
      <label className="text-[10px] uppercase font-bold block">Note
        <Input value={draft.note ?? ''} onChange={e => set('note', e.currentTarget.value)} disabled={disabled || busy} />
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <Checkbox
          label="Counts double (2×)"
          checked={!!draft.counts_double}
          onChange={e => set('counts_double', e.currentTarget.checked)}
          disabled={disabled || busy}
        />
        <Checkbox
          label="Experience hint (EXP)"
          helpText="Display-only suggestion — does not restrict who can rank or be assigned."
          checked={!!draft.requires_exp}
          onChange={e => set('requires_exp', e.currentTarget.checked)}
          disabled={disabled || busy}
        />
      </div>
      {err && <Alert variant="error">{err}</Alert>}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={save} disabled={disabled || busy}>{isNew ? 'Add Offering' : 'Save'}</Button>
        {!isNew && <Button size="sm" variant="danger" onClick={remove} disabled={disabled || busy}>Delete</Button>}
        {isNew && onCancel && <Button size="sm" variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>}
      </div>
    </div>
  )
}

interface OfferingsEditorProps {
  draftId: string
  offerings: ShiftOfferingRow[]
  /** Editing is discouraged once rankings are frozen/drafted. */
  locked: boolean
  lockedReason?: string
  onChange: () => void
}

export function OfferingsEditor({ draftId, offerings, locked, lockedReason, onChange }: OfferingsEditorProps) {
  const [addingPool, setAddingPool] = useState<DraftPool | null>(null)

  const byPool: Record<DraftPool, ShiftOfferingRow[]> = { deli: [], special: [], strike: [] }
  for (const o of offerings) byPool[o.pool].push(o)

  return (
    <div className="space-y-4">
      {locked && (
        <Alert variant="warning">
          {lockedReason ?? 'Rankings are frozen. Editing offerings now can invalidate camper rankings — unfreeze first.'}
        </Alert>
      )}
      {(['deli', 'special', 'strike'] as const).map(pool => (
        <div key={pool} className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-black uppercase text-xs tracking-wider capitalize">
              {pool} <Badge className="ml-1">{byPool[pool].length}</Badge>
            </h4>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setAddingPool(addingPool === pool ? null : pool)}
              disabled={locked}
            >
              {addingPool === pool ? 'Cancel' : `+ Add ${pool}`}
            </Button>
          </div>
          {addingPool === pool && (
            <OfferingRow
              offering={blankOffering(draftId, pool)}
              isNew
              disabled={locked}
              onSaved={() => { onChange(); }}
              onCancel={() => setAddingPool(null)}
            />
          )}
          {byPool[pool]
            .slice()
            .sort((a, b) => a.sort_order - b.sort_order || a.role.localeCompare(b.role))
            .map(o => (
              <OfferingRow key={o.id} offering={o} disabled={locked} onSaved={onChange} />
            ))}
          {byPool[pool].length === 0 && addingPool !== pool && (
            <p className="text-xs text-gray-400">No {pool} offerings.</p>
          )}
        </div>
      ))}
    </div>
  )
}
