# Setup Instructions

## For New Projects

### 1. Copy Scripts

```bash
cp -r /path/to/og-brand-template/scripts your-project/
```

### 2. Copy Config Template

```bash
cp /path/to/og-brand-template/brand.example.json your-project/brand.json
```

### 3. Install Dependency

In your project:

```bash
npm install --save-dev @resvg/resvg-js
```

### 4. Add to package.json

Add these scripts to your project's `package.json`:

```json
{
  "scripts": {
    "sync:meta": "node scripts/sync-meta.mjs",
    "generate:og": "node scripts/generate-og.mjs",
    "prebuild": "npm run sync:meta && npm run generate:og"
  }
}
```

### 5. Ensure Your index.html Has Meta Tags

Make sure your `index.html` contains these meta tags:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- These will be auto-updated -->
  <title>Your Site</title>
  <meta name="description" content="Description here">
  
  <!-- Open Graph -->
  <meta property="og:title" content="Your Site">
  <meta property="og:description" content="Description here">
  <meta property="og:image" content="/og-image.png">
  <meta property="og:type" content="website">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Your Site">
  <meta name="twitter:description" content="Description here">
  <meta name="twitter:image" content="/og-image.png">
</head>
<body>
  <!-- Your content -->
</body>
</html>
```

### 6. Configure Your Brand

Edit `brand.json` with your actual brand information:

```json
{
  "brand": {
    "name": "My Awesome Site",
    "siteTitle": "Building the future",
    "siteUrl": "https://mysite.com",
    "description": "We build amazing things"
  },
  "colors": {
    "primary": { "DEFAULT": "#FF6B6B" },
    "secondary": { "blue": { "DEFAULT": "#4ECDC4" } },
    "ui": {
      "background": "#FFFFFF",
      "text": { "primary": "#2C3E50", "accent": "#FF6B6B" }
    }
  }
}
```

### 7. Test It

```bash
npm run generate:og
npm run sync:meta
```

Check:
- `public/og-image.png` - Should be generated
- `index.html` - Should have updated meta tags

## Repository as Git Remote

You can also use this as a Git remote:

### Initial Setup

```bash
# In your new project
git remote add og-template /path/to/og-brand-template
git fetch og-template
git checkout og-template/main -- scripts/
git checkout og-template/main -- brand.example.json
```

### Pull Updates Later

```bash
git fetch og-template
git checkout og-template/main -- scripts/generate-og.mjs
git checkout og-template/main -- scripts/sync-meta.mjs
```

## Customization

### Modify OG Image Layout

Edit `scripts/generate-og.mjs` - the SVG template is around line 37. You can change:
- Text positioning (x, y coordinates)
- Font sizes
- Colors (uses brand.json values)
- Add logos or other elements

### Add More Meta Tags

Edit `scripts/sync-meta.mjs` to sync additional meta tags using the `replaceMeta` function.

## Troubleshooting

### "Cannot find module '@resvg/resvg-js'"
Install the dependency: `npm install --save-dev @resvg/resvg-js`

### "ENOENT: no such file or directory 'brand.json'"
Copy the example: `cp brand.example.json brand.json`

### OG image not showing on social media
1. Ensure `siteUrl` in brand.json is correct
2. Check that `og:image` uses full URL (not relative)
3. Clear social media cache (Facebook Debugger, Twitter Card Validator)

### Fonts look different on server vs locally
The scripts use system-safe fonts. To use custom fonts, you'd need to embed them or use a different rendering approach.
