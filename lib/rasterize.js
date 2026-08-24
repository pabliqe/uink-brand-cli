/**
 * SVG → PNG via resvg.
 *
 * Bundlers such as Netlify's esbuild cannot load `.node` addons. Never statically
 * import `@resvg/resvg-js` from this package — native is required at runtime, and
 * `@resvg/resvg-wasm` is the fallback when the addon is missing (zipped Lambdas).
 */

import { createRequire } from 'node:module'
import { existsSync, readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const NATIVE_ID = '@resvg/resvg-js'
const WASM_FILE_ID = '@resvg/resvg-wasm/index_bg.wasm'

let enginePromise

function safeModuleDir() {
  try {
    const metaUrl = import.meta?.url
    if (typeof metaUrl === 'string' && metaUrl.length > 0) {
      return path.dirname(fileURLToPath(metaUrl))
    }
  } catch {
    // Netlify/esbuild may leave import.meta.url undefined.
  }
  return null
}

function requireAnchors() {
  const anchors = []
  const moduleDir = safeModuleDir()
  if (moduleDir) anchors.push(path.join(moduleDir, 'rasterize.js'))
  anchors.push(path.join(process.cwd(), 'package.json'))
  try {
    const cwdRequire = createRequire(path.join(process.cwd(), 'package.json'))
    anchors.push(cwdRequire.resolve('uink-brand-cli/package.json'))
  } catch {
    // Package may be vendored or bundled under a path Node can't resolve yet.
  }
  return anchors
}

function requireWithAnchors(id) {
  let lastError
  for (const anchor of requireAnchors()) {
    try {
      return createRequire(anchor)(id)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError || new Error(`Cannot require ${id}`)
}

function resolveWithAnchors(id) {
  let lastError
  for (const anchor of requireAnchors()) {
    try {
      return createRequire(anchor).resolve(id)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError || new Error(`Cannot resolve ${id}`)
}

function tryLoadNative() {
  try {
    const mod = requireWithAnchors(NATIVE_ID)
    return mod?.Resvg ? mod : null
  } catch {
    return null
  }
}

function fontBuffersFromFiles(fontFiles) {
  const buffers = []
  for (const filePath of fontFiles) {
    if (typeof filePath !== 'string' || !existsSync(filePath)) continue
    try {
      buffers.push(readFileSync(filePath))
    } catch {
      // Skip unreadable fonts; remaining buffers still improve glyph coverage.
    }
  }
  return buffers
}

async function loadWasmEngine() {
  // String literal so bundlers inline the JS bindings (no `.wasm` import).
  const mod = await import('@resvg/resvg-wasm')
  const wasmBytes = await readFile(resolveWithAnchors(WASM_FILE_ID))
  try {
    await mod.initWasm(wasmBytes)
  } catch (error) {
    const message = String(error?.message || error)
    if (!message.includes('Already initialized')) throw error
  }
  return mod
}

async function getEngine() {
  if (!enginePromise) {
    enginePromise = (async () => {
      const native = tryLoadNative()
      if (native) return { Resvg: native.Resvg, kind: 'native' }

      try {
        const wasm = await loadWasmEngine()
        return { Resvg: wasm.Resvg, kind: 'wasm' }
      } catch (error) {
        const reason = error?.message || error
        throw new Error(
          `Unable to load an SVG rasterizer (${reason}). `
          + 'Native @resvg/resvg-js is a Node addon and cannot be bundled by esbuild. '
          + 'Keep @resvg/resvg-js and @resvg/resvg-wasm installed, or for Netlify functions set:\n'
          + '  [functions]\n'
          + '    external_node_modules = ["@resvg/resvg-js", "@resvg/resvg-wasm"]',
        )
      }
    })()
  }
  return enginePromise
}

export async function getRasterizerKind() {
  const { kind } = await getEngine()
  return kind
}

export async function svgToPng(svgString, width, { fontFiles = [] } = {}) {
  const { Resvg, kind } = await getEngine()
  const font = { defaultFontFamily: 'DejaVu Sans' }

  if (kind === 'native') {
    font.loadSystemFonts = true
    if (fontFiles.length) font.fontFiles = fontFiles
  } else {
    font.loadSystemFonts = false
    const fontBuffers = fontBuffersFromFiles(fontFiles)
    if (fontBuffers.length) font.fontBuffers = fontBuffers
  }

  const resvg = new Resvg(svgString, {
    fitTo: { mode: 'width', value: width },
    font,
  })
  return Buffer.from(resvg.render().asPng())
}
