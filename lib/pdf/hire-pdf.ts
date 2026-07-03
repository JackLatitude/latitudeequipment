import { readFile } from 'fs/promises'
import path from 'path'
import { PDFDocument, PDFFont, PDFPage, rgb, LineCapStyle } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'

// Runs entirely in the Node runtime — no Python, no native binaries — so it
// deploys on Vercel. Fonts + logo live in scripts/pdf-assets and are bundled
// into the serverless function via outputFileTracingIncludes in next.config.ts.

export type HirePdfData = {
  ref: string
  title: string
  status: 'draft' | 'active' | 'returned'
  client: {
    name: string
    contact_name: string | null
    email: string | null
    phone: string | null
    address: string | null
  } | null
  start_date: string | null
  end_date: string | null
  latitude_contact: string | null
  checked_out_at: string | null
  items: {
    name: string
    serial_number: string | null
    category: string | null
    checked_in: boolean
  }[]
}

type Color = ReturnType<typeof rgb>

// --- Page + brand constants (points, A4) ---
const PAGE_W = 595.28
const PAGE_H = 841.89
const MARGIN_L = 45
const MARGIN_R = 45
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R // 505.28
const HEADER_H = 80
const SLIM_BAR_H = 38
const LOGO_H = 60
const LOGO_W = LOGO_H * (1600 / 570) // ≈ 168.4
const FIRST_TOP = 104 // first content baseline region below header
const LATER_TOP = SLIM_BAR_H + 18
const BOTTOM_LIMIT = PAGE_H - 55 // content must stay above this (top-distance)

const RED = rgb(0xed / 255, 0x26 / 255, 0x43 / 255)
const BLACK = rgb(0, 0, 0)
const WHITE = rgb(1, 1, 1)
const LIGHT_GREY = rgb(0xf2 / 255, 0xf2 / 255, 0xf2 / 255)
const MID_GREY = rgb(0x88 / 255, 0x88 / 255, 0x88 / 255)
const RULE_GREY = rgb(0xdd / 255, 0xdd / 255, 0xdd / 255)

