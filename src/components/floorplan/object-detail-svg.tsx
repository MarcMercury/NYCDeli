'use client'

/**
 * Detailed inline SVG overlays for floorplan objects.
 * These render inside each object div to give a more realistic appearance.
 */

interface ObjectDetailProps {
  objectType: string
  /** pixel width of the rendered object */
  width: number
  /** pixel height of the rendered object */
  height: number
  color: string
  /** Tent-only: physical entrance count (1–4) */
  entranceCount?: number | null
  /** Tent-only: which physical side(s) of the tent has the door */
  entranceSide?: 'length' | 'width' | 'both' | null
}

export function ObjectDetailSVG({ objectType, width, height, color: _color, entranceCount, entranceSide }: ObjectDetailProps) {
  // Don't render detail below minimum size
  if (width < 16 || height < 16) return null

  switch (objectType) {
    case 'rv':
      return <RVDetail width={width} height={height} />
    case 'vehicle':
      return <VehicleDetail width={width} height={height} />
    case 'pc_container':
      return <ContainerDetail width={width} height={height} />
    case 'tent':
      return <TentDetail width={width} height={height} entranceCount={entranceCount ?? null} entranceSide={entranceSide ?? null} />
    case 'generator':
      return <GeneratorDetail width={width} height={height} />
    case 'porta_potty':
      return <PortaPottyDetail width={width} height={height} />
    case 'kitchen':
      return <KitchenDetail width={width} height={height} />
    case 'grill':
      return <GrillDetail width={width} height={height} />
    case 'refrigerated_truck':
      return <ReeferTruckDetail width={width} height={height} />
    case 'shower_container':
      return <ShowerDetail width={width} height={height} />
    case 'fire_pit':
      return <FirePitDetail width={width} height={height} />
    case 'table':
      return <TableDetail width={width} height={height} />
    case 'bike_parking':
      return <BikeParkingDetail width={width} height={height} />
    case 'fuel_storage':
    case 'propane_storage':
      return <FuelTankDetail width={width} height={height} />
    case 'water_station':
      return <WaterStationDetail width={width} height={height} />
    case 'bar':
      return <BarDetail width={width} height={height} />
    case 'stage':
      return <StageDetail width={width} height={height} />
    case 'storage':
      return <StorageDetail width={width} height={height} />
    case 'art_car':
      return <ArtCarDetail width={width} height={height} />
    default:
      return null
  }
}

/* ── RV / Camper ───────────────────────────────────────────────── */
function RVDetail({ width, height }: { width: number; height: number }) {
  // Horizontal RV: cab on right, body on left
  const isHorizontal = width >= height
  return (
    <svg className="absolute inset-0 pointer-events-none" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {isHorizontal ? (
        <>
          {/* Main body */}
          <rect x={2} y={2} width={width * 0.72} height={height - 4} rx={3} fill="rgba(255,255,255,0.15)" stroke="rgba(0,0,0,0.25)" strokeWidth={1} />
          {/* Cab / front */}
          <path
            d={`M${width * 0.72} ${height * 0.1} L${width - 4} ${height * 0.2} Q${width - 2} ${height * 0.25} ${width - 2} ${height * 0.35} L${width - 2} ${height * 0.65} Q${width - 2} ${height * 0.75} ${width - 4} ${height * 0.8} L${width * 0.72} ${height * 0.9} Z`}
            fill="rgba(0,0,0,0.12)"
            stroke="rgba(0,0,0,0.25)"
            strokeWidth={1}
          />
          {/* Windshield */}
          <path
            d={`M${width * 0.78} ${height * 0.22} L${width - 6} ${height * 0.3} L${width - 6} ${height * 0.7} L${width * 0.78} ${height * 0.78} Z`}
            fill="rgba(135,206,235,0.5)"
            stroke="rgba(0,0,0,0.2)"
            strokeWidth={0.5}
          />
          {/* Side windows on body */}
          {Array.from({ length: Math.max(1, Math.floor(width * 0.72 / (height * 0.8))) }, (_, i) => {
            const ww = Math.min(height * 0.35, width * 0.15)
            const wh = height * 0.22
            const gap = (width * 0.68) / Math.max(1, Math.floor(width * 0.72 / (height * 0.8)))
            return (
              <rect
                key={i}
                x={8 + i * gap}
                y={height * 0.15}
                width={ww}
                height={wh}
                rx={1.5}
                fill="rgba(135,206,235,0.4)"
                stroke="rgba(0,0,0,0.15)"
                strokeWidth={0.5}
              />
            )
          })}
          {/* Front wheel */}
          <ellipse cx={width * 0.82} cy={height - 2} rx={height * 0.14} ry={Math.min(3, height * 0.08)} fill="rgba(0,0,0,0.35)" />
          {/* Rear wheel */}
          <ellipse cx={width * 0.15} cy={height - 2} rx={height * 0.14} ry={Math.min(3, height * 0.08)} fill="rgba(0,0,0,0.35)" />
          {/* Side stripe */}
          <line x1={4} y1={height * 0.55} x2={width * 0.72} y2={height * 0.55} stroke="rgba(0,0,0,0.1)" strokeWidth={2} />
          {/* Door */}
          <rect x={width * 0.4} y={height * 0.4} width={width * 0.08} height={height * 0.5} rx={1} fill="rgba(0,0,0,0.08)" stroke="rgba(0,0,0,0.15)" strokeWidth={0.5} />
        </>
      ) : (
        <>
          {/* Vertical orientation: cab on bottom */}
          <rect x={2} y={2} width={width - 4} height={height * 0.72} rx={3} fill="rgba(255,255,255,0.15)" stroke="rgba(0,0,0,0.25)" strokeWidth={1} />
          <path
            d={`M${width * 0.1} ${height * 0.72} L${width * 0.2} ${height - 4} Q${width * 0.25} ${height - 2} ${width * 0.35} ${height - 2} L${width * 0.65} ${height - 2} Q${width * 0.75} ${height - 2} ${width * 0.8} ${height - 4} L${width * 0.9} ${height * 0.72} Z`}
            fill="rgba(0,0,0,0.12)"
            stroke="rgba(0,0,0,0.25)"
            strokeWidth={1}
          />
          {/* Windshield */}
          <path
            d={`M${width * 0.22} ${height * 0.78} L${width * 0.3} ${height - 6} L${width * 0.7} ${height - 6} L${width * 0.78} ${height * 0.78} Z`}
            fill="rgba(135,206,235,0.5)"
            stroke="rgba(0,0,0,0.2)"
            strokeWidth={0.5}
          />
          {/* Wheels */}
          <ellipse cx={2} cy={height * 0.82} rx={Math.min(3, width * 0.08)} ry={width * 0.14} fill="rgba(0,0,0,0.35)" />
          <ellipse cx={2} cy={height * 0.15} rx={Math.min(3, width * 0.08)} ry={width * 0.14} fill="rgba(0,0,0,0.35)" />
        </>
      )}
    </svg>
  )
}

