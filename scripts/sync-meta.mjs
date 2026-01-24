import { readFile, writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

const brandPath = path.join(rootDir, 'brand.json')
const htmlPath = path.join(rootDir, 'index.html')

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
    console.log('[sync-meta] Updated index.html with brand title/description')
  } else {
    console.log('[sync-meta] No changes needed')
  }
}

syncMeta().catch((error) => {
  console.error('[sync-meta] failed:', error)
  process.exit(1)
})