const ASSETS = path.join(process.cwd(), 'scripts', 'pdf-assets')
const FONTS = path.join(ASSETS, 'fonts')

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  const datePart = iso.slice(0, 10)
  const d = new Date(`${datePart}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const out: string[] = []
  for (const para of (text ?? '').split('\n')) {
    if (para === '') {
      out.push('')
      continue
    }
    const words = para.split(/\s+/)
    let line = ''
    for (const w of words) {
      const trial = line ? `${line} ${w}` : w
      if (!line || font.widthOfTextAtSize(trial, size) <= maxWidth) {
        line = trial
      } else {
        out.push(line)
        line = w
      }
    }
    out.push(line)
  }
  return out.length ? out : ['']
}

export async function generateHirePdf(hire: HirePdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)

  const [boldBytes, regBytes, lightBytes, logoBytes] = await Promise.all([
    readFile(path.join(FONTS, 'Metropolis-Bold.ttf')),
    readFile(path.join(FONTS, 'Metropolis-Regular.ttf')),
    readFile(path.join(FONTS, 'Metropolis-ExtraLight.ttf')),
    readFile(path.join(ASSETS, 'logo_white_full_on_black.png')),
  ])

  const bold = await doc.embedFont(boldBytes, { subset: true })
  const regular = await doc.embedFont(regBytes, { subset: true })
  const light = await doc.embedFont(lightBytes, { subset: true })
  const logo = await doc.embedPng(logoBytes)

  const pages: PDFPage[] = []

  // --- primitives (top-distance coordinate system: 0 = page top) ---
  function rect(page: PDFPage, x: number, top: number, w: number, h: number, color: Color) {
    page.drawRectangle({ x, y: PAGE_H - (top + h), width: w, height: h, color })
  }

  function text(
    page: PDFPage,
    s: string,
    xLeft: number,
    width: number,
    top: number,
    font: PDFFont,
    size: number,
    color: Color,
    align: 'left' | 'center' | 'right' = 'left'
  ) {
    if (!s) return
    const w = font.widthOfTextAtSize(s, size)
    let x = xLeft
    if (align === 'center') x = xLeft + (width - w) / 2
    else if (align === 'right') x = xLeft + (width - w)
    const ascent = font.heightAtSize(size, { descender: false })
    page.drawText(s, { x, y: PAGE_H - (top + ascent), size, font, color })
  }

  function hline(page: PDFPage, x1: number, x2: number, top: number, thickness: number, color: Color) {
    const y = PAGE_H - top
    page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness, color })
  }

  function vline(page: PDFPage, x: number, top1: number, top2: number, thickness: number, color: Color) {
    page.drawLine({ start: { x, y: PAGE_H - top1 }, end: { x, y: PAGE_H - top2 }, thickness, color })
  }

  function drawCheck(page: PDFPage, cx: number, cyTop: number, s: number, color: Color) {
    const p1 = { x: cx - 0.45 * s, y: PAGE_H - (cyTop - 0.05 * s) }
    const p2 = { x: cx - 0.12 * s, y: PAGE_H - (cyTop + 0.3 * s) }
    const p3 = { x: cx + 0.48 * s, y: PAGE_H - (cyTop - 0.35 * s) }
    const opts = { thickness: 0.9, color, lineCap: LineCapStyle.Round }
    page.drawLine({ start: p1, end: p2, ...opts })
    page.drawLine({ start: p2, end: p3, ...opts })
  }

  // --- page bars ---
  function startPage(first: boolean): PDFPage {
    const page = doc.addPage([PAGE_W, PAGE_H])
    if (first) {
      rect(page, 0, 0, PAGE_W, HEADER_H, BLACK)
      rect(page, 0, 0, PAGE_W, 3, RED)
      const logoTop = (HEADER_H - LOGO_H) / 2
      page.drawImage(logo, {
        x: MARGIN_L,
        y: PAGE_H - (logoTop + LOGO_H),
        width: LOGO_W,
        height: LOGO_H,
      })
    } else {
      rect(page, 0, 0, PAGE_W, SLIM_BAR_H, BLACK)
      rect(page, 0, 0, PAGE_W, 3, RED)
    }
    pages.push(page)
    return page
  }

  let page = startPage(true)
  let y = FIRST_TOP

  // --- title + subtitle ---
  text(page, hire.title, MARGIN_L, CONTENT_W, y, bold, 20, BLACK)
  y += 26
  const subtitle = hire.status === 'draft' ? 'EQUIPMENT HIRE — DRAFT' : 'EQUIPMENT HIRE'
  text(page, subtitle, MARGIN_L, CONTENT_W, y, light, 12, MID_GREY)
  y += 24

  // --- info table ---
  const client = hire.client
  const dates = [fmtDate(hire.start_date), fmtDate(hire.end_date)].filter(Boolean).join(' – ')
  const infoRows: [string, string][] = [['Hire Ref', hire.ref]]
  if (client) infoRows.push(['Client', client.name])
  if (client?.contact_name) infoRows.push(['Contact', client.contact_name])
  if (client?.email) infoRows.push(['Email', client.email])
  if (client?.phone) infoRows.push(['Phone', client.phone])
  if (hire.latitude_contact) infoRows.push(['Latitude Contact', hire.latitude_contact])
  if (dates) infoRows.push(['Hire Dates', dates])
  if (hire.checked_out_at) infoRows.push(['Checked Out', fmtDate(hire.checked_out_at)])
  if (client?.address) infoRows.push(['Address', client.address])

  const LABEL_W = 110
  const VALUE_W = CONTENT_W - LABEL_W
  const IPAD = 5
  const ILEAD = 11
  const infoTop = y
  let rowTop = infoTop
  infoRows.forEach(([label, value], i) => {
    const lines = wrapText(value, regular, 8.5, VALUE_W - 14)
    const rowH = IPAD * 2 + lines.length * ILEAD
    rect(page, MARGIN_L, rowTop, CONTENT_W, rowH, i % 2 === 0 ? WHITE : LIGHT_GREY)
    text(page, label, MARGIN_L + 7, LABEL_W - 14, rowTop + IPAD, bold, 8, MID_GREY)
    lines.forEach((ln, li) => {
      text(page, ln, MARGIN_L + LABEL_W + 7, VALUE_W - 14, rowTop + IPAD + li * ILEAD, regular, 8.5, BLACK)
    })
    rowTop += rowH
  })
  // grid
  let gTop = infoTop
  hline(page, MARGIN_L, MARGIN_L + CONTENT_W, infoTop, 1.5, RED)
  infoRows.forEach(([, value]) => {
    const lines = wrapText(value, regular, 8.5, VALUE_W - 14)
    const rowH = IPAD * 2 + lines.length * ILEAD
    gTop += rowH
    hline(page, MARGIN_L, MARGIN_L + CONTENT_W, gTop, 0.25, RULE_GREY)
  })
  vline(page, MARGIN_L, infoTop, gTop, 0.25, RULE_GREY)
  vline(page, MARGIN_L + LABEL_W, infoTop, gTop, 0.25, RULE_GREY)
  vline(page, MARGIN_L + CONTENT_W, infoTop, gTop, 0.25, RULE_GREY)
  y = gTop + 18

  // --- section header (H1 bar) ---
  const H1_H = 19
  rect(page, MARGIN_L, y, CONTENT_W, H1_H, BLACK)
  text(page, 'EQUIPMENT', MARGIN_L + 6, CONTENT_W, y + 5, bold, 8.5, WHITE)
  y += H1_H + 6

  // --- items table (paginated) ---
  const cols = [195, 110, 90, 55, 55]
  const colX: number[] = []
  let acc = MARGIN_L
  for (const c of cols) {
    colX.push(acc)
    acc += c
  }
  const TPAD = 5
  const TLEAD = 11
  const headers = ['Item', 'Serial No.', 'Category', 'Out', 'In']

  function drawItemsHeader(pg: PDFPage, top: number): number {
    const rowH = TPAD * 2 + TLEAD
    rect(pg, MARGIN_L, top, CONTENT_W, rowH, BLACK)
    hline(pg, MARGIN_L, MARGIN_L + CONTENT_W, top, 2, RED)
    headers.forEach((h, ci) => {
      if (ci >= 3) {
        // centered word + check mark to its right
        const word = h
        const wW = bold.widthOfTextAtSize(word, 8.5)
        const groupW = wW + 4 + 6
        const startX = colX[ci] + (cols[ci] - groupW) / 2
        text(pg, word, startX, wW, top + TPAD, bold, 8.5, WHITE)
        drawCheck(pg, startX + wW + 4 + 3, top + TPAD + 5, 7, WHITE)
      } else {
        text(pg, h, colX[ci] + 6, cols[ci] - 12, top + TPAD, bold, 8.5, WHITE, 'left')
      }
    })
    return rowH
  }

  let itemTop = y
  itemTop += drawItemsHeader(page, itemTop)
  const rowStarts: { pageIdx: number; top: number; h: number }[] = []

  hire.items.forEach((item, i) => {
    const nameLines = wrapText(item.name, regular, 8.5, cols[0] - 12)
    const catLines = wrapText(item.category ?? '', regular, 8.5, cols[2] - 12)
    const nLines = Math.max(nameLines.length, catLines.length, 1)
    const rowH = TPAD * 2 + nLines * TLEAD

    if (itemTop + rowH > BOTTOM_LIMIT) {
      page = startPage(false)
      itemTop = LATER_TOP
      itemTop += drawItemsHeader(page, itemTop)
    }

    rect(page, MARGIN_L, itemTop, CONTENT_W, rowH, i % 2 === 0 ? WHITE : LIGHT_GREY)
    nameLines.forEach((ln, li) =>
      text(page, ln, colX[0] + 6, cols[0] - 12, itemTop + TPAD + li * TLEAD, regular, 8.5, BLACK)
    )
    text(page, item.serial_number ?? '', colX[1] + 6, cols[1] - 12, itemTop + TPAD, regular, 8.5, BLACK)
    catLines.forEach((ln, li) =>
      text(page, ln, colX[2] + 6, cols[2] - 12, itemTop + TPAD + li * TLEAD, regular, 8.5, BLACK)
    )
    if (item.checked_in) {
      drawCheck(page, colX[4] + cols[4] / 2, itemTop + TPAD + 5, 9, BLACK)
    }
    rowStarts.push({ pageIdx: pages.indexOf(page), top: itemTop, h: rowH })
    itemTop += rowH
  })

  // items-table grid (per page span)
  const byPage = new Map<number, { min: number; max: number }>()
  for (const rs of rowStarts) {
    const cur = byPage.get(rs.pageIdx)
    if (!cur) byPage.set(rs.pageIdx, { min: rs.top, max: rs.top + rs.h })
    else {
      cur.min = Math.min(cur.min, rs.top)
      cur.max = Math.max(cur.max, rs.top + rs.h)
    }
  }
  for (const [pageIdx, span] of byPage) {
    const pg = pages[pageIdx]
    // header row top for this page: header sits directly above span.min
    const headerTop = span.min - (TPAD * 2 + TLEAD)
    for (const rs of rowStarts.filter((r) => r.pageIdx === pageIdx)) {
      hline(pg, MARGIN_L, MARGIN_L + CONTENT_W, rs.top + rs.h, 0.25, RULE_GREY)
    }
    hline(pg, MARGIN_L, MARGIN_L + CONTENT_W, span.min, 0.25, RULE_GREY)
    let cx = MARGIN_L
    for (let ci = 0; ci <= cols.length; ci++) {
      vline(pg, cx, headerTop, span.max, 0.25, RULE_GREY)
      if (ci < cols.length) cx += cols[ci]
    }
  }
  y = itemTop + 28

  // --- signature block ---
  const SIG_H = 100
  if (y + SIG_H > BOTTOM_LIMIT) {
    page = startPage(false)
    y = LATER_TOP
  }
  const boxW = (CONTENT_W - 15) / 2
  const boxes: [number, string][] = [
    [MARGIN_L, 'CHECKED OUT BY'],
    [MARGIN_L + boxW + 15, 'RECEIVED BY (CLIENT)'],
  ]
  for (const [bx, title] of boxes) {
    page.drawRectangle({
      x: bx,
      y: PAGE_H - (y + SIG_H),
      width: boxW,
      height: SIG_H,
      borderColor: RULE_GREY,
      borderWidth: 0.5,
    })
    text(page, title, bx + 12, boxW - 24, y + 12, bold, 8, MID_GREY)
    const lines = ['Name:', 'Signature:', 'Date:']
    lines.forEach((ln, li) => {
      const lineY = y + 34 + li * 20
      text(page, ln, bx + 12, boxW - 24, lineY, regular, 9.5, BLACK)
      const labelW = regular.widthOfTextAtSize(`${ln} `, 9.5)
      hline(page, bx + 12 + labelW, bx + boxW - 12, lineY + 11, 0.5, RULE_GREY)
    })
  }

  // --- footers (all pages, with page numbers) ---
  const total = pages.length
  pages.forEach((pg, i) => {
    pg.drawLine({
      start: { x: MARGIN_L, y: 42 },
      end: { x: PAGE_W - MARGIN_R, y: 42 },
      thickness: 1,
      color: RED,
    })
    pg.drawText('Latitude Equipment  |  latitudeequipment.com', {
      x: MARGIN_L,
      y: 30,
      size: 7.5,
      font: light,
      color: MID_GREY,
    })
    const pageLabel = `Page ${i + 1} of ${total}`
    const lw = light.widthOfTextAtSize(pageLabel, 7.5)
    pg.drawText(pageLabel, {
      x: PAGE_W - MARGIN_R - lw,
      y: 30,
      size: 7.5,
      font: light,
      color: MID_GREY,
    })
  })

  return doc.save()
}
