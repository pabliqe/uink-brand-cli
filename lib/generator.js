/**
 * Asset Generator using Satori and Resvg
 * Generates OG images, favicons, and PWA icons
 */

import { mkdir, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { Resvg } from '@resvg/resvg-js'
import satori from 'satori'
import path from 'path'

/**
 * Generate SVG using Satori (React-like JSX to SVG)
 */
async function generateSVGWithSatori(jsx, width, height) {
  const svg = await satori(jsx, {
    width,
    height,
    fonts: [], // Using system fonts via CSS font-family in SVG
  })
  return svg
}

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

/**
 * Generate 1200x630 Open Graph image
 */
async function generateOGImage(brandData, outputPath) {
  const width = 1200
  const height = 630

  const nameLines = wrapText(brandData.name, 18)
  const titleLines = wrapText(brandData.siteTitle, 40)

  // Build SVG manually for better Satori compatibility
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style type="text/css">
      text { 
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      }
    </style>
  </defs>
  
  <!-- Background -->
  <rect width="100%" height="100%" fill="${brandData.colors.background}" />
  
  <!-- Decorative circles -->
  <circle cx="${width - 150}" cy="120" r="220" fill="${brandData.colors.primary}" opacity="0.06" />
  <circle cx="120" cy="${height - 100}" r="180" fill="${brandData.colors.accent}" opacity="0.06" />
  
  <!-- Brand name -->
  ${nameLines.map((line, i) => `
  <text x="80" y="${240 + (i * 120)}" font-size="110" font-weight="700" fill="${brandData.colors.text}" letter-spacing="-2">${escapeXml(line)}</text>
  `).join('')}
  
  <!-- Site title -->
  ${titleLines.map((line, i) => `
  <text x="80" y="${240 + (nameLines.length * 120) + 60 + (i * 50)}" font-size="42" font-weight="400" fill="${brandData.colors.text}" opacity="0.8">${escapeXml(line)}</text>
  `).join('')}
  
  <!-- Version badge -->
  <text x="80" y="${540}" font-size="36" font-weight="700" fill="${brandData.colors.primary}">v${brandData.version}</text>
  
  <!-- Bottom accent bar -->
  <rect x="0" y="${height - 40}" width="${width}" height="40" fill="${brandData.colors.accent}" />
</svg>`

  const pngData = svgToPng(svg, width)
  await writeFile(outputPath, pngData)
  console.log(`   ✓ og-image.jpg (${width}x${height})`)
}

/**
 * Generate simple favicon (32x32 ICO format)
 */
async function generateFavicon(brandData, outputPath) {
  const size = 32
  const initial = brandData.name.charAt(0).toUpperCase()

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${brandData.colors.primary}" rx="4"/>
  <text x="50%" y="50%" font-size="20" font-weight="700" fill="${brandData.colors.background}" 
        text-anchor="middle" dominant-baseline="central" 
        font-family="-apple-system, BlinkMacSystemFont, sans-serif">${initial}</text>
</svg>`

  const pngData = svgToPng(svg, size)
  await writeFile(outputPath, pngData)
  console.log(`   ✓ favicon.ico (${size}x${size})`)
}

/**
 * Generate scalable SVG favicon
 */
async function generateFaviconSVG(brandData, outputPath) {
  const initial = brandData.name.charAt(0).toUpperCase()

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" fill="${brandData.colors.primary}" rx="6"/>
  <text x="16" y="16" font-size="20" font-weight="700" fill="${brandData.colors.background}" 
        text-anchor="middle" dominant-baseline="central" 
        font-family="-apple-system, BlinkMacSystemFont, sans-serif">${initial}</text>
</svg>`

  await writeFile(outputPath, svg)
  console.log(`   ✓ favicon.svg (scalable)`)
}

/**
 * Generate Apple Touch Icon (180x180)
 */
async function generateAppleTouchIcon(brandData, outputPath) {
  const size = 180
  const initial = brandData.name.charAt(0).toUpperCase()

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${brandData.colors.primary}"/>
  <text x="50%" y="50%" font-size="100" font-weight="700" fill="${brandData.colors.background}" 
        text-anchor="middle" dominant-baseline="central" 
        font-family="-apple-system, BlinkMacSystemFont, sans-serif">${initial}</text>
</svg>`

  const pngData = svgToPng(svg, size)
  await writeFile(outputPath, pngData)
  console.log(`   ✓ apple-touch-icon.png (${size}x${size})`)
}

/**
 * Generate PWA icon
 */
async function generatePWAIcon(brandData, size, outputPath, maskable = false) {
  const initial = brandData.name.charAt(0).toUpperCase()
  const padding = maskable ? size * 0.2 : 0
  const innerSize = size - (padding * 2)

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  ${maskable ? `<rect width="100%" height="100%" fill="${brandData.colors.background}"/>` : ''}
  <rect x="${padding}" y="${padding}" width="${innerSize}" height="${innerSize}" 
        fill="${brandData.colors.primary}" rx="${maskable ? innerSize * 0.2 : innerSize * 0.1}"/>
  <text x="50%" y="50%" font-size="${size * 0.5}" font-weight="700" fill="${brandData.colors.background}" 
        text-anchor="middle" dominant-baseline="central" 
        font-family="-apple-system, BlinkMacSystemFont, sans-serif">${initial}</text>
</svg>`

  const pngData = svgToPng(svg, size)
  await writeFile(outputPath, pngData)
  const label = maskable ? `${size}x${size}, maskable` : `${size}x${size}`
  console.log(`   ✓ icon-${size}x${size}${maskable ? '-maskable' : ''}.png (${label})`)
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
 */
export async function generateAssets(brandData, outDir, force = false) {
  await mkdir(outDir, { recursive: true })

  const assets = [
    { name: 'og-image.jpg', fn: () => generateOGImage(brandData, path.join(outDir, 'og-image.jpg')) },
    { name: 'favicon.ico', fn: () => generateFavicon(brandData, path.join(outDir, 'favicon.ico')) },
    { name: 'favicon.svg', fn: () => generateFaviconSVG(brandData, path.join(outDir, 'favicon.svg')) },
    { name: 'apple-touch-icon.png', fn: () => generateAppleTouchIcon(brandData, path.join(outDir, 'apple-touch-icon.png')) },
    { name: 'icon-192x192.png', fn: () => generatePWAIcon(brandData, 192, path.join(outDir, 'icon-192x192.png')) },
    { name: 'icon-512x512.png', fn: () => generatePWAIcon(brandData, 512, path.join(outDir, 'icon-512x512.png')) },
    { name: 'icon-512x512-maskable.png', fn: () => generatePWAIcon(brandData, 512, path.join(outDir, 'icon-512x512-maskable.png'), true) },
  ]

  let skippedCount = 0
  let generatedCount = 0

  for (const asset of assets) {
    const assetPath = path.join(outDir, asset.name)
    
    if (!force && existsSync(assetPath)) {
      console.log(`   ⊙ ${asset.name} (using existing)`)
      skippedCount++
    } else {
      await asset.fn()
      generatedCount++
    }
  }

  if (skippedCount > 0) {
    console.log(`\n   ℹ Found ${skippedCount} existing asset(s). Use --force to regenerate.`)
  }
}
