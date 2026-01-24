# Vite Test UI - Complete Setup Summary

## What Was Built

A modern, interactive test UI for the OG Image Generator using Vite with a separate Express backend API.

### Architecture

```
┌─────────────────────────────────────┐
│   Frontend (Vite)                   │
│   Port: 5173                        │
│  ┌──────────────────────────────┐  │
│  │ index.html                   │  │
│  │ src/main.js (App logic)      │  │
│  │ src/api.js (API client)      │  │
│  │ src/style.css (Styling)      │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
              ↓ HTTP Proxy (/api)
┌─────────────────────────────────────┐
│   Backend API (Express)             │
│   Port: 3000                        │
│  ┌──────────────────────────────┐  │
│  │ test-ui.mjs                  │  │
│  │ - POST /api/generate-og      │  │
│  │ - GET /api/brand-example     │  │
│  └──────────────────────────────┘  │
│                                     │
│  Dependencies:                      │
│  - @resvg/resvg-js (Image render)  │
│  - express (API server)            │
└─────────────────────────────────────┘
```

## Files Created/Modified

### New Vite Frontend Files
- `index.html` - Vite entry point with app container
- `vite.config.js` - Vite configuration with API proxy
- `src/main.js` - App logic, DOM setup, event handlers
- `src/api.js` - API client functions
- `src/style.css` - All styling (responsive design)

### Modified Files
- `test-ui.mjs` - Refactored to API-only server (removed static file serving)
- `package.json.snippet` - Added Vite scripts and dev dependencies
- `README.md` - Updated with Vite UI instructions
- `.gitignore` - Added dist/ and .vite/ entries
- `TEST-UI.md` - Complete Vite documentation
- **NEW:** `QUICKSTART.md` - 3-minute quick start guide

### Removed Files
- `test-ui.html` - Replaced by modular Vite setup

## Key Features

✨ **Hot Module Reloading** - Changes refresh instantly without page reload
🎨 **Color Picker Integration** - Live hex color display
📋 **JSON Export** - Copy brand configuration anytime
📱 **Responsive Design** - Works on desktop, tablet, mobile
⚡ **Fast Development** - Vite provides sub-100ms feedback
🚀 **Production Ready** - Optimized build output
🔌 **Modular Architecture** - Clean separation of concerns
🎯 **Type-Safe** - Modern ES modules with proper imports

## NPM Scripts

### Development
```bash
npm run test:ui:server    # Start API server (port 3000)
npm run test:ui           # Start Vite dev server (port 5173)
```

### Production
```bash
npm run test:ui:build     # Build for production (creates dist/)
npm run test:ui:preview   # Preview production build locally
```

### Standard Generation
```bash
npm run generate:og       # Generate OG image from brand.json
npm run sync:meta         # Update HTML meta tags
npm run prebuild          # Both commands above
```

## Getting Started

### 1. Install
```bash
npm install
```

### 2. Run Two Servers
```bash
# Terminal 1
npm run test:ui:server

# Terminal 2
npm run test:ui
```

### 3. Open Browser
Vite auto-opens `http://localhost:5173`

### 4. Test & Export
- Load example config
- Edit colors and text
- Generate OG image
- Copy JSON export

## API Endpoints

### `POST /api/generate-og`
Generates an OG image from brand config

Request body:
```json
{
  "brand": {
    "brand": { "name", "siteTitle", "description", "siteUrl" },
    "colors": { "primary", "secondary", "ui" }
  }
}
```

Response:
```json
{
  "success": true,
  "image": "data:image/png;base64,...",
  "svg": "<svg>...</svg>"
}
```

### `GET /api/brand-example`
Returns example brand configuration from `brand.example.json`

## Development Workflow

1. **Modify Frontend Code** (`src/main.js`, `src/style.css`)
   - Changes hot-reload instantly in browser
   - No page reload needed
   - Component state preserved

2. **Modify Backend Code** (`test-ui.mjs`)
   - Restart server with `Ctrl+C` then `npm run test:ui:server`
   - Or use nodemon for auto-restart

3. **Test Configuration**
   - Use color pickers to customize
   - Generate OG image on demand
   - Export JSON for use in projects

4. **Build for Production**
   - Run `npm run test:ui:build`
   - Outputs optimized files to `dist/`
   - Deploy to static host

## Customization Examples

### Add More Colors to Picker
Edit `src/main.js`, add new color sections:
```javascript
<div class="form-group">
  <label for="colorCustom">Custom Color</label>
  <div class="color-input-wrapper">
    <input type="color" id="colorCustom">
    <input type="text" class="color-value" id="colorCustomText" readonly>
  </div>
</div>
```

### Modify OG Image Template
Edit `test-ui.mjs`, change SVG in `/api/generate-og`:
```javascript
const svg = `<svg>
  <!-- Change layout, fonts, positions here -->
</svg>`
```

### Add New Input Fields
Edit `src/main.js`, add form group:
```javascript
<div class="form-group">
  <label for="fieldName">Label</label>
  <input type="text" id="fieldName">
</div>
```

Then add to `getBrandConfig()` function.

## Production Deployment

### Frontend (Static Files)
1. Build: `npm run test:ui:build`
2. Deploy `dist/` folder to:
   - Netlify
   - Vercel
   - GitHub Pages
   - AWS S3 + CloudFront
   - Any static host

### Backend (API Server)
1. Deploy `test-ui.mjs` + dependencies to:
   - Heroku
   - Railway
   - Fly.io
   - AWS Lambda
   - Docker container

2. Update API URL in `vite.config.js` proxy setting

## Next Steps

- Review [QUICKSTART.md](QUICKSTART.md) for immediate setup
- Check [TEST-UI.md](TEST-UI.md) for full documentation
- Explore [README.md](README.md) for standard usage patterns
- See [SETUP.md](SETUP.md) for integration guides
- Modify `brand.example.json` to match your brand
- Customize `test-ui.mjs` SVG template for your design

## Support Files

- [QUICKSTART.md](QUICKSTART.md) - 3-minute setup guide
- [TEST-UI.md](TEST-UI.md) - Complete Vite documentation
- [README.md](README.md) - General usage instructions
- [SETUP.md](SETUP.md) - Integration with existing projects
- `brand.example.json` - Configuration template with all options
- `package.json.snippet` - Template for package.json setup
