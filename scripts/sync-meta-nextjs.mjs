import { readFile, writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const brandPath = path.join(rootDir, 'brand.json')

// Detect Next.js structure (App Router vs Pages Router)
function detectNextJsStructure() {
  const appLayoutTs = path.join(rootDir, 'app', 'layout.tsx')
  const appLayoutJs = path.join(rootDir, 'app', 'layout.js')
  const pagesAppTs = path.join(rootDir, 'pages', '_app.tsx')
  const pagesAppJs = path.join(rootDir, 'pages', '_app.js')
  const pagesDocumentTs = path.join(rootDir, 'pages', '_document.tsx')
  const pagesDocumentJs = path.join(rootDir, 'pages', '_document.js')

  if (existsSync(appLayoutTs) || existsSync(appLayoutJs)) {
    return {
      router: 'app',
      file: existsSync(appLayoutTs) ? appLayoutTs : appLayoutJs,
      isTypescript: existsSync(appLayoutTs),
    }
  }

  if (existsSync(pagesAppTs) || existsSync(pagesAppJs)) {
    return {
      router: 'pages',
      file: existsSync(pagesAppTs) ? pagesAppTs : pagesAppJs,
      isTypescript: existsSync(pagesAppTs),
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

// Generate metadata object for App Router
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

// Generate metadata object for Pages Router
function generatePagesRouterMetadata(brand, ogImageUrl) {
  const siteName = brand?.brand?.name || 'My Site'
  const siteTitle = brand?.brand?.siteTitle || siteName
  const siteDescription = brand?.brand?.description || 'Welcome to my site'

  return `const metaTags = (
  <>
    <title>${siteName}</title>
    <meta name="description" content="${siteDescription}" />
    <meta property="og:title" content="${siteTitle}" />
    <meta property="og:description" content="${siteDescription}" />
    <meta property="og:image" content="${ogImageUrl}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${siteTitle}" />
    <meta name="twitter:description" content="${siteDescription}" />
    <meta name="twitter:image" content="${ogImageUrl}" />
  </>
)`
}

// Update App Router layout file
async function updateAppRouterLayout(filePath, newMetadata, isTypescript) {
  let content = await readFile(filePath, 'utf8')

  // Check if metadata already exists
  const metadataRegex = /export const metadata(?:: Metadata)?\s*=\s*\{[\s\S]*?\n\}/

  if (metadataRegex.test(content)) {
    // Replace existing metadata
    content = content.replace(metadataRegex, newMetadata)
  } else {
    // Add import if using TypeScript
    if (isTypescript && !content.includes('import { Metadata }')) {
      content = content.replace(
        /^(import[^;]*;\n)/,
        `import { Metadata } from 'next'\n$1`
      ) || `import { Metadata } from 'next'\n\n${content}`
    }

    // Add metadata after imports, before RootLayout function
    const rootLayoutRegex = /export(?:\s+default)?\s+(?:async\s+)?function\s+RootLayout|export\s+default\s+function|const\s+RootLayout\s*=/
    if (rootLayoutRegex.test(content)) {
      content = content.replace(
        rootLayoutRegex,
        `${newMetadata}\n\n$&`
      )
    } else {
      // Fallback: add at the end before last export
      content = newMetadata + '\n\n' + content
    }
  }

  await writeFile(filePath, content)
}

// Update Pages Router document/app file
async function updatePagesRouterDocument(filePath, newMetadata, isTypescript) {
  let content = await readFile(filePath, 'utf8')

  // For _document.tsx, add to Head component
  if (filePath.includes('_document')) {
    const headRegex = /<Head>([\s\S]*?)<\/Head>/
    if (headRegex.test(content)) {
      // Insert before closing </Head>
      content = content.replace(
        /<\/Head>/,
        `      {metaTags}
    </Head>`
      )
    }

    // Add metaTags definition before render/component
    const renderRegex = /export\s+(?:default\s+)?(?:class|function)|const\s+\w+\s*=/
    if (renderRegex.test(content)) {
      content = content.replace(renderRegex, `${newMetadata}\n\n$&`)
    }
  } else {
    // For _app.tsx, add to Head in Document component or as useEffect
    if (!content.includes('useHead') && !content.includes('<Head>')) {
      console.log('[sync-meta-nextjs] ℹ Add metaTags manually in your _app.tsx or use next-seo')
    }
  }

  await writeFile(filePath, content)
}

async function syncMetaNextJs() {
  const structure = detectNextJsStructure()

  if (!structure) {
    console.error(
      '[sync-meta-nextjs] ✗ Could not find Next.js layout file\n\n' +
      'Expected one of:\n' +
      '  - app/layout.tsx or app/layout.js (App Router)\n' +
      '  - pages/_app.tsx or pages/_app.js (Pages Router)\n' +
      '  - pages/_document.tsx or pages/_document.js (Pages Router)\n'
    )
    process.exit(1)
  }

  // Read brand config
  const brandRaw = await readFile(brandPath, 'utf8')
  const brand = JSON.parse(brandRaw)

  const siteUrl = (brand?.brand?.siteUrl || '').replace(/\/$/, '')
  const ogImageUrl = siteUrl ? `${siteUrl}/og-image.png` : '/og-image.png'

  console.log(`[sync-meta-nextjs] Detected: Next.js ${structure.router} router`)
  console.log(`[sync-meta-nextjs] File: ${path.relative(rootDir, structure.file)}`)

  try {
    if (structure.router === 'app') {
      const metadata = generateAppRouterMetadata(brand, ogImageUrl)
      await updateAppRouterLayout(structure.file, metadata, structure.isTypescript)
      console.log('[sync-meta-nextjs] ✓ Updated metadata in app/layout.tsx')
    } else {
      const metadata = generatePagesRouterMetadata(brand, ogImageUrl)
      await updatePagesRouterDocument(structure.file, metadata, structure.isTypescript)
      console.log('[sync-meta-nextjs] ✓ Updated metadata in pages router')
    }

    console.log('[sync-meta-nextjs] ℹ Review the changes and verify syntax')
  } catch (error) {
    console.error('[sync-meta-nextjs] ✗ Error:', error.message)
    process.exit(1)
  }
}

syncMetaNextJs().catch((error) => {
  console.error('[sync-meta-nextjs] ✗ Fatal error:', error.message)
  process.exit(1)
})
