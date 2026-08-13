/**
 * Dependency-free PDF engine for illustrated landscape "field guide" sheets.
 *
 * Matches the printed camp survey guides: cream page, rounded white panel
 * cards with red numbered badges, vector diagrams, role sidebar and a quick
 * checklist strip. Letter landscape, core-14 Helvetica only.
 */

const PAGE_W = 792
const PAGE_H = 612

// Adobe core-14 advance widths (units/1000) for ASCII 32-126.
const W_REG = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
]
const W_BOLD = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
  975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
  333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
  611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
]

export type RGB = [number, number, number]
export type FontName = 'reg' | 'bold' | 'italic' | 'bolditalic'

export const C = {
  black: [0, 0, 0] as RGB,
  ink: [0.07, 0.07, 0.07] as RGB,
  gray: [0.4, 0.4, 0.4] as RGB,
  midGray: [0.62, 0.62, 0.62] as RGB,
  hairline: [0.82, 0.82, 0.82] as RGB,
  cream: [0.965, 0.953, 0.925] as RGB,
  card: [1, 1, 1] as RGB,
  panelTint: [0.976, 0.969, 0.949] as RGB,
  white: [1, 1, 1] as RGB,
  red: [0.75, 0.16, 0.13] as RGB,
  orange: [0.87, 0.47, 0.11] as RGB,
  green: [0.18, 0.48, 0.2] as RGB,
  blue: [0.17, 0.43, 0.7] as RGB,
  purple: [0.45, 0.2, 0.6] as RGB,
  steel: [0.38, 0.42, 0.47] as RGB,
  sky: [0.62, 0.76, 0.93] as RGB,
  sand: [0.85, 0.79, 0.68] as RGB,
} as const

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

function ascii(input: string): string {
  return input
    .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u2033]/g, '"')
    .replace(/\u2013/g, '-')
    .replace(/\u2014/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00D7/g, 'x')
    .replace(/\u00B0/g, ' deg')
    .replace(/\u00B1/g, '+/-')
    .replace(/\u2022/g, '-')
    .replace(/\u2192/g, '->')
    .replace(/[^\x20-\x7E]/g, '')
}

export function textWidth(s: string, size: number, font: FontName = 'reg'): number {
  const table = font === 'bold' || font === 'bolditalic' ? W_BOLD : W_REG
  const t = ascii(s)
  let total = 0
  for (let i = 0; i < t.length; i++) {
    const code = t.charCodeAt(i)
    total += code >= 32 && code <= 126 ? table[code - 32] : 500
  }
  return (total * size) / 1000
}

export function wrapText(s: string, size: number, font: FontName, maxW: number): string[] {
  const words = ascii(s).split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (textWidth(candidate, size, font) <= maxW || !line) line = candidate
    else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  return lines.length ? lines : ['']
}

const fontRes = (f: FontName) =>
  f === 'bold' ? 'F2' : f === 'italic' ? 'F3' : f === 'bolditalic' ? 'F4' : 'F1'

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
const n = (v: number) => (Math.round(v * 100) / 100).toString()

export interface TextOpts {
  size?: number
  font?: FontName
  color?: RGB
  align?: 'left' | 'center' | 'right'
  rotate?: number
}

export interface ShapeOpts {
  fill?: RGB
  stroke?: RGB
  lw?: number
  dash?: [number, number]
  radius?: number
}

/** Vector drawing surface for a single page. */
export class Draw {
  ops: string[] = []

  private setDash(dash?: [number, number]) {
    this.ops.push(dash ? `[${dash[0]} ${dash[1]}] 0 d` : '[] 0 d')
  }

  private paint(o: ShapeOpts) {
    if (o.fill) this.ops.push(`${o.fill.map(n).join(' ')} rg`)
    if (o.stroke) this.ops.push(`${o.stroke.map(n).join(' ')} RG ${o.lw ?? 1} w`)
    this.setDash(o.dash)
    return o.fill && o.stroke ? 'B' : o.fill ? 'f' : 'S'
  }

