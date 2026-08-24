/**
 * Asset Generator using Resvg
 * Pure in-memory generation is the core; filesystem writes are a thin CLI wrapper.
 */

import { mkdir, readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { createRequire } from 'module'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  contrastingTextColor,
  FALLBACK_PRIMARY_COLOR,
  isDarkColor,
  parseCssColorToRgb,
  toSvgHex,
} from './css-color.js'
import { svgToPng as rasterizeSvg } from './rasterize.js'

/** Inline on every <text> — Resvg often ignores CSS <style> font-family on Lambda. */
const SVG_FONT_FAMILY = 'DejaVu Sans, Arial, Helvetica, sans-serif'

const SYSTEM_FONT_FILES = [
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
  '/usr/share/fonts/TTF/DejaVuSans.ttf',
  '/usr/share/fonts/dejavu/DejaVuSans.ttf',
  '/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf',
  '/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf',
]

function safeModuleDir() {
  try {
    const metaUrl = import.meta?.url
    if (typeof metaUrl === 'string' && metaUrl.length > 0) {
      return path.dirname(fileURLToPath(metaUrl))
    }
  } catch {
    // Netlify/esbuild may leave import.meta.url undefined.
  }
  return null
}

function bundledFontCandidates() {
  const candidates = []
  const moduleDir = safeModuleDir()
  if (moduleDir) {
    candidates.push(
      path.join(moduleDir, '../fonts/DejaVuSans.ttf'),
      path.join(moduleDir, '../fonts/DejaVuSans-Bold.ttf'),
    )
  }

  // Prefer resolving via installed package root (works when import.meta.url is stripped).
  try {
    const requireFromCwd = createRequire(path.join(process.cwd(), 'package.json'))
    const pkgJson = requireFromCwd.resolve('uink-brand-cli/package.json')
    const root = path.dirname(pkgJson)
    candidates.push(
      path.join(root, 'fonts/DejaVuSans.ttf'),
      path.join(root, 'fonts/DejaVuSans-Bold.ttf'),
    )
  } catch {
    // Package may be vendored under a path Node can't resolve yet.
  }

  // Common Netlify / monorepo layouts.
  candidates.push(
    path.join(process.cwd(), 'vendor/uink-brand-cli/fonts/DejaVuSans.ttf'),
    path.join(process.cwd(), 'vendor/uink-brand-cli/fonts/DejaVuSans-Bold.ttf'),
    path.join(process.cwd(), 'node_modules/uink-brand-cli/fonts/DejaVuSans.ttf'),
    path.join(process.cwd(), 'node_modules/uink-brand-cli/fonts/DejaVuSans-Bold.ttf'),
  )

  return candidates
}

function resolveFontFiles() {
  return [...bundledFontCandidates(), ...SYSTEM_FONT_FILES]
    .filter((filePath) => typeof filePath === 'string' && filePath.length > 0 && existsSync(filePath))
}

function svgToPng(svgString, width) {
  return rasterizeSvg(svgString, width, { fontFiles: resolveFontFiles() })
}

function wrapTextToWidth(text, maxWidth, fontSize) {
  if (!text) return ['']

  const words = String(text).trim().split(/\s+/)
  const lines = []
  let currentLine = ''

  const estimateWidth = (value) => value.length * fontSize * 0.55

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word
    if (estimateWidth(nextLine) <= maxWidth) {
      currentLine = nextLine
    } else {
      if (currentLine) lines.push(currentLine)
      currentLine = word
    }
  }

  if (currentLine) lines.push(currentLine)
  return lines.length ? lines : ['']
}

function extnameNormalized(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  return ext === '.jpeg' ? '.jpg' : ext
}

function mimeForExtension(ext) {
  const map = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
  }
  return map[ext] || 'application/octet-stream'
}

function extensionFromMime(mime) {
  const map = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
    'image/x-icon': '.ico',
    'image/vnd.microsoft.icon': '.ico',
  }
  return map[mime?.toLowerCase()] || '.png'
}

function parseDataUri(dataUri) {
  const match = String(dataUri).match(/^data:([^;,]+)?(?:;[^,]*)?;base64,(.+)$/s)
  if (!match) {
    throw new Error('Invalid data URI')
  }
  const mime = match[1] || 'application/octet-stream'
  const buffer = Buffer.from(match[2], 'base64')
  return { mime, buffer }
}

