'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import { detectAlbumProvider, normalizeAlbumUrl } from '@/lib/event-photos'
import type { EventPhotoAlbumInsert, EventPhotoAlbumRow, PhotoAlbumProvider } from '@/types/database'

type ActionResult<T = undefined> = { success: true; data?: T } | { success: false; error: string }

function fail(error: string): ActionResult<never> {
  return { success: false, error }
}

async function revalidateAlbums(eventId: string) {
  const supabase = await createClient()
  const { data } = await supabase.from('events').select('slug').eq('id', eventId).maybeSingle()
  const slug = (data as { slug: string } | null)?.slug
  revalidatePath('/photos')
  revalidatePath(`/admin/events/${eventId}`)
  if (slug) revalidatePath(`/events/${slug}`)
}

export interface PhotoAlbumInput {
  label: string
  url: string
  provider?: PhotoAlbumProvider
  description?: string
  isPublic?: boolean
  sortOrder?: number
}

/**
 * Album links are intentionally editable on closed events: the photos almost
 * always show up after the event has been archived.
 */
export async function addEventPhotoAlbumAction(
  eventId: string,
  input: PhotoAlbumInput
): Promise<ActionResult<EventPhotoAlbumRow>> {
  const { user } = await requireAdmin()
  const label = input.label?.trim()
  if (!label) return fail('Give the album a name')

  const url = normalizeAlbumUrl(input.url ?? '')
  if (!url) return fail('Enter a valid http(s) album link')

  const supabase = await createClient()
  const insert: EventPhotoAlbumInsert = {
    event_id: eventId,
    label,
    url,
    provider: input.provider ?? detectAlbumProvider(url),
    description: input.description?.trim() || null,
    is_public: input.isPublic ?? false,
    sort_order: input.sortOrder ?? 0,
    created_by: user.id,
  }

  const { data, error } = await supabase.from('event_photo_albums').insert(insert as never).select('*').single()
  if (error) return fail(error.message)

  await revalidateAlbums(eventId)
  return { success: true, data: data as EventPhotoAlbumRow }
}

export async function updateEventPhotoAlbumAction(
  albumId: string,
  input: PhotoAlbumInput
): Promise<ActionResult> {
  await requireAdmin()
  const label = input.label?.trim()
  if (!label) return fail('Give the album a name')

  const url = normalizeAlbumUrl(input.url ?? '')
  if (!url) return fail('Enter a valid http(s) album link')

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('event_photo_albums')
    .select('event_id')
    .eq('id', albumId)
    .maybeSingle()
  const row = existing as { event_id: string } | null
  if (!row) return fail('Album not found')

  const { error } = await supabase
    .from('event_photo_albums')
    .update({
      label,
      url,
      provider: input.provider ?? detectAlbumProvider(url),
      description: input.description?.trim() || null,
      is_public: input.isPublic ?? false,
      sort_order: input.sortOrder ?? 0,
    } as never)
    .eq('id', albumId)
  if (error) return fail(error.message)

  await revalidateAlbums(row.event_id)
  return { success: true }
}

export async function deleteEventPhotoAlbumAction(albumId: string): Promise<ActionResult> {
  await requireAdmin()
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('event_photo_albums')
    .select('event_id')
    .eq('id', albumId)
    .maybeSingle()
  const row = existing as { event_id: string } | null
  if (!row) return fail('Album not found')

  const { error } = await supabase.from('event_photo_albums').delete().eq('id', albumId)
  if (error) return fail(error.message)

  await revalidateAlbums(row.event_id)
  return { success: true }
}
