#!/usr/bin/env node

import { mkdir, readFile, rm, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { createInterface } from 'readline/promises'
import { stdin as input, stdout as output } from 'process'
import { fileURLToPath } from 'url'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { parseBrandConfig } from '../lib/parser.js'
import { generateAssets } from '../lib/generator.js'
import { generateMetaFiles, generateManifest } from '../lib/meta-generator.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const cwd = process.cwd()
const execFileAsync = promisify(execFile)

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2)
  const config = {
    command: 'generate',
    brandFile: 'brand.json',
    outDir: 'public',
    generateDir: '.og-brand',
    integrate: 'none',
    bundle: 'none',
    bundleName: 'uink-brand-assets.zip',
    sourceLogo: null,
    sourceFavicon: null,
    sourceAppIcon: null,
    sourceOg: null,
    logoPadding: 18,
    logoBg: 'auto',
    logoBgColor: null,
    force: false,
    yes: false,
    wizard: false,
    help: false,
    version: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (!arg.startsWith('-') && arg === 'init') {
      config.command = 'init'
      continue
    }
    
    if (arg === '-h' || arg === '--help') {
      config.help = true
    } else if (arg === '-v' || arg === '--version') {
      config.version = true
    } else if (arg === '--brand' || arg === '-b') {
      config.brandFile = args[++i]
    } else if (arg === '--out' || arg === '-o') {
      config.outDir = args[++i]
    } else if (arg === '--generate-dir' || arg === '-g') {
      config.generateDir = args[++i]
    } else if (arg === '--integrate') {
      const nextArg = args[i + 1]
      if (!nextArg || nextArg.startsWith('-')) {
        config.integrate = 'auto'
      } else {
        config.integrate = nextArg
        i++
      }
    } else if (arg === '--bundle') {
      config.bundle = args[++i]
    } else if (arg === '--bundle-name') {
      config.bundleName = args[++i]
    } else if (arg === '--source-logo') {
      config.sourceLogo = args[++i]
    } else if (arg === '--source-favicon') {
      config.sourceFavicon = args[++i]
    } else if (arg === '--source-appicon') {
      config.sourceAppIcon = args[++i]
    } else if (arg === '--source-og') {
      config.sourceOg = args[++i]
    } else if (arg === '--logo-padding') {
      config.logoPadding = Number(args[++i])
    } else if (arg === '--logo-bg') {
      config.logoBg = args[++i]
    } else if (arg === '--logo-bg-color') {
      config.logoBgColor = args[++i]
    } else if (arg === '--force' || arg === '-f') {
      config.force = true
    } else if (arg === '--yes' || arg === '-y') {
      config.yes = true
    } else if (arg === '--wizard') {
      config.wizard = true
    }
  }

  return config
}

function normalizeIntegrateMode(mode) {
  if (mode === 'auto' || mode === 'none') return mode
  throw new Error(`Invalid --integrate value: ${mode}. Use 'auto' or 'none'.`)
}

function normalizeBundleMode(mode) {
  if (mode === 'zip' || mode === 'none') return mode
  throw new Error(`Invalid --bundle value: ${mode}. Use 'zip' or 'none'.`)
}

function showHelp() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    UINK Brand CLI v1.0.0                      ║
╚═══════════════════════════════════════════════════════════════╝

Generate PWA assets, Open Graph images, and meta tags from DTCG tokens.

USAGE:
  npx @pabliqe/uink-brand-cli [options]
  uink-brand [options]
  uink-brand init [options]

OPTIONS:
  -b, --brand <file>         Brand config file (default: brand.json)
  -o, --out <dir>            Output directory for assets (default: public)
  -g, --generate-dir <dir>   Directory for generated code (default: .og-brand)
  --integrate <mode>         Integration mode: none|auto (default: none)
  --bundle <mode>            Bundle mode: none|zip (default: none)
  --bundle-name <name>       Bundle file name (default: uink-brand-assets.zip)
  --source-logo <path>       Source logo for derived favicon/app icons/OG image
  --source-favicon <path>    Source favicon file to preserve and reference
  --source-appicon <path>    Source app icon file to derive icon outputs
  --source-og <path>         Source OG image file to preserve and reference
  --logo-padding <0-40>      Padding percent for logo-derived icons (default: 18)
  --logo-bg <mode>           Logo background: auto|solid|transparent (default: auto)
  --logo-bg-color <hex>      Background color override for logo-derived assets
  -y, --yes                  Accept defaults for non-interactive setup
  --wizard                   Interactive first-run setup for brand.json
  -f, --force                Force regenerate all assets (skip detection)
  -h, --help                 Show this help message
  -v, --version              Show version number