/* ── Vehicle ───────────────────────────────────────────────── */
function VehicleDetail({ width, height }: { width: number; height: number }) {
  const isH = width >= height
  const w = isH ? width : height
  const h = isH ? height : width
  return (
    <svg className="absolute inset-0 pointer-events-none" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {isH ? (
        <>
          {/* Car body */}
          <rect x={w * 0.08} y={h * 0.15} width={w * 0.84} height={h * 0.6} rx={h * 0.15} fill="rgba(255,255,255,0.12)" stroke="rgba(0,0,0,0.2)" strokeWidth={1} />
          {/* Roof / cabin */}
          <rect x={w * 0.25} y={h * 0.05} width={w * 0.42} height={h * 0.5} rx={h * 0.12} fill="rgba(135,206,235,0.3)" stroke="rgba(0,0,0,0.15)" strokeWidth={0.5} />
          {/* Wheels */}
          <ellipse cx={w * 0.22} cy={h * 0.82} rx={h * 0.12} ry={Math.min(3, h * 0.06)} fill="rgba(0,0,0,0.35)" />
          <ellipse cx={w * 0.78} cy={h * 0.82} rx={h * 0.12} ry={Math.min(3, h * 0.06)} fill="rgba(0,0,0,0.35)" />
          {/* Headlights */}
          <circle cx={w * 0.92} cy={h * 0.35} r={Math.min(3, h * 0.08)} fill="rgba(255,255,200,0.5)" />
          <circle cx={w * 0.92} cy={h * 0.65} r={Math.min(3, h * 0.08)} fill="rgba(255,255,200,0.5)" />
        </>
      ) : (
        <>
          <rect x={w * 0.15} y={h * 0.08} width={w * 0.6} height={h * 0.84} rx={w * 0.15} fill="rgba(255,255,255,0.12)" stroke="rgba(0,0,0,0.2)" strokeWidth={1} />
          <rect x={w * 0.05} y={h * 0.25} width={w * 0.5} height={h * 0.42} rx={w * 0.12} fill="rgba(135,206,235,0.3)" stroke="rgba(0,0,0,0.15)" strokeWidth={0.5} />
          <ellipse cx={w * 0.82} cy={h * 0.22} rx={Math.min(3, w * 0.06)} ry={w * 0.12} fill="rgba(0,0,0,0.35)" />
          <ellipse cx={w * 0.82} cy={h * 0.78} rx={Math.min(3, w * 0.06)} ry={w * 0.12} fill="rgba(0,0,0,0.35)" />
        </>
      )}
    </svg>
  )
}

