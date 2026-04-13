'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
  Badge, Alert, Button, Textarea, Input
} from '@/components/ui'
import { cn } from '@/lib/utils'
import type { UserProfileRow, CamperRow } from '@/types/database'
import { adminResetPasswordAction } from '@/app/actions/admin'

interface ApplicantWithCamper extends UserProfileRow {
  camper: CamperRow | null
}

type FilterStatus = 'pending' | 'user' | 'denied' | 'all'

export default function ApplicantReviewPage() {
  const [applicants, setApplicants] = useState<ApplicantWithCamper[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedApplicant, setSelectedApplicant] = useState<ApplicantWithCamper | null>(null)
  const [filter, setFilter] = useState<FilterStatus>('pending')
  const [denyReason, setDenyReason] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [resetPassword, setResetPassword] = useState('')
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false)

  const fetchApplicants = useCallback(async () => {
    const supabase = createClient()
    
    // Fetch all user profiles
    let query = supabase.from('user_profiles' as never).select('*').order('created_at', { ascending: false })
    
    if (filter !== 'all') {
      if (filter === 'denied') {
        query = query.not('denied_at', 'is', null)
      } else {
        query = query.eq('role', filter)
      }
    }

    const { data: profiles, error } = await query as unknown as { data: UserProfileRow[] | null; error: Error | null }

    if (error) {
      setMessage({ type: 'error', text: error.message })
      setLoading(false)
      return
    }

    // Fetch camper data for each profile by matching email
    const { data: campers } = await supabase.from('campers').select('*') as unknown as { data: CamperRow[] | null }

    const campersByEmail = new Map<string, CamperRow>()
    campers?.forEach(c => campersByEmail.set(c.email, c))

    const enriched: ApplicantWithCamper[] = (profiles || []).map(p => ({
      ...p,
      camper: campersByEmail.get(p.email) || null,
    }))

    setApplicants(enriched)
    setLoading(false)
  }, [filter])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    fetchApplicants()
  }, [fetchApplicants])

  const handleApprove = async (applicant: ApplicantWithCamper) => {
    setActionLoading(true)
    const supabase = createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    const { error } = await supabase
      .from('user_profiles')
      .update({
        role: 'user',
        approved_at: new Date().toISOString(),
        approved_by: user?.id,
        denied_at: null,
        denied_reason: null,
        camper_id: applicant.camper?.id || null,
      } as never)
      .eq('id', applicant.id)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: `${applicant.email} has been approved!` })
      setSelectedApplicant(null)
      fetchApplicants()
    }
    setActionLoading(false)
  }

  const handleDeny = async (applicant: ApplicantWithCamper) => {
    setActionLoading(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('user_profiles')
      .update({
        role: 'pending',
        denied_at: new Date().toISOString(),
        denied_reason: denyReason || 'No reason provided',
      } as never)
      .eq('id', applicant.id)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: `${applicant.email} has been denied.` })
      setSelectedApplicant(null)
      setDenyReason('')
      fetchApplicants()
    }
    setActionLoading(false)
  }

  const handleResetPassword = async (applicant: ApplicantWithCamper) => {
    if (!resetPassword || resetPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' })
      return
    }
    setActionLoading(true)
    const result = await adminResetPasswordAction(applicant.id, resetPassword)
    if (result.success) {
      setMessage({ type: 'success', text: `Password reset for ${applicant.email}` })
      setResetPassword('')
      setShowResetPassword(false)
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to reset password' })
    }
    setActionLoading(false)
  }

  const generateAiSummary = async (applicant: ApplicantWithCamper) => {
    if (!applicant.camper) return
    setAiSummaryLoading(true)
    setAiSummary(null)
    try {
      const res = await fetch('/api/ai/applicant-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ camper: applicant.camper }),
      })
      const data = await res.json()
      if (res.ok) {
        setAiSummary(data.summary)
      } else {
        setAiSummary(`Error: ${data.error}`)
      }
    } catch {
      setAiSummary('Failed to generate summary')
    }
    setAiSummaryLoading(false)
  }

  const getStatusBadge = (applicant: ApplicantWithCamper) => {
    if (applicant.denied_at) return <Badge variant="error">Denied</Badge>
    if (applicant.role === 'pending') return <Badge variant="warning">Pending</Badge>
    if (applicant.role === 'admin') return <Badge variant="default">Admin</Badge>
    return <Badge variant="success">Approved</Badge>
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-wider">📋 Applicant Review</h1>
        <p className="text-gray-600 mt-1">Review, approve, or deny camp applicants</p>
      </div>

      {message && (
        <Alert variant={message.type === 'success' ? 'success' : 'error'} className="mb-6">
          {message.text}
        </Alert>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {(['pending', 'user', 'denied', 'all'] as FilterStatus[]).map(status => (
          <button
            key={status}
            onClick={() => { setFilter(status); setSelectedApplicant(null) }}
            className={cn(
              'px-4 py-2 text-sm font-bold uppercase tracking-wider border-2 border-black transition-all',
              filter === status
                ? 'bg-black text-yellow-400'
                : 'bg-white text-black hover:bg-gray-100'
            )}
          >
            {status === 'user' ? 'Approved' : status}
            {status === 'pending' && ` (${applicants.filter(a => a.role === 'pending' && !a.denied_at).length})`}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Applicant List */}
        <div className="lg:col-span-1 space-y-2 max-h-[75vh] overflow-y-auto">
          {applicants.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                No applicants in this category.
              </CardContent>
            </Card>
          ) : (
            applicants.map(applicant => (
              <button
                key={applicant.id}
                onClick={() => { setSelectedApplicant(applicant); setShowResetPassword(false); setResetPassword(''); setAiSummary(null) }}
                className={cn(
                  'w-full text-left p-4 border-2 border-black transition-all',
                  selectedApplicant?.id === applicant.id
                    ? 'bg-yellow-400'
                    : 'bg-white hover:bg-yellow-50'
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">{applicant.email}</p>
                    {applicant.camper && (
                      <p className="text-sm text-gray-600">
                        {applicant.camper.full_name}
                        {applicant.camper.playa_name && ` "${applicant.camper.playa_name}"`}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Signed up {new Date(applicant.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {getStatusBadge(applicant)}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Applicant Detail / Profile View */}
        <div className="lg:col-span-2">
          {selectedApplicant ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">
                      {selectedApplicant.camper?.full_name || selectedApplicant.email}
                    </CardTitle>
                    <CardDescription>
                      {selectedApplicant.camper?.playa_name && (
                        <span className="text-yellow-700 font-bold">
                          &quot;{selectedApplicant.camper.playa_name}&quot; •{' '}
                        </span>
                      )}
                      {selectedApplicant.email}
                    </CardDescription>
                  </div>
                  {getStatusBadge(selectedApplicant)}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {selectedApplicant.camper ? (
                  <>
                    {/* AI Summary */}
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold uppercase tracking-wider text-sm text-purple-800">
                          🤖 AI Summary
                        </h3>
                        <Button
                          onClick={() => generateAiSummary(selectedApplicant)}
                          disabled={aiSummaryLoading}
                          className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1"
                        >
                          {aiSummaryLoading ? '⏳ Analyzing...' : aiSummary ? '🔄 Refresh' : '✨ Generate'}
                        </Button>
                      </div>
                      {aiSummary && (
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{aiSummary}</p>
                      )}
                      {!aiSummary && !aiSummaryLoading && (
                        <p className="text-xs text-gray-400 italic">Click Generate for an AI-powered applicant overview</p>
                      )}
                    </div>

                    {/* Registration Info */}
                    <div>
                      <h3 className="font-bold uppercase tracking-wider text-sm mb-3 border-b-2 border-black pb-1">
                        Contact Info
                      </h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-gray-500">Email:</span> {selectedApplicant.camper.email}</div>
                        <div><span className="text-gray-500">Phone:</span> {selectedApplicant.camper.phone || 'Not provided'}</div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold uppercase tracking-wider text-sm mb-3 border-b-2 border-black pb-1">
                        Arrival & Shelter
                      </h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-gray-500">Arrival:</span> {selectedApplicant.camper.arrival_date}</div>
                        <div><span className="text-gray-500">Departure:</span> {selectedApplicant.camper.departure_date}</div>
                        <div><span className="text-gray-500">Method:</span> {selectedApplicant.camper.arrival_method}</div>
                        <div><span className="text-gray-500">Early Arrival:</span> {selectedApplicant.camper.early_arrival ? 'Yes' : 'No'}</div>
                        <div><span className="text-gray-500">Shelter:</span> {selectedApplicant.camper.shelter_type}</div>
                        <div>
                          <span className="text-gray-500">Dimensions:</span>{' '}
                          {selectedApplicant.camper.shelter_length_ft}×{selectedApplicant.camper.shelter_width_ft} ft
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold uppercase tracking-wider text-sm mb-3 border-b-2 border-black pb-1">
                        Participation
                      </h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-gray-500">Kitchen:</span> {selectedApplicant.camper.kitchen_participation ? 'Yes' : 'No'}</div>
                        <div><span className="text-gray-500">Strike:</span> {selectedApplicant.camper.strike_participation ? 'Yes' : 'No'}</div>
                        <div><span className="text-gray-500">Build Week:</span> {selectedApplicant.camper.build_week_attending ? 'Yes' : 'No'}</div>
                        <div><span className="text-gray-500">Sober Shifts:</span> {selectedApplicant.camper.sober_shifts ? 'Yes' : 'No'}</div>
                      </div>
                    </div>

                    {selectedApplicant.camper.skills && selectedApplicant.camper.skills.length > 0 && (
                      <div>
                        <h3 className="font-bold uppercase tracking-wider text-sm mb-3 border-b-2 border-black pb-1">
                          Skills
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedApplicant.camper.skills.map(skill => (
                            <Badge key={skill} variant="default">{skill}</Badge>
                          ))}
                        </div>
                        {selectedApplicant.camper.custom_skills && (
                          <p className="text-sm mt-2 text-gray-600">{selectedApplicant.camper.custom_skills}</p>
                        )}
                      </div>
                    )}

                    <div>
                      <h3 className="font-bold uppercase tracking-wider text-sm mb-3 border-b-2 border-black pb-1">
                        Safety & Medical
                      </h3>
                      <div className="grid grid-cols-1 gap-3 text-sm">
                        <div><span className="text-gray-500">Emergency Contact:</span> {selectedApplicant.camper.emergency_contact || 'Not provided'}</div>
                        <div><span className="text-gray-500">Medical Conditions:</span> {selectedApplicant.camper.medical_conditions || 'None'}</div>
                        <div><span className="text-gray-500">Medications:</span> {selectedApplicant.camper.medications || 'None'}</div>
                        <div><span className="text-gray-500">Allergies:</span> {selectedApplicant.camper.allergies || 'None'}</div>
                        <div><span className="text-gray-500">Dietary:</span> {selectedApplicant.camper.dietary_restrictions || 'None'}</div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold uppercase tracking-wider text-sm mb-3 border-b-2 border-black pb-1">
                        About
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div><span className="text-gray-500">Burn Count:</span> {selectedApplicant.camper.burn_count || 'Not specified'}</div>
                        <div><span className="text-gray-500">What Attracted:</span> {selectedApplicant.camper.what_attracted_you || 'Not provided'}</div>
                        <div><span className="text-gray-500">Referral:</span> {selectedApplicant.camper.referral_source || 'Not provided'}</div>
                        <div><span className="text-gray-500">References:</span> {selectedApplicant.camper.character_references || 'Not provided'}</div>
                        {selectedApplicant.camper.first_burn_hopes && (
                          <div><span className="text-gray-500">First Burn Hopes:</span> {selectedApplicant.camper.first_burn_hopes}</div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold uppercase tracking-wider text-sm mb-3 border-b-2 border-black pb-1">
                        Agreements
                      </h3>
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          {selectedApplicant.camper.volunteer_commitment ? '✅' : '❌'} Volunteer Commitment
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedApplicant.camper.sober_shifts ? '✅' : '❌'} Sober Shifts Agreement
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedApplicant.camper.background_check_consent ? '✅' : '❌'} Background Check Consent
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <Alert variant="warning">
                    This user has not completed the camp registration form yet. 
                    No camper record is linked to their email.
                  </Alert>
                )}

                {/* Denial info if denied */}
                {selectedApplicant.denied_at && (
                  <Alert variant="error">
                    <strong>Denied on {new Date(selectedApplicant.denied_at).toLocaleDateString()}</strong>
                    {selectedApplicant.denied_reason && (
                      <p className="mt-1">Reason: {selectedApplicant.denied_reason}</p>
                    )}
                  </Alert>
                )}

                {/* Password Reset */}
                <div>
                  <h3 className="font-bold uppercase tracking-wider text-sm mb-3 border-b-2 border-black pb-1">
                    Password Management
                  </h3>
                  {showResetPassword ? (
                    <div className="space-y-3">
                      <Input
                        label="New Password"
                        type="text"
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                        placeholder="Minimum 8 characters"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleResetPassword(selectedApplicant)}
                          disabled={actionLoading || resetPassword.length < 8}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {actionLoading ? 'Setting...' : '🔑 Set Password'}
                        </Button>
                        <Button
                          onClick={() => { setShowResetPassword(false); setResetPassword('') }}
                          variant="secondary"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setShowResetPassword(true)}
                      variant="secondary"
                      className="text-sm"
                    >
                      🔑 Reset Password
                    </Button>
                  )}
                </div>
              </CardContent>

              {/* Action buttons */}
              {selectedApplicant.role === 'pending' && (
                <CardFooter className="flex flex-col gap-4 border-t-2 border-black pt-4">
                  <div className="flex gap-3 w-full">
                    <Button
                      onClick={() => handleApprove(selectedApplicant)}
                      disabled={actionLoading}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      {actionLoading ? 'Processing...' : '✅ Approve'}
                    </Button>
                  </div>
                  <div className="w-full space-y-2">
                    <Textarea
                      placeholder="Reason for denial (optional)"
                      value={denyReason}
                      onChange={(e) => setDenyReason(e.target.value)}
                      rows={2}
                    />
                    <Button
                      onClick={() => handleDeny(selectedApplicant)}
                      disabled={actionLoading}
                      variant="danger"
                      className="w-full"
                    >
                      {actionLoading ? 'Processing...' : '❌ Deny'}
                    </Button>
                  </div>
                </CardFooter>
              )}

              {/* Re-approve or re-deny for already processed */}
              {(selectedApplicant.role === 'user' || selectedApplicant.denied_at) && (
                <CardFooter className="border-t-2 border-black pt-4">
                  {selectedApplicant.denied_at && (
                    <Button
                      onClick={() => handleApprove(selectedApplicant)}
                      disabled={actionLoading}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      ✅ Approve (Override Denial)
                    </Button>
                  )}
                </CardFooter>
              )}
            </Card>
          ) : (
            <Card>
              <CardContent className="py-16 text-center text-gray-400">
                <p className="text-4xl mb-4">👈</p>
                <p className="font-bold uppercase tracking-wider">Select an applicant to review</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
