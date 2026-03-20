'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
  Badge, Alert, Button, Textarea
} from '@/components/ui'
import type { UserProfileRow, CamperRow, CamperPhotoRow } from '@/types/database'

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfileRow | null>(null)
  const [camper, setCamper] = useState<CamperRow | null>(null)
  const [photos, setPhotos] = useState<CamperPhotoRow[]>([])
  const [bio, setBio] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchProfile = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [profileResult, photosResult] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('id', user.id).single() as unknown as { data: UserProfileRow | null },
      supabase.from('camper_photos').select('*').eq('user_id', user.id).order('display_order') as unknown as { data: CamperPhotoRow[] | null },
    ])

    if (profileResult.data) {
      setProfile(profileResult.data)
      setBio(profileResult.data.bio || '')

      // Fetch linked camper
      if (profileResult.data.camper_id) {
        const { data: camperData } = await supabase
          .from('campers')
          .select('*')
          .eq('id', profileResult.data.camper_id)
          .single() as unknown as { data: CamperRow | null }
        setCamper(camperData)
      } else {
        // Try matching by email
        const { data: camperData } = await supabase
          .from('campers')
          .select('*')
          .eq('email', profileResult.data.email)
          .single() as unknown as { data: CamperRow | null }
        setCamper(camperData || null)
      }
    }

    setPhotos(photosResult.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    fetchProfile()
  }, [fetchProfile])

  const saveBio = async () => {
    if (!profile) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('user_profiles')
      .update({ bio } as never)
      .eq('id', profile.id)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Bio saved!' })
    }
    setSaving(false)
  }

  const uploadPhoto = async (file: File) => {
    if (!profile) return
    if (photos.length >= 3) {
      setMessage({ type: 'error', text: 'Maximum 3 photos allowed' })
      return
    }

    const MAX_SIZE = 5 * 1024 * 1024 // 5MB
    if (file.size > MAX_SIZE) {
      setMessage({ type: 'error', text: 'Photo must be under 5MB' })
      return
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Only JPEG, PNG, and WebP files are allowed' })
      return
    }

    setUploading(true)
    try {
      const supabase = createClient()
      const nextOrder = photos.length + 1

      const fileExt = file.name.split('.').pop()
      const fileName = `${profile.id}/${nextOrder}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('camper-photos')
        .upload(fileName, file, { upsert: true })

      if (uploadError) {
        setMessage({ type: 'error', text: uploadError.message })
        return
      }

      const { error: dbError } = await supabase
        .from('camper_photos')
        .insert({
          user_id: profile.id,
          storage_path: fileName,
          display_order: nextOrder,
        } as never)

      if (dbError) {
        setMessage({ type: 'error', text: dbError.message })
      } else {
        setMessage({ type: 'success', text: 'Photo uploaded!' })
        fetchProfile()
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Upload failed' })
    } finally {
      setUploading(false)
    }
  }

  const deletePhoto = async (photo: CamperPhotoRow) => {
    const supabase = createClient()

    await supabase.storage.from('camper-photos').remove([photo.storage_path])

    const { error } = await supabase
      .from('camper_photos')
      .delete()
      .eq('id', photo.id)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Photo removed' })
      fetchProfile()
    }
  }

  const getPhotoUrl = (path: string) => {
    const supabase = createClient()
    const { data } = supabase.storage.from('camper-photos').getPublicUrl(path)
    return data.publicUrl
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p>Unable to load profile. Please try logging in again.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-wider">👤 My Profile</h1>
        <p className="text-gray-600 mt-1">Your camp info and photos</p>
      </div>

      {message && (
        <Alert variant={message.type === 'success' ? 'success' : 'error'} className="mb-6">
          {message.text}
        </Alert>
      )}

      {/* Bio Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>About Me</CardTitle>
          <CardDescription>
            Tell the camp a little about yourself. This is visible to other campers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Hey camp! A little about me..."
            rows={4}
            maxLength={500}
          />
          <p className="text-xs text-gray-400 mt-1">{bio.length}/500</p>
        </CardContent>
        <CardFooter>
          <Button onClick={saveBio} disabled={saving}>
            {saving ? 'Saving...' : 'Save Bio'}
          </Button>
        </CardFooter>
      </Card>

      {/* Photos Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Photos</CardTitle>
          <CardDescription>
            Upload up to 3 photos of yourself so campmates know who you are.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {photos.map(photo => (
              <div key={photo.id} className="relative aspect-square border-2 border-black overflow-hidden group">
                <Image
                  src={getPhotoUrl(photo.storage_path)}
                  alt={`Photo ${photo.display_order}`}
                  className="w-full h-full object-cover"
                  width={200}
                  height={200}
                  unoptimized
                />
                <button
                  onClick={() => deletePhoto(photo)}
                  className="absolute top-1 right-1 bg-red-600 text-white w-6 h-6 rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Delete photo"
                >
                  ✕
                </button>
              </div>
            ))}
            {photos.length < 3 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="aspect-square border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-yellow-400 hover:text-yellow-600 transition-colors"
              >
                <span className="text-3xl">{uploading ? '⏳' : '+'}</span>
                <span className="text-xs mt-1">{uploading ? 'Uploading...' : 'Add Photo'}</span>
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) uploadPhoto(file)
              e.target.value = ''
            }}
          />
        </CardContent>
      </Card>

      {/* Registration Info (read-only) */}
      {camper ? (
        <Card>
          <CardHeader>
            <CardTitle>Registration Info</CardTitle>
            <CardDescription>
              From your camp registration form. Contact an admin to update.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 block">Name</span>
                <span className="font-bold">{camper.full_name}</span>
              </div>
              {camper.playa_name && (
                <div>
                  <span className="text-gray-500 block">Playa Name</span>
                  <span className="font-bold">{camper.playa_name}</span>
                </div>
              )}
              <div>
                <span className="text-gray-500 block">Email</span>
                <span className="font-bold">{camper.email}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Phone</span>
                <span className="font-bold">{camper.phone || '—'}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Shelter</span>
                <span className="font-bold capitalize">{camper.shelter_type} ({camper.shelter_length_ft}×{camper.shelter_width_ft} ft)</span>
              </div>
              <div>
                <span className="text-gray-500 block">Arrival</span>
                <span className="font-bold">{camper.arrival_date} via {camper.arrival_method}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Build Week</span>
                <span className="font-bold">{camper.build_week_attending ? 'Yes' : 'No'}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Kitchen</span>
                <span className="font-bold">{camper.kitchen_participation ? 'Yes' : 'No'}</span>
              </div>
            </div>

            {camper.skills && camper.skills.length > 0 && (
              <div>
                <span className="text-gray-500 block text-sm mb-1">Skills</span>
                <div className="flex flex-wrap gap-1">
                  {camper.skills.map(s => (
                    <Badge key={s} variant="default">{s}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-500">
              No registration record linked. Make sure to{' '}
              <a href="/intake" className="font-bold text-black underline">complete your registration</a>{' '}
              using the same email you signed up with.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
