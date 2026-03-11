# UINK Brand CLI - Strategic Roadmap

Status: Draft v1 (March 11, 2026)
Owner: CLI core

## Decision Log (Confirmed)
- Default OG output format: `jpg`.
- Existing user assets should be reused when possible (do not replace by default).
- Default favicon outputs: `favicon.ico` and `favicon.svg`.
- Conflict policy default: `preserve`.
- Legacy alias `og-brand`: remove (no backward alias).
- Integration default: generate files only (no code injection by default).
- Automatic injection: explicit opt-in only.

## Goal
Make onboarding one-shot, preserve user intent for existing assets, and make output naming/extensions consistent without surprise file replacement.

## Success Criteria
- A new user can run one command and get usable output in less than 60 seconds.
- Existing assets are never replaced unless explicitly requested.
- Asset extension and naming behavior is deterministic and documented.
- The CLI can prefer user-provided source assets (example: `public/uink-avatar.png`, `favicon.webp`) to generate required outputs.

## Roadmap (Task List)

### Phase 1 - One-Shot Setup (P0)
- [x] Add `uink-brand init` command to scaffold a minimal `brand.json` and integration guidance.
- [x] Add interactive mode for first run (`uink-brand --wizard`) with defaults and non-interactive fallback.
- [ ] Reduce install/run friction:
  - [x] Support direct execution with `npx @pabliqe/uink-brand-cli`.
  - [ ] Ensure help/docs always show `uink-brand` binary (remove all `og-brand` references/aliases).
  - [x] Print framework-specific next-step snippet only when needed (Next.js, static HTML, Vite).
- [x] Add `--yes` flag for CI one-shot defaults.
- [ ] Add integration mode:
  - [x] `--integrate auto|none` (default: `none`).
  - [ ] Detect framework and patch known files automatically when safe:
    - [x] Next.js App Router: write/update `app/layout.*` metadata export/import.
    - [x] Next.js Pages Router: patch `pages/_document.*` with `<BrandMeta />` import + `<Head>` insertion.
    - [x] Static/Vite: inject generated head tags in main HTML file when marker is present.
  - [x] Add idempotent markers to avoid duplicate injections on re-run.

Acceptance criteria:
- `npx @pabliqe/uink-brand-cli init --yes && npx uink-brand` works in a fresh project.
- README quick start is 3 steps max.
- First run performs file generation only unless integration is explicitly enabled.
- `--integrate auto` applies idempotent injections for supported frameworks.

### Phase 2 - User Asset Inputs (P0)
- [x] Introduce asset role model (input classification):
  - [x] `logo` (brand mark, often white/transparent, ideal as generation source)
  - [x] `favicon` (already-ready browser icon)
  - [x] `appIcon` (already-ready square app icon)
  - [x] `ogImage` (already-ready social image)
- [x] Add explicit source flags:
  - [x] `--source-logo <path>`
  - [x] `--source-favicon <path>`
  - [x] `--source-appicon <path>`
  - [x] `--source-og <path>`
- [x] Add config equivalents under `brand.assets`:
  - [x] `brand.assets.logo`
  - [x] `brand.assets.favicon`
  - [x] `brand.assets.appIcon`
  - [x] `brand.assets.ogImage`
- [x] Add logo-first derivation pipeline:
  - [x] If `logo` is provided, generate high-quality derived assets:
    - [x] `favicon.ico` and `favicon.svg`
    - [x] `icon-192x192.png`, `icon-512x512.png`, `icon-512x512-maskable.png`
    - [x] `og-image.jpg` using logo composition + brand colors
  - [x] Keep user-provided ready assets as authoritative for their role (do not overwrite by default).
  - [x] Fill only missing roles from derivation/default generators.
- [x] Add visual controls for derived assets:
  - [x] `--logo-padding <0-40>`
  - [x] `--logo-bg auto|solid|transparent`
  - [x] `--logo-bg-color <hex>`
  - [ ] `--logo-scale contain|cover`
- [x] Define precedence and conflict policy:
  - [x] CLI flags > `brand.assets` config > auto-detected existing files > defaults
  - [x] `preserve` remains default for existing outputs
- [x] Validate file existence/format/mime and transparency suitability with clear errors/warnings.
- [x] Add distributable bundle output:
  - [x] `--bundle zip|none` (default: `none`)
  - [x] `--bundle-name <name>` (default: `uink-brand-assets.zip`)
  - [x] Include generated assets + manifest + `.og-brand` outputs in bundle
  - [ ] Add checksum file option for CI artifact integrity (optional)

