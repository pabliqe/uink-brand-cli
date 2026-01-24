# Example Files - How to Use the Metadata API

This folder contains real-world example files showing how to implement OG meta tags in your Next.js project.

## App Router (Recommended for Next.js 13+)

See `nextjs-app-router-layout.tsx` for an example of using the **Metadata API** in `app/layout.tsx`.

### Key Features

- ✅ Type-safe with TypeScript
- ✅ Server-side only (no client bundle)
- ✅ Supports all Open Graph and Twitter properties
- ✅ Easy to generate dynamically

### How to Use

1. Copy the metadata object from the example
2. Paste it into your `app/layout.tsx`
3. Replace values with your brand info from `brand.json`
4. Or run: `npm run sync:meta` to auto-generate it

### Example Usage

```typescript
// app/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Your Brand Name',
  description: 'Your brand description',
  openGraph: {
    title: 'Your Site Title',
    description: 'Your brand description',
    images: [
      {
        url: 'https://yourdomain.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Your Brand',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Your Site Title',
    images: ['https://yourdomain.com/og-image.png'],
  },
}

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
