import { createClient } from '@/lib/supabase/client'
import type {
  FloorplanConfigRow,
  FloorplanObjectRow,
  FloorplanObjectInsert,
  FloorplanObjectUpdate,
  FloorplanConfigInsert,
  FloorplanConfigUpdate,
} from '@/types/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = () => createClient() as any

// ========== Floorplan Configs ==========

export async function fetchActiveFloorplan(): Promise<FloorplanConfigRow | null> {
  const { data, error } = await supabase()
    .from('floorplan_configs')
    .select('*')
    .eq('is_active', true)
    .limit(1)
    .single()

  if (error) {
    console.error('Error fetching active floorplan:', error)
    return null
  }
  return data
}

export async function fetchAllFloorplans(): Promise<FloorplanConfigRow[]> {
  const { data, error } = await supabase()
    .from('floorplan_configs')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching floorplans:', error)
    return []
  }
  return data || []
}

export async function createFloorplan(config: FloorplanConfigInsert): Promise<FloorplanConfigRow | null> {
  const { data, error } = await supabase()
    .from('floorplan_configs')
    .insert(config)
    .select()
    .single()

  if (error) {
    console.error('Error creating floorplan:', error)
    return null
  }
  return data
}

export async function updateFloorplan(
  id: string,
  updates: FloorplanConfigUpdate
): Promise<FloorplanConfigRow | null> {
  const { data, error } = await supabase()
    .from('floorplan_configs')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating floorplan:', error)
    return null
  }
  return data
}

export async function setActiveFloorplan(id: string): Promise<boolean> {
  // Deactivate all first
  await supabase().from('floorplan_configs').update({ is_active: false }).neq('id', '')
  // Activate the chosen one
  const { error } = await supabase()
    .from('floorplan_configs')
    .update({ is_active: true })
    .eq('id', id)

  if (error) {
    console.error('Error setting active floorplan:', error)
    return false
  }
  return true
}

// ========== Floorplan Objects ==========

export async function fetchFloorplanObjects(floorplanId: string): Promise<FloorplanObjectRow[]> {
  const { data, error } = await supabase()
    .from('floorplan_objects')
    .select('*')
    .eq('floorplan_id', floorplanId)
    .order('z_index', { ascending: true })

  if (error) {
    console.error('Error fetching floorplan objects:', error)
    return []
  }
  return data || []
}

export async function createFloorplanObject(
  obj: FloorplanObjectInsert
): Promise<FloorplanObjectRow | null> {
  const { data, error } = await supabase()
    .from('floorplan_objects')
    .insert(obj)
    .select()
    .single()

  if (error) {
    console.error('Error creating floorplan object:', error)
    return null
  }
  return data
}

export async function updateFloorplanObject(
  id: string,
  updates: FloorplanObjectUpdate
): Promise<FloorplanObjectRow | null> {
  const { data, error } = await supabase()
    .from('floorplan_objects')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating floorplan object:', error)
    return null
  }
  return data
}

export async function deleteFloorplanObject(id: string): Promise<boolean> {
  const { error } = await supabase()
    .from('floorplan_objects')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting floorplan object:', error)
    return false
  }
  return true
}

export async function batchUpdateObjects(
  objects: Array<{ id: string } & FloorplanObjectUpdate>
): Promise<boolean> {
  // Update objects one by one (Supabase doesn't support batch update easily)
  const results = await Promise.all(
    objects.map(({ id, ...updates }) =>
      supabase()
        .from('floorplan_objects')
        .update(updates)
        .eq('id', id)
    )
  )

  const hasError = results.some(r => r.error)
  if (hasError) {
    console.error('Error in batch update')
    return false
  }
  return true
}
