# NYC Deli Rats — Phase-Based Operations Platform

**Planning document. No implementation yet.**
Converts the current "collection of tools" into a **year-round operational command center**
that guides camp leadership through the entire annual lifecycle of running the camp.

---

## 0. TL;DR

The app already contains ~90% of the *tools* needed. What it lacks is a **temporal spine** —
a shared notion of "where are we in the year, and therefore what matters right now."

The migration is mostly **re-framing and surfacing**, not rebuilding:

1. Add a lightweight **Phase Engine** (dates + current-phase resolver, built on the existing `system_settings` table).
2. Add a **Milestone / task-tracking layer** (deadlines, owners, status) that spans phases.
3. Replace the flat home grid + admin tab-set with a **phase-aware Operations Dashboard**.
4. Tag every existing tool with the phase(s) it belongs to and surface it contextually.
5. Model a handful of systems (roster, budget, inventory, comms, layout) as **persistent workflows** that change their "face" per phase.

Only a small number of genuinely new workflows are needed (budget/procurement, BMORG paperwork tracker, mobilization/logistics, breakdown board, wrap-up/knowledge capture).

> **Non-negotiable constraint:** none of this may change the average camper's experience.
> All of the operations/phase machinery is **additive and leadership-scoped**. A standard
> `user` continues to see the same small, streamlined set of things that matter to them.
> See **§0.5 The Camper Experience Firewall**.

---

## 0.5 The Camper Experience Firewall

**Principle:** the phase/operations system is built *around* the camper experience, never *through* it.
A standard camper (`user` role) must experience **no regression, no added complexity, and no new
concepts** as a result of this work. If a change would alter the camper's day-to-day, it belongs
behind a role gate.

### 0.5.1 The camper's canonical surface (frozen)
These are the only things a standard camper needs, and they stay exactly as streamlined as today:

| Camper need | Route (unchanged) | Notes |
|---|---|---|
| Their profile & info | [src/app/profile/page.tsx](src/app/profile/page.tsx) | bio, photos, camper details |
| Their packing list | [src/app/profile/page.tsx](src/app/profile/page.tsx) (Packing tab) | personal checklist |
| Their schedule | [src/app/profile/page.tsx](src/app/profile/page.tsx) (My Schedule) + [src/app/schedule/page.tsx](src/app/schedule/page.tsx) | personal shifts |
| The directory | [src/app/campers/page.tsx](src/app/campers/page.tsx) | find campmates |
| The camp map | [src/app/map/page.tsx](src/app/map/page.tsx), [src/app/layout-view/page.tsx](src/app/layout-view/page.tsx) | where things/people are |
| Kitchen & shifts | [src/app/kitchen/page.tsx](src/app/kitchen/page.tsx) | sign up, roles, coverage |
| Camp info & resources | [src/app/resources/page.tsx](src/app/resources/page.tsx) | BM 101, amenities, how camp works |
| Submit ideas/questions | [src/app/ideas/page.tsx](src/app/ideas/page.tsx) | voice to leadership |

**Camper navigation stays as-is:** Home · Campers · Profile · Camp Map · Kitchen · Resources.
No "Phases" menu, no milestones, no budget, no dashboard command-center. The camper never sees the word "phase."

### 0.5.2 How the firewall is enforced technically
- **Role gate at the routing/nav layer.** All new operations surfaces (`/phase/*`, `/roster`, `/inventory`, `/budget`, `/logistics`, breakdown board, milestones, command-center dashboard) render **only** for `builder`/`admin` (or a future `lead` role). For `user` they don't appear in nav and redirect if hit directly. The nav already branches by role in [src/components/layout/navigation.tsx](src/components/layout/navigation.tsx) — we extend that pattern, we don't replace it.
- **Two distinct home pages, not one shared dashboard.** `/` resolves by role:
  - `user` → **today's streamlined camper home** (essentially the current module grid in [src/app/page.tsx](src/app/page.tsx), optionally trimmed to the 8 items above).
  - `builder`/`admin` → the phase-aware Operations Dashboard.
  This avoids "progressive disclosure inside one page," which risks leaking complexity to campers.
- **Phase awareness for campers is invisible & benign.** At most, phase context is used to *gently reprioritize what's already theirs* — e.g. surface "packing list" more prominently as the burn approaches, or show the countdown. It never adds tools, tasks they must manage, or leadership concepts.
- **Persistent workflows expose only their camper-facing face to campers.** The roster workflow, to a camper, is still just "the directory." The layout workflow is still "the camp map (view only)." The kitchen workflow is still "sign up for shifts." The leadership faces are role-gated.
- **No new required actions for campers.** Milestones, deadlines, and status tracking are a leadership construct. A camper only ever has their existing personal to-dos (complete profile, pick shifts, check packing).