/* ── PC Container / Shipping Container ─────────────────────── */
function ContainerDetail({ width, height }: { width: number; height: number }) {
  const isH = width >= height
  const corrugationCount = isH ? Math.max(3, Math.floor(width / 8)) : Math.max(3, Math.floor(height / 8))
  return (
    <svg className="absolute inset-0 pointer-events-none" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Corrugated lines */}
      {isH ? (
        <>
          {Array.from({ length: corrugationCount }, (_, i) => {
            const x = 4 + (i * (width - 8)) / (corrugationCount - 1)
            return <line key={i} x1={x} y1={3} x2={x} y2={height - 3} stroke="rgba(0,0,0,0.12)" strokeWidth={1} />
          })}
          {/* Corner posts */}
          <rect x={1} y={1} width={4} height={height - 2} fill="rgba(0,0,0,0.15)" rx={0.5} />
          <rect x={width - 5} y={1} width={4} height={height - 2} fill="rgba(0,0,0,0.15)" rx={0.5} />
          {/* Top & bottom rail */}
          <line x1={1} y1={2} x2={width - 1} y2={2} stroke="rgba(0,0,0,0.2)" strokeWidth={1.5} />
          <line x1={1} y1={height - 2} x2={width - 1} y2={height - 2} stroke="rgba(0,0,0,0.2)" strokeWidth={1.5} />
          {/* Locking bars (door end — right side) */}
          <line x1={width - 8} y1={height * 0.25} x2={width - 8} y2={height * 0.75} stroke="rgba(0,0,0,0.2)" strokeWidth={1.5} />
          <line x1={width - 11} y1={height * 0.25} x2={width - 11} y2={height * 0.75} stroke="rgba(0,0,0,0.2)" strokeWidth={1.5} />
        </>
      ) : (
        <>
          {Array.from({ length: corrugationCount }, (_, i) => {
            const y = 4 + (i * (height - 8)) / (corrugationCount - 1)
            return <line key={i} x1={3} y1={y} x2={width - 3} y2={y} stroke="rgba(0,0,0,0.12)" strokeWidth={1} />
          })}
          <rect x={1} y={1} width={width - 2} height={4} fill="rgba(0,0,0,0.15)" rx={0.5} />
          <rect x={1} y={height - 5} width={width - 2} height={4} fill="rgba(0,0,0,0.15)" rx={0.5} />
          <line x1={2} y1={1} x2={2} y2={height - 1} stroke="rgba(0,0,0,0.2)" strokeWidth={1.5} />
          <line x1={width - 2} y1={1} x2={width - 2} y2={height - 1} stroke="rgba(0,0,0,0.2)" strokeWidth={1.5} />
          <line x1={width * 0.25} y1={height - 8} x2={width * 0.75} y2={height - 8} stroke="rgba(0,0,0,0.2)" strokeWidth={1.5} />
          <line x1={width * 0.25} y1={height - 11} x2={width * 0.75} y2={height - 11} stroke="rgba(0,0,0,0.2)" strokeWidth={1.5} />
        </>
      )}
    </svg>
  )
}

/* ── Tent ──────────────────────────────────────────────────── */
function TentDetail({
  width,
  height,
  entranceCount,
  entranceSide,
}: {
  width: number
  height: number
  entranceCount: number | null
  entranceSide: 'length' | 'width' | 'both' | null
}) {
  // Determine which sides should have an entrance marker.
  // The SVG horizontal axis is the floorplan "width" (short side when width<height)
  // and the vertical axis is the "length" (long side). We treat the longer of
  // (width,height) as the "length" side and the shorter as the "width" side.
  const longIsVertical = height >= width
  // longSides = the two sides perpendicular to the long axis (i.e. the two
  // long edges). For a portrait tent (longIsVertical) those are left+right.
  const longEdges = longIsVertical ? ['left', 'right'] : ['top', 'bottom']
  const shortEdges = longIsVertical ? ['top', 'bottom'] : ['left', 'right']

  const sides = new Set<'top' | 'bottom' | 'left' | 'right'>()
  if (entranceSide === 'length') longEdges.forEach(s => sides.add(s as 'top' | 'bottom' | 'left' | 'right'))
  else if (entranceSide === 'width') shortEdges.forEach(s => sides.add(s as 'top' | 'bottom' | 'left' | 'right'))
  else if (entranceSide === 'both') {
    longEdges.forEach(s => sides.add(s as 'top' | 'bottom' | 'left' | 'right'))
    shortEdges.forEach(s => sides.add(s as 'top' | 'bottom' | 'left' | 'right'))
  }

  // Cap to entrance count if known: prefer long sides first, then short sides.
  const ordered: ('top' | 'bottom' | 'left' | 'right')[] = []
  for (const s of [...longEdges, ...shortEdges]) {
    const k = s as 'top' | 'bottom' | 'left' | 'right'
    if (sides.has(k)) ordered.push(k)
  }
  const cap = typeof entranceCount === 'number' && entranceCount > 0 ? entranceCount : ordered.length
  const visible = new Set(ordered.slice(0, cap))

  // Marker geometry — a short bar centered on each edge.
  const barLong = Math.max(6, Math.min(width, height) * 0.3)
  const barThick = Math.max(2, Math.min(width, height) * 0.08)

  return (
    <svg className="absolute inset-0 pointer-events-none" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Cross-brace / ridge lines showing tent shape */}
      <line x1={0} y1={0} x2={width} y2={height} stroke="rgba(0,0,0,0.1)" strokeWidth={0.8} />
      <line x1={width} y1={0} x2={0} y2={height} stroke="rgba(0,0,0,0.1)" strokeWidth={0.8} />
      {/* Centre peak */}
      <circle cx={width / 2} cy={height / 2} r={Math.min(width, height) * 0.08} fill="rgba(0,0,0,0.15)" />
      {/* Corner guylines */}
      <circle cx={3} cy={3} r={1.5} fill="rgba(0,0,0,0.2)" />
      <circle cx={width - 3} cy={3} r={1.5} fill="rgba(0,0,0,0.2)" />
      <circle cx={3} cy={height - 3} r={1.5} fill="rgba(0,0,0,0.2)" />
      <circle cx={width - 3} cy={height - 3} r={1.5} fill="rgba(0,0,0,0.2)" />
      {/* Entrance markers — bright bars centered on entrance edges */}
      {visible.has('top') && (
        <rect x={(width - barLong) / 2} y={0} width={barLong} height={barThick} fill="#facc15" stroke="rgba(0,0,0,0.6)" strokeWidth={0.6} />
      )}
      {visible.has('bottom') && (
        <rect x={(width - barLong) / 2} y={height - barThick} width={barLong} height={barThick} fill="#facc15" stroke="rgba(0,0,0,0.6)" strokeWidth={0.6} />
      )}
      {visible.has('left') && (
        <rect x={0} y={(height - barLong) / 2} width={barThick} height={barLong} fill="#facc15" stroke="rgba(0,0,0,0.6)" strokeWidth={0.6} />
      )}
      {visible.has('right') && (
        <rect x={width - barThick} y={(height - barLong) / 2} width={barThick} height={barLong} fill="#facc15" stroke="rgba(0,0,0,0.6)" strokeWidth={0.6} />
      )}
    </svg>
  )
}