EXAMPLES:
  # One-shot setup (safe defaults, no source patching)
  npx @pabliqe/uink-brand-cli init --yes
  uink-brand init --wizard
  npx uink-brand

  # Custom brand file and output directory
  uink-brand --brand config/tokens.json --out static

  # Enable explicit auto-injection for supported frameworks
  uink-brand --integrate auto

  # Use a source logo and export a distributable zip bundle
  uink-brand --source-logo public/uink-avatar.png --bundle zip

  # Force regenerate everything
  uink-brand --force

  # Use in package.json scripts
  "scripts": {
    "prebuild": "uink-brand"
  }

OUTPUT:
  Assets (in public/):
    • og-image.jpg           - Open Graph image (1200x630)
    • favicon.ico            - Classic favicon
    • favicon.svg            - Modern scalable favicon
    • apple-touch-icon.png   - Apple touch icon (180x180)
    • icon-192x192.png       - PWA icon (192x192)
    • icon-512x512.png       - PWA icon (512x512)
    • manifest.json          - PWA manifest

  💡 Want to use custom assets? Just place your files in public/ first!
     The CLI will detect and preserve them (use --force to override).

  Generated Code (in .og-brand/):
    • BrandMeta.jsx          - React/Next.js component
    • BrandMeta.tsx          - TypeScript variant
    • meta.html              - Static HTML partial

BRAND.JSON FORMAT:
  Follows DTCG specification. Example:
  {
    "brand": {
      "name": { "$value": "Your Brand", "$type": "string" },
      "description": { "$value": "Description", "$type": "string" }
    },
    "colors": {
      "primary": {
        "DEFAULT": { "$value": "#E00069", "$type": "color" }
      }
    }
  }

  Fallback: If brand.name/description are missing, reads from package.json

MORE INFO:
  https://github.com/pabliqe/uink-brand-cli
`)
}

function getDefaultBrandTemplate() {
  return {
    brand: {
      name: { $value: 'My Brand', $type: 'string' },
      siteTitle: { $value: 'My Awesome Site', $type: 'string' },
      description: { $value: 'Building amazing web experiences', $type: 'string' },
      siteUrl: { $value: 'https://example.com', $type: 'string' }
    },
    colors: {
      primary: {
        DEFAULT: { $value: '#E00069', $type: 'color' }
      },
      ui: {
        background: { $value: '#ffffff', $type: 'color' },
        text: {
          primary: { $value: '#1a1a1a', $type: 'color' }
        }
      }
    }
  }
}

function applyBrandOverrides(template, overrides) {
  return {
    ...template,
    brand: {
      ...template.brand,
      name: { $value: overrides.name || template.brand.name.$value, $type: 'string' },
      siteTitle: { $value: overrides.siteTitle || template.brand.siteTitle.$value, $type: 'string' },
      description: { $value: overrides.description || template.brand.description.$value, $type: 'string' },
      siteUrl: { $value: overrides.siteUrl || template.brand.siteUrl.$value, $type: 'string' }
    }
  }
}

async function askWithDefault(rl, label, fallback) {
  const answer = await rl.question(`${label} (${fallback}): `)
  return answer.trim() || fallback
}

async function collectWizardValues(config) {
  const defaults = getDefaultBrandTemplate().brand

  if (config.yes || !input.isTTY) {
    return {
      name: defaults.name.$value,
      siteTitle: defaults.siteTitle.$value,
      description: defaults.description.$value,
      siteUrl: defaults.siteUrl.$value,
    }
  }

  const rl = createInterface({ input, output })
  try {
    console.log('   Configure your base brand values (press Enter to keep defaults).')
    const name = await askWithDefault(rl, '   Brand name', defaults.name.$value)
    const siteTitle = await askWithDefault(rl, '   Site title', defaults.siteTitle.$value)
    const description = await askWithDefault(rl, '   Description', defaults.description.$value)
    const siteUrl = await askWithDefault(rl, '   Site URL', defaults.siteUrl.$value)
    return { name, siteTitle, description, siteUrl }
  } finally {
    rl.close()
  }
}

async function runInit(config) {
  const brandPath = path.join(cwd, config.brandFile)
  const generateDirPath = path.join(cwd, config.generateDir)

  console.log('\n🧰 UINK Brand CLI - Project initialization\n')

  if (!existsSync(brandPath) || config.force) {
    const baseTemplate = getDefaultBrandTemplate()
    const wizardValues = config.wizard ? await collectWizardValues(config) : {
      name: baseTemplate.brand.name.$value,
      siteTitle: baseTemplate.brand.siteTitle.$value,
      description: baseTemplate.brand.description.$value,
      siteUrl: baseTemplate.brand.siteUrl.$value,
    }
    const template = applyBrandOverrides(baseTemplate, wizardValues)
    await writeFile(brandPath, `${JSON.stringify(template, null, 2)}\n`)
    console.log(`   ✓ Created ${config.brandFile}`)
  } else {
    console.log(`   ⊙ ${config.brandFile} already exists (preserved)`)
  }

  await mkdir(generateDirPath, { recursive: true })

  const integrationGuidePath = path.join(generateDirPath, 'INTEGRATION.md')
  const integrationGuide = `# UINK Brand Integration\n\nDefault mode is safe file generation only.\n\n## Generate assets\n\n\`\`\`bash\nnpx uink-brand\n\`\`\`\n\n## Optional auto integration\n\nUse explicit opt-in to patch supported project files:\n\n\`\`\`bash\nnpx uink-brand --integrate auto\n\`\`\`\n\nSupported now:\n- Next.js App Router (\`app/layout.*\`)\n- Next.js Pages Router (\`pages/_document.*\`)\n- Static HTML marker injection (add \`<!-- uink-brand:inject -->\` to your \`<head>\`)\n\nIf your framework cannot be patched safely, CLI will preserve files and print manual guidance.\n`
  await writeFile(integrationGuidePath, integrationGuide)
  console.log(`   ✓ Wrote ${path.join(config.generateDir, 'INTEGRATION.md')}`)

  console.log('\n✨ Init complete. Next step:')
  console.log('  npx uink-brand\n')
}