  rect(x: number, y: number, w: number, h: number, o: ShapeOpts = {}) {
    const op = this.paint(o)
    const r = o.radius ?? 0
    if (r <= 0) {
      this.ops.push(`${n(x)} ${n(y)} ${n(w)} ${n(h)} re ${op}`)
      return
    }
    const k = r * 0.5523
    this.ops.push(
      `${n(x + r)} ${n(y)} m ` +
        `${n(x + w - r)} ${n(y)} l ${n(x + w - r + k)} ${n(y)} ${n(x + w)} ${n(y + r - k)} ${n(x + w)} ${n(y + r)} c ` +
        `${n(x + w)} ${n(y + h - r)} l ${n(x + w)} ${n(y + h - r + k)} ${n(x + w - r + k)} ${n(y + h)} ${n(x + w - r)} ${n(y + h)} c ` +
        `${n(x + r)} ${n(y + h)} l ${n(x + r - k)} ${n(y + h)} ${n(x)} ${n(y + h - r + k)} ${n(x)} ${n(y + h - r)} c ` +
        `${n(x)} ${n(y + r)} l ${n(x)} ${n(y + r - k)} ${n(x + r - k)} ${n(y)} ${n(x + r)} ${n(y)} c h ${op}`
    )
  }

  line(x1: number, y1: number, x2: number, y2: number, o: ShapeOpts = {}) {
    this.paint({ ...o, fill: undefined, stroke: o.stroke ?? C.ink })
    this.ops.push(`${n(x1)} ${n(y1)} m ${n(x2)} ${n(y2)} l S`)
  }

  poly(points: Array<[number, number]>, o: ShapeOpts = {}, close = false) {
    if (points.length < 2) return
    const op = this.paint(o)
    const [start, ...rest] = points
    this.ops.push(
      `${n(start[0])} ${n(start[1])} m ${rest
        .map(p => `${n(p[0])} ${n(p[1])} l`)
        .join(' ')} ${close ? 'h ' : ''}${op}`
    )
  }

  circle(cx: number, cy: number, r: number, o: ShapeOpts = {}) {
    const op = this.paint(o)
    const k = r * 0.5523
    this.ops.push(
      `${n(cx + r)} ${n(cy)} m ` +
        `${n(cx + r)} ${n(cy + k)} ${n(cx + k)} ${n(cy + r)} ${n(cx)} ${n(cy + r)} c ` +
        `${n(cx - k)} ${n(cy + r)} ${n(cx - r)} ${n(cy + k)} ${n(cx - r)} ${n(cy)} c ` +
        `${n(cx - r)} ${n(cy - k)} ${n(cx - k)} ${n(cy - r)} ${n(cx)} ${n(cy - r)} c ` +
        `${n(cx + k)} ${n(cy - r)} ${n(cx + r)} ${n(cy - k)} ${n(cx + r)} ${n(cy)} c h ${op}`
    )
  }

  text(x: number, y: number, s: string, o: TextOpts = {}) {
    const t = ascii(s)
    if (!t) return
    const size = o.size ?? 9
    const font = o.font ?? 'reg'
    const color = o.color ?? C.ink
    const w = textWidth(t, size, font)
    const dx = o.align === 'center' ? -w / 2 : o.align === 'right' ? -w : 0
    this.ops.push(`BT /${fontRes(font)} ${size} Tf ${color.map(n).join(' ')} rg`)
    if (o.rotate) {
      const rad = (o.rotate * Math.PI) / 180
      const cos = Math.cos(rad)
      const sin = Math.sin(rad)
      this.ops.push(
        `${n(cos)} ${n(sin)} ${n(-sin)} ${n(cos)} ${n(x + dx * cos)} ${n(y + dx * sin)} Tm`
      )
    } else {
      this.ops.push(`1 0 0 1 ${n(x + dx)} ${n(y)} Tm`)
    }
    this.ops.push(`(${esc(t)}) Tj ET`)
  }

  /** Paragraph helper: returns the y position after the last line. */
  paragraph(x: number, y: number, s: string, maxW: number, o: TextOpts & { leading?: number } = {}) {
    const size = o.size ?? 8
    const lead = o.leading ?? size + 2.4
    let cy = y
    for (const l of wrapText(s, size, o.font ?? 'reg', maxW)) {
      this.text(x, cy, l, o)
      cy -= lead
    }
    return cy
  }

  arrowHead(x: number, y: number, angle: number, size: number, color: RGB) {
    const a1 = angle + Math.PI * 0.85
    const a2 = angle - Math.PI * 0.85
    this.poly(
      [
        [x, y],
        [x + Math.cos(a1) * size, y + Math.sin(a1) * size],
        [x + Math.cos(a2) * size, y + Math.sin(a2) * size],
      ],
      { fill: color },
      true
    )
  }

