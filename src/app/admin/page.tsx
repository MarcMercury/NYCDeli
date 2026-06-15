'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { 
  Card, CardHeader, CardTitle, CardDescription, CardContent,
  Badge, Alert, Button, Input, Tabs, TabPanel, Select, Textarea
} from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { cn, formatDate, getSkillDisplayName } from '@/lib/utils'
import { updateCamperAction, deleteCamperAction, updateSettingAction, updateUserRoleAction, updateUserProfileAction, adminResetPasswordAction } from '@/app/actions/admin'
import { getAllDraftShiftCategories, applyDraftOverrides, isCategoryDeleted, getPositionOverride, type DraftShiftCategory, type DraftShiftPosition, type ShiftOverrides } from '@/lib/shift-draft'
import { resolveTentMateIds } from '@/lib/tent-mates'
import type { Camper, SystemSetting, KitchenShift, ScheduleAssignment, CamperUpdate, UserProfileRow, UserRole } from '@/types/database'

type Tab = { id: string; label: string }

interface UserWithCamper extends UserProfileRow {
  camper: Camper | null
}

const tabs: Tab[] = [
  { id: 'campers', label: 'Campers & Users' },
  { id: 'kitchen-shifts', label: 'Kitchen Shifts' },
  { id: 'settings', label: 'Settings' },
]

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('campers')
  const [campers, setCampers] = useState<Camper[]>([])
  const [users, setUsers] = useState<UserWithCamper[]>([])
  const [settings, setSettings] = useState<SystemSetting[]>([])
  const [shifts, setShifts] = useState<KitchenShift[]>([])
  const [assignments, setAssignments] = useState<ScheduleAssignment[]>([])
  const [openTaskCount, setOpenTaskCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [fetchErrors, setFetchErrors] = useState<Record<string, string>>({})
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserWithCamper | null>(null)
  const [selectedCamper, setSelectedCamper] = useState<Camper | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [userFilter, setUserFilter] = useState<'all' | 'linked' | 'unlinked' | 'admin' | 'builder' | 'pending'>('all')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  // Kitchen shift editor state
  const [shiftCategories, setShiftCategories] = useState<DraftShiftCategory[]>([])
  const [rawCategories, setRawCategories] = useState<DraftShiftCategory[]>([])
  const [shiftOverrides, setShiftOverrides] = useState<ShiftOverrides>({})
  const [showDeleted, setShowDeleted] = useState(false)
  const [editingPosition, setEditingPosition] = useState<{ pos: DraftShiftPosition; catIdx: number; posIdx: number } | null>(null)
  const [editForm, setEditForm] = useState<{ role: string; time: string; description: string }>({ role: '', time: '', description: '' })
  const [resetPwUserId, setResetPwUserId] = useState<string | null>(null)
  const [resetPwValue, setResetPwValue] = useState('')
  const [resetPwLoading, setResetPwLoading] = useState(false)

  const fetchData = useCallback(async () => {
    const supabase = createClient()
    const errors: Record<string, string> = {}
    
    const [campersRes, usersRes, settingsRes, shiftsRes, assignmentsRes, tasksRes] = await Promise.all([
      supabase.from('campers').select('*').order('created_at', { ascending: false }),
      supabase.from('user_profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('system_settings').select('*').order('key'),
      supabase.from('kitchen_shifts').select('*').order('date'),
      supabase.from('schedule_assignments').select('*'),
      supabase.from('build_tasks').select('status'),
    ])

    if (campersRes.error) errors.campers = campersRes.error.message
    if (usersRes.error) errors.users = usersRes.error.message
    if (settingsRes.error) errors.settings = settingsRes.error.message
    if (shiftsRes.error) errors.shifts = shiftsRes.error.message
    if (assignmentsRes.error) errors.assignments = assignmentsRes.error.message
    if (tasksRes.error) errors.tasks = tasksRes.error.message

    const campersData = (campersRes.data || []) as Camper[]
    const usersData = (usersRes.data || []) as UserProfileRow[]
    
    // Build users with linked camper data
    const usersWithCampers: UserWithCamper[] = usersData.map(user => ({
      ...user,
      camper: campersData.find(c => c.id === user.camper_id || c.email === user.email) || null,
    }))
    
    // Find campers that have no linked user profile
    const linkedCamperIds = new Set(usersWithCampers.filter(u => u.camper).map(u => u.camper!.id))
    const orphanCampers = campersData.filter(c => !linkedCamperIds.has(c.id))
    
    // Create synthetic user entries for orphan campers
    const orphanUsers: UserWithCamper[] = orphanCampers.map(c => ({
      id: `orphan-${c.id}`,
      created_at: c.created_at,
      updated_at: c.updated_at,
      email: c.email,
      role: 'user' as UserRole,
      camper_id: c.id,
      approved_at: null,
      approved_by: null,
      denied_at: null,
      denied_reason: null,
      bio: null,
      last_sign_in_at: null,
      camper: c,
    }))

    setCampers(campersData)
    setUsers([...usersWithCampers, ...orphanUsers])
    const allSettings = (settingsRes.data || []) as SystemSetting[]
    setSettings(allSettings)
    setShifts(shiftsRes.data || [])
    setAssignments(assignmentsRes.data || [])
    setOpenTaskCount(((tasksRes.data || []) as { status: string }[]).filter(t => t.status !== 'done').length)

    // Load shift categories with any admin overrides applied
    const baseCategories = getAllDraftShiftCategories()
    setRawCategories(baseCategories)
    const overrideSetting = allSettings.find(s => s.key === 'shift_position_overrides')
    let parsedOverrides: ShiftOverrides = {}
    if (overrideSetting) {
      try {
        parsedOverrides = JSON.parse(overrideSetting.value) as ShiftOverrides
      } catch { /* ignore malformed overrides */ }
    }
    setShiftOverrides(parsedOverrides)
    setShiftCategories(applyDraftOverrides(baseCategories, parsedOverrides, 'deli'))
    setFetchErrors(errors)
    setLastRefreshed(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
     
    fetchData()
  }, [fetchData])

  // Open shifts = scheduled shifts with no camper assigned to them
  const assignedShiftIds = new Set(assignments.map(a => a.shift_id))
  const openShiftCount = shifts.filter(s => !assignedShiftIds.has(s.id)).length

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.camper?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.camper?.playa_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    if (!matchesSearch) return false
    
    switch (userFilter) {
      case 'linked': return !!u.camper
      case 'unlinked': return !u.camper
      case 'admin': return u.role === 'admin'
      case 'builder': return u.role === 'builder'
      case 'pending': return u.role === 'pending'
      default: return true
    }
  })

  const updateCamper = async (camperId: string, updates: CamperUpdate) => {
    const result = await updateCamperAction(camperId, updates)
    if (!result.success) {
      setMessage({ type: 'error', text: result.error || 'Update failed' })
    } else {
      setMessage({ type: 'success', text: 'Camper updated successfully' })
      fetchData()
    }
  }

  const updateSetting = async (key: string, value: string) => {
    const result = await updateSettingAction(key, value)
    if (!result.success) {
      setMessage({ type: 'error', text: result.error || 'Update failed' })
    } else {
      setMessage({ type: 'success', text: 'Setting updated' })
      fetchData()
    }
  }

  const deleteCamper = async (camperId: string) => {
    if (!confirm('Are you sure? This will delete the camper and all their assignments.')) return
    
    const result = await deleteCamperAction(camperId)
    if (!result.success) {
      setMessage({ type: 'error', text: result.error || 'Delete failed' })
    } else {
      setMessage({ type: 'success', text: 'Camper deleted' })
      setSelectedCamper(null)
      setSelectedUser(null)
      fetchData()
    }
  }

  const updateUserRole = async (profileId: string, role: UserRole) => {
    if (profileId.startsWith('orphan-')) {
      setMessage({ type: 'error', text: 'This camper has no user profile to update. They need to register/login first.' })
      return
    }
    const result = await updateUserRoleAction(profileId, role)
    if (!result.success) {
      setMessage({ type: 'error', text: result.error || 'Role update failed' })
    } else {
      setMessage({ type: 'success', text: 'User role updated' })
      fetchData()
    }
  }

  const updateUserBio = async (profileId: string, bio: string) => {
    if (profileId.startsWith('orphan-')) return
    const result = await updateUserProfileAction(profileId, { bio })
    if (!result.success) {
      setMessage({ type: 'error', text: result.error || 'Profile update failed' })
    } else {
      setMessage({ type: 'success', text: 'Profile updated' })
      fetchData()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⚙️</div>
          <p className="font-bold uppercase tracking-wider">Loading Admin Panel...</p>
          <p className="text-sm text-gray-600">With great power comes great spreadsheets</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-wider mb-2">
            Admin Control
          </h1>
          <p className="text-gray-600">
            Override responsibly. Or don&apos;t. You&apos;re the admin.
          </p>
        </div>

        {/* Warning */}
        <Alert variant="warning" className="mb-8">
          <strong>Admin Mode Active.</strong> Changes here affect the live system. 
          Think before you click. Data has feelings.
        </Alert>

        {/* Message */}
        {message && (
          <Alert 
            variant={message.type === 'success' ? 'success' : 'error'} 
            className="mb-4"
          >
            {message.text}
            <button 
              className="ml-4 underline"
              onClick={() => setMessage(null)}
            >
              Dismiss
            </button>
          </Alert>
        )}

        {/* Data Connection Status */}
        {Object.keys(fetchErrors).length > 0 && (
          <Alert variant="error" className="mb-4">
            <strong>Data fetch errors:</strong>{' '}
            {Object.entries(fetchErrors).map(([key, msg]) => (
              <span key={key} className="block text-sm">
                {key}: {msg}
              </span>
            ))}
            <button className="ml-2 underline" onClick={() => fetchData()}>Retry</button>
          </Alert>
        )}

        {/* Quick Stats */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full ${Object.keys(fetchErrors).length === 0 ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-500 uppercase tracking-wider">
              {Object.keys(fetchErrors).length === 0 ? 'Live Data' : 'Partial Data'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {lastRefreshed && (
              <span className="text-xs text-gray-400">
                Updated {lastRefreshed.toLocaleTimeString()}
              </span>
            )}
            <button
              className="text-xs underline text-gray-500 hover:text-black"
              onClick={() => fetchData()}
            >
              Refresh
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="py-4 text-center">
              {fetchErrors.users ? (
                <p className="text-2xl font-black text-red-500" title={fetchErrors.users}>⚠</p>
              ) : (
                <p className="text-3xl font-black">{users.length}</p>
              )}
              <p className="text-xs uppercase tracking-wider text-gray-500">Total Users</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              {fetchErrors.campers ? (
                <p className="text-2xl font-black text-red-500" title={fetchErrors.campers}>⚠</p>
              ) : (
                <p className="text-3xl font-black">{campers.length}</p>
              )}
              <p className="text-xs uppercase tracking-wider text-gray-500">Campers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              {fetchErrors.campers ? (
                <p className="text-2xl font-black text-red-500" title={fetchErrors.campers}>⚠</p>
              ) : (
                <p className="text-3xl font-black">{campers.filter(c => c.build_week_attending).length}</p>
              )}
              <p className="text-xs uppercase tracking-wider text-gray-500">Build Week</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              {fetchErrors.tasks ? (
                <p className="text-2xl font-black text-red-500" title={fetchErrors.tasks}>⚠</p>
              ) : (
                <p className="text-3xl font-black">{openTaskCount}</p>
              )}
              <p className="text-xs uppercase tracking-wider text-gray-500">Open Tasks</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              {fetchErrors.assignments || fetchErrors.shifts ? (
                <p className="text-2xl font-black text-red-500" title={fetchErrors.assignments || fetchErrors.shifts}>⚠</p>
              ) : (
                <p className="text-3xl font-black">{openShiftCount}</p>
              )}
              <p className="text-xs uppercase tracking-wider text-gray-500">Open Shifts</p>
            </CardContent>
          </Card>
          <Link href="/admin/layout-builder" className="block">
            <Card className="hover:border-yellow-500 transition-colors h-full">
              <CardContent className="py-4 text-center">
                <p className="text-3xl font-black">🗺️</p>
                <p className="text-xs uppercase tracking-wider text-yellow-700 font-bold">Layout Builder</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/applicants" className="block">
            <Card className="hover:border-yellow-500 transition-colors h-full">
              <CardContent className="py-4 text-center">
                <p className="text-3xl font-black">📋</p>
                <p className="text-xs uppercase tracking-wider text-yellow-700 font-bold">Applicant Review</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/shift-draft" className="block">
            <Card className="hover:border-yellow-500 transition-colors h-full">
              <CardContent className="py-4 text-center">
                <p className="text-3xl font-black">🎯</p>
                <p className="text-xs uppercase tracking-wider text-yellow-700 font-bold">Shift Draft</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/ideas" className="block">
            <Card className="hover:border-yellow-500 transition-colors h-full">
              <CardContent className="py-4 text-center">
                <p className="text-3xl font-black">💡</p>
                <p className="text-xs uppercase tracking-wider text-yellow-700 font-bold">Forum (Ideas &amp; Q&apos;s)</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Tabs */}
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {/* Campers & Users Tab */}
        <TabPanel tabId="campers" activeTab={activeTab}>
          {selectedUser ? (
            /* ───── DETAIL VIEW ───── */
            <div className="space-y-6">
              {/* Back + header */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => { setSelectedUser(null); setSelectedCamper(null) }}
                  >
                    ← Back to list
                  </Button>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-wider">
                      {selectedUser.camper?.playa_name || selectedUser.camper?.full_name || selectedUser.email}
                    </h2>
                    <p className="text-sm text-gray-500">{selectedUser.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={
                    selectedUser.role === 'admin' ? 'error' :
                    selectedUser.role === 'pending' ? 'warning' : 'success'
                  }>
                    {selectedUser.role}
                  </Badge>
                  {selectedUser.camper ? (
                    <Badge variant="success">Profile Linked</Badge>
                  ) : (
                    <Badge variant="warning">No Camper Profile</Badge>
                  )}
                </div>
              </div>

              {/* Top row: Account + Save bar */}
              <Card>
                <CardHeader>
                  <CardTitle>Account & Role</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase">Role</label>
                      <Select
                        options={[
                          { value: 'pending', label: 'Pending' },
                          { value: 'user', label: 'User (Approved)' },
                          { value: 'builder', label: 'Builder (Build Week access)' },
                          { value: 'admin', label: 'Admin (full access)' },
                        ]}
                        value={selectedUser.role}
                        onChange={(e) => updateUserRole(selectedUser.id, e.target.value as UserRole)}
                        className="mt-1"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold uppercase">Bio</label>
                      <div className="flex gap-2 mt-1">
                        <Textarea
                          value={selectedUser.bio || ''}
                          onChange={(e) => setSelectedUser({ ...selectedUser, bio: e.target.value })}
                          rows={1}
                          className="flex-1"
                        />
                        <Button
                          size="sm"
                          onClick={() => updateUserBio(selectedUser.id, selectedUser.bio || '')}
                        >
                          Save Bio
                        </Button>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 space-y-1 pt-5">
                      {selectedUser.approved_at && <p>Approved: {formatDate(selectedUser.approved_at)}</p>}
                      {selectedUser.last_sign_in_at && <p>Last login: {formatDate(selectedUser.last_sign_in_at)}</p>}
                      {selectedUser.created_at && <p>Registered: {formatDate(selectedUser.created_at)}</p>}
                    </div>
                  </div>
                  {!selectedUser.camper && !selectedUser.id.startsWith('orphan-') && (
                    <Alert variant="warning" className="mt-4">
                      This user has no linked camper profile. They may need to complete the intake form.
                    </Alert>
                  )}
                </CardContent>
              </Card>

              {selectedCamper ? (
                <>
                  {/* ───── CONTACT INFORMATION ───── */}
                  <Card>
                    <CardHeader>
                      <CardTitle>📇 Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-4 gap-4">
                        <div>
                          <label className="text-xs font-bold uppercase">Full Name</label>
                          <Input
                            value={selectedCamper.full_name}
                            onChange={(e) => setSelectedCamper({...selectedCamper, full_name: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase">Playa Name</label>
                          <Input
                            value={selectedCamper.playa_name || ''}
                            onChange={(e) => setSelectedCamper({...selectedCamper, playa_name: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase">Email</label>
                          <Input
                            value={selectedCamper.email}
                            onChange={(e) => setSelectedCamper({...selectedCamper, email: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase">Phone</label>
                          <Input
                            value={selectedCamper.phone || ''}
                            onChange={(e) => setSelectedCamper({...selectedCamper, phone: e.target.value})}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* ───── ARRIVAL & LOGISTICS ───── */}
                  <Card>
                    <CardHeader>
                      <CardTitle>🚗 Arrival & Logistics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-4 gap-4">
                        <div>
                          <label className="text-xs font-bold uppercase">Arrival Date</label>
                          <Input
                            type="date"
                            value={selectedCamper.arrival_date}
                            onChange={(e) => setSelectedCamper({...selectedCamper, arrival_date: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase">Departure Date</label>
                          <Input
                            type="date"
                            value={selectedCamper.departure_date}
                            onChange={(e) => setSelectedCamper({...selectedCamper, departure_date: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase">Arrival Method</label>
                          <Select
                            options={[
                              { value: 'car', label: 'Car' },
                              { value: 'bus', label: 'Bus' },
                              { value: 'other', label: 'Other' },
                            ]}
                            value={selectedCamper.arrival_method}
                            onChange={(e) => setSelectedCamper({...selectedCamper, arrival_method: e.target.value as Camper['arrival_method']})}
                          />
                        </div>
                        <div className="flex items-end pb-1">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedCamper.early_arrival}
                              onChange={(e) => setSelectedCamper({...selectedCamper, early_arrival: e.target.checked})}
                            />
                            <span className="text-sm font-bold">Early Arrival</span>
                          </label>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* ───── SHELTER & INFRASTRUCTURE ───── */}
                  <Card>
                    <CardHeader>
                      <CardTitle>🏕️ Shelter & Infrastructure</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <label className="text-xs font-bold uppercase">Shelter Type</label>
                          <Select
                            options={[
                              { value: 'tent', label: 'Tent' },
                              { value: 'shiftpod', label: 'Shiftpod' },
                              { value: 'rv', label: 'RV' },
                              { value: 'vehicle', label: 'Vehicle' },
                              { value: 'other', label: 'Other' },
                            ]}
                            value={selectedCamper.shelter_type}
                            onChange={(e) => setSelectedCamper({...selectedCamper, shelter_type: e.target.value as Camper['shelter_type']})}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase">Length (ft)</label>
                          <Input
                            type="number"
                            value={selectedCamper.shelter_length_ft}
                            onChange={(e) => setSelectedCamper({...selectedCamper, shelter_length_ft: parseFloat(e.target.value)})}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase">Width (ft)</label>
                          <Input
                            type="number"
                            value={selectedCamper.shelter_width_ft}
                            onChange={(e) => setSelectedCamper({...selectedCamper, shelter_width_ft: parseFloat(e.target.value)})}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase">Height (ft)</label>
                          <Input
                            type="number"
                            value={selectedCamper.shelter_height_ft || ''}
                            onChange={(e) => setSelectedCamper({...selectedCamper, shelter_height_ft: e.target.value ? parseFloat(e.target.value) : null})}
                          />
                        </div>
                      </div>
                      <div className="grid md:grid-cols-4 gap-4">
                        <div>
                          <label className="text-xs font-bold uppercase">Power Type</label>
                          <Select
                            options={[
                              { value: 'none', label: 'None' },
                              { value: 'low', label: 'Low' },
                              { value: 'medium', label: 'Medium' },
                              { value: 'high', label: 'High' },
                            ]}
                            value={selectedCamper.power_type}
                            onChange={(e) => setSelectedCamper({...selectedCamper, power_type: e.target.value as Camper['power_type']})}
                          />
                        </div>
                        <div className="flex items-end gap-4 pb-1">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedCamper.power_required}
                              onChange={(e) => setSelectedCamper({...selectedCamper, power_required: e.target.checked})}
                            />
                            <span className="text-sm">Power Req.</span>
                          </label>
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase">Special Requests</label>
                          <Input
                            value={selectedCamper.special_requests || ''}
                            onChange={(e) => setSelectedCamper({...selectedCamper, special_requests: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="grid md:grid-cols-4 gap-4 mt-4">
                        <div>
                          <label className="text-xs font-bold uppercase">Tent Entrances</label>
                          <Select
                            options={[
                              { value: '', label: 'Not set' },
                              { value: '1', label: '1 Side' },
                              { value: '2', label: '2 Side' },
                              { value: '3', label: '3 Side' },
                              { value: '4', label: '4 Side' },
                            ]}
                            value={selectedCamper.tent_entrance_count ?? ''}
                            onChange={(e) => setSelectedCamper({...selectedCamper, tent_entrance_count: e.target.value ? parseInt(e.target.value) : null})}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase">Entrance Orientation</label>
                          <Select
                            options={[
                              { value: '', label: 'Not set' },
                              { value: 'width', label: 'Short Side' },
                              { value: 'length', label: 'Long Side' },
                              { value: 'both', label: 'Short and Long Sides' },
                            ]}
                            value={selectedCamper.tent_opening_side || ''}
                            onChange={(e) => setSelectedCamper({...selectedCamper, tent_opening_side: (e.target.value || null) as Camper['tent_opening_side']})}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-xs font-bold uppercase">Tent Make/Model</label>
                          <Input
                            value={selectedCamper.tent_make_model || ''}
                            onChange={(e) => setSelectedCamper({...selectedCamper, tent_make_model: e.target.value || null})}
                            placeholder="e.g. Coleman/4 Person, Shiftpod Mini"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase">Sharing Tent With</label>
                          <Select
                            placeholder="None"
                            options={[
                              { value: '', label: 'None' },
                              ...campers
                                .filter(c => c.id !== selectedCamper.id && c.id !== selectedCamper.sharing_tent_with_2)
                                .map(c => ({
                                  value: c.id,
                                  label: c.playa_name ? `${c.full_name} ("${c.playa_name}")` : c.full_name,
                                }))
                            ]}
                            value={selectedCamper.sharing_tent_with || ''}
                            onChange={(e) => setSelectedCamper({...selectedCamper, sharing_tent_with: e.target.value || null})}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase">Sharing Tent With (2nd)</label>
                          <Select
                            placeholder="None"
                            options={[
                              { value: '', label: 'None' },
                              ...campers
                                .filter(c => c.id !== selectedCamper.id && c.id !== selectedCamper.sharing_tent_with)
                                .map(c => ({
                                  value: c.id,
                                  label: c.playa_name ? `${c.full_name} ("${c.playa_name}")` : c.full_name,
                                }))
                            ]}
                            value={selectedCamper.sharing_tent_with_2 || ''}
                            onChange={(e) => setSelectedCamper({...selectedCamper, sharing_tent_with_2: e.target.value || null})}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* ───── PARTICIPATION & SKILLS ───── */}
                  <Card>
                    <CardHeader>
                      <CardTitle>🤝 Participation & Skills</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <p className="text-xs font-bold uppercase text-gray-500">Commitments</p>
                          <label className="flex items-center gap-2">
                            <input type="checkbox" checked={selectedCamper.kitchen_participation} onChange={(e) => setSelectedCamper({...selectedCamper, kitchen_participation: e.target.checked})} />
                            <span className="text-sm">Kitchen Participation</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input type="checkbox" checked={selectedCamper.strike_participation} onChange={(e) => setSelectedCamper({...selectedCamper, strike_participation: e.target.checked})} />
                            <span className="text-sm">Strike Participation</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input type="checkbox" checked={selectedCamper.build_week_attending} onChange={(e) => setSelectedCamper({...selectedCamper, build_week_attending: e.target.checked})} />
                            <span className="text-sm">Build Week Attending</span>
                          </label>
                          {selectedCamper.build_week_attending && (
                            <div className="pl-6 space-y-2">
                              <div>
                                <label className="text-xs font-bold uppercase">Build Week Arrival</label>
                                <Input
                                  type="date"
                                  value={selectedCamper.build_week_arrival_date || ''}
                                  onChange={(e) => setSelectedCamper({...selectedCamper, build_week_arrival_date: e.target.value || null})}
                                />
                              </div>
                              <div>
                                <label className="text-xs font-bold uppercase">Vehicle Info</label>
                                <Input
                                  value={selectedCamper.vehicle_info || ''}
                                  onChange={(e) => setSelectedCamper({...selectedCamper, vehicle_info: e.target.value})}
                                />
                              </div>
                              <div>
                                <label className="text-xs font-bold uppercase">Tools Bringing</label>
                                <Input
                                  value={(selectedCamper.tools_bringing || []).join(', ')}
                                  onChange={(e) => setSelectedCamper({...selectedCamper, tools_bringing: e.target.value.split(',').map(t => t.trim()).filter(Boolean)})}
                                  placeholder="Comma-separated list"
                                />
                              </div>
                            </div>
                          )}
                          <div>
                            <label className="text-xs font-bold uppercase">Preferred Shift Types</label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(selectedCamper.preferred_shift_types || []).map(st => (
                                <Badge key={st}>{st}</Badge>
                              ))}
                              {(!selectedCamper.preferred_shift_types || selectedCamper.preferred_shift_types.length === 0) && (
                                <span className="text-xs text-gray-400">None specified</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <p className="text-xs font-bold uppercase text-gray-500">Skills</p>
                          <div className="flex flex-wrap gap-1">
                            {selectedCamper.skills.map(skill => (
                              <Badge key={skill}>{getSkillDisplayName(skill)}</Badge>
                            ))}
                            {selectedCamper.skills.length === 0 && (
                              <span className="text-xs text-gray-400">No skills listed</span>
                            )}
                          </div>
                          <div>
                            <label className="text-xs font-bold uppercase">Custom Skills</label>
                            <Textarea
                              value={selectedCamper.custom_skills || ''}
                              onChange={(e) => setSelectedCamper({...selectedCamper, custom_skills: e.target.value})}
                              rows={2}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* ───── SAFETY & MEDICAL ───── */}
                  <Card className="border-red-200">
                    <CardHeader>
                      <CardTitle>🚨 Safety & Medical</CardTitle>
                      <CardDescription>Emergency and health information</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <p className="text-xs font-bold uppercase text-gray-500">Emergency Contact</p>
                        <div className="grid md:grid-cols-3 gap-4">
                          <div>
                            <label className="text-xs font-bold uppercase">Contact Name</label>
                            <Input
                              value={selectedCamper.emergency_contact_name || ''}
                              onChange={(e) => setSelectedCamper({...selectedCamper, emergency_contact_name: e.target.value})}
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold uppercase">Contact Number</label>
                            <Input
                              value={selectedCamper.emergency_contact_number || ''}
                              onChange={(e) => setSelectedCamper({...selectedCamper, emergency_contact_number: e.target.value})}
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold uppercase">Relationship</label>
                            <Input
                              value={selectedCamper.emergency_contact_relationship || ''}
                              onChange={(e) => setSelectedCamper({...selectedCamper, emergency_contact_relationship: e.target.value})}
                            />
                          </div>
                        </div>
                        {selectedCamper.emergency_contact && (
                          <div>
                            <label className="text-xs font-bold uppercase text-gray-400">Legacy Emergency Contact</label>
                            <Input
                              value={selectedCamper.emergency_contact || ''}
                              onChange={(e) => setSelectedCamper({...selectedCamper, emergency_contact: e.target.value})}
                            />
                          </div>
                        )}
                        <hr className="border-gray-200" />
                        <p className="text-xs font-bold uppercase text-gray-500">Health Information</p>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold uppercase">Medical Conditions</label>
                            <Textarea
                              value={selectedCamper.medical_conditions || ''}
                              onChange={(e) => setSelectedCamper({...selectedCamper, medical_conditions: e.target.value})}
                              rows={2}
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold uppercase">Medications</label>
                            <Textarea
                              value={selectedCamper.medications || ''}
                              onChange={(e) => setSelectedCamper({...selectedCamper, medications: e.target.value})}
                              rows={2}
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold uppercase">Allergies</label>
                            <Textarea
                              value={selectedCamper.allergies || ''}
                              onChange={(e) => setSelectedCamper({...selectedCamper, allergies: e.target.value})}
                              rows={2}
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold uppercase">Dietary Restrictions</label>
                            <Textarea
                              value={selectedCamper.dietary_restrictions || ''}
                              onChange={(e) => setSelectedCamper({...selectedCamper, dietary_restrictions: e.target.value})}
                              rows={2}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* ───── ABOUT YOU ───── */}
                  <Card>
                    <CardHeader>
                      <CardTitle>🔥 About This Camper</CardTitle>
                      <CardDescription>Application responses</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold uppercase">Burn Count</label>
                          <Input
                            value={selectedCamper.burn_count || ''}
                            onChange={(e) => setSelectedCamper({...selectedCamper, burn_count: e.target.value})}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase">Referral Source</label>
                          <Input
                            value={selectedCamper.referral_source || ''}
                            onChange={(e) => setSelectedCamper({...selectedCamper, referral_source: e.target.value})}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-xs font-bold uppercase">What Attracted You to NYC Deli?</label>
                          <Textarea
                            value={selectedCamper.what_attracted_you || ''}
                            onChange={(e) => setSelectedCamper({...selectedCamper, what_attracted_you: e.target.value})}
                            rows={2}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase">Character References</label>
                          <Textarea
                            value={selectedCamper.character_references || ''}
                            onChange={(e) => setSelectedCamper({...selectedCamper, character_references: e.target.value})}
                            rows={2}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase">First Burn Hopes</label>
                          <Textarea
                            value={selectedCamper.first_burn_hopes || ''}
                            onChange={(e) => setSelectedCamper({...selectedCamper, first_burn_hopes: e.target.value})}
                            rows={2}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* ───── AGREEMENTS ───── */}
                  <Card>
                    <CardHeader>
                      <CardTitle>✅ Agreements</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2 p-3 border-2 rounded">
                          {selectedCamper.volunteer_commitment ? (
                            <span className="text-green-600 font-bold">✓</span>
                          ) : (
                            <span className="text-red-500 font-bold">✗</span>
                          )}
                          <span className="text-sm">Volunteer Commitment</span>
                        </div>
                        <div className="flex items-center gap-2 p-3 border-2 rounded">
                          {selectedCamper.sober_shifts ? (
                            <span className="text-green-600 font-bold">✓</span>
                          ) : (
                            <span className="text-red-500 font-bold">✗</span>
                          )}
                          <span className="text-sm">Sober Shifts</span>
                        </div>
                        <div className="flex items-center gap-2 p-3 border-2 rounded">
                          {selectedCamper.background_check_consent ? (
                            <span className="text-green-600 font-bold">✓</span>
                          ) : (
                            <span className="text-red-500 font-bold">✗</span>
                          )}
                          <span className="text-sm">Background Check Consent</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* ───── ADMIN & LAYOUT ───── */}
                  <Card>
                    <CardHeader>
                      <CardTitle>⚙️ Admin & Layout</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <label className="text-xs font-bold uppercase">Layout X</label>
                          <Input
                            type="number"
                            value={selectedCamper.layout_x || ''}
                            onChange={(e) => setSelectedCamper({...selectedCamper, layout_x: e.target.value ? parseFloat(e.target.value) : null})}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase">Layout Y</label>
                          <Input
                            type="number"
                            value={selectedCamper.layout_y || ''}
                            onChange={(e) => setSelectedCamper({...selectedCamper, layout_y: e.target.value ? parseFloat(e.target.value) : null})}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase">Zone Assignment</label>
                          <Input
                            value={selectedCamper.zone_assignment || ''}
                            onChange={(e) => setSelectedCamper({...selectedCamper, zone_assignment: e.target.value})}
                          />
                        </div>
                        <div className="flex items-end gap-4 pb-1 flex-wrap">
                          <label className="flex items-center gap-2">
                            <input type="checkbox" checked={selectedCamper.placement_locked} onChange={(e) => setSelectedCamper({...selectedCamper, placement_locked: e.target.checked})} />
                            <span className="text-sm">Lock Placement</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input type="checkbox" checked={selectedCamper.is_admin} onChange={(e) => setSelectedCamper({...selectedCamper, is_admin: e.target.checked})} />
                            <span className="text-sm">Is Admin</span>
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase">Notes</label>
                        <Textarea
                          value={selectedCamper.notes || ''}
                          onChange={(e) => setSelectedCamper({...selectedCamper, notes: e.target.value})}
                          rows={3}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* ───── SAVE / DELETE BAR ───── */}
                  <div className="flex justify-between items-center sticky bottom-4 bg-white border-2 border-black p-4 shadow-lg">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => deleteCamper(selectedCamper.id)}
                    >
                      Delete Camper
                    </Button>
                    <Button onClick={() => updateCamper(selectedCamper.id, selectedCamper)}>
                      Save All Changes
                    </Button>
                  </div>
                </>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-gray-500">
                    <p>No camper profile linked</p>
                    <p className="text-xs mt-1">This user needs to complete the intake form.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            /* ───── LIST VIEW ───── */
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle>All Users & Campers ({filteredUsers.length})</CardTitle>
                  <div className="flex gap-1 flex-wrap">
                    {(['all', 'linked', 'unlinked', 'admin', 'builder', 'pending'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setUserFilter(f)}
                        className={cn(
                          "text-xs px-2 py-1 border-2 uppercase tracking-wider font-bold transition-colors",
                          userFilter === f
                            ? "bg-black text-white border-black"
                            : "border-gray-300 text-gray-500 hover:border-black"
                        )}
                      >
                        {f === 'linked' ? 'Has Profile' : f === 'unlinked' ? 'No Profile' : f}
                      </button>
                    ))}
                  </div>
                </div>
                <Input
                  placeholder="Search by name, playa name, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mt-2"
                />
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[700px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white border-b-2 border-black">
                      <tr>
                        <th className="text-left p-3 font-bold uppercase tracking-wider">Name / Email</th>
                        <th className="text-left p-3 font-bold uppercase tracking-wider hidden md:table-cell">Role</th>
                        <th className="text-left p-3 font-bold uppercase tracking-wider hidden md:table-cell">Status</th>
                        <th className="text-left p-3 font-bold uppercase tracking-wider hidden md:table-cell">Shelter</th>
                        <th className="text-left p-3 font-bold uppercase tracking-wider hidden lg:table-cell">Sharing Tent With</th>
                        <th className="text-left p-3 font-bold uppercase tracking-wider hidden lg:table-cell">Arrival</th>
                        <th className="text-left p-3 font-bold uppercase tracking-wider hidden lg:table-cell">Last Login</th>
                        <th className="text-left p-3 font-bold uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(user => (
                        <tr
                          key={user.id}
                          className="border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
                          onClick={() => {
                            setSelectedUser(user)
                            setSelectedCamper(user.camper ? { ...user.camper } : null)
                          }}
                        >
                          <td className="p-3">
                            <p className="font-bold">
                              {user.camper?.playa_name || user.camper?.full_name || user.email}
                            </p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </td>
                          <td className="p-3 hidden md:table-cell">
                            <Badge variant={
                              user.role === 'admin' ? 'error' :
                              user.role === 'pending' ? 'warning' : 'success'
                            }>
                              {user.role}
                            </Badge>
                          </td>
                          <td className="p-3 hidden md:table-cell">
                            {user.camper ? (
                              <Badge variant="success">Linked</Badge>
                            ) : (
                              <Badge variant="warning">No Profile</Badge>
                            )}
                          </td>
                          <td className="p-3 hidden md:table-cell text-xs text-gray-600">
                            {user.camper?.shelter_type || '—'}
                          </td>
                          <td className="p-3 hidden lg:table-cell text-xs text-gray-500">
                            {(() => {
                              if (!user.camper) return '—'
                              const mates = resolveTentMateIds(user.camper.id, campers)
                                .map(id => campers.find(c => c.id === id))
                                .filter((c): c is Camper => !!c)
                              if (mates.length === 0) return '—'
                              return mates.map(m => m.playa_name || m.full_name).join(', ')
                            })()}
                          </td>
                          <td className="p-3 hidden lg:table-cell text-xs text-gray-500">
                            {user.camper?.arrival_date || '—'}
                          </td>
                          <td className="p-3 hidden lg:table-cell text-xs text-gray-500">
                            {user.last_sign_in_at ? formatDate(user.last_sign_in_at) : '—'}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <Select
                                options={[
                                  { value: 'pending', label: 'Pending' },
                                  { value: 'user', label: 'User' },
                                  { value: 'builder', label: 'Builder' },
                                  { value: 'admin', label: 'Admin' },
                                ]}
                                value={user.role}
                                onChange={(e) => updateUserRole(user.id, e.target.value as UserRole)}
                                className="h-8 text-xs"
                                title="Access level — User: basic tabs · Builder: + Build Week · Admin: + Admin"
                              />
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedUser(user)
                                  setSelectedCamper(user.camper ? { ...user.camper } : null)
                                }}
                              >
                                View
                              </Button>
                              {resetPwUserId === user.id ? (
                                <form
                                  className="flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                  onSubmit={async (e) => {
                                    e.preventDefault()
                                    if (!resetPwValue || resetPwValue.length < 8) {
                                      setMessage({ type: 'error', text: 'Password must be at least 8 characters' })
                                      return
                                    }
                                    setResetPwLoading(true)
                                    const result = await adminResetPasswordAction(user.id, resetPwValue)
                                    setResetPwLoading(false)
                                    if (result.success) {
                                      setMessage({ type: 'success', text: `Password reset for ${user.email}` })
                                    } else {
                                      setMessage({ type: 'error', text: result.error || 'Failed to reset password' })
                                    }
                                    setResetPwUserId(null)
                                    setResetPwValue('')
                                  }}
                                >
                                  <Input
                                    type="password"
                                    placeholder="New password"
                                    value={resetPwValue}
                                    onChange={(e) => setResetPwValue(e.target.value)}
                                    className="h-8 w-32 text-xs"
                                    autoFocus
                                  />
                                  <Button size="sm" type="submit" disabled={resetPwLoading}>
                                    {resetPwLoading ? '...' : 'Set'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    type="button"
                                    onClick={() => { setResetPwUserId(null); setResetPwValue('') }}
                                  >
                                    ✕
                                  </Button>
                                </form>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setResetPwUserId(user.id)
                                    setResetPwValue('')
                                  }}
                                  title="Reset password"
                                >
                                  Reset PW
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-gray-500">
                            No users matching your filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {!selectedUser && (
            <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-400 text-sm">
              <p className="font-bold uppercase tracking-wider mb-1">⚠️ About Roles</p>
              <ul className="space-y-1 text-gray-700">
                <li><strong>Pending:</strong> Awaiting approval. No access to camp pages until promoted.</li>
                <li><strong>User:</strong> Full read/write access to camp pages (spots, kitchen, schedule, events, etc.). Does NOT see Build Week or Admin tabs.</li>
                <li><strong>Builder:</strong> Everything a User can do, plus the Build Week tab (schedule, inventory, electrical load, layout sync, shade guide).</li>
                <li><strong>Admin:</strong> Everything a Builder can do, plus the Admin dashboard, applicant review, and permission management.</li>
              </ul>
            </div>
          )}
        </TabPanel>

        {/* Kitchen Shifts Tab */}
        <TabPanel tabId="kitchen-shifts" activeTab={activeTab}>
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black uppercase tracking-wider">Kitchen Shift Builder</h2>
                <p className="text-sm text-gray-600">
                  View and edit all kitchen shift positions, times, and roles. Changes here affect the draft board.
                </p>
              </div>
              <div className="flex gap-2 items-center">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showDeleted}
                    onChange={(e) => setShowDeleted(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-gray-500">Show Deleted</span>
                </label>
                <Link href="/admin/shift-draft">
                  <Button>🎯 Go to Shift Draft</Button>
                </Link>
              </div>
            </div>

            {/* Position Editor Modal */}
            {editingPosition && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <Card className="max-w-md w-full border-4 border-yellow-500">
                  <CardHeader>
                    <CardTitle>Edit Shift Position</CardTitle>
                    <CardDescription>Category: {editingPosition.pos.category}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-xs font-bold uppercase">Role Name</label>
                      <Input
                        value={editForm.role}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase">Time</label>
                      <Input
                        value={editForm.time}
                        onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                        placeholder="e.g. 9:30AM–12:00PM"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase">Description</label>
                      <Textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        rows={3}
                      />
                    </div>
                  </CardContent>
                  <div className="flex gap-2 p-4 border-t-2 border-gray-200">
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={() => setEditingPosition(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={async () => {
                        const { updateShiftPositionAction } = await import('@/app/actions/admin')
                        const result = await updateShiftPositionAction(`deli-${editingPosition.catIdx}-${editingPosition.posIdx}`, {
                          role: editForm.role,
                          time: editForm.time,
                          description: editForm.description,
                          category: editingPosition.pos.category,
                        })
                        if (result.success) {
                          setMessage({ type: 'success', text: `Updated position: ${editForm.role}` })
                          setEditingPosition(null)
                          fetchData()
                        } else {
                          setMessage({ type: 'error', text: result.error || 'Update failed' })
                        }
                      }}
                    >
                      Save Changes
                    </Button>
                  </div>
                </Card>
              </div>
            )}

            {/* Shift Categories Grid */}
            {(showDeleted ? rawCategories : shiftCategories).map((cat, displayIdx) => {
              // Find the original index in rawCategories for override keys
              const rawCatIdx = rawCategories.indexOf(cat) !== -1 ? rawCategories.indexOf(cat) : displayIdx
              const catIsDeleted = isCategoryDeleted(shiftOverrides, `deli-${rawCatIdx}`)
              
              // Skip deleted categories when not showing deleted
              if (catIsDeleted && !showDeleted) return null

              return (
              <Card key={rawCatIdx} className={catIsDeleted ? 'opacity-50 border-red-300 border-2' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{cat.name}</CardTitle>
                      {catIsDeleted && <Badge variant="error">DELETED</Badge>}
                    </div>
                    <div className="flex gap-2 items-center">
                      {cat.time && <Badge variant="info">{cat.time}</Badge>}
                      {cat.note && <Badge variant="default">{cat.note}</Badge>}
                      <Badge variant="success">{cat.positions.length} positions</Badge>
                      {catIsDeleted ? (
                        <button
                          className="text-xs text-green-600 hover:text-green-800 underline font-bold"
                          onClick={async () => {
                            const { restoreShiftCategoryAction } = await import('@/app/actions/admin')
                            const result = await restoreShiftCategoryAction(`deli-${rawCatIdx}`)
                            if (result.success) {
                              setMessage({ type: 'success', text: `Restored category: ${cat.name}` })
                              fetchData()
                            } else {
                              setMessage({ type: 'error', text: result.error || 'Restore failed' })
                            }
                          }}
                        >
                          Restore
                        </button>
                      ) : (
                        <button
                          className="text-xs text-red-600 hover:text-red-800 underline font-bold"
                          onClick={async () => {
                            if (!confirm(`Delete the entire "${cat.name}" section? This will remove all ${cat.positions.length} positions from the kitchen, draft, and schedule pages.`)) return
                            const { deleteShiftCategoryAction } = await import('@/app/actions/admin')
                            const result = await deleteShiftCategoryAction(`deli-${rawCatIdx}`)
                            if (result.success) {
                              setMessage({ type: 'success', text: `Deleted section: ${cat.name}` })
                              fetchData()
                            } else {
                              setMessage({ type: 'error', text: result.error || 'Delete failed' })
                            }
                          }}
                        >
                          Delete Section
                        </button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-gray-200 bg-gray-50">
                          <th className="text-left p-2 pl-4 font-bold uppercase tracking-wider text-xs">#</th>
                          <th className="text-left p-2 font-bold uppercase tracking-wider text-xs">Role</th>
                          <th className="text-left p-2 font-bold uppercase tracking-wider text-xs">Time</th>
                          <th className="text-left p-2 font-bold uppercase tracking-wider text-xs hidden md:table-cell">Description</th>
                          <th className="text-left p-2 font-bold uppercase tracking-wider text-xs">Tags</th>
                          <th className="text-left p-2 pr-4 font-bold uppercase tracking-wider text-xs">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cat.positions.map((pos, posIdx) => {
                          const posKey = `deli-${rawCatIdx}-${posIdx}`
                          const posOverride = getPositionOverride(shiftOverrides, posKey)
                          const posIsDeleted = posOverride?.deleted === true
                          
                          if (posIsDeleted && !showDeleted) return null

                          return (
                          <tr key={pos.id} className={cn(
                            "border-b border-gray-100",
                            posIsDeleted ? "bg-red-50 opacity-60" : "hover:bg-yellow-50"
                          )}>
                            <td className="p-2 pl-4 text-gray-400 font-mono text-xs">{posIdx + 1}</td>
                            <td className={cn("p-2 font-medium", posIsDeleted && "line-through")}>{pos.role}</td>
                            <td className="p-2 text-gray-600 text-xs whitespace-nowrap">{pos.time || cat.time || '—'}</td>
                            <td className="p-2 text-gray-500 text-xs hidden md:table-cell max-w-xs truncate">{pos.description || '—'}</td>
                            <td className="p-2">
                              <div className="flex gap-1">
                                {pos.requiresExp && <Badge variant="warning" className="text-[10px] py-0 px-1">EXP</Badge>}
                                {pos.countsDouble && <Badge variant="info" className="text-[10px] py-0 px-1">2×</Badge>}
                                {posIsDeleted && <Badge variant="error" className="text-[10px] py-0 px-1">DELETED</Badge>}
                              </div>
                            </td>
                            <td className="p-2 pr-4">
                              <div className="flex gap-2">
                                {posIsDeleted ? (
                                  <button
                                    className="text-xs text-green-600 hover:text-green-800 underline font-medium"
                                    onClick={async () => {
                                      const { restoreShiftPositionAction } = await import('@/app/actions/admin')
                                      const result = await restoreShiftPositionAction(posKey)
                                      if (result.success) {
                                        setMessage({ type: 'success', text: `Restored: ${pos.role}` })
                                        fetchData()
                                      } else {
                                        setMessage({ type: 'error', text: result.error || 'Restore failed' })
                                      }
                                    }}
                                  >
                                    Restore
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
                                      onClick={() => {
                                        setEditingPosition({ pos, catIdx: rawCatIdx, posIdx })
                                        setEditForm({
                                          role: pos.role,
                                          time: pos.time || '',
                                          description: pos.description || '',
                                        })
                                      }}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      className="text-xs text-red-600 hover:text-red-800 underline font-medium"
                                      onClick={async () => {
                                        if (!confirm(`Delete "${pos.role}" position? It will be removed from all shift pages.`)) return
                                        const { deleteShiftPositionAction } = await import('@/app/actions/admin')
                                        const result = await deleteShiftPositionAction(posKey)
                                        if (result.success) {
                                          setMessage({ type: 'success', text: `Deleted: ${pos.role}` })
                                          fetchData()
                                        } else {
                                          setMessage({ type: 'error', text: result.error || 'Delete failed' })
                                        }
                                      }}
                                    >
                                      Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
              )
            })}

            {/* Current DB Shifts */}
            <Card>
              <CardHeader>
                <CardTitle>Database Shifts ({shifts.length})</CardTitle>
                <CardDescription>
                  Shifts stored in the kitchen_shifts table (used by the legacy schedule system).
                </CardDescription>
              </CardHeader>
              <CardContent>
                {shifts.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No shifts in database. The draft system uses the shift positions above.</p>
                ) : (
                  <div className="space-y-2">
                    {shifts.slice(0, 10).map(shift => (
                      <div key={shift.id} className="border-2 border-black p-3 flex justify-between items-center">
                        <div>
                          <p className="font-bold">{formatDate(shift.date)}</p>
                          <p className="text-sm text-gray-600">{shift.start_time} - {shift.end_time}</p>
                        </div>
                        <Badge>
                          {assignments.filter(a => a.shift_id === shift.id).length} assigned
                        </Badge>
                      </div>
                    ))}
                    {shifts.length > 10 && (
                      <p className="text-sm text-gray-500">+ {shifts.length - 10} more shifts</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabPanel>

        {/* Settings Tab */}
        <TabPanel tabId="settings" activeTab={activeTab}>
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>
                  Core system configuration values.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {settings.map(setting => (
                    <div key={setting.id}>
                      <label className="text-xs font-bold uppercase tracking-wider">
                        {setting.key.replace(/_/g, ' ')}
                      </label>
                      <div className="flex gap-2">
                        <Input
                          value={setting.value}
                          onChange={(e) => {
                            setSettings(settings.map(s => 
                              s.id === setting.id ? { ...s, value: e.target.value } : s
                            ))
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={() => updateSetting(setting.key, setting.value)}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card variant="error">
              <CardHeader>
                <CardTitle>⚠️ Danger Zone</CardTitle>
                <CardDescription>
                  Actions here can break things. Be careful.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-red-500 p-4">
                  <h4 className="font-bold mb-2">System Sunset</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Disable all forms and convert to read-only mode.
                  </p>
                  <Button 
                    variant="danger"
                    onClick={() => {
                      if (confirm('This will disable all intake forms. Are you sure?')) {
                        updateSetting('intake_open', 'false')
                      }
                    }}
                  >
                    Disable Intake
                  </Button>
                </div>

                <div className="border-2 border-red-500 p-4">
                  <h4 className="font-bold mb-2">Full System Shutdown</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Deactivate the entire system.
                  </p>
                  <Button 
                    variant="danger"
                    onClick={() => {
                      if (confirm('This will shut down the entire system. Are you REALLY sure?')) {
                        updateSetting('system_active', 'false')
                      }
                    }}
                  >
                    Shutdown System
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabPanel>
      </div>
    </div>
  )
}
