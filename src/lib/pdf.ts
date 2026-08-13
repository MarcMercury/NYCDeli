/**
 * Minimal, dependency-free PDF writer for text-only documents.
 *
 * Letter portrait, Helvetica / Helvetica-Bold, WinAnsi. Enough to lay out
 * printable field instructions (headings, paragraphs, bullets, numbered steps,
 * key/value spec rows, callout boxes) without pulling in a PDF library.
 */

const PAGE_W = 612
const PAGE_H = 792
const MARGIN_X = 54
const CONTENT_W = PAGE_W - MARGIN_X * 2
const TOP_Y = PAGE_H - 64
const BOTTOM_Y = 56

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

export type PdfFont = 'reg' | 'bold'

export type PdfBlock =
  | { type: 'h'; text: string }
  | { type: 'p'; text: string }
  | { type: 'bullet'; text: string }
  | { type: 'step'; title: string; text?: string }
  | { type: 'kv'; label: string; value: string }
  | { type: 'note'; text: string }
  | { type: 'divider' }
  | { type: 'space' }

export interface PdfSheet {
  code: string
  title: string
  subtitle?: string
  blocks: PdfBlock[]
}

export interface PdfDocSpec {
  runningHead: string
  sheets: PdfSheet[]
}

/** Fold typographic characters down to WinAnsi-safe ASCII. */
function ascii(input: string): string {
  return input
    .replace(/[\u2018\u2019\u201B]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013]/g, '-')
    .replace(/[\u2014]/g, ' - ')
    .replace(/[\u2026]/g, '...')
    .replace(/[\u00D7]/g, 'x')
    .replace(/[\u00B0]/g, ' deg')
    .replace(/[\u2033\u201F]/g, '"')
    .replace(/[\u2032]/g, "'")
    .replace(/[\u00B1]/g, '+/-')
    .replace(/[\u2022]/g, '-')
    .replace(/[\u2192]/g, '->')
    .replace(/[^\x20-\x7E\n]/g, '')
}

function textWidth(s: string, size: number, font: PdfFont): number {
  const table = font === 'bold' ? W_BOLD : W_REG
  let total = 0
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i)
    total += code >= 32 && code <= 126 ? table[code - 32] : 500
  }
  return (total * size) / 1000
}

function wrap(s: string, size: number, font: PdfFont, maxW: number): string[] {
  const words = s.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (textWidth(candidate, size, font) <= maxW || !line) {
      line = candidate
    } else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  return lines.length > 0 ? lines : ['']
}

function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

class Page {
  ops: string[] = []

  text(x: number, y: number, s: string, size: number, font: PdfFont, gray = 0) {
    if (!s) return
    this.ops.push(
      `BT /${font === 'bold' ? 'F2' : 'F1'} ${size} Tf ${gray} g ${x.toFixed(2)} ${y.toFixed(2)} Td (${esc(s)}) Tj ET`
    )
  }

  rect(x: number, y: number, w: number, h: number, gray: number) {
    this.ops.push(`${gray} g ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`)
  }

  line(x1: number, y1: number, x2: number, y2: number, width: number, gray: number) {
    this.ops.push(
      `${gray} G ${width} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`
    )
  }
}

