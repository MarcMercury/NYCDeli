'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
  Badge, Alert, Button, Input
} from '@/components/ui'
import { cn } from '@/lib/utils'
import { SpotGrid } from '@/components/camp-spot-grid'
import {
  fetchSpotsWithReservations,
  adminAssignSpot,
  adminRemoveReservation,
  adminMoveReservation,
  toggleCampSelection,
  isCampSelectionEnabled,
  getCampSelectionOpenDate,
  updateCampSelectionDate,
  fetchAllCampers,
} from '@/lib/camp-spots'
import type { CampSpotWithReservation } from '@/types/database'

type CamperOption = {
  id: string
  full_name: string
  playa_name: string | null
  shelter_type: string
  shelter_width_ft: number
  shelter_length_ft: number
  email: string
}

export default function AdminCampPage() {
  const [spots, setSpots] = useState<CampSpotWithReservation[]>([])
  const [campers, setCampers] = useState<CamperOption[]>([])
  const [selectedSpot, setSelectedSpot] = useState<CampSpotWithReservation | null>(null)
  const [selectedCamperId, setSelectedCamperId] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [openDate, setOpenDate] = useState('')

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [spotsData, campersData, isEnabled, date] = await Promise.all([
        fetchSpotsWithReservations(),
        fetchAllCampers(),
        isCampSelectionEnabled(),
        getCampSelectionOpenDate(),
      ])
      setSpots(spotsData)
      setCampers(campersData)
      setEnabled(isEnabled)
      setOpenDate(date ?? '')
    } catch {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleToggleEnabled() {
    setActionLoading(true)
    setError(null)
    try {
      await toggleCampSelection(!enabled)
      setEnabled(!enabled)
      setSuccess(`Camp selection ${!enabled ? 'enabled' : 'disabled'}`)
    } catch {
      setError('Failed to toggle camp selection')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleUpdateDate() {
    if (!openDate) return
    setActionLoading(true)
    setError(null)
    try {
      await updateCampSelectionDate(openDate)
      setSuccess('Open date updated')
    } catch {
      setError('Failed to update date')
    } finally {
      setActionLoading(false)
    }
  }

  function handleSpotSelect(spot: CampSpotWithReservation) {
    setSelectedSpot(spot)
    setError(null)
    setSuccess(null)
  }

  async function handleAssign() {
    if (!selectedSpot || !selectedCamperId) return
    setActionLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // If spot already has a reservation, remove it first
      if (selectedSpot.reservation) {
        await adminRemoveReservation(selectedSpot.reservation.id)
      }

      // Check if camper already has a spot — if so, move them
      const camperCurrentSpot = spots.find(s => s.reservation?.camper_id === selectedCamperId)
      if (camperCurrentSpot?.reservation) {
        await adminMoveReservation(
          camperCurrentSpot.reservation.id,
          selectedSpot.id,
          selectedCamperId,
          'admin'
        )
      } else {
        await adminAssignSpot(selectedSpot.id, selectedCamperId, 'admin')
      }

      const camper = campers.find(c => c.id === selectedCamperId)
      setSuccess(`${camper?.playa_name || camper?.full_name} assigned to ${selectedSpot.label}`)
      setSelectedSpot(null)
      setSelectedCamperId('')
      await loadData()
    } catch {
      setError('Failed to assign camper. They may already have a reservation — remove it first or use Move.')
      await loadData()
    } finally {
      setActionLoading(false)
    }
  }

  async function handleRemoveReservation() {
    if (!selectedSpot?.reservation) return
    setActionLoading(true)
    setError(null)
    setSuccess(null)

    try {
      await adminRemoveReservation(selectedSpot.reservation.id)
      setSuccess(`Reservation removed from ${selectedSpot.label}`)
      setSelectedSpot(null)
      await loadData()
    } catch {
      setError('Failed to remove reservation')
    } finally {
      setActionLoading(false)
    }
  }

  // Stats
  const totalSpots = spots.length
  const reservedSpots = spots.filter(s => s.reservation?.status === 'reserved').length
  const availableSpots = spots.filter(s => s.is_available && !s.reservation).length
  const disabledSpots = spots.filter(s => !s.is_available).length

  // Campers without a spot
  const reservedCamperIds = new Set(spots.filter(s => s.reservation).map(s => s.reservation!.camper_id))
  const unassignedCampers = campers.filter(c => !reservedCamperIds.has(c.id))

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-spin">⚙️</div>
          <p className="font-bold">Loading admin camp management...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-black uppercase tracking-wider mb-2">
            ⚙️ Camp Spot Admin
          </h1>
          <p className="text-gray-600">
            Assign spots, move campers, enable/disable selection. You&apos;re the playa deity.
          </p>
        </div>

        <Alert variant="warning" className="mb-6">
          <strong>Admin Mode.</strong> You can override any reservation. With great power comes great tent-shuffling.
        </Alert>

        {error && <Alert variant="error" className="mb-4">{error}</Alert>}
        {success && <Alert variant="success" className="mb-4">{success}</Alert>}

        {/* Controls Row */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {/* Toggle Card */}
          <Card>
            <CardHeader>
              <CardTitle>Camp Selection Status</CardTitle>
              <CardDescription>Enable or disable camper self-selection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold">Currently:</span>
                <Badge variant={enabled ? 'success' : 'error'}>
                  {enabled ? '✅ ENABLED' : '🔒 DISABLED'}
                </Badge>
              </div>
              <Button
                onClick={handleToggleEnabled}
                variant={enabled ? 'danger' : 'primary'}
                loading={actionLoading}
                className="w-full"
              >
                {enabled ? '🔒 Disable Selection' : '✅ Enable Selection'}
              </Button>
            </CardContent>
          </Card>

          {/* Date Card */}
          <Card>
            <CardHeader>
              <CardTitle>Open Date</CardTitle>
              <CardDescription>When campers can see this opens</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="date"
                value={openDate}
                onChange={(e) => setOpenDate(e.target.value)}
                label="Selection Opens"
              />
              <Button onClick={handleUpdateDate} variant="secondary" loading={actionLoading} className="w-full">
                Update Date
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-black">{totalSpots}</p>
              <p className="text-xs uppercase tracking-wider text-gray-500">Total Spots</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-black text-green-600">{availableSpots}</p>
              <p className="text-xs uppercase tracking-wider text-gray-500">Available</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-black text-red-600">{reservedSpots}</p>
              <p className="text-xs uppercase tracking-wider text-gray-500">Reserved</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-black text-gray-400">{disabledSpots}</p>
              <p className="text-xs uppercase tracking-wider text-gray-500">Disabled</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-black text-orange-600">{unassignedCampers.length}</p>
              <p className="text-xs uppercase tracking-wider text-gray-500">No Spot Yet</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          {/* Grid */}
          <div>
            <SpotGrid
              spots={spots}
              currentCamperId={null}
              currentTentWidth={null}
              currentTentLength={null}
              selectedSpotId={selectedSpot?.id ?? null}
              onSelectSpot={handleSpotSelect}
              isAdmin
            />
          </div>

          {/* Admin Sidebar */}
          <div className="space-y-4">
            {/* Selected Spot Actions */}
            {selectedSpot && (
              <Card className="border-2 border-blue-500">
                <CardHeader>
                  <CardTitle>Spot {selectedSpot.label}</CardTitle>
                  <CardDescription>
                    {selectedSpot.spot_width_ft}×{selectedSpot.spot_length_ft}ft • {selectedSpot.size_category}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Current occupant */}
                  {selectedSpot.reservation ? (
                    <div className="p-3 bg-red-50 border-2 border-red-200">
                      <p className="font-bold text-sm">Currently Reserved By:</p>
                      <p className="text-lg font-black">
                        {selectedSpot.camper?.playa_name || selectedSpot.camper?.full_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Tent: {selectedSpot.camper?.shelter_width_ft}×{selectedSpot.camper?.shelter_length_ft}ft
                      </p>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={handleRemoveReservation}
                        loading={actionLoading}
                        className="mt-2 w-full"
                      >
                        Remove Reservation
                      </Button>
                    </div>
                  ) : (
                    <div className="p-3 bg-green-50 border-2 border-green-200">
                      <p className="font-bold text-sm text-green-700">✅ Available</p>
                    </div>
                  )}

                  {/* Assign camper */}
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-wider text-black mb-1">
                      Assign Camper
                    </label>
                    <select
                      value={selectedCamperId}
                      onChange={(e) => setSelectedCamperId(e.target.value)}
                      className="w-full px-4 py-2.5 text-black bg-white border-2 border-black appearance-none focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                    >
                      <option value="">Select a camper...</option>
                      <optgroup label="Without a spot">
                        {unassignedCampers.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.playa_name || c.full_name} — {c.shelter_width_ft}×{c.shelter_length_ft}ft ({c.shelter_type})
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="All campers (will move if assigned elsewhere)">
                        {campers.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.playa_name || c.full_name} — {c.shelter_width_ft}×{c.shelter_length_ft}ft
                          </option>
                        ))}
                      </optgroup>
                    </select>
                    <Button
                      onClick={handleAssign}
                      variant="primary"
                      loading={actionLoading}
                      disabled={!selectedCamperId}
                      className="mt-2 w-full"
                    >
                      {selectedSpot.reservation ? '🔄 Replace & Assign' : '🏕️ Assign to Spot'}
                    </Button>
                  </div>

                  {/* Spot features */}
                  <div className="text-xs text-gray-500 space-y-1 pt-2 border-t">
                    <p>Tent range: {selectedSpot.min_tent_width_ft}-{selectedSpot.max_tent_width_ft}ft × {selectedSpot.min_tent_length_ft}-{selectedSpot.max_tent_length_ft}ft</p>
                    <div className="flex gap-2">
                      {selectedSpot.has_power && <span>⚡ Power</span>}
                      {selectedSpot.has_shade && <span>⛱️ Shade</span>}
                      {selectedSpot.is_accessible && <span>♿ Accessible</span>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reservation List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">All Reservations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[400px] overflow-y-auto space-y-1">
                  {spots
                    .filter(s => s.reservation)
                    .sort((a, b) => a.label.localeCompare(b.label))
                    .map(s => (
                      <button
                        key={s.id}
                        onClick={() => handleSpotSelect(s)}
                        className={cn(
                          'w-full text-left px-2 py-1.5 text-xs border hover:bg-gray-50 flex justify-between items-center',
                          selectedSpot?.id === s.id && 'bg-blue-50 border-blue-300'
                        )}
                      >
                        <span className="font-black">{s.label}</span>
                        <span className="text-gray-600 truncate ml-2">
                          {s.camper?.playa_name || s.camper?.full_name}
                        </span>
                      </button>
                    ))}
                  {!spots.some(s => s.reservation) && (
                    <p className="text-xs text-gray-400 text-center py-4">No reservations yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Unassigned Campers */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Campers Without Spots ({unassignedCampers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[300px] overflow-y-auto space-y-1">
                  {unassignedCampers.map(c => (
                    <div
                      key={c.id}
                      className="px-2 py-1.5 text-xs border flex justify-between items-center"
                    >
                      <span className="font-bold truncate">
                        {c.playa_name || c.full_name}
                      </span>
                      <span className="text-gray-500 flex-shrink-0 ml-2">
                        {c.shelter_width_ft}×{c.shelter_length_ft}ft
                      </span>
                    </div>
                  ))}
                  {unassignedCampers.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">Everyone has a spot!</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
