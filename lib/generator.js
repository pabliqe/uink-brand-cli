/**
 * Asset Generator using Satori and Resvg
 * Generates OG images, favicons, and PWA icons
 */

import { copyFile, mkdir, readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { Resvg } from '@resvg/resvg-js'
import path from 'path'

/**
 * Convert SVG to PNG using Resvg
 */
function svgToPng(svgString, width) {
  const resvg = new Resvg(svgString, {
    fitTo: { mode: 'width', value: width },
    font: { loadSystemFonts: true }
  })
  return resvg.render().asPng()
}

function wrapTextToWidth(text, maxWidth, fontSize) {
  if (!text) return ['']

  const words = String(text).trim().split(/\s+/)
  const lines = []
  let currentLine = ''

  const estimateWidth = (value) => {
    // Lightweight width estimate for sans-serif OG text rendering.
    return value.length * fontSize * 0.55
  }

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

async function imageToDataUri(filePath) {
  const buffer = await readFile(filePath)
  const mime = mimeForExtension(extnameNormalized(filePath))
  return `data:${mime};base64,${buffer.toString('base64')}`
}

function findFirstExisting(outDir, names) {
  for (const name of names) {
    if (existsSync(path.join(outDir, name))) return name
  }
  return null
}

/** Convert a 6-digit hex color string to [h(0-360), s(0-100), l(0-100)]. */
function hexToHsl(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  let r = ((n >> 16) & 0xff) / 255
  let g = ((n >> 8) & 0xff) / 255
  let b = (n & 0xff) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
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

/** Convert HSL [h(0-360), s(0-100), l(0-100)] to a hex color string. */
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

/**
 * Return a brighter, lighter variant of a hex color for use as a gradient end-stop.
 * Boosts lightness by `lightnessBoost` points and saturation slightly.
 */
function brighterColor(hex, lightnessBoost = 24) {
  try {
    const [h, s, l] = hexToHsl(hex)
    return hslToHex(Math.min(360, h + 20), Math.min(100, s + 6), Math.min(90, l + lightnessBoost))
  } catch {
    return hex
  }
}

/**
 * Generate 1200x630 Open Graph image.
 * Pass sourcePath to use a logo image in the left column; omit it for the 2-letter initials fallback.
 */
async function generateOgImage(brandData, outputPath, sourcePath = null, ogOptions = {}) {
  const width = 1200
  const height = 630
  const dataUri = sourcePath ? await imageToDataUri(sourcePath) : null
  const initials = (brandData.siteTitle || brandData.name || 'XX').substring(0, 2).toUpperCase()
  const primaryBright = brighterColor(brandData.colors.primary)

  const margin = 60
  const leftColWidth = 392
  const sheetX = leftColWidth
  const sheetY = margin
  const sheetWidth = width - leftColWidth - margin
  const sheetHeight = height - margin * 2

  const leftPad = sheetX + margin
  const textMaxWidth = sheetWidth
  const titleFontSize = Number.isFinite(ogOptions.titleFontSize) ? ogOptions.titleFontSize : 80
  const descFontSize = Number.isFinite(ogOptions.descFontSize) ? ogOptions.descFontSize : 34

  const titleLines = wrapTextToWidth(brandData.siteTitle, textMaxWidth, titleFontSize)
  const descLines = wrapTextToWidth(brandData.description || brandData.siteTitle, textMaxWidth, descFontSize)

  const titleLineHeight = Math.round(titleFontSize * 1)
  const descLineHeight = Math.round(descFontSize * 1.24)
  const pillH = 52
  const pillY = sheetY + sheetHeight - 100
  const titleBlockH = (titleLines.length - 1) * titleLineHeight
  const descBlockH = (descLines.length - 1) * descLineHeight
  const titleDescGap = Math.round(titleFontSize * 0.8)
  const titleCapH = Math.round(titleFontSize * 0.72)
  const descCapH = Math.round(descFontSize * 0.72)
  const totalBlockH = titleCapH + titleBlockH + titleDescGap + descBlockH + descCapH
  const availableTop = sheetY + 80
  const availableBottom = pillY - 56
  const titleStartY = Math.round(availableTop + Math.max(0, (availableBottom - availableTop - totalBlockH) / 2)) + titleCapH
  const descStartY = titleStartY + titleBlockH + titleDescGap

  const leftColContent = dataUri
    ? `<image href="${dataUri}" x="-140" y="-140" width="280" height="280" preserveAspectRatio="xMidYMid meet"/>`
    : `<text x="0" y="0" font-size="240" font-weight="800" fill="${brandData.colors.background}" text-anchor="middle" dominant-baseline="central" letter-spacing="-2">${initials}</text>`

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style type="text/css">
      text {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      }
    </style>
    <linearGradient id="bgGrad" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0%" stop-color="${brandData.colors.primary}"/>
      <stop offset="100%" stop-color="${primaryBright}"/>
    </linearGradient>
    <pattern id="dotGrid" x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse">
      <circle cx="1.5" cy="1.5" r="1.5" fill="#ffffff" opacity="0.18"/>
    </pattern>
    <filter id="sheet-shadow" x="-4%" y="-4%" width="108%" height="114%">
      <feDropShadow dx="0" dy="10" stdDeviation="18" flood-color="#000000" flood-opacity="0.14"/>
    </filter>
  </defs>

  <!-- Gradient Background -->
  <rect width="100%" height="100%" fill="url(#bgGrad)" />
  <rect width="100%" height="100%" fill="url(#dotGrid)" />

  <!-- Content Sheet with Border Radius + Drop Shadow -->
  <rect x="${sheetX}" y="${sheetY}" width="${sheetWidth}" height="${sheetHeight}" rx="40" fill="${brandData.colors.background}" filter="url(#sheet-shadow)" />

  <!-- Left Column: logo or initials -->
  <g transform="translate(${leftColWidth / 2}, ${height / 2})">
    ${leftColContent}
  </g>

  <!-- Main Title -->
  ${titleLines.map((line, i) => `
  <text x="${leftPad}" y="${titleStartY + (i * titleLineHeight)}" font-size="${titleFontSize}" font-weight="800" fill="${brandData.colors.text}" letter-spacing="-1.2">${escapeXml(line)}</text>
  `).join('')}

  <!-- Description / Subtitle -->
  ${descLines.map((line, i) => `
  <text x="${leftPad}" y="${descStartY + (i * descLineHeight)}" font-size="${descFontSize}" font-weight="400" fill="${brandData.colors.text}" opacity="0.62">${escapeXml(line)}</text>
  `).join('')}

  <!-- Miscs Pills -->
  ${(() => {
    const pillTextY = pillY + pillH / 2
    const versionText = brandData.version ? `v${brandData.version}` : null
    const versionWidth = versionText ? Math.ceil(versionText.length * 28 * 0.56 + 48) : 0
    const nameText = brandData.name || null
    const nameWidth = nameText ? Math.ceil(nameText.length * 28 * 0.56 + 48) : 0
    const pill1X = leftPad
    const pill2X = versionText ? pill1X + versionWidth + 16 : pill1X
    return [
      versionText ? `<rect x="${pill1X}" y="${pillY}" width="${versionWidth}" height="${pillH}" rx="${pillH / 2}" fill="#000000"/><text x="${pill1X + versionWidth / 2}" y="${pillTextY}" font-size="28" font-weight="600" fill="#ffffff" text-anchor="middle" dominant-baseline="central">${versionText}</text>` : '',
      nameText ? `<rect x="${pill2X}" y="${pillY}" width="${nameWidth}" height="${pillH}" rx="${pillH / 2}" fill="#000000"/><text x="${pill2X + nameWidth / 2}" y="${pillTextY}" font-size="28" font-weight="600" fill="#ffffff" text-anchor="middle" dominant-baseline="central">${escapeXml(nameText)}</text>` : ''
    ].filter(Boolean).join('\n  ')
  })()}
</svg>`

  const pngData = svgToPng(svg, width)
  await writeFile(outputPath, pngData)
  console.log(`   ✓ og-image.jpg (${width}x${height})`)
}

async function generateSquareImageFromSource(sourcePath, outputPath, size, options = {}) {
  const padding = Math.max(0, Math.min(40, Number(options.padding ?? 18)))
  const inset = (size * padding) / 100
  const inner = size - inset * 2
  const dataUri = await imageToDataUri(sourcePath)
  const bgMode = options.bg || 'auto'
  const bgColor = options.bgColor || '#ffffff'
  // In auto mode, prefer a solid canvas so monochrome/alpha logos stay visible in app shortcuts.
  const shouldFillBg = bgMode !== 'transparent'

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  ${shouldFillBg ? `<rect width="100%" height="100%" fill="${bgColor}"/>` : ''}
  <image href="${dataUri}" x="${inset}" y="${inset}" width="${inner}" height="${inner}" preserveAspectRatio="xMidYMid meet"/>
</svg>`

  const pngData = svgToPng(svg, size)
  await writeFile(outputPath, pngData)
}

async function generateFaviconSvgFromSource(sourcePath, outputPath, options = {}) {
  const size = 32
  const padding = Math.max(0, Math.min(40, Number(options.padding ?? 18)))
  const inset = (size * padding) / 100
  const inner = size - inset * 2
  const dataUri = await imageToDataUri(sourcePath)
  const bgMode = options.bg || 'auto'
  const bgColor = options.bgColor || '#ffffff'
  // In auto mode, prefer a solid canvas so monochrome/alpha logos stay visible in app shortcuts.
  const shouldFillBg = bgMode !== 'transparent'

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  ${shouldFillBg ? `<rect width="100%" height="100%" fill="${bgColor}" rx="6"/>` : ''}
  <image href="${dataUri}" x="${inset}" y="${inset}" width="${inner}" height="${inner}" preserveAspectRatio="xMidYMid meet"/>
</svg>`

  await writeFile(outputPath, svg)
}

async function preserveSourceAsset(sourcePath, outDir, fileBase, force) {
  if (!sourcePath) return null
  const ext = extnameNormalized(sourcePath)
  const targetName = `${fileBase}${ext}`
  const targetPath = path.join(outDir, targetName)

  if (!force && existsSync(targetPath)) {
    console.log(`   ⊙ ${targetName} (using existing)`)
    return targetName
  }

  await copyFile(sourcePath, targetPath)
  console.log(`   ✓ ${targetName} (from source)`)
  return targetName
}

/**
 * XML escape utility
 */
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
 * Generate a lettermark SVG using the brand's primary color and initials.
 */
function lettermarkSvg(brandData, size, rx) {
  const initials = (brandData.siteTitle || brandData.name || 'XX').substring(0, 2).toUpperCase()
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${brandData.colors.primary}" rx="${rx}"/>
  <text x="50%" y="50%" font-size="${Math.round(size * 0.5)}" font-weight="700" fill="${brandData.colors.background}"
        text-anchor="middle" dominant-baseline="central" letter-spacing="-0.5"
        font-family="-apple-system, BlinkMacSystemFont, sans-serif">${initials}</text>
</svg>`
}

function tinyFaviconSvg(brandData, size = 32) {
  const initial = (brandData.siteTitle || brandData.name || 'X').substring(0, 1).toUpperCase()
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${brandData.colors.primary}" rx="6"/>
  <text x="50%" y="50%" font-size="${Math.round(size * 0.7)}" font-weight="800" fill="${brandData.colors.background}"
        text-anchor="middle" dominant-baseline="central" letter-spacing="0"
        font-family="-apple-system, BlinkMacSystemFont, sans-serif">${escapeXml(initial)}</text>
</svg>`
}

async function generateLettermarkPng(brandData, outputPath, size, options = {}) {
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

  const pngData = svgToPng(svg, size)
  await writeFile(outputPath, pngData)
}

/**
 * Main asset generation function
 * @param {Object} brandData - Parsed brand data
 * @param {string} outDir - Output directory
 * @param {boolean} force - Force regenerate even if files exist
 * @param {Object} options - Phase 2 source asset and logo composition options
 * @returns {Promise<{ogImage:string,faviconPrimary:string,hasFaviconSvg:boolean}>}
 */
export async function generateAssets(brandData, outDir, force = false, options = {}) {
  await mkdir(outDir, { recursive: true })

  const sourceLogo = options.sourceLogo || null
  const sourceFavicon = options.sourceFavicon || null
  const sourceAppIcon = options.sourceAppIcon || null
  const sourceOg = options.sourceOg || null
  const logoOptions = options.logoOptions || {}
  const ogOptions = options.ogOptions || {}

  const refs = {
    ogImage: null,
    faviconPrimary: null,
    hasFaviconSvg: false,
  }

  // Preserve explicit source assets by role first.
  const preservedOg = await preserveSourceAsset(sourceOg, outDir, 'og-image', force)
  const preservedFavicon = await preserveSourceAsset(sourceFavicon, outDir, 'favicon', force)

  if (preservedOg) refs.ogImage = preservedOg
  if (preservedFavicon) refs.faviconPrimary = preservedFavicon

  // App icon source is authoritative for 512 base icon.
  if (sourceAppIcon) {
    const appTarget = path.join(outDir, 'icon-512x512.png')
    if (!force && existsSync(appTarget)) {
      console.log('   ⊙ icon-512x512.png (using existing)')
    } else {
      await generateSquareImageFromSource(sourceAppIcon, appTarget, 512, {
        padding: logoOptions.padding,
        bg: logoOptions.bg,
        bgColor: logoOptions.bgColor || brandData.colors.primary,
      })
      console.log('   ✓ icon-512x512.png (from source appIcon)')
    }
  }

  // OG generation: preserve existing format or derive from logo.
  if (!refs.ogImage) {
    const existingOg = findFirstExisting(outDir, ['og-image.jpg', 'og-image.png', 'og-image.webp'])
    if (!force && existingOg) {
      console.log(`   ⊙ ${existingOg} (using existing)`)
      refs.ogImage = existingOg
    } else if (sourceLogo) {
      const ogTarget = path.join(outDir, 'og-image.jpg')
      await generateOgImage(brandData, ogTarget, sourceLogo, ogOptions)
      refs.ogImage = 'og-image.jpg'
    } else {
      await generateOgImage(brandData, path.join(outDir, 'og-image.jpg'), null, ogOptions)
      refs.ogImage = 'og-image.jpg'
    }
  }

  // Favicon generation defaults to ico/svg, logo-first when available.
  const faviconIcoPath = path.join(outDir, 'favicon.ico')
  if (!force && existsSync(faviconIcoPath)) {
    console.log('   ⊙ favicon.ico (using existing)')
  } else if (sourceLogo || sourceFavicon) {
    await generateSquareImageFromSource(sourceLogo || sourceFavicon, faviconIcoPath, 32, {
      padding: logoOptions.padding,
      bg: logoOptions.bg,
      bgColor: logoOptions.bgColor || brandData.colors.primary,
    })
    console.log('   ✓ favicon.ico (derived)')
  } else {
    await writeFile(faviconIcoPath, svgToPng(tinyFaviconSvg(brandData, 32), 32))
    console.log('   ✓ favicon.ico (32x32)')
  }

  const faviconSvgPath = path.join(outDir, 'favicon.svg')
  if (!force && existsSync(faviconSvgPath)) {
    console.log('   ⊙ favicon.svg (using existing)')
  } else if (sourceLogo || sourceFavicon) {
    await generateFaviconSvgFromSource(sourceLogo || sourceFavicon, faviconSvgPath, {
      padding: logoOptions.padding,
      bg: logoOptions.bg,
      bgColor: logoOptions.bgColor || brandData.colors.primary,
    })
    console.log('   ✓ favicon.svg (derived)')
  } else {
    await writeFile(faviconSvgPath, lettermarkSvg(brandData, 32, 6))
    console.log('   ✓ favicon.svg (scalable)')
  }

  const iconSource = sourceAppIcon || sourceLogo || null

  const applePath = path.join(outDir, 'apple-touch-icon.png')
  if (!force && existsSync(applePath)) {
    console.log('   ⊙ apple-touch-icon.png (using existing)')
  } else if (iconSource) {
    await generateSquareImageFromSource(iconSource, applePath, 180, {
      padding: logoOptions.padding,
      bg: logoOptions.bg,
      bgColor: logoOptions.bgColor || brandData.colors.primary,
    })
    console.log('   ✓ apple-touch-icon.png (derived)')
  } else {
    await generateLettermarkPng(brandData, applePath, 180, {
      padding: 0,
      bgColor: brandData.colors.primary,
    })
    console.log('   ✓ apple-touch-icon.png (180x180)')
  }

  const icon192Path = path.join(outDir, 'icon-192x192.png')
  if (!force && existsSync(icon192Path)) {
    console.log('   ⊙ icon-192x192.png (using existing)')
  } else if (iconSource) {
    await generateSquareImageFromSource(iconSource, icon192Path, 192, {
      padding: logoOptions.padding,
      bg: logoOptions.bg,
      bgColor: logoOptions.bgColor || brandData.colors.primary,
    })
    console.log('   ✓ icon-192x192.png (derived)')
  } else {
    await generateLettermarkPng(brandData, icon192Path, 192, {
      padding: 0,
      bgColor: brandData.colors.primary,
    })
    console.log('   ✓ icon-192x192.png (192x192)')
  }

  const icon512Path = path.join(outDir, 'icon-512x512.png')
  if (!force && existsSync(icon512Path)) {
    console.log('   ⊙ icon-512x512.png (using existing)')
  } else if (iconSource) {
    await generateSquareImageFromSource(iconSource, icon512Path, 512, {
      padding: logoOptions.padding,
      bg: logoOptions.bg,
      bgColor: logoOptions.bgColor || brandData.colors.primary,
    })
    console.log('   ✓ icon-512x512.png (derived)')
  } else {
    await generateLettermarkPng(brandData, icon512Path, 512, {
      padding: 0,
      bgColor: brandData.colors.primary,
    })
    console.log('   ✓ icon-512x512.png (512x512)')
  }

  const iconMaskablePath = path.join(outDir, 'icon-512x512-maskable.png')
  if (!force && existsSync(iconMaskablePath)) {
    console.log('   ⊙ icon-512x512-maskable.png (using existing)')
  } else if (iconSource) {
    await generateSquareImageFromSource(iconSource, iconMaskablePath, 512, {
      padding: 10,
      bg: 'solid',
      bgColor: logoOptions.bgColor || brandData.colors.primary,
    })
    console.log('   ✓ icon-512x512-maskable.png (derived)')
  } else {
    await generateLettermarkPng(brandData, iconMaskablePath, 512, {
      padding: 10,
      bgColor: brandData.colors.background,
      fgColor: brandData.colors.primary,
    })
    console.log('   ✓ icon-512x512-maskable.png (512x512, maskable)')
  }

  if (!refs.ogImage) {
    refs.ogImage = findFirstExisting(outDir, ['og-image.jpg', 'og-image.png', 'og-image.webp']) || 'og-image.jpg'
  }

  if (!refs.faviconPrimary) {
    refs.faviconPrimary = findFirstExisting(outDir, ['favicon.ico', 'favicon.svg', 'favicon.png', 'favicon.webp']) || 'favicon.ico'
  }

  refs.hasFaviconSvg = existsSync(path.join(outDir, 'favicon.svg'))
  return refs
}
