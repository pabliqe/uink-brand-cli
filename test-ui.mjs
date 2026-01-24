import express from 'express'
import { readFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { Resvg } from '@resvg/resvg-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const API_PORT = 3000

app.use(express.json({ limit: '50mb' }))

// Load package.json for version (optional, fallback to 0.0.0)
async function getPackageVersion() {
  try {
    const pkgPath = path.join(__dirname, 'package.json')
    const pkg = JSON.parse(await readFile(pkgPath, 'utf8'))
    return pkg.version || '0.0.0'
  } catch (error) {
    // package.json not found or invalid JSON - use default
    return '0.0.0'
  }
}

// Generate OG image from brand config
app.post('/api/generate-og', async (req, res) => {
  try {
    const brand = req.body.brand
    const packageVersion = await getPackageVersion()

    const siteName = brand?.brand?.name || 'UINK'
    const siteTitle = brand?.brand?.siteTitle || brand?.brand?.name || 'UINK WEB'
    const versionLabel = `v${packageVersion}`

    const colors = {
      primary: brand?.colors?.primary?.DEFAULT || '#E00069',
      accent: brand?.colors?.ui?.text?.accent || brand?.colors?.secondary?.blue?.DEFAULT || '#4c53fb',
      neutralBg: brand?.colors?.ui?.background || '#fffdfd',
      text: brand?.colors?.ui?.text?.primary || '#443d3d'
    }

    const width = 1200
    const height = 630
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
      font: { loadSystemFonts: true }
    })

    const pngData = resvg.render().asPng()
    const base64 = pngData.toString('base64')

    res.json({
      success: true,
      image: `data:image/png;base64,${base64}`,
      svg: svg
    })
  } catch (error) {
    console.error('[api/generate-og] Error:', error)
    res.status(400).json({
      success: false,
      error: error.message
    })
  }
})

// Get example brand config
app.get('/api/brand-example', async (req, res) => {
  try {
    const brand = JSON.parse(await readFile(path.join(__dirname, 'brand.example.json'), 'utf8'))
    res.json(brand)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

app.listen(API_PORT, () => {
  console.log(`\n🎨 OG Generator API Server`)
  console.log(`📡 API running on http://localhost:${API_PORT}`)
  console.log(`\nFor the full UI with Vite:`)
  console.log(`   npm install && npm run test:ui`)
  console.log(`\n`)
})
