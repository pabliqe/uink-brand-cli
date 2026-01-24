import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My Awesome Site',
  description: 'Building the future with amazing digital experiences',
  openGraph: {
    title: 'Welcome to My Awesome Site',
    description: 'Building the future with amazing digital experiences',
    images: [
      {
        url: 'https://example.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'My Awesome Site',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Welcome to My Awesome Site',
    description: 'Building the future with amazing digital experiences',
    images: ['https://example.com/og-image.png'],
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
