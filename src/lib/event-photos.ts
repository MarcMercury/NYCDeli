import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { Database, EventPhotoAlbumRow, PhotoAlbumProvider } from '@/types/database'

/**
 * Photo drives are linked, not hosted. Camp photos live in whatever shared
 * album the people who took them already use; we keep the link attached to the
 * event so it still resolves years after the event is closed.
 */

type DeliSupabase = SupabaseClient<Database>

function db(client?: DeliSupabase): DeliSupabase {
  return client ?? (createClient() as DeliSupabase)
}

export const PHOTO_PROVIDER_META: Record<PhotoAlbumProvider, { label: string; icon: string }> = {
  google_photos: { label: 'Google Photos', icon: '🖼️' },
  google_drive: { label: 'Google Drive', icon: '📁' },
  dropbox: { label: 'Dropbox', icon: '📦' },
  icloud: { label: 'iCloud', icon: '☁️' },
  smugmug: { label: 'SmugMug', icon: '📷' },
  flickr: { label: 'Flickr', icon: '📸' },
  other: { label: 'Link', icon: '🔗' },
}

export const PHOTO_PROVIDERS = Object.keys(PHOTO_PROVIDER_META) as PhotoAlbumProvider[]

/**
 * Only http(s) links are ever stored or rendered — anything else (javascript:,
 * data:) would become an injection vector the moment it's used as an href.
 */
export function normalizeAlbumUrl(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return null
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
  return parsed.toString()
}

export function detectAlbumProvider(url: string): PhotoAlbumProvider {
  let host: string
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    return 'other'
  }
  if (host.endsWith('photos.google.com') || host.endsWith('photos.app.goo.gl')) return 'google_photos'
  if (host.endsWith('drive.google.com') || host.endsWith('docs.google.com')) return 'google_drive'
  if (host.endsWith('dropbox.com')) return 'dropbox'
  if (host.endsWith('icloud.com')) return 'icloud'
  if (host.endsWith('smugmug.com')) return 'smugmug'
  if (host.endsWith('flickr.com')) return 'flickr'
  return 'other'
}

/** Rows the caller is allowed to see: RLS hides members-only albums from anon. */
export async function fetchEventPhotoAlbums(
  eventId: string,
  client?: DeliSupabase
): Promise<EventPhotoAlbumRow[]> {
  const { data } = await db(client)
    .from('event_photo_albums')
    .select('*')
    .eq('event_id', eventId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  return (data as EventPhotoAlbumRow[] | null) ?? []
}

export async function fetchAllPhotoAlbums(client?: DeliSupabase): Promise<EventPhotoAlbumRow[]> {
  const { data } = await db(client)
    .from('event_photo_albums')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  return (data as EventPhotoAlbumRow[] | null) ?? []
}
