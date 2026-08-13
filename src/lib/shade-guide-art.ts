/**
 * Vector artwork for the shade structure field guides.
 *
 * Server-side only (imported by the PDF route). Panel wording lives in
 * shade-instructions.ts so the UI and the PDFs never drift apart.
 */

import { C, Draw, type GuideSheet, type Rect, type RGB } from './pdf'
import { SHADE_SHEET_TEXT } from './shade-instructions'

type Art = (d: Draw, b: Rect) => void

// ───────────────────────── drawing kit ─────────────────────────

/** Centred sub-rect of the given aspect, inset from the panel diagram box. */
function fit(b: Rect, aspect: number, maxW: number, padBottom = 12, padTop = 4): Rect {
  const availW = Math.min(b.w - 30, maxW)
  const availH = b.h - padBottom - padTop
  let w = availW
  let h = w / aspect
  if (h > availH) {
    h = availH
    w = h * aspect
  }
  return { x: b.x + (b.w - w) / 2, y: b.y + padBottom + (availH - h) / 2, w, h }
}

function ground(d: Draw, x1: number, x2: number, y: number) {
  d.line(x1, y, x2, y, { stroke: C.ink, lw: 1.3 })
  for (let x = x1 + 3; x < x2; x += 8) d.line(x, y, x - 4, y - 4, { stroke: C.midGray, lw: 0.7 })
}

function poleElev(d: Draw, x: number, yBase: number, h: number, cap?: RGB) {
  d.rect(x - 2, yBase, 4, h, { fill: C.steel })
  d.rect(x - 7, yBase - 3.5, 14, 4, { fill: C.ink, radius: 1 })
  if (cap) d.circle(x, yBase + h, 4.2, { fill: cap })
}

function figure(d: Draw, x: number, yBase: number, h: number, shirt: RGB) {
  const head = h * 0.15
  d.circle(x, yBase + h - head, head, { fill: shirt })
  d.rect(x - h * 0.12, yBase + h * 0.36, h * 0.24, h * 0.38, { fill: shirt, radius: 2 })
  d.rect(x - h * 0.12, yBase, h * 0.24, h * 0.37, { fill: C.steel, radius: 1.5 })
}

/** Baseline that vertically centres an elevation scene of the given height. */
function baseline(b: Rect, sceneH: number, captionH = 16): number {
  return b.y + captionH + Math.max(0, (b.h - captionH - sceneH) / 2)
}

function flagStake(d: Draw, x: number, yBase: number, color: RGB = C.red, h = 14) {
  d.line(x, yBase, x, yBase + h, { stroke: C.ink, lw: 1.2 })
  d.poly(
    [
      [x, yBase + h],
      [x + 8, yBase + h - 3],
      [x, yBase + h - 6],
    ],
    { fill: color },
    true
  )
}

function badgeText(d: Draw, x: number, y: number, label: string, color: RGB) {
  const w = label.length * 4.6 + 10
  d.rect(x, y, w, 12, { fill: color, radius: 2 })
  d.text(x + w / 2, y + 3.4, label, { size: 7, font: 'bold', color: C.white, align: 'center' })
}

function tick(d: Draw, x: number, y: number, ok: boolean) {
  const color = ok ? C.green : C.red
  d.circle(x, y, 7, { fill: C.white, stroke: color, lw: 1.6 })
  if (ok) {
    d.poly(
      [
        [x - 3.4, y],
        [x - 1, y - 3],
        [x + 3.6, y + 3.2],
      ],
      { stroke: color, lw: 1.8 }
    )
  } else {
    d.line(x - 3.2, y - 3.2, x + 3.2, y + 3.2, { stroke: color, lw: 1.8 })
    d.line(x - 3.2, y + 3.2, x + 3.2, y - 3.2, { stroke: color, lw: 1.8 })
  }
}

/** 50 x 30 bay in plan, optionally with posts and edge labels. */
function bayPlan(d: Draw, r: Rect, opts: { posts?: boolean; tint?: RGB } = {}) {
  d.rect(r.x, r.y, r.w, r.h, { fill: opts.tint ?? C.panelTint, stroke: C.ink, lw: 1.5 })
  if (opts.posts) {
    for (let i = 0; i <= 5; i++) {
      const x = r.x + (r.w / 5) * i
      d.circle(x, r.y + r.h, 2.6, { fill: C.ink })
      d.circle(x, r.y, 2.6, { fill: C.ink })
    }
    for (let i = 1; i <= 2; i++) {
      const y = r.y + (r.h / 3) * i
      d.circle(r.x, y, 2.6, { fill: C.ink })
      d.circle(r.x + r.w, y, 2.6, { fill: C.ink })
    }
  }
}

// ───────────────────────── sheet 1: the frame ─────────────────────────

