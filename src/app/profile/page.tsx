'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { changePassword } from '@/app/actions/auth'
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
  Badge, Alert, Button, Textarea, Input, Select, Checkbox, CheckboxGroup,
  Tabs, TabPanel
} from '@/components/ui'
import { cn, formatDate, formatTime } from '@/lib/utils'
import { shelterTypes, arrivalMethods, powerTypes, orientationPreferences, tentOpeningSides, shiftTypes, skillTags } from '@/lib/validations'
import type { UserProfileRow, CamperRow, CamperPhotoRow, UserRole, KitchenRole, KitchenShift, ScheduleAssignment, Camper } from '@/types/database'
import type { Tab } from '@/components/ui/tabs'
import PackingListTab from '@/components/packing-list-tab'

interface EnrichedAssignment extends ScheduleAssignment {
  shift?: KitchenShift & { role?: KitchenRole }
  camper?: Camper
}

const profileTabs: Tab[] = [
  { id: 'about', label: 'About Me & Photos' },
  { id: 'details', label: 'Camper Details' },
  { id: 'packing-list', label: 'My Packing List' },
  { id: 'my-schedule', label: 'My Schedule' },
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

  // Password change state
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdSaving, setPwdSaving] = useState(false)

  // AI bio state
  const [bioGenerating, setBioGenerating] = useState(false)



  // Schedule state
  const [myAssignments, setMyAssignments] = useState<EnrichedAssignment[]>([])

  // All campers for Sharing Tent With dropdown
  const [allCampersList, setAllCampersList] = useState<{ id: string; full_name: string; playa_name: string | null }[]>([])

  const fetchProfile = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [profileResult, photosResult] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('id', user.id).single() as unknown as { data: UserProfileRow | null },
      supabase.from('camper_photos').select('*').eq('user_id', user.id).order('display_order') as unknown as { data: CamperPhotoRow[] | null },
    ])

    let camperData: CamperRow | null = null

    if (profileResult.data) {
      setProfile(profileResult.data)
      setBio(profileResult.data.bio || '')
      setViewerRole(profileResult.data.role)
      setIsOwnProfile(true)

      // Fetch linked camper
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

      // Fetch all campers for Sharing Tent With dropdown
      const { data: campersForDropdown } = await supabase
        .from('campers')
        .select('id, full_name, playa_name')
        .order('full_name') as unknown as { data: { id: string; full_name: string; playa_name: string | null }[] | null }
      setAllCampersList((campersForDropdown || []).filter(c => c.id !== camperData?.id))
    }

    setPhotos(photosResult.data || [])

    // Fetch schedule data — only fetch user's own assignments first, then enrich
    const [rolesRes, shiftsRes] = await Promise.all([
      supabase.from('kitchen_roles').select('*'),
      supabase.from('kitchen_shifts').select('*').order('date').order('start_time'),
    ])

    const roles = (rolesRes.data as KitchenRole[]) || []
    const shiftsData = (shiftsRes.data as KitchenShift[]) || []

    const enrichedShifts = shiftsData.map(shift => ({
      ...shift,
      role: roles.find(r => r.id === shift.role_id),
    }))

    // Only fetch this user's assignments (not all assignments)
    if (camperData) {
      const { data: myAssignmentsData } = await supabase
        .from('schedule_assignments')
        .select('*')
        .eq('camper_id', camperData.id)

      const myEnriched = (myAssignmentsData as ScheduleAssignment[] || []).map(assignment => ({
        ...assignment,
        shift: enrichedShifts.find(s => s.id === assignment.shift_id),
        camper: camperData as unknown as Camper,
      }))
      setMyAssignments(myEnriched)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
     
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

  const generateAiBio = async () => {
    if (!camper) return
    setBioGenerating(true)
    try {
      const res = await fetch('/api/ai/generate-bio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ camper }),
      })
      const data = await res.json()
      if (res.ok && data.bio) {
        setBio(data.bio)
        setMessage({ type: 'success', text: 'AI bio generated! Edit it and hit Save.' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to generate bio' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error generating bio' })
    }
    setBioGenerating(false)
  }



  const handleChangePassword = async () => {
    if (newPwd !== confirmPwd) {
      setMessage({ type: 'error', text: 'New passwords do not match' })
      return
    }
    if (newPwd.length < 8) {
      setMessage({ type: 'error', text: 'New password must be at least 8 characters' })
      return
    }
    setPwdSaving(true)
    setMessage(null)
    const result = await changePassword(currentPwd, newPwd)
    if (result.success) {
      setMessage({ type: 'success', text: 'Password changed successfully!' })
      setCurrentPwd('')
      setNewPwd('')
      setConfirmPwd('')
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to change password' })
    }
    setPwdSaving(false)
  }

  const saveCamperDetails = async () => {
    if (!camper) return
    setSavingDetails(true)
    setMessage(null)

    try {
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
        bringing_vehicle: editCamper.bringing_vehicle ?? false,
        tent_make_model: editCamper.tent_make_model || null,
        tent_entrance_count: editCamper.tent_entrance_count || null,
        tent_opening_side: editCamper.tent_opening_side || null,
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
        sharing_tent_with: editCamper.sharing_tent_with || null,
        sharing_tent_with_2: editCamper.sharing_tent_with_2 || null,
      }

      const { error } = await supabase
        .from('campers')
        .update(updates as never)
        .eq('id', camper.id)
        .select()

      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({ type: 'success', text: 'Camper details saved!' })
        // Update local state directly instead of re-fetching everything
        setCamper({ ...camper, ...updates } as CamperRow)
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Save failed unexpectedly' })
    } finally {
      setSavingDetails(false)
    }
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

      <Tabs tabs={canViewDetails ? profileTabs : profileTabs.filter(t => t.id !== 'details')} activeTab={activeTab} onChange={setActiveTab} className="mb-0" />

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
          <CardFooter className="flex gap-2">
            <Button onClick={saveBio} disabled={saving}>
              {saving ? 'Saving...' : 'Save Bio'}
            </Button>
            {camper && (
              <Button
                onClick={generateAiBio}
                disabled={bioGenerating}
                variant="secondary"
                className="bg-purple-100 hover:bg-purple-200 text-purple-800 border-purple-300"
              >
                {bioGenerating ? '⏳ Writing...' : '✨ AI Write My Bio'}
              </Button>
            )}
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

        {/* Change Password Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your login password.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              required
            />
            <Input
              label="New Password"
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="Minimum 8 characters"
              required
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              required
            />
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleChangePassword}
              disabled={pwdSaving || !currentPwd || newPwd.length < 8 || newPwd !== confirmPwd}
            >
              {pwdSaving ? 'Changing...' : 'Change Password'}
            </Button>
          </CardFooter>
        </Card>
      </TabPanel>

      {/* ───── TAB 2: My Packing List ───── */}
      <TabPanel tabId="packing-list" activeTab={activeTab}>
        {!camper ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-gray-500">
                Complete your{' '}
                <a href="/intake" className="font-bold text-black underline">registration</a>{' '}
                to access your packing list.
              </p>
            </CardContent>
          </Card>
        ) : (
          <PackingListTab camper={camper} />
        )}
      </TabPanel>

      {/* ───── TAB 3: Camper Details (private — owner + admins only) ───── */}
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
                    onChange={(e) => updateField('early_arrival', e.target.checked)}
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

                  <div className="border-t-2 border-black pt-4 mt-2">
                    <h3 className="font-black uppercase text-sm mb-4">Vehicle &amp; Tent Details</h3>
                    <div className="space-y-4">
                      <Checkbox
                        label="Are you bringing a vehicle to playa?"
                        checked={editCamper.bringing_vehicle ?? false}
                        onChange={(e) => updateField('bringing_vehicle', e.target.checked)}
                      />
                      <Input
                        label="Tent Make/Model"
                        value={editCamper.tent_make_model || ''}
                        onChange={(e) => updateField('tent_make_model', e.target.value || null)}
                        placeholder="e.g. Coleman/4 Person, Shiftpod Mini"
                      />
                      <Input
                        label="Number of Entrances"
                        type="number"
                        value={editCamper.tent_entrance_count ?? ''}
                        onChange={(e) => updateField('tent_entrance_count', e.target.value ? parseInt(e.target.value) : null)}
                        min={1} max={4} step={1}
                      />
                      <Select
                        label="Which side of your tent is the main opening on?"
                        value={editCamper.tent_opening_side || ''}
                        onChange={(e) => updateField('tent_opening_side', e.target.value as CamperRow['tent_opening_side'] || null)}
                        options={[
                          { value: '', label: 'Not set' },
                          ...tentOpeningSides.map(s => ({
                            value: s,
                            label: s === 'length' ? 'Length side' : s === 'width' ? 'Width side' : 'Both sides'
                          }))
                        ]}
                      />
                    </div>
                  </div>

                  <Select
                    label="Sharing Tent With"
                    value={editCamper.sharing_tent_with || ''}
                    onChange={(e) => updateField('sharing_tent_with', e.target.value || null)}
                    placeholder="None"
                    options={[
                      { value: '', label: 'None' },
                      ...allCampersList.map(c => ({
                        value: c.id,
                        label: c.playa_name ? `${c.full_name} ("${c.playa_name}")` : c.full_name,
                      })),
                    ]}
                  />
                  <Select
                    label="Sharing Tent With (3rd Person)"
                    value={editCamper.sharing_tent_with_2 || ''}
                    onChange={(e) => updateField('sharing_tent_with_2', e.target.value || null)}
                    placeholder="None"
                    options={[
                      { value: '', label: 'None' },
                      ...allCampersList.map(c => ({
                        value: c.id,
                        label: c.playa_name ? `${c.full_name} ("${c.playa_name}")` : c.full_name,
                      })),
                    ]}
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
                    onChange={(e) => updateField('power_required', e.target.checked)}
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
                    onChange={(e) => updateField('shade_required', e.target.checked)}
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
                    onChange={(e) => updateField('kitchen_participation', e.target.checked)}
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
                    onChange={(e) => updateField('strike_participation', e.target.checked)}
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
                    onChange={(e) => updateField('build_week_attending', e.target.checked)}
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
                    onChange={(e) => updateField('volunteer_commitment', e.target.checked)}
                  />
                  <Checkbox
                    label="I'm willing to take sober shifts"
                    checked={editCamper.sober_shifts ?? false}
                    onChange={(e) => updateField('sober_shifts', e.target.checked)}
                  />
                  <Checkbox
                    label="I consent to a background check"
                    checked={editCamper.background_check_consent ?? false}
                    onChange={(e) => updateField('background_check_consent', e.target.checked)}
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
      {/* ───── TAB 4: My Schedule ───── */}
      <TabPanel tabId="my-schedule" activeTab={activeTab}>
        {!camper ? (
          <Alert variant="warning">
            No registration record linked. Complete your{' '}
            <a href="/intake" className="font-bold text-black underline">registration</a>{' '}
            to see your schedule.
          </Alert>
        ) : myAssignments.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-gray-500">
                No shifts assigned yet. Either you haven&apos;t been scheduled, or the schedule hasn&apos;t been released yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card variant="warning">
              <CardContent className="py-4">
                <p className="font-bold text-center">
                  You have {myAssignments.length} shift{myAssignments.length !== 1 ? 's' : ''} assigned.
                  {' '}Don&apos;t miss them.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <ScheduleTable assignments={myAssignments} highlightCamperId={camper.id} />
              </CardContent>
            </Card>
          </div>
        )}
      </TabPanel>
    </div>
  )
}

