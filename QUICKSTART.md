# Quick Start with Vite Test UI

Get up and running with the OG Image Generator in 3 minutes.

## Setup

```bash
# Clone or copy the template
cd og-brand-template

# Install dependencies
npm install
```

## Run Locally

Open **two terminals** in the project folder:

**Terminal 1 - Start the API Server:**
```bash
npm run test:ui:server
```
Output: `📡 API running on http://localhost:3000`

**Terminal 2 - Start the Vite Dev Server:**
```bash
npm run test:ui
```
Vite will automatically open `http://localhost:5173`

## Use the UI

1. **Load Example** - Click the button to load a sample brand configuration
2. **Edit Colors** - Use the color pickers to customize
3. **Preview** - See the OG image update in real-time
4. **Export** - Copy the JSON and save as `brand.json` in your project

## Generate in Your Project

Once you have your `brand.json`:

```bash
# Copy the scripts and config to your project
cp -r scripts /path/to/your/project/
cp brand.json /path/to/your/project/

# Install dependencies in your project
cd /path/to/your/project
npm install --save-dev @resvg/resvg-js express

# Add to your package.json:
"scripts": {
  "generate:og": "node scripts/generate-og.mjs",
  "sync:meta": "node scripts/sync-meta.mjs",
  "prebuild": "npm run sync:meta && npm run generate:og"
}

# Generate OG image
npm run generate:og

# Update HTML meta tags (if you have index.html)
npm run sync:meta
```

## Build for Production

```bash
# Build the UI for deployment
npm run test:ui:build

# Creates dist/ folder with optimized files
# Deploy to Netlify, Vercel, or any static host
```

## Project Structure

```
og-brand-template/
├── src/                    # Vite frontend source
│   ├── main.js            # App entry point
│   ├── api.js             # API client
│   └── style.css          # Styles
├── index.html             # Vite entry HTML
├── vite.config.js         # Vite config
├── test-ui.mjs            # Express API server
├── scripts/               # Generation scripts
│   ├── generate-og.mjs    # Generate OG image PNG
│   └── sync-meta.mjs      # Update HTML meta tags
├── brand.example.json     # Example config
└── package.json.snippet   # Template for package.json
```

## Next Steps

- Read [TEST-UI.md](TEST-UI.md) for detailed documentation
- Read [README.md](README.md) for standard usage without the UI
- Read [SETUP.md](SETUP.md) for integration instructions
- Modify `test-ui.mjs` to customize the OG image design
- Check `brand.example.json` for all available configuration options

## Common Commands

```bash
# Development
npm run test:ui:server     # Start API backend
npm run test:ui            # Start Vite frontend with HMR

# Production
npm run test:ui:build      # Build for production
npm run test:ui:preview    # Preview production build

# Standard generation
npm run generate:og        # Generate OG image from brand.json
npm run sync:meta          # Update HTML meta tags
npm run prebuild           # Both of the above
```

## Troubleshooting

**Port 3000 or 5173 already in use?**
```bash
# Kill the process or change the port in vite.config.js
lsof -i :3000   # Find process on port 3000
lsof -i :5173   # Find process on port 5173
```

**Changes not showing?**
- Restart the Vite dev server
- Make sure both servers are running
- Check browser console for errors

**Image not generating?**
- Verify the API server is running
- Check that hex color values are valid (#RRGGBB)
- See test-ui.mjs terminal for error messages

Need help? Check the full documentation in [TEST-UI.md](TEST-UI.md).