/* ── Generator ─────────────────────────────────────────────── */
function GeneratorDetail({ width, height }: { width: number; height: number }) {
  const cx = width / 2
  const cy = height / 2
  const r = Math.min(width, height) * 0.22
  return (
    <svg className="absolute inset-0 pointer-events-none" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Generator housing */}
      <rect x={width * 0.1} y={height * 0.2} width={width * 0.8} height={height * 0.6} rx={2} fill="rgba(0,0,0,0.08)" stroke="rgba(0,0,0,0.18)" strokeWidth={1} />
      {/* Vent grille */}
      {Array.from({ length: 4 }, (_, i) => (
        <line
          key={i}
          x1={width * 0.18}
          y1={height * 0.3 + i * (height * 0.1)}
          x2={width * 0.45}
          y2={height * 0.3 + i * (height * 0.1)}
          stroke="rgba(0,0,0,0.12)"
          strokeWidth={1}
        />
      ))}
      {/* Alternator circle */}
      <circle cx={width * 0.68} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth={1} />
      {/* Lightning bolt */}
      <path
        d={`M${cx + 1} ${cy - r * 0.7} L${cx - 2} ${cy + 1} L${cx + 1} ${cy + 1} L${cx - 1} ${cy + r * 0.7}`}
        fill="none"
        stroke="rgba(0,0,0,0.3)"
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Exhaust pipe */}
      <rect x={width * 0.85} y={height * 0.25} width={width * 0.08} height={height * 0.15} rx={1} fill="rgba(0,0,0,0.15)" />
    </svg>
  )
}

/* ── Porta Potty ───────────────────────────────────────────── */
function PortaPottyDetail({ width, height }: { width: number; height: number }) {
  return (
    <svg className="absolute inset-0 pointer-events-none" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Roof vent */}
      <rect x={width * 0.3} y={2} width={width * 0.4} height={height * 0.08} rx={1} fill="rgba(0,0,0,0.15)" />
      {/* Door frame */}
      <rect x={width * 0.15} y={height * 0.12} width={width * 0.7} height={height * 0.8} rx={1.5} fill="rgba(255,255,255,0.1)" stroke="rgba(0,0,0,0.18)" strokeWidth={1} />
      {/* Door vent slats */}
      <rect x={width * 0.28} y={height * 0.18} width={width * 0.44} height={height * 0.22} rx={1} fill="rgba(0,0,0,0.06)" stroke="rgba(0,0,0,0.1)" strokeWidth={0.5} />
      {Array.from({ length: 3 }, (_, i) => (
        <line
          key={i}
          x1={width * 0.3}
          y1={height * 0.2 + i * (height * 0.06)}
          x2={width * 0.7}
          y2={height * 0.2 + i * (height * 0.06)}
          stroke="rgba(0,0,0,0.1)"
          strokeWidth={0.5}
        />
      ))}
      {/* Door handle */}
      <circle cx={width * 0.65} cy={height * 0.55} r={Math.min(width, height) * 0.06} fill="rgba(0,0,0,0.2)" />
    </svg>
  )
}

/* ── Kitchen ───────────────────────────────────────────────── */
function KitchenDetail({ width, height }: { width: number; height: number }) {
  return (
    <svg className="absolute inset-0 pointer-events-none" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Counter / table lines */}
      <rect x={width * 0.05} y={height * 0.15} width={width * 0.4} height={height * 0.35} rx={1} fill="rgba(255,255,255,0.12)" stroke="rgba(0,0,0,0.12)" strokeWidth={0.8} />
      <rect x={width * 0.55} y={height * 0.15} width={width * 0.4} height={height * 0.35} rx={1} fill="rgba(255,255,255,0.12)" stroke="rgba(0,0,0,0.12)" strokeWidth={0.8} />
      {/* Stovetop burners */}
      <circle cx={width * 0.18} cy={height * 0.7} r={Math.min(width, height) * 0.06} fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth={1} />
      <circle cx={width * 0.35} cy={height * 0.7} r={Math.min(width, height) * 0.06} fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth={1} />
      {/* Sink */}
      <rect x={width * 0.6} y={height * 0.62} width={width * 0.15} height={height * 0.18} rx={2} fill="rgba(135,206,235,0.2)" stroke="rgba(0,0,0,0.12)" strokeWidth={0.8} />
      {/* Small faucet dot */}
      <circle cx={width * 0.675} cy={height * 0.6} r={1.5} fill="rgba(0,0,0,0.15)" />
    </svg>
  )
}

