'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { SpotGrid } from '@/components/camp-spot-grid'
import {
  fetchSpotsWithReservations,
  reserveSpot,
  releaseReservation,
  isCampSelectionEnabled,
  getCampSelectionOpenDate,
  doesTentFitSpot,
} from '@/lib/camp-spots'
import { createClient } from '@/lib/supabase/client'
import type { CampSpotWithReservation, CamperRow } from '@/types/database'

export default function CampSelectionPage() {
  const [spots, setSpots] = useState<CampSpotWithReservation[]>([])
  const [selectedSpot, setSelectedSpot] = useState<CampSpotWithReservation | null>(null)
  const [camper, setCamper] = useState<CamperRow | null>(null)
  const [email, setEmail] = useState('')
  const [isIdentified, setIsIdentified] = useState(false)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [openDate, setOpenDate] = useState<string | null>(null)
  const [checkingStatus, setCheckingStatus] = useState(true)

  // Check if feature is enabled
  useEffect(() => {
    async function checkStatus() {
      try {
        const [isEnabled, date] = await Promise.all([
          isCampSelectionEnabled(),
          getCampSelectionOpenDate(),
        ])
        setEnabled(isEnabled)
        setOpenDate(date)
      } catch {
        setError('Failed to check camp selection status')
      } finally {
        setCheckingStatus(false)
      }
    }
    checkStatus()
  }, [])

  const loadSpots = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchSpotsWithReservations()
      setSpots(data)
    } catch {
      setError('Failed to load camp spots')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (enabled) {
      loadSpots()
    }
  }, [enabled, loadSpots])

  // Look up camper by email
  async function handleIdentify(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setActionLoading(true)

    try {
      const supabase = createClient()
      const { data, error: fetchError } = await supabase
        .from('campers')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .single()

      if (fetchError || !data) {
        setError('No camper found with that email. Make sure you\'ve registered first.')
        return
      }

      setCamper(data as CamperRow)
      setIsIdentified(true)
    } catch {
      setError('Something went wrong looking you up.')
    } finally {
      setActionLoading(false)
    }
  }

  function handleSpotSelect(spot: CampSpotWithReservation) {
    setError(null)
    setSuccess(null)

    // If clicking their own spot, prepare to release
    if (spot.reservation?.camper_id === camper?.id) {
      setSelectedSpot(spot)
      return
    }

    // If spot is already reserved by someone else, no-op
    if (spot.reservation && spot.reservation.camper_id !== camper?.id) {
      return
    }

    // Check tent fit
    if (camper) {
      const fitCheck = doesTentFitSpot(camper.shelter_width_ft, camper.shelter_length_ft, spot)
      if (!fitCheck.fits) {
        setError(fitCheck.reason ?? 'Your tent doesn\'t fit this spot.')
        setSelectedSpot(null)
        return
      }
    }

    setSelectedSpot(spot)
  }

  async function handleConfirmReservation() {
    if (!selectedSpot || !camper) return
    setActionLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Check if camper already has a reservation
      const existingReservation = spots.find(s => s.reservation?.camper_id === camper.id)

      if (selectedSpot.reservation?.camper_id === camper.id) {
        // Releasing their own spot
        await releaseReservation(selectedSpot.reservation.id)
        setSuccess(`Spot ${selectedSpot.label} released. You can now pick a new spot.`)
      } else {
        // If they already have a spot, release it first
        if (existingReservation?.reservation) {
          await releaseReservation(existingReservation.reservation.id)
        }
        await reserveSpot(selectedSpot.id, camper.id)
        setSuccess(`Spot ${selectedSpot.label} is yours! 🏕️`)
      }

      setSelectedSpot(null)
      await loadSpots()
    } catch {
      setError('Failed to complete reservation. The spot may have just been taken.')
      await loadSpots()
    } finally {
      setActionLoading(false)
    }
  }

  // Feature disabled state
  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🏕️</div>
          <p className="font-bold text-gray-600">Loading camp selection...</p>
        </div>
      </div>
    )
  }

  if (!enabled) {
    return (
      <div className="min-h-screen bg-gray-50">
        <section className="bg-yellow-400 border-b-4 border-black py-12">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-4">
              🏕️ Camp Spot Selection
            </h1>
            <p className="text-lg font-medium text-black/70">
              Choose your home on the playa — airline seat style
            </p>
          </div>
        </section>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <Card variant="warning">
            <CardContent className="py-12">
              <div className="text-6xl mb-4">🔒</div>
              <h2 className="text-2xl font-black uppercase mb-4">Not Open Yet</h2>
              <p className="text-gray-600 mb-2">
                Camp spot selection hasn&apos;t been enabled by leadership yet.
              </p>
              {openDate && (
                <p className="text-gray-600">
                  Scheduled to open: <span className="font-bold text-black">{new Date(openDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </p>
              )}
              <p className="text-sm text-gray-500 mt-6 italic">
                Patience, grasshopper. The playa provides… on our schedule.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Identify step
  if (!isIdentified) {
    return (
      <div className="min-h-screen bg-gray-50">
        <section className="bg-yellow-400 border-b-4 border-black py-12">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-4">
              🏕️ Camp Spot Selection
            </h1>
            <p className="text-lg font-medium text-black/70">
              Choose your home on the playa — airline seat style
            </p>
          </div>
        </section>
        <div className="max-w-md mx-auto px-4 py-16">
          <Card>
            <CardHeader>
              <CardTitle>Who Are You?</CardTitle>
              <CardDescription>
                Enter the email you registered with so we can pull up your tent info.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleIdentify} className="space-y-4">
                <Input
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@example.com"
                  required
                />
                {error && <Alert variant="error">{error}</Alert>}
                <Button type="submit" loading={actionLoading} className="w-full">
                  Find My Registration
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Main selection view
  const myReservation = spots.find(s => s.reservation?.camper_id === camper?.id)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-yellow-400 border-b-4 border-black py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-4xl font-black uppercase tracking-tight">
                🏕️ Camp Spot Selection
              </h1>
              <p className="text-sm font-medium text-black/70 mt-1">
                Pick your spot. Click to select, confirm to reserve.
              </p>
            </div>
            {camper && (
              <div className="flex items-center gap-3 bg-black text-white px-4 py-2">
                <div>
                  <div className="font-bold text-yellow-400">
                    {camper.playa_name || camper.full_name}
                  </div>
                  <div className="text-xs text-gray-300">
                    Tent: {camper.shelter_width_ft}×{camper.shelter_length_ft}ft ({camper.shelter_type})
                  </div>
                </div>
                {myReservation && (
                  <Badge variant="success">Spot {myReservation.label}</Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[1fr_320px] gap-8">
          {/* Grid Area */}
          <div>
            {error && <Alert variant="error" className="mb-4">{error}</Alert>}
            {success && <Alert variant="success" className="mb-4">{success}</Alert>}

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin text-4xl mb-4">🏕️</div>
                <p className="font-bold text-gray-600">Loading camp map...</p>
              </div>
            ) : (
              <SpotGrid
                spots={spots}
                currentCamperId={camper?.id ?? null}
                currentTentWidth={camper?.shelter_width_ft ?? null}
                currentTentLength={camper?.shelter_length_ft ?? null}
                selectedSpotId={selectedSpot?.id ?? null}
                onSelectSpot={handleSpotSelect}
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Your Info Card */}
            {camper && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Your Shelter Info</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Type</span>
                    <span className="font-bold capitalize">{camper.shelter_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Width</span>
                    <span className="font-bold">{camper.shelter_width_ft} ft</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Length</span>
                    <span className="font-bold">{camper.shelter_length_ft} ft</span>
                  </div>
                  {camper.power_required && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Power</span>
                      <span className="font-bold">⚡ {camper.power_type}</span>
                    </div>
                  )}
                  {camper.shade_required && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Shade</span>
                      <span className="font-bold">⛱️ Required</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Current Reservation */}
            {myReservation && (
              <Card variant="success">
                <CardHeader>
                  <CardTitle className="text-sm">Your Current Spot</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black text-center my-2">{myReservation.label}</div>
                  <div className="text-xs text-center text-gray-500 space-y-1">
                    <p>{myReservation.spot_width_ft}×{myReservation.spot_length_ft}ft • {myReservation.size_category}</p>
                    <div className="flex justify-center gap-2">
                      {myReservation.has_power && <span>⚡ Power</span>}
                      {myReservation.has_shade && <span>⛱️ Shade</span>}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 text-center mt-3">
                    Click your spot on the map to release it.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Selected Spot Detail */}
            {selectedSpot && (
              <Card className="border-blue-500 border-2">
                <CardHeader>
                  <CardTitle className="text-sm">
                    {selectedSpot.reservation?.camper_id === camper?.id
                      ? '⚠️ Release This Spot?'
                      : '✅ Confirm Selection'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-3xl font-black text-center">{selectedSpot.label}</div>
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="text-gray-500">Space:</span>{' '}
                      <span className="font-bold">{selectedSpot.spot_width_ft}×{selectedSpot.spot_length_ft}ft</span>
                    </p>
                    <p>
                      <span className="text-gray-500">Size:</span>{' '}
                      <Badge>{selectedSpot.size_category.toUpperCase()}</Badge>
                    </p>
                    <p>
                      <span className="text-gray-500">Fits tent:</span>{' '}
                      <span className="font-bold">{selectedSpot.min_tent_width_ft}-{selectedSpot.max_tent_width_ft}ft × {selectedSpot.min_tent_length_ft}-{selectedSpot.max_tent_length_ft}ft</span>
                    </p>
                    <div className="flex gap-2 text-xs mt-1">
                      {selectedSpot.has_power && <span className="px-2 py-0.5 bg-yellow-100 border border-yellow-500">⚡ Power</span>}
                      {selectedSpot.has_shade && <span className="px-2 py-0.5 bg-blue-100 border border-blue-500">⛱️ Shade</span>}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant={selectedSpot.reservation?.camper_id === camper?.id ? 'danger' : 'primary'}
                      onClick={handleConfirmReservation}
                      loading={actionLoading}
                      className="flex-1"
                    >
                      {selectedSpot.reservation?.camper_id === camper?.id
                        ? '🔓 Release Spot'
                        : '🏕️ Reserve Spot'}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setSelectedSpot(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Size Guide */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Spot Size Guide</CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 bg-blue-200 text-blue-800 font-bold rounded">S</span>
                  <span>Small: 10×10ft — Solo tents (6-10ft wide)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 bg-green-200 text-green-800 font-bold rounded">M</span>
                  <span>Medium: 12.5×10ft — Couples (8-12.5ft wide)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 bg-purple-200 text-purple-800 font-bold rounded">L</span>
                  <span>Large: 15×10ft — Small groups (10-15ft wide)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 bg-pink-200 text-pink-800 font-bold rounded">XL</span>
                  <span>XLarge: 17.5×10ft — Big setups (12-17.5ft wide)</span>
                </div>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Tips</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-gray-600 space-y-2">
                <p>🖱️ <strong>Hover</strong> any spot to see details</p>
                <p>🟢 <strong>Green</strong> spots fit your tent — click to select</p>
                <p>🟠 <strong>Orange</strong> spots don&apos;t fit your tent size</p>
                <p>🟡 <strong>Yellow</strong> is your current reserved spot</p>
                <p>🔴 <strong>Red</strong> spots are taken by other campers</p>
                <p>⚡ Look for power/shade icons if you need them</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