const s1p1: Art = (d, b) => {
  const r = fit(b, 50 / 30, 172, 22, 18)
  bayPlan(d, r, { posts: true })
  d.dimH(r.x, r.x + r.w, r.y - 14, "50'")
  d.dimV(r.y, r.y + r.h, r.x - 16, "30'")
  d.dimH(r.x, r.x + r.w / 5, r.y + r.h + 15, "10'", C.orange)
  d.text(r.x + r.w / 2, r.y + r.h / 2 - 3, '1 BAY = 16 POSTS', {
    size: 7.6,
    font: 'bold',
    color: C.gray,
    align: 'center',
  })
}

const s1p2: Art = (d, b) => {
  const r = fit(b, 150 / 90, 186, 20, 14)
  const cw = r.w / 3
  const ch = r.h / 3
  const has = (cx: number, cy: number) => !(cx === 0 && cy === 2)
  for (let cx = 0; cx < 3; cx++) {
    for (let cy = 0; cy < 3; cy++) {
      if (!has(cx, cy)) continue
      d.rect(r.x + cx * cw, r.y + r.h - (cy + 1) * ch, cw, ch, {
        fill: C.panelTint,
        stroke: C.ink,
        lw: 1,
      })
    }
  }
  // Amber = wall shared by two neighbouring bays
  for (let cx = 0; cx < 3; cx++) {
    for (let cy = 0; cy < 3; cy++) {
      if (!has(cx, cy)) continue
      const x = r.x + cx * cw
      const yTop = r.y + r.h - cy * ch
      if (has(cx + 1, cy)) {
        d.line(x + cw, yTop, x + cw, yTop - ch, { stroke: C.orange, lw: 2.4 })
      }
      if (has(cx, cy + 1)) {
        d.line(x, yTop - ch, x + cw, yTop - ch, { stroke: C.orange, lw: 2.4 })
      }
    }
  }
  d.text(r.x + cw / 2, r.y + ch / 2 - 4, 'OPEN', {
    size: 7,
    font: 'bold',
    color: C.midGray,
    align: 'center',
  })
  d.dimH(r.x, r.x + r.w, r.y - 13, "150'")
  d.dimV(r.y, r.y + r.h, r.x - 15, "90'")
  badgeText(d, r.x + r.w - 62, r.y + r.h + 6, 'SHARED WALL', C.orange)
}

const s1p3: Art = (d, b) => {
  const cx = b.x + b.w * 0.34
  const h = Math.min(b.h - 40, 84)
  const yBase = baseline(b, h + 14, 10)
  ground(d, b.x + 10, b.x + b.w * 0.6, yBase)
  poleElev(d, cx, yBase, h, C.blue)
  d.line(cx, yBase + h, cx + 34, yBase + h, { stroke: C.steel, lw: 3.4 })
  d.line(cx, yBase + h, cx - 34, yBase + h, { stroke: C.steel, lw: 3.4 })

  const labelX = b.x + b.w * 0.66
  const rows: Array<[number, string, RGB]> = [
    [yBase + h, 'Connector + top rails', C.blue],
    [yBase + h * 0.55, '1 in x 10 ft EMT', C.steel],
    [yBase, 'Base flange', C.ink],
  ]
  for (const [y, label, color] of rows) {
    d.line(cx + 6, y, labelX - 5, y, { stroke: C.midGray, lw: 0.7, dash: [2, 2] })
    d.circle(labelX - 3, y, 2.2, { fill: color })
    d.text(labelX + 3, y - 2.6, label, { size: 7.4, font: 'bold' })
  }
  d.dimV(yBase, yBase + h, b.x + 14, "10'", C.red, false)
}

const s1p4: Art = (d, b) => {
  const rows: Array<[RGB, string, string]> = [
    [C.blue, '3-WAY', 'corner + inline pole'],
    [C.green, '4-WAY', 'wall junction / T'],
    [C.purple, '5-WAY', 'interior cross'],
    [C.steel, '2-WAY', 'dead end only'],
  ]
  const startY = b.y + b.h - 14
  rows.forEach(([color, name, use], i) => {
    const y = startY - i * ((b.h - 18) / 4)
    d.circle(b.x + 16, y, 6.5, { fill: color })
    d.text(b.x + 30, y - 3, name, { size: 8.2, font: 'bold' })
    d.text(b.x + 74, y - 3, use, { size: 7.4, color: C.gray })
  })
  d.line(b.x + 8, b.y + 12, b.x + b.w - 8, b.y + 12, { stroke: C.hairline, lw: 0.8 })
  d.text(b.x + 16, b.y + 2, 'Amber pole = shared by two bays', {
    size: 7.2,
    font: 'bold',
    color: C.orange,
  })
}

// ───────────────────────── sheet 2: layout & marking ─────────────────────────

