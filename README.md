# OG Image & Brand Meta Generator

Automated OG image generation and meta tag synchronization based on your brand configuration.

## 🚀 Quick Start

### 1. Copy to Your Project

```bash
# Copy the scripts folder to your project
cp -r scripts /path/to/your/project/

# Copy the example brand config
cp config/brand.example.json /path/to/your/project/config/brand.json
```

### 2. Install Dependencies

```bash
npm install --save-dev @resvg/resvg-js
```

### 3. Add Scripts to package.json

```json
{
  "scripts": {
    "sync:meta": "node scripts/sync-meta.mjs",
    "generate:og": "node scripts/generate-og.mjs",
    "prebuild": "npm run sync:meta && npm run generate:og"
  }
}
```

### 4. Configure Your Brand

Edit `config/brand.json` with your brand colors, name, and site info.

### 5. Run

```bash
npm run generate:og  # Generate OG image
npm run sync:meta    # Update HTML meta tags
npm run build        # Both run automatically via prebuild
```

## 📁 Project Structure Required

```
your-project/
├── package.json          # Must have name & version
├── index.html            # HTML file with meta tags to update
├── config/
│   └── brand.json       # Your brand configuration
├── scripts/             # Copy from this template
│   ├── generate-og.mjs
│   └── sync-meta.mjs
└── public/              # OG image outputs here
    └── og-image.png     # Generated automatically
```

## 🎨 Brand Configuration

The `config/brand.json` file should include:

```json
{
  "brand": {
    "name": "Your Brand",
    "siteTitle": "Your Site Title",
    "siteUrl": "https://yourdomain.com",
    "description": "Your site description"
  },
  "colors": {
    "primary": {
      "DEFAULT": "#E00069"
    },
    "secondary": {
      "blue": {
        "DEFAULT": "#4c53fb"
      }
    },
    "ui": {
      "background": "#fffdfd",
      "text": {
        "primary": "#443d3d",
        "accent": "#E00069"
      }
    }
  }
}
```

## 🖼️ OG Image Features

- **1200x630px** - Perfect for social media
- **System fonts** - Works on Netlify/Linux servers
- **Brand colors** - Pulled from your config
- **Version display** - Shows package.json version
- **No dependencies on external fonts** - Uses safe font stack

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
