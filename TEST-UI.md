# Test UI - OG Image Generator

A beautiful, interactive Vite-based interface to test and preview OG image generation with different brand configurations.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

This installs:
- `express` - Backend API server
- `@resvg/resvg-js` - Image rendering
- `vite` - Frontend dev server with HMR

### 2. Start Both Servers

**Terminal 1 - API Server:**
```bash
npm run test:ui:server
# Runs on http://localhost:3000
```

**Terminal 2 - Vite Dev Server:**
```bash
npm run test:ui
# Opens http://localhost:5173 with hot module reloading
```

### 3. Open in Browser

Navigate to `http://localhost:5173` and you'll see a beautiful interface with:

- **Left Panel**: Brand configuration editor with color picker
- **Right Panel**: Live preview of the generated OG image
- **Hot Reload**: Changes instantly refresh without losing state

## Features

✨ **Vite Hot Module Reloading** - Changes refresh instantly without page reload
🎨 **Live Preview** - See changes in real-time as you configure your brand
🎯 **Color Picker** - Easy-to-use color selection with hex value display
📋 **JSON Export** - Copy the full brand configuration as JSON
📱 **Responsive Design** - Works on desktop and tablet screens
⚡ **Fast Development** - Vite provides near-instant feedback
🚀 **Production Build** - Optimized build for deployment

## How It Works

### Architecture

```
Frontend (Vite)           Backend API (Express)
├── src/
│   ├── main.js          ← Entry point
│   ├── api.js           ← API client
│   └── style.css        ← Styles
├── index.html
└── vite.config.js

                         ← HTTP Proxied (/api)
                         
                         ├── test-ui.mjs
                         ├── scripts/generate-og.mjs
                         ├── brand.example.json
                         └── package.json
```

### Usage Flow

1. **Configure Your Brand**
   - Enter brand name, site title, and description
   - Pick primary, accent, background, and text colors
   - Click "Load Example" to see a sample configuration

2. **Generate OG Image**
   - Click "Generate OG Image" button
   - Backend server renders the image using @resvg/resvg-js
   - Preview appears instantly in the right panel

3. **Export Configuration**
   - Copy the JSON from the export field
   - Save it as `brand.json` in your project
   - Use it with the standard generation scripts

## NPM Scripts

```bash
# Development
npm run test:ui:server    # Start API server on port 3000
npm run test:ui           # Start Vite dev server on port 5173

# Production
npm run test:ui:build     # Build for production (creates dist/)
npm run test:ui:preview   # Preview production build locally

# Standard scripts
npm run generate:og       # Generate OG image from brand.json
npm run sync:meta         # Update HTML meta tags
npm run prebuild          # Run both sync:meta and generate:og
```

## API Endpoints

### POST `/api/generate-og`

Generates an OG image from a brand configuration.

**Request:**
```json
{
  "brand": {
    "brand": {
      "name": "Your Brand",
      "siteTitle": "Site Title",
      "description": "Description",
      "siteUrl": "https://example.com"
    },
    "colors": {
      "primary": { "DEFAULT": "#E00069" },
      "secondary": { "blue": { "DEFAULT": "#4c53fb" } },
      "ui": {
        "background": "#fffdfd",
        "text": { "primary": "#443d3d", "accent": "#4c53fb" }
      }
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "image": "data:image/png;base64,...",
  "svg": "<svg>...</svg>"
}
```

### GET `/api/brand-example`

Returns the example brand configuration from `brand.example.json`.

## File Structure

```
og-brand-template/
├── index.html              # Vite entry point
├── vite.config.js          # Vite configuration
├── src/
│   ├── main.js            # App entry point, DOM setup
│   ├── api.js             # API client functions
│   └── style.css          # All styles
├── test-ui.mjs            # Express API server
├── brand.example.json     # Example configuration
├── scripts/               # Standard generation scripts
│   ├── generate-og.mjs
│   └── sync-meta.mjs
└── package.json.snippet   # Template for package.json
```

## Development Tips

- **Hot Module Reloading**: Changes to files in `src/` reload instantly
- **Color Picker**: Hex values update automatically
- **JSON Export**: Always stays in sync with form values
- **Error Handling**: Detailed error messages help debugging
- **Network Requests**: Use browser DevTools to inspect API calls

## Customization

### Modify the UI

Edit `src/main.js`:
- Add new form fields
- Change button behavior
- Add new sections

### Customize Styles

Edit `src/style.css`:
- Change colors and spacing
- Modify responsive breakpoints
- Add animations

### Add API Endpoints

Edit `test-ui.mjs`:
- Add new routes
- Integrate with databases
- Add authentication

### Change OG Image Template

Edit `test-ui.mjs` in the `/api/generate-og` route - modify the SVG template to change layout, fonts, or add elements.

## Production Deployment

### Build for Production

```bash
npm install
npm run test:ui:build
```

This creates a `dist/` folder with optimized, minified files.

### Deploy Frontend

The `dist/` folder contains static files - deploy to:
- Netlify, Vercel, GitHub Pages, or any static host
- Update the API proxy in `vite.config.js` if needed

### Deploy Backend API

Deploy `test-ui.mjs` to a Node.js hosting service:
- Heroku, Railway, Fly.io, AWS Lambda, etc.
- Update the API URL in the Vite config

## Troubleshooting

### Port Already in Use

```bash
# Change ports in vite.config.js or test-ui.mjs
# Or kill the existing process:
lsof -i :5173  # Find Vite
lsof -i :3000  # Find API server
```

### API Not Responding

- Ensure `test-ui:server` is running on port 3000
- Check browser console for CORS errors
- Verify API proxy in `vite.config.js`

### Image Not Generating

- Check if `brand.example.json` exists
- Verify colors are valid hex values
- Check terminal for error messages from API server

### Hot Reload Not Working

- Restart Vite dev server (`Ctrl+C` and `npm run test:ui`)
- Clear browser cache
- Check that `src/` files are saved
