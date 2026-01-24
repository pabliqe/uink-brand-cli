# Next.js Integration Guide

Use the OG Image Generator with your Next.js project (both App Router and Pages Router).

## Quick Start

### 1. Copy Files to Your Next.js Project

```bash
# Copy scripts
cp -r /path/to/og-brand-template/scripts your-nextjs-project/

# Copy brand config
cp /path/to/og-brand-template/brand.json your-nextjs-project/
```

### 2. Install Dependency

```bash
npm install --save-dev @resvg/resvg-js
```

### 3. Add Script to package.json

```json
{
  "scripts": {
    "generate:og": "node scripts/generate-og.mjs",
    "sync:meta:nextjs": "node scripts/sync-meta-nextjs.mjs",
    "prebuild": "npm run generate:og && npm run sync:meta:nextjs"
  }
}
```

### 4. Configure Your Brand

Edit `brand.json` with your brand colors and info.

### 5. Run the Sync

```bash
npm run sync:meta:nextjs
```

This will automatically detect your Next.js structure and update the metadata.

## How It Works

### Automatic Detection

The script detects your Next.js setup:

- **App Router** (`app/layout.tsx`) - Adds `export const metadata`
- **Pages Router** (`pages/_document.tsx`) - Adds metadata tags

### What Gets Updated

**App Router (app/layout.tsx):**
```typescript
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Your Brand',
  description: 'Your description',
  openGraph: {
    title: 'Your Site Title',
    description: 'Your description',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Your Site Title',
    images: ['/og-image.png'],
  },
}
```

**Pages Router (pages/_document.tsx):**
Adds meta tags to the `<Head>` component.

## Complete Setup Example

### 1. Generate OG Image

```bash
# Generate the OG image (1200x630px PNG)
npm run generate:og

# Creates: public/og-image.png
```

### 2. Update Metadata

```bash
# Update Next.js metadata automatically
npm run sync:meta:nextjs

# Updates: app/layout.tsx or pages/_document.tsx
```

### 3. Verify

Check your files to ensure metadata was added correctly.

## Manual Setup (Alternative)

If the script doesn't work for your setup, manually add:

### App Router

Add to `app/layout.tsx`:

```typescript
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Your Brand Name',
  description: 'Your brand description',
  openGraph: {
    title: 'Your Site Title',
    description: 'Your brand description',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Your Brand',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Your Site Title',
    description: 'Your brand description',
    images: ['/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

### Pages Router

Add to `pages/_document.tsx`:

```typescript
import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <title>Your Brand</title>
        <meta name="description" content="Your description" />
        <meta property="og:title" content="Your Site Title" />
        <meta property="og:description" content="Your description" />
        <meta property="og:image" content="/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Your Site Title" />
        <meta name="twitter:image" content="/og-image.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
```

## Verifying the OG Image

### Test Locally

```bash
npm run generate:og
```

Check `public/og-image.png` to see the generated image.

### Test on Social Media

1. Build your Next.js project: `npm run build`
2. Deploy to a public URL
3. Test with:
   - [Open Graph Debugger](https://www.opengraph.xyz/)
   - [Twitter Card Validator](https://cards-dev.twitter.com/validator)

## Troubleshooting

### "Could not find Next.js layout file"

The script couldn't find `app/layout.tsx` or `pages/_document.tsx`.

**Solution:** Manually add the metadata using the examples above.

### Metadata not showing on social media

1. Ensure `public/og-image.png` exists
2. Deploy to a public domain (localhost won't work)
3. Clear social media cache:
   - Facebook: [Open Graph Debugger](https://developers.facebook.com/tools/debug/og/object/)
   - Twitter: [Card Validator](https://cards-dev.twitter.com/validator)

### Image path issues

If the image isn't found, verify:
1. `public/og-image.png` exists
2. `og-image.png` path in metadata matches
3. For custom domains, use full URLs: `https://example.com/og-image.png`

## Integration with Build Pipeline

Add to your `package.json` build script:

```json
{
  "scripts": {
    "build": "npm run generate:og && npm run sync:meta:nextjs && next build",
    "dev": "next dev"
  }
}
```

This ensures the OG image and metadata are always up-to-date before building.

## Tips

- Store `brand.json` in version control (with your actual colors/info)
- Regenerate OG images when updating your brand
- Test on multiple platforms (Facebook, Twitter, LinkedIn, Slack)
- Use dynamic routes for different pages if needed
- Consider using `next-seo` for more advanced SEO control

## For Multiple Routes (Advanced)

If you need different OG images for different pages, you can:

1. Generate multiple OG images with different filenames
2. Use Next.js dynamic metadata for different routes
3. Or use the `next-seo` library for more control

Example with next-seo:

```bash
npm install next-seo
```

Then in your `pages`:

```typescript
import { NextSeo } from 'next-seo'

export default function Home() {
  return (
    <>
      <NextSeo
        title="Home"
        description="Welcome to my site"
        openGraph={{
          type: 'website',
          url: 'https://example.com',
          title: 'Home',
          description: 'Welcome to my site',
          images: [
            {
              url: 'https://example.com/og-image.png',
              width: 1200,
              height: 630,
              alt: 'My Site',
            },
          ],
        }}
      />
      {/* Your page content */}
    </>
  )
}
```

## Support

For issues, check:
- [Next.js Metadata Documentation](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
- [Open Graph Documentation](https://ogp.me/)
- [Twitter Card Documentation](https://developer.twitter.com/en/docs/twitter-for-websites/cards/guides/getting-started)
