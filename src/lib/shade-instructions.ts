/**
 * Instruction sheet text. Client-safe: no PDF/drawing imports, so the Shade
 * Guide UI and the PDF renderer share one copy of the wording.
 */

export interface SheetPanelText {
  title: string
  lines: string[]
}

export interface SheetText {
  slug: string
  code: string
  title: string
  subtitle: string
  summary: string
  panels: SheetPanelText[]
  checklist: string[]
}

export const COMPLETE_SET_SLUG = 'complete-set'

export const SHADE_SHEET_TEXT: SheetText[] = [
  {
    slug: 'the-frame',
    code: '1/6',
    title: 'SHADE FRAME — FIELD GUIDE 1/6',
    subtitle: 'What we are building and what it is made of',
    summary: 'Bay size, camp grid, pole/connector kit and the connector colour code.',
    panels: [
      {
        title: 'Know the bay',
        lines: [
          'One bay is 50 ft x 30 ft with a post every 10 ft.',
          '16 posts, 10 ft tall. 6 posts on each long wall, 4 on each end wall.',
        ],
      },
      {
        title: 'Know the camp',
        lines: [
          '8 bays tiled 3 x 3 with one bay left open, about 150 ft x 90 ft overall.',
          'Amber walls are SHARED - built once, by the owning bay.',
        ],
      },
      {
        title: 'The kit per pole',
        lines: [
          '1 in x 10 ft EMT vertical, flange at the base, connector on top,',
          'top rails between poles. Zinc anti-seize on every thread.',
        ],
      },
      {
        title: 'Connector colour code',
        lines: ['Match the fitting to the node before you tighten anything.'],
      },
    ],
    checklist: [
      'Print the 2D plan from Shade Schema',
      'Count poles, rails and connectors',
      'Anti-seize on all threads',
      'Straps and lag bolts staged per bay',
    ],
  },
  {
    slug: 'layout-marking',
    code: '2/6',
    title: 'LAYOUT & MARKING — FIELD GUIDE 2/6',
    subtitle: 'Flag the whole footprint before a pole leaves the pile',
    summary: 'Baselines, squaring by diagonal, flagging every 10 ft, shared walls.',
    panels: [
      {
        title: 'Pull the baselines',
        lines: [
          'Run the 50 ft and 30 ft baselines off the camp frontage line.',
          'Flag all four corners of the bay.',
        ],
      },
      {
        title: 'Square the rectangle',
        lines: [
          'Both diagonals must read 58 ft 4 in and match within 1 in.',
          'Or use the 3-4-5 rule at full scale: 30-40-50 ft.',
        ],
      },
      {
        title: 'Flag every 10 ft',
        lines: [
          'A flag at every post point: 6 per long wall, 4 per end wall.',
          'Walk and flag every bay before assembling any of them.',
        ],
      },
      {
        title: 'Shared walls, built once',
        lines: [
          'Where two bays meet there is ONE wall and ONE set of poles.',
          'The owning bay builds it. Do not stage a second set.',
        ],
      },
    ],
    checklist: [
      'Four corners flagged',
      'Both diagonals 58 ft 4 in',
      'Post flag every 10 ft',
      'Shared walls marked once',
    ],
  },
  {
    slug: 'wall-assembly',
    code: '3/6',
    title: 'WALL ASSEMBLY — FIELD GUIDE 3/6',
    subtitle: 'Every joint is easier at knee height than overhead',
    summary: 'Laying out a run, orienting fittings, set screws, base flanges.',
    panels: [
      {
        title: 'Lay the run out flat',
        lines: [
          'Verticals, top rails and the right connector at every node,',
          'laid out on the ground in the order they go together.',
        ],
      },
      {
        title: 'Orient before you tighten',
        lines: [
          'Sight through the fitting so the open ports point where the next',
          'pipe will run. A rotated connector cannot be fixed once standing.',
        ],
      },
      {
        title: 'Seat it, then set screw',
        lines: [
          'Push the pipe fully home, then snug the set screw plus a firm',
          'quarter turn. Do not strip it.',
        ],
      },
      {
        title: 'Flange every vertical',
        lines: ['Base flange on the bottom of every pole while the wall is still flat.'],
      },
    ],
    checklist: [
      'Correct connector at every node',
      'All ports sighted and oriented',
      'Every set screw snug + 1/4 turn',
      'Flange on every vertical',
    ],
  },
  {
    slug: 'raising',
    code: '4/6',
    title: 'RAISING & SQUARING — FIELD GUIDE 4/6',
    subtitle: 'Six people minimum. Nobody lets go until it is tied',
    summary: 'Lifting walls, closing the box with end rails, plumb and diagonal check.',
    panels: [
      {
        title: 'Raise the first long wall',
        lines: [
          'One lifter at every other pole, two people holding it plumb.',
          'Nobody releases the wall until it is braced or tied.',
        ],
      },
      {
        title: 'Raise the opposite wall',
        lines: ['Same crew, same call-out, same hold. Keep both walls plumb.'],
      },
      {
        title: 'Close the box',
        lines: [
          'Walk the end-wall rails into the open ports and set-screw them.',
          'Work end to end so tolerance does not stack up.',
        ],
      },
      {
        title: 'Square and plumb',
        lines: [
          'Re-check both diagonals, plumb each corner, tap flanges onto',
          'their marks. Only now tighten the last screws.',
        ],
      },
    ],
    checklist: [
      'Six-person lift, callout given',
      'End rails seated both ends',
      'Diagonals still matching',
      'Corner posts plumb',
    ],
  },
  {
    slug: 'strapping',
    code: '5/6',
    title: 'STRAPPING & ANCHORS — FIELD GUIDE 5/6',
    subtitle: 'The straps are the structure. The pipe is just the shape',
    summary: 'Pyramid pattern per node type, strap technique, ground anchors.',
    panels: [
      {
        title: 'Corner: 3-leg pyramid',
        lines: [
          'One strap down each wall to the base of the nearest pole, plus',
          'one off the corner point on the 45 deg bisector to an anchor.',
        ],
      },
      {
        title: 'Junction: 4-leg pyramid',
        lines: [
          'A strap to each neighbouring pole base, plus one ground leg on',
          'the open exterior side. Inward-facing junctions get no ground leg.',
        ],
      },
      {
        title: 'Interior poles: wrap down',
        lines: [
          'Interior crosses and shared inline poles get a single strap',
          'straight down, wrapped. Exterior inline: tie every other pole.',
        ],
      },
      {
        title: 'Anchor at 7 ft, 45 deg',
        lines: [
          'Lag bolt 1/2 in x 18 in driven at 45 deg leaning away, 7 ft out',
          'from the pole base. Washer or climbing hanger under the head.',
        ],
      },
    ],
    checklist: [
      'Webbing flat, no twists',
      'Firm tension, not maximum',
      'Every tail rolled and tied',
      'Anchors 7 ft out at 45 deg',
    ],
  },
  {
    slug: 'cloth-inspection',
    code: '6/6',
    title: 'CLOTH & SIGN-OFF — FIELD GUIDE 6/6',
    subtitle: 'Shade on, MOOP off, then check it every morning',
    summary: 'Aluminet, airflow, MOOP sweep and the daily re-tension routine.',
    panels: [
      {
        title: 'Fly the aluminet',
        lines: [
          'Aluminet reflects about 70 percent of radiant heat. Pull it taut',
          'and tie at every rail node - double up on the wind-facing edge.',
        ],
      },
      {
        title: 'Leave the leeward side open',
        lines: [
          'Air has to pass through. A fully enclosed frame is a parachute.',
          'Long axis runs with prevailing wind - never rotate a bay.',
        ],
      },
      {
        title: 'Cap it and MOOP it',
        lines: [
          'Cap every rebar and open pipe end, tape sharp fittings at head',
          'height, pick up every cut-off and zip-tie tail.',
        ],
      },
      {
        title: 'Re-tension every morning',
        lines: [
          'Overnight temperature swing loosens everything. Walk every strap',
          'daily and before any forecast wind. Replace straps that keep walking.',
        ],
      },
    ],
    checklist: [
      'Cloth taut, leeward side open',
      'All rebar and pipe ends capped',
      'Site MOOP swept',
      'Photo taken, bay marked verified',
    ],
  },
]

export interface CampGridGuide {
  slug: string
  title: string
  subtitle: string
  summary: string
  image: string
}

export const CAMP_GRID_GUIDES: CampGridGuide[] = [
  {
    slug: 'camp-grid-1',
    title: 'Flagging the Camp — Field Guide 1/3',
    subtitle: 'Lot setup + measurement lines',
    summary: 'Orient the lot, stake the 4 corners, lay the 330 ft tapes, use the 150 ft cross-line.',
    image: '/Images/Survey Camp 1.png',
  },
  {
    slug: 'camp-grid-2',
    title: 'Flagging the Camp — Field Guide 2/3',
    subtitle: 'Plotting objects from the camp map',
    summary: 'Reading offsets off the tapes and placing flags for every object.',
    image: '/Images/Survey Camp 2.png',
  },
]

export function pdfFileName(slug: string): string {
  if (slug === COMPLETE_SET_SLUG) return 'NYC-Deli-Shade-Field-Guide-Complete.pdf'
  const sheet = SHADE_SHEET_TEXT.find(s => s.slug === slug)
  if (!sheet) return 'shade-field-guide.pdf'
  return `NYC-Deli-Shade-Field-Guide-${sheet.code.replace('/', '-of-')}.pdf`
}
