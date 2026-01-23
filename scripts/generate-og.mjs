import { readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { Resvg } from '@resvg/resvg-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

async function loadJson(relativePath) {
  const filePath = path.join(rootDir, relativePath)
  const raw = await readFile(filePath, 'utf8')
  return JSON.parse(raw)
}

async function generateOgImage() {
  const pkg = await loadJson('package.json')
  const brand = await loadJson('config/brand.json')

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

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style type="text/css">
      text { font-family: ${fontFamily}; }
    </style>
  </defs>
  <rect width="100%" height="100%" fill="${colors.neutralBg}" />
  <text x="80" y="300" font-size="108" font-weight="700" fill="${colors.text}" letter-spacing="-0.5">${siteName}</text>
  <text x="80" y="380" font-size="42" font-weight="400" fill="${colors.text}" opacity="0.85">${siteTitle}</text>
  <text x="80" y="448" font-size="39" font-weight="700" fill="${colors.primary}">${versionLabel}</text>
  <rect x="0" y="${height - 36}" width="${width}" height="36" fill="${colors.accent}" />
</svg>`

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: {
      loadSystemFonts: true
    }
  })

  const pngData = resvg.render().asPng()

  const outDir = path.join(rootDir, 'public')
  await mkdir(outDir, { recursive: true })
  await writeFile(path.join(outDir, 'og-image.png'), pngData)
  console.log('[og-image] ✓ Generated successfully')
}

generateOgImage().catch((error) => {
  console.error('[og-image] generation failed:', error)
  process.exit(1)
})
