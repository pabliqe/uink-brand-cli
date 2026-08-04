/**
 * DTCG (Design Token Community Group) Parser
 * Extracts brand information and design tokens from DTCG-compliant JSON files
 * with fallback to package.json for missing metadata
 */

import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

function getCaseInsensitiveKey(obj, key) {
  if (!obj || typeof obj !== 'object') return null
  const lower = key.toLowerCase()
  return Object.keys(obj).find((candidate) => candidate.toLowerCase() === lower) || null
}

function getNodeAtPath(obj, pathString) {
  if (!obj) return null

  const parts = pathString.split('.')
  let current = obj

  for (const part of parts) {
    if (current == null || typeof current !== 'object') return null
    const matchedKey = getCaseInsensitiveKey(current, part)
    if (matchedKey == null) return null
    current = current[matchedKey]
  }

  return current
}

function isTokenObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && '$value' in value
}

function collectAssetVariants(node, prefix = '') {
  const variants = {}

  if (node == null) return variants

  if (typeof node === 'string') {
    variants[prefix || '$root'] = node
    return variants
  }

  if (typeof node !== 'object' || Array.isArray(node)) {
    return variants
  }

  if (isTokenObject(node)) {
    if (typeof node.$value === 'string') {
      variants[prefix || '$root'] = node.$value
    }
    return variants
  }

  for (const [key, value] of Object.entries(node)) {
    const nextPrefix = prefix ? `${prefix}.${key}` : key
    Object.assign(variants, collectAssetVariants(value, nextPrefix))
  }

  return variants
}

function pickPreferredVariant(variants, preferredKeys = []) {
  const entries = Object.entries(variants)
  if (entries.length === 0) return null

  const normalizedEntries = entries.map(([key, value]) => ({
    key,
    value,
    lowerKey: key.toLowerCase(),
  }))

  for (const preferredKey of preferredKeys) {
    const lowerPreferredKey = preferredKey.toLowerCase()
    const match = normalizedEntries.find(({ lowerKey }) => (
      lowerKey === lowerPreferredKey || lowerKey.endsWith(`.${lowerPreferredKey}`)
    ))
    if (match) return { key: match.key, value: match.value }
  }

  const [firstKey, firstValue] = entries[0]
  return { key: firstKey, value: firstValue }
}

function extractAssetEntry(obj, pathString, preferredKeys = []) {
  const node = getNodeAtPath(obj, pathString)
  if (node == null) {
    return { value: null, variants: {}, selectedKey: null }
  }

  const variants = collectAssetVariants(node)
  const selected = pickPreferredVariant(variants, preferredKeys)

  return {
    value: selected?.value || null,
    variants,
    selectedKey: selected?.key || null,
  }
}

function getLineAndColumn(text, offset) {
  const clampedOffset = Math.max(0, Math.min(offset, text.length))
  const upToOffset = text.slice(0, clampedOffset)
  const lines = upToOffset.split('\n')
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  }
}

function parseJsonWithContext(filePath, text) {
  try {
    return JSON.parse(text)
  } catch (error) {
    if (error instanceof SyntaxError) {
      const match = error.message.match(/position\s+(\d+)/i)
      if (match) {
        const { line, column } = getLineAndColumn(text, Number(match[1]))
        throw new Error(`Invalid JSON in ${filePath} at line ${line}, column ${column}: ${error.message}`)
      }
      throw new Error(`Invalid JSON in ${filePath}: ${error.message}`)
    }
    throw error
  }
}

/**
 * Extract value from DTCG format or plain JSON.
 * Each path segment is matched case-insensitively against the object's keys.
 * DTCG format: { "$value": "actual-value", "$type": "type" }
 */
