import { readFile, writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const brandPath = path.join(rootDir, 'brand.json')

// Detect framework and resolve HTML path intelligently
async function detectFrameworkAndResolveHtml() {
  // Check for Next.js
  if (existsSync(path.join(rootDir, 'next.config.js')) || existsSync(path.join(rootDir, 'next.config.mjs'))) {
    return {
      framework: 'nextjs',
      error: `[sync-meta] ✗ Next.js detected - sync-meta doesn't work with Next.js\n\n` +
             `Next.js uses dynamic server-side rendering. Use the Metadata API instead:\n\n` +
             `// app/layout.tsx or pages/_document.tsx\n` +
             `export const metadata = {\n` +
             `  title: brand.brand.name,\n` +
             `  description: brand.brand.description,\n` +
             `  openGraph: {\n` +
             `    title: brand.brand.name,\n` +
             `    description: brand.brand.description,\n` +
             `    images: [{ url: '/og-image.png' }]\n` +
             `  }\n` +
             `}\n`
    }
  }

  // Check for environment variable override
  if (process.env.HTML_PATH) {
    const htmlPath = path.join(rootDir, process.env.HTML_PATH)
    if (existsSync(htmlPath)) {
      return { framework: 'custom', htmlPath }
    }
    return {
      error: `[sync-meta] ✗ HTML_PATH not found: ${process.env.HTML_PATH}`
    }
  }

  // Auto-detect common HTML file locations
  const commonPaths = [
    'index.html',                        // Static sites, root
    'public/index.html',                 // Create React App, Vite
    'dist/index.html',                   // Build output
    'src/index.html',                    // Some static generators
    'pages/index.html',                  // Some frameworks
  ]

  for (const relativePath of commonPaths) {
    const fullPath = path.join(rootDir, relativePath)
    if (existsSync(fullPath)) {
      return { framework: 'static', htmlPath: fullPath }
    }
  }

  return {
    error: `[sync-meta] ✗ No HTML file found\n\n` +
           `Searched: ${commonPaths.join(', ')}\n\n` +
           `Options:\n` +
           `1. Create index.html in project root\n` +
           `2. Specify custom path: HTML_PATH=path/to/file.html npm run sync:meta\n` +
           `3. For Next.js: Use the Metadata API instead\n`
  }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function replaceMeta(html, attr, key, value) {
  const regex = new RegExp(`(<meta[^>]*${attr}\\s*=\\s*"${escapeRegex(key)}"[^>]*content\\s*=\\s*")(.*?)(")`, 'i')
  return html.replace(regex, `$1${value}$3`)
}

async function syncMeta() {
  const brandRaw = await readFile(brandPath, 'utf8')
  const brand = JSON.parse(brandRaw)

  const siteName = brand?.brand?.name || 'UINK WEB'
  const siteDescription = brand?.brand?.description || 'Sistema gráfico - Design system for UINK WEB'
  const siteUrl = (brand?.brand?.siteUrl || '').replace(/\/$/, '')
  const ogImageUrl = siteUrl ? `${siteUrl}/og-image.png` : '/og-image.png'

  // Detect framework
  const detection = await detectFrameworkAndResolveHtml()

  if (detection.error) {
    console.error(detection.error)
    process.exit(1)
  }

  const htmlPath = detection.htmlPath
  const framework = detection.framework
  
  console.log(`[sync-meta] Detected framework: ${framework}`)
  console.log(`[sync-meta] Using HTML file: ${path.relative(rootDir, htmlPath)}`)

  const html = await readFile(htmlPath, 'utf8')

  let updated = html
  updated = updated.replace(/<title>.*?<\/title>/i, `<title>${siteName}</title>`)
  updated = replaceMeta(updated, 'name', 'description', siteDescription)
  updated = replaceMeta(updated, 'property', 'og:title', siteName)
  updated = replaceMeta(updated, 'property', 'og:description', siteDescription)
  updated = replaceMeta(updated, 'property', 'og:image', ogImageUrl)
  updated = replaceMeta(updated, 'name', 'twitter:title', siteName)
  updated = replaceMeta(updated, 'name', 'twitter:description', siteDescription)
  updated = replaceMeta(updated, 'name', 'twitter:image', ogImageUrl)

  if (updated !== html) {
    await writeFile(htmlPath, updated)
    console.log('[sync-meta] ✓ Updated meta tags successfully')
  } else {
    console.log('[sync-meta] ℹ No changes needed - meta tags already up to date')
  }
}

syncMeta().catch((error) => {
  console.error('[sync-meta] ✗ Error:', error.message)
  process.exit(1)
})