const s2p1: Art = (d, b) => {
  const r = fit(b, 50 / 30, 168, 22, 16)
  bayPlan(d, r)
  for (const [fx, fy] of [
    [r.x, r.y],
    [r.x + r.w, r.y],
    [r.x, r.y + r.h],
    [r.x + r.w, r.y + r.h],
  ]) {
    flagStake(d, fx, fy, C.red, 14)
    tick(d, fx, fy - 9, true)
  }
  d.dimH(r.x, r.x + r.w, r.y + r.h / 2 + 8, "50'")
  d.dimV(r.y, r.y + r.h, r.x - 16, "30'")
  d.text(r.x + r.w / 2, r.y - 16, 'ALREADY PLACED BY THE SURVEY CREW', {
    size: 7,
    font: 'bold',
    color: C.gray,
    align: 'center',
  })
}

const s2p2: Art = (d, b) => {
  const r = fit(b, 150 / 90, 176, 20, 14)
  const cw = r.w / 3
  const ch = r.h / 3
  const has = (cx: number, cy: number) => !(cx === 0 && cy === 2)
  for (let cx = 0; cx < 3; cx++) {
    for (let cy = 0; cy < 3; cy++) {
      if (!has(cx, cy)) continue
      const mine = cx === 1 && cy === 1
      d.rect(r.x + cx * cw, r.y + r.h - (cy + 1) * ch, cw, ch, {
        fill: mine ? C.sky : C.panelTint,
        stroke: C.ink,
        lw: mine ? 1.8 : 1,
      })
    }
  }
  d.text(r.x + cw * 1.5, r.y + r.h - ch * 1.5 - 3, 'YOUR', {
    size: 6.6,
    font: 'bold',
    align: 'center',
  })
  d.text(r.x + cw * 1.5, r.y + r.h - ch * 1.5 - 11, 'SECTION', {
    size: 6.6,
    font: 'bold',
    align: 'center',
  })
  d.text(r.x + cw / 2, r.y + ch / 2 - 4, 'OPEN', {
    size: 7,
    font: 'bold',
    color: C.midGray,
    align: 'center',
  })
  d.dimH(r.x, r.x + r.w, r.y - 13, "150'")
  d.dimV(r.y, r.y + r.h, r.x - 15, "90'")
}

const s2p3: Art = (d, b) => {
  const y = baseline(b, 60, 18) + 34
  const x0 = b.x + 26
  const w = Math.min(b.w - 66, 168)
  ground(d, b.x + 8, b.x + b.w - 8, y - 34)
  d.rect(x0, y - 2.5, w, 5, { fill: C.steel, radius: 1 })
  for (let i = 0; i <= 5; i++) {
    const x = x0 + (w / 5) * i
    d.circle(x, y, 4, { fill: C.blue })
    d.rect(x - 1.5, y - 26, 3, 24, { fill: C.steel })
  }
  d.dimH(x0, x0 + w / 5, y + 14, "10' RAIL", C.orange)
  tick(d, b.x + b.w - 16, y + 12, true)
  d.text(b.x + b.w / 2, b.y + 6, 'THE RAIL SETS THE SPACING - NO FLAGGING', {
    size: 7,
    font: 'bold',
    color: C.gray,
    align: 'center',
  })
}

const s2p4: Art = (d, b) => {
  const r = fit(b, 100 / 30, 200, 26, 14)
  const half = r.w / 2
  d.rect(r.x, r.y, half, r.h, { fill: C.panelTint, stroke: C.ink, lw: 1.3 })
  d.rect(r.x + half, r.y, half, r.h, { fill: C.panelTint, stroke: C.ink, lw: 1.3 })
  d.line(r.x + half, r.y, r.x + half, r.y + r.h, { stroke: C.orange, lw: 3 })
  for (let i = 0; i <= 3; i++) {
    const y = r.y + (r.h / 3) * i
    d.circle(r.x + half, y, 3, { fill: C.orange })
  }
  badgeText(d, r.x + half - 30, r.y + r.h + 6, 'BUILD ONCE', C.orange)
  d.text(r.x + half / 2, r.y - 13, 'BAY A', { size: 7.4, font: 'bold', align: 'center' })
  d.text(r.x + half * 1.5, r.y - 13, 'BAY B', { size: 7.4, font: 'bold', align: 'center' })
  d.text(r.x + r.w / 2, r.y - 24, 'One wall, one set of poles, one owner', {
    size: 7,
    color: C.gray,
    align: 'center',
  })
}

// ───────────────────────── sheet 3: wall assembly ─────────────────────────

