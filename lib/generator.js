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

/**
 * Simple text wrapping for long text
 */
function wrapText(text, maxChars) {
  if (!text || text.length <= maxChars) return [text]

  const words = text.split(' ')
  const lines = []
  let currentLine = ''

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxChars) {
      currentLine = (currentLine + ' ' + word).trim()
    } else {
      if (currentLine) lines.push(currentLine)
      currentLine = word
    }
  }
  if (currentLine) lines.push(currentLine)

  return lines
}

function wrapTextToWidth(text, maxWidth, fontSize) {
  if (!text) return ['']

  const words = String(text).trim().split(/\s+/)
  const lines = []
  let currentLine = ''

  const estimateWidth = (value) => {
    // Lightweight width estimate for sans-serif OG text rendering.
    return value.length * fontSize * 0.56
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

/**
 * Generate 1200x630 Open Graph image using text-only fallback.
 */
async function generateOGImage(brandData, outputPath) {
  const width = 1200
  const height = 630

  const leftPad = 80
  const initials = brandData.name.substring(0, 2).toUpperCase()

  const rightPanelX = width * 0.65
  const rightPanelWidth = width * 0.35
  const textMaxWidth = rightPanelX - leftPad - 48
  const titleFontSize = 80
  const descFontSize = 34

  // Same content width and type scale as the logo version.
  const titleLines = wrapTextToWidth(brandData.name, textMaxWidth, titleFontSize)
  const descLines = wrapTextToWidth(brandData.description || brandData.siteTitle, textMaxWidth, descFontSize)

  const titleStartY = 200
  const titleLineHeight = 84
  const descStartY = titleStartY + ((titleLines.length - 1) * titleLineHeight) + 76
  const descLineHeight = 48

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style type="text/css">
      text {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      }
    </style>
  </defs>

  <rect width="100%" height="100%" fill="${brandData.colors.background}" />

  <!-- Right Side Background Panel -->
  <rect x="${rightPanelX}" y="0" width="${rightPanelWidth}" height="${height}" fill="${brandData.colors.primary}" />

  <!-- Initials block in the center of the right panel -->
  <g transform="translate(${rightPanelX + (rightPanelWidth - 280) / 2}, ${(height - 280) / 2})">
    <rect width="280" height="280" rx="40" fill="${brandData.colors.primary}" />
    <text x="140" y="140" font-size="160" font-weight="800" fill="${brandData.colors.background}" text-anchor="middle" dominant-baseline="central" letter-spacing="-2">${initials}</text>
  </g>

  <!-- Main Title -->
  ${titleLines.map((line, i) => `
  <text x="${leftPad}" y="${titleStartY + (i * titleLineHeight)}" font-size="${titleFontSize}" font-weight="800" fill="${brandData.colors.text}" letter-spacing="-1.2">${escapeXml(line)}</text>
  `).join('')}

  <!-- Description / Subtitle -->
  ${descLines.map((line, i) => `
  <text x="${leftPad}" y="${descStartY + (i * descLineHeight)}" font-size="${descFontSize}" font-weight="400" fill="${brandData.colors.text}" opacity="0.62">${escapeXml(line)}</text>
  `).join('')}

  <!-- Miscs: Version and Site Title horizontally aligned -->
  ${brandData.version ? `<text x="${leftPad}" y="540" font-size="32" font-weight="700" fill="${brandData.colors.primary}">v${brandData.version}</text>` : ''}
  <text x="${brandData.version ? leftPad + 120 : leftPad}" y="540" font-size="32" font-weight="700" fill="${brandData.colors.primary}">${escapeXml(brandData.siteTitle)}</text>
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
  const shouldFillBg = bgMode === 'solid' || (bgMode === 'auto' && extnameNormalized(sourcePath) !== '.jpg')

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
  const shouldFillBg = bgMode === 'solid' || (bgMode === 'auto' && extnameNormalized(sourcePath) !== '.jpg')

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  ${shouldFillBg ? `<rect width="100%" height="100%" fill="${bgColor}" rx="6"/>` : ''}
  <image href="${dataUri}" x="${inset}" y="${inset}" width="${inner}" height="${inner}" preserveAspectRatio="xMidYMid meet"/>
</svg>`

  await writeFile(outputPath, svg)
}

async function generateOgImageFromSource(brandData, sourcePath, outputPath, options = {}) {
  const width = 1200
  const height = 630
  const dataUri = await imageToDataUri(sourcePath)
  const bgColor = options.bgColor || brandData.colors.background

  const leftPad = 80
  const rightPanelX = width * 0.65
  const rightPanelWidth = width * 0.35
  const textMaxWidth = rightPanelX - leftPad - 48
  const titleFontSize = 80
  const descFontSize = 34

  const titleLines = wrapTextToWidth(brandData.name, textMaxWidth, titleFontSize)
  const descLines = wrapTextToWidth(brandData.description || brandData.siteTitle, textMaxWidth, descFontSize)

  const titleStartY = 200
  const titleLineHeight = 84
  const descStartY = titleStartY + ((titleLines.length - 1) * titleLineHeight) + 76
  const descLineHeight = 48

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style type="text/css">
      text {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      }
    </style>
  </defs>

  <rect width="100%" height="100%" fill="${bgColor}" />

  <!-- Right Side Background Panel -->
  <rect x="${rightPanelX}" y="0" width="${rightPanelWidth}" height="${height}" fill="${brandData.colors.primary}" />

  <!-- Logo/Avatar block in the center of the right panel -->
  <g transform="translate(${rightPanelX + (rightPanelWidth - 280) / 2}, ${(height - 280) / 2})">
    <rect width="280" height="280" rx="40" fill="${brandData.colors.primary}" />
    <image href="${dataUri}" x="10" y="10" width="260" height="260" preserveAspectRatio="xMidYMid meet"/>
  </g>

  <!-- Main Title -->
  ${titleLines.map((line, i) => `
  <text x="${leftPad}" y="${titleStartY + (i * titleLineHeight)}" font-size="${titleFontSize}" font-weight="800" fill="${brandData.colors.text}" letter-spacing="-1.2">${escapeXml(line)}</text>
  `).join('')}

  <!-- Description / Subtitle -->
  ${descLines.map((line, i) => `
  <text x="${leftPad}" y="${descStartY + (i * descLineHeight)}" font-size="${descFontSize}" font-weight="400" fill="${brandData.colors.text}" opacity="0.62">${escapeXml(line)}</text>
  `).join('')}

  <!-- Miscs: Version and Site Title horizontally aligned -->
  ${brandData.version ? `<text x="${leftPad}" y="540" font-size="32" font-weight="700" fill="${brandData.colors.primary}">v${brandData.version}</text>` : ''}
  <text x="${brandData.version ? leftPad + 120 : leftPad}" y="540" font-size="32" font-weight="700" fill="${brandData.colors.primary}">${escapeXml(brandData.siteTitle)}</text>
</svg>`

  const pngData = svgToPng(svg, width)
  await writeFile(outputPath, pngData)
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
      await generateOgImageFromSource(brandData, sourceLogo, ogTarget, {
        bgColor: logoOptions.bgColor || brandData.colors.background,
      })
      console.log('   ✓ og-image.jpg (from source logo)')
      refs.ogImage = 'og-image.jpg'
    } else {
      await generateOGImage(brandData, path.join(outDir, 'og-image.jpg'))
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
    await generateSquareImageFromSource(path.join(outDir, refs.faviconPrimary || 'favicon.ico'), faviconIcoPath, 32, {
      padding: 0,
      bg: 'auto',
      bgColor: brandData.colors.primary,
    }).catch(async () => {
      // Fallback to lettermark icon when no source image can be used.
      const size = 32
      const initial = brandData.name.substring(0, 2).toUpperCase()
      const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${brandData.colors.primary}" rx="4"/>
  <text x="50%" y="50%" font-size="16" font-weight="700" fill="${brandData.colors.background}"
        text-anchor="middle" dominant-baseline="central" letter-spacing="-0.5"
        font-family="-apple-system, BlinkMacSystemFont, sans-serif">${initial}</text>
</svg>`
      await writeFile(faviconIcoPath, svgToPng(svg, size))
      console.log('   ✓ favicon.ico (32x32)')
    })
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
    const initial = brandData.name.substring(0, 2).toUpperCase()
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" fill="${brandData.colors.primary}" rx="6"/>
  <text x="16" y="16" font-size="16" font-weight="700" fill="${brandData.colors.background}"
        text-anchor="middle" dominant-baseline="central" letter-spacing="-0.5"
        font-family="-apple-system, BlinkMacSystemFont, sans-serif">${initial}</text>
</svg>`
    await writeFile(faviconSvgPath, svg)
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
    await generateSquareImageFromSource(faviconSvgPath, applePath, 180, {
      padding: 0,
      bg: 'solid',
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
    await generateSquareImageFromSource(faviconSvgPath, icon192Path, 192, {
      padding: 0,
      bg: 'solid',
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
    await generateSquareImageFromSource(faviconSvgPath, icon512Path, 512, {
      padding: 0,
      bg: 'solid',
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
      bgColor: logoOptions.bgColor || brandData.colors.background,
    })
    console.log('   ✓ icon-512x512-maskable.png (derived)')
  } else {
    await generateSquareImageFromSource(faviconSvgPath, iconMaskablePath, 512, {
      padding: 10,
      bg: 'solid',
      bgColor: brandData.colors.background,
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
