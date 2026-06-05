'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Card, CardContent,
  Badge, Alert, Input, Select
} from '@/components/ui'
import { updateUserRoleAction } from '@/app/actions/admin'
import type { UserProfileRow, UserRole } from '@/types/database'

type CamperInfo = { full_name: string | null; playa_name: string | null }

export default function PermissionsPage() {
  const [profiles, setProfiles] = useState<UserProfileRow[]>([])
  const [campersByEmail, setCampersByEmail] = useState<Map<string, CamperInfo>>(new Map())
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchProfiles = useCallback(async () => {
    const supabase = createClient()
    const [profilesRes, campersRes] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('*')
        .in('role', ['user', 'builder', 'admin'])
        .order('email'),
      supabase.from('campers').select('email, full_name, playa_name'),
    ])

    if (profilesRes.error) {
      setMessage({ type: 'error', text: profilesRes.error.message })
    } else {
      setProfiles(profilesRes.data || [])
    }

    if (campersRes.data) {
      const map = new Map<string, CamperInfo>()
      for (const c of campersRes.data as Array<{ email: string | null; full_name: string | null; playa_name: string | null }>) {
        if (c.email) map.set(c.email.toLowerCase(), { full_name: c.full_name, playa_name: c.playa_name })
      }
      setCampersByEmail(map)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    fetchProfiles()
  }, [fetchProfiles])

  const updateRole = async (profileId: string, newRole: UserRole) => {
    const result = await updateUserRoleAction(profileId, newRole)
    if (!result.success) {
      setMessage({ type: 'error', text: result.error || 'Update failed' })
    } else {
      setMessage({ type: 'success', text: 'Role updated successfully' })
      fetchProfiles()
    }
  }

  const filteredProfiles = profiles.filter(p => {
    const term = searchTerm.toLowerCase()
    if (!term) return true
    if (p.email.toLowerCase().includes(term)) return true
    const camper = campersByEmail.get(p.email.toLowerCase())
    if (camper?.full_name?.toLowerCase().includes(term)) return true
    if (camper?.playa_name?.toLowerCase().includes(term)) return true
    return false
  })

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Badge variant="info">Admin</Badge>
      case 'builder':
        return <Badge variant="warning">Builder</Badge>
      case 'user':
        return <Badge variant="success">User</Badge>
      default:
        return <Badge variant="warning">Pending</Badge>
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-wider">🔐 Permissions</h1>
        <p className="text-gray-600 mt-1">Manage user roles — toggle between User and Admin access</p>
      </div>

      {message && (
        <Alert variant={message.type === 'success' ? 'success' : 'error'} className="mb-6">
          {message.text}
        </Alert>
      )}

      <div className="mb-6">
        <Input
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-black bg-gray-50">
                  <th className="text-left px-4 py-3 text-sm font-bold uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3 text-sm font-bold uppercase tracking-wider">Email</th>
                  <th className="text-left px-4 py-3 text-sm font-bold uppercase tracking-wider">Current Role</th>
                  <th className="text-left px-4 py-3 text-sm font-bold uppercase tracking-wider">Approved</th>
                  <th className="text-right px-4 py-3 text-sm font-bold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProfiles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-400">
                      No approved users found.
                    </td>
                  </tr>
                ) : (
                  filteredProfiles.map(profile => {
                    const camper = campersByEmail.get(profile.email.toLowerCase())
                    const displayName = camper?.full_name
                      ? camper.playa_name
                        ? `${camper.full_name} ("${camper.playa_name}")`
                        : camper.full_name
                      : null
                    return (
                    <tr key={profile.id} className="border-b border-gray-200 hover:bg-yellow-50 transition-colors">
                      <td className="px-4 py-3 font-medium">
                        {displayName || <span className="text-gray-400 italic">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{profile.email}</td>
                      <td className="px-4 py-3">{getRoleBadge(profile.role)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {profile.approved_at
                          ? new Date(profile.approved_at).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Select
                          options={[
                            { value: 'user', label: 'User' },
                            { value: 'builder', label: 'Builder' },
                            { value: 'admin', label: 'Admin' },
                          ]}
                          value={profile.role}
                          onChange={(e) => updateRole(profile.id, e.target.value as UserRole)}
                          className="h-8 text-xs inline-block w-auto"
                          title="Access level — User: basic tabs · Builder: + Build Week · Admin: + Admin"
                        />
                      </td>
                    </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-400 text-sm">
        <p className="font-bold uppercase tracking-wider mb-1">⚠️ About Roles</p>
        <ul className="space-y-1 text-gray-700">
          <li><strong>User:</strong> Full read/write access to camp pages (spots, kitchen, schedule, events, etc.). Does NOT see Build Week or Admin tabs.</li>
          <li><strong>Builder:</strong> Everything a User can do, plus the Build Week tab (schedule, inventory, electrical load, layout sync, shade guide).</li>
          <li><strong>Admin:</strong> Everything a Builder can do, plus the Admin dashboard, applicant review, and permission management.</li>
        </ul>
      </div>
    </div>
  )
}