/**
 * Resolve an image source to a data URI.
 * Accepts data URLs, Buffers, or filesystem paths.
 */
export async function resolveImageSource(source) {
  if (source == null) return null

  if (typeof source === 'string' && source.startsWith('data:')) {
    return source
  }

  if (Buffer.isBuffer(source)) {
    return `data:image/png;base64,${source.toString('base64')}`
  }

  if (typeof source === 'string') {
    const buffer = await readFile(source)
    const mime = mimeForExtension(extnameNormalized(source))
    return `data:${mime};base64,${buffer.toString('base64')}`
  }

  return null
}

function findFirstExisting(fileMap, names) {
  for (const name of names) {
    if (fileMap.has(name)) return name
  }
  return null
}

function hexToHsl(hex) {
  const rgb = parseCssColorToRgb(hex)
  if (!rgb) return [0, 0, 50]
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l * 100]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
    case g: h = ((b - r) / d + 2) / 6; break
    default: h = ((r - g) / d + 4) / 6
  }
  return [h * 360, s * 100, l * 100]
}

function hslToHex(h, s, l) {
  h /= 360; s /= 100; l /= 100
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  let r, g, b
  if (s === 0) {
    r = g = b = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  return '#' + [r, g, b].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('')
}

function brighterColor(hex, lightnessBoost = 24) {
  try {
    const [h, s, l] = hexToHsl(hex)
    return hslToHex(Math.min(360, h + 20), Math.min(100, s + 6), Math.min(90, l + lightnessBoost))
  } catch {
    return hex
  }
}

function lightSheetInk(textColor) {
  return {
    descOpacity: 0.62,
    urlOpacity: 0.48,
    pillFill: textColor,
    pillFillOpacity: 0.07,
    pillText: textColor,
    pillTextOpacity: 0.55,
  }
}

function darkSheetInk(textColor) {
  return {
    descOpacity: 0.82,
    urlOpacity: 0.7,
    pillFill: '#ffffff',
    pillFillOpacity: 0.16,
    pillText: textColor,
    pillTextOpacity: 0.92,
  }
}

function formatSiteUrlForDisplay(siteUrl) {
  if (!siteUrl) return ''
  const display = String(siteUrl)
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '')
  // Parser falls back to example.com when unset — hide that placeholder on OG.
  if (!display || display === 'example.com') return ''
  return display
}

function formatVersionTag(version) {
  if (!version) return null
  const normalized = String(version).trim().replace(/^v/i, '')
  if (!normalized || normalized === '0.0.0') return null
  return `v${normalized}`
}

export function resolveOgThemePalette(theme, brandData) {
  const primary = toSvgHex(brandData.colors.primary, FALLBACK_PRIMARY_COLOR)
  const primaryBright = brighterColor(primary)
  const preferredText = brandData.colors.text || '#251f1f'
  const textOnWhite = contrastingTextColor('#ffffff', preferredText)

  if (theme === 'white') {
    return {
      id: 'white',
      bgSolid: '#f7f5f4',
      useGradient: false,
      showDots: false,
      sheetFill: '#ffffff',
      textColor: textOnWhite,
      ...lightSheetInk(textOnWhite),
      descOpacity: 0.55,
      urlOpacity: 0.42,
      pillFillOpacity: 0.06,
      initialsFill: primary,
      sheetShadowOpacity: 0.08,
    }
  }

  if (theme === 'dark') {
    const sheetFill = '#221e1e'
    const textColor = '#f6f2f2'
    return {
      id: 'dark',
      bgSolid: '#171414',
      useGradient: false,
      showDots: true,
      sheetFill,
      textColor,
      ...darkSheetInk(textColor),
      initialsFill: '#ffffff',
      sheetShadowOpacity: 0.28,
    }
  }

  const sheetFill = toSvgHex(brandData.colors.background, '#ffffff')
  const textColor = contrastingTextColor(sheetFill, preferredText)
  const sheetIsDark = isDarkColor(sheetFill)
  const ink = sheetIsDark ? darkSheetInk(textColor) : lightSheetInk(textColor)

  return {
    id: 'primary',
    gradientFrom: primary,
    gradientTo: primaryBright,
    useGradient: true,
    showDots: true,
    sheetFill,
    textColor,
    ...ink,
    initialsFill: sheetFill,
    sheetShadowOpacity: sheetIsDark ? 0.28 : 0.14,
  }
}