const s3p1: Art = (d, b) => {
  const gy = baseline(b, 72, 18)
  const y = gy + 46
  const x1 = b.x + 14
  const x2 = b.x + b.w - 14
  ground(d, b.x + 6, b.x + b.w - 6, gy)
  for (let i = 0; i < 3; i++) {
    const sx = x1 + ((x2 - x1) / 3) * i + 6
    const ex = sx + (x2 - x1) / 3 - 16
    d.rect(sx, y - 2.5, ex - sx, 5, { fill: C.steel, radius: 1 })
    d.circle(ex + 5, y, 4.6, { fill: C.blue })
  }
  d.circle(x1, y, 4.6, { fill: C.blue })
  for (let i = 0; i < 3; i++) {
    const sx = x1 + ((x2 - x1) / 3) * i + 8
    d.rect(sx, y - 30, (x2 - x1) / 3 - 20, 5, { fill: C.steel, radius: 1 })
  }
  d.text(b.x + b.w / 2, y + 12, 'TOP RAILS + CONNECTORS', {
    size: 7,
    font: 'bold',
    color: C.gray,
    align: 'center',
  })
  d.text(b.x + b.w / 2, y - 42, 'VERTICALS LAID IN ORDER', {
    size: 7,
    font: 'bold',
    color: C.gray,
    align: 'center',
  })
}

const s3p2: Art = (d, b) => {
  const cy = b.y + b.h * 0.55
  const draw = (cx: number, rotated: boolean, ok: boolean) => {
    d.circle(cx, cy, 15, { fill: C.white, stroke: C.ink, lw: 1.4 })
    const arms: Array<[number, number]> = rotated
      ? [
          [1, 0.5],
          [-0.7, 0.9],
          [0, -1],
        ]
      : [
          [1, 0],
          [-1, 0],
          [0, -1],
        ]
    for (const [ax, ay] of arms) {
      d.line(cx, cy, cx + ax * 26, cy + ay * 26, { stroke: C.steel, lw: 4 })
    }
    d.circle(cx, cy, 6, { fill: C.blue })
    tick(d, cx, cy - 40, ok)
  }
  draw(b.x + b.w * 0.28, false, true)
  draw(b.x + b.w * 0.72, true, false)
  d.text(b.x + b.w * 0.28, cy + 30, 'PORTS ON AXIS', {
    size: 7,
    font: 'bold',
    color: C.green,
    align: 'center',
  })
  d.text(b.x + b.w * 0.72, cy + 30, 'ROTATED = REBUILD', {
    size: 7,
    font: 'bold',
    color: C.red,
    align: 'center',
  })
}

const s3p3: Art = (d, b) => {
  const cy = b.y + b.h * 0.55
  const x0 = b.x + 20
  d.rect(x0, cy - 9, 78, 18, { fill: C.white, stroke: C.ink, lw: 1.4, radius: 3 })
  d.rect(x0 + 78, cy - 6.5, 62, 13, { fill: C.steel, radius: 2 })
  d.arrow(x0 + 150, cy, x0 + 112, cy, { stroke: C.red, lw: 1.4 })
  d.text(x0 + 154, cy - 3, 'seat it', { size: 7.4, font: 'bold', color: C.red })
  d.rect(x0 + 30, cy + 9, 8, 16, { fill: C.ink, radius: 1 })
  d.text(x0 + 34, cy + 29, 'set screw', { size: 7, font: 'bold', align: 'center' })
  d.text(b.x + b.w / 2, b.y + 8, 'SNUG + A FIRM QUARTER TURN - DO NOT STRIP', {
    size: 7,
    font: 'bold',
    color: C.gray,
    align: 'center',
  })
}

const s3p4: Art = (d, b) => {
  const h = Math.min(b.h - 46, 60)
  const yBase = baseline(b, h + 20, 16)
  const cx = b.x + b.w * 0.4
  ground(d, b.x + 12, b.x + b.w - 12, yBase)
  poleElev(d, cx, yBase, h, C.blue)
  d.line(cx, yBase + h, cx + 30, yBase + h, { stroke: C.steel, lw: 3.4 })
  // Strap clipped at the top connector, free end hanging loose
  d.line(cx + 3, yBase + h - 2, cx + 9, yBase + h * 0.42, { stroke: C.orange, lw: 2 })
  d.rect(cx + 6, yBase + h * 0.3, 13, 9, { fill: C.ink, radius: 1.5 })
  d.line(cx + 12, yBase + h * 0.3, cx + 15, yBase + 6, { stroke: C.orange, lw: 2 })
  d.circle(cx + 17, yBase + 5, 5, { stroke: C.orange, lw: 2 })
  badgeText(d, b.x + b.w - 74, yBase + h - 6, 'TENSION LATER', C.orange)
  d.text(b.x + b.w / 2, b.y + 6, 'FREE END HANGS LOOSE THROUGH THE LIFT', {
    size: 7,
    font: 'bold',
    color: C.gray,
    align: 'center',
  })
}

// ───────────────────────── sheet 4: raising the L ─────────────────────────

/** Wall drawn receding to the upper right, for the axonometric L. */
function wallAxo(
  d: Draw,
  x0: number,
  y0: number,
  dx: number,
  dy: number,
  count: number,
  h: number,
  cap: RGB
) {
  for (let i = 0; i < count; i++) {
    const x = x0 + (dx / (count - 1)) * i
    const y = y0 + (dy / (count - 1)) * i
    d.rect(x - 1.8, y, 3.6, h, { fill: C.steel })
    d.rect(x - 5, y - 2.5, 10, 3, { fill: C.ink })
    d.circle(x, y + h, 3.2, { fill: cap })
  }
  d.line(x0, y0 + h, x0 + dx, y0 + dy + h, { stroke: C.steel, lw: 3 })
}

