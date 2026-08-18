import test from 'node:test'
import assert from 'node:assert/strict'

import { parseBrandFromJson } from '../lib/parser.js'
import { generateAssetsInMemory } from '../lib/generator.js'
import { buildManifest, buildMetaFiles } from '../lib/meta-generator.js'

const sampleBrand = {
  brand: {
    name: { $value: 'Acme', $type: 'string' },
    siteTitle: { $value: 'Acme Studio', $type: 'string' },
    description: { $value: 'Design that ships', $type: 'string' },
    siteUrl: { $value: 'acme.example', $type: 'string' },
    version: { $value: '1.0.0', $type: 'string' },
  },
  colors: {
    primary: { $value: '#E00069', $type: 'color' },
    ui: {
      background: { $value: '#ffffff', $type: 'color' },
      text: { primary: { $value: '#251f1f', $type: 'color' } },
    },
  },
}

test('parseBrandFromJson normalizes siteUrl and title', () => {
  const brandData = parseBrandFromJson(sampleBrand)
  assert.equal(brandData.siteUrl, 'https://acme.example')
  assert.equal(brandData.siteTitle, 'Acme Studio')
  assert.equal(brandData.title, 'Acme Studio | Acme')
  assert.equal(brandData.version, '1.0.0')
  assert.equal(brandData.colors.primary, '#E00069')
})

test('generateAssetsInMemory returns canonical public asset set', async () => {
  const brandData = parseBrandFromJson(sampleBrand)
  const { files, refs } = await generateAssetsInMemory(brandData, { force: true })

  const names = files.map((file) => file.name).sort()
  assert.deepEqual(names, [
    'apple-touch-icon.png',
    'favicon.ico',
    'favicon.svg',
    'icon-192x192.png',
    'icon-512x512-maskable.png',
    'icon-512x512.png',
    'og-image.png',
  ])
  assert.equal(refs.ogImage, 'og-image.png')
  assert.equal(refs.faviconPrimary, 'favicon.ico')
  assert.equal(refs.hasFaviconSvg, true)
})

test('buildMetaFiles uses generateDir and CLI attribution', () => {
  const brandData = parseBrandFromJson(sampleBrand)
  const refs = {
    ogImage: 'og-image.png',
    faviconPrimary: 'favicon.ico',
    hasFaviconSvg: true,
  }

  const metaFiles = buildMetaFiles(brandData, refs, { generateDir: '.uink-brand' })
  const paths = metaFiles.map((file) => file.path)
  assert.ok(paths.includes('.uink-brand/meta.html'))
  assert.ok(paths.includes('.uink-brand/next-metadata.ts'))

  const attributed = metaFiles.filter((file) => file.name !== 'README.md')
  assert.ok(attributed.every((file) => file.content.includes('uink-brand-cli')))
  assert.ok(metaFiles.find((file) => file.name === 'README.md').content.includes('.uink-brand'))

  const manifest = buildManifest(brandData)
  const parsed = JSON.parse(manifest.content)
  assert.equal(parsed.theme_color, '#E00069')
  assert.equal(parsed.name, 'Acme')
})

test('missing primary color falls back to black, not magenta', () => {
  const brandData = parseBrandFromJson({
    brand: { siteTitle: { $value: 'Demo', $type: 'string' } },
    colors: {},
  })
  assert.equal(brandData.colors.primary, '#000000')

  const manifest = JSON.parse(buildManifest(brandData).content)
  assert.equal(manifest.theme_color, '#000000')
})

test('metaOptions control apple-mobile-web-app-capable', () => {
  const brandData = parseBrandFromJson(sampleBrand)
  const refs = {
    ogImage: 'og-image.png',
    faviconPrimary: 'favicon.ico',
    hasFaviconSvg: true,
  }

  const yesHtml = buildMetaFiles(brandData, refs).find((file) => file.name === 'meta.html').content
  assert.ok(yesHtml.includes('apple-mobile-web-app-capable" content="yes"'))

  const noHtml = buildMetaFiles(brandData, refs, {
    metaOptions: { appleWebAppCapable: false },
  }).find((file) => file.name === 'meta.html').content
  assert.ok(noHtml.includes('apple-mobile-web-app-capable" content="no"'))
  assert.ok(noHtml.includes('theme-color: Chrome, Firefox'))
})