function resolveIconThemeColors(theme, brandData) {
  const palette = resolveOgThemePalette(theme || 'primary', brandData)
  const primary = toSvgHex(brandData.colors.primary, FALLBACK_PRIMARY_COLOR)

  if (theme === 'white') {
    return {
      bgColor: '#ffffff',
      fgColor: primary,
      lettermarkBg: '#ffffff',
      lettermarkFg: primary,
      maskableBg: '#ffffff',
    }
  }

  if (theme === 'dark') {
    return {
      bgColor: palette.sheetFill,
      fgColor: palette.textColor,
      lettermarkBg: palette.sheetFill,
      lettermarkFg: palette.textColor,
      maskableBg: palette.bgSolid,
    }
  }

  return {
    bgColor: primary,
    fgColor: palette.sheetFill,
    lettermarkBg: primary,
    lettermarkFg: palette.sheetFill,
    maskableBg: primary,
  }
}

function titleBlockHeight(lines, lineHeight) {
  return Math.max(0, (lines.length - 1) * lineHeight)
}

function escapeXml(text) {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Generate 1200x630 Open Graph image buffer.
 * ogOptions.theme: 'primary' | 'white' | 'dark'
 * ogOptions.showDots: boolean — overrides theme default when set
 * ogOptions.logoShape: 'square' | 'rounded' | 'circular' | 'off' — mask crop for logo; 'off' hides logo and expands the sheet
 */
async function generateOgImageBuffer(brandData, source = null, ogOptions = {}) {
  const width = 1200
  const height = 630
  const dataUri = source ? await resolveImageSource(source) : null
  const initials = (brandData.siteTitle || brandData.name || 'XX').substring(0, 2).toUpperCase()
  const theme = resolveOgThemePalette(ogOptions.theme || 'primary', brandData)
  const showDots = typeof ogOptions.showDots === 'boolean' ? ogOptions.showDots : theme.showDots
  const logoShape = ['square', 'rounded', 'circular', 'off'].includes(ogOptions.logoShape)
    ? ogOptions.logoShape
    : 'square'
  const showLogo = logoShape !== 'off'

  const margin = 60
  const leftColWidth = showLogo ? 392 : 0
  const sheetX = showLogo ? leftColWidth : margin
  const sheetY = margin
  const sheetWidth = showLogo ? width - leftColWidth - margin : width - margin * 2
  const sheetHeight = height - margin * 2

  const leftPad = sheetX + margin
  const textMaxWidth = Math.max(200, sheetWidth - margin * 2)
  const titleFontSize = Number.isFinite(ogOptions.titleFontSize) ? ogOptions.titleFontSize : 80
  const descFontSize = Number.isFinite(ogOptions.descFontSize) ? ogOptions.descFontSize : 34
  const urlFontSize = Number.isFinite(ogOptions.urlFontSize) ? ogOptions.urlFontSize : 26
  const pillFontSize = Number.isFinite(ogOptions.pillFontSize) ? ogOptions.pillFontSize : 28

  const displayUrl = formatSiteUrlForDisplay(brandData.siteUrl)
  const titleLines = wrapTextToWidth(brandData.siteTitle, textMaxWidth, titleFontSize)
  const descLines = wrapTextToWidth(brandData.description || brandData.siteTitle, textMaxWidth, descFontSize)

  const titleLineHeight = Math.round(titleFontSize * 1)
  const descLineHeight = Math.round(descFontSize * 1.24)
  const pillH = 52
  // Baseline→baseline must clear title descent + padding + description ascent.
  const titleDescent = Math.round(titleFontSize * 0.22)
  const titleDescGap = Math.round(Math.max(32, descFontSize * 0.95))
  const titleCapH = Math.round(titleFontSize * 0.72)
  const descCapH = Math.round(descFontSize * 0.72)
  const pillY = sheetY + sheetHeight - 100
  const urlY = pillY + pillH / 2
  const urlX = sheetX + sheetWidth - margin

  // Vertically center title + description in the sheet area above the footer.
  const titleToDescBaseline =
    titleBlockHeight(titleLines, titleLineHeight) + titleDescent + titleDescGap + descCapH
  const totalBlockH = titleCapH
    + titleToDescBaseline
    + titleBlockHeight(descLines, descLineHeight)
  const availableTop = sheetY + 72
  const availableBottom = pillY - 48
  const titleStartY = Math.round(
    availableTop + Math.max(0, (availableBottom - availableTop - totalBlockH) / 2),
  ) + titleCapH
  const descStartY = titleStartY + titleToDescBaseline

  const logoSize = 280
  const logoHalf = logoSize / 2
  const logoRx = logoShape === 'circular'
    ? logoHalf
    : logoShape === 'rounded'
      ? 40
      : 0
  // Keep monogram inside the logo box with comfortable padding.
  const initialsFontSize = Math.round(logoSize * (initials.length <= 1 ? 0.52 : 0.4))

  const leftColContent = dataUri
    ? `<image href="${dataUri}" x="${-logoHalf}" y="${-logoHalf}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet"/>`
    : `<text x="0" y="0" font-size="${initialsFontSize}" font-weight="800" fill="${theme.initialsFill}" text-anchor="middle" dominant-baseline="central" letter-spacing="-2" font-family="${SVG_FONT_FAMILY}">${escapeXml(initials)}</text>`

  const bgLayer = theme.useGradient
    ? `<rect width="100%" height="100%" fill="url(#bgGrad)" />`
    : `<rect width="100%" height="100%" fill="${theme.bgSolid}" />`

  const dotsLayer = showDots
    ? `<rect width="100%" height="100%" fill="url(#dotGrid)" />`
    : ''

  const gradientDef = theme.useGradient
    ? `<linearGradient id="bgGrad" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%" stop-color="${theme.gradientFrom}"/>
      <stop offset="100%" stop-color="${theme.gradientTo}"/>
    </linearGradient>`
    : ''

  const logoClipDef = showLogo
    ? `<clipPath id="logoClip">
      <rect x="${-logoHalf}" y="${-logoHalf}" width="${logoSize}" height="${logoSize}" rx="${logoRx}" ry="${logoRx}"/>
    </clipPath>`
    : ''

  const logoLayer = showLogo
    ? `<g transform="translate(${leftColWidth / 2}, ${height / 2})" clip-path="url(#logoClip)">
    ${leftColContent}
  </g>`
    : ''

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${gradientDef}
    <pattern id="dotGrid" x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse">
      <circle cx="1.5" cy="1.5" r="1.5" fill="#ffffff" opacity="0.18"/>
    </pattern>
    ${logoClipDef}
    <filter id="sheet-shadow" x="-4%" y="-4%" width="108%" height="114%">
      <feDropShadow dx="0" dy="10" stdDeviation="18" flood-color="#000000" flood-opacity="${theme.sheetShadowOpacity}"/>
    </filter>
  </defs>

  ${bgLayer}
  ${dotsLayer}

  <rect x="${sheetX}" y="${sheetY}" width="${sheetWidth}" height="${sheetHeight}" rx="40" fill="${theme.sheetFill}" filter="url(#sheet-shadow)" />

  ${logoLayer}

  ${titleLines.map((line, i) => `
  <text x="${leftPad}" y="${titleStartY + (i * titleLineHeight)}" font-size="${titleFontSize}" font-weight="800" fill="${theme.textColor}" letter-spacing="-1.2" font-family="${SVG_FONT_FAMILY}">${escapeXml(line)}</text>
  `).join('')}

  ${descLines.map((line, i) => `
  <text x="${leftPad}" y="${descStartY + (i * descLineHeight)}" font-size="${descFontSize}" font-weight="400" fill="${theme.textColor}" opacity="${theme.descOpacity}" font-family="${SVG_FONT_FAMILY}">${escapeXml(line)}</text>
  `).join('')}

  ${displayUrl ? `<text x="${urlX}" y="${urlY}" font-size="${urlFontSize}" font-weight="500" fill="${theme.textColor}" opacity="${theme.urlOpacity}" text-anchor="end" dominant-baseline="central" font-family="${SVG_FONT_FAMILY}">${escapeXml(displayUrl)}</text>` : ''}

  ${(() => {
    const pillTextY = pillY + pillH / 2
    const versionText = formatVersionTag(brandData.version)
    const versionWidth = versionText ? Math.ceil(versionText.length * pillFontSize * 0.56 + 44) : 0
    const nameText = brandData.name || null
    const nameWidth = nameText ? Math.ceil(nameText.length * pillFontSize * 0.56 + 44) : 0
    const pill1X = leftPad
    const pill2X = versionText ? pill1X + versionWidth + 12 : pill1X
    return [
      versionText ? `<rect x="${pill1X}" y="${pillY}" width="${versionWidth}" height="${pillH}" rx="${pillH / 2}" fill="${theme.pillFill}" fill-opacity="${theme.pillFillOpacity}"/><text x="${pill1X + versionWidth / 2}" y="${pillTextY}" font-size="${pillFontSize}" font-weight="500" fill="${theme.pillText}" fill-opacity="${theme.pillTextOpacity}" text-anchor="middle" dominant-baseline="central" font-family="${SVG_FONT_FAMILY}">${versionText}</text>` : '',
      nameText ? `<rect x="${pill2X}" y="${pillY}" width="${nameWidth}" height="${pillH}" rx="${pillH / 2}" fill="${theme.pillFill}" fill-opacity="${theme.pillFillOpacity}"/><text x="${pill2X + nameWidth / 2}" y="${pillTextY}" font-size="${pillFontSize}" font-weight="500" fill="${theme.pillText}" fill-opacity="${theme.pillTextOpacity}" text-anchor="middle" dominant-baseline="central" font-family="${SVG_FONT_FAMILY}">${escapeXml(nameText)}</text>` : '',
    ].filter(Boolean).join('\n  ')
  })()}
</svg>`

  return await svgToPng(svg, width)
}

async function generateSquareImageBufferFromSource(source, size, options = {}) {
  const padding = Math.max(0, Math.min(40, Number(options.padding ?? 0)))
  const inset = (size * padding) / 100
  const inner = size - inset * 2
  const dataUri = await resolveImageSource(source)
  const bgMode = options.bg || 'auto'
  const bgColor = options.bgColor || '#ffffff'
  const shouldFillBg = bgMode !== 'transparent'

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  ${shouldFillBg ? `<rect width="100%" height="100%" fill="${bgColor}"/>` : ''}
  <image href="${dataUri}" x="${inset}" y="${inset}" width="${inner}" height="${inner}" preserveAspectRatio="xMidYMid meet"/>
</svg>`

  return await svgToPng(svg, size)
}

async function generateFaviconSvgStringFromSource(source, options = {}) {
  const size = 32
  const padding = Math.max(0, Math.min(40, Number(options.padding ?? 0)))
  const inset = (size * padding) / 100
  const inner = size - inset * 2
  const dataUri = await resolveImageSource(source)
  const bgMode = options.bg || 'auto'
  const bgColor = options.bgColor || '#ffffff'
  const shouldFillBg = bgMode !== 'transparent'

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  ${shouldFillBg ? `<rect width="100%" height="100%" fill="${bgColor}" rx="6"/>` : ''}
  <image href="${dataUri}" x="${inset}" y="${inset}" width="${inner}" height="${inner}" preserveAspectRatio="xMidYMid meet"/>
</svg>`
}

async function preserveSourceAsset(source, fileBase, force, fileMap) {
  if (!source) return null

  let buffer
  let mime
  let ext

  if (typeof source === 'string' && source.startsWith('data:')) {
    const parsed = parseDataUri(source)
    buffer = parsed.buffer
    mime = parsed.mime
    ext = extensionFromMime(mime)
  } else if (Buffer.isBuffer(source)) {
    buffer = source
    mime = 'image/png'
    ext = '.png'
  } else if (typeof source === 'string') {
    buffer = await readFile(source)
    ext = extnameNormalized(source)
    mime = mimeForExtension(ext)
  } else {
    return null
  }

  const targetName = `${fileBase}${ext}`

  if (!force && fileMap.has(targetName)) {
    return targetName
  }

  fileMap.set(targetName, { buffer, mime })
  return targetName
}

function lettermarkFontSize(containerSize, charCount) {
  const ratio = charCount <= 1 ? 0.48 : 0.38
  return Math.round(containerSize * ratio)
}

function lettermarkSvg(brandData, size, rx, colors = {}) {
  const initials = (brandData.siteTitle || brandData.name || 'XX').substring(0, 2).toUpperCase()
  const bgColor = toSvgHex(colors.bgColor || brandData.colors.primary, FALLBACK_PRIMARY_COLOR)
  const fgColor = toSvgHex(colors.fgColor || brandData.colors.background, contrastingTextColor(bgColor))
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${bgColor}" rx="${rx}"/>
  <text x="50%" y="50%" font-size="${lettermarkFontSize(size, initials.length)}" font-weight="700" fill="${fgColor}"
        text-anchor="middle" dominant-baseline="central" letter-spacing="-0.5"
        font-family="${SVG_FONT_FAMILY}">${escapeXml(initials)}</text>
</svg>`
}

function tinyFaviconSvg(brandData, size = 32, colors = {}) {
  const initial = (brandData.siteTitle || brandData.name || 'X').substring(0, 1).toUpperCase()
  const bgColor = toSvgHex(colors.bgColor || brandData.colors.primary, FALLBACK_PRIMARY_COLOR)
  const fgColor = toSvgHex(colors.fgColor || brandData.colors.background, contrastingTextColor(bgColor))
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${bgColor}" rx="6"/>
  <text x="50%" y="50%" font-size="${lettermarkFontSize(size, 1)}" font-weight="800" fill="${fgColor}"
        text-anchor="middle" dominant-baseline="central" letter-spacing="0"
        font-family="${SVG_FONT_FAMILY}">${escapeXml(initial)}</text>
</svg>`
}

async function generateLettermarkPngBuffer(brandData, size, options = {}) {
  const padding = Math.max(0, Math.min(40, Number(options.padding ?? 0)))
  const rx = Math.max(0, Number(options.rx ?? Math.round(size * 0.12)))
  const inset = Math.round((size * padding) / 100)
  const innerSize = size - inset * 2
  const initials = (brandData.siteTitle || brandData.name || 'XX').substring(0, 2).toUpperCase()
  const bgColor = toSvgHex(options.bgColor || brandData.colors.primary, FALLBACK_PRIMARY_COLOR)
  const fgColor = toSvgHex(options.fgColor || brandData.colors.background, contrastingTextColor(bgColor))
  const fontSize = lettermarkFontSize(innerSize, initials.length)

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${bgColor}" rx="${rx}"/>
  <text x="50%" y="50%" font-size="${fontSize}" font-weight="700" fill="${fgColor}"
        text-anchor="middle" dominant-baseline="central" letter-spacing="-0.5"
        font-family="${SVG_FONT_FAMILY}">${escapeXml(initials)}</text>
</svg>`

  return await svgToPng(svg, size)
}

/**
 * Generate brand assets in memory (no filesystem writes).
 * Sources may be filesystem paths, data URLs, or Buffers.
 * @param {Object} brandData - Parsed brand data
 * @param {Object} options - Source assets, logo/OG options, force flag
 * @param {Map} [options.existingFiles] - Pre-seeded file map for preserve behavior
 * @returns {Promise<{ files: Array<{ name: string, buffer: Buffer, mime: string }>, refs: Object }>}
 */
export async function generateAssetsInMemory(brandData, options = {}) {
  const fileMap = options.existingFiles instanceof Map
    ? new Map(options.existingFiles)
    : new Map()

  const force = options.force || false
  const sourceLogo = options.sourceLogo || null
  const sourceFavicon = options.sourceFavicon || null
  const sourceAppIcon = options.sourceAppIcon || null
  const sourceOg = options.sourceOg || null
  const logoOptions = options.logoOptions || {}
  const ogOptions = options.ogOptions || {}
  const ogFormat = options.ogFormat || 'png'
  const fullColor = options.fullColor || false
  const iconTheme = resolveIconThemeColors(ogOptions.theme || 'primary', brandData)

  // Uploaded images: keep PNG alpha (transparent canvas) unless explicitly overridden.
  // `--logo-bg solid` still forces a brand-colored canvas; lettermarks stay solid.
  const hasUploadedImage = Boolean(sourceLogo || sourceFavicon || sourceAppIcon)
  const requestedBg = logoOptions.bg || 'auto'
  const effectiveLogoBg = fullColor || requestedBg === 'transparent'
    ? 'transparent'
    : requestedBg === 'solid'
      ? 'solid'
      : (hasUploadedImage ? 'transparent' : 'auto')
  const effectiveLogoOptions = {
    ...logoOptions,
    bg: effectiveLogoBg,
    bgColor: logoOptions.bgColor || iconTheme.bgColor,
    fgColor: logoOptions.fgColor || iconTheme.fgColor,
  }

  const refs = {
    ogImage: null,
    faviconPrimary: null,
    hasFaviconSvg: false,
  }

  const preservedOg = await preserveSourceAsset(sourceOg, 'og-image', force, fileMap)
  const preservedFavicon = await preserveSourceAsset(sourceFavicon, 'favicon', force, fileMap)

  if (preservedOg) refs.ogImage = preservedOg
  if (preservedFavicon) refs.faviconPrimary = preservedFavicon

  if (sourceAppIcon) {
    const appName = 'icon-512x512.png'
    if (!force && fileMap.has(appName)) {
      // keep existing
    } else {
      const buffer = await generateSquareImageBufferFromSource(sourceAppIcon, 512, {
        padding: effectiveLogoOptions.padding,
        bg: effectiveLogoOptions.bg,
        bgColor: effectiveLogoOptions.bgColor || brandData.colors.primary,
      })
      fileMap.set(appName, { buffer, mime: 'image/png' })
    }
  }

  if (!refs.ogImage) {
    const existingOg = findFirstExisting(fileMap, ['og-image.png', 'og-image.jpg', 'og-image.webp'])
    if (!force && existingOg) {
      refs.ogImage = existingOg
    } else if (sourceLogo) {
      const ogName = `og-image.${ogFormat}`
      const buffer = await generateOgImageBuffer(brandData, sourceLogo, { ...ogOptions, fullColor })
      fileMap.set(ogName, { buffer, mime: 'image/png' })
      refs.ogImage = ogName
    } else {
      const ogName = `og-image.${ogFormat}`
      const buffer = await generateOgImageBuffer(brandData, null, { ...ogOptions, fullColor })
      fileMap.set(ogName, { buffer, mime: 'image/png' })
      refs.ogImage = ogName
    }
  }

  const faviconSource = sourceFavicon || sourceLogo || null

  const faviconIcoName = 'favicon.ico'
  if (!force && fileMap.has(faviconIcoName)) {
    // keep existing
  } else if (faviconSource) {
    const buffer = await generateSquareImageBufferFromSource(faviconSource, 32, {
      padding: effectiveLogoOptions.padding,
      bg: effectiveLogoOptions.bg,
      bgColor: effectiveLogoOptions.bgColor || brandData.colors.primary,
    })
    fileMap.set(faviconIcoName, { buffer, mime: 'image/x-icon' })
  } else {
    fileMap.set(faviconIcoName, {
      buffer: await svgToPng(tinyFaviconSvg(brandData, 32, {
        bgColor: iconTheme.lettermarkBg,
        fgColor: iconTheme.lettermarkFg,
      }), 32),
      mime: 'image/x-icon',
    })
  }

  const faviconSvgName = 'favicon.svg'
  if (!force && fileMap.has(faviconSvgName)) {
    // keep existing
  } else if (faviconSource) {
    const svg = await generateFaviconSvgStringFromSource(faviconSource, {
      padding: effectiveLogoOptions.padding,
      bg: effectiveLogoOptions.bg,
      bgColor: effectiveLogoOptions.bgColor || brandData.colors.primary,
    })
    fileMap.set(faviconSvgName, {
      buffer: Buffer.from(svg, 'utf-8'),
      mime: 'image/svg+xml',
    })
  } else {
    fileMap.set(faviconSvgName, {
      buffer: Buffer.from(lettermarkSvg(brandData, 32, 6, {
        bgColor: iconTheme.lettermarkBg,
        fgColor: iconTheme.lettermarkFg,
      }), 'utf-8'),
      mime: 'image/svg+xml',
    })
  }

  const iconSource = sourceAppIcon || sourceLogo || null

  const appleName = 'apple-touch-icon.png'
  if (!force && fileMap.has(appleName)) {
    // keep existing
  } else if (iconSource) {
    const buffer = await generateSquareImageBufferFromSource(iconSource, 180, {
      padding: effectiveLogoOptions.padding,
      bg: effectiveLogoOptions.bg,
      bgColor: effectiveLogoOptions.bgColor || brandData.colors.primary,
    })
    fileMap.set(appleName, { buffer, mime: 'image/png' })
  } else {
    fileMap.set(appleName, {
      buffer: await generateLettermarkPngBuffer(brandData, 180, {
        padding: 0,
        bgColor: iconTheme.lettermarkBg,
        fgColor: iconTheme.lettermarkFg,
      }),
      mime: 'image/png',
    })
  }

  const icon192Name = 'icon-192x192.png'
  if (!force && fileMap.has(icon192Name)) {
    // keep existing
  } else if (iconSource) {
    const buffer = await generateSquareImageBufferFromSource(iconSource, 192, {
      padding: effectiveLogoOptions.padding,
      bg: effectiveLogoOptions.bg,
      bgColor: effectiveLogoOptions.bgColor || brandData.colors.primary,
    })
    fileMap.set(icon192Name, { buffer, mime: 'image/png' })
  } else {
    fileMap.set(icon192Name, {
      buffer: await generateLettermarkPngBuffer(brandData, 192, {
        padding: 0,
        bgColor: iconTheme.lettermarkBg,
        fgColor: iconTheme.lettermarkFg,
      }),
      mime: 'image/png',
    })
  }

  const icon512Name = 'icon-512x512.png'
  if (!force && fileMap.has(icon512Name)) {
    // keep existing
  } else if (iconSource) {
    const buffer = await generateSquareImageBufferFromSource(iconSource, 512, {
      padding: effectiveLogoOptions.padding,
      bg: effectiveLogoOptions.bg,
      bgColor: effectiveLogoOptions.bgColor || brandData.colors.primary,
    })
    fileMap.set(icon512Name, { buffer, mime: 'image/png' })
  } else {
    fileMap.set(icon512Name, {
      buffer: await generateLettermarkPngBuffer(brandData, 512, {
        padding: 0,
        bgColor: iconTheme.lettermarkBg,
        fgColor: iconTheme.lettermarkFg,
      }),
      mime: 'image/png',
    })
  }

  const iconMaskableName = 'icon-512x512-maskable.png'
  if (!force && fileMap.has(iconMaskableName)) {
    // keep existing
  } else if (iconSource) {
    const buffer = await generateSquareImageBufferFromSource(iconSource, 512, {
      padding: 0,
      bg: effectiveLogoOptions.bg,
      bgColor: effectiveLogoOptions.bgColor || iconTheme.maskableBg,
    })
    fileMap.set(iconMaskableName, { buffer, mime: 'image/png' })
  } else {
    fileMap.set(iconMaskableName, {
      buffer: await generateLettermarkPngBuffer(brandData, 512, {
        padding: 10,
        bgColor: iconTheme.maskableBg,
        fgColor: iconTheme.lettermarkFg,
      }),
      mime: 'image/png',
    })
  }

  if (!refs.ogImage) {
    refs.ogImage = findFirstExisting(fileMap, ['og-image.png', 'og-image.jpg', 'og-image.webp']) || 'og-image.png'
  }

  if (!refs.faviconPrimary) {
    refs.faviconPrimary = findFirstExisting(fileMap, ['favicon.ico', 'favicon.svg', 'favicon.png', 'favicon.webp']) || 'favicon.ico'
  }

  refs.hasFaviconSvg = fileMap.has('favicon.svg')

  const files = Array.from(fileMap.entries()).map(([name, { buffer, mime }]) => ({
    name,
    buffer,
    mime,
  }))

  return { files, refs }
}

async function loadExistingAssets(outDir, names) {
  const existing = new Map()
  for (const name of names) {
    const filePath = path.join(outDir, name)
    if (!existsSync(filePath)) continue
    const buffer = await readFile(filePath)
    existing.set(name, {
      buffer,
      mime: mimeForExtension(extnameNormalized(name)),
    })
  }
  return existing
}

/**
 * Filesystem wrapper around generateAssetsInMemory for CLI usage.
 * @returns {Promise<{ogImage:string,faviconPrimary:string,hasFaviconSvg:boolean}>}
 */
export async function generateAssets(brandData, outDir, force = false, options = {}) {
  await mkdir(outDir, { recursive: true })

  const knownNames = [
    'og-image.png', 'og-image.jpg', 'og-image.webp',
    'favicon.ico', 'favicon.svg', 'favicon.png', 'favicon.webp',
    'apple-touch-icon.png',
    'icon-192x192.png',
    'icon-512x512.png',
    'icon-512x512-maskable.png',
  ]

  const existingFiles = force ? new Map() : await loadExistingAssets(outDir, knownNames)

  const { files, refs } = await generateAssetsInMemory(brandData, {
    ...options,
    force,
    existingFiles,
  })

  for (const file of files) {
    const target = path.join(outDir, file.name)
    const alreadyExisted = existingFiles.has(file.name)
    if (!force && alreadyExisted) {
      console.log(`   ⊙ ${file.name} (using existing)`)
      continue
    }
    await writeFile(target, file.buffer)
    console.log(`   ✓ ${file.name}`)
  }

  return refs
}