/* ── Grill ─────────────────────────────────────────────────── */
function GrillDetail({ width, height }: { width: number; height: number }) {
  return (
    <svg className="absolute inset-0 pointer-events-none" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Grill body */}
      <rect x={width * 0.1} y={height * 0.2} width={width * 0.8} height={height * 0.55} rx={2} fill="rgba(0,0,0,0.1)" stroke="rgba(0,0,0,0.2)" strokeWidth={1} />
      {/* Grill grates */}
      {Array.from({ length: Math.max(2, Math.floor(width / 10)) }, (_, i) => {
        const x = width * 0.15 + i * ((width * 0.7) / Math.max(2, Math.floor(width / 10)))
        return <line key={i} x1={x} y1={height * 0.25} x2={x} y2={height * 0.7} stroke="rgba(0,0,0,0.12)" strokeWidth={0.8} />
      })}
      {/* Handle */}
      <rect x={width * 0.35} y={height * 0.12} width={width * 0.3} height={3} rx={1.5} fill="rgba(0,0,0,0.18)" />
      {/* Legs */}
      <line x1={width * 0.15} y1={height * 0.75} x2={width * 0.15} y2={height - 2} stroke="rgba(0,0,0,0.15)" strokeWidth={1.5} />
      <line x1={width * 0.85} y1={height * 0.75} x2={width * 0.85} y2={height - 2} stroke="rgba(0,0,0,0.15)" strokeWidth={1.5} />
    </svg>
  )
}

/* ── Refrigerated Truck ────────────────────────────────────── */
function ReeferTruckDetail({ width, height }: { width: number; height: number }) {
  const isH = width >= height
  return (
    <svg className="absolute inset-0 pointer-events-none" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {isH ? (
        <>
          {/* Truck body */}
          <rect x={2} y={2} width={width * 0.65} height={height - 4} rx={2} fill="rgba(255,255,255,0.12)" stroke="rgba(0,0,0,0.2)" strokeWidth={1} />
          {/* Refrigeration unit on front */}
          <rect x={2} y={2} width={width * 0.08} height={height - 4} fill="rgba(0,0,0,0.12)" stroke="rgba(0,0,0,0.15)" strokeWidth={0.5} />
          {/* Vent lines on reefer unit */}
          {Array.from({ length: 3 }, (_, i) => (
            <line key={i} x1={4} y1={height * 0.25 + i * height * 0.2} x2={width * 0.08} y2={height * 0.25 + i * height * 0.2} stroke="rgba(0,0,0,0.1)" strokeWidth={0.5} />
          ))}
          {/* Cab */}
          <path
            d={`M${width * 0.67} ${height * 0.12} L${width - 4} ${height * 0.22} Q${width - 2} ${height * 0.3} ${width - 2} ${height * 0.4} L${width - 2} ${height * 0.7} Q${width - 2} ${height * 0.85} ${width - 6} ${height * 0.88} L${width * 0.67} ${height * 0.88} Z`}
            fill="rgba(0,0,0,0.1)"
            stroke="rgba(0,0,0,0.2)"
            strokeWidth={1}
          />
          {/* Windshield */}
          <path
            d={`M${width * 0.73} ${height * 0.2} L${width - 7} ${height * 0.3} L${width - 7} ${height * 0.65} L${width * 0.73} ${height * 0.75} Z`}
            fill="rgba(135,206,235,0.45)"
            stroke="rgba(0,0,0,0.15)"
            strokeWidth={0.5}
          />
          {/* Wheels */}
          <ellipse cx={width * 0.2} cy={height - 2} rx={height * 0.12} ry={2.5} fill="rgba(0,0,0,0.3)" />
          <ellipse cx={width * 0.5} cy={height - 2} rx={height * 0.12} ry={2.5} fill="rgba(0,0,0,0.3)" />
          <ellipse cx={width * 0.82} cy={height - 2} rx={height * 0.12} ry={2.5} fill="rgba(0,0,0,0.3)" />
          {/* Snowflake indicator */}
          <text x={width * 0.33} y={height * 0.55} textAnchor="middle" fontSize={Math.min(width, height) * 0.25} fill="rgba(0,0,0,0.12)">❄</text>
        </>
      ) : (
        <>
          <rect x={2} y={2} width={width - 4} height={height * 0.65} rx={2} fill="rgba(255,255,255,0.12)" stroke="rgba(0,0,0,0.2)" strokeWidth={1} />
          <rect x={2} y={2} width={width - 4} height={height * 0.08} fill="rgba(0,0,0,0.12)" />
          <text x={width * 0.5} y={height * 0.4} textAnchor="middle" fontSize={Math.min(width, height) * 0.2} fill="rgba(0,0,0,0.12)">❄</text>
        </>
      )}
    </svg>
  )
}