export function buildPdf(spec: PdfDocSpec): Uint8Array {
  const pages: Page[] = []
  let page = new Page()
  let y = TOP_Y
  let sheetLabel = ''

  const head = ascii(spec.runningHead)

  const startPage = () => {
    page = new Page()
    pages.push(page)
    page.rect(0, PAGE_H - 34, PAGE_W, 34, 0.92)
    page.text(MARGIN_X, PAGE_H - 22, head, 8, 'bold', 0.25)
    const right = ascii(sheetLabel)
    page.text(PAGE_W - MARGIN_X - textWidth(right, 8, 'reg'), PAGE_H - 22, right, 8, 'reg', 0.35)
    page.line(MARGIN_X, BOTTOM_Y - 14, PAGE_W - MARGIN_X, BOTTOM_Y - 14, 0.5, 0.75)
    y = TOP_Y
  }

  const need = (h: number) => {
    if (y - h < BOTTOM_Y) startPage()
  }

  for (const sheet of spec.sheets) {
    sheetLabel = `${sheet.code} - ${sheet.title}`
    startPage()

    // Sheet title block
    page.rect(MARGIN_X, y - 4, CONTENT_W, 3, 0)
    y -= 22
    page.text(MARGIN_X, y, ascii(sheet.code), 10, 'bold', 0.45)
    y -= 26
    for (const l of wrap(ascii(sheet.title), 22, 'bold', CONTENT_W)) {
      page.text(MARGIN_X, y, l, 22, 'bold')
      y -= 26
    }
    if (sheet.subtitle) {
      y -= 2
      for (const l of wrap(ascii(sheet.subtitle), 10, 'reg', CONTENT_W)) {
        page.text(MARGIN_X, y, l, 10, 'reg', 0.35)
        y -= 13
      }
    }
    y -= 8
    page.line(MARGIN_X, y, PAGE_W - MARGIN_X, y, 1, 0.6)
    y -= 20

    let stepNo = 0

    for (const block of sheet.blocks) {
      switch (block.type) {
        case 'h': {
          stepNo = 0
          need(34)
          y -= 6
          page.text(MARGIN_X, y, ascii(block.text).toUpperCase(), 11, 'bold')
          y -= 6
          page.line(MARGIN_X, y, PAGE_W - MARGIN_X, y, 0.5, 0.8)
          y -= 14
          break
        }
        case 'p': {
          const lines = wrap(ascii(block.text), 9.5, 'reg', CONTENT_W)
          for (const l of lines) {
            need(13)
            page.text(MARGIN_X, y, l, 9.5, 'reg', 0.1)
            y -= 13
          }
          y -= 4
          break
        }
        case 'bullet': {
          const lines = wrap(ascii(block.text), 9.5, 'reg', CONTENT_W - 14)
          lines.forEach((l, i) => {
            need(13)
            if (i === 0) page.text(MARGIN_X + 2, y, '-', 9.5, 'bold', 0.1)
            page.text(MARGIN_X + 14, y, l, 9.5, 'reg', 0.1)
            y -= 13
          })
          y -= 2
          break
        }
        case 'step': {
          stepNo += 1
          need(30)
          const num = `${stepNo}`
          page.rect(MARGIN_X, y - 3, 14, 14, 0)
          page.text(MARGIN_X + 7 - textWidth(num, 9, 'bold') / 2, y, num, 9, 'bold', 1)
          const titleLines = wrap(ascii(block.title), 10, 'bold', CONTENT_W - 22)
          titleLines.forEach((l, i) => {
            if (i > 0) need(13)
            page.text(MARGIN_X + 22, y, l, 10, 'bold')
            y -= 13
          })
          if (block.text) {
            for (const l of wrap(ascii(block.text), 9.5, 'reg', CONTENT_W - 22)) {
              need(13)
              page.text(MARGIN_X + 22, y, l, 9.5, 'reg', 0.15)
              y -= 13
            }
          }
          y -= 6
          break
        }
        case 'kv': {
          const labelW = 150
          const valueLines = wrap(ascii(block.value), 9.5, 'reg', CONTENT_W - labelW - 8)
          need(Math.max(13, valueLines.length * 13))
          const rowTop = y + 10
          page.line(MARGIN_X, rowTop, PAGE_W - MARGIN_X, rowTop, 0.4, 0.85)
          page.text(MARGIN_X, y, ascii(block.label), 9, 'bold', 0.1)
          valueLines.forEach((l, i) => {
            if (i > 0) need(13)
            page.text(MARGIN_X + labelW, y, l, 9.5, 'reg', 0.1)
            y -= 13
          })
          break
        }
        case 'note': {
          const lines = wrap(ascii(block.text), 9.5, 'bold', CONTENT_W - 22)
          const boxH = lines.length * 13 + 12
          need(boxH + 6)
          page.rect(MARGIN_X, y + 11 - boxH, CONTENT_W, boxH, 0.9)
          page.rect(MARGIN_X, y + 11 - boxH, 4, boxH, 0.1)
          let ly = y
          for (const l of lines) {
            page.text(MARGIN_X + 14, ly, l, 9.5, 'bold', 0)
            ly -= 13
          }
          y = y - boxH - 4
          break
        }
        case 'divider': {
          need(16)
          y -= 4
          page.line(MARGIN_X, y, PAGE_W - MARGIN_X, y, 0.5, 0.8)
          y -= 12
          break
        }
        case 'space': {
          y -= 10
          break
        }
      }
    }
  }

  // Footers (page numbers) once the total is known.
  pages.forEach((p, i) => {
    const label = `Page ${i + 1} of ${pages.length}`
    p.text(MARGIN_X, BOTTOM_Y - 26, head, 7.5, 'reg', 0.5)
    p.text(PAGE_W - MARGIN_X - textWidth(label, 7.5, 'reg'), BOTTOM_Y - 26, label, 7.5, 'reg', 0.5)
  })

  return serialize(pages)
}

function serialize(pages: Page[]): Uint8Array {
  const enc = new TextEncoder()
  const chunks: Uint8Array[] = []
  const offsets: number[] = []
  let length = 0

  const push = (s: string) => {
    const bytes = enc.encode(s)
    chunks.push(bytes)
    length += bytes.length
  }

  const objectCount = 4 + pages.length * 2
  const pageObjId = (i: number) => 5 + i * 2
  const contentObjId = (i: number) => 6 + i * 2

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

  pages.forEach((p, i) => {
    obj(
      pageObjId(i),
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjId(i)} 0 R >>`
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
