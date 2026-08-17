/**
 * Asset Generator using Resvg
 * Pure in-memory generation is the core; filesystem writes are a thin CLI wrapper.
 */

import { mkdir, readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { Resvg } from '@resvg/resvg-js'
import path from 'path'

function svgToPng(svgString, width) {
  const resvg = new Resvg(svgString, {
    fitTo: { mode: 'width', value: width },
    font: { loadSystemFonts: true },
  })
  return resvg.render().asPng()
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
  const n = parseInt(hex.replace('#', ''), 16)
  let r = ((n >> 16) & 0xff) / 255
  let g = ((n >> 8) & 0xff) / 255
  let b = (n & 0xff) / 255
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

function relativeLuminance(hex) {
  try {
    const n = parseInt(String(hex).replace('#', ''), 16)
    if (!Number.isFinite(n)) return 1
    const channel = (shift) => {
      const c = ((n >> shift) & 0xff) / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * channel(16) + 0.7152 * channel(8) + 0.0722 * channel(0)
  } catch {
    return 1
  }
}

/** Prefer brand text when it contrasts with the sheet; otherwise black/white. */
function contrastingTextColor(sheetFill, preferredText) {
  const sheetLum = relativeLuminance(sheetFill)
  const fallback = sheetLum > 0.55 ? '#251f1f' : '#f6f2f2'
  if (typeof preferredText !== 'string' || !preferredText.trim()) return fallback
  const textLum = relativeLuminance(preferredText)
  const ratio = (Math.max(sheetLum, textLum) + 0.05) / (Math.min(sheetLum, textLum) + 0.05)
  return ratio >= 3 ? preferredText : fallback
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

function resolveOgThemePalette(theme, brandData) {
  const primary = brandData.colors.primary
  const primaryBright = brighterColor(primary)
  const sheetLight = brandData.colors.background || '#ffffff'
  const preferredText = brandData.colors.text || '#251f1f'
  const textOnLight = contrastingTextColor(sheetLight, preferredText)
  const textOnWhite = contrastingTextColor('#ffffff', preferredText)

  if (theme === 'white') {
    return {
      id: 'white',
      bgSolid: '#f7f5f4',
      useGradient: false,
      showDots: false,
      sheetFill: '#ffffff',
      textColor: textOnWhite,
      descOpacity: 0.55,
      urlOpacity: 0.42,
      pillFill: textOnWhite,
      pillFillOpacity: 0.06,
      pillText: textOnWhite,
      pillTextOpacity: 0.55,
      initialsFill: primary,
      sheetShadowOpacity: 0.08,
    }
  }

  if (theme === 'dark') {
    return {
      id: 'dark',
      bgSolid: '#171414',
      useGradient: false,
      showDots: true,
      sheetFill: '#221e1e',
      textColor: '#f6f2f2',
      descOpacity: 0.62,
      urlOpacity: 0.45,
      pillFill: '#ffffff',
      pillFillOpacity: 0.08,
      pillText: '#ffffff',
      pillTextOpacity: 0.58,
      initialsFill: '#ffffff',
      sheetShadowOpacity: 0.28,
    }
  }

  return {
    id: 'primary',
    gradientFrom: primary,
    gradientTo: primaryBright,
    useGradient: true,
    showDots: true,
    sheetFill: sheetLight,
    textColor: textOnLight,
    descOpacity: 0.62,
    urlOpacity: 0.48,
    pillFill: textOnLight,
    pillFillOpacity: 0.07,
    pillText: textOnLight,
    pillTextOpacity: 0.55,
    initialsFill: sheetLight,
    sheetShadowOpacity: 0.14,
  }
}

function resolveIconThemeColors(theme, brandData) {
  const palette = resolveOgThemePalette(theme || 'primary', brandData)
  const primary = brandData.colors.primary
  const sheetLight = brandData.colors.background || '#ffffff'

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
    fgColor: sheetLight,
    lettermarkBg: primary,
    lettermarkFg: sheetLight,
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
 * ogOptions.logoShape: 'square' | 'rounded' | 'circular' — mask crop for logo
 */
async function generateOgImageBuffer(brandData, source = null, ogOptions = {}) {
  const width = 1200
  const height = 630
  const dataUri = source ? await resolveImageSource(source) : null
  const initials = (brandData.siteTitle || brandData.name || 'XX').substring(0, 2).toUpperCase()
  const theme = resolveOgThemePalette(ogOptions.theme || 'primary', brandData)
  const showDots = typeof ogOptions.showDots === 'boolean' ? ogOptions.showDots : theme.showDots
  const logoShape = ['square', 'rounded', 'circular'].includes(ogOptions.logoShape)
    ? ogOptions.logoShape
    : 'square'

  const margin = 60
  const leftColWidth = 392
  const sheetX = leftColWidth
  const sheetY = margin
  const sheetWidth = width - leftColWidth - margin
  const sheetHeight = height - margin * 2

  const leftPad = sheetX + margin
  const textMaxWidth = sheetWidth
  const titleFontSize = Number.isFinite(ogOptions.titleFontSize) ? ogOptions.titleFontSize : 72
  const descFontSize = Number.isFinite(ogOptions.descFontSize) ? ogOptions.descFontSize : 34
  const urlFontSize = Number.isFinite(ogOptions.urlFontSize) ? ogOptions.urlFontSize : 26
  const pillFontSize = Number.isFinite(ogOptions.pillFontSize) ? ogOptions.pillFontSize : 28

  const displayUrl = formatSiteUrlForDisplay(brandData.siteUrl)
  const titleLines = wrapTextToWidth(brandData.siteTitle, textMaxWidth, titleFontSize)
  const descLines = wrapTextToWidth(brandData.description || brandData.siteTitle, textMaxWidth, descFontSize)

  const titleLineHeight = Math.round(titleFontSize * 1)
  const descLineHeight = Math.round(descFontSize * 1.24)
  const pillH = 52
  const titleDescGap = Math.round(titleFontSize * 0.55)
  const titleCapH = Math.round(titleFontSize * 0.72)
  const descCapH = Math.round(descFontSize * 0.72)
  const pillY = sheetY + sheetHeight - 100
  const urlY = pillY + pillH / 2
  const urlX = sheetX + sheetWidth - margin

  // Vertically center title + description in the sheet area above the footer.
  const totalBlockH = titleCapH
    + titleBlockHeight(titleLines, titleLineHeight)
    + titleDescGap
    + descCapH
    + titleBlockHeight(descLines, descLineHeight)
  const availableTop = sheetY + 72
  const availableBottom = pillY - 48
  const titleStartY = Math.round(
    availableTop + Math.max(0, (availableBottom - availableTop - totalBlockH) / 2),
  ) + titleCapH
  const descStartY = titleStartY + titleBlockHeight(titleLines, titleLineHeight) + titleDescGap

  const logoSize = 280
  const logoHalf = logoSize / 2
  const logoRx = logoShape === 'circular'
    ? logoHalf
    : logoShape === 'rounded'
      ? 40
      : 0

  const leftColContent = dataUri
    ? `<image href="${dataUri}" x="${-logoHalf}" y="${-logoHalf}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet"/>`
    : `<text x="0" y="0" font-size="240" font-weight="800" fill="${theme.initialsFill}" text-anchor="middle" dominant-baseline="central" letter-spacing="-2">${initials}</text>`

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

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style type="text/css">
      text {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      }
    </style>
    ${gradientDef}
    <pattern id="dotGrid" x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse">
      <circle cx="1.5" cy="1.5" r="1.5" fill="#ffffff" opacity="0.18"/>
    </pattern>
    <clipPath id="logoClip">
      <rect x="${-logoHalf}" y="${-logoHalf}" width="${logoSize}" height="${logoSize}" rx="${logoRx}" ry="${logoRx}"/>
    </clipPath>
    <filter id="sheet-shadow" x="-4%" y="-4%" width="108%" height="114%">
      <feDropShadow dx="0" dy="10" stdDeviation="18" flood-color="#000000" flood-opacity="${theme.sheetShadowOpacity}"/>
    </filter>
  </defs>

  ${bgLayer}
  ${dotsLayer}

  <rect x="${sheetX}" y="${sheetY}" width="${sheetWidth}" height="${sheetHeight}" rx="40" fill="${theme.sheetFill}" filter="url(#sheet-shadow)" />

  <g transform="translate(${leftColWidth / 2}, ${height / 2})" clip-path="url(#logoClip)">
    ${leftColContent}
  </g>

  ${titleLines.map((line, i) => `
  <text x="${leftPad}" y="${titleStartY + (i * titleLineHeight)}" font-size="${titleFontSize}" font-weight="600" fill="${theme.textColor}" letter-spacing="-1.2">${escapeXml(line)}</text>
  `).join('')}

  ${descLines.map((line, i) => `
  <text x="${leftPad}" y="${descStartY + (i * descLineHeight)}" font-size="${descFontSize}" font-weight="400" fill="${theme.textColor}" opacity="${theme.descOpacity}">${escapeXml(line)}</text>
  `).join('')}

  ${displayUrl ? `<text x="${urlX}" y="${urlY}" font-size="${urlFontSize}" font-weight="500" fill="${theme.textColor}" opacity="${theme.urlOpacity}" text-anchor="end" dominant-baseline="central">${escapeXml(displayUrl)}</text>` : ''}

  ${(() => {
    const pillTextY = pillY + pillH / 2
    const versionText = formatVersionTag(brandData.version)
    const versionWidth = versionText ? Math.ceil(versionText.length * pillFontSize * 0.56 + 44) : 0
    const nameText = brandData.name || null
    const nameWidth = nameText ? Math.ceil(nameText.length * pillFontSize * 0.56 + 44) : 0
    const pill1X = leftPad
    const pill2X = versionText ? pill1X + versionWidth + 12 : pill1X
    return [
      versionText ? `<rect x="${pill1X}" y="${pillY}" width="${versionWidth}" height="${pillH}" rx="${pillH / 2}" fill="${theme.pillFill}" fill-opacity="${theme.pillFillOpacity}"/><text x="${pill1X + versionWidth / 2}" y="${pillTextY}" font-size="${pillFontSize}" font-weight="500" fill="${theme.pillText}" fill-opacity="${theme.pillTextOpacity}" text-anchor="middle" dominant-baseline="central">${versionText}</text>` : '',
      nameText ? `<rect x="${pill2X}" y="${pillY}" width="${nameWidth}" height="${pillH}" rx="${pillH / 2}" fill="${theme.pillFill}" fill-opacity="${theme.pillFillOpacity}"/><text x="${pill2X + nameWidth / 2}" y="${pillTextY}" font-size="${pillFontSize}" font-weight="500" fill="${theme.pillText}" fill-opacity="${theme.pillTextOpacity}" text-anchor="middle" dominant-baseline="central">${escapeXml(nameText)}</text>` : '',
    ].filter(Boolean).join('\n  ')
  })()}
</svg>`

  return svgToPng(svg, width)
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

  return svgToPng(svg, size)
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

function lettermarkSvg(brandData, size, rx, colors = {}) {
  const initials = (brandData.siteTitle || brandData.name || 'XX').substring(0, 2).toUpperCase()
  const bgColor = colors.bgColor || brandData.colors.primary
  const fgColor = colors.fgColor || brandData.colors.background
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${bgColor}" rx="${rx}"/>
  <text x="50%" y="50%" font-size="${Math.round(size * 0.5)}" font-weight="700" fill="${fgColor}"
        text-anchor="middle" dominant-baseline="central" letter-spacing="-0.5"
        font-family="-apple-system, BlinkMacSystemFont, sans-serif">${initials}</text>
</svg>`
}

function tinyFaviconSvg(brandData, size = 32, colors = {}) {
  const initial = (brandData.siteTitle || brandData.name || 'X').substring(0, 1).toUpperCase()
  const bgColor = colors.bgColor || brandData.colors.primary
  const fgColor = colors.fgColor || brandData.colors.background
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${bgColor}" rx="6"/>
  <text x="50%" y="50%" font-size="${Math.round(size * 0.7)}" font-weight="800" fill="${fgColor}"
        text-anchor="middle" dominant-baseline="central" letter-spacing="0"
        font-family="-apple-system, BlinkMacSystemFont, sans-serif">${escapeXml(initial)}</text>
</svg>`
}

function generateLettermarkPngBuffer(brandData, size, options = {}) {
  const padding = Math.max(0, Math.min(40, Number(options.padding ?? 0)))
  const rx = Math.max(0, Number(options.rx ?? Math.round(size * 0.12)))
  const inset = Math.round((size * padding) / 100)
  const innerSize = size - inset * 2
  const initials = (brandData.siteTitle || brandData.name || 'XX').substring(0, 2).toUpperCase()
  const bgColor = options.bgColor || brandData.colors.primary
  const fgColor = options.fgColor || brandData.colors.background
  const fontSize = Math.round(innerSize * 0.5)

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${bgColor}" rx="${rx}"/>
  <text x="50%" y="50%" font-size="${fontSize}" font-weight="700" fill="${fgColor}"
        text-anchor="middle" dominant-baseline="central" letter-spacing="-0.5"
        font-family="-apple-system, BlinkMacSystemFont, sans-serif">${escapeXml(initials)}</text>
</svg>`

  return svgToPng(svg, size)
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
      buffer: svgToPng(tinyFaviconSvg(brandData, 32, {
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
      buffer: generateLettermarkPngBuffer(brandData, 180, {
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
      buffer: generateLettermarkPngBuffer(brandData, 192, {
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
      buffer: generateLettermarkPngBuffer(brandData, 512, {
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
      buffer: generateLettermarkPngBuffer(brandData, 512, {
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