/* ── Shower Container ──────────────────────────────────────── */
function ShowerDetail({ width, height }: { width: number; height: number }) {
  return (
    <svg className="absolute inset-0 pointer-events-none" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Container corrugation */}
      {Array.from({ length: Math.max(2, Math.floor(width / 12)) }, (_, i) => {
        const x = 4 + (i * (width - 8)) / Math.max(1, Math.floor(width / 12) - 1)
        return <line key={i} x1={x} y1={3} x2={x} y2={height - 3} stroke="rgba(0,0,0,0.08)" strokeWidth={1} />
      })}
      {/* Shower stall dividers */}
      {Array.from({ length: Math.max(1, Math.floor(width / 20)) }, (_, i) => {
        const x = width * 0.15 + (i + 1) * ((width * 0.7) / (Math.floor(width / 20) + 1))
        return <line key={`d${i}`} x1={x} y1={height * 0.1} x2={x} y2={height * 0.9} stroke="rgba(0,0,0,0.15)" strokeWidth={1.5} strokeDasharray="3 2" />
      })}
      {/* Showerheads */}
      <circle cx={width * 0.3} cy={height * 0.2} r={2} fill="rgba(135,206,235,0.4)" stroke="rgba(0,0,0,0.15)" strokeWidth={0.5} />
      <circle cx={width * 0.7} cy={height * 0.2} r={2} fill="rgba(135,206,235,0.4)" stroke="rgba(0,0,0,0.15)" strokeWidth={0.5} />
      {/* Water drops */}
      <circle cx={width * 0.3} cy={height * 0.35} r={1} fill="rgba(135,206,235,0.3)" />
      <circle cx={width * 0.32} cy={height * 0.42} r={0.8} fill="rgba(135,206,235,0.2)" />
      <circle cx={width * 0.7} cy={height * 0.35} r={1} fill="rgba(135,206,235,0.3)" />
    </svg>
  )
}

/* ── Fire Pit ──────────────────────────────────────────────── */
function FirePitDetail({ width, height }: { width: number; height: number }) {
  const cx = width / 2
  const cy = height / 2
  const r = Math.min(width, height) * 0.32
  return (
    <svg className="absolute inset-0 pointer-events-none" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Stone ring */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth={Math.min(width, height) * 0.06} />
      {/* Inner dark pit */}
      <circle cx={cx} cy={cy} r={r * 0.65} fill="rgba(0,0,0,0.15)" />
      {/* Flame shapes */}
      <path
        d={`M${cx} ${cy - r * 0.5} Q${cx + r * 0.2} ${cy - r * 0.15} ${cx} ${cy + r * 0.1} Q${cx - r * 0.2} ${cy - r * 0.15} ${cx} ${cy - r * 0.5}`}
        fill="rgba(255,140,0,0.25)"
      />
      <path
        d={`M${cx - r * 0.15} ${cy - r * 0.2} Q${cx + r * 0.05} ${cy - r * 0.05} ${cx - r * 0.05} ${cy + r * 0.15}`}
        fill="none"
        stroke="rgba(255,100,0,0.2)"
        strokeWidth={1}
      />
    </svg>
  )
}

/* ── Table ─────────────────────────────────────────────────── */
function TableDetail({ width, height }: { width: number; height: number }) {
  return (
    <svg className="absolute inset-0 pointer-events-none" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Table surface */}
      <rect x={width * 0.08} y={height * 0.15} width={width * 0.84} height={height * 0.7} rx={2} fill="rgba(255,255,255,0.1)" stroke="rgba(0,0,0,0.15)" strokeWidth={1} />
      {/* Legs */}
      <rect x={width * 0.1} y={height * 0.15} width={3} height={height * 0.7} fill="rgba(0,0,0,0.12)" />
      <rect x={width * 0.88} y={height * 0.15} width={3} height={height * 0.7} fill="rgba(0,0,0,0.12)" />
      {/* Wood grain lines */}
      <line x1={width * 0.2} y1={height * 0.5} x2={width * 0.8} y2={height * 0.5} stroke="rgba(0,0,0,0.06)" strokeWidth={0.5} />
      <line x1={width * 0.15} y1={height * 0.38} x2={width * 0.85} y2={height * 0.38} stroke="rgba(0,0,0,0.06)" strokeWidth={0.5} />
      <line x1={width * 0.18} y1={height * 0.62} x2={width * 0.82} y2={height * 0.62} stroke="rgba(0,0,0,0.06)" strokeWidth={0.5} />
    </svg>
  )
}

