/**
 * DTCG (Design Token Community Group) Parser
 * Extracts brand information and design tokens from DTCG-compliant JSON files
 * with fallback to package.json for missing metadata
 */

import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

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
    const lower = part.toLowerCase()
    const matchedKey = Object.keys(current).find(k => k.toLowerCase() === lower)
    if (matchedKey === undefined) return defaultValue
    current = current[matchedKey]
  }

  // Handle DTCG $value wrapper
  if (current && typeof current === 'object' && '$value' in current) {
    return current.$value
  }

  // Handle nested objects - try to find DEFAULT or first available key
  if (current && typeof current === 'object' && !Array.isArray(current)) {
    if ('DEFAULT' in current) {
      const defaultVal = current.DEFAULT
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
  const brandJson = JSON.parse(await readFile(brandFilePath, 'utf8'))
  
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

  // Extract colors (all available)
  const allColors = extractColors(brandJson.colors || {})

  // Extract key colors with intelligent fallbacks.
  // extractValue already handles DTCG $value, nested DEFAULT, and case-insensitive keys,
  // so explicit .DEFAULT paths and allColors[] fallbacks are redundant.
  const primary = extractValue(brandJson, 'colors.primary') || '#E00069'

  const background = extractValue(brandJson, 'colors.ui.background')
    || extractValue(brandJson, 'colors.neutral.50')
    || extractValue(brandJson, 'colors.background')
    || '#ffffff'

  const text = extractValue(brandJson, 'colors.ui.text.primary')
    || extractValue(brandJson, 'colors.neutral.900')
    || extractValue(brandJson, 'colors.text')
    || '#000000'

  const accent = extractValue(brandJson, 'colors.secondary.blue')
    || extractValue(brandJson, 'colors.accent')
    || primary

  // Phase 2: optional source assets
  const assets = {
    logo: extractValue(brandJson, 'brand.assets.logo') || null,
    favicon: extractValue(brandJson, 'brand.assets.favicon') || null,
    appIcon: extractValue(brandJson, 'brand.assets.appIcon') || null,
    ogImage: extractValue(brandJson, 'brand.assets.ogImage') || null,
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