const s4p1: Art = (d, b) => {
  const yBase = baseline(b, 96, 16)
  ground(d, b.x + 8, b.x + b.w - 8, yBase)
  const x0 = b.x + 34
  const len = Math.min(b.w - 74, 148)
  const ang = (40 * Math.PI) / 180
  d.line(x0, yBase, x0 + Math.cos(ang) * len, yBase + Math.sin(ang) * len, {
    stroke: C.steel,
    lw: 5,
  })
  for (let i = 1; i <= 3; i++) {
    const t = (i / 4) * len
    d.line(
      x0 + Math.cos(ang) * t,
      yBase + Math.sin(ang) * t,
      x0 + Math.cos(ang) * t + 9,
      yBase + Math.sin(ang) * t - 20,
      { stroke: C.steel, lw: 3 }
    )
  }
  d.arrow(x0 + len * 0.9, yBase + 10, x0 + len * 0.76, yBase + len * 0.7, {
    stroke: C.red,
    lw: 1.6,
    head: 5,
  })
  const shirts: RGB[] = [C.red, C.red, C.red, C.red, C.blue, C.blue]
  shirts.forEach((shirt, i) => {
    figure(d, b.x + 22 + i * 20, yBase, 26, shirt)
  })
  badgeText(d, b.x + 18, yBase + 30, '4 LIFT', C.red)
  badgeText(d, b.x + 100, yBase + 30, '2 HOLD', C.blue)
  d.text(b.x + b.w / 2, b.y + 4, 'NOBODY LETS GO UNTIL THE CORNER IS MADE', {
    size: 7,
    font: 'bold',
    color: C.gray,
    align: 'center',
  })
}

const s4p2: Art = (d, b) => {
  const h = Math.min(b.h - 52, 56)
  const yBase = baseline(b, h + 34, 16)
  ground(d, b.x + 8, b.x + b.w - 8, yBase)
  // Standing long wall on the left
  const lx = b.x + 26
  for (let i = 0; i < 3; i++) poleElev(d, lx + i * 22, yBase, h, C.blue)
  d.rect(lx - 3, yBase + h - 2, 47, 4, { fill: C.steel })
  // Short wall coming up at an angle
  const sx = lx + 44
  const ang = (55 * Math.PI) / 180
  const len = Math.min(b.w - 130, 74)
  d.line(sx, yBase, sx + Math.cos(ang) * len, yBase + Math.sin(ang) * len, {
    stroke: C.steel,
    lw: 4.5,
  })
  d.arrow(sx + 34, yBase + 12, sx + 26, yBase + 44, { stroke: C.red, lw: 1.5, head: 4.6 })
  // Ladder at the corner
  const ldx = sx + 52
  d.line(ldx, yBase, ldx + 8, yBase + h + 6, { stroke: C.ink, lw: 1.6 })
  d.line(ldx + 12, yBase, ldx + 20, yBase + h + 6, { stroke: C.ink, lw: 1.6 })
  for (let i = 1; i <= 4; i++) {
    const t = i / 5
    d.line(ldx + 8 * t, yBase + (h + 6) * t, ldx + 12 + 8 * t, yBase + (h + 6) * t, {
      stroke: C.ink,
      lw: 1.2,
    })
  }
  figure(d, ldx + 16, yBase + h - 16, 22, C.green)
  badgeText(d, b.x + 10, yBase + h + 14, '3 LIFT', C.red)
  badgeText(d, b.x + 58, yBase + h + 14, '1 HOLD', C.blue)
  badgeText(d, b.x + 108, yBase + h + 14, '1 UP TOP', C.green)
  d.text(b.x + b.w / 2, b.y + 4, 'LADDER HAND MAKES THE TOP CORNER', {
    size: 7,
    font: 'bold',
    color: C.gray,
    align: 'center',
  })
}

const s4p3: Art = (d, b) => {
  const h = Math.min(b.h - 56, 48)
  const yBase = baseline(b, h + 40, 16)
  ground(d, b.x + 8, b.x + b.w - 8, yBase)
  const cornerX = b.x + b.w * 0.36
  const depth = Math.min(b.w * 0.34, 92)
  d.line(cornerX, yBase, cornerX + depth, yBase + 30, { stroke: C.midGray, lw: 0.9, dash: [3, 2] })
  wallAxo(d, cornerX, yBase, -Math.min(b.w * 0.3, 84), 0, 4, h, C.blue)
  wallAxo(d, cornerX, yBase, depth, 30, 3, h, C.blue)
  d.circle(cornerX, yBase + h, 4.6, { fill: C.green })
  badgeText(d, b.x + b.w - 92, yBase + h + 22, 'NO HOLDERS NEEDED', C.green)
  const notes = ['4 keep raising', '2-3 secure joints', 'rest build on ground']
  notes.forEach((t, i) => {
    d.circle(b.x + 12, yBase - 12 - i * 0, 0, {})
    d.text(b.x + 10 + i * (b.w / 3), b.y + 4, t, { size: 6.8, font: 'bold', color: C.gray })
  })
}