async function integrateNextAppRouter(config) {
  const appLayoutCandidates = ['app/layout.tsx', 'app/layout.ts', 'app/layout.jsx', 'app/layout.js']
  const layoutFile = appLayoutCandidates.find((candidate) => existsSync(path.join(cwd, candidate)))

  if (!layoutFile) {
    return false
  }

  const absoluteLayoutPath = path.join(cwd, layoutFile)
  const layoutDir = path.dirname(absoluteLayoutPath)
  const metadataFile = path.join(cwd, config.generateDir, 'next-metadata')
  let importPath = path.relative(layoutDir, metadataFile).replace(/\\/g, '/')
  if (!importPath.startsWith('.')) importPath = `./${importPath}`

  const source = await readFile(absoluteLayoutPath, 'utf8')
  if (source.includes('uink-brand:auto-injected')) {
    console.log(`   ⊙ ${layoutFile} already contains uink-brand integration marker`)
    return true
  }

  if (/export\s+const\s+metadata\b|export\s*\{[^}]*\bmetadata\b[^}]*\}/.test(source)) {
    console.log(`   ⊙ ${layoutFile} already defines metadata. Skipped auto-integration to avoid override.`)
    return true
  }

  const injection = `// uink-brand:auto-injected\nimport { metadata as uinkBrandMetadata } from '${importPath}'\nexport const metadata = uinkBrandMetadata\n\n`
  const hasImport = /^import\s/m.test(source)
  const updated = hasImport ? source.replace(/((?:^import\s.*\n)+)/m, `$1${injection}`) : `${injection}${source}`

  await writeFile(absoluteLayoutPath, updated)
  console.log(`   ✓ Auto-integrated metadata into ${layoutFile}`)
  return true
}

