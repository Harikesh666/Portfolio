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

`pnpm build` prerenders the portfolio, writing index, and every crawled article route. `pnpm test` runs the focused content-heading and table-of-contents behavior checks.

## Site Configuration

Update `src/lib/site.ts` for the site name, email, production URL, and social links. It supplies the shared metadata, canonical URLs, JSON-LD, sitemap, and robots values.

`public/og.png` is the shared social card. `public/Harikesh_Mishra_Resume.pdf` is the downloadable resume linked from the global header.

## Writing Pipeline

Publishing a guide means adding a Markdown file under `src/content/guides/`. Its filename becomes the flat `/writing/<slug>` URL.

```yaml
---
title: "Post title"
description: "Short article summary."
category: "Architecture"
readTime: "10 min read"
date: "May 2026"
publishedAt: "2026-05-01"
series: "react-internals"
order: 11
---
```

- `title`, `description`, `category`, `readTime`, `date`, and `publishedAt` are required.
- `series` and `order` are optional together. Omit both for a standalone post; standalone posts sort by `publishedAt` descending.
- Series definitions live in `src/lib/content.ts`. Add the series there before assigning its ID in frontmatter.
- `src/lib/content.ts` eagerly imports only frontmatter and lazy-loads rendered Markdown, so guide prose remains in each article chunk.

Sätteri handles GFM, frontmatter, heading IDs, and Expressive Code. H2–H4 headings receive stable IDs for in-article table-of-contents links; fenced blocks use GitHub light/dark syntax themes and include a copy control. At `xl` and above, article H2s populate a fixed, keyboard-accessible floating table of contents whose progress rail morphs into a scrollable label panel. Below `xl`, a persistent section-progress pill opens the same headings in an accessible, draggable bottom sheet. Both views push shareable hash entries, support back/forward section traversal, and restore the pre-section scroll position when returning to the hashless entry.

## Theme and Accessibility

The visual system lives in `src/styles.css`. It uses semantic CSS variables mapped into Tailwind v4, with explicit `data-theme="light"` and `data-theme="dark"` values set before paint and persisted in local storage.

The site retains a skip link, visible keyboard focus treatment, reduced-motion handling, `overflow-x: clip` on the body, and responsive single-column reading layouts. First loads and article destinations use a short transform/opacity entrance timeline, while Home, Resume, and Writing destinations swap without a zero-opacity frame; article navigation morphs the persistent avatar and theme toggle between identity and breadcrumb headers. The mobile sheet traps focus, locks background scrolling, accounts for safe areas, and reduces its motion to a short opacity fade. The article top progress line appears only in browsers with CSS scroll-driven animation support and is omitted when reduced motion is requested.

New route navigation starts at the top, while browser back and forward traversal restores the cached scroll position before the entering page becomes visible. Same-route hash traversal bypasses route animation and settles headings to their 2rem scroll margin, instantly when reduced motion is requested.

## Project Docs

- `PRODUCT.md` defines product positioning, audience, and content priorities.
- `DESIGN.md` documents the active visual system.
- `.impeccable/design.json` is the machine-readable design-system sidecar.
- `AGENTS.md` records repository conventions for coding agents alongside TanStack Intent guidance.
