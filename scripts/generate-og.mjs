import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Resvg } from '@resvg/resvg-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

function detectOutDir() {
  // Allow explicit override via env var or CLI (simple arg check)
  const argDir = process.argv.find(arg => arg.startsWith('--outDir='))?.split('=')[1]
  const envDir = process.env.OG_OUT_DIR || argDir

  if (envDir) {
    console.log(`[og-image] Using custom output directory: ${envDir}`)
    return path.resolve(rootDir, envDir)
  }

  // Priority detection: public -> static -> dist -> build
  const candidates = ['public', 'static', 'dist', 'build']
  for (const dir of candidates) {
    if (existsSync(path.join(rootDir, dir))) {
      return path.join(rootDir, dir)
    }
  }

  // Default fallback
  return path.join(rootDir, 'public')
}

async function loadJson(relativePath) {
  const filePath = path.join(rootDir, relativePath)
  const raw = await readFile(filePath, 'utf8')
  return JSON.parse(raw)
}

/**
 * Simple word wrap for SVG text
 */
function wrapText(text, maxChars) {
  if (!text) return []
  const words = text.split(' ')
  const lines = []
  let currentLine = words[0]

  for (let i = 1; i < words.length; i++) {
    if (currentLine.length + words[i].length + 1 <= maxChars) {
      currentLine += ' ' + words[i]
    } else {
      lines.push(currentLine)
      currentLine = words[i]
    }
  }
  lines.push(currentLine)
  return lines
}

async function generateOgImage() {
  const pkg = await loadJson('package.json')
  const brand = await loadJson('brand.json')

  const siteName = brand?.brand?.name || pkg?.name || 'UINK'
  const siteTitle = brand?.brand?.siteTitle || brand?.brand?.name || 'UINK WEB'
  const versionLabel = pkg?.version ? `v${pkg.version}` : 'v0.0.0'

  const colors = {
    primary: brand?.colors?.primary?.DEFAULT || '#E00069',
    accent: brand?.colors?.ui?.text?.accent || brand?.colors?.secondary?.blue?.DEFAULT || '#4c53fb',
    neutralBg: brand?.colors?.ui?.background || '#fffdfd',
    text: brand?.colors?.ui?.text?.primary || '#443d3d'
  }

  const width = 1200
  const height = 630

  console.log('[og-image] Generating OG image with safe Linux fonts...')

  // Safe font stack for Netlify builds (Linux) and macOS
  // These fonts are guaranteed to be available on Ubuntu/Debian servers
  const fontFamily = 'DejaVu Sans, Liberation Sans, Ubuntu Sans, Noto Sans, Arial, sans-serif'

  // Wrap text to prevent overflow
  const nameLines = wrapText(siteName, 18)
  const titleLines = wrapText(siteTitle, 45)

  // Calculate dynamic positions
  const nameFontSize = 108
  const titleFontSize = 42
  const nameLineHeight = 110
  const titleLineHeight = 52

  let currentY = 280
  
  const nameMarkup = nameLines.map((line, i) => 
    `<text x="80" y="${currentY + (i * nameLineHeight)}" font-size="${nameFontSize}" font-weight="700" fill="${colors.text}" letter-spacing="-0.5">${line}</text>`
  ).join('\n')

  currentY += (nameLines.length * nameLineHeight) - 20

  const titleMarkup = titleLines.map((line, i) => 
    `<text x="80" y="${currentY + (i * titleLineHeight)}" font-size="${titleFontSize}" font-weight="400" fill="${colors.text}" opacity="0.85">${line}</text>`
  ).join('\n')

  currentY += (titleLines.length * titleLineHeight) + 16

  const versionMarkup = `<text x="80" y="${currentY}" font-size="39" font-weight="700" fill="${colors.primary}">${versionLabel}</text>`

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style type="text/css">
      text { font-family: ${fontFamily}; }
    </style>
  </defs>
  <rect width="100%" height="100%" fill="${colors.neutralBg}" />
  
  <!-- Decorative elements -->
  <circle cx="${width - 100}" cy="100" r="200" fill="${colors.primary}" opacity="0.05" />
  <circle cx="100" cy="${height - 100}" r="150" fill="${colors.accent}" opacity="0.05" />

  ${nameMarkup}
  ${titleMarkup}
  ${versionMarkup}
  
  <rect x="0" y="${height - 36}" width="${width}" height="36" fill="${colors.accent}" />
</svg>`

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: {
      loadSystemFonts: true
    }
  })

  const pngData = resvg.render().asPng()

  const outDir = detectOutDir()
  await mkdir(outDir, { recursive: true })
  await writeFile(path.join(outDir, 'og-image.png'), pngData)
  console.log(`[og-image] ✓ Generated successfully in ${path.relative(rootDir, outDir)}/`)
}

generateOgImage().catch((error) => {
  console.error('[og-image] generation failed:', error)
  process.exit(1)
})
