# Harikesh Mishra Portfolio

A server-rendered software-engineer portfolio and long-form React writing site. It uses TanStack Start, React, TypeScript, Tailwind CSS v4, and a Sätteri markdown pipeline.

## Development

```bash
pnpm install
pnpm dev
```

The development server runs at `http://localhost:3000`.

```bash
pnpm build
pnpm test
```

`pnpm build` prerenders the portfolio, articles index, and every crawled article route. `pnpm test` runs the focused content-heading and table-of-contents behavior checks.

## Site Configuration

Update `src/lib/site.ts` for the site name, contact details, production URL, social links, and resume PDF path. It supplies the shared metadata, canonical URLs, JSON-LD, sitemap, and robots values.

The homepage also serves Markdown when a client prefers `Accept: text/markdown`, with q-value-aware negotiation and `Vary: Accept`. `public/llms.txt` tells agents when to use the portfolio and where to find articles, resume evidence, the sitemap, and contact details. Unknown paths retain a real 404 status and expose the same recovery links in HTML or negotiated Markdown.

Trust pages live at `/about`, `/contact`, and `/privacy`. Keep their identity, contact, and data-handling claims accurate when the site's ownership, forms, analytics, storage, or hosting behavior changes. The sitemap generator includes these pages alongside `/resume` and the article catalog.

`public/og.png` and `public/og-light.png` are the shared social cards. `scripts/generate-og.mjs` keeps their identity copy and terracotta accents synchronized during builds while generating article cards and the sitemap. The resume PDF uses `public/Harikesh_Mishra_Resume_<hash>.pdf`, where `<hash>` is the first eight lowercase characters of its SHA-256 digest. When the PDF changes, rename it with the new hash and update `site.resumePdfPath`; `src/lib/site.test.ts` rejects stale filenames while `site.resumePdfDownloadName` keeps the downloaded file name clean.

## Articles Pipeline

Publishing an article means adding a Markdown file under `src/content/guides/`. Its filename becomes the flat `/articles/<slug>` URL.

```yaml
---
title: "Post title"
description: "Short article summary."
category: "JavaScript"
topic: "async-and-concurrency"
readTime: "10 min read"
date: "May 2026"
publishedAt: "2026-05-01"
---
```

- `title`, `description`, `category`, `readTime`, `date`, and `publishedAt` are required.
- Standalone posts require a `topic` ID and sort by `publishedAt` descending within that topic. Topic definitions and their display order live in `src/lib/content.ts`.
- Series posts use `series` and `order` together instead of `topic`. Add a series definition to `src/lib/content.ts` before assigning its ID in frontmatter.
- The articles index presents a compact anchor overview, followed by learning paths and authored topic sections; it does not infer taxonomy from guide titles.
- Article detail pages use the same collection order for previous/next navigation: `order` within a series and descending `publishedAt` within a topic.
- `src/lib/content.ts` eagerly imports only frontmatter and lazy-loads rendered Markdown, so guide prose remains in each article chunk. Article-list links prefetch article data on hover or touch, then reuse it on a direct click.

Sätteri handles GFM, frontmatter, heading IDs, and Expressive Code. H2–H4 headings receive stable IDs for in-article table-of-contents links; fenced blocks use GitHub light/dark syntax themes and include a copy control. Images from `public/diagrams/` are enhanced after hydration into keyboard-accessible `Open full diagram` controls. They open a full-canvas native dialog that keeps the sketch on its white teaching surface. At `xl` and above, article H2s populate a fixed, keyboard-accessible floating table of contents whose progress rail morphs into a scrollable label panel. Below `xl`, a 48px active-section pill capped at 19rem pairs the section title with a compact 32px current-section progress ring and opens the same headings in an accessible, draggable bottom sheet with 44px targets and two-line section labels. Both views push shareable hash entries, support back/forward section traversal, and restore the pre-section scroll position when returning to the hashless entry.

## Theme and Accessibility

The visual system lives in `src/styles.css`. It uses true greyscale semantic neutrals with a restrained terracotta signal mapped into Tailwind v4. Atkinson Hyperlegible Next uses real 400–700 weights, JetBrains Mono handles technical labels and code, and explicit `data-theme="light"` and `data-theme="dark"` values are set before paint and persisted in local storage. The reading scale distinguishes high-contrast prose, semibold headings, and quieter metadata without relying on synthetic font weights.

The build-time guide presentation plugin renders recognized introductory context as an aside and exercise instructions under `### Try it` as grouped prose. Both retain italics without quotation bars or generated quotes. Actual quotations keep their blockquote treatment. Horizontal rules immediately before chapter headings are omitted, while unrelated thematic breaks remain. Promote structural labels explicitly in Markdown rather than inferring headings from bold text; preserve wording and existing anchors.

The site retains a skip link, visible keyboard focus treatment, reduced-motion handling, `overflow-x: clip` on the body, and responsive single-column reading layouts. First loads and article destinations use a short transform/opacity entrance timeline, while Home, Resume, and Articles destinations swap without a zero-opacity frame; article navigation morphs the persistent avatar and theme toggle between identity and breadcrumb headers. The Home and Articles heroes share the same font-aware editorial line reveal and own their routes' only entrance choreography. Home skills, work, article previews, the Articles browse map, topic sections, and rows remain stationary; on desktop pointer devices, hovering or focusing an article row dims its siblings without translation. Article heroes retain their one-time editorial entrance, while article prose, headings, code, figures, lists, tables, blockquotes, and previous/next links remain stationary during reading. The mobile sheet traps focus, locks background scrolling, accounts for safe areas, and reduces its motion to a short opacity fade. The article top progress line appears only in browsers with CSS scroll-driven animation support and is omitted when reduced motion is requested.

New route navigation starts at the top, while browser back and forward traversal restores the cached scroll position before the entering page becomes visible. Same-route hash traversal bypasses route animation and settles headings to their 2rem scroll margin, instantly when reduced motion is requested.

## Project Docs

- `PRODUCT.md` defines product positioning, audience, and content priorities.
- `DESIGN.md` documents the active visual system.
- `.impeccable/design.json` is the machine-readable design-system sidecar.
- `AGENTS.md` records repository conventions for coding agents alongside TanStack Intent guidance.