const s4p4: Art = (d, b) => {
  const yBase = baseline(b, 66, 16)
  ground(d, b.x + 14, b.x + b.w - 14, yBase)
  const cx = b.x + b.w * 0.36
  d.rect(cx - 3, yBase, 6, Math.min(b.h - 50, 50), { fill: C.steel })
  d.rect(cx - 17, yBase - 5, 34, 6, { fill: C.ink, radius: 1.5 })
  for (const dx of [-12, 12]) {
    d.circle(cx + dx, yBase - 2, 2, { fill: C.orange })
    d.line(cx + dx, yBase - 2, cx + dx, yBase - 13, { stroke: C.orange, lw: 2.2 })
  }
  // Impact driver
  const dxr = cx + 44
  d.rect(dxr, yBase + 4, 26, 13, { fill: C.red, radius: 2 })
  d.rect(dxr + 6, yBase - 10, 11, 15, { fill: C.ink, radius: 2 })
  d.line(dxr, yBase + 10, dxr - 16, yBase + 10, { stroke: C.steel, lw: 2.4 })
  tick(d, b.x + b.w - 20, yBase + 26, true)
  d.text(b.x + b.w / 2, b.y + 4, 'ONLY LAG RUNS WITH VERIFIED MEASUREMENTS', {
    size: 7,
    font: 'bold',
    color: C.gray,
    align: 'center',
  })
}

// ───────────────────────── sheet 5: strapping ─────────────────────────

function strapScene(
  d: Draw,
  b: Rect,
  legs: Array<{ dx: number; dy: number; ground?: boolean }>,
  caption: string,
  capColor: RGB
) {
  const cx = b.x + b.w / 2
  const h = Math.min(b.h - 46, 62)
  const yBase = baseline(b, h + 16, 16)
  ground(d, b.x + 10, b.x + b.w - 10, yBase)
  for (const leg of legs) {
    const tx = cx + leg.dx
    const ty = yBase + leg.dy
    d.line(cx, yBase + h, tx, ty, { stroke: C.orange, lw: 1.7 })
    if (leg.ground) {
      d.poly(
        [
          [tx - 4, ty],
          [tx + 4, ty],
          [tx, ty - 6],
        ],
        { fill: C.ink },
        true
      )
    } else {
      poleElev(d, tx, yBase, h * 0.62, C.steel)
    }
  }
  poleElev(d, cx, yBase, h, capColor)
  d.text(b.x + b.w / 2, b.y + 8, caption, {
    size: 7,
    font: 'bold',
    color: C.gray,
    align: 'center',
  })
}

const s5p1: Art = (d, b) => {
  strapScene(
    d,
    b,
    [
      { dx: -52, dy: 0 },
      { dx: 52, dy: 0 },
      { dx: 30, dy: -0.5, ground: true },
    ],
    '2 LEGS TO POLE BASES + 1 TO AN ANCHOR',
    C.blue
  )
}

const s5p2: Art = (d, b) => {
  strapScene(
    d,
    b,
    [
      { dx: -58, dy: 0 },
      { dx: -26, dy: 0 },
      { dx: 58, dy: 0 },
      { dx: 24, dy: -0.5, ground: true },
    ],
    '3 LEGS TO NEIGHBOURS + 1 GROUND LEG',
    C.green
  )
}

const s5p3: Art = (d, b) => {
  const h = Math.min(b.h - 46, 58)
  const yBase = baseline(b, h + 18, 16)
  ground(d, b.x + 10, b.x + b.w - 10, yBase)
  const cx = b.x + b.w * 0.3
  poleElev(d, cx, yBase, h, C.purple)
  for (let i = 0; i < 5; i++) {
    d.line(cx - 6, yBase + h - i * (h / 5) - 3, cx + 6, yBase + h - i * (h / 5) - 8, {
      stroke: C.orange,
      lw: 1.6,
    })
  }
  d.text(cx, yBase + h + 10, 'WRAP DOWN', {
    size: 7,
    font: 'bold',
    color: C.purple,
    align: 'center',
  })

  const bx = b.x + b.w * 0.62
  for (let i = 0; i < 3; i++) {
    const px = bx + i * 34
    poleElev(d, px, yBase, h * 0.8, C.blue)
    if (i % 2 === 0) {
      d.line(px, yBase + h * 0.8, px + 22, yBase, { stroke: C.orange, lw: 1.6 })
      d.poly(
        [
          [px + 18, yBase],
          [px + 26, yBase],
          [px + 22, yBase - 6],
        ],
        { fill: C.ink },
        true
      )
    }
  }
  d.text(bx + 34, yBase + h * 0.8 + 12, 'EVERY OTHER POLE', {
    size: 7,
    font: 'bold',
    color: C.blue,
    align: 'center',
  })
}

