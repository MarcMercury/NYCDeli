'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
  Badge, Alert, Button, Textarea, Input, Select, Checkbox, CheckboxGroup,
  Tabs, TabPanel
} from '@/components/ui'
import { shelterTypes, arrivalMethods, powerTypes, orientationPreferences, shiftTypes, skillTags } from '@/lib/validations'
import type { UserProfileRow, CamperRow, CamperPhotoRow, UserRole } from '@/types/database'
import type { Tab } from '@/components/ui/tabs'

const profileTabs: Tab[] = [
  { id: 'about', label: 'About Me & Photos' },
  { id: 'details', label: 'Camper Details' },
]

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('about')
  const [profile, setProfile] = useState<UserProfileRow | null>(null)
  const [camper, setCamper] = useState<CamperRow | null>(null)
  const [photos, setPhotos] = useState<CamperPhotoRow[]>([])
  const [bio, setBio] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingDetails, setSavingDetails] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isOwnProfile, setIsOwnProfile] = useState(true)
  const [viewerRole, setViewerRole] = useState<UserRole>('user')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Editable camper detail fields
  const [editCamper, setEditCamper] = useState<Partial<CamperRow>>({})

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
      setViewerRole(profileResult.data.role)
      setIsOwnProfile(true)

      // Fetch linked camper
      let camperData: CamperRow | null = null
      if (profileResult.data.camper_id) {
        const result = await supabase
          .from('campers')
          .select('*')
          .eq('id', profileResult.data.camper_id)
          .single() as unknown as { data: CamperRow | null }
        camperData = result.data
      } else {
        // Try matching by email
        const result = await supabase
          .from('campers')
          .select('*')
          .eq('email', profileResult.data.email)
          .single() as unknown as { data: CamperRow | null }
        camperData = result.data || null
      }
      setCamper(camperData)
      if (camperData) {
        setEditCamper(camperData)
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

  const saveCamperDetails = async () => {
    if (!camper) return
    setSavingDetails(true)
    setMessage(null)

    const supabase = createClient()

    // Only send updatable fields (not id, created_at, etc.)
    const updates: Record<string, unknown> = {
      full_name: editCamper.full_name,
      playa_name: editCamper.playa_name || null,
      email: editCamper.email,
      phone: editCamper.phone || null,
      arrival_date: editCamper.arrival_date,
      arrival_method: editCamper.arrival_method,
      departure_date: editCamper.departure_date,
      early_arrival: editCamper.early_arrival,
      shelter_type: editCamper.shelter_type,
      shelter_length_ft: editCamper.shelter_length_ft,
      shelter_width_ft: editCamper.shelter_width_ft,
      shelter_height_ft: editCamper.shelter_height_ft || null,
      orientation_preference: editCamper.orientation_preference,
      power_required: editCamper.power_required,
      power_type: editCamper.power_type,
      shade_required: editCamper.shade_required,
      special_requests: editCamper.special_requests || null,
      kitchen_participation: editCamper.kitchen_participation,
      preferred_shift_types: editCamper.preferred_shift_types,
      strike_participation: editCamper.strike_participation,
      build_week_attending: editCamper.build_week_attending,
      build_week_arrival_date: editCamper.build_week_attending ? editCamper.build_week_arrival_date : null,
      tools_bringing: editCamper.tools_bringing || [],
      vehicle_info: editCamper.vehicle_info || null,
      skills: editCamper.skills,
      custom_skills: editCamper.custom_skills || null,
      emergency_contact: editCamper.emergency_contact || null,
      medical_conditions: editCamper.medical_conditions || null,
      medications: editCamper.medications || null,
      allergies: editCamper.allergies || null,
      dietary_restrictions: editCamper.dietary_restrictions || null,
      burn_count: editCamper.burn_count || null,
      what_attracted_you: editCamper.what_attracted_you || null,
      referral_source: editCamper.referral_source || null,
      character_references: editCamper.character_references || null,
      first_burn_hopes: editCamper.first_burn_hopes || null,
      volunteer_commitment: editCamper.volunteer_commitment,
      sober_shifts: editCamper.sober_shifts,
      background_check_consent: editCamper.background_check_consent,
    }

    const { error } = await supabase
      .from('campers')
      .update(updates as never)
      .eq('id', camper.id)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Camper details saved!' })
      fetchProfile()
    }
    setSavingDetails(false)
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

  const canViewDetails = isOwnProfile || viewerRole === 'admin'

  const updateField = <K extends keyof CamperRow>(field: K, value: CamperRow[K]) => {
    setEditCamper(prev => ({ ...prev, [field]: value }))
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

      <Tabs tabs={canViewDetails ? profileTabs : [profileTabs[0]]} activeTab={activeTab} onChange={setActiveTab} className="mb-0" />

      {/* ───── TAB 1: About Me & Photos (publicly viewable) ───── */}
      <TabPanel tabId="about" activeTab={activeTab}>
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
      </TabPanel>

      {/* ───── TAB 2: Camper Details (private — owner + admins only) ───── */}
      {canViewDetails && (
        <TabPanel tabId="details" activeTab={activeTab}>
          {!camper ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-gray-500">
                  No registration record linked. Make sure to{' '}
                  <a href="/intake" className="font-bold text-black underline">complete your registration</a>{' '}
                  using the same email you signed up with.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Alert variant="info" className="mb-6">
                These details are private — only you and camp admins can see them. Update anything that has changed.
              </Alert>

              {/* Identity */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Identity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    label="Full Name"
                    value={editCamper.full_name || ''}
                    onChange={(e) => updateField('full_name', e.target.value)}
                    required
                  />
                  <Input
                    label="Playa Name"
                    value={editCamper.playa_name || ''}
                    onChange={(e) => updateField('playa_name', e.target.value || null)}
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={editCamper.email || ''}
                    onChange={(e) => updateField('email', e.target.value)}
                    required
                  />
                  <Input
                    label="Phone"
                    type="tel"
                    value={editCamper.phone || ''}
                    onChange={(e) => updateField('phone', e.target.value || null)}
                  />
                </CardContent>
              </Card>

              {/* Arrival & Departure */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Arrival &amp; Departure</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    label="Arrival Date"
                    type="date"
                    value={editCamper.arrival_date || ''}
                    onChange={(e) => updateField('arrival_date', e.target.value)}
                    required
                  />
                  <Select
                    label="Arrival Method"
                    value={editCamper.arrival_method || 'car'}
                    onChange={(e) => updateField('arrival_method', e.target.value as CamperRow['arrival_method'])}
                    options={arrivalMethods.map(m => ({ value: m, label: m.charAt(0).toUpperCase() + m.slice(1) }))}
                    required
                  />
                  <Input
                    label="Departure Date"
                    type="date"
                    value={editCamper.departure_date || ''}
                    onChange={(e) => updateField('departure_date', e.target.value)}
                    required
                  />
                  <Checkbox
                    label="I'm arriving early (before gates open)"
                    checked={editCamper.early_arrival ?? false}
                    onChange={(checked) => updateField('early_arrival', checked as unknown as boolean)}
                  />
                </CardContent>
              </Card>

              {/* Shelter */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Shelter</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select
                    label="Shelter Type"
                    value={editCamper.shelter_type || 'tent'}
                    onChange={(e) => updateField('shelter_type', e.target.value as CamperRow['shelter_type'])}
                    options={shelterTypes.map(t => ({
                      value: t,
                      label: t === 'shiftpod' ? 'Shiftpod' : t === 'rv' ? 'RV' : t.charAt(0).toUpperCase() + t.slice(1)
                    }))}
                    required
                  />
                  <div className="grid grid-cols-3 gap-4">
                    <Input
                      label="Length (ft)"
                      type="number"
                      value={editCamper.shelter_length_ft ?? ''}
                      onChange={(e) => updateField('shelter_length_ft', parseFloat(e.target.value))}
                      min={3} max={50} step={0.5}
                      required
                    />
                    <Input
                      label="Width (ft)"
                      type="number"
                      value={editCamper.shelter_width_ft ?? ''}
                      onChange={(e) => updateField('shelter_width_ft', parseFloat(e.target.value))}
                      min={3} max={30} step={0.5}
                      required
                    />
                    <Input
                      label="Height (ft)"
                      type="number"
                      value={editCamper.shelter_height_ft ?? ''}
                      onChange={(e) => updateField('shelter_height_ft', e.target.value ? parseFloat(e.target.value) : null)}
                      min={3} max={15} step={0.5}
                    />
                  </div>
                  <Select
                    label="Door Orientation Preference"
                    value={editCamper.orientation_preference || 'any'}
                    onChange={(e) => updateField('orientation_preference', e.target.value as CamperRow['orientation_preference'])}
                    options={orientationPreferences.map(o => ({ value: o, label: o.charAt(0).toUpperCase() + o.slice(1) }))}
                  />
                </CardContent>
              </Card>

              {/* Infrastructure */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Infrastructure</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Checkbox
                    label="I need electrical power"
                    checked={editCamper.power_required ?? false}
                    onChange={(checked) => updateField('power_required', checked as unknown as boolean)}
                  />
                  {editCamper.power_required && (
                    <Select
                      label="Power Type"
                      value={editCamper.power_type || 'none'}
                      onChange={(e) => updateField('power_type', e.target.value as CamperRow['power_type'])}
                      options={powerTypes.map(p => ({
                        value: p,
                        label: p === 'none' ? 'None' :
                               p === 'low' ? 'Low (phone charger, small fan)' :
                               p === 'medium' ? 'Medium (CPAP, multiple devices)' :
                               'High (explain below)'
                      }))}
                      required
                    />
                  )}
                  <Checkbox
                    label="I need to be under camp shade structure"
                    checked={editCamper.shade_required ?? false}
                    onChange={(checked) => updateField('shade_required', checked as unknown as boolean)}
                  />
                  <Textarea
                    label="Special Requests"
                    value={editCamper.special_requests || ''}
                    onChange={(e) => updateField('special_requests', e.target.value || null)}
                    placeholder="Keep it reasonable."
                    rows={3}
                  />
                </CardContent>
              </Card>

              {/* Participation */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Participation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Checkbox
                    label="I will participate in kitchen duties"
                    checked={editCamper.kitchen_participation ?? true}
                    onChange={(checked) => updateField('kitchen_participation', checked as unknown as boolean)}
                  />
                  <CheckboxGroup
                    label="Preferred Shift Types"
                    options={shiftTypes.map(s => ({
                      value: s,
                      label: s === 'any' ? 'Any (flexible)' : s.charAt(0).toUpperCase() + s.slice(1)
                    }))}
                    value={editCamper.preferred_shift_types || ['any']}
                    onChange={(val) => updateField('preferred_shift_types', val as CamperRow['preferred_shift_types'])}
                  />
                  <Checkbox
                    label="I will stay for strike (teardown)"
                    checked={editCamper.strike_participation ?? true}
                    onChange={(checked) => updateField('strike_participation', checked as unknown as boolean)}
                  />
                </CardContent>
              </Card>

              {/* Skills */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Skills &amp; Abilities</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CheckboxGroup
                    label="Skills"
                    options={skillTags.map(s => ({
                      value: s,
                      label: s === 'heavy_equipment' ? 'Heavy Equipment' :
                             s === 'vibes' ? "✨ I'm just vibes" :
                             s.charAt(0).toUpperCase() + s.slice(1)
                    }))}
                    value={editCamper.skills || []}
                    onChange={(val) => updateField('skills', val as CamperRow['skills'])}
                  />
                  <Textarea
                    label="Other Skills"
                    value={editCamper.custom_skills || ''}
                    onChange={(e) => updateField('custom_skills', e.target.value || null)}
                    placeholder="What else can you do?"
                    rows={2}
                  />
                </CardContent>
              </Card>

              {/* Build Week */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Build Week</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Checkbox
                    label="I'm attending build week"
                    checked={editCamper.build_week_attending ?? false}
                    onChange={(checked) => updateField('build_week_attending', checked as unknown as boolean)}
                  />
                  {editCamper.build_week_attending && (
                    <>
                      <Input
                        label="Build Week Arrival Date"
                        type="date"
                        value={editCamper.build_week_arrival_date || ''}
                        onChange={(e) => updateField('build_week_arrival_date', e.target.value || null)}
                        required
                      />
                      <Input
                        label="Vehicle Info"
                        value={editCamper.vehicle_info || ''}
                        onChange={(e) => updateField('vehicle_info', e.target.value || null)}
                        placeholder="Make, model, color, capacity"
                      />
                      <Textarea
                        label="Tools You're Bringing"
                        value={(editCamper.tools_bringing || []).join('\n')}
                        onChange={(e) => updateField('tools_bringing', e.target.value.split('\n').filter(Boolean))}
                        placeholder="One tool per line"
                        rows={3}
                      />
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Safety & Medical */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Safety &amp; Medical</CardTitle>
                  <CardDescription>Known only to camp leadership.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    label="Emergency Contact"
                    value={editCamper.emergency_contact || ''}
                    onChange={(e) => updateField('emergency_contact', e.target.value || null)}
                    placeholder="Name, phone number"
                    required
                  />
                  <Textarea
                    label="Medical Conditions"
                    value={editCamper.medical_conditions || ''}
                    onChange={(e) => updateField('medical_conditions', e.target.value || null)}
                    rows={2}
                  />
                  <Textarea
                    label="Required Medications"
                    value={editCamper.medications || ''}
                    onChange={(e) => updateField('medications', e.target.value || null)}
                    rows={2}
                  />
                  <Textarea
                    label="Allergies"
                    value={editCamper.allergies || ''}
                    onChange={(e) => updateField('allergies', e.target.value || null)}
                    rows={2}
                  />
                  <Input
                    label="Dietary Restrictions"
                    value={editCamper.dietary_restrictions || ''}
                    onChange={(e) => updateField('dietary_restrictions', e.target.value || null)}
                  />
                </CardContent>
              </Card>

              {/* About You */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>About You</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    label="How many burns have you attended?"
                    value={editCamper.burn_count || ''}
                    onChange={(e) => updateField('burn_count', e.target.value || null)}
                  />
                  <Textarea
                    label="What attracted you to this camp?"
                    value={editCamper.what_attracted_you || ''}
                    onChange={(e) => updateField('what_attracted_you', e.target.value || null)}
                    rows={2}
                  />
                  <Input
                    label="How did you hear about us?"
                    value={editCamper.referral_source || ''}
                    onChange={(e) => updateField('referral_source', e.target.value || null)}
                  />
                  <Textarea
                    label="Character References"
                    value={editCamper.character_references || ''}
                    onChange={(e) => updateField('character_references', e.target.value || null)}
                    rows={2}
                  />
                  <Textarea
                    label="What are you most hoping for at your burn?"
                    value={editCamper.first_burn_hopes || ''}
                    onChange={(e) => updateField('first_burn_hopes', e.target.value || null)}
                    rows={2}
                  />
                </CardContent>
              </Card>

              {/* Commitments */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Commitments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Checkbox
                    label="I commit to volunteering for camp duties"
                    checked={editCamper.volunteer_commitment ?? false}
                    onChange={(checked) => updateField('volunteer_commitment', checked as unknown as boolean)}
                  />
                  <Checkbox
                    label="I'm willing to take sober shifts"
                    checked={editCamper.sober_shifts ?? false}
                    onChange={(checked) => updateField('sober_shifts', checked as unknown as boolean)}
                  />
                  <Checkbox
                    label="I consent to a background check"
                    checked={editCamper.background_check_consent ?? false}
                    onChange={(checked) => updateField('background_check_consent', checked as unknown as boolean)}
                  />
                </CardContent>
                <CardFooter>
                  <Button onClick={saveCamperDetails} disabled={savingDetails}>
                    {savingDetails ? 'Saving...' : 'Save All Changes'}
                  </Button>
                </CardFooter>
              </Card>
            </>
          )}
        </TabPanel>
      )}
    </div>
  )
}