/* ── Bike Parking ──────────────────────────────────────────── */
function BikeParkingDetail({ width, height }: { width: number; height: number }) {
  const slotCount = Math.max(2, Math.floor(width / 12))
  return (
    <svg className="absolute inset-0 pointer-events-none" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Rack bar */}
      <line x1={width * 0.08} y1={height * 0.5} x2={width * 0.92} y2={height * 0.5} stroke="rgba(0,0,0,0.2)" strokeWidth={2} />
      {/* U-racks */}
      {Array.from({ length: slotCount }, (_, i) => {
        const x = width * 0.12 + i * ((width * 0.76) / (slotCount - 1 || 1))
        const rr = Math.min(height * 0.25, 8)
        return (
          <path
            key={i}
            d={`M${x - rr * 0.5} ${height * 0.5} L${x - rr * 0.5} ${height * 0.25} Q${x - rr * 0.5} ${height * 0.15} ${x} ${height * 0.15} Q${x + rr * 0.5} ${height * 0.15} ${x + rr * 0.5} ${height * 0.25} L${x + rr * 0.5} ${height * 0.5}`}
            fill="none"
            stroke="rgba(0,0,0,0.18)"
            strokeWidth={1.5}
          />
        )
      })}
    </svg>
  )
}

/* ── Fuel / Propane Tank ───────────────────────────────────── */
function FuelTankDetail({ width, height }: { width: number; height: number }) {
  const cx = width / 2
  const _cy = height / 2
  const isH = width >= height
  return (
    <svg className="absolute inset-0 pointer-events-none" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {isH ? (
        <>
          {/* Horizontal tank */}
          <rect x={width * 0.1} y={height * 0.2} width={width * 0.8} height={height * 0.55} rx={height * 0.27} fill="rgba(255,255,255,0.1)" stroke="rgba(0,0,0,0.2)" strokeWidth={1} />
          {/* Valve on top */}
          <rect x={cx - 2} y={height * 0.08} width={4} height={height * 0.14} rx={1} fill="rgba(0,0,0,0.2)" />
          {/* Danger stripe */}
          <line x1={width * 0.12} y1={height * 0.48} x2={width * 0.88} y2={height * 0.48} stroke="rgba(220,38,38,0.2)" strokeWidth={2} />
        </>
      ) : (
        <>
          <rect x={width * 0.2} y={height * 0.1} width={width * 0.55} height={height * 0.8} rx={width * 0.27} fill="rgba(255,255,255,0.1)" stroke="rgba(0,0,0,0.2)" strokeWidth={1} />
          <rect x={cx - 2} y={height * 0.02} width={4} height={height * 0.1} rx={1} fill="rgba(0,0,0,0.2)" />
        </>
      )}
    </svg>
  )
}

/* ── Water Station ─────────────────────────────────────────── */
function WaterStationDetail({ width, height }: { width: number; height: number }) {
  return (
    <svg className="absolute inset-0 pointer-events-none" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Tank body */}
      <rect x={width * 0.15} y={height * 0.15} width={width * 0.7} height={height * 0.65} rx={3} fill="rgba(135,206,235,0.15)" stroke="rgba(0,0,0,0.15)" strokeWidth={1} />
      {/* Water level */}
      <rect x={width * 0.18} y={height * 0.4} width={width * 0.64} height={height * 0.37} rx={2} fill="rgba(56,189,248,0.15)" />
      {/* Spigot */}
      <rect x={width * 0.75} y={height * 0.55} width={width * 0.15} height={3} rx={1} fill="rgba(0,0,0,0.2)" />
      <circle cx={width * 0.92} cy={height * 0.57} r={2} fill="rgba(0,0,0,0.15)" />
    </svg>
  )
}

/* ── Bar ───────────────────────────────────────────────────── */
function BarDetail({ width, height }: { width: number; height: number }) {
  return (
    <svg className="absolute inset-0 pointer-events-none" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Bar counter — L-shaped or straight */}
      <rect x={width * 0.05} y={height * 0.15} width={width * 0.9} height={height * 0.25} rx={2} fill="rgba(0,0,0,0.1)" stroke="rgba(0,0,0,0.18)" strokeWidth={1} />
      {/* Stools along front */}
      {Array.from({ length: Math.max(2, Math.floor(width / 14)) }, (_, i) => {
        const x = width * 0.12 + i * ((width * 0.76) / (Math.max(2, Math.floor(width / 14)) - 1))
        return <circle key={i} cx={x} cy={height * 0.58} r={Math.min(4, height * 0.1)} fill="rgba(0,0,0,0.1)" stroke="rgba(0,0,0,0.12)" strokeWidth={0.5} />
      })}
      {/* Bottles behind bar */}
      {Array.from({ length: Math.max(2, Math.floor(width / 18)) }, (_, i) => {
        const x = width * 0.15 + i * ((width * 0.7) / Math.max(2, Math.floor(width / 18)))
        return <rect key={i} x={x} y={height * 0.05} width={3} height={height * 0.12} rx={1} fill="rgba(0,0,0,0.08)" />
      })}
    </svg>
  )
}