const s5p4: Art = (d, b) => {
  const h = Math.min(b.h - 52, 62)
  const yBase = baseline(b, h + 22, 18)
  const px = b.x + 26
  ground(d, b.x + 10, b.x + b.w - 10, yBase)
  poleElev(d, px, yBase, h, C.blue)
  const ax = px + Math.min(b.w - 80, 118)
  d.line(px, yBase + h, ax, yBase, { stroke: C.orange, lw: 2 })
  d.line(ax + 12, yBase - 14, ax - 8, yBase + 10, { stroke: C.ink, lw: 3.4 })
  d.circle(ax - 8, yBase + 10, 3.4, { fill: C.ink })
  d.dimH(px, ax, yBase - 22, "7'")
  d.text(px + 26, yBase + 14, '55 deg', { size: 7, font: 'bold', color: C.orange })
  d.text(ax + 6, yBase + 16, '45 deg lean', { size: 7, font: 'bold', color: C.ink })
  d.text(b.x + b.w / 2, b.y + 4, '1/2 IN x 18 IN LAG + WASHER', {
    size: 7,
    font: 'bold',
    color: C.gray,
    align: 'center',
  })
}

// ───────────────────────── sheet 6: cloth & sign-off ─────────────────────────

const s6p1: Art = (d, b) => {
  const h = Math.min(b.h - 52, 56)
  const yBase = baseline(b, h + 30, 12)
  const x0 = b.x + 24
  const w = Math.min(b.w - 48, 190)
  ground(d, b.x + 10, b.x + b.w - 10, yBase)
  for (let i = 0; i <= 4; i++) poleElev(d, x0 + (w / 4) * i, yBase, h, C.blue)
  d.rect(x0 - 4, yBase + h - 2, w + 8, 4, { fill: C.steel })
  d.rect(x0 - 10, yBase + h + 2, w + 20, 9, { fill: C.sky, stroke: C.ink, lw: 0.8, radius: 2 })
  for (let i = 0; i <= 4; i++) {
    d.circle(x0 + (w / 4) * i, yBase + h + 2, 2.4, { fill: C.red })
  }
  d.text(b.x + b.w / 2, yBase + h + 18, 'ALUMINET - TIED AT EVERY NODE', {
    size: 7,
    font: 'bold',
    color: C.gray,
    align: 'center',
  })
}

const s6p2: Art = (d, b) => {
  const h = Math.min(b.h - 52, 54)
  const yBase = baseline(b, h + 22, 18)
  const x0 = b.x + 34
  const w = Math.min(b.w - 76, 150)
  ground(d, b.x + 10, b.x + b.w - 10, yBase)
  for (let i = 0; i <= 3; i++) poleElev(d, x0 + (w / 3) * i, yBase, h, C.blue)
  d.rect(x0 - 4, yBase + h, w + 8, 6, { fill: C.sky, stroke: C.ink, lw: 0.8 })
  d.rect(x0 - 4, yBase, 6, h, { fill: C.sand })
  for (const dy of [0.35, 0.65]) {
    d.arrow(x0 + 10, yBase + h * dy, x0 + w + 16, yBase + h * dy, {
      stroke: C.green,
      lw: 1.4,
      head: 4,
    })
  }
  d.text(x0 - 4, yBase - 12, 'WINDWARD', { size: 6.6, font: 'bold', color: C.gray })
  d.text(x0 + w + 4, yBase - 12, 'OPEN', { size: 6.6, font: 'bold', color: C.green })
  d.text(b.x + b.w / 2, b.y + 6, 'CLOSED ON ALL FOUR SIDES = PARACHUTE', {
    size: 7,
    font: 'bold',
    color: C.red,
    align: 'center',
  })
}

const s6p3: Art = (d, b) => {
  const yBase = baseline(b, 62, 16)
  ground(d, b.x + 12, b.x + b.w - 12, yBase)
  const x1 = b.x + b.w * 0.26
  d.line(x1, yBase - 6, x1 + 12, yBase + 34, { stroke: C.ink, lw: 3 })
  d.circle(x1 + 12, yBase + 36, 6.5, { fill: C.orange, stroke: C.ink, lw: 1 })
  d.text(x1 + 12, yBase + 48, 'CAP IT', {
    size: 7,
    font: 'bold',
    color: C.orange,
    align: 'center',
  })
  const x2 = b.x + b.w * 0.66
  d.rect(x2 - 4, yBase, 8, 40, { fill: C.steel })
  d.rect(x2 - 7, yBase + 40, 14, 6, { fill: C.blue, radius: 2 })
  d.text(x2, yBase + 52, 'PIPE CAP', { size: 7, font: 'bold', color: C.blue, align: 'center' })
  d.text(b.x + b.w / 2, b.y + 8, 'NOTHING SHARP, NOTHING LOOSE, NOTHING LEFT', {
    size: 7,
    font: 'bold',
    color: C.gray,
    align: 'center',
  })
}

