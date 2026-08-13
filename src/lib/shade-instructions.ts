/**
 * Shade structure erection instructions.
 *
 * Single source of truth for both the on-screen Shade Guide section and the
 * downloadable PDF sheets. Numbers are derived from the 30x50 build skeleton
 * (Build Week > Shade Schema) and the camp Shade Guide.
 */

import type { PdfBlock, PdfSheet } from './pdf'

export type InstructionBlock = PdfBlock

export interface InstructionSheet extends PdfSheet {
  slug: string
  summary: string
}

export const SHADE_INSTRUCTION_SHEETS: InstructionSheet[] = [
  {
    slug: 'overview',
    code: 'SHEET 00',
    title: 'Overview & Spec Sheet',
    subtitle: 'What we are building, out of what, to what tolerance.',
    summary: 'The numbers: bay size, pole grid, hardware, wind rating, parts count.',
    blocks: [
      {
        type: 'p',
        text: 'Eight shade bays, each 50 ft x 30 ft, tiled into a 3 x 3 grid with one bay left open. Overall footprint is roughly 150 ft x 90 ft. Adjacent bays SHARE a wall - that wall gets built once, not twice.',
      },
      { type: 'h', text: 'Specification' },
      { type: 'kv', label: 'Bay size', value: '50 ft x 30 ft (8 bays)' },
      { type: 'kv', label: 'Overall footprint', value: 'approx. 150 ft x 90 ft' },
      { type: 'kv', label: 'Pole height', value: '10 ft' },
      { type: 'kv', label: 'Grid spacing', value: '10 ft - one post every 10 ft along every wall' },
      { type: 'kv', label: 'Frame', value: '1 in x 10 ft galvanized EMT conduit' },
      {
        type: 'kv',
        label: 'Joints',
        value: 'Maker Pipe 1 in connectors: 2-way (wall end), 3-way (corner / inline), 4-way (wall junction), 5-way (interior cross)',
      },
      { type: 'kv', label: 'Pole base', value: 'Maker Pipe flange, one per vertical' },
      { type: 'kv', label: 'Bracing', value: '1 in x 15 ft ratchet tie-down, 500 lb WLL' },
      { type: 'kv', label: 'Ground anchor', value: '1/2 in x 18 in hex lag bolt + fender washer or climbing hanger' },
      { type: 'kv', label: 'Anchor offset', value: '7 ft out from the pole base (approx. 55 deg from ground)' },
      { type: 'kv', label: 'Design wind', value: 'approx. 90 mph' },
      { type: 'space' },
      { type: 'h', text: 'Parts count (whole camp)' },
      {
        type: 'p',
        text: 'Derived from the current layout. Confirm against the live bill of materials in Build Week > Shade Schema before ordering or staging.',
      },
      { type: 'kv', label: 'Vertical poles', value: 'approx. 81' },
      { type: 'kv', label: 'Top rails', value: 'approx. 88 (approx. 169 EMT sticks total)' },
      { type: 'kv', label: '3-way connectors', value: 'approx. 71 (corners and inline)' },
      { type: 'kv', label: '4-way connectors', value: 'approx. 6 (wall junctions)' },
      { type: 'kv', label: '5-way connectors', value: 'approx. 4 (interior crosses)' },
      { type: 'kv', label: 'Base flanges', value: 'approx. 81' },
      { type: 'kv', label: 'Ratchet straps', value: 'approx. 90' },
      { type: 'kv', label: 'Lag bolt anchors', value: 'approx. 28' },
      { type: 'space' },
      { type: 'h', text: 'Schema colour code' },
      { type: 'bullet', text: 'Blue = 3-way connector (corner or inline pole).' },
      { type: 'bullet', text: 'Green = 4-way connector (wall junction / T).' },
      { type: 'bullet', text: 'Purple = 5-way connector (interior cross).' },
      { type: 'bullet', text: 'Orange = ratchet strap, pyramid leg or ground anchor.' },
      { type: 'bullet', text: 'Amber = pole shared by two bays. Built once, by the owning bay.' },
      { type: 'bullet', text: 'Gray = EMT pole and top rail.' },
      { type: 'space' },
      {
        type: 'note',
        text: 'Read the schema, not your memory. Every pole, connector and strap on this build is drawn in Build Week > Shade Schema (3D and 2D Plan). Print the 2D plan and carry it.',
      },
    ],
  },
  {
    slug: 'site-layout',
    code: 'SHEET 01',
    title: 'Site Layout & Grid Marking',
    subtitle: 'Nothing gets assembled until the whole footprint is flagged and square.',
    summary: 'Baselines, squaring by diagonal, flagging a post every 10 ft.',
    blocks: [
      { type: 'h', text: 'Tools' },
      {
        type: 'p',
        text: 'Measuring wheel, 100 ft tape, marking flags, chalk or marking paint, the printed 2D plan.',
      },
      { type: 'h', text: 'Procedure' },
      {
        type: 'step',
        title: 'Pull the baselines',
        text: 'Run the 50 ft and 30 ft baselines off the camp frontage line with the measuring wheel. Flag all four corners of the bay.',
      },
      {
        type: 'step',
        title: 'Square the rectangle',
        text: 'Use the 3-4-5 rule at full scale (30-40-50 ft) or check both diagonals. On a 50 x 30 bay both diagonals must read 58 ft 4 in and must match each other within 1 in.',
      },
      {
        type: 'step',
        title: 'Flag every post point',
        text: 'Place a flag every 10 ft along all four walls: 6 points on each 50 ft wall, 4 on each 30 ft wall. An isolated bay has 16 posts.',
      },
      {
        type: 'step',
        title: 'Resolve shared walls',
        text: 'Where two bays meet, the wall is built once. Amber poles in the schema belong to the bay that owns them - do not flag or stage a second set.',
      },
      {
        type: 'step',
        title: 'Flag the whole complex before building',
        text: 'Walk and flag every bay first. Cumulative measuring error is the number one reason the last wall will not close.',
      },
      { type: 'space' },
      {
        type: 'note',
        text: 'Check your work against the printed plan before a single pole leaves the staging pile. Moving flags is free. Moving a strapped 50 ft wall is not.',
      },
    ],
  },
  {
    slug: 'wall-assembly',
    code: 'SHEET 02',
    title: 'Wall Assembly on the Ground',
    subtitle: 'Every joint is easier at knee height than over your head.',
    summary: 'Laying out poles and connectors, orienting fittings, set screws, flanges.',
    blocks: [
      { type: 'h', text: 'Prep' },
      {
        type: 'p',
        text: 'Pre-lube every connector thread with zinc anti-seize. Playa dust seizes set screws permanently and you will never get the structure apart on Friday.',
      },
      { type: 'h', text: 'Procedure' },
      {
        type: 'step',
        title: 'Lay out the run',
        text: 'For each wall, lay out its verticals, its top rails, and the correct connector for every node: blue 3-way inline or corner, green 4-way where an interior wall tees in, purple 5-way where four walls cross, gray 2-way only at a true dead end.',
      },
      {
        type: 'step',
        title: 'Orient every connector before tightening',
        text: 'Sight through the connection so the open ports point exactly where the next pipe will run. A rotated connector cannot be corrected once the wall is standing.',
      },
      {
        type: 'step',
        title: 'Seat and tighten',
        text: 'Push each pipe fully home into the fitting, then tighten the set screw snug plus a firm quarter turn. Do not strip it.',
      },
      {
        type: 'step',
        title: 'Flange every vertical',
        text: 'Fit a base flange to the bottom of every vertical pole while the wall is still flat.',
      },
      {
        type: 'step',
        title: 'Build long walls first',
        text: 'Assemble the two 50 ft walls (6 verticals + 5 top rails each), then the two 30 ft end walls (4 verticals + 3 rails each).',
      },
      { type: 'space' },
      {
        type: 'note',
        text: 'Count your connectors against the plan before you raise anything. A missing 4-way found at height costs the crew an hour.',
      },
    ],
  },
  {
    slug: 'raising',
    code: 'SHEET 03',
    title: 'Raising & Squaring',
    subtitle: 'Six people minimum. Nobody lets go until it is tied.',
    summary: 'Lifting walls, closing the box with end rails, plumb and diagonal check.',
    blocks: [
      { type: 'h', text: 'Crew' },
      {
        type: 'p',
        text: 'Minimum 6 per bay: 2 assemblers and 4 lifters. One person owns the printed plan and calls the sequence out loud. Gloves and eye protection on everyone.',
      },
      { type: 'h', text: 'Procedure' },
      {
        type: 'step',
        title: 'Raise the first long wall',
        text: 'One lifter at every other pole. Two people hold it plumb. Nobody releases the wall until it is tied off or braced.',
      },
      { type: 'step', title: 'Raise the opposite long wall', text: 'Same crew, same call-out.' },
      {
        type: 'step',
        title: 'Close the box',
        text: 'Walk the end-wall rails into the open connector ports and set-screw them. This is what makes the box rigid. Work from one end to the other so tolerance does not stack up.',
      },
      { type: 'step', title: 'Land the flanges', text: 'Drop each base flange onto its flag mark.' },
      {
        type: 'step',
        title: 'Square and plumb',
        text: 'Re-check both diagonals (58 ft 4 in, matching) and plumb each corner post. Tap flanges with a dead-blow hammer to adjust. Only now do you tighten the final set screws.',
      },
      { type: 'space' },
      {
        type: 'note',
        text: 'A frame that is out of square will fight every strap you put on it and will rack in the first real wind. Square it before you brace it.',
      },
    ],
  },
  {
    slug: 'strapping',
    code: 'SHEET 04',
    title: 'Strapping & Pyramid Bracing',
    subtitle: 'The straps are the structure. The pipe is just the shape.',
    summary: 'Pyramid patterns per node type plus correct ratchet strap technique.',
    blocks: [
      {
        type: 'p',
        text: 'Every strap runs from the TOP of a pole down to either a neighbouring pole base plate or a ground anchor set 7 ft out (approx. 55 deg). The pattern comes straight from the schema.',
      },
      { type: 'h', text: 'Pattern by node type' },
      {
        type: 'bullet',
        text: 'Exterior corner - 3-leg pyramid: one strap down each wall to the base of the nearest pole (2 legs), plus one strap straight off the corner point along the 45 deg bisector to a ground anchor.',
      },
      {
        type: 'bullet',
        text: 'Wall junction / T (green 4-way) - 4-leg pyramid: one strap to the base of each neighbouring pole (3 legs), plus one ground anchor strap on the open exterior side.',
      },
      {
        type: 'bullet',
        text: 'Junctions facing inward into camp get NO ground leg. The pyramid legs carry the load.',
      },
      {
        type: 'bullet',
        text: 'Interior cross (purple 5-way): a single strap straight down, wrapped around the pole. No angled legs, no anchor.',
      },
      {
        type: 'bullet',
        text: 'Interior inline poles on a shared wall (amber): single strap straight down, wrapped.',
      },
      {
        type: 'bullet',
        text: 'Plain exterior inline poles: angled ground tie-down on EVERY OTHER pole, always aimed outward, never into another bay.',
      },
      { type: 'h', text: 'Ratchet strap technique' },
      {
        type: 'step',
        title: 'Open the ratchet flat',
        text: 'Pull the release lever fully open until the mechanism lies flat and the axle slot is accessible.',
      },
      {
        type: 'step',
        title: 'Thread the free end',
        text: 'Feed the long end up through the bottom of the axle slot. Keep the webbing flat - a single twist costs about half the strength and abrades the strap.',
      },
      {
        type: 'step',
        title: 'Remove slack by hand',
        text: 'Route the fixed end to one anchor point and the free end to the other, then pull all slack out by hand before touching the handle.',
      },
      {
        type: 'step',
        title: 'Tension firm, not maximum',
        text: 'Pump the handle until the strap is taut. Over-cranking bows 1 in EMT and cracks fittings.',
      },
      {
        type: 'step',
        title: 'Lock and dress the tail',
        text: 'Close the handle flat against the body to lock it, then roll and tie off every tail. Flapping tails shred in wind and become MOOP.',
      },
      { type: 'space' },
      {
        type: 'p',
        text: 'Use climbing hangers at pole tops as a combined washer and multi-strap junction. It cuts the strap count and gives a clean attachment point.',
      },
      {
        type: 'note',
        text: 'Common failures: twisted webbing, over-tensioning, loose tails, using 1 in straps where a structural 2 in strap belongs, and UV-fried nylon. Retire any strap with fraying or fading.',
      },
    ],
  },
  {
    slug: 'ground-anchors',
    code: 'SHEET 05',
    title: 'Ground Anchors',
    subtitle: 'Hardpan over soft silt. Anchor for both layers.',
    summary: 'Lag bolts, rebar, deadmen, angles and mandatory capping.',
    blocks: [
      {
        type: 'p',
        text: 'The playa surface is hardpan clay 6 to 12 in deep over softer alkaline silt. Anchoring has to account for both layers.',
      },
      { type: 'h', text: 'Procedure' },
      {
        type: 'step',
        title: 'Set the anchor position',
        text: 'Measure 7 ft out from the pole base along the strap line, on the exterior side.',
      },
      {
        type: 'step',
        title: 'Drive the lag bolt',
        text: 'Drive a 1/2 in x 18 in hex lag bolt with an impact driver at a 45 deg angle leaning AWAY from the structure.',
      },
      {
        type: 'step',
        title: 'Make the attachment point',
        text: 'Fender washer or climbing hanger under the head so the strap has something square to pull against.',
      },
      {
        type: 'step',
        title: 'Rebar alternative',
        text: '3/8 in or 1/2 in rebar, 18 to 24 in long, driven at 45 deg. Minimum 2 per leg, 4 on the wind-facing side.',
      },
      {
        type: 'step',
        title: 'Soft ground - use a deadman',
        text: 'Where the lag bolt spins or pulls, bury a cross-bar (pipe or timber) 12 to 18 in deep with cable or strap attached.',
      },
      {
        type: 'step',
        title: 'Cap everything',
        text: 'Cap every piece of exposed rebar with a rebar cap, pipe cap or tennis ball, immediately after driving it.',
      },
      { type: 'space' },
      {
        type: 'note',
        text: 'Uncapped rebar is the number one cause of serious injury at Burning Man. Cap it as you drive it - not at the end of the day.',
      },
    ],
  },
  {
    slug: 'shade-cloth',
    code: 'SHEET 06',
    title: 'Shade Cloth',
    subtitle: 'Taut, vented, and never a closed box.',
    summary: 'Aluminet handling, tensioning, attachment and airflow.',
    blocks: [
      { type: 'h', text: 'Procedure' },
      {
        type: 'step',
        title: 'Use aluminet',
        text: 'Aluminet reflects roughly 70 percent of radiant heat and lasts years. Standard tarps cook underneath, do not breathe, and shred fast.',
      },
      {
        type: 'step',
        title: 'Fly it over the finished frame',
        text: 'Attach on the ground where you can, then walk it over the completed frame. Do not fly cloth on a frame that is not yet strapped.',
      },
      {
        type: 'step',
        title: 'Pull it taut',
        text: 'Loose fabric flaps, drums all night, works fasteners loose and eventually tears free.',
      },
      {
        type: 'step',
        title: 'Attach at every node',
        text: 'Ball bungees or UV-rated zip ties at every rail node. Double up along the wind-facing edge.',
      },
      {
        type: 'step',
        title: 'Leave the leeward side open',
        text: 'Air must pass through. A fully enclosed frame is a parachute.',
      },
      {
        type: 'step',
        title: 'Confirm orientation',
        text: 'Long axis runs with prevailing wind (3 o clock / 9 o clock). This is already built into the camp layout - do not rotate a bay in the field.',
      },
      { type: 'space' },
      {
        type: 'note',
        text: 'Cloth goes on last and comes off first. If a serious wind event is forecast, dropping the shade cloth saves the frame.',
      },
    ],
  },
  {
    slug: 'inspection',
    code: 'SHEET 07',
    title: 'Final Inspection, MOOP & Daily Maintenance',
    subtitle: 'The walk-through that keeps it standing all week.',
    summary: 'Sign-off checklist, MOOP sweep, daily re-tension routine.',
    blocks: [
      { type: 'h', text: 'Sign-off checklist' },
      { type: 'bullet', text: 'Every set screw tight. Every flange sitting on its flag mark.' },
      { type: 'bullet', text: 'Every strap flat, tensioned, locked, and the tail rolled and tied.' },
      { type: 'bullet', text: 'Every ground anchor driven at 45 deg, washer or hanger in place.' },
      { type: 'bullet', text: 'Every piece of exposed rebar capped.' },
      { type: 'bullet', text: 'Both diagonals still matching after strapping.' },
      { type: 'bullet', text: 'Shade cloth taut, leeward side open.' },
      { type: 'h', text: 'MOOP sweep' },
      { type: 'bullet', text: 'Cap all open pipe ends.' },
      { type: 'bullet', text: 'Tape over sharp fittings and screw heads at head height.' },
      { type: 'bullet', text: 'Secure every loose fabric edge.' },
      { type: 'bullet', text: 'Pick up all cut-offs, zip tie tails, packaging and hardware from the ground.' },
      { type: 'h', text: 'Then' },
      {
        type: 'step',
        title: 'Photograph the bay',
        text: 'Shoot the completed bay from two corners and mark it verified in the Build Week inventory.',
      },
      {
        type: 'step',
        title: 'Re-tension every morning',
        text: 'Overnight temperature swing loosens everything. Walk every strap each morning and re-tension. Check again before any forecast wind event.',
      },
      {
        type: 'step',
        title: 'Watch for walk',
        text: 'Ratchets creep. Any strap that has visibly slackened twice gets replaced, not re-cranked.',
      },
      { type: 'space' },
      {
        type: 'note',
        text: 'If anything on the frame moves when you push a corner post hard, it is not finished. Find the loose leg and fix it before you leave the bay.',
      },
    ],
  },
  {
    slug: 'sequence-safety',
    code: 'SHEET 08',
    title: 'Build Week Sequence, Crew & Safety',
    subtitle: 'Who does what, in what order, and when we stop.',
    summary: 'Monday/Tuesday build order, crew roles, tool list, heat rules.',
    blocks: [
      { type: 'h', text: 'Sequence' },
      {
        type: 'bullet',
        text: 'Monday afternoon: builder-tent bay 1 - assemble, raise, square, cloth, strap, structural check (approx. 86 min target).',
      },
      {
        type: 'bullet',
        text: 'Monday evening: builder-tent bay 2, started once bay 1 is squared and strapped (approx. 88 min).',
      },
      {
        type: 'bullet',
        text: 'Tuesday all day: raise all remaining bays, then strap / anchor / wind-secure every structure, then fly shade cloth across all frames.',
      },
      { type: 'h', text: 'Crew roles per bay' },
      { type: 'bullet', text: 'Plan holder - owns the printed 2D plan, calls the sequence, nobody else improvises.' },
      { type: 'bullet', text: 'Two assemblers - connectors, set screws, flanges.' },
      { type: 'bullet', text: 'Four lifters - raising walls, one at every other pole.' },
      { type: 'bullet', text: 'Strap lead - runs the pyramid pattern and the anchor line, checks every tail.' },
      { type: 'h', text: 'Tools staged per bay' },
      {
        type: 'p',
        text: 'Tape measure and 100 ft tape, measuring wheel, marking flags, dead-blow hammer, impact driver with 3/4 in socket, hex driver for set screws, zinc anti-seize, two step ladders or scaffold (or 40 in stilts), gloves, eye protection.',
      },
      { type: 'h', text: 'Safety' },
      {
        type: 'bullet',
        text: 'Heat rule: no daytime construction above 101 to 102 deg F. Shift to night work under stadium lighting.',
      },
      { type: 'bullet', text: 'Water and electrolytes on every bay. Nobody works alone at height.' },
      { type: 'bullet', text: 'Eye protection when driving anchors. Gloves on all EMT handling - cut ends are sharp.' },
      { type: 'bullet', text: 'No raising walls in gusting wind. Wait it out.' },
      { type: 'bullet', text: 'Cap rebar as it is driven, every time, no exceptions.' },
      { type: 'space' },
      {
        type: 'note',
        text: 'Wind is the number one threat. The structure is engineered for approx. 90 mph but only if every strap and anchor on these sheets is actually installed. Over-anchor. If it can catch wind, it will.',
      },
    ],
  },
]

export const COMPLETE_SET_SLUG = 'complete-set'

export function getSheet(slug: string): InstructionSheet | undefined {
  return SHADE_INSTRUCTION_SHEETS.find(s => s.slug === slug)
}

export function pdfFileName(slug: string): string {
  if (slug === COMPLETE_SET_SLUG) return 'NYC-Deli-Shade-Erection-Guide-Complete.pdf'
  const sheet = getSheet(slug)
  if (!sheet) return 'shade-instructions.pdf'
  const code = sheet.code.replace(/\s+/g, '-')
  return `NYC-Deli-Shade-${code}-${sheet.title.replace(/[^A-Za-z0-9]+/g, '-')}.pdf`
}
