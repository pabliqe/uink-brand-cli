# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Version Sync**: Version numbers are automatically synchronized with package.json.

**How to Release**:
1. Update this CHANGELOG.md: move [Unreleased] changes to new version section
2. Update version in package.json: `npm version [patch|minor|major]`
3. Push with tags: `git push && git push --tags`
4. Create GitHub release: triggers automatic npm publish

---

## [Unreleased]

<!--
Template for new versions:

## [X.Y.Z] - YYYY-MM-DD

### Added
- New features grouped by functionality
- Each feature with clear description

### Changed
- Changes in existing functionality

### Deprecated
- Features that will be removed in future

### Removed
- Removed features

### Fixed
- Bug fixes with clear description

### Security
- Security improvements
-->

### Planned Features
- Custom font support (Google Fonts, local fonts)
- SVG logo integration in OG images
- Custom OG image templates
- Multiple OG images (per-page support)
- Favicon generator from logo/SVG input
- Dark mode asset variants
- Localization support (multi-language meta tags)
- Analytics integration helpers
- Schema.org structured data generation
- Sitemap generation from routes

### Potential Integrations
- Figma plugin for design token export
- Tailwind CSS config generator
- CSS custom properties output
- Storybook integration
- Chromatic visual testing

---

## [1.0.0] - 2026-03-08

### 🎉 Initial Release

The first stable release of OG Brand CLI - a zero-config tool for generating PWA assets and meta tags from DTCG design tokens.

### Added

#### CLI Tool & Configuration
- Main executable binary with `og-brand` command
- Help system (`--help`, `-h`) with comprehensive usage guide
- Version display (`--version`, `-v`)
- Configuration options: `--brand`, `--out`, `--generate-dir`, `--force`
- Beautiful progress output with emojis and status indicators
- Smart asset detection: automatically skips existing files
- Force flag (`--force`) to regenerate all assets
- Error handling with helpful messages

#### Asset Generation Engine
- **OG Image Generator** (1200x630px)
  - Satori integration for SVG generation
  - Resvg integration for PNG conversion
  - Typography-based layout with brand name and site title
  - Brand-colored decorative elements
  - Version badge from package.json
  - Text wrapping for long brand names
  - System font support (no external font dependencies)
- **Favicon Generator**
  - Classic favicon.ico (32x32)
  - Modern scalable favicon.svg
  - Letter-based design using brand's first character
  - Brand color background with white letter
- **Apple Touch Icon** (180x180)
  - iOS-optimized square icon
  - Letter-based design matching favicon style
- **PWA Icons**
  - icon-192x192.png (small PWA icon)
  - icon-512x512.png (large PWA icon)
  - icon-512x512-maskable.png (adaptive icon with safe zone)
  - All using consistent letter-based design

#### DTCG Token Parser
- Full DTCG (Design Token Community Group) specification support
- Parse tokens with `$value` and `$type` properties
- Plain JSON fallback for non-DTCG formats
- Automatic fallback to package.json for missing metadata
- Intelligent recursive color extraction from nested structures
- Support for multiple color naming conventions (primary.DEFAULT, ui.text.primary, etc.)
- Smart value extraction with dot notation path traversal
- Validation system for required brand fields

#### Meta Tag & Code Generators
- **React Component** (BrandMeta.jsx)
  - JSX component with all meta tags
  - Ready to import and use in React apps
- **TypeScript Component** (BrandMeta.tsx)
  - Type-safe version with React.ReactElement return type
  - Includes React import
- **Next.js Metadata** (next-metadata.ts)
  - Native Next.js App Router metadata object
  - Type-safe Metadata export
  - Support for openGraph, twitter, icons, manifest
- **Static HTML** (meta.html)
  - Ready-to-copy HTML snippet
  - All meta tags properly formatted
  - Comments for clarity
- **Auto-generated README**
  - Usage instructions in output directory
  - Framework-specific examples