async function integrateNextPagesRouter(config) {
  const pagesCandidates = ['pages/_document.tsx', 'pages/_document.ts', 'pages/_document.jsx', 'pages/_document.js']
  const docFile = pagesCandidates.find((candidate) => existsSync(path.join(cwd, candidate)))

  if (!docFile) return false

  const absoluteDocPath = path.join(cwd, docFile)
  const docDir = path.dirname(absoluteDocPath)
  const brandMetaFile = path.join(cwd, config.generateDir, 'BrandMeta')
  let importPath = path.relative(docDir, brandMetaFile).replace(/\\/g, '/')
  if (!importPath.startsWith('.')) importPath = `./${importPath}`

  const source = await readFile(absoluteDocPath, 'utf8')
  if (source.includes('uink-brand:auto-injected')) {
    console.log(`   ⊙ ${docFile} already contains uink-brand integration marker`)
    return true
  }

  if (!source.includes('<Head>') || source.includes('<BrandMeta />')) {
    console.log(`   ⊙ ${docFile} was not patched (missing <Head> or already has <BrandMeta />).`)
    return true
  }

  const importStmt = `\n// uink-brand:auto-injected\nimport BrandMeta from '${importPath}'\n`
  const withImport = /^import\s/m.test(source)
    ? source.replace(/((?:^import\s.*\n)+)/m, `$1${importStmt}`)
    : `${importStmt}${source}`

  const updated = withImport.replace('<Head>', '<Head>\n        <BrandMeta />')
  await writeFile(absoluteDocPath, updated)
  console.log(`   ✓ Auto-integrated BrandMeta into ${docFile}`)
  return true
}

async function integrateStaticHtml(config) {
  const htmlCandidates = ['index.html', 'public/index.html', 'app.html']
  const htmlFile = htmlCandidates.find((candidate) => existsSync(path.join(cwd, candidate)))
  if (!htmlFile) return false

  const absoluteHtmlPath = path.join(cwd, htmlFile)
  const source = await readFile(absoluteHtmlPath, 'utf8')
  if (!source.includes('<!-- uink-brand:inject -->')) {
    console.log(`   ⊙ ${htmlFile} not patched (missing marker <!-- uink-brand:inject -->).`)
    return true
  }

  const metaPath = path.join(cwd, config.generateDir, 'meta.html')
  if (!existsSync(metaPath)) {
    console.log('   ⊙ Skipped static HTML injection: generated meta.html not found.')
    return true
  }

  const metaSnippet = (await readFile(metaPath, 'utf8')).trim()
  const injected = source.replace('<!-- uink-brand:inject -->', `<!-- uink-brand:auto-injected -->\n${metaSnippet}`)
  await writeFile(absoluteHtmlPath, injected)
  console.log(`   ✓ Auto-injected head tags into ${htmlFile}`)
  return true
}

async function autoIntegrate(config) {
  const appHandled = await integrateNextAppRouter(config)
  const pagesHandled = await integrateNextPagesRouter(config)
  const staticHandled = await integrateStaticHtml(config)

  if (!appHandled && !pagesHandled && !staticHandled) {
    console.log('   ⊙ No supported framework file found for safe auto-integration. Files were generated only.')
  }
}

function resolveSourcePath(candidate) {
  if (!candidate) return null
  return path.isAbsolute(candidate) ? candidate : path.join(cwd, candidate)
}

function validateSourceFile(label, filePath, allowedExtensions) {
  if (!filePath) return
  if (!existsSync(filePath)) {
    throw new Error(`${label} file not found: ${filePath}`)
  }
  const ext = path.extname(filePath).toLowerCase()
  const normalized = ext === '.jpeg' ? '.jpg' : ext
  if (!allowedExtensions.includes(normalized)) {
    throw new Error(`${label} format not supported: ${ext || '(none)'}. Allowed: ${allowedExtensions.join(', ')}`)
  }
}

function resolveSourceOptions(config, brandData) {
  const fromConfig = brandData.assets || {}

  const resolved = {
    sourceLogo: resolveSourcePath(config.sourceLogo || fromConfig.logo),
    sourceFavicon: resolveSourcePath(config.sourceFavicon || fromConfig.favicon),
    sourceAppIcon: resolveSourcePath(config.sourceAppIcon || fromConfig.appIcon),
    sourceOg: resolveSourcePath(config.sourceOg || fromConfig.ogImage),
  }

  validateSourceFile('source-logo', resolved.sourceLogo, ['.png', '.jpg', '.webp', '.svg'])
  validateSourceFile('source-favicon', resolved.sourceFavicon, ['.png', '.jpg', '.webp', '.svg', '.ico'])
  validateSourceFile('source-appicon', resolved.sourceAppIcon, ['.png', '.jpg', '.webp', '.svg'])
  validateSourceFile('source-og', resolved.sourceOg, ['.png', '.jpg', '.webp', '.svg'])

  return resolved
}

async function createBundleIfRequested(config) {
  if (config.bundle !== 'zip') return

  const zipPath = path.join(cwd, config.bundleName)
  const zipOutput = config.bundleName
  const targets = [config.outDir, config.generateDir].filter((target) => existsSync(path.join(cwd, target)))

  if (targets.length === 0) {
    console.log('   ⊙ Bundle skipped: no generated directories were found.')
    return
  }

  await rm(zipPath, { force: true })
  await execFileAsync('zip', ['-r', '-q', zipOutput, ...targets], { cwd })
  console.log(`   ✓ Bundle created: ${config.bundleName}`)
}

