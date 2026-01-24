import { Html, Head, Main, NextScript } from 'next/document'
import type { DocumentProps } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <title>My Awesome Site</title>
        <meta name="description" content="Building the future with amazing digital experiences" />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Welcome to My Awesome Site" />
        <meta property="og:description" content="Building the future with amazing digital experiences" />
        <meta property="og:image" content="https://example.com/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Welcome to My Awesome Site" />
        <meta name="twitter:description" content="Building the future with amazing digital experiences" />
        <meta name="twitter:image" content="https://example.com/og-image.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
