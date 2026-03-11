# 🎨 UINK Brand CLI

[![npm version](https://img.shields.io/npm/v/@pabliqe/uink-brand-cli.svg)](https://www.npmjs.com/package/@pabliqe/uink-brand-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**Zero-config CLI tool for generating PWA assets, Open Graph images, and meta tags from DTCG design tokens.**

Transform your design tokens into production-ready assets with a single command. Perfect for modern web projects, PWAs, and design systems.

## ✨ Features

- 🎯 **Zero Configuration** - Works out of the box with sensible defaults
- 🎨 **DTCG Compliant** - Follows [Design Token Community Group](https://tr.designtokens.org/) specification
- 🖼️ **Automatic Asset Generation** - OG images (1200x630), favicons, PWA icons
- �️ **Custom Asset Support** - Use your own icons/images while keeping PWA config
- �📱 **PWA Ready** - Generates manifest.json with all required fields
- ⚛️ **Framework Agnostic** - Outputs React, TypeScript, and static HTML
- 🚀 **Optimized for CI/CD** - Perfect for prebuild scripts
- 🎭 **No External Fonts** - Uses system fonts for reliable rendering

## 🚀 Quick Start

### Installation

```bash
# Run directly with npx (no installation required)
npx @pabliqe/uink-brand-cli

# Or install globally
npm install -g @pabliqe/uink-brand-cli

# Or as a dev dependency
npm install --save-dev @pabliqe/uink-brand-cli
```

### Usage

1. **Initialize once (creates `brand.json` with safe defaults):**

```bash
npx @pabliqe/uink-brand-cli init --yes
```

2. **Generate assets and metadata files:**

```bash
npx uink-brand
```

3. **Optional: explicit auto-integration (opt-in):**

```bash
npx uink-brand --integrate auto
```

4. **Use the generated assets manually if you skip auto-integration:**

```jsx
// React/Next.js
import BrandMeta from './.og-brand/BrandMeta'

export default function App() {
  return (
    <html>
      <head>
        <BrandMeta />
      </head>
      <body>...</body>
    </html>
  )
}
```

## 📦 What Gets Generated

### Assets (in `/public`)

```
public/
├── og-image.jpg              # Open Graph image (1200x630)
├── favicon.ico               # Classic favicon (32x32)
├── favicon.svg               # Modern scalable favicon
├── apple-touch-icon.png      # Apple touch icon (180x180)
├── icon-192x192.png          # PWA icon
├── icon-512x512.png          # PWA icon
├── icon-512x512-maskable.png # PWA maskable icon
└── manifest.json             # PWA manifest
```

**How icons are generated:**
- **Automatic** - Creates icons from your brand's first letter by default
- **Custom** - Or use your own icons (just place them in `public/` first)
- **Brand colors** - Auto-generated icons use `colors.primary` as background
- **Multiple formats** - ICO for legacy browsers, SVG for modern ones
- **PWA-ready** - Includes standard and maskable variants
- **Smart detection** - Skips generation if your custom files already exist

### Generated Code (in `/.og-brand`)

```
.og-brand/
├── BrandMeta.jsx        # React component
├── BrandMeta.tsx        # TypeScript component
├── next-metadata.ts     # Next.js metadata object
├── meta.html            # Static HTML snippet
└── README.md            # Usage instructions
```

## 🎯 CLI Options

```bash
uink-brand [options]

Options:
  -b, --brand <file>         Brand config file (default: brand.json)
  -o, --out <dir>            Output directory for assets (default: public)
  -g, --generate-dir <dir>   Directory for generated code (default: .og-brand)
  --integrate <mode>         Integration mode: none|auto (default: none)
  --bundle <mode>            Bundle mode: none|zip (default: none)
  --bundle-name <name>       Bundle file name (default: uink-brand-assets.zip)
  --source-logo <path>       Source logo for derived favicon/app icons/OG image
  --source-favicon <path>    Source favicon to preserve and reference
  --source-appicon <path>    Source app icon to derive icon outputs
  --source-og <path>         Source OG image to preserve and reference
  --logo-padding <0-40>      Padding percent for logo-derived icons (default: 18)
  --logo-bg <mode>           Logo background: auto|solid|transparent (default: auto)
  --logo-bg-color <hex>      Background color override for logo-derived assets
  -y, --yes                  Accept defaults for non-interactive setup
  --wizard                   Interactive first-run setup for brand.json
  -f, --force                Force regenerate all assets (skip detection)
  -h, --help                 Show help message
  -v, --version              Show version number

Examples:
  uink-brand init --yes        # Scaffold brand.json + integration guide
  uink-brand init --wizard     # Interactive init prompts
  uink-brand                   # Use defaults
  uink-brand -b tokens.json    # Custom brand file
  uink-brand --integrate auto  # Explicit opt-in code injection
  uink-brand --source-logo public/uink-avatar.png
  uink-brand --source-og public/og-image.png --source-favicon public/favicon.webp
  uink-brand --bundle zip --bundle-name release-assets.zip
  uink-brand -o static         # Custom output directory
  uink-brand --force           # Force regenerate all assets
```

### Source Assets (Phase 2)

Use role-based inputs to preserve your existing files while generating missing outputs:

- `--source-logo`: best input for deriving favicon, app icons, and OG image.
- `--source-favicon`: preserved and referenced as primary favicon.
- `--source-appicon`: used to derive PWA icon outputs.
- `--source-og`: preserved and referenced as OG image.

Precedence order:
`CLI flags > brand.assets in brand.json > existing files > defaults`.

Bundle output:
use `--bundle zip` to export `public/` and `.og-brand/` as a distributable zip.

## 🎨 Using Custom Assets

**Want to use your own logo or custom OG image?** No problem!

1. **Place your custom assets** in the output directory (default: `public/`):
   ```bash
   public/
   ├── og-image.jpg          # Your custom OG image
   ├── favicon.ico           # Your custom favicon
   ├── favicon.svg           # Your custom SVG icon
   └── apple-touch-icon.png  # Your custom Apple icon
   ```

2. **Run the CLI** - it will detect existing files and skip generation:
   ```bash
  uink-brand
   ```
   Output:
   ```
   🖼️  [2/4] Generating assets...
      ⊙ og-image.jpg (using existing)
      ⊙ favicon.ico (using existing)
      ✓ icon-192x192.png (192x192)
      ...
   ```

3. **PWA manifest and meta tags** are still generated automatically, referencing your custom files!

**Tips:**
- Mix and match: Use custom OG image but auto-generate icons
- CLI detects existing files automatically
- Use `--force` to regenerate everything
- Custom assets must follow the naming convention above

## 🔧 Integration Examples

### package.json Scripts

```json
{
  "scripts": {
    "prebuild": "uink-brand",
    "build": "vite build",
    "dev": "uink-brand && vite dev"
  }
}
```

### Next.js App Router

```typescript
// app/layout.tsx
import { metadata } from '../.og-brand/next-metadata'
export { metadata }

export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  )
}
```

### Next.js Pages Router

```jsx
// pages/_document.jsx
import BrandMeta from '../.og-brand/BrandMeta'

export default function Document() {
  return (
    <Html>
      <Head>
        <BrandMeta />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
```

### Static HTML

```html
<!DOCTYPE html>
<html>
<head>
  <!-- Optional marker for auto injection with --integrate auto -->
  <!-- uink-brand:inject -->

  <!-- Copy from .og-brand/meta.html -->
  <title>My Brand</title>
  <meta name="description" content="...">
  <link rel="manifest" href="/manifest.json">
  <!-- ... -->
</head>
<body>...</body>
</html>
```

### Vite/SvelteKit

```html
<!-- index.html or app.html -->
<head>
  <!-- Paste contents from .og-brand/meta.html -->
</head>
```

## 📐 Brand.json Format

### DTCG Format (Recommended)

```json
{
  "brand": {
    "name": { "$value": "Brand Name", "$type": "string" },
    "description": { "$value": "Description", "$type": "string" }
  },
  "colors": {
    "primary": {
      "DEFAULT": { "$value": "#E00069", "$type": "color" }
    }
  }
}
```

### Plain JSON (Legacy Support)

```json
{
  "brand": {
    "name": "Brand Name",
    "description": "Description"
  },
  "colors": {
    "primary": {
      "DEFAULT": "#E00069"
    }
  }
}
```

### Fallback Behavior

If `brand.name` or `brand.description` are missing, the CLI will:
1. Look for values in your `package.json`
2. Use sensible defaults

## 🏗️ Generated Meta Tags

The CLI generates all essential meta tags for SEO and social sharing:

### Standard SEO
- `<title>`
- `<meta name="description">`
- `<link rel="canonical">`

### Mobile & PWA
- `<meta name="viewport">`
- `<meta name="theme-color">`
- `<link rel="manifest">`
- Favicons (ICO, SVG, Apple Touch Icon)

### Open Graph
- `og:title`, `og:description`, `og:type`
- `og:url`, `og:image`
- `og:image:width`, `og:image:height`
- `og:site_name`

### Twitter Cards
- `twitter:card` (summary_large_image)
- `twitter:title`, `twitter:description`
- `twitter:image`

## 🎨 Asset Generation Details

### OG Image (1200x630px)
Auto-generated from your brand tokens - no design tool needed:
- **Typography-based** - Uses your brand name and site title
- **Brand colors** - Background, text, and accents from your tokens
- **System fonts** - Reliable rendering on all platforms
- **Version badge** - Shows your package.json version
- **Decorative elements** - Subtle brand-colored circles
- **Custom override** - Place your own `og-image.jpg` in `public/` to use it instead

### Favicons & Icons
Auto-generated from your brand's first letter:
- **No logo upload** - Creates letter-based icon automatically
- **Primary color** - Uses `colors.primary` as background
- **White letter** - First character of your brand name
- **All formats** - ICO, SVG, Apple Touch, PWA (standard + maskable)
- **Responsive** - Proper sizing for each platform (32px to 512px)
- **Custom override** - Place your own icons in `public/` to use them instead

**Smart Detection:** The CLI automatically detects existing assets and preserves them. Only missing assets are generated. Use `--force` to regenerate everything.

## 🚢 Publishing Setup

### Manual Publishing (Recommended)

This package requires 2FA on npm. Publish manually from your terminal:

```bash
# Make sure you're logged in
npm login

# Publish (you'll be prompted for your 2FA OTP code)
npm publish --access public --otp=YOUR_OTP_CODE
```

Replace `YOUR_OTP_CODE` with the current 6-digit code from your authenticator app.

### GitHub Actions (Automatic Publishing)

> **Note:** Automated publishing requires a **Granular Access Token** with 2FA bypass enabled.
> Create one at npmjs.com → Profile → Access Tokens → Generate New Token → Granular Access Token,
> set Read & Write access on the package, and enable "Bypass two-factor authentication".

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to npm

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Setup Steps for CI:

1. **Create a Granular Access Token** on npmjs.com:
   - Profile → Access Tokens → Generate New Token → **Granular Access Token**
   - Set name, expiration, select this package, **Read & Write** permissions
   - Enable **"Bypass two-factor authentication"**

2. **Add to GitHub Secrets:**
   - Repository → Settings → Secrets and variables → Actions
   - Add secret: `NPM_TOKEN` with your token value

3. **Create a release:**
   - Go to: Releases → Draft a new release
   - Create tag: `v1.0.0`
   - Publish release — GitHub Actions will publish to npm automatically

## 🛠️ Development & Local Usage

### Using Locally Without npm Publishing

```bash
# Clone the repository
git clone https://github.com/pabliqe/uink-brand-cli.git
cd uink-brand-cli

# Install dependencies
npm install

# Test locally (uses brand.example.json)
npm test

# Run CLI in development mode
node bin/cli.js --help

# Use the local CLI in another project
# Option 1: Run directly with node
node /path/to/uink-brand-cli/bin/cli.js

# Option 2: Create a symlink for global access
cd /path/to/uink-brand-cli
npm link
cd /path/to/your-project
cd your-project && uink-brand

# Option 3: Reference as a local dependency in package.json
# In your project's package.json:
"devDependencies": {
  "@pabliqe/uink-brand-cli": "file:../uink-brand-cli"
}
# Then run: npm install && npm run build
```

### From npm Registry

```bash
# Install as dev dependency
npm install --save-dev @pabliqe/uink-brand-cli

# Install globally
npm install -g @pabliqe/uink-brand-cli

# Use in your project
npm run build  # if configured in package.json
# or
npx uink-brand-cli
```

## 📝 Examples

Check the `/examples` directory for:
- Next.js App Router integration
- Next.js Pages Router integration
- Vite setup
- Static HTML example

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT © Pablo

## 🔗 Links

- [GitHub Repository](https://github.com/pabliqe/uink-brand-cli)
- [npm Package](https://www.npmjs.com/package/@pabliqe/uink-brand-cli)
- [Design Tokens Community Group](https://tr.designtokens.org/)
- [Open Graph Protocol](https://ogp.me/)

## ⭐ Show Your Support

If this project helped you, please give it a ⭐️!

---

**Made with ❤️ for the design systems community**

## 🔄 Meta Tag Sync

Automatically updates these meta tags in `index.html`:

- `<title>`
- `meta[name="description"]`
- `meta[property="og:title"]`
- `meta[property="og:description"]`
- `meta[property="og:image"]`
- `meta[name="twitter:title"]`
- `meta[name="twitter:description"]`
- `meta[name="twitter:image"]`

## 🛠️ Customization

### Customize OG Image Template

Edit `scripts/generate-og.mjs` to modify:
- Dimensions (width/height)
- Layout and positioning
- Text styles
- Color scheme

### Font Stack

Uses safe fonts available on Linux/Ubuntu servers:
```
DejaVu Sans, Liberation Sans, Ubuntu Sans, Noto Sans, Arial, sans-serif
```

## 📦 Netlify Integration

Works automatically with Netlify builds:

```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"
```

The `prebuild` script ensures OG image and meta tags are updated before each build.

## 🎯 Use Cases

- ✅ Generate branded OG images for social sharing
- ✅ Keep meta tags in sync with brand config
- ✅ Version your OG images automatically
- ✅ No manual image editing needed
- ✅ Works in CI/CD pipelines

## 📝 License

Free to use and modify for your projects.

---

Created with 💖 for easy brand consistency across projects.