async function showVersion() {
  const pkgPath = path.join(__dirname, '../package.json')
  const pkg = JSON.parse(await readFile(pkgPath, 'utf8'))
  console.log(pkg.version)
}

async function main() {
  const config = parseArgs()

  try {
    config.integrate = normalizeIntegrateMode(config.integrate)
    config.bundle = normalizeBundleMode(config.bundle)
    if (!['auto', 'solid', 'transparent'].includes(config.logoBg)) {
      throw new Error(`Invalid --logo-bg value: ${config.logoBg}. Use 'auto', 'solid', or 'transparent'.`)
    }
    if (Number.isNaN(config.logoPadding) || config.logoPadding < 0 || config.logoPadding > 40) {
      throw new Error(`Invalid --logo-padding value: ${config.logoPadding}. Use a number from 0 to 40.`)
    }
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`)
    process.exit(1)
  }

  if (config.help) {
    showHelp()
    process.exit(0)
  }

  if (config.version) {
    await showVersion()
    process.exit(0)
  }

  if (config.command === 'init') {
    await runInit(config)
    process.exit(0)
  }

  if (config.wizard && !existsSync(path.join(cwd, config.brandFile))) {
    console.log('\n🧭 Wizard requested and no brand file was found. Running init first...')
    await runInit({ ...config, command: 'init' })
  }

  console.log('\n🎨 UINK Brand CLI - Starting generation...\n')

  try {
    // Step 1: Parse brand configuration
    console.log('📖 [1/4] Parsing brand configuration...')
    const brandPath = path.join(cwd, config.brandFile)
    
    if (!existsSync(brandPath)) {
      console.error(`❌ Error: Brand file not found: ${config.brandFile}`)
      console.error(`\nCreate a brand.json file in your project root, or specify a custom path:`)
      console.error(`  uink-brand --brand path/to/your-config.json`)
      console.error(`  uink-brand init --yes\n`)
      process.exit(1)
    }

    const brandData = await parseBrandConfig(brandPath, cwd)
    console.log(`   ✓ Brand: ${brandData.name}`)
    console.log(`   ✓ Colors: ${Object.keys(brandData.colors).length} palettes loaded`)

    const sourceOptions = resolveSourceOptions(config, brandData)
    if (sourceOptions.sourceLogo || sourceOptions.sourceFavicon || sourceOptions.sourceAppIcon || sourceOptions.sourceOg) {
      console.log('   ✓ Source asset inputs resolved')
    }

    // Step 2: Generate assets (OG image, favicons, PWA icons)
    console.log('\n🖼️  [2/4] Generating assets...')
    const outDir = path.join(cwd, config.outDir)
    const assetRefs = await generateAssets(brandData, outDir, config.force, {
      ...sourceOptions,
      logoOptions: {
        padding: config.logoPadding,
        bg: config.logoBg,
        bgColor: config.logoBgColor,
      },
    })
    console.log(`   ✓ Assets ready in ${config.outDir}/`)

    // Step 3: Generate manifest.json
    console.log('\n📱 [3/4] Generating PWA manifest...')
    await generateManifest(brandData, outDir)
    console.log(`   ✓ manifest.json created`)

    // Step 4: Generate meta tag components
    console.log('\n🏷️  [4/4] Generating meta tag files...')
    const generateDir = path.join(cwd, config.generateDir)
    await generateMetaFiles(brandData, generateDir, config.outDir, assetRefs)
    console.log(`   ✓ Meta components generated in ${config.generateDir}/`)

    if (config.integrate === 'auto') {
      console.log('\n🧩 [5/5] Applying auto-integration (opt-in)...')
      await autoIntegrate(config)
    }

    if (config.bundle === 'zip') {
      console.log('\n📦 Creating bundle artifact...')
      await createBundleIfRequested(config)
    }

    console.log('\n✨ All done! Your brand assets are ready.\n')
    if (config.integrate === 'none') {
      console.log('Next steps:')
      console.log(`  • Optional auto-injection: uink-brand --integrate auto`)
      console.log(`  • Or use '${config.generateDir}/INTEGRATION.md' and generated meta files\n`)
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    if (process.env.DEBUG) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

main()