/* ── Stage ─────────────────────────────────────────────────── */
function StageDetail({ width, height }: { width: number; height: number }) {
  return (
    <svg className="absolute inset-0 pointer-events-none" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Stage platform edge */}
      <rect x={width * 0.05} y={height * 0.75} width={width * 0.9} height={height * 0.18} rx={1} fill="rgba(0,0,0,0.1)" stroke="rgba(0,0,0,0.15)" strokeWidth={1} />
      {/* Stage floor */}
      <rect x={width * 0.05} y={height * 0.2} width={width * 0.9} height={height * 0.55} fill="rgba(255,255,255,0.08)" stroke="rgba(0,0,0,0.1)" strokeWidth={0.5} />
      {/* Monitor wedges */}
      <polygon points={`${width * 0.2},${height * 0.7} ${width * 0.25},${height * 0.72} ${width * 0.15},${height * 0.72}`} fill="rgba(0,0,0,0.12)" />
      <polygon points={`${width * 0.8},${height * 0.7} ${width * 0.85},${height * 0.72} ${width * 0.75},${height * 0.72}`} fill="rgba(0,0,0,0.12)" />
      {/* Speaker stacks */}
      <rect x={width * 0.04} y={height * 0.15} width={width * 0.08} height={height * 0.3} rx={1} fill="rgba(0,0,0,0.12)" />
      <rect x={width * 0.88} y={height * 0.15} width={width * 0.08} height={height * 0.3} rx={1} fill="rgba(0,0,0,0.12)" />
    </svg>
  )
}

/* ── Storage ───────────────────────────────────────────────── */
function StorageDetail({ width, height }: { width: number; height: number }) {
  return (
    <svg className="absolute inset-0 pointer-events-none" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Shelving units */}
      {Array.from({ length: Math.max(2, Math.floor(height / 12)) }, (_, i) => {
        const y = height * 0.15 + i * ((height * 0.7) / Math.max(1, Math.floor(height / 12) - 1))
        return <line key={i} x1={width * 0.1} y1={y} x2={width * 0.9} y2={y} stroke="rgba(0,0,0,0.12)" strokeWidth={1} />
      })}
      {/* Side uprights */}
      <line x1={width * 0.1} y1={height * 0.1} x2={width * 0.1} y2={height * 0.9} stroke="rgba(0,0,0,0.15)" strokeWidth={1.5} />
      <line x1={width * 0.9} y1={height * 0.1} x2={width * 0.9} y2={height * 0.9} stroke="rgba(0,0,0,0.15)" strokeWidth={1.5} />
      {/* Boxes on shelves */}
      <rect x={width * 0.15} y={height * 0.18} width={width * 0.2} height={height * 0.12} rx={1} fill="rgba(0,0,0,0.06)" stroke="rgba(0,0,0,0.08)" strokeWidth={0.5} />
      <rect x={width * 0.45} y={height * 0.18} width={width * 0.15} height={height * 0.12} rx={1} fill="rgba(0,0,0,0.06)" stroke="rgba(0,0,0,0.08)" strokeWidth={0.5} />
      <rect x={width * 0.2} y={height * 0.45} width={width * 0.25} height={height * 0.12} rx={1} fill="rgba(0,0,0,0.06)" stroke="rgba(0,0,0,0.08)" strokeWidth={0.5} />
    </svg>
  )
}

/* ── Art Car ───────────────────────────────────────────────── */
function ArtCarDetail({ width, height }: { width: number; height: number }) {
  const isH = width >= height
  return (
    <svg className="absolute inset-0 pointer-events-none" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {isH ? (
        <>
          {/* Flatbed / platform base */}
          <rect x={width * 0.05} y={height * 0.4} width={width * 0.9} height={height * 0.4} rx={3} fill="rgba(255,255,255,0.1)" stroke="rgba(0,0,0,0.18)" strokeWidth={1} />
          {/* Art structure on top — abstract peak shape */}
          <polygon
            points={`${width * 0.15},${height * 0.4} ${width * 0.3},${height * 0.12} ${width * 0.5},${height * 0.3} ${width * 0.65},${height * 0.08} ${width * 0.85},${height * 0.4}`}
            fill="rgba(244,114,182,0.2)"
            stroke="rgba(0,0,0,0.12)"
            strokeWidth={0.8}
          />
          {/* Wheels */}
          <ellipse cx={width * 0.18} cy={height * 0.85} rx={height * 0.1} ry={2.5} fill="rgba(0,0,0,0.3)" />
          <ellipse cx={width * 0.82} cy={height * 0.85} rx={height * 0.1} ry={2.5} fill="rgba(0,0,0,0.3)" />
          {/* Stars / sparkle accents */}
          <circle cx={width * 0.4} cy={height * 0.25} r={1.5} fill="rgba(255,255,255,0.3)" />
          <circle cx={width * 0.6} cy={height * 0.18} r={1} fill="rgba(255,255,255,0.25)" />
          <circle cx={width * 0.75} cy={height * 0.28} r={1.2} fill="rgba(255,255,255,0.2)" />
        </>
      ) : (
        <>
          <rect x={width * 0.3} y={height * 0.05} width={width * 0.4} height={height * 0.9} rx={3} fill="rgba(255,255,255,0.1)" stroke="rgba(0,0,0,0.18)" strokeWidth={1} />
          <polygon
            points={`${width * 0.3},${height * 0.15} ${width * 0.12},${height * 0.3} ${width * 0.3},${height * 0.5} ${width * 0.08},${height * 0.65} ${width * 0.3},${height * 0.85}`}
            fill="rgba(244,114,182,0.2)"
            stroke="rgba(0,0,0,0.12)"
            strokeWidth={0.8}
          />
        </>
      )}
    </svg>
  )
}
