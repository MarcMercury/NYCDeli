'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
  Badge, Button, Input
} from '@/components/ui'
import { cn } from '@/lib/utils'
import { resolveTentMateIds } from '@/lib/tent-mates'
import type { UserProfileRow, CamperRow, CamperPhotoRow } from '@/types/database'

interface CamperDirectory {
  profile: UserProfileRow
  camper: CamperRow | null
  photos: CamperPhotoRow[]
}

export default function CampersPage() {
  const [directory, setDirectory] = useState<CamperDirectory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCamper, setSelectedCamper] = useState<CamperDirectory | null>(null)
  const [campersById, setCampersById] = useState<Map<string, CamperRow>>(new Map())

  const fetchDirectory = useCallback(async () => {
    const supabase = createClient()

    // Get all approved users
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('*')
      .in('role', ['user', 'builder', 'admin'])
      .order('email') as unknown as { data: UserProfileRow[] | null }

    // Get all campers
    const { data: campers } = await supabase
      .from('campers')
      .select('*') as unknown as { data: CamperRow[] | null }

    // Get all photos
    const { data: photos } = await supabase
      .from('camper_photos')
      .select('*')
      .order('display_order') as unknown as { data: CamperPhotoRow[] | null }

    const campersByEmail = new Map<string, CamperRow>()
    campers?.forEach(c => {
      if (c.email) campersByEmail.set(c.email.trim().toLowerCase(), c)
    })

    const campersById_ = new Map<string, CamperRow>()
    campers?.forEach(c => campersById_.set(c.id, c))
    setCampersById(campersById_)

    const photosByUser = new Map<string, CamperPhotoRow[]>()
    photos?.forEach(p => {
      const existing = photosByUser.get(p.user_id) || []
      existing.push(p)
      photosByUser.set(p.user_id, existing)
    })

    const entries: CamperDirectory[] = (profiles || []).map(p => ({
      profile: p,
      camper: campersByEmail.get((p.email || '').trim().toLowerCase()) || null,
      photos: photosByUser.get(p.id) || [],
    }))

    setDirectory(entries)
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    fetchDirectory()
  }, [fetchDirectory])

  const filtered = directory.filter(entry => {
    const term = searchTerm.toLowerCase()
    return (
      entry.profile.email.toLowerCase().includes(term) ||
      (entry.camper?.full_name || '').toLowerCase().includes(term) ||
      (entry.camper?.playa_name || '').toLowerCase().includes(term)
    )
  })

  const getPhotoUrl = (path: string) => {
    const supabase = createClient()
    const { data } = supabase.storage.from('camper-photos').getPublicUrl(path)
    return data.publicUrl
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-wider">🐀 Camp Directory</h1>
        <div className="mt-3 inline-flex items-center gap-3 border-2 border-black bg-yellow-50 px-4 py-2">
          <span className="text-3xl font-black tabular-nums">{directory.length}</span>
          <span className="text-xs font-bold uppercase tracking-widest text-gray-600">
            Camper Count
          </span>
        </div>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Search by name, playa name, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Selected Camper Modal */}
      {selectedCamper && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedCamper(null)}
        >
          <Card
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto border-2 border-yellow-400 bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">
                    {selectedCamper.camper?.full_name || selectedCamper.profile.email}
                  </CardTitle>
                  <CardDescription>
                    {selectedCamper.camper?.playa_name && (
                      <span className="text-yellow-700 font-bold">
                        &quot;{selectedCamper.camper.playa_name}&quot;
                      </span>
                    )}
                  </CardDescription>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedCamper(null)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Photos */}
              {selectedCamper.photos.length > 0 && (
                <div className="flex gap-4 flex-wrap">
                  {selectedCamper.photos.map(photo => (
                    <div key={photo.id} className="w-32 h-32 border-2 border-black overflow-hidden">
                      <Image
                        src={getPhotoUrl(photo.storage_path)}
                        alt="Camper photo"
                        className="w-full h-full object-cover"
                        width={128}
                        height={128}
                        unoptimized
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Bio */}
              {selectedCamper.profile.bio && (
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-1">About</h4>
                  <p className="text-sm">{selectedCamper.profile.bio}</p>
                </div>
              )}

              {/* Contact & Info */}
              {selectedCamper.camper && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div className="min-w-0">
                    <span className="text-gray-500 block">Email</span>
                    <span className="font-bold break-all">{selectedCamper.camper.email}</span>
                  </div>
                  {selectedCamper.camper.phone && (
                    <div className="min-w-0">
                      <span className="text-gray-500 block">Phone</span>
                      <span className="font-bold">{selectedCamper.camper.phone}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500 block">Shelter</span>
                    <span className="font-bold capitalize">{selectedCamper.camper.shelter_type}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Arrival</span>
                    <span className="font-bold">{selectedCamper.camper.arrival_date}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Build Week</span>
                    <span className="font-bold">{selectedCamper.camper.build_week_attending ? 'Yes' : 'No'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Kitchen</span>
                    <span className="font-bold">{selectedCamper.camper.kitchen_participation ? 'Yes' : 'No'}</span>
                  </div>
                  {selectedCamper.camper && (() => {
                    const mates = resolveTentMateIds(selectedCamper.camper.id, [...campersById.values()])
                      .map(id => campersById.get(id))
                      .filter((c): c is CamperRow => !!c)
                    if (mates.length === 0) return null
                    return (
                      <div>
                        <span className="text-gray-500 block">Sharing Tent With</span>
                        <span className="font-bold">
                          {mates.map(m => m.playa_name ? `${m.full_name} ("${m.playa_name}")` : m.full_name).join(', ')}
                        </span>
                      </div>
                    )
                  })()}
                </div>
              )}

              {selectedCamper.camper?.skills && selectedCamper.camper.skills.length > 0 && (
                <div>
                  <span className="text-gray-500 block text-sm mb-1">Skills</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedCamper.camper.skills.map(s => (
                      <Badge key={s} variant="default">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Directory Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map(entry => (
          <button
            key={entry.profile.id}
            onClick={() => setSelectedCamper(entry)}
            className={cn(
              'text-left border-2 border-black p-4 transition-all hover:bg-yellow-50 hover:border-yellow-400',
              selectedCamper?.profile.id === entry.profile.id && 'bg-yellow-50 border-yellow-400'
            )}
          >
            {/* Avatar / First Photo */}
            <div className="w-full aspect-square bg-gray-100 border border-gray-200 mb-3 overflow-hidden flex items-center justify-center">
              {entry.photos.length > 0 ? (
                <Image
                  src={getPhotoUrl(entry.photos[0].storage_path)}
                  alt={entry.camper?.full_name || 'Camper'}
                  className="w-full h-full object-cover"
                  width={200}
                  height={200}
                  unoptimized
                />
              ) : (
                <span className="text-4xl">🐀</span>
              )}
            </div>

            <h3 className="font-bold text-sm truncate">
              {entry.camper?.full_name || entry.profile.email}
            </h3>
            {entry.camper?.playa_name && (
              <p className="text-xs text-yellow-700 font-bold truncate">
                &quot;{entry.camper.playa_name}&quot;
              </p>
            )}
            {entry.profile.bio && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{entry.profile.bio}</p>
            )}
            <div className="flex gap-1 mt-2 flex-wrap">
              {entry.profile.role === 'admin' && <Badge variant="info">Admin</Badge>}
              {entry.camper?.build_week_attending && <Badge variant="default">Builder</Badge>}
              {entry.camper && (() => {
                const mates = resolveTentMateIds(entry.camper.id, [...campersById.values()])
                  .map(id => campersById.get(id))
                  .filter((c): c is CamperRow => !!c)
                if (mates.length === 0) return null
                const label = mates.map(m => m.playa_name || m.full_name).join(', ')
                return (
                  <Badge variant="info">
                    🏕️ w/ {label}
                  </Badge>
                )
              })()}
            </div>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-4">🔍</p>
          <p className="font-bold uppercase tracking-wider">No campers found</p>
        </div>
      )}
    </div>
  )
}
