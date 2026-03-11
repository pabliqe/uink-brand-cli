/**
 * DTCG (Design Token Community Group) Parser
 * Extracts brand information and design tokens from DTCG-compliant JSON files
 * with fallback to package.json for missing metadata
 */

import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

/**
 * Extract value from DTCG format or plain JSON
 * DTCG format: { "$value": "actual-value", "$type": "type" }
 * Plain format: "actual-value" or { "key": "value" }
 */
function extractValue(obj, pathString, defaultValue = null) {
  if (!obj) return defaultValue

  const parts = pathString.split('.')
  let current = obj

  for (const part of parts) {
    if (current == null) return defaultValue
    current = current[part]
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
  const name = extractValue(brandJson, 'brand.name') 
    || packageJson?.name 
    || 'My Brand'

  const siteTitle = extractValue(brandJson, 'brand.siteTitle') 
    || extractValue(brandJson, 'brand.name')
    || packageJson?.name
    || name

  const description = extractValue(brandJson, 'brand.description') 
    || packageJson?.description 
    || `Welcome to ${name}`

  const siteUrl = extractValue(brandJson, 'brand.siteUrl') 
    || packageJson?.homepage 
    || 'https://example.com'

  const version = packageJson?.version || '1.0.0'

  // Extract colors (all available)
  const allColors = extractColors(brandJson.colors || {})

  // Extract key colors with intelligent fallbacks
  const primary = extractValue(brandJson, 'colors.primary.DEFAULT')
    || extractValue(brandJson, 'colors.primary')
    || allColors['primary.DEFAULT']
    || allColors['primary']
    || '#E00069'

  const background = extractValue(brandJson, 'colors.ui.background')
    || extractValue(brandJson, 'colors.neutral.50')
    || extractValue(brandJson, 'colors.background')
    || allColors['ui.background']
    || allColors['neutral.50']
    || '#ffffff'

  const text = extractValue(brandJson, 'colors.ui.text.primary')
    || extractValue(brandJson, 'colors.neutral.900')
    || extractValue(brandJson, 'colors.text')
    || allColors['ui.text.primary']
    || allColors['neutral.900']
    || '#000000'

  const accent = extractValue(brandJson, 'colors.secondary.blue.DEFAULT')
    || extractValue(brandJson, 'colors.accent')
    || allColors['secondary.blue.DEFAULT']
    || allColors['accent']
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
  const required = ['name', 'description', 'colors']
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
