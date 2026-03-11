# Usage Examples

This directory contains practical examples showing how to integrate UINK Brand CLI into various frameworks.

## Examples

### 1. Next.js App Router
See [nextjs-app-router-layout.tsx](./nextjs-app-router-layout.tsx) for the full implementation.

**Key points:**
- Import metadata object from generated file
- Export as named export
- Next.js automatically handles meta tag injection

### 2. Next.js Pages Router
See [nextjs-pages-router-document.tsx](./nextjs-pages-router-document.tsx) for the full implementation.

**Key points:**
- Import BrandMeta component in `_document.tsx`
- Place inside `<Head>` component
- Custom document applies to all pages

### 3. Using Custom Assets

**Want to use your own logo or custom OG image?**

1. **Place your custom files** in the output directory:
   ```bash
   mkdir -p public
   cp my-logo.png public/favicon.ico
   cp my-og-image.jpg public/og-image.jpg
   cp my-apple-icon.png public/apple-touch-icon.png
   ```

2. **Run the CLI** - it automatically detects and preserves your files:
   ```bash
  npx uink-brand-cli
   ```
   
   Output:
   ```
   🖼️  [2/4] Generating assets...
      ⊙ og-image.jpg (using existing)
      ⊙ favicon.ico (using existing)
      ✓ icon-192x192.png (192x192)
      ...
   ```

3. **Result**: Your custom assets + auto-generated PWA icons + full meta tags!

**Tips:**
- Mix and match freely (e.g., custom OG image + auto-generated icons)
- Use `--force` to regenerate everything: `uink-brand --force`
- Manifest and meta tags always reference the correct files
export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  )
}
```

## Pages Router (Next.js 12 and earlier)

See `nextjs-pages-router-document.tsx` for an example of meta tags in `pages/_document.tsx`.

### How to Use

1. Copy the meta tags from the example
2. Paste them into your `pages/_document.tsx`
3. Update with your brand values
4. Or run: `npm run sync:meta` to auto-generate it

### Example Usage

```typescript
// pages/_document.tsx
import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html>
      <Head>
        <title>Your Brand Name</title>
        <meta name="description" content="Your description" />
        <meta property="og:title" content="Your Site Title" />
        <meta property="og:image" content="/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
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

## Dynamic Routes (Advanced)

For different pages with different OG images:

### App Router

```typescript
// app/posts/[slug]/page.tsx
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const post = await fetchPost(params.slug)

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [{ url: post.ogImage || '/og-image.png' }],
    },
  }
}

export default function PostPage({ params }) {
  // Your component
}
```

### Pages Router

```typescript
// pages/posts/[slug].tsx
import { GetStaticProps } from 'next'

export default function PostPage({ post }) {
  return (
    <>
      <Head>
        <title>{post.title}</title>
        <meta property="og:title" content={post.title} />
        <meta property="og:image" content={post.ogImage || '/og-image.png'} />
      </Head>
      {/* Your content */}
    </>
  )
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const post = await fetchPost(params.slug)
  return { props: { post } }
}
```

## Testing Your OG Image

After adding metadata, test it with:

1. **Open Graph Debugger** - https://www.opengraph.xyz/
2. **Twitter Card Validator** - https://cards-dev.twitter.com/validator
3. **Facebook Debugger** - https://developers.facebook.com/tools/debug/og/object/

## Automatic Generation

Instead of manually copying, you can run:

```bash
npm run sync:meta
```

This will automatically:
- Detect your Next.js structure (App or Pages router)
- Read your `brand.json` configuration
- Generate and insert the proper metadata

## Tips

- Always use **full URLs** for OG images (including domain)
- Test on actual deployed sites (localhost won't work)
- Use absolute paths `/og-image.png` or full URLs `https://domain.com/og-image.png`
- Twitter Card requires `summary_large_image` with image
- Facebook caches OG images - use the debugger to force refresh

## More Info

- [Next.js Metadata API](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
- [Open Graph Protocol](https://ogp.me/)
- [Twitter Card Documentation](https://developer.twitter.com/en/docs/twitter-for-websites/cards)
