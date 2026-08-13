# UINK Tools brand (CLI)

**UINK Tools** is the umbrella publisher name for every `uink-*` product. This CLI reads it from `brand.name` and writes it into generated meta tags.

## What the CLI emits from `brand.name`

- `<title>` and `og:title` / `twitter:title` as `{siteTitle} | {name}` when the two differ
- `og:site_name`
- PWA `manifest.json` `name` and `short_name`
- Next.js `authors`, `creator`, `publisher`, and `openGraph.siteName`

## Required tokens for a UINK Tools app

```json
{
  "brand": {
    "name": { "$value": "UINK Tools", "$type": "string" },
    "siteTitle": { "$value": "Your product title", "$type": "string" },
    "description": { "$value": "SEO description", "$type": "string" },
    "siteUrl": { "$value": "https://example.uink.agency", "$type": "string" }
  }
}
```

Aliases (case-insensitive):

- name: `brand.author`, `brand.brandname`
- siteTitle: `brand.title`, `brand.siteName`

Regenerate with `npx uink-brand --force --integrate auto`.

Package names stay `uink-brand-cli` / `uink-*`. The public init wizard still defaults to generic “My Brand” so third-party users are not forced onto this umbrella.
