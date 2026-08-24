import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { generateAssetsInMemory } from '../lib/generator.js'
import { getRasterizerKind, svgToPng } from '../lib/rasterize.js'
import { parseBrandFromJson } from '../lib/parser.js'

const libDir = path.dirname(fileURLToPath(new URL('../lib/generator.js', import.meta.url)))
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47])

test('generator and rasterize never statically import the native resvg addon', async () => {
  const [generator, rasterize] = await Promise.all([
    readFile(path.join(libDir, 'generator.js'), 'utf8'),
    readFile(path.join(libDir, 'rasterize.js'), 'utf8'),
  ])

  assert.equal(/from ['"]@resvg\/resvg-js['"]/.test(generator), false)
  assert.equal(/from ['"]@resvg\/resvg-js['"]/.test(rasterize), false)
  assert.equal(/import\(['"]@resvg\/resvg-js['"]\)/.test(rasterize), false)
})

test('svgToPng returns a PNG buffer', async () => {
  const png = await svgToPng(
    '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#e00069"/></svg>',
    8,
  )
  assert.ok(Buffer.isBuffer(png))
  assert.deepEqual(png.subarray(0, 4), PNG_MAGIC)
  assert.ok(['native', 'wasm'].includes(await getRasterizerKind()))
})

test('generateAssetsInMemory PNG outputs start with the PNG signature', async () => {
  const brandData = parseBrandFromJson({
    brand: { siteTitle: { $value: 'Acme', $type: 'string' } },
    colors: { primary: { $value: '#E00069', $type: 'color' } },
  })
  const { files } = await generateAssetsInMemory(brandData, { force: true })
  const og = files.find((file) => file.name === 'og-image.png')
  assert.ok(og)
  assert.deepEqual(og.buffer.subarray(0, 4), PNG_MAGIC)
})