function extractValue(obj, pathString, defaultValue = null) {
  if (!obj) return defaultValue

  const parts = pathString.split('.')
  let current = obj

  for (const part of parts) {
    if (current == null || typeof current !== 'object') return defaultValue
    const matchedKey = getCaseInsensitiveKey(current, part)
    if (matchedKey == null) return defaultValue
    current = current[matchedKey]
  }

  // Handle DTCG $value wrapper
  if (current && typeof current === 'object' && '$value' in current) {
    return current.$value
  }

  // Handle nested objects - resolve group root value via DTCG $root (§6.2) then legacy DEFAULT
  if (current && typeof current === 'object' && !Array.isArray(current)) {
    const rootKey = getCaseInsensitiveKey(current, '$root')
    if (rootKey != null) {
      const rootToken = current[rootKey]
      return (rootToken && typeof rootToken === 'object' && '$value' in rootToken)
        ? rootToken.$value
        : rootToken
    }
    const defaultKey = getCaseInsensitiveKey(current, 'DEFAULT')
    if (defaultKey != null) {
      const defaultVal = current[defaultKey]
      return (defaultVal && typeof defaultVal === 'object' && '$value' in defaultVal)
        ? defaultVal.$value
        : defaultVal
    }
    const lowerDefaultKey = getCaseInsensitiveKey(current, 'default')
    if (lowerDefaultKey != null) {
      const defaultVal = current[lowerDefaultKey]
      return (defaultVal && typeof defaultVal === 'object' && '$value' in defaultVal)
        ? defaultVal.$value
        : defaultVal
    }
  }

  return current ?? defaultValue
}

/**
 * Try a list of dot-paths in order and return the first non-null result.
 */
function extractAny(obj, paths, defaultValue = null) {
  for (const p of paths) {
    const v = extractValue(obj, p)
    if (v != null && v !== '') return v
  }
  return defaultValue
}

/** Only accept usable CSS color strings — nested token groups must not become SVG fills. */
function asCssColor(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || trimmed === '[object Object]') return null
  return trimmed
}

function extractCssColor(obj, pathString) {
  return asCssColor(extractValue(obj, pathString))
}

function extractCssColorAny(obj, paths) {
  for (const pathString of paths) {
    const color = extractCssColor(obj, pathString)
    if (color) return color
  }
  return null
}

/**
 * Extract all color values from a color object
 * Handles nested structures and DTCG format
 */
function extractColors(colorObj, prefix = '') {
  const colors = {}

  if (!colorObj || typeof colorObj !== 'object') {
    return colors
  }

  for (const [key, value] of Object.entries(colorObj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key

    // Handle DTCG color tokens
    if (value && typeof value === 'object' && '$value' in value && '$type' in value) {
      if (value.$type === 'color') {
        colors[fullKey] = value.$value
      }
    }
    // Handle plain color values (hex strings)
    else if (typeof value === 'string' && value.startsWith('#')) {
      colors[fullKey] = value
    }
    // Recurse into nested objects
    else if (value && typeof value === 'object') {
      Object.assign(colors, extractColors(value, fullKey))
    }
  }

  return colors
}

/**
 * Extract plain name from npm author field (string or object), stripping <email> and (url) segments.
 * e.g. "Jane Doe <jane@example.com> (https://x.com)" → "Jane Doe"
 */
function cleanAuthor(author) {
  if (!author) return null
  const str = typeof author === 'object' ? (author.name || '') : String(author)
  return str.replace(/\s*<[^>]+>/g, '').replace(/\s*\([^)]+\)/g, '').trim() || null
}

function normalizeSiteUrl(siteUrl) {
  if (!siteUrl) return 'https://example.com'
  const trimmed = String(siteUrl).trim()
  if (!trimmed) return 'https://example.com'
  if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/\/$/, '')
  return `https://${trimmed.replace(/\/$/, '')}`
}

/**
 * Parse an in-memory brand JSON object into normalized brand data.
 * @param {object} brandJson
 * @param {object} [fallbacks]
 * @param {string|null} [fallbacks.version]
 * @param {string|null} [fallbacks.packageName]
 * @param {string|null} [fallbacks.packageDescription]
 * @param {string|null} [fallbacks.packageHomepage]
 * @param {string|null} [fallbacks.packageAuthor]
 * @returns {Object} Normalized brand data
 */
