'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import {
  PHOTO_PROVIDERS,
  PHOTO_PROVIDER_META,
  detectAlbumProvider,
  fetchEventPhotoAlbums,
  normalizeAlbumUrl,
} from '@/lib/event-photos'
import {
  addEventPhotoAlbumAction,
  deleteEventPhotoAlbumAction,
  updateEventPhotoAlbumAction,
} from '@/app/actions/event-photos'
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Checkbox, Input, Select, Textarea } from '@/components/ui'
import type { EventPhotoAlbumRow, PhotoAlbumProvider } from '@/types/database'

function AlbumLink({ album }: { album: EventPhotoAlbumRow }) {
  const meta = PHOTO_PROVIDER_META[album.provider] ?? PHOTO_PROVIDER_META.other
  const href = normalizeAlbumUrl(album.url)
  if (!href) return null

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block border-2 border-black bg-white hover:bg-yellow-100 p-3"
    >
      <span className="flex items-center gap-2 flex-wrap">
        <span aria-hidden>{meta.icon}</span>
        <span className="font-black uppercase tracking-wide">{album.label}</span>
        <Badge>{meta.label}</Badge>
        {album.is_public && <Badge variant="info">Public</Badge>}
      </span>
      {album.description && <span className="block text-sm text-gray-600 mt-1">{album.description}</span>}
      <span className="block text-xs text-gray-500 mt-1 break-all">{href}</span>
    </a>
  )
}

/** Read-only album list for an event page. Renders nothing when there are none. */
export function EventPhotoAlbums({ eventId }: { eventId: string }) {
  const [albums, setAlbums] = useState<EventPhotoAlbumRow[]>([])
  const [, startTransition] = useTransition()

  useEffect(() => {
    startTransition(() => {
      fetchEventPhotoAlbums(eventId).then(setAlbums)
    })
  }, [eventId])

  if (albums.length === 0) return null

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Photos</CardTitle>
      </CardHeader>
      <CardContent className="py-4 space-y-2">
        {albums.map(album => (
          <AlbumLink key={album.id} album={album} />
        ))}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------

const blankForm = { label: '', url: '', provider: '' as '' | PhotoAlbumProvider, description: '', isPublic: false }
type FormState = typeof blankForm

function formFrom(album: EventPhotoAlbumRow): FormState {
  return {
    label: album.label,
    url: album.url,
    provider: album.provider,
    description: album.description ?? '',
    isPublic: album.is_public,
  }
}

/**
 * Admin editor. Available on closed events on purpose — photo drives are
 * usually shared weeks after everyone gets home.
 */
export function EventPhotoAlbumsAdmin({ eventId }: { eventId: string }) {
  const [albums, setAlbums] = useState<EventPhotoAlbumRow[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(blankForm)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [, startTransition] = useTransition()

  const load = useCallback(async () => {
    setAlbums(await fetchEventPhotoAlbums(eventId))
  }, [eventId])

  useEffect(() => {
    startTransition(() => { load() })
  }, [load])

  const reset = () => {
    setEditingId(null)
    setForm(blankForm)
  }

  const save = async () => {
    setSaving(true)
    setMessage(null)
    const payload = {
      label: form.label,
      url: form.url,
      provider: form.provider || detectAlbumProvider(form.url),
      description: form.description,
      isPublic: form.isPublic,
      sortOrder: editingId ? (albums.find(a => a.id === editingId)?.sort_order ?? 0) : albums.length,
    }
    const result = editingId
      ? await updateEventPhotoAlbumAction(editingId, payload)
      : await addEventPhotoAlbumAction(eventId, payload)
    setSaving(false)

    if (result.success) {
      setMessage({ type: 'success', text: editingId ? 'Album updated.' : 'Album linked.' })
      reset()
      load()
    } else {
      setMessage({ type: 'error', text: result.error })
    }
  }

  const remove = async (album: EventPhotoAlbumRow) => {
    if (!confirm(`Remove the link to “${album.label}”? The album itself is not touched.`)) return
    const result = await deleteEventPhotoAlbumAction(album.id)
    if (result.success) {
      if (editingId === album.id) reset()
      load()
    } else {
      setMessage({ type: 'error', text: result.error })
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Linked Photo Drives</CardTitle>
        </CardHeader>
        <CardContent className="py-4 space-y-3">
          <p className="text-gray-700">
            Paste share links to Google Photos, Drive, Dropbox or anywhere else the camp keeps its pictures. Links stay
            attached to the event after it&apos;s closed, so the archive keeps working.
          </p>
          {message && (
            <Alert variant={message.type === 'error' ? 'error' : 'success'}>{message.text}</Alert>
          )}
          {albums.length === 0 ? (
            <p className="text-gray-600">No photo drives linked yet.</p>
          ) : (
            albums.map(album => (
              <div key={album.id} className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-[260px]">
                  <AlbumLink album={album} />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setEditingId(album.id)
                      setForm(formFrom(album))
                    }}
                  >
                    Edit
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => remove(album)}>Remove</Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? 'Edit Album Link' : 'Link a Photo Drive'}</CardTitle>
        </CardHeader>
        <CardContent className="py-4 space-y-4">
          <Input
            label="Album name"
            placeholder="Burning Man 2026 — Camp Album"
            value={form.label}
            onChange={e => setForm({ ...form, label: e.target.value })}
          />
          <Input
            label="Share link"
            placeholder="https://photos.google.com/share/…"
            value={form.url}
            onChange={e => setForm({ ...form, url: e.target.value })}
          />
          <Select
            label="Provider"
            value={form.provider || (form.url ? detectAlbumProvider(form.url) : 'other')}
            onChange={e => setForm({ ...form, provider: e.target.value as PhotoAlbumProvider })}
            options={PHOTO_PROVIDERS.map(p => ({ value: p, label: PHOTO_PROVIDER_META[p].label }))}
          />
          <Textarea
            label="Description"
            rows={2}
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
          />
          <Checkbox
            label="Visible to anyone (including logged-out visitors)"
            checked={form.isPublic}
            onChange={e => setForm({ ...form, isPublic: e.target.checked })}
          />
          <p className="text-sm text-gray-600">
            Leave unchecked to keep the link to signed-in camp members only. A share link works for anyone who has it.
          </p>
          <div className="flex gap-3">
            <Button disabled={saving} onClick={save}>
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Link Album'}
            </Button>
            {editingId && <Button variant="ghost" onClick={reset}>Cancel</Button>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
