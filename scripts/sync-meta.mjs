import { readFile, writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const brandPath = path.join(rootDir, 'brand.json')

// ============================================================================
// FRAMEWORK DETECTION
// ============================================================================

// Detect Next.js structure (App Router vs Pages Router)
function detectNextJsStructure() {
  const appLayoutTs = path.join(rootDir, 'app', 'layout.tsx')
  const appLayoutJs = path.join(rootDir, 'app', 'layout.js')
  const pagesDocumentTs = path.join(rootDir, 'pages', '_document.tsx')
  const pagesDocumentJs = path.join(rootDir, 'pages', '_document.js')

  if (existsSync(appLayoutTs) || existsSync(appLayoutJs)) {
    return {
      router: 'app',
      file: existsSync(appLayoutTs) ? appLayoutTs : appLayoutJs,
      isTypescript: existsSync(appLayoutTs),
    }
  }

  if (existsSync(pagesDocumentTs) || existsSync(pagesDocumentJs)) {
    return {
      router: 'pages',
      file: existsSync(pagesDocumentTs) ? pagesDocumentTs : pagesDocumentJs,
      isTypescript: existsSync(pagesDocumentTs),
    }
  }

  return null
}

// Detect framework and resolve HTML path
async function detectFramework() {
  // Check for Next.js first
  if (existsSync(path.join(rootDir, 'next.config.js')) || existsSync(path.join(rootDir, 'next.config.mjs'))) {
    const structure = detectNextJsStructure()
    if (structure) {
      return { type: 'nextjs', structure }
    }
  }

  // Check for environment variable override (static sites)
  if (process.env.HTML_PATH) {
    const htmlPath = path.join(rootDir, process.env.HTML_PATH)
    if (existsSync(htmlPath)) {
      return { type: 'static', htmlPath }
    }
    return {
      error: `[sync-meta] ✗ HTML_PATH not found: ${process.env.HTML_PATH}`
    }
  }

  // Auto-detect common HTML file locations
  const commonPaths = [
    'index.html',
    'public/index.html',
    'dist/index.html',
    'src/index.html',
    'pages/index.html',
  ]

  for (const relativePath of commonPaths) {
    const fullPath = path.join(rootDir, relativePath)
    if (existsSync(fullPath)) {
      return { type: 'static', htmlPath: fullPath }
    }
  }

  return {
    error: `[sync-meta] ✗ No HTML file or Next.js project found\n\n` +
           `Options:\n` +
           `1. Create index.html in project root\n` +
           `2. Specify custom path: HTML_PATH=path/to/file.html npm run sync:meta\n` +
           `3. Check examples/: nextjs-app-router-layout.tsx, nextjs-pages-router-document.tsx\n`
  }
}

// ============================================================================
// NEXT.JS METADATA GENERATION
// ============================================================================

function generateAppRouterMetadata(brand, ogImageUrl) {
  const siteName = brand?.brand?.name || 'My Site'
  const siteTitle = brand?.brand?.siteTitle || siteName
  const siteDescription = brand?.brand?.description || 'Welcome to my site'

  return `export const metadata: Metadata = {
  title: '${siteName}',
  description: '${siteDescription}',
  openGraph: {
    title: '${siteTitle}',
    description: '${siteDescription}',
    images: [
      {
        url: '${ogImageUrl}',
        width: 1200,
        height: 630,
        alt: '${siteName}',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '${siteTitle}',
    description: '${siteDescription}',
    images: ['${ogImageUrl}'],
  },
}`
}

// ============================================================================
// NEXT.JS FILE UPDATES
// ============================================================================

async function updateAppRouterLayout(filePath, newMetadata) {
  let content = await readFile(filePath, 'utf8')

  // Check if metadata already exists
  const metadataRegex = /export const metadata(?:: Metadata)?\s*=\s*\{[\s\S]*?\n\}/

  if (metadataRegex.test(content)) {
    // Replace existing metadata
    content = content.replace(metadataRegex, newMetadata)
  } else {
    // Add Metadata import if missing
    if (!content.includes('import { Metadata }')) {
      const firstImport = content.match(/^import[^;]*;/m)
      if (firstImport) {
        content = content.replace(
          firstImport[0],
          `import { Metadata } from 'next'\n${firstImport[0]}`
        )
      } else {
        content = `import { Metadata } from 'next'\n\n${content}`
      }
    }

    // Add metadata before RootLayout function
    const functionRegex = /export(?:\s+default)?\s+(?:async\s+)?function\s+RootLayout|export\s+default\s+function|const\s+RootLayout\s*=/
    if (functionRegex.test(content)) {
      content = content.replace(functionRegex, `${newMetadata}\n\n$&`)
    } else {
      content = newMetadata + '\n\n' + content
    }
  }

  await writeFile(filePath, content)
}

// ============================================================================
// STATIC SITE META TAG UPDATES
// ============================================================================

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function replaceMeta(html, attr, key, value) {
  const regex = new RegExp(`(<meta[^>]*${attr}\\s*=\\s*"${escapeRegex(key)}"[^>]*content\\s*=\\s*")(.*?)(")`, 'i')
  return html.replace(regex, `$1${value}$3`)
}

async function updateStaticHtml(filePath, brand, ogImageUrl) {
  const siteName = brand?.brand?.name || 'UINK WEB'
  const siteDescription = brand?.brand?.description || 'Sistema gráfico - Design system for UINK WEB'

  const html = await readFile(filePath, 'utf8')

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
    await writeFile(filePath, updated)
    return true
  }
  return false
}

// ============================================================================
// MAIN SYNC FUNCTION
// ============================================================================

async function syncMeta() {
  // Detect framework
  const detection = await detectFramework()

  if (detection.error) {
    console.error(detection.error)
    process.exit(1)
  }

  // Read brand config
  const brandRaw = await readFile(brandPath, 'utf8')
  const brand = JSON.parse(brandRaw)

  const siteUrl = (brand?.brand?.siteUrl || '').replace(/\/$/, '')
  const ogImageUrl = siteUrl ? `${siteUrl}/og-image.png` : '/og-image.png'

  if (detection.type === 'nextjs') {
    // Handle Next.js
    const structure = detection.structure
    console.log(`[sync-meta] Detected: Next.js ${structure.router} router`)
    console.log(`[sync-meta] File: ${path.relative(rootDir, structure.file)}`)

    try {
      const metadata = generateAppRouterMetadata(brand, ogImageUrl)
      await updateAppRouterLayout(structure.file, metadata)
      console.log('[sync-meta] ✓ Updated metadata')
    } catch (error) {
      console.error('[sync-meta] ✗ Error:', error.message)
      process.exit(1)
    }
  } else {
    // Handle static sites
    const htmlPath = detection.htmlPath
    console.log(`[sync-meta] Using HTML file: ${path.relative(rootDir, htmlPath)}`)

    try {
      const changed = await updateStaticHtml(htmlPath, brand, ogImageUrl)
      if (changed) {
        console.log('[sync-meta] ✓ Updated meta tags successfully')
      } else {
        console.log('[sync-meta] ℹ No changes needed - meta tags already up to date')
      }
    } catch (error) {
      console.error('[sync-meta] ✗ Error:', error.message)
      process.exit(1)
    }
  }
}

syncMeta().catch((error) => {
  console.error('[sync-meta] ✗ Fatal error:', error.message)
  process.exit(1)
})