  arrow(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    o: ShapeOpts & { heads?: 'end' | 'both'; head?: number } = {}
  ) {
    const color = o.stroke ?? C.ink
    const size = o.head ?? 4
    const angle = Math.atan2(y2 - y1, x2 - x1)
    this.line(x1, y1, x2, y2, { ...o, stroke: color })
    this.setDash(undefined)
    this.arrowHead(x2, y2, angle, size, color)
    if (o.heads === 'both') this.arrowHead(x1, y1, angle + Math.PI, size, color)
  }

  /** Horizontal dimension line with end arrows and a centred label. */
  dimH(x1: number, x2: number, y: number, label: string, color: RGB = C.red, dashed = true) {
    this.arrow(x1, y, x2, y, {
      stroke: color,
      lw: 1.1,
      heads: 'both',
      dash: dashed ? [3, 2.4] : undefined,
    })
    const mid = (x1 + x2) / 2
    const w = textWidth(label, 7.5, 'bold') + 6
    this.rect(mid - w / 2, y - 4, w, 9, { fill: C.white })
    this.text(mid, y - 2.4, label, { size: 7.5, font: 'bold', color, align: 'center' })
  }

  /** Vertical dimension line with end arrows and a centred label. */
  dimV(y1: number, y2: number, x: number, label: string, color: RGB = C.red, dashed = true) {
    this.arrow(x, y1, x, y2, {
      stroke: color,
      lw: 1.1,
      heads: 'both',
      dash: dashed ? [3, 2.4] : undefined,
    })
    const mid = (y1 + y2) / 2
    const w = textWidth(label, 7.5, 'bold') + 6
    this.rect(x - w / 2, mid - 4.5, w, 9, { fill: C.white })
    this.text(x, mid - 2.6, label, { size: 7.5, font: 'bold', color, align: 'center' })
  }
}

// ───────────────────────── Sheet model ─────────────────────────

export interface GuidePanel {
  title: string
  lines?: string[]
  draw?: (d: Draw, box: Rect) => void
}

export interface GuideSideItem {
  badge: string
  color: RGB
  title: string
  lines: string[]
}

export interface GuideSheet {
  slug: string
  code: string
  title: string
  subtitle: string
  summary: string
  panels: GuidePanel[]
  sidebar?: { heading: string; items: GuideSideItem[] }
  checklist: string[]
}

const M = 14
const INNER_X = M + 10
const INNER_W = PAGE_W - INNER_X * 2
const HEADER_H = 58
const STRIP_H = 50

function drawHeader(d: Draw, sheet: GuideSheet) {
  const y = PAGE_H - M - 8 - HEADER_H
  d.rect(INNER_X, y, INNER_W, HEADER_H, { fill: C.white, stroke: C.ink, lw: 1.2, radius: 5 })

  // Left emblem: flag in a ring
  const cx = INNER_X + 30
  const cy = y + HEADER_H / 2
  d.circle(cx, cy, 20, { fill: C.white, stroke: C.red, lw: 2.4 })
  d.line(cx - 6, cy - 11, cx - 6, cy + 12, { stroke: C.red, lw: 2 })
  d.poly(
    [
      [cx - 6, cy + 12],
      [cx + 11, cy + 7],
      [cx - 6, cy + 2],
    ],
    { fill: C.red },
    true
  )

  // Right compass
  const nx = INNER_X + INNER_W - 30
  d.text(nx, cy + 9, 'N', { size: 9, font: 'bold', color: C.red, align: 'center' })
  d.circle(nx, cy - 4, 13, { fill: C.white, stroke: C.red, lw: 2.2 })
  d.poly(
    [
      [nx, cy + 5],
      [nx + 6, cy - 11],
      [nx, cy - 6],
      [nx - 6, cy - 11],
    ],
    { fill: C.ink },
    true
  )

  d.text(PAGE_W / 2, y + HEADER_H - 26, sheet.title, {
    size: 21,
    font: 'bold',
    align: 'center',
    color: C.ink,
  })
  d.text(PAGE_W / 2, y + 12, sheet.subtitle, {
    size: 10.5,
    font: 'bolditalic',
    align: 'center',
    color: C.ink,
  })
  return y
}

