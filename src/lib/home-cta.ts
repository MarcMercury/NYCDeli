import type { DeliSupabase } from '@/lib/events'
import { isAcceptingApplications } from '@/lib/events'
import { createClient } from '@/lib/supabase/client'
import type { EventRow } from '@/types/database'

/**
 * Admin-controlled call-to-action buttons on the home page.
 *
 * The home page used to hard-code "Register for Burning Man" pointing at the
 * 2026 intake form, which became a dead end the moment that event closed.
 * Buttons are now either derived from events that are actually accepting
 * applications, or explicitly configured here — and either can be switched off.
 */

export const HOME_CTA_KEY = 'home_ctas'

export type HomeCtaPlacement = 'hero' | 'join' | 'both'
export type HomeCtaVariant = 'primary' | 'secondary'

export interface HomeCtaButton {
  id: string
  label: string
  href: string
  placement: HomeCtaPlacement
  variant: HomeCtaVariant
  enabled: boolean
}

export interface HomeCtaConfig {
  /** Auto-generate an Apply button for every event accepting applications. */
  autoEventButtons: boolean
  /** Shown above the buttons in the "Ready to Join?" section. */
  joinHeading: string
  joinBody: string
  buttons: HomeCtaButton[]
}

export const DEFAULT_HOME_CTA: HomeCtaConfig = {
  autoEventButtons: true,
  joinHeading: 'Ready to Join?',
  joinBody:
    'Applications open per event. Check what’s open — the smaller events are a much lighter lift than a burn.',
  buttons: [],
}

function db(client?: DeliSupabase): DeliSupabase {
  return client ?? (createClient() as DeliSupabase)
}

/** Tolerant of a missing or malformed row — the home page must always render. */
export function parseHomeCtaConfig(raw: string | null | undefined): HomeCtaConfig {
  if (!raw) return DEFAULT_HOME_CTA
  try {
    const parsed = JSON.parse(raw) as Partial<HomeCtaConfig>
    return {
      autoEventButtons: parsed.autoEventButtons ?? DEFAULT_HOME_CTA.autoEventButtons,
      joinHeading: parsed.joinHeading || DEFAULT_HOME_CTA.joinHeading,
      joinBody: parsed.joinBody || DEFAULT_HOME_CTA.joinBody,
      buttons: Array.isArray(parsed.buttons) ? parsed.buttons : [],
    }
  } catch {
    return DEFAULT_HOME_CTA
  }
}

export async function fetchHomeCtaConfig(client?: DeliSupabase): Promise<HomeCtaConfig> {
  const { data } = await db(client)
    .from('system_settings')
    .select('value')
    .eq('key', HOME_CTA_KEY)
    .maybeSingle()
  return parseHomeCtaConfig((data as { value?: string } | null)?.value)
}

/** A button ready to render: either configured, or derived from an open event. */
export interface ResolvedCta {
  key: string
  label: string
  href: string
  variant: HomeCtaVariant
}

export function resolveHomeCtas(
  config: HomeCtaConfig,
  events: EventRow[],
  placement: Exclude<HomeCtaPlacement, 'both'>
): ResolvedCta[] {
  const ctas: ResolvedCta[] = []

  if (config.autoEventButtons) {
    for (const event of events.filter(isAcceptingApplications)) {
      ctas.push({
        key: `event:${event.id}`,
        label: `Apply — ${event.name}`,
        href: `/events/${event.slug}`,
        variant: 'primary',
      })
    }
  }

  for (const button of config.buttons) {
    if (!button.enabled) continue
    if (button.placement !== 'both' && button.placement !== placement) continue
    if (!button.label.trim() || !button.href.trim()) continue
    ctas.push({
      key: button.id,
      label: button.label,
      href: button.href,
      variant: button.variant,
    })
  }

  return ctas
}

export function newHomeCtaButton(): HomeCtaButton {
  return {
    id: `cta-${Date.now().toString(36)}`,
    label: '',
    href: '',
    placement: 'both',
    variant: 'secondary',
    enabled: true,
  }
}