Acceptance criteria:
- If only `logo` is provided, CLI generates favicon, app icons, and OG image with coherent branding.
- If `favicon`, `appIcon`, or `ogImage` are provided, those files are preserved and referenced as-is.
- Missing outputs are generated from `logo` when available, otherwise from default token-based generator.
- Unsupported formats show actionable errors; weak logo inputs (low-res/no alpha when expected) show non-blocking warnings.
- When `--bundle zip` is used, CLI outputs a ready-to-share zip containing final assets and generated meta files.

### Phase 3 - Extension and Naming Consistency (P0)
- [ ] Define canonical output contract:
  - [ ] OG image default: `og-image.jpg` (configurable)
  - [ ] Favicon outputs default: `favicon.ico`, `favicon.svg`; optional `favicon.png`
  - [ ] PWA icons: `icon-192x192.png`, `icon-512x512.png`, `icon-512x512-maskable.png`
- [ ] Add naming strategy option:
  - [ ] `--naming legacy|canonical|project`
- [ ] Add extension strategy option:
  - [ ] `--og-format png|jpg|webp`
  - [ ] `--favicon-format auto|ico|png|svg|multi`
- [ ] Ensure generated meta and manifest always reference the chosen canonical outputs.

Acceptance criteria:
- No mixed, unpredictable extension changes between runs.
- Metadata references remain valid after format strategy changes.

### Phase 4 - Safe Existing-File Behavior (P0)
- [ ] Add overwrite policy flag:
  - [ ] `--on-conflict preserve|prompt|overwrite|rename`
- [ ] Default policy: `preserve`.
- [ ] Add dry-run mode:
  - [ ] `--dry-run` prints planned writes/renames without changing files.
- [ ] Detect existing files (`favicon.png`, `og-image.png`, custom logos) and do not replace unless policy allows.
- [ ] If conversion is needed (example: source png to required ico), write derived files without deleting original user assets.
- [ ] Reuse existing OG assets by preference order:
  - [ ] If user set `--source-og` or `brand.assets.ogImage`, use that.
  - [ ] Else detect `og-image.jpg|png|webp` and keep existing format if valid.
  - [ ] If no OG exists, generate default `og-image.jpg`.
- [ ] Reuse existing favicon assets by preference order:
  - [ ] If user set `--source-favicon` or `brand.assets.favicon`, use that as source.
  - [ ] Else detect existing `favicon.ico|svg|png|webp`; keep existing and generate missing required variants only.

Acceptance criteria:
- Existing user assets are unchanged by default.
- Any replacement requires explicit user choice or flag.
- Existing `og-image.png` is referenced in metadata when preserved (no forced switch to `.jpg`).

### Phase 5 - Documentation and Migration (P1)
- [ ] Rewrite README quick start around one-shot onboarding.
- [ ] Add migration guide from legacy naming (`og-brand`, `.jpg` defaults if any).
- [ ] Add examples for common source assets and extension strategies.
- [ ] Document precedence: CLI flags > `brand.json` > defaults.

Acceptance criteria:
- Docs match real CLI behavior and options.
- No legacy command names remain.

### Phase 6 - Test Coverage (P0)
- [ ] Add unit tests for argument parsing and option precedence.
- [ ] Add integration tests for:
  - [ ] Fresh project one-shot flow.
  - [ ] Existing assets preserved with default conflict policy.
  - [ ] Asset-source flags with png/svg/webp inputs.
  - [ ] Extension strategy matrix (`png`, `jpg`, `webp`) for OG output.
- [ ] Add snapshot tests for generated `meta.html` and `manifest.json`.
- [ ] Add integration test for zip bundle contents and naming.

Acceptance criteria:
- CI catches regressions in file naming, conflict behavior, and metadata references.

## Implementation Order (Strategic)
1. CLI contract and option design (Phases 2-4).
2. File conflict engine and dry-run behavior.
3. Format/naming consistency and metadata wiring.
4. One-shot `init`/`wizard` UX.
5. Docs and migration cleanup.
6. Full test matrix.

## Risks and Mitigations
- Risk: Breaking existing users with renamed outputs.
  - Mitigation: keep deterministic defaults and migration docs only (no alias mode required).
- Risk: Asset conversion edge cases across formats.
  - Mitigation: strict validation + fallback messaging + integration fixtures.
- Risk: Prompt fatigue in interactive mode.
  - Mitigation: sensible defaults + `--yes` + minimal questions.

## Open Questions
None currently. Product defaults are now defined.

## Definition of Done (Release)
- [ ] New options implemented with tests.
- [ ] One-shot onboarding flow available.
- [ ] Existing file replacement surprises eliminated by default.
- [ ] README and examples updated.
- [ ] Changelog entry added for behavior changes.