function drawPanel(d: Draw, box: Rect, index: number, panel: GuidePanel) {
  d.rect(box.x, box.y, box.w, box.h, { fill: C.card, stroke: C.midGray, lw: 1, radius: 6 })

  const badge = 21
  const badgeY = box.y + box.h - badge - 6
  d.rect(box.x + 7, badgeY, badge, badge, { fill: C.red, radius: 2 })
  d.text(box.x + 7 + badge / 2, badgeY + 6, String(index + 1), {
    size: 12,
    font: 'bold',
    color: C.white,
    align: 'center',
  })

  const textX = box.x + 36
  const textW = box.w - 46
  d.text(textX, badgeY + 7, `${index + 1}. ${panel.title}`, { size: 10.5, font: 'bold' })

  let cy = badgeY - 8
  for (const line of panel.lines ?? []) {
    cy = d.paragraph(textX, cy, line, textW, { size: 7.4, color: C.gray, leading: 9.4 })
  }

  const top = Math.min(cy + 4, badgeY - 6)
  const diagram: Rect = {
    x: box.x + 9,
    y: box.y + 8,
    w: box.w - 18,
    h: Math.max(20, top - (box.y + 8)),
  }
  panel.draw?.(d, diagram)
}

function drawSidebar(d: Draw, box: Rect, sidebar: NonNullable<GuideSheet['sidebar']>) {
  const headH = 22
  d.rect(box.x, box.y + box.h - headH, box.w, headH, { fill: C.red, radius: 4 })
  d.text(box.x + box.w / 2, box.y + box.h - headH + 7, sidebar.heading, {
    size: 9,
    font: 'bold',
    color: C.white,
    align: 'center',
  })

  const bodyH = box.h - headH - 6
  d.rect(box.x, box.y, box.w, bodyH, { fill: C.card, stroke: C.midGray, lw: 1, radius: 5 })

  const rowH = bodyH / sidebar.items.length
  sidebar.items.forEach((item, i) => {
    const top = box.y + bodyH - i * rowH
    if (i > 0) d.line(box.x + 8, top, box.x + box.w - 8, top, { stroke: C.hairline, lw: 0.8 })

    const iconX = box.x + 18
    const iconY = top - rowH / 2 - 6
    d.circle(iconX, iconY + 20, 5.5, { fill: item.color })
    d.rect(iconX - 6.5, iconY - 2, 13, 19, { fill: item.color, radius: 2.5 })
    d.rect(iconX - 6.5, iconY - 12, 13, 11, { fill: C.steel, radius: 1.5 })

    d.text(box.x + 32, top - 15, item.title, { size: 8.4, font: 'bold' })
    let cy = top - 25
    for (const l of item.lines) {
      cy = d.paragraph(box.x + 32, cy, l, box.w - 56, { size: 7, color: C.gray, leading: 8.6 })
    }
    d.rect(box.x + box.w - 18, top - 20, 12, 12, { fill: item.color, radius: 2 })
    d.text(box.x + box.w - 12, top - 17, item.badge, {
      size: 7.5,
      font: 'bold',
      color: C.white,
      align: 'center',
    })
  })
}

function drawChecklist(d: Draw, items: string[]) {
  const y = M + 10
  d.rect(INNER_X, y, INNER_W, STRIP_H, { fill: C.card, stroke: C.ink, lw: 1.2, radius: 5 })

  const labelW = 122
  d.rect(INNER_X + 12, y + 12, 26, 26, { stroke: C.red, lw: 2.4, radius: 3 })
  d.poly(
    [
      [INNER_X + 18, y + 25],
      [INNER_X + 24, y + 18],
      [INNER_X + 33, y + 32],
    ],
    { stroke: C.red, lw: 3 }
  )
  d.text(INNER_X + 46, y + 29, 'QUICK', { size: 10, font: 'bold' })
  d.text(INNER_X + 46, y + 16, 'CHECKLIST', { size: 10, font: 'bold' })

  const startX = INNER_X + labelW
  const colW = (INNER_W - labelW - 10) / items.length
  items.forEach((item, i) => {
    const x = startX + i * colW
    if (i > 0) d.line(x - 4, y + 9, x - 4, y + STRIP_H - 9, { stroke: C.hairline, lw: 0.8 })
    const lines = wrapText(item, 7.6, 'reg', colW - 26).slice(0, 3)
    const blockH = lines.length * 9
    let cy = y + STRIP_H / 2 + blockH / 2 - 7
    const boxY = cy - 1
    d.rect(x + 4, boxY, 10, 10, { stroke: C.red, lw: 1.4, radius: 1.5 })
    d.poly(
      [
        [x + 6, boxY + 5],
        [x + 8.5, boxY + 2],
        [x + 12, boxY + 9],
      ],
      { stroke: C.red, lw: 1.5 }
    )
    for (const l of lines) {
      d.text(x + 19, cy, l, { size: 7.6, color: C.ink })
      cy -= 9
    }
  })
}

