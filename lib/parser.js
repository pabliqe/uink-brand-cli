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

/**
 * Parse brand configuration file and extract all relevant data
 * @param {string} brandFilePath - Absolute path to brand.json
 * @param {string} projectRoot - Project root directory for package.json fallback
 * @returns {Object} Normalized brand data
 */
export async function parseBrandConfig(brandFilePath, projectRoot) {
  const brandSource = await readFile(brandFilePath, 'utf8')
  const brandJson = parseJsonWithContext(brandFilePath, brandSource)
  
  // Try to load package.json for fallback metadata
  let packageJson = null
  const pkgPath = path.join(projectRoot, 'package.json')
  if (existsSync(pkgPath)) {
    try {
      packageJson = JSON.parse(await readFile(pkgPath, 'utf8'))
    } catch (err) {
      // Ignore package.json errors
    }
  }

  // Extract brand information with fallbacks
  // Each extractAny call tries aliases in order, case-insensitively, then falls back to package.json
  const rawBrandName = extractAny(brandJson, [
    'brand.name', 'brand.brandname', 'brand.author'
  ])
  const pkgAuthor = cleanAuthor(packageJson?.author)

  // siteTitle: project/page title — the primary identity used in <title> and OG heading
  const siteTitle = extractAny(brandJson, [
    'brand.siteTitle', 'brand.title', 'brand.sitename'
  ])
    || rawBrandName
    || packageJson?.name
    || 'My Project'

  // name: company/author name (optional) — used as suffix and in pills
  const name = rawBrandName
    || pkgAuthor
    || null

  // Combined presentation title: "SiteTitle | Company Name" or just siteTitle when same/absent
  const title = (name && name !== siteTitle) ? `${siteTitle} | ${name}` : siteTitle

  const description = extractAny(brandJson, [
    'brand.description', 'brand.about'
  ])
    || packageJson?.description
    || `Welcome to ${siteTitle}`

  const siteUrl = extractAny(brandJson, [
    'brand.siteUrl', 'brand.url'
  ])
    || packageJson?.homepage
    || 'https://example.com'

  const version = packageJson?.version || null

  // Resolve colors root key — DTCG spec examples use singular 'color';
  // both 'color' and 'colors' are valid arbitrary group names (§3.7, §5.1).
  const colorsRoot = brandJson.colors != null ? 'colors' : 'color'

  // Extract colors (all available)
  const allColors = extractColors(brandJson[colorsRoot] || {})

  // Extract key colors with intelligent fallbacks.
  // extractValue already handles DTCG $value, nested DEFAULT, and case-insensitive keys,
  // so explicit .DEFAULT paths and allColors[] fallbacks are redundant.
  const primary = extractValue(brandJson, `${colorsRoot}.primary`)
    || extractValue(brandJson, `${colorsRoot}.brand.primary`)
    || '#E00069'

  const background = extractValue(brandJson, `${colorsRoot}.ui.background`)
    || extractValue(brandJson, `${colorsRoot}.neutral.50`)
    || extractValue(brandJson, `${colorsRoot}.background`)
    || '#ffffff'

  const text = extractValue(brandJson, `${colorsRoot}.ui.text.primary`)
    || extractValue(brandJson, `${colorsRoot}.neutral.900`)
    || extractValue(brandJson, `${colorsRoot}.text`)
    || '#000000'

  const accent = extractValue(brandJson, `${colorsRoot}.secondary.blue`)
    || extractValue(brandJson, `${colorsRoot}.accent`)
    || primary

  // Phase 2: optional source assets
  const logoAsset = extractAssetEntry(brandJson, 'brand.assets.logo', [
    'alpha', 'default', '$root', 'mono', 'monochrome', 'white', 'mask', 'color', 'fullColor', 'full-color'
  ])
  const faviconAsset = extractAssetEntry(brandJson, 'brand.assets.favicon', ['default', '$root'])
  const appIconAsset = extractAssetEntry(brandJson, 'brand.assets.appIcon', ['default', '$root'])
  const ogImageAsset = extractAssetEntry(brandJson, 'brand.assets.ogImage', ['default', '$root'])

  const assets = {
    logo: logoAsset.value,
    logoVariants: logoAsset.variants,
    favicon: faviconAsset.value,
    faviconVariants: faviconAsset.variants,
    appIcon: appIconAsset.value,
    appIconVariants: appIconAsset.variants,
    ogImage: ogImageAsset.value,
    ogImageVariants: ogImageAsset.variants,
  }

  return {
    name,
    siteTitle,
    title,
    description,
    siteUrl,
    version,
    colors: {
      primary,
      background,
      text,
      accent,
      all: allColors // All extracted colors for advanced use
    },
    assets,
    raw: brandJson // Keep original for custom extensions
  }
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
