'use server'

import { createClient } from '@/lib/supabase/server'
import { requireApproved } from '@/lib/auth'
import type { PackingListItemInsert, PackingListItemUpdate, PackingListItemRow, PackingItemStatus } from '@/types/database'

export type PackingListActionResult = {
  success: boolean
  error?: string
  items?: PackingListItemRow[]
  item?: PackingListItemRow
}

export async function getPackingListAction(camperId: string): Promise<PackingListActionResult> {
  await requireApproved()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('packing_list_items')
    .select('*')
    .eq('camper_id', camperId)
    .order('category')
    .order('sort_order')

  if (error) return { success: false, error: error.message }
  return { success: true, items: data as PackingListItemRow[] }
}

export async function syncMissingBaseItemsAction(
  camperId: string,
  baseItems: { category: string; item: string; priority?: 'must' | 'nice' | 'optional'; notes?: string }[]
): Promise<PackingListActionResult> {
  await requireApproved()
  const supabase = await createClient()

  // One-time category renames so existing rows match the new base list grouping
  const CATEGORY_REMAP: Record<string, string> = {
    'Shelter & Sleep': 'Shelter, Sleep & Camp Setup',
    'Camp Setup & Home': 'Shelter, Sleep & Camp Setup',
    'Water & Hydration': 'Water, Hydration & Drinks',
    'Drinks & Beverages': 'Water, Hydration & Drinks',
    'Personal Care & Hygiene': 'Personal Care & Bathing',
    'Bathing': 'Personal Care & Bathing',
  }
  for (const [oldCat, newCat] of Object.entries(CATEGORY_REMAP)) {
    await supabase
      .from('packing_list_items')
      .update({ category: newCat } as never)
      .eq('camper_id', camperId)
      .eq('category', oldCat)
  }

  const { data: existing, error: fetchError } = await supabase
    .from('packing_list_items')
    .select('*')
    .eq('camper_id', camperId)

  if (fetchError) return { success: false, error: fetchError.message }

  const existingItems = (existing as PackingListItemRow[]) || []
  // If list is empty, do not auto-populate; user must click "Load Camp Packing Guide"
  if (existingItems.length === 0) {
    return { success: true, items: [] }
  }

  const existingKeys = new Set(
    existingItems.map(i => `${(i.category || '').toLowerCase()}|${i.item.toLowerCase()}`)
  )

  const missing = baseItems.filter(
    b => !existingKeys.has(`${(b.category || '').toLowerCase()}|${b.item.toLowerCase()}`)
  )

  if (missing.length === 0) {
    return { success: true, items: existingItems }
  }

  const startSort = existingItems.length
  const rows = missing.map((entry, idx) => ({
    camper_id: camperId,
    category: entry.category || 'Uncategorized',
    item: entry.item,
    priority: entry.priority || 'must',
    status: 'need',
    notes: entry.notes || null,
    sort_order: startSort + idx,
  }))

  const { error: insertError } = await supabase
    .from('packing_list_items')
    .insert(rows as never[])

  if (insertError) return { success: false, error: insertError.message }

  // Return refreshed list
  const { data: refreshed, error: refreshError } = await supabase
    .from('packing_list_items')
    .select('*')
    .eq('camper_id', camperId)
    .order('category')
    .order('sort_order')

  if (refreshError) return { success: false, error: refreshError.message }
  return { success: true, items: refreshed as PackingListItemRow[] }
}

export async function addPackingListItemAction(
  data: PackingListItemInsert
): Promise<PackingListActionResult> {
  await requireApproved()

  if (!data.item.trim()) {
    return { success: false, error: 'Item name is required' }
  }
  if (data.item.length > 200) {
    return { success: false, error: 'Item name must be under 200 characters' }
  }
  if (data.category && data.category.length > 100) {
    return { success: false, error: 'Category must be under 100 characters' }
  }

  const supabase = await createClient()

  const { data: item, error } = await supabase
    .from('packing_list_items')
    .insert(data as never)
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, item: item as PackingListItemRow }
}

export async function updatePackingListItemAction(
  itemId: string,
  updates: PackingListItemUpdate
): Promise<PackingListActionResult> {
  await requireApproved()

  if (updates.item !== undefined && !updates.item.trim()) {
    return { success: false, error: 'Item name is required' }
  }
  if (updates.item !== undefined && updates.item.length > 200) {
    return { success: false, error: 'Item name must be under 200 characters' }
  }

  const supabase = await createClient()

  const { data: item, error } = await supabase
    .from('packing_list_items')
    .update(updates as never)
    .eq('id', itemId)
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, item: item as PackingListItemRow }
}

export async function deletePackingListItemAction(
  itemId: string
): Promise<PackingListActionResult> {
  await requireApproved()
  const supabase = await createClient()

  const { error } = await supabase
    .from('packing_list_items')
    .delete()
    .eq('id', itemId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function bulkInsertPackingListAction(
  camperId: string,
  items: { category: string; item: string; priority?: 'must' | 'nice' | 'optional'; notes?: string }[]
): Promise<PackingListActionResult> {
  await requireApproved()
  const supabase = await createClient()

  // Clear existing items first
  await supabase
    .from('packing_list_items')
    .delete()
    .eq('camper_id', camperId)

  if (items.length === 0) {
    return { success: true, items: [] }
  }

  const rows = items.map((entry, idx) => ({
    camper_id: camperId,
    category: entry.category || 'Uncategorized',
    item: entry.item,
    priority: entry.priority || 'must',
    status: 'need',
    notes: entry.notes || null,
    sort_order: idx,
  }))

  const { data, error } = await supabase
    .from('packing_list_items')
    .insert(rows as never[])
    .select()

  if (error) return { success: false, error: error.message }
  return { success: true, items: data as PackingListItemRow[] }
}

export async function updateStatusAction(
  itemId: string,
  status: PackingItemStatus
): Promise<PackingListActionResult> {
  await requireApproved()

  const validStatuses: PackingItemStatus[] = ['need', 'ordered', 'have', 'packed', 'camp_provided', 'na']
  if (!validStatuses.includes(status)) {
    return { success: false, error: 'Invalid status' }
  }

  const supabase = await createClient()

  const { data: item, error } = await supabase
    .from('packing_list_items')
    .update({ status } as never)
    .eq('id', itemId)
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, item: item as PackingListItemRow }
}