### 0.5.3 Acceptance test for every wave
Before any wave ships, verify with a `user`-role account:
1. Nav shows only the camper items — no phase/ops entries.
2. `/` shows the streamlined camper home, not the command center.
3. Profile, packing, schedule, directory, map, kitchen, resources all behave exactly as before.
4. Directly visiting a leadership route (e.g. `/budget`) redirects, not 500s.
5. No new terminology ("phase", "milestone", "workflow") appears anywhere the camper can see.

If all five pass, the wave has preserved the camper experience.

---

## 0.6 Scope & Rollout Target (DECIDED)

**Target season: 2027. Go-live: immediately after the 2026 camp breaks down (~September 2026).**

The operations platform is **not** retrofitted onto the in-progress 2026 season. Instead:

- **2026 = archived "seed" season.** All current live data (campers, this year's kitchen schedule,
  build schedule, layout) is backfilled as a **read-only 2026 season**. Its schedules become the
  first entries in Resources → "Past Years" ([§4.1](#41-season-archive--resources-view-only-history)).
  This means the **Season Archive feature is the very first thing exercised in production.**
- **2027 = first fully system-managed season.** The app drives 2027 end-to-end, beginning with
  every returning camper **re-applying** (profiles intact from 2026) plus brand-new applicants.

### 0.6.1 First real user journeys, in chronological order
This ordering *is* the build priority — build what gets used first, first:

1. **Wrap-Up 2026** (Sept 2026): archive 2026 kitchen + build schedules → Resources; capture retro; wind down comms. *(Exercises Season Archive + light Wrap-Up.)*
2. **Pre-Build 2027** (fall 2026 → summer 2027): open the 2027 season; returning campers re-apply, new applicants apply; interviews; payments; confirmations → the **Roster** builds. *(Exercises the entire Roster lifecycle — the centerpiece.)*
3. **Reconciliation** drives 2027 shifts / tents / layout / budget off the confirmed roster.
4. **Build Week 2027**, then **Festival 2027** (the first real "demolition" lockout), then **Breakdown 2027**.

### 0.6.2 Consequences for scope & sequencing
- **Build first (needed by ~Sept 2026):** Phase Engine + Milestones (spine), the **Roster lifecycle**
  ([DESIGN-Roster-Lifecycle.md](DESIGN-Roster-Lifecycle.md)), **Season Archive** ([§4.1](#41-season-archive--resources-view-only-history)),
  and a **light Wrap-Up**. These are the only things exercised in the first weeks.
- **Ample runway for the rest:** Festival lockout isn't needed until **August 2027**, and
  Breakdown tooling not until after — ~11 months of runway. Build/Festival/Breakdown workflows
  are lower-risk, later waves.
- **The 2026→2027 rollover is the flagship demo** of the persistent-identity model: logins/photos/bios
  survive, memberships reset, everyone re-applies. It must work cleanly on day one.

**Still-open scope questions** (payments/email/WhatsApp depth, historical-CSV import) are tracked in
[§9 Open Questions](#9-open-questions-for-the-owner).

---

## 0.7 Platform Posture (DECIDED)

### 0.7.1 Offline / on-playa — **OUT of scope (for now)**
The app is **online-only.** No PWA/offline caching, no local-first sync. Build Week and Breakdown
rely on connectivity; where none exists, the existing **print views** (staking plan, tent map) are the
fallback. Revisit only if on-playa use proves essential. *This removes a major architectural fork
from the 2027 build.*

### 0.7.2 Multi-camp (multi-tenancy) — **OUT of scope**
Build **single-camp only** for NYC Deli Rats. No `camps` table, no `camp_id` columns, no tenant
isolation work, no self-serve camp registration. Tables and RLS stay single-tenant (implicitly the
one camp), exactly as today.

Multi-tenancy (a camp lead registering their own provisioned instance) remains a *possible future
direction* but is explicitly deferred with no partial groundwork now — a deliberate choice to keep
the 2027 build lean. If ever pursued it is a dedicated major project (row-level tenancy across ~30
tables + full RLS isolation audit + per-camp provisioning/seeding + routing); the analysis is
preserved in git history if needed.

**Explicitly out:** SaaS billing/subscriptions, cross-camp data sharing, camp-slug/subdomain routing.

---

## 1. Current System Inventory

Grouped by capability, with the primary files. (Full detail lives in `/memories/repo/nycDeli-architecture.md`.)

### 1.1 People / Roster
| Capability | Route(s) | Key lib | Tables |
|---|---|---|---|
| 9-step application/intake | [src/app/intake/page.tsx](src/app/intake/page.tsx), [src/app/register/page.tsx](src/app/register/page.tsx) | [src/lib/validations.ts](src/lib/validations.ts) | `campers`, `user_profiles` |
| Pending holding page | [src/app/pending/page.tsx](src/app/pending/page.tsx) | — | `user_profiles` |
| Applicant review + AI summary + archive | [src/app/admin/applicants/page.tsx](src/app/admin/applicants/page.tsx), [src/app/api/ai/applicant-summary/route.ts](src/app/api/ai/applicant-summary/route.ts) | [src/lib/auth.ts](src/lib/auth.ts) | `user_profiles`, `archived_applicants` |
| Camper directory + photos | [src/app/campers/page.tsx](src/app/campers/page.tsx) | [src/lib/tent-mates.ts](src/lib/tent-mates.ts) | `campers`, `camper_photos` |
| Self-service profile (bio, details, packing, my schedule) | [src/app/profile/page.tsx](src/app/profile/page.tsx) | [src/lib/tent-mates.ts](src/lib/tent-mates.ts) | `campers`, `camper_photos`, `packing_list_items` |
| Admin user/role management | [src/app/admin/page.tsx](src/app/admin/page.tsx) (Campers & Users tab) | — | `user_profiles`, `campers` |

### 1.2 Kitchen
| Capability | Route(s) | Key lib | Tables |
|---|---|---|---|
| Roles, sign-up/auto-draft, published schedule | [src/app/kitchen/page.tsx](src/app/kitchen/page.tsx) | [src/lib/shift-draft.ts](src/lib/shift-draft.ts) | `kitchen_roles`, `kitchen_shifts`, `schedule_assignments`, `shift_draft_*` |
| Admin draft mgmt + offerings editor | [src/app/admin/shift-draft/page.tsx](src/app/admin/shift-draft/page.tsx) | [src/lib/shift-draft.ts](src/lib/shift-draft.ts) | `shift_draft_*` |
| Personal + team schedule | [src/app/schedule/page.tsx](src/app/schedule/page.tsx) | — | `kitchen_shifts`, `schedule_assignments` |

### 1.3 Camp Design / Layout
| Capability | Route(s) | Key lib | Tables |
|---|---|---|---|
| Interactive 2D layout builder | [src/app/map/page.tsx](src/app/map/page.tsx), [src/app/admin/layout-builder/page.tsx](src/app/admin/layout-builder/page.tsx), [src/components/camp-map.tsx](src/components/camp-map.tsx) | [src/lib/floorplan.ts](src/lib/floorplan.ts) | `floorplan_configs`, `floorplan_objects`, `floorplan_utility_lines` |
| 3D render + AI 3D models + frontage | [src/components/camp-map-3d.tsx](src/components/camp-map-3d.tsx), [src/app/api/generate-3d-model/route.ts](src/app/api/generate-3d-model/route.ts) | [src/lib/meshy.ts](src/lib/meshy.ts) | `floorplan_objects.properties` |
| Read-only layout view | [src/app/layout-view/page.tsx](src/app/layout-view/page.tsx) | [src/lib/floorplan.ts](src/lib/floorplan.ts) | same |
| Print staking plan | [src/app/admin/staking-plan/page.tsx](src/app/admin/staking-plan/page.tsx) | [src/lib/floorplan.ts](src/lib/floorplan.ts) | same |
| Print tent/occupant map | [src/app/admin/tent-map/page.tsx](src/app/admin/tent-map/page.tsx) | [src/lib/floorplan.ts](src/lib/floorplan.ts) | same + `campers` |
| Camp spot selection | [src/app/camp-selection/page.tsx](src/app/camp-selection/page.tsx), [src/app/api/ai/spot-recommendation/route.ts](src/app/api/ai/spot-recommendation/route.ts) | — | `camp_spots`, `camp_reservations` |

### 1.4 Build Week / Infrastructure
| Capability | Route(s) | Key lib | Tables |
|---|---|---|---|
| Build-week hub (roster, agendas, schedule, inventory, electrical, shade) | [src/app/build-week/page.tsx](src/app/build-week/page.tsx) | [src/lib/build-week.ts](src/lib/build-week.ts) | `build_stages/goals/procedures`, `build_tasks` |
| Inventory checklist + verification | [src/app/build-week/inventory/[id]/page.tsx](src/app/build-week/inventory/[id]/page.tsx) | [src/lib/build-week.ts](src/lib/build-week.ts) | `build_inventory`, `build_resources` |
| Electrical load calculator | [src/app/build-week/electrical-load-tab.tsx](src/app/build-week/electrical-load-tab.tsx) | [src/lib/build-week.ts](src/lib/build-week.ts) | `electrical_load_config/distro_boxes/load_items` |
| Shade skeleton (2D/3D) + calc | [src/app/build-week/shade-schema-tab.tsx](src/app/build-week/shade-schema-tab.tsx) | [src/lib/shade-posts.ts](src/lib/shade-posts.ts) | `floorplan_objects` |
| Day-by-day build schedule | [src/app/build-week/page.tsx](src/app/build-week/page.tsx) (schedule tab) | [src/lib/build-week.ts](src/lib/build-week.ts) | `build_schedule_items` |
| Layout↔inventory↔electrical↔schedule sync | — | [src/lib/layout-sync.ts](src/lib/layout-sync.ts) | linking columns via migration 038 |

### 1.5 Knowledge / Communication
| Capability | Route(s) | Key lib | Tables |
|---|---|---|---|
| Resources / BM 101 knowledge base | [src/app/resources/page.tsx](src/app/resources/page.tsx) | — | `resource_edits` |
| Ideas & questions forum (+AI enhance) | [src/app/ideas/page.tsx](src/app/ideas/page.tsx), [src/app/admin/ideas/page.tsx](src/app/admin/ideas/page.tsx), [src/app/api/ai/enhance-idea/route.ts](src/app/api/ai/enhance-idea/route.ts) | [src/lib/openai.ts](src/lib/openai.ts) | `deli_ideas` |
| BMORG public API proxy | [src/app/api/burningman/route.ts](src/app/api/burningman/route.ts) | [src/lib/burningman.ts](src/lib/burningman.ts) | — |

### 1.6 Platform
- **Roles:** `pending` → `user` / `builder` / `admin` ([src/lib/auth.ts](src/lib/auth.ts))
- **Settings:** event timeline (`burn_start_date`, `burn_end_date`, `build_week_start`), registration (`registration_deadline`, `intake_open`), camp geometry, camp-selection toggles ([src/lib/settings.ts](src/lib/settings.ts))
- **Countdown timer** to `burn_start_date` ([src/components/countdown-timer.tsx](src/components/countdown-timer.tsx))
- **AI:** OpenAI + Meshy, rate-limited ([src/lib/openai.ts](src/lib/openai.ts), [src/lib/meshy.ts](src/lib/meshy.ts))

---

## 2. Feature → Phase Mapping

Legend: ● primary/active · ○ reference-only · �+ new workflow needed

| System | Pre-Build | Build Week | Festival | Breakdown | Wrap-Up | Nature |
|---|:--:|:--:|:--:|:--:|:--:|---|
| Roster / applications | ● | ● | ○ | ○ | ● | **persistent** |
| Applicant review | ● | ○ | | | | phase |
| Camper directory | ● | ● | ○ | ○ | ○ | persistent |
| Profile / packing | ● | ● | ○ | ○ | | persistent |
| BMORG paperwork/placement | ●▸+ | ○ | ○ | | ○ | persistent |
| Initial camp planning (infra) | ● | → final layout | | | | phase→feeds BW |
| Budget & procurement | ●▸+ | ● | | | ● | **persistent (new)** |
| Inventory (inspect/repair) | ●▸+ | ● | ○ | ● | ● | **persistent** |
| Kitchen planning | ● | ● | ○ | | ○ | persistent |
| Camp meetings/comms cadence | ●▸+ | ● | ○ | ● | ● | **persistent (new)** |
| Builder management | ● | ● | | ○ | | phase |
| Final camp layout | → from initial | ● | ○ | ○(reverse) | | persistent |
| Build strategy / sequence | ▸+ | ● | | | | phase |
| Daily build schedule | ● | ● | | | | phase |
| Builder training / docs | ●▸+ | ● | ○ | | | phase |
| Mobilization & arrival | ▸+ | ● | | | | **phase (new)** |
| On-playa reference (maps/dir/kitchen) | | | ● | ○ | | phase |
| Breakdown board | | | | ●▸+ | | **phase (new)** |
| Comms wind-down | | | | ● | ● | wrap |
| Camp feedback | | | | ○ | ●▸+ | wrap (new, optional) |
| Knowledge capture (retro) | ○ | | | | ●▸+ | **wrap (new)** |
| Administrative closeout | | | | ○ | ●▸+ | wrap (new) |

---

## 3. Persistent-Workflow Model

Some systems must not live inside a single phase. They keep the same underlying data but present
**different actions and priorities** depending on the current phase. Proposed "faces":

| Workflow | Pre-Build face | Build Week face | Festival face | Breakdown face | Wrap-Up face |
|---|---|---|---|---|---|
| **Roster** | Outreach, applications, waitlist, replacements | Lock final list, builder subset | Directory (read) | Who's still on playa | Retention list for next year |
| **Inventory** | Inspect / clean / repair / replace planning | Install checklist + verify working | Reference | Pack-out / container load checklist | Post-burn condition update |
| **Layout** | Concept + major infra | Definitive build plan + staking | On-playa reference map | Reverse map (what comes down) | Archive as next-year starting point |
| **Kitchen** | Permits, meal plan, staffing model | Kitchen build tasks | Live schedule/assignments | — | Lessons learned |
| **Budget** | Plan, quotes, POs | Actuals vs. plan | — | — | Reconcile / closeout |
| **Comms** | Cadence + meeting calendar | Builder briefings | Info reference | Real-time coordination | Archive channels |

> **Detailed deep-dive:** the Roster workflow (annual application lifecycle, payments, festival
> lockout, re-application, and roster→shifts→tents→layout reconciliation) is fully specified in
> [DESIGN-Roster-Lifecycle.md](DESIGN-Roster-Lifecycle.md). It is the first "build each section in
> detail" deep-dive and the template for the others.

**Design rule:** persistent workflows get one canonical route (e.g. `/roster`, `/inventory`, `/layout`)
plus a `phase` param or context that swaps the default view/CTA. The dashboard links into the
*current-phase face*.

---

## 4. Gap Analysis — Missing Workflows

Ordered by leverage. Each notes whether it's net-new or an extension.

1. **Phase Engine** *(net-new, foundational)* — resolve current phase from dated settings; expose to every page. Everything else depends on this.
2. **Milestone / deadline tracker** *(net-new, foundational)* — dated milestones with owner + status, tagged to a phase and optionally a workflow. Powers "approaching / overdue / done." Generalizes the existing `build_tasks` and BMORG deadlines.
3. **Budget & procurement** *(net-new)* — line items, category, estimated vs. actual, vendor, PO status, needed-by date. No current table.
4. **BMORG paperwork tracker** *(extension of BMORG proxy)* — theme-camp app, placement request, fees, submission deadlines as tracked milestones with status + document links. Today only the *read* API exists.
5. **Mobilization & arrival / logistics** *(net-new)* — travel legs, Reno/storage runs, vehicle transfers, staging, arrival times. Distinct from build tasks.
6. **Breakdown board** *(net-new; can reuse task/shift primitives)* — dynamic real-time assignment of whoever remains to teardown tasks; must be flexible, not pre-scheduled.
7. **Knowledge capture / retro** *(extension of resources + ideas)* — end-of-year "what worked / failed / improve" that seeds next season. Could be a special `resource_edits` category + structured retro form.
8. **Camp feedback** *(extension of ideas forum; optional)* — post-burn survey reusing `deli_ideas` schema or a light form.
9. **Meeting/comms cadence** *(net-new, light)* — recurring meeting calendar + agenda notes (agendas partially exist in build-week; generalize).
10. **Build strategy / sequencing** *(extension of build schedule)* — task dependencies & install order; today the schedule is flat day/category. `layout-sync` already generates install tasks; add ordering + dependency fields.
11. **Season Archive → Resources** *(extension of resources)* — when a season closes, snapshot that year's **published kitchen schedule** and **build schedule** as immutable, view-only artifacts (e.g. "2026 Kitchen Schedule" with names & shifts) and file them in the Resources section for historical reference. Image snapshots are sufficient — no editability. See **§4.1**.

**Data model additions (minimal):**
```
phases            (config-driven; may just be derived from settings + a JSON phase table)
milestones        (id, phase, workflow, title, due_date, owner_id, status, source, ref_id, ...)
budget_items      (id, category, description, vendor, est_cost, actual_cost, needed_by, po_status, ...)
bmorg_submissions (id, type, title, due_date, status, submitted_at, doc_link, notes)
logistics_legs    (id, kind, origin, destination, depart_at, arrive_at, vehicle, owner_id, status)
breakdown_tasks   (id, area, title, status, claimed_by, priority, needs_people)   // or reuse build_tasks with a phase flag
retro_notes       (id, category:worked|failed|improve, body, author, year)
season_archives   (id, season_id, kind:kitchen_schedule|build_schedule|layout|roster, title, image_path, data_snapshot jsonb, created_at, created_by)
```
Milestones is the keystone — several rows above can start as *views over `milestones`* rather than new tables, keeping the footprint small.

### 4.1 Season Archive → Resources (view-only history)

When a season closes (rollover / festival close, [DESIGN-Roster-Lifecycle.md §5](DESIGN-Roster-Lifecycle.md)),
admins can **snapshot** that year's finished schedules so future years can see *who did what*.

- **What gets archived:** the **published kitchen schedule** (days, shifts, roles, **camper names**)
  and the **build schedule** (day-by-day tasks/assignments). Layout and final roster are optional
  bonus snapshots (`season_archives.kind`).
- **Form:** a rendered **image** (PNG) of the schedule as it looked — exactly what the ask calls for.
  *"It can be just an image of it, no editability."* Optionally also store the raw rows in
  `data_snapshot` (jsonb) so a future year could re-render or diff, but the primary artifact is the image.
- **Immutability:** archives are **read-only**. They are snapshots, decoupled from live
  `kitchen_shifts` / `schedule_assignments` / `build_schedule_items`, so editing this year never
  alters last year's record. Deleting/reassigning a camper later does not corrupt history.
- **Where it lives:** filed under a new **"Past Years" / Archive** category in the Resources section
  ([src/app/resources/page.tsx](src/app/resources/page.tsx)), labeled by year — e.g. *"2026 Kitchen
  Schedule"*, *"2026 Build Schedule"*. Reuses the existing resource-listing UI; each entry links to
  the stored image.
- **How it's captured:** an admin action ("Archive this season's schedules") renders the current
  published schedule views to an image (server-side render or client `html2canvas`), uploads to a
  Supabase storage bucket, writes a `season_archives` row, and registers a `resource_edits`-style
  entry so it appears in Resources. Can also auto-fire as part of season rollover.
- **Firewall:** archives are **public-read within the app** (any logged-in camper can view past
  schedules as reference) but **only admins can create** them. Additive to the camper Resources
  experience — a new read-only category, nothing removed.

---

## 5. Information Architecture

### 5.1 Conceptual model
```
Season (year)
 └─ Phase (Pre-Build → Build → Festival → Breakdown → Wrap-Up)   ← Phase Engine
     ├─ Persistent Workflows (roster, inventory, layout, kitchen, budget, comms) — cross-phase, phase-aware face
     ├─ Phase Workflows (applicant review, mobilization, breakdown board, retro) — active only in-phase
     └─ Milestones (dated, owned, status) — roll up into "now / soon / overdue / done"
```

### 5.2 Phase Engine (foundational)
- Source of truth: `system_settings` already holds `build_week_start`, `burn_start_date`, `burn_end_date`. Add `breakdown_start`, `season_close_date` (and optionally `prebuild_start`).
- New `src/lib/phase.ts`: `getCurrentPhase(now)`, `getPhaseWindows(settings)`, `getPhaseProgress()`, `daysUntil(nextPhase)`. Pure function, unit-testable.
- Provide via a server util + a small `PhaseProvider` context for client components.
- Admin can **manually override** current phase (a `phase_override` setting) for edge cases (early strike, weather).

### 5.3 Route architecture
Keep existing routes working; add a thin operational layer on top.
```
/                     → Operations Dashboard (phase-aware; replaces flat module grid)
/phase/pre-build      → phase overview: milestones, active workflows, tools
/phase/build-week     → (build-week hub reframed)
/phase/festival       → reference hub (maps, directory, kitchen, contacts)
/phase/breakdown      → breakdown board + reverse layout
/phase/wrap-up        → retro, closeout, comms archive
Persistent workflows (canonical, phase-aware):
/roster  /inventory  /layout  /kitchen  /budget  /comms  /logistics
Existing tool routes remain as deep destinations, linked from phase/workflow pages.
```
This is additive — no existing route needs deletion in early waves.

---

## 6. Navigation & Dashboard Redesign

### 6.1 Operations Dashboard (leadership home only)
This dashboard is served at `/` **only for `builder`/`admin`**. Campers keep the streamlined camper home (see §0.5) — the module grid in [src/app/page.tsx](src/app/page.tsx) is *not* replaced for them. Sections:

1. **Phase banner** — "You are in: **Pre-Build Week** · Build Week starts in 96 days" (reuses countdown logic). Progress bar across the 5 phases.
2. **Now** — what should be happening this phase (curated per-phase task list from `milestones`).
3. **Overdue** — red list of past-due milestones.
4. **Approaching** — next 2–4 weeks of deadlines.
5. **Workflow status cards** — roster (X approved / Y waitlist), inventory (% inspected), budget (spent / planned), kitchen (% shifts filled), layout (draft/locked). Each links to that workflow's current-phase face.
6. **Phase toolbelt** — only the tools relevant now, surfaced as quick links (e.g. Pre-Build shows Applicants, Budget, Inventory-inspection, BMORG; Festival shows Maps, Directory, Kitchen schedule).

**Not a shared dashboard.** `/` branches by role into two *separate* pages — the camper home vs. the command center — rather than one page that hides sections. This keeps the firewall (§0.5) simple to reason about and test.

### 6.2 Navigation ([src/components/layout/navigation.tsx](src/components/layout/navigation.tsx))
Current nav is a flat list (Home, Campers, Profile, Map, Kitchen, Resources, +Build Week, +Admin). Proposed:

- **Camper nav is frozen** (`user` role): Home · Campers · Profile · Camp Map · Kitchen · Resources. No phase/ops entries ever. This is the firewall in the nav layer (§0.5.2).
- **Leadership nav becomes phase-anchored** (`builder`/`admin` only): `Dashboard` · `Current Phase` · `Roster` · `Kitchen` · `Layout` · `Resources` + a **"Phases" menu** for look-ahead/back (+`Admin`).
- `builder` gains Build-Week + Logistics; `admin` gains everything + Phases menu + phase override.
- Highlight the **active phase** in the nav (color/badge) **for leadership only**, driven by the Phase Engine.

### 6.3 Two experiences, cleanly separated (not "progressive disclosure in one UI")
We deliberately avoid one shared UI that hides/reveals sections by role — that risks leaking
complexity to campers. Instead there are **two distinct experiences** behind the same auth:
- `user` → **the camper experience** (§0.5): eight streamlined items, unchanged. No phases, no milestones, no dashboard.
- `builder`/`admin` → **the operations experience**: phase-anchored command center + planning tools.

Complexity only *grows within the leadership tier* (`builder` < `admin`). The camper tier never grows.

---

## 7. Reuse Opportunities (avoid rebuilds)

| Need | Reuse instead of build |
|---|---|
| Milestone status UI | Extend `build_tasks` status pattern + build-week progress components |
| "Approaching / countdown" | Generalize [src/components/countdown-timer.tsx](src/components/countdown-timer.tsx) into a per-milestone countdown |
| Breakdown assignment board | Reuse shift-draft / `schedule_assignments` primitives ([src/lib/shift-draft.ts](src/lib/shift-draft.ts)) in an ad-hoc "claim a task" mode |
| BMORG paperwork | Layer status tracking on existing [src/lib/burningman.ts](src/lib/burningman.ts) + proxy |
| Retro / feedback | Reuse `deli_ideas` schema (post_type, category, admin_response) + `resource_edits` categories |
| Reverse layout (breakdown) | Reuse [src/lib/floorplan.ts](src/lib/floorplan.ts) + staking/tent-map print views with a "teardown" ordering |
| Install-task generation | Already exists via [src/lib/layout-sync.ts](src/lib/layout-sync.ts); extend with sequencing/dependencies |
| Meeting agendas | Generalize the existing build-week "agendas" tab |
| Phase dates | Already partly in `system_settings`; just add the few missing dates |
| Roster-as-workflow | No new tables — add derived views/filters over `campers`/`user_profiles` per phase |
| Season schedule archive (§4.1) | Reuse Resources listing UI + `resource_edits` + a storage bucket; render existing published kitchen/build schedule views to an image |

---

## 8. Phased Migration Plan

Designed to ship value early, minimize rewrites, and never break existing tools.

### Wave 0 — Foundation (spine)
- Add missing phase dates to `system_settings`; add `phase_override`.
- Build `src/lib/phase.ts` (+ unit tests) and `PhaseProvider`.
- Create `milestones` table + CRUD lib + admin editor.
- **Ship:** a phase banner on the current home page. Nothing removed.

### Wave 1 — Operations Dashboard
- Replace `/` (logged-in) with the phase-aware dashboard (Now / Overdue / Approaching / workflow cards / phase toolbelt).
- Wire workflow status cards to existing data (roster counts, inventory %, kitchen fill).
- Role-scoped simplified vs. command-center views.
- **Ship:** leadership can log in and immediately see "where we are / what's next."

### Wave 2 — Persistent workflow faces
- Introduce canonical `/roster`, `/inventory`, `/layout`, `/kitchen` wrappers that render the correct phase face over existing pages.
- Add nav restructure (phase-anchored + Phases menu, role-gated).
- **Ship:** tools now feel phase-contextual; deep tool routes still work.

### Wave 3 — Fill Pre-Build gaps (biggest planning phase)
- **Budget & procurement** module.
- **BMORG paperwork tracker** (milestones + doc links over the existing API).
- **Inventory inspection** face (inspect/clean/repair/replace states) — extend `build_inventory`.
- **Meeting/comms cadence** (generalize agendas).
- **Ship:** Pre-Build becomes a fully guided phase.

### Wave 4 — Build Week depth
- **Mobilization & logistics** module (`logistics_legs`).
- **Build strategy/sequencing** — add ordering/dependencies to build schedule + `layout-sync`.
- **Builder training/docs readiness** checklist (per-builder pre-departure gate).
- **Ship:** Build Week runs from mobilization → daily schedule → verified install.

### Wave 5 — Festival, Breakdown, Wrap-Up
- Festival: reference hub page (read-only aggregation of maps/dir/kitchen/contacts).
- Breakdown board (ad-hoc claimable tasks, reverse layout).
- Wrap-Up: retro/knowledge capture, optional feedback survey, admin closeout checklist, comms archive.
- **Season Archive → Resources** (§4.1): snapshot the published **kitchen schedule** and **build
  schedule** (with names) to view-only images filed under Resources → "Past Years."
- **Ship:** full annual loop closed; end-of-year state seeds next season.

### Wave 6 — Polish & carry-over
- Season rollover (archive year → auto-snapshot schedules to Resources per §4.1, clone reusable config/layout/inventory into new season).
- Cross-phase reporting (milestone completion trends, budget actuals).
- Tighten role-based progressive disclosure.

**Sequencing rationale:** Waves 0–2 are pure augmentation (zero deletions, immediate "command center" feel). Waves 3–5 add the genuinely missing workflows in lifecycle order. Wave 6 makes it repeatable year-over-year.

**Firewall gate on every wave:** no wave is "done" until the §0.5.3 camper acceptance test passes on a `user`-role account. Even Wave 1 (which introduces the leadership dashboard at `/`) must ship the role-branch so campers still land on the streamlined camper home.

---

## 9. Open Questions for the Owner

**Resolved:** target season **2027**, go-live after 2026 breakdown (§0.6) · offline **out** (§0.7.1) ·
multi-camp **tenant-ready now, full multi-tenant deferred post-2027** (§0.7.2).

1. Should phase transitions be **automatic by date**, **manual**, or **date-with-manual-override**? (Recommended: the last.)
2. Who owns milestones — admins only, or department leads (would suggest a `lead` role or per-workflow ownership)?
3. Budget: single camp budget, or per-department sub-budgets?
4. Do you want campers to see the phase framing at all, or keep it leadership-only initially?
5. Payments: manual ledger only first, or wire Stripe from the start? (Recommended: manual first.)
6. Email transport/provider for notifications — which, and is a key already in `.env.local`? (In-app works without it.)
7. WhatsApp: integrate/send, link-only, or out? (Recommended: link-only.)
8. Import the 2025 `public/Files*` CSVs as a read-only archived season, or start clean at the 2026 seed season?
9. BMORG-limited assets — track **ticket status / EA passes / VP allocation** on membership (they change every reconciliation number), or defer?

Roster-specific open questions live in [DESIGN-Roster-Lifecycle.md §10](DESIGN-Roster-Lifecycle.md).

---

## 10. Guiding Principles
- **The camper experience is sacred (§0.5).** The ops system is built *around* it, never *through* it. A standard camper sees no new complexity, terminology, or required actions — ever. This overrides every other principle.
- **Additive first.** Every early wave layers on top; nothing existing is deleted until its replacement is proven.
- **Milestones are the keystone.** Most "new" features begin as views over one milestones table.
- **Reuse the primitives** (tasks, shift-draft, floorplan, countdown, settings) rather than inventing parallel systems.
- **Phase-aware, not phase-locked.** Persistent workflows change their face; they don't fragment their data.
- **Two tiers, not one blended UI.** Camper experience and leadership operations are separate surfaces behind the same auth; complexity grows only inside the leadership tier.