export function renderSheet(sheet: GuideSheet): Draw {
  const d = new Draw()
  d.rect(0, 0, PAGE_W, PAGE_H, { fill: C.cream })
  d.rect(M, M, PAGE_W - M * 2, PAGE_H - M * 2, { stroke: C.ink, lw: 2.6, radius: 8 })

  const headerY = drawHeader(d, sheet)
  drawChecklist(d, sheet.checklist)

  const bodyTop = headerY - 9
  const bodyBottom = M + 10 + STRIP_H + 9
  const bodyH = bodyTop - bodyBottom

  const hasSidebar = !!sheet.sidebar
  const sidebarW = hasSidebar ? 150 : 0
  const gridW = INNER_W - (hasSidebar ? sidebarW + 9 : 0)

  const gap = 9
  const cols = 2
  const rows = Math.ceil(sheet.panels.length / cols)
  const panelW = (gridW - gap * (cols - 1)) / cols
  const panelH = (bodyH - gap * (rows - 1)) / rows

  sheet.panels.forEach((panel, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    drawPanel(
      d,
      {
        x: INNER_X + col * (panelW + gap),
        y: bodyTop - (row + 1) * panelH - row * gap,
        w: panelW,
        h: panelH,
      },
      i,
      panel
    )
  })

  if (sheet.sidebar) {
    drawSidebar(d, { x: INNER_X + gridW + 9, y: bodyBottom, w: sidebarW, h: bodyH }, sheet.sidebar)
  }

  return d
}

export function buildGuidePdf(sheets: GuideSheet[]): Uint8Array {
  return serialize(sheets.map(renderSheet))
}

function serialize(pages: Draw[]): Uint8Array {
  const enc = new TextEncoder()
  const chunks: Uint8Array[] = []
  const offsets: number[] = []
  let length = 0

  const push = (s: string) => {
    const bytes = enc.encode(s)
    chunks.push(bytes)
    length += bytes.length
  }

  const fontCount = 4
  const objectCount = 2 + fontCount + pages.length * 2
  const pageObjId = (i: number) => 2 + fontCount + 1 + i * 2
  const contentObjId = (i: number) => 2 + fontCount + 2 + i * 2

  const obj = (id: number, body: string) => {
    offsets[id] = length
    push(`${id} 0 obj\n${body}\nendobj\n`)
  }

  push('%PDF-1.4\n')
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>')
  obj(
    2,
    `<< /Type /Pages /Count ${pages.length} /Kids [${pages
      .map((_, i) => `${pageObjId(i)} 0 R`)
      .join(' ')}] >>`
  )
  obj(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
  obj(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')
  obj(5, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>')
  obj(
    6,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-BoldOblique /Encoding /WinAnsiEncoding >>'
  )

  pages.forEach((p, i) => {
    obj(
      pageObjId(i),
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R /F4 6 0 R >> >> ` +
        `/Contents ${contentObjId(i)} 0 R >>`
    )
    const stream = p.ops.join('\n')
    obj(contentObjId(i), `<< /Length ${enc.encode(stream).length} >>\nstream\n${stream}\nendstream`)
  })

  const xrefOffset = length
  let xref = `xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`
  for (let id = 1; id <= objectCount; id++) {
    xref += `${String(offsets[id] ?? 0).padStart(10, '0')} 00000 n \n`
  }
  push(xref)
  push(`trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`)

  const out = new Uint8Array(length)
  let cursor = 0
  for (const chunk of chunks) {
    out.set(chunk, cursor)
    cursor += chunk.length
  }
  return out
}
