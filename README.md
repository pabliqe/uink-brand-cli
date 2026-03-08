# 🎨 OG Brand CLI

[![npm version](https://img.shields.io/npm/v/@pabliqe/og-brand-cli.svg)](https://www.npmjs.com/package/@pabliqe/og-brand-cli)
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
npx @pabliqe/og-brand-cli

# Or install globally
npm install -g @pabliqe/og-brand-cli

# Or as a dev dependency
npm install --save-dev @pabliqe/og-brand-cli
```

### Usage

1. **Create a `brand.json` file** in your project root:

```json
{
  "brand": {
    "name": { "$value": "My Brand", "$type": "string" },
    "siteTitle": { "$value": "My Awesome Site", "$type": "string" },
    "description": { "$value": "Building amazing web experiences", "$type": "string" },
    "siteUrl": { "$value": "https://mybrand.com", "$type": "string" }
  },
  "colors": {
    "primary": {
      "DEFAULT": { "$value": "#E00069", "$type": "color" }
    },
    "ui": {
      "background": { "$value": "#ffffff", "$type": "color" },
      "text": {
        "primary": { "$value": "#1a1a1a", "$type": "color" }
      }
    }
  }
}
```

2. **Run the CLI:**

```bash
npx @pabliqe/og-brand-cli
```

3. **Use the generated assets:**

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
og-brand [options]

Options:
  -b, --brand <file>         Brand config file (default: brand.json)
  -o, --out <dir>            Output directory for assets (default: public)
  -g, --generate-dir <dir>   Directory for generated code (default: .og-brand)
  -f, --force                Force regenerate all assets (skip detection)
  -h, --help                 Show help message
  -v, --version              Show version number

Examples:
  og-brand                   # Use defaults
  og-brand -b tokens.json    # Custom brand file
  og-brand -o static         # Custom output directory
  og-brand --force           # Force regenerate all assets
```

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
   og-brand
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
    "prebuild": "og-brand",
    "build": "vite build",
    "dev": "og-brand && vite dev"
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

### GitHub Actions (Automatic Publishing)

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
      - run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Setup Steps:

1. **Create npm token:**
   ```bash
   npm login
   npm token create --type=automation
   ```

2. **Add to GitHub Secrets:**
   - Go to: Repository → Settings → Secrets → Actions
   - Add secret: `NPM_TOKEN` with your token value

3. **Create a release:**
   - Go to: Releases → Draft a new release
   - Create tag: `v1.0.0`
   - Publish release
   - GitHub Actions will automatically publish to npm

## 🛠️ Development

```bash
# Clone the repository
git clone https://github.com/pabliqe/og-brand-template.git
cd og-brand-template

# Install dependencies
npm install

# Test locally
npm test

# Run CLI in development
node bin/cli.js --help
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

- [GitHub Repository](https://github.com/pabliqe/og-brand-template)
- [npm Package](https://www.npmjs.com/package/@pabliqe/og-brand-cli)
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