const s6p4: Art = (d, b) => {
  const cy = b.y + b.h * 0.55
  const x0 = b.x + 24
  const w = Math.min(b.w - 70, 140)
  d.line(x0, cy, x0 + w, cy, { stroke: C.orange, lw: 3 })
  d.rect(x0 + w * 0.45, cy - 9, 26, 18, { fill: C.ink, radius: 2 })
  d.arrow(x0 + w * 0.58, cy + 16, x0 + w * 0.58, cy + 30, { stroke: C.red, lw: 1.4 })
  d.circle(b.x + b.w - 26, cy + 24, 8, { fill: C.orange })
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    d.line(
      b.x + b.w - 26 + Math.cos(a) * 11,
      cy + 24 + Math.sin(a) * 11,
      b.x + b.w - 26 + Math.cos(a) * 14,
      cy + 24 + Math.sin(a) * 14,
      { stroke: C.orange, lw: 1.3 }
    )
  }
  d.text(b.x + b.w / 2, b.y + 8, 'WALK EVERY STRAP EACH MORNING', {
    size: 7,
    font: 'bold',
    color: C.gray,
    align: 'center',
  })
}

// ───────────────────────── assembly ─────────────────────────

const ART: Record<string, Art[]> = {
  'the-frame': [s1p1, s1p2, s1p3, s1p4],
  'layout-marking': [s2p1, s2p2, s2p3, s2p4],
  'wall-assembly': [s3p1, s3p2, s3p3, s3p4],
  raising: [s4p1, s4p2, s4p3, s4p4],
  strapping: [s5p1, s5p2, s5p3, s5p4],
  'cloth-inspection': [s6p1, s6p2, s6p3, s6p4],
}

const SIDEBARS: Record<string, GuideSheet['sidebar']> = {
  'the-frame': {
    heading: 'PER-BAY KIT',
    items: [
      { badge: '1', color: C.red, title: 'Poles', lines: ['16 x 1 in EMT, 10 ft, one flange each.'] },
      { badge: '2', color: C.orange, title: 'Top rails', lines: ['15 x 10 ft EMT around the perimeter.'] },
      { badge: '3', color: C.blue, title: 'Connectors', lines: ['3-way corners and inline, 4-way at junctions.'] },
      { badge: '4', color: C.green, title: 'Straps', lines: ['1 in x 15 ft ratchet, 500 lb WLL, plus lag bolts.'] },
    ],
  },
  'layout-marking': {
    heading: 'BEFORE YOU BUILD',
    items: [
      { badge: '1', color: C.red, title: 'Corners', lines: ['Walk all four survey flags, confirm against the map.'] },
      { badge: '2', color: C.orange, title: 'Section', lines: ['Know which 50 x 30 you own and who owns the shared wall.'] },
      { badge: '3', color: C.green, title: 'Staging', lines: ['Poles, rails, connectors and straps inside the footprint.'] },
      { badge: '4', color: C.blue, title: 'Ground clear', lines: ['Nothing to trip a lift crew walking a wall up.'] },
    ],
  },
  raising: {
    heading: '8-PERSON CREW',
    items: [
      { badge: '4', color: C.red, title: 'Lifters', lines: ['Walk up the long wall, then every wall after it.'] },
      { badge: '2', color: C.blue, title: 'Holders', lines: ['Hold plumb until the L closes, then rejoin the build.'] },
      { badge: '1', color: C.green, title: 'Ladder hand', lines: ['Goes up and connects the top corner.'] },
      { badge: '1', color: C.orange, title: 'Follower', lines: ['Lags verified flanges, keeps ground assembly moving.'] },
    ],
  },
  strapping: {
    heading: 'STRAP RULES',
    items: [
      { badge: '1', color: C.red, title: 'Already hung', lines: ['Every strap went on during ground assembly.'] },
      { badge: '2', color: C.orange, title: 'Flat webbing', lines: ['A twist costs about half the strength.'] },
      { badge: '3', color: C.green, title: 'Firm, not max', lines: ['Over-cranking bows EMT and cracks fittings.'] },
      { badge: '4', color: C.blue, title: 'Dress the tail', lines: ['Roll and tie every tail or it becomes MOOP.'] },
    ],
  },
}

export function getShadeSheets(): GuideSheet[] {
  return SHADE_SHEET_TEXT.map(text => ({
    slug: text.slug,
    code: text.code,
    title: text.title,
    subtitle: text.subtitle,
    summary: text.summary,
    checklist: text.checklist,
    sidebar: SIDEBARS[text.slug],
    panels: text.panels.map((p, i) => ({
      title: p.title,
      lines: p.lines,
      draw: ART[text.slug]?.[i],
    })),
  }))
}
