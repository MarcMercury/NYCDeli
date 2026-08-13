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
  const r = fit(b, 50 / 30, 170, 22, 12)
  bayPlan(d, r)
  d.line(r.x - 16, r.y - 8, r.x + r.w + 16, r.y - 8, { stroke: C.ink, lw: 2.4 })
  d.text(r.x + r.w / 2, r.y - 19, 'CAMP FRONTAGE LINE', {
    size: 6.8,
    font: 'bold',
    align: 'center',
  })
  for (const [fx, fy] of [
    [r.x, r.y],
    [r.x + r.w, r.y],
    [r.x, r.y + r.h],
    [r.x + r.w, r.y + r.h],
  ]) {
    flagStake(d, fx, fy, C.red, 13)
  }
  d.dimH(r.x, r.x + r.w, r.y + r.h + 12, "50'")
  d.dimV(r.y, r.y + r.h, r.x - 15, "30'")
}

const s2p2: Art = (d, b) => {
  const r = fit(b, 50 / 30, 168, 18, 10)
  bayPlan(d, r)
  d.line(r.x, r.y, r.x + r.w, r.y + r.h, { stroke: C.red, lw: 1.3, dash: [4, 2.6] })
  d.line(r.x, r.y + r.h, r.x + r.w, r.y, { stroke: C.red, lw: 1.3, dash: [4, 2.6] })
  const w = 46
  d.rect(r.x + r.w / 2 - w / 2, r.y + r.h / 2 - 6, w, 13, { fill: C.white, stroke: C.red, lw: 1 })
  d.text(r.x + r.w / 2, r.y + r.h / 2 - 2.6, '58\' 4"', {
    size: 8,
    font: 'bold',
    color: C.red,
    align: 'center',
  })
  tick(d, r.x + r.w + 14, r.y + r.h - 6, true)
  d.text(r.x + r.w / 2, r.y - 14, 'BOTH DIAGONALS MUST MATCH WITHIN 1 IN', {
    size: 6.8,
    font: 'bold',
    color: C.gray,
    align: 'center',
  })
}