#### PWA Manifest Generator
- Complete manifest.json generation
- Brand name and short_name (auto-truncated)
- Description from brand tokens
- start_url, display, orientation
- theme_color from design tokens
- background_color from design tokens
- Icons array with all generated assets
- Proper purpose tags (any, maskable)

#### Meta Tags Coverage
- **SEO Tags**
  - `<title>` from brand.siteTitle
  - `<meta name="description">` from brand.description
  - `<link rel="canonical">` from brand.siteUrl
- **Mobile & PWA Tags**
  - `<meta name="viewport">` with proper scaling
  - `<meta name="theme-color">` from primary color
  - `<link rel="manifest">` to manifest.json
- **Favicon Links**
  - `<link rel="icon">` for ICO and SVG
  - `<link rel="apple-touch-icon">` for iOS
  - Proper sizes and type attributes
- **Open Graph Protocol**
  - og:title, og:description, og:type (website)
  - og:url, og:site_name
  - og:image with full URL
  - og:image:width (1200), og:image:height (630)
- **Twitter Cards**
  - twitter:card (summary_large_image)
  - twitter:title, twitter:description
  - twitter:image with full URL

#### Custom Asset Support
- Smart file detection: preserves existing assets
- Mix and match: use custom OG image with auto-generated icons
- Skips generation for files that already exist
- `--force` flag to override and regenerate everything
- Visual feedback showing which assets are preserved vs generated
- Helpful info message guiding users to --force flag

#### Documentation
- **README.md**: Comprehensive guide with installation, usage, examples
  - Quick start guide with step-by-step instructions
  - CLI options reference
  - Custom asset usage guide
  - Framework integration examples (5+ frameworks)
  - Brand.json format specification
  - Meta tags listing
  - Asset generation details
  - Publishing setup guide
- **SETUP.md**: Quick setup for maintainers and users
  - Publishing workflow
  - Manual and automated release process
  - User installation options
  - Framework integration snippets
- **STRUCTURE.md**: Complete project architecture documentation
  - Directory tree with explanations
  - File size estimates
  - Integration points for all frameworks
  - Path troubleshooting
- **CONTRIBUTING.md**: Contribution guidelines
  - Development setup
  - Code style guide
  - Commit message format
  - Code of conduct
- **CHANGELOG.md**: This file, version history
- **PROJECT-SUMMARY.md**: Complete refactoring overview
- **Examples directory**: Real-world integration examples
  - Next.js App Router with metadata object
  - Next.js Pages Router with component
  - Static HTML example
  - Custom assets example
  - Examples README with usage guide

#### CI/CD Pipeline
- **GitHub Actions: Publish Workflow**
  - Triggered on GitHub release publication
  - Automatic npm publishing with provenance
  - Success notification as commit comment
  - Requires NPM_TOKEN secret
- **GitHub Actions: CI Workflow**
  - Runs on push and pull requests
  - Multi-version Node.js testing (18.x, 20.x, 22.x)
  - Install dependencies with npm ci
  - CLI execution tests (help, version, generation)
  - Output verification (assets, manifest, components)
  - Custom asset detection test
  - Force flag test

### Technical Specifications
- **Language**: JavaScript (ES Modules)
- **Node.js**: >=18.0.0 required
- **Dependencies**: 
  - @resvg/resvg-js: ^2.6.0 (SVG to PNG conversion)
  - satori: ^0.10.0 (React-like JSX to SVG)
- **Package Type**: ESM with top-level await support
- **Binary**: `og-brand` command via bin field
- **Published as**: @pabliqe/og-brand-cli (scoped package)
- **File Size**: ~50KB published package
- **License**: MIT

### Developer Experience
- Zero configuration required out of the box
- Sensible defaults for all options
- Crystal clear error messages with actionable suggestions
- Progress indicators for long operations
- Helpful output showing what was generated vs skipped
- Auto-generated README in output directory
- Full TypeScript support in generated files
- Works on macOS, Linux, and Windows
- No build step required (direct JavaScript execution)

---

[Unreleased]: https://github.com/pabliqe/og-brand-template/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/pabliqe/og-brand-template/releases/tag/v1.0.0