export function parseBrandFromJson(brandJson, fallbacks = {}) {
  const {
    version = null,
    packageName = null,
    packageDescription = null,
    packageHomepage = null,
    packageAuthor = null,
  } = fallbacks

  const rawBrandName = extractAny(brandJson, [
    'brand.name', 'brand.brandname', 'brand.author'
  ])

  const rawSiteTitle = extractAny(brandJson, [
    'brand.siteTitle', 'brand.title', 'brand.sitename'
  ])
  const siteTitle = (typeof rawSiteTitle === 'string' && rawSiteTitle.trim())
    ? rawSiteTitle.trim()
    : (typeof rawBrandName === 'string' && rawBrandName.trim())
      ? rawBrandName.trim()
      : (packageName || 'My Project')

  const name = (typeof rawBrandName === 'string' && rawBrandName.trim())
    ? rawBrandName.trim()
    : (packageAuthor || null)

  const title = (name && name !== siteTitle) ? `${siteTitle} | ${name}` : siteTitle

  const rawDescription = extractAny(brandJson, [
    'brand.description', 'brand.about'
  ])
  const description = (typeof rawDescription === 'string' && rawDescription.trim())
    ? rawDescription.trim()
    : (packageDescription || `Welcome to ${siteTitle}`)

  const siteUrl = normalizeSiteUrl(
    extractAny(brandJson, ['brand.siteUrl', 'brand.url'])
      || packageHomepage
      || 'https://example.com'
  )

  const resolvedVersion = extractAny(brandJson, ['brand.version']) || version

  const colorsRoot = brandJson.colors != null ? 'colors' : 'color'
  const allColors = extractColors(brandJson[colorsRoot] || {})

  const primary = extractCssColorAny(brandJson, [
    `${colorsRoot}.primary`,
    `${colorsRoot}.brand.primary`,
  ]) || '#E00069'

  const background = extractCssColorAny(brandJson, [
    `${colorsRoot}.ui.background`,
    `${colorsRoot}.neutral.50`,
    `${colorsRoot}.background`,
    `${colorsRoot}.bg`,
  ]) || '#ffffff'

  const text = extractCssColorAny(brandJson, [
    `${colorsRoot}.ui.text.primary`,
    `${colorsRoot}.text.primary`,
    `${colorsRoot}.neutral.900`,
    `${colorsRoot}.text`,
    `${colorsRoot}.foreground`,
  ]) || '#000000'

  const accent = extractCssColorAny(brandJson, [
    `${colorsRoot}.secondary.blue`,
    `${colorsRoot}.accent`,
  ]) || primary

  const logoAsset = extractAssetEntry(brandJson, 'brand.assets.logo', [
    'alpha', 'default', '$root', 'mono', 'monochrome', 'white', 'mask', 'color', 'fullColor', 'full-color'
  ])
  const faviconAsset = extractAssetEntry(brandJson, 'brand.assets.favicon', ['default', '$root'])
  const appIconAsset = extractAssetEntry(brandJson, 'brand.assets.appIcon', ['default', '$root'])
  const ogImageAsset = extractAssetEntry(brandJson, 'brand.assets.ogImage', ['default', '$root'])

  return {
    name,
    siteTitle,
    title,
    description,
    siteUrl,
    version: resolvedVersion,
    colors: {
      primary,
      background,
      text,
      accent,
      all: allColors
    },
    assets: {
      logo: logoAsset.value,
      logoVariants: logoAsset.variants,
      favicon: faviconAsset.value,
      faviconVariants: faviconAsset.variants,
      appIcon: appIconAsset.value,
      appIconVariants: appIconAsset.variants,
      ogImage: ogImageAsset.value,
      ogImageVariants: ogImageAsset.variants,
    },
    raw: brandJson
  }
}

/**
 * Parse brand configuration file and extract all relevant data
 * @param {string} brandFilePath - Absolute path to brand.json
 * @param {string} projectRoot - Project root directory for package.json fallback
 * @returns {Object} Normalized brand data
 */
export async function parseBrandConfig(brandFilePath, projectRoot) {
  const brandSource = await readFile(brandFilePath, 'utf8')
  const brandJson = parseJsonWithContext(brandFilePath, brandSource)

  let packageJson = null
  const pkgPath = path.join(projectRoot, 'package.json')
  if (existsSync(pkgPath)) {
    try {
      packageJson = JSON.parse(await readFile(pkgPath, 'utf8'))
    } catch {
      // Ignore package.json errors
    }
  }

  return parseBrandFromJson(brandJson, {
    version: packageJson?.version || null,
    packageName: packageJson?.name || null,
    packageDescription: packageJson?.description || null,
    packageHomepage: packageJson?.homepage || null,
    packageAuthor: cleanAuthor(packageJson?.author),
  })
}

/**
 * Validate that required fields are present
 */
export function validateBrandData(brandData) {
  const required = ['siteTitle', 'description', 'colors']
  const missing = []

  for (const field of required) {
    if (!brandData[field]) {
      missing.push(field)
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required brand fields: ${missing.join(', ')}`)
  }

  return true
}
