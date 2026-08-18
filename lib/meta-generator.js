/**
 * Meta Tags and Manifest Generator
 * Pure builders are the core; filesystem writes are a thin CLI wrapper.
 */

import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { FALLBACK_PRIMARY_COLOR } from './css-color.js'

const GENERATOR_NAME = 'uink-brand-cli'

export const META_STATUS_BAR_STYLES = ['default', 'black', 'black-translucent']
export const META_THEME_COLOR_ROLES = ['primary', 'secondary', 'background']

function mimeTypeFromExt(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase()
  const map = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' }
  return map[ext] || 'image/jpeg'
}

function escapeHtml(text) {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeJsx(text) {
  if (!text) return ''
  return text
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
}

function normalizeAssetPath(assetUrlPath = '/') {
  if (assetUrlPath === '/' || assetUrlPath == null || assetUrlPath === '') return ''
  return '/' + String(assetUrlPath).replace(/^\.?\//, '').replace(/\/$/, '')
}

function resolveRefs(refs = {}) {
  return {
    ogImage: refs.ogImage || 'og-image.png',
    faviconPrimary: refs.faviconPrimary || 'favicon.ico',
    hasFaviconSvg: Boolean(refs.hasFaviconSvg),
  }
}

function normalizeGenerateDir(generateDir = '.og-brand') {
  return String(generateDir || '.og-brand').replace(/^\.?\//, '').replace(/\/$/, '') || '.og-brand'
}

function resolveThemeColorHex(brandData, role) {
  const colors = brandData?.colors || {}
  if (role === 'background') return colors.background || '#ffffff'
  if (role === 'secondary') return colors.secondary || colors.accent || colors.primary || FALLBACK_PRIMARY_COLOR
  return colors.primary || FALLBACK_PRIMARY_COLOR
}

/**
 * Normalize meta generation options (iOS Safari / viewport / theme-color).
 * @param {object} brandData
 * @param {object} [metaOptions]
 * @param {'default'|'black'|'black-translucent'} [metaOptions.statusBarStyle]
 * @param {boolean|'yes'|'no'} [metaOptions.userScalable]
 * @param {'primary'|'secondary'|'background'} [metaOptions.themeColor]
 * @param {boolean|'yes'|'no'} [metaOptions.appleWebAppCapable]
 */
export function resolveMetaOptions(brandData, metaOptions = {}) {
  const statusBarStyle = META_STATUS_BAR_STYLES.includes(metaOptions.statusBarStyle)
    ? metaOptions.statusBarStyle
    : 'black'

  const userScalable = !(
    metaOptions.userScalable === false
    || metaOptions.userScalable === 'no'
  )

  const appleWebAppCapable = !(
    metaOptions.appleWebAppCapable === false
    || metaOptions.appleWebAppCapable === 'no'
  )

  const themeColorRole = META_THEME_COLOR_ROLES.includes(metaOptions.themeColor)
    ? metaOptions.themeColor
    : 'primary'

  const themeColor = resolveThemeColorHex(brandData, themeColorRole)
  const viewportContent = userScalable
    ? 'width=device-width, initial-scale=1.0, user-scalable=yes'
    : 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'

  return {
    statusBarStyle,
    userScalable,
    appleWebAppCapable,
    themeColorRole,
    themeColor,
    viewportContent,
  }
}

function buildMobilePwaHtml(meta, assetPath) {
  const capable = meta.appleWebAppCapable ? 'yes' : 'no'
  return `<!-- Mobile & PWA -->
<meta name="viewport" content="${meta.viewportContent}">
<meta name="apple-mobile-web-app-capable" content="${capable}">
<meta name="apple-mobile-web-app-status-bar-style" content="${meta.statusBarStyle}">
<!-- theme-color: Chrome, Firefox, and Safari 15–18. Safari 19+ tints from CSS body / fixed header instead. -->
<meta name="theme-color" content="${meta.themeColor}">
<link rel="manifest" href="${assetPath}/manifest.json">`
}

function buildMobilePwaJsx(meta, assetPath) {
  const capable = meta.appleWebAppCapable ? 'yes' : 'no'
  return `{/* Mobile & PWA */}
      <meta name="viewport" content="${meta.viewportContent}" />
      <meta name="apple-mobile-web-app-capable" content="${capable}" />
      <meta name="apple-mobile-web-app-status-bar-style" content="${meta.statusBarStyle}" />
      {/* theme-color: Chrome, Firefox, and Safari 15–18. Safari 19+ tints from CSS body / fixed header instead. */}
      <meta name="theme-color" content="${meta.themeColor}" />
      <link rel="manifest" href="${assetPath}/manifest.json" />`
}

/**
 * @param {object} brandData
 * @param {object} [metaOptions]
 * @returns {{ name: string, content: string, mime: string }}
 */
export function buildManifest(brandData, metaOptions = {}) {
  const meta = resolveMetaOptions(brandData, metaOptions)
  const displayName = brandData.name || brandData.siteTitle
  const manifest = {
    name: displayName,
    short_name: displayName.length > 12 ? displayName.substring(0, 12) : displayName,
    description: brandData.description,
    start_url: '/',
    display: 'standalone',
    background_color: brandData.colors.background,
    theme_color: meta.themeColor,
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512x512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }

  return {
    name: 'manifest.json',
    content: JSON.stringify(manifest, null, 2),
    mime: 'application/json',
  }
}

function buildReactComponent(brandData, assetPath, refs, meta) {
  return `/**
 * Auto-generated by ${GENERATOR_NAME}
 * DO NOT EDIT MANUALLY - Regenerate with: npx uink-brand
 */

export default function BrandMeta() {
  return (
    <>
      {/* Standard SEO */}
      <title>${brandData.title}</title>
      <meta name="description" content="${escapeJsx(brandData.description)}" />
      <link rel="canonical" href="${brandData.siteUrl}" />
      
      ${buildMobilePwaJsx(meta, assetPath)}
      
      {/* Favicons */}
      <link rel="icon" href="${assetPath}/${refs.faviconPrimary}" sizes="any" />
      ${refs.hasFaviconSvg ? `<link rel="icon" href="${assetPath}/favicon.svg" type="image/svg+xml" />` : ''}
      <link rel="apple-touch-icon" href="${assetPath}/apple-touch-icon.png" />
      
      {/* Open Graph */}
      <meta property="og:title" content="${escapeJsx(brandData.title)}" />
      <meta property="og:description" content="${escapeJsx(brandData.description)}" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="${brandData.siteUrl}" />
      <meta property="og:image" content="${brandData.siteUrl}${assetPath}/${refs.ogImage}" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:type" content="${mimeTypeFromExt(refs.ogImage)}" />
      <meta property="og:image:alt" content="${escapeJsx(brandData.siteTitle)}" />
      <meta property="og:site_name" content="${escapeJsx(brandData.name || brandData.siteTitle)}" />
      <meta property="og:locale" content="en_US" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="${escapeJsx(brandData.title)}" />
      <meta name="twitter:description" content="${escapeJsx(brandData.description)}" />
      <meta name="twitter:image" content="${brandData.siteUrl}${assetPath}/${refs.ogImage}" />
    </>
  )
}
`
}

function buildTypeScriptComponent(brandData, assetPath, refs, meta) {
  return `/**
 * Auto-generated by ${GENERATOR_NAME}
 * DO NOT EDIT MANUALLY - Regenerate with: npx uink-brand
 */

import React from 'react'

export default function BrandMeta(): React.ReactElement {
  return (
    <>
      {/* Standard SEO */}
      <title>${brandData.title}</title>
      <meta name="description" content="${escapeJsx(brandData.description)}" />
      <link rel="canonical" href="${brandData.siteUrl}" />
      
      ${buildMobilePwaJsx(meta, assetPath)}
      
      {/* Favicons */}
      <link rel="icon" href="${assetPath}/${refs.faviconPrimary}" sizes="any" />
      ${refs.hasFaviconSvg ? `<link rel="icon" href="${assetPath}/favicon.svg" type="image/svg+xml" />` : ''}
      <link rel="apple-touch-icon" href="${assetPath}/apple-touch-icon.png" />
      
      {/* Open Graph */}
      <meta property="og:title" content="${escapeJsx(brandData.title)}" />
      <meta property="og:description" content="${escapeJsx(brandData.description)}" />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="${brandData.siteUrl}" />
      <meta property="og:image" content="${brandData.siteUrl}${assetPath}/${refs.ogImage}" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:type" content="${mimeTypeFromExt(refs.ogImage)}" />
      <meta property="og:image:alt" content="${escapeJsx(brandData.siteTitle)}" />
      <meta property="og:site_name" content="${escapeJsx(brandData.name || brandData.siteTitle)}" />
      <meta property="og:locale" content="en_US" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="${escapeJsx(brandData.title)}" />
      <meta name="twitter:description" content="${escapeJsx(brandData.description)}" />
      <meta name="twitter:image" content="${brandData.siteUrl}${assetPath}/${refs.ogImage}" />
    </>
  )
}
`
}

function buildHTMLPartial(brandData, assetPath, refs, meta) {
  return `<!-- Auto-generated by ${GENERATOR_NAME} -->
<!-- DO NOT EDIT MANUALLY - Regenerate with: npx uink-brand -->

<!-- Standard SEO -->
<title>${escapeHtml(brandData.title)}</title>
<meta name="description" content="${escapeHtml(brandData.description)}">
<link rel="canonical" href="${brandData.siteUrl}">

${buildMobilePwaHtml(meta, assetPath)}

<!-- Favicons -->
<link rel="icon" href="${assetPath}/${refs.faviconPrimary}" sizes="any">
${refs.hasFaviconSvg ? `<link rel="icon" href="${assetPath}/favicon.svg" type="image/svg+xml">` : ''}
<link rel="apple-touch-icon" href="${assetPath}/apple-touch-icon.png">

<!-- Open Graph -->
<meta property="og:title" content="${escapeHtml(brandData.title)}">
<meta property="og:description" content="${escapeHtml(brandData.description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${brandData.siteUrl}">
<meta property="og:image" content="${brandData.siteUrl}${assetPath}/${refs.ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:type" content="${mimeTypeFromExt(refs.ogImage)}">
<meta property="og:image:alt" content="${escapeHtml(brandData.siteTitle)}">
<meta property="og:site_name" content="${escapeHtml(brandData.name || brandData.siteTitle)}">
<meta property="og:locale" content="en_US">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(brandData.title)}">
<meta name="twitter:description" content="${escapeHtml(brandData.description)}">
<meta name="twitter:image" content="${brandData.siteUrl}${assetPath}/${refs.ogImage}">
`
}

function buildNextMetadata(brandData, assetPath, refs, generateDir, meta) {
  const viewportBlock = meta.userScalable
    ? `  viewport: {
    width: 'device-width',
    initialScale: 1,
    userScalable: true,
  },`
    : `  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },`

  return `/**
 * Auto-generated by ${GENERATOR_NAME}
 * DO NOT EDIT MANUALLY - Regenerate with: npx uink-brand
 * 
 * Usage in Next.js App Router:
 * import { metadata } from './${generateDir}/next-metadata'
 * export { metadata }
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '${escapeJsx(brandData.title)}',
  description: '${escapeJsx(brandData.description)}',
  applicationName: '${escapeJsx(brandData.siteTitle)}',
  generator: 'Next.js',
  keywords: ['${escapeJsx(brandData.siteTitle)}'],
  authors: [{ name: '${escapeJsx(brandData.name || brandData.siteTitle)}' }],
  creator: '${escapeJsx(brandData.name || brandData.siteTitle)}',
  publisher: '${escapeJsx(brandData.name || brandData.siteTitle)}',
  metadataBase: new URL('${brandData.siteUrl}'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: '${escapeJsx(brandData.title)}',
    description: '${escapeJsx(brandData.description)}',
    url: '${brandData.siteUrl}',
    siteName: '${escapeJsx(brandData.name || brandData.siteTitle)}',
    images: [
      {
        url: '${assetPath}/${refs.ogImage}',
        width: 1200,
        height: 630,
        alt: '${escapeJsx(brandData.siteTitle)}',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '${escapeJsx(brandData.title)}',
    description: '${escapeJsx(brandData.description)}',
    images: ['${assetPath}/${refs.ogImage}'],
  },
  icons: {
    icon: [
      { url: '${assetPath}/${refs.faviconPrimary}', sizes: 'any' },
      ${refs.hasFaviconSvg ? `{ url: '${assetPath}/favicon.svg', type: 'image/svg+xml' },` : ''}
    ],
    apple: [
      { url: '${assetPath}/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '${assetPath}/manifest.json',
  themeColor: '${meta.themeColor}',
  appleWebApp: {
    capable: ${meta.appleWebAppCapable},
    statusBarStyle: '${meta.statusBarStyle}',
  },
${viewportBlock}
}
`
}

function buildReadme(generateDir) {
  return `# Auto-Generated Brand Assets

This directory contains auto-generated meta tag components and snippets.

**DO NOT EDIT THESE FILES MANUALLY** - They will be overwritten on the next build.

To regenerate: \`npx uink-brand\`

## Usage

### React/Next.js (JSX)
\`\`\`jsx
import BrandMeta from './${generateDir}/BrandMeta.jsx'

export default function App() {
  return (
    <>
      <head>
        <BrandMeta />
      </head>
      <body>...</body>
    </>
  )
}
\`\`\`

### Next.js App Router
\`\`\`typescript
import { metadata } from './${generateDir}/next-metadata'
export { metadata }
\`\`\`

### Static HTML
Copy the contents of \`meta.html\` into your \`<head>\` tag.

## Generated Files
- \`BrandMeta.jsx\` - React component
- \`BrandMeta.tsx\` - TypeScript React component
- \`next-metadata.ts\` - Next.js metadata object
- \`meta.html\` - Static HTML snippet
`
}

/**
 * Build meta files in memory.
 * @param {object} brandData
 * @param {object} [refs]
 * @param {object} [options]
 * @param {string} [options.assetUrlPath='/']
 * @param {string} [options.generateDir='.og-brand']
 * @param {object} [options.metaOptions]
 * @returns {Array<{ path: string, name: string, content: string, mime: string }>}
 */
export function buildMetaFiles(brandData, refs = {}, options = {}) {
  const assetPath = normalizeAssetPath(options.assetUrlPath ?? '/')
  const generateDir = normalizeGenerateDir(options.generateDir)
  const resolvedRefs = resolveRefs(refs)
  const meta = resolveMetaOptions(brandData, options.metaOptions)

  return [
    {
      path: `${generateDir}/BrandMeta.jsx`,
      name: 'BrandMeta.jsx',
      content: buildReactComponent(brandData, assetPath, resolvedRefs, meta),
      mime: 'text/javascript',
    },
    {
      path: `${generateDir}/BrandMeta.tsx`,
      name: 'BrandMeta.tsx',
      content: buildTypeScriptComponent(brandData, assetPath, resolvedRefs, meta),
      mime: 'text/typescript',
    },
    {
      path: `${generateDir}/meta.html`,
      name: 'meta.html',
      content: buildHTMLPartial(brandData, assetPath, resolvedRefs, meta),
      mime: 'text/html',
    },
    {
      path: `${generateDir}/next-metadata.ts`,
      name: 'next-metadata.ts',
      content: buildNextMetadata(brandData, assetPath, resolvedRefs, generateDir, meta),
      mime: 'text/typescript',
    },
    {
      path: `${generateDir}/README.md`,
      name: 'README.md',
      content: buildReadme(generateDir),
      mime: 'text/markdown',
    },
  ]
}

/**
 * Generate PWA manifest.json to disk
 */
export async function generateManifest(brandData, outDir, metaOptions = {}) {
  const manifest = buildManifest(brandData, metaOptions)
  const manifestPath = path.join(outDir, manifest.name)
  await writeFile(manifestPath, manifest.content)
}

/**
 * Generate meta tag components to disk
 */
export async function generateMetaFiles(brandData, generateDir, assetDir, refs = {}, metaOptions = {}) {
  await mkdir(generateDir, { recursive: true })

  const files = buildMetaFiles(brandData, refs, {
    assetUrlPath: assetDir,
    generateDir: path.basename(generateDir),
    metaOptions,
  })

  for (const file of files) {
    await writeFile(path.join(generateDir, file.name), file.content)
    console.log(`   ✓ ${file.name}`)
  }
}
