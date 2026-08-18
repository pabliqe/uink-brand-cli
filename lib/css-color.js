/**
 * Parse CSS colors into RGB/hex for SVG fills and WCAG-ish contrast.
 * Unresolvable values (e.g. `hsl(var(--background))`) return null — callers
 * must not treat them as white, or dark sheets keep dark text.
 */

/** Used when brand JSON has no primary token. Not the UINK magenta. */
export const FALLBACK_PRIMARY_COLOR = '#000000'

function clampChannel(value) {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function parseHexToRgb(value) {
  const match = String(value).trim().match(/^#([0-9a-f]{3,8})$/i)
  if (!match) return null
  let hex = match[1]
  if (hex.length === 3 || hex.length === 4) {
    hex = [...hex].map((char) => `${char}${char}`).join('')
  }
  if (hex.length !== 6 && hex.length !== 8) return null
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  }
}

function parseChannel(raw) {
  const value = Number.parseFloat(raw)
  if (!Number.isFinite(value)) return null
  if (String(raw).includes('%')) return clampChannel((value / 100) * 255)
  return clampChannel(value)
}

function parseRgbToRgb(value) {
  const match = String(value).trim().match(
    /^rgba?\(\s*([0-9.]+%?)\s*[, ]\s*([0-9.]+%?)\s*[, ]\s*([0-9.]+%?)(?:\s*[,/]\s*[0-9.]+%?)?\s*\)$/i,
  )
  if (!match) return null
  const r = parseChannel(match[1])
  const g = parseChannel(match[2])
  const b = parseChannel(match[3])
  if (r == null || g == null || b == null) return null
  return { r, g, b }
}

function hueToRgb(p, q, t) {
  let next = t
  if (next < 0) next += 1
  if (next > 1) next -= 1
  if (next < 1 / 6) return p + (q - p) * 6 * next
  if (next < 1 / 2) return q
  if (next < 2 / 3) return p + (q - p) * (2 / 3 - next) * 6
  return p
}

function parseHslToRgb(value) {
  const trimmed = String(value).trim()
  if (/var\(/i.test(trimmed)) return null
  const match = trimmed.match(
    /^hsla?\(\s*([0-9.]+)(?:deg)?\s*[, ]\s*([0-9.]+)%\s*[, ]\s*([0-9.]+)%(?:\s*[,/]\s*[0-9.]+%?)?\s*\)$/i,
  )
  if (!match) return null
  const h = (((Number.parseFloat(match[1]) % 360) + 360) % 360) / 360
  const s = Math.max(0, Math.min(100, Number.parseFloat(match[2]))) / 100
  const l = Math.max(0, Math.min(100, Number.parseFloat(match[3]))) / 100
  if (s === 0) {
    const channel = clampChannel(l * 255)
    return { r: channel, g: channel, b: channel }
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return {
    r: clampChannel(hueToRgb(p, q, h + 1 / 3) * 255),
    g: clampChannel(hueToRgb(p, q, h) * 255),
    b: clampChannel(hueToRgb(p, q, h - 1 / 3) * 255),
  }
}

export function parseCssColorToRgb(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return parseHexToRgb(trimmed) || parseRgbToRgb(trimmed) || parseHslToRgb(trimmed)
}

export function rgbToHex({ r, g, b }) {
  const toHex = (channel) => clampChannel(channel).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function toSvgHex(value, fallback = '#ffffff') {
  const rgb = parseCssColorToRgb(value)
  return rgb ? rgbToHex(rgb) : fallback
}

function channelToLinear(channel) {
  const c = channel / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance(value) {
  const rgb = typeof value === 'object' && value ? value : parseCssColorToRgb(value)
  if (!rgb) return null
  return 0.2126 * channelToLinear(rgb.r) + 0.7152 * channelToLinear(rgb.g) + 0.0722 * channelToLinear(rgb.b)
}

export function isDarkColor(value, threshold = 0.55) {
  const luminance = relativeLuminance(value)
  if (luminance == null) return false
  return luminance <= threshold
}

const LIGHT_INK = '#f6f2f2'
const DARK_INK = '#251f1f'

/**
 * Prefer brand text when it contrasts with the sheet; otherwise black/white.
 * Unparseable preferred text is ignored so CSS variables cannot "win" contrast.
 */
export function contrastingTextColor(sheetFill, preferredText, minRatio = 3) {
  const sheetLum = relativeLuminance(sheetFill)
  const safeSheetLum = sheetLum == null ? 1 : sheetLum
  const fallback = safeSheetLum > 0.55 ? DARK_INK : LIGHT_INK
  const preferredRgb = parseCssColorToRgb(preferredText)
  if (!preferredRgb) return fallback
  const textLum = relativeLuminance(preferredRgb)
  const ratio = (Math.max(safeSheetLum, textLum) + 0.05) / (Math.min(safeSheetLum, textLum) + 0.05)
  return ratio >= minRatio ? rgbToHex(preferredRgb) : fallback
}