const s2p3: Art = (d, b) => {
  const r = fit(b, 50 / 30, 168, 22, 10)
  bayPlan(d, r)
  for (let i = 0; i <= 5; i++) {
    const x = r.x + (r.w / 5) * i
    flagStake(d, x, r.y + r.h, C.red, 11)
    flagStake(d, x, r.y, C.orange, 11)
  }
  for (let i = 1; i <= 2; i++) {
    const y = r.y + (r.h / 3) * i
    flagStake(d, r.x, y, C.blue, 11)
    flagStake(d, r.x + r.w, y, C.blue, 11)
  }
  d.dimH(r.x, r.x + r.w / 5, r.y - 13, "10'", C.red)
  d.text(r.x + r.w / 2 + 20, r.y - 13, 'every post point gets a flag', {
    size: 7,
    color: C.gray,
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
  const cx = b.x + b.w / 2
  const h = Math.min(b.h - 46, 60)
  const yBase = baseline(b, h + 16, 16)
  ground(d, b.x + 16, b.x + b.w - 16, yBase)
  d.rect(cx - 3, yBase, 6, h, { fill: C.steel })
  d.rect(cx - 16, yBase - 5, 32, 6, { fill: C.ink, radius: 1.5 })
  for (const dx of [-11, 11]) d.circle(cx + dx, yBase - 2, 1.8, { fill: C.white })
  flagStake(d, cx + 34, yBase, C.red, 12)
  d.text(cx + 44, yBase + 2, 'flag mark', { size: 7, color: C.gray })
  d.text(cx, b.y + 8, 'FLANGE LANDS ON THE FLAG, NOT NEAR IT', {
    size: 7,
    font: 'bold',
    color: C.gray,
    align: 'center',
  })
}

// ───────────────────────── sheet 4: raising ─────────────────────────

const s4p1: Art = (d, b) => {
  const yBase = baseline(b, 92, 16)
  ground(d, b.x + 8, b.x + b.w - 8, yBase)
  const x0 = b.x + 30
  const len = Math.min(b.w - 60, 150)
  const ang = (38 * Math.PI) / 180
  d.line(x0, yBase, x0 + Math.cos(ang) * len, yBase + Math.sin(ang) * len, {
    stroke: C.steel,
    lw: 5,
  })
  for (let i = 1; i <= 3; i++) {
    const t = (i / 4) * len
    const px = x0 + Math.cos(ang) * t
    const py = yBase + Math.sin(ang) * t
    d.line(px, py, px + 10, py - 22, { stroke: C.steel, lw: 3 })
  }
  d.arrow(x0 + len * 0.92, yBase + 8, x0 + len * 0.78, yBase + len * 0.72, {
    stroke: C.red,
    lw: 1.6,
    head: 5,
  })
  figure(d, b.x + 26, yBase, 30, C.red)
  figure(d, b.x + 62, yBase, 30, C.orange)
  figure(d, b.x + 98, yBase, 30, C.green)
  d.text(b.x + b.w / 2, b.y + 8, 'ONE LIFTER AT EVERY OTHER POLE', {
    size: 7,
    font: 'bold',
    color: C.gray,
    align: 'center',
  })
}

const s4p2: Art = (d, b) => {
  const h = Math.min(b.h - 46, 62)
  const yBase = baseline(b, h + 14, 16)
  ground(d, b.x + 8, b.x + b.w - 8, yBase)
  const drawWall = (x0: number, w: number) => {
    for (let i = 0; i <= 3; i++) poleElev(d, x0 + (w / 3) * i, yBase, h, C.blue)
    d.rect(x0 - 3, yBase + h - 2, w + 6, 4, { fill: C.steel })
  }
  drawWall(b.x + 24, b.w * 0.32)
  drawWall(b.x + b.w * 0.52, b.w * 0.32)
  d.arrow(b.x + 24 + b.w * 0.34, yBase + h * 0.55, b.x + b.w * 0.5, yBase + h * 0.55, {
    stroke: C.red,
    lw: 1.3,
    dash: [3, 2],
    heads: 'both',
  })
  d.text(b.x + b.w / 2, b.y + 8, 'BOTH LONG WALLS UP AND HELD PLUMB', {
    size: 7,
    font: 'bold',
    color: C.gray,
    align: 'center',
  })
}

const s4p3: Art = (d, b) => {
  const r = fit(b, 50 / 30, 168, 20, 10)
  bayPlan(d, r, { posts: true })
  d.arrow(r.x - 26, r.y + r.h / 2, r.x - 4, r.y + r.h / 2, { stroke: C.red, lw: 1.6, head: 5 })
  d.arrow(r.x + r.w + 26, r.y + r.h / 2, r.x + r.w + 4, r.y + r.h / 2, {
    stroke: C.red,
    lw: 1.6,
    head: 5,
  })
  d.line(r.x, r.y, r.x, r.y + r.h, { stroke: C.red, lw: 2.6 })
  d.line(r.x + r.w, r.y, r.x + r.w, r.y + r.h, { stroke: C.red, lw: 2.6 })
  d.text(r.x + r.w / 2, r.y + r.h / 2 - 3, 'END RAILS IN LAST', {
    size: 7.4,
    font: 'bold',
    color: C.red,
    align: 'center',
  })
}

const s4p4: Art = (d, b) => {
  const r = fit(b, 50 / 30, 150, 20, 10)
  bayPlan(d, r)
  d.line(r.x, r.y, r.x + r.w, r.y + r.h, { stroke: C.red, lw: 1.2, dash: [4, 2.6] })
  d.line(r.x, r.y + r.h, r.x + r.w, r.y, { stroke: C.red, lw: 1.2, dash: [4, 2.6] })
  tick(d, r.x + r.w / 2, r.y + r.h / 2, true)
  const px = r.x + r.w + 34
  d.rect(px - 2.5, r.y, 5, r.h, { fill: C.steel })
  d.line(px + 12, r.y + r.h, px + 12, r.y, { stroke: C.blue, lw: 1, dash: [3, 2] })
  d.circle(px + 12, r.y + 4, 3, { fill: C.blue })
  d.text(px + 18, r.y + r.h / 2, 'plumb', { size: 7, font: 'bold', color: C.blue })
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
    heading: '4-PERSON CREW',
    items: [
      { badge: '1', color: C.red, title: 'Tape lead', lines: ['Pulls and holds the long baseline.'] },
      { badge: '2', color: C.orange, title: 'Tape tail', lines: ['Holds the far end, keeps it tight.'] },
      { badge: '3', color: C.green, title: 'Diagonal', lines: ['Checks 58 ft 4 in on both diagonals.'] },
      { badge: '4', color: C.blue, title: 'Flagger', lines: ['Places a flag at every 10 ft post point.'] },
    ],
  },
  raising: {
    heading: '6-PERSON LIFT',
    items: [
      { badge: '1', color: C.red, title: 'Caller', lines: ['Owns the plan, calls the lift out loud.'] },
      { badge: '2', color: C.orange, title: 'Lifters x4', lines: ['One at every other pole, lift together.'] },
      { badge: '3', color: C.blue, title: 'Holders x2', lines: ['Hold plumb until the wall is tied.'] },
      { badge: '4', color: C.green, title: 'Rail runner', lines: ['Walks end rails into the open ports.'] },
    ],
  },
  strapping: {
    heading: 'STRAP RULES',
    items: [
      { badge: '1', color: C.red, title: 'Flat webbing', lines: ['A twist costs about half the strength.'] },
      { badge: '2', color: C.orange, title: 'Firm, not max', lines: ['Over-cranking bows EMT and cracks fittings.'] },
      { badge: '3', color: C.green, title: 'Dress the tail', lines: ['Roll and tie every tail or it becomes MOOP.'] },
      { badge: '4', color: C.blue, title: 'Inspect', lines: ['Retire any strap that is frayed or faded.'] },
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
