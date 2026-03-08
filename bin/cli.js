#!/usr/bin/env node

import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { parseBrandConfig } from '../lib/parser.js'
import { generateAssets } from '../lib/generator.js'
import { generateMetaFiles, generateManifest } from '../lib/meta-generator.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const cwd = process.cwd()

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2)
  const config = {
    brandFile: 'brand.json',
    outDir: 'public',
    generateDir: '.og-brand',
    force: false,
    help: false,
    version: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    
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
    } else if (arg === '--force' || arg === '-f') {
      config.force = true
    }
  }

  return config
}

function showHelp() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                     OG Brand CLI v1.0.0                       ║
╚═══════════════════════════════════════════════════════════════╝

Generate PWA assets, Open Graph images, and meta tags from DTCG tokens.

USAGE:
  npx @pabliqe/og-brand-cli [options]
  og-brand [options]

OPTIONS:
  -b, --brand <file>         Brand config file (default: brand.json)
  -o, --out <dir>            Output directory for assets (default: public)
  -g, --generate-dir <dir>   Directory for generated code (default: .og-brand)
  -f, --force                Force regenerate all assets (skip detection)
  -h, --help                 Show this help message
  -v, --version              Show version number

EXAMPLES:
  # Use default configuration
  npx @pabliqe/og-brand-cli

  # Custom brand file and output directory
  og-brand --brand config/tokens.json --out static

  # Use custom icons/OG image (place them in public/ first)
  og-brand  # Detects existing files and skips generation

  # Force regenerate everything
  og-brand --force

  # Use in package.json scripts
  "scripts": {
    "prebuild": "og-brand"
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
  https://github.com/pabliqe/og-brand-template
`)
}

async function showVersion() {
  const pkgPath = path.join(__dirname, '../package.json')
  const pkg = JSON.parse(await readFile(pkgPath, 'utf8'))
  console.log(pkg.version)
}

async function main() {
  const config = parseArgs()

  if (config.help) {
    showHelp()
    process.exit(0)
  }

  if (config.version) {
    await showVersion()
    process.exit(0)
  }

  console.log('\n🎨 OG Brand CLI - Starting generation...\n')

  try {
    // Step 1: Parse brand configuration
    console.log('📖 [1/4] Parsing brand configuration...')
    const brandPath = path.join(cwd, config.brandFile)
    
    if (!existsSync(brandPath)) {
      console.error(`❌ Error: Brand file not found: ${config.brandFile}`)
      console.error(`\nCreate a brand.json file in your project root, or specify a custom path:`)
      console.error(`  og-brand --brand path/to/your-config.json\n`)
      process.exit(1)
    }

    const brandData = await parseBrandConfig(brandPath, cwd)
    console.log(`   ✓ Brand: ${brandData.name}`)
    console.log(`   ✓ Colors: ${Object.keys(brandData.colors).length} palettes loaded`)

    // Step 2: Generate assets (OG image, favicons, PWA icons)
    console.log('\n🖼️  [2/4] Generating assets...')
    const outDir = path.join(cwd, config.outDir)
    await generateAssets(brandData, outDir, config.force)
    console.log(`   ✓ Assets ready in ${config.outDir}/`)

    // Step 3: Generate manifest.json
    console.log('\n📱 [3/4] Generating PWA manifest...')
    await generateManifest(brandData, outDir)
    console.log(`   ✓ manifest.json created`)

    // Step 4: Generate meta tag components
    console.log('\n🏷️  [4/4] Generating meta tag files...')
    const generateDir = path.join(cwd, config.generateDir)
    await generateMetaFiles(brandData, generateDir, config.outDir)
    console.log(`   ✓ Meta components generated in ${config.generateDir}/`)

    console.log('\n✨ All done! Your brand assets are ready.\n')
    console.log('Next steps:')
    console.log(`  • Import <BrandMeta /> from '${config.generateDir}/BrandMeta.jsx'`)
    console.log(`  • Or copy meta tags from '${config.generateDir}/meta.html'\n`)

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    if (process.env.DEBUG) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

main()