/* ── Shared schedule table component ── */
function ScheduleTable({
  assignments,
  highlightCamperId,
}: {
  assignments: EnrichedAssignment[]
  highlightCamperId?: string
}) {
  const sorted = [...assignments].sort((a, b) => {
    if (!a.shift || !b.shift) return 0
    return a.shift.date.localeCompare(b.shift.date) ||
           a.shift.start_time.localeCompare(b.shift.start_time) ||
           (a.shift.role?.name || '').localeCompare(b.shift.role?.name || '')
  })

  if (sorted.length === 0) {
    return (
      <p className="text-center text-gray-500 py-8">
        No assignments yet.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-black">
            <th className="text-left p-3 font-bold uppercase tracking-wider">Name</th>
            <th className="text-left p-3 font-bold uppercase tracking-wider">Shift / Role</th>
            <th className="text-left p-3 font-bold uppercase tracking-wider">Date</th>
            <th className="text-left p-3 font-bold uppercase tracking-wider">Time</th>
            <th className="text-left p-3 font-bold uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(assignment => (
            <tr
              key={assignment.id}
              className={cn(
                "border-b border-gray-200 hover:bg-gray-50 transition-colors",
                assignment.camper_id === highlightCamperId && "bg-yellow-50 hover:bg-yellow-100"
              )}
            >
              <td className="p-3 font-medium">
                {assignment.camper?.playa_name || assignment.camper?.full_name || '—'}
              </td>
              <td className="p-3">
                {assignment.shift?.role?.name || '—'}
              </td>
              <td className="p-3 whitespace-nowrap">
                {assignment.shift ? formatDate(assignment.shift.date) : '—'}
              </td>
              <td className="p-3 whitespace-nowrap">
                {assignment.shift
                  ? `${formatTime(assignment.shift.start_time)} – ${formatTime(assignment.shift.end_time)}`
                  : '—'}
              </td>
              <td className="p-3">
                <Badge
                  variant={
                    assignment.status === 'confirmed' ? 'success' :
                    assignment.status === 'completed' ? 'info' :
                    assignment.status === 'no-show' ? 'error' : 'warning'
                  }
                >
                  {assignment.status}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
