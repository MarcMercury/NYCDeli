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
    title: 'SITE & SECTIONS — FIELD GUIDE 2/6',
    subtitle: 'The corners are already flagged. Confirm the area, then build',
    summary: 'Confirm the surveyed corners, find your section, stage inside the footprint.',
    panels: [
      {
        title: 'Confirm the corners',
        lines: [
          'The survey crew has already flagged the corners. Walk them,',
          'confirm they match the camp map, and trust them.',
        ],
      },
      {
        title: 'Find your section',
        lines: [
          '8 bays tiled 3 x 3 with one left open, about 150 ft x 90 ft.',
          'Know which 50 ft x 30 ft section your crew owns before you start.',
        ],
      },
      {
        title: 'Spacing is built in',
        lines: [
          'No 10 ft flagging. Walls are assembled on the ground and the rail',
          'lengths set the post spacing for you.',
        ],
      },
      {
        title: 'Shared walls, built once',
        lines: [
          'Where two sections meet there is ONE wall and ONE set of poles.',
          'The owning section builds it. Do not stage a second set.',
        ],
      },
    ],
    checklist: [
      'Four corners confirmed against the map',
      'Section footprint walked and clear',
      'Poles, rails, connectors staged inside',
      'Shared walls assigned to one crew',
    ],
  },
  {
    slug: 'wall-assembly',
    code: '3/6',
    title: 'GROUND ASSEMBLY — FIELD GUIDE 3/6',
    subtitle: 'Everything happens on the ground, including the straps',
    summary: 'Laying out a run, orienting fittings, flanges, and pre-hanging every strap.',
    panels: [
      {
        title: 'Lay the wall out flat',
        lines: [
          'Verticals, top rails and the right connector at every node.',
          'The rail lengths set your post spacing - no measuring needed.',
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
        title: 'Seat it, screw it, flange it',
        lines: [
          'Pipe fully home, set screw snug plus a firm quarter turn,',
          'base flange on the bottom of every vertical.',
        ],
      },
      {
        title: 'Pre-hang every strap',
        lines: [
          'Clip each ratchet strap to its top connector now and let the free',
          'end hang loose. Straps get tensioned at the very end of the build.',
        ],
      },
    ],
    checklist: [
      'Correct connector at every node',
      'All ports sighted and oriented',
      'Set screws snug + 1/4 turn',
      'Straps hung, free ends loose',
    ],
  },
  {
    slug: 'raising',
    code: '4/6',
    title: 'RAISING THE L — FIELD GUIDE 4/6',
    subtitle: 'Long wall, then a short wall - the L stands on its own',
    summary: 'Long wall 4+2, short wall 3+1+ladder, then no holders needed.',
    panels: [
      {
        title: 'Long wall: 4 lift, 2 hold',
        lines: [
          'Four lifters walk the long wall up, two hold it plumb.',
          'Nobody lets go until the short wall is connected to it.',
        ],
      },
      {
        title: 'Short wall: 3 lift, 1 hold, 1 up',
        lines: [
          'Three raise the short wall, one holds, one goes up the ladder and',
          'connects the top corner into the long wall.',
        ],
      },
      {
        title: 'The L is self-standing',
        lines: [
          'Once the corner is made the holders come off. Four keep raising,',
          'two or three secure the joints, everyone else builds on the ground.',
        ],
      },
      {
        title: 'Follow behind with lag screws',
        lines: [
          'Spare hands lag the base flanges into the playa on any run whose',
          'measurements are already verified.',
        ],
      },
    ],
    checklist: [
      'Long wall up, held plumb',
      'Top corner connected from the ladder',
      'Holders released, L standing free',
      'Verified flanges lagged down',
    ],
  },
  {
    slug: 'strapping',
    code: '5/6',
    title: 'STRAPPING & ANCHORS — FIELD GUIDE 5/6',
    subtitle: 'Last job on the section - drop the hanging straps and tension',
    summary: 'Pyramid pattern per node type, tensioning, ground anchors.',
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
      'Every hanging strap accounted for',
      'Webbing flat, no twists',
      'Firm tension, not maximum',
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
