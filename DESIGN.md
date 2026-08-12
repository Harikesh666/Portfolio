---
name: Harikesh Mishra Portfolio
description: A quiet, single-column engineer portfolio and technical writing system.
colors:
  surface-light: "oklch(0.985 0.003 95)"
  foreground-light: "oklch(0.33 0.016 85)"
  foreground-strong-light: "oklch(0.19 0.018 85)"
  muted-light: "oklch(0.47 0.012 85)"
  divider-light: "oklch(0.87 0.008 85)"
  surface-dark: "oklch(0.17 0.007 85)"
  foreground-dark: "oklch(0.84 0.01 85)"
  foreground-strong-dark: "oklch(0.96 0.006 85)"
  accent: "oklch(0.51 0.13 32)"
typography:
  display:
    fontFamily: "Atkinson Hyperlegible Next, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Atkinson Hyperlegible Next, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.65
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "4px"
spacing:
  sm: "12px"
  md: "20px"
  lg: "56px"
components:
  text-link:
    textColor: "{colors.foreground-strong-light}"
    typography: "{typography.body}"
  navigation:
    textColor: "{colors.foreground-light}"
    typography: "{typography.body}"
---

# Design System: Harikesh Mishra Portfolio

## 1. Overview

**Creative North Star: "The Quiet Engineering Notebook"**

The portfolio is a minimal, proof-led introduction to a software developer and a home for deep technical writing. The interface behaves like a dependable reading surface: one narrow column, direct navigation, calm spacing, and evidence before ornament.

It is rigorous, pragmatic, and candid. Recruiters can scan tangible outcomes quickly; fellow engineers can settle into substantial articles without visual noise.

**Key Characteristics:**
- A `42rem` single-column layout across portfolio, articles index, and article pages.
- Explicit light and dark themes using the same semantic tokens.
- Atkinson Hyperlegible Next for all prose and headings, JetBrains Mono for metadata and technical labels.
- Phosphor provides the single interface-icon language across navigation, downloads, disclosures, and article controls.
- Terracotta acts as one intentional signal for links, series indices, inline code, focus, and important metrics.

## 2. Colors

The palette is warm and low-chroma rather than editorial or decorative. All components consume semantic variables so light and dark modes switch together.

### Light Theme
- **Surface** (`oklch(0.985 0.003 95)`): reading background.
- **Foreground** (`oklch(0.33 0.016 85)`): body text.
- **Strong Foreground** (`oklch(0.19 0.018 85)`): headings and key navigation.
- **Muted** (`oklch(0.47 0.012 85)`): metadata and secondary context.
- **Divider** (`oklch(0.87 0.008 85)`): list and layout rules.
- **TOC Track** (`oklch(0.62 0.012 85)`): the floating rail's readable inactive state.

### Dark Theme
- **Surface** (`oklch(0.17 0.007 85)`): warm near-black reading background.
- **Foreground** (`oklch(0.84 0.01 85)`): body text.
- **Strong Foreground** (`oklch(0.96 0.006 85)`): headings and key navigation.
- **Muted** (`oklch(0.68 0.012 85)`): metadata and secondary context.
- **Divider** (`oklch(0.33 0.008 85)`): quiet structural separation.
- **TOC Track** (`oklch(0.53 0.012 85)`): the floating rail's readable inactive state.

### Accent
- **Terracotta** (`oklch(0.51 0.13 32)` light; `oklch(0.72 0.13 32)` dark): links, series numbers, inline-code surfaces, focus rings, and selected evidence. Soft surfaces use `oklch(0.94 0.028 32)` light and `oklch(0.31 0.04 32)` dark.

**The Signal Rule.** Terracotta directs attention; it is never used as ambient decoration or a second palette.

## 3. Typography

**Body and Headings:** Atkinson Hyperlegible Next, ui-sans-serif, system-ui, sans-serif
**Technical Labels and Code:** JetBrains Mono, ui-monospace, monospace

### Hierarchy
- **Page Title:** 1.75rem on mobile and 2rem from `sm`, semibold, 1.15 leading, `-0.025em` tracking.
- **Section Label:** 13px medium JetBrains Mono with compact tracking on article routes.
- **Article Link:** 16px medium Atkinson Hyperlegible Next with tight leading and terracotta hover.
- **Body:** 17px Atkinson Hyperlegible Next at 1.65 line height.
- **Guide Prose:** 18px Atkinson Hyperlegible Next at 1.78 line height.

**The Reading Rule.** No oversized display type or decorative serif hierarchy. Technical ideas earn emphasis through clarity, sequence, and breathing room.

## 4. Elevation

The system is flat. Borders divide lists and sections; whitespace establishes priority. There are no decorative shadows, card shells, gradients, or glass effects.

Code is rendered by Expressive Code with GitHub light and dark syntax themes. Fenced blocks include a copy control and respond to the page's `data-theme` value. Inline code is a compact terracotta-tinted surface with no generated backticks.

## 5. Components

### Navigation
- **Shape:** A single ruled row with site name, writing link, GitHub, resume, and theme toggle.
- **Theme Control:** Minimum 44px target; persists explicit `light` or `dark` preference in local storage.
- **Focus:** 3px terracotta outline with 3px offset.

### Articles Index
- **Map:** A compact ruled `Browse` navigation follows the introduction and links to every learning path and authored topic with guide counts.
- **Hierarchy:** Guided series remain the primary collection; standalone guides are divided into durable conceptual topics rather than one oversized language category.
- **Taxonomy:** Standalone topic IDs and display metadata live in `src/lib/content.ts` and are validated from guide frontmatter. Series posts use their ordered learning-path metadata instead.
- **Restraint:** The full catalog remains in one narrow document. Anchor links, section headings, and tighter rows provide orientation without cards, filter chips, hidden panels, search, or pagination.
- **Motion:** The index hero shares Home's font-aware editorial entrance, revealing the title by rendered line before its description and count. Browse navigation, topic sections, and article rows render immediately and retain stable geometry during scrolling.

### Article List Item
- **Structure:** Series index, title, summary, and reading time in a compact vertically stacked ruled list.
- **Behavior:** On desktop pointer devices, hovering or keyboard-focusing a row dims sibling content to `0.35` and restores the active row over 140ms. The title also changes to terracotta; no cards, translation, or lift effects.

### Article Content
- **Structure:** Back link, title, muted metadata, prose, then collection-aware previous/next links. The links follow series order or a JavaScript topic's descending publish order.
- **Pager:** Previous stays left and Next stays right in a two-column layout from `sm` upward. The links stack in reading order on narrower screens, and a lone Next link still occupies the right column on wider screens.
- **Anchors:** H2–H4 headings have stable IDs and a 2rem scroll margin. Table-of-contents activation pushes a shareable same-route hash entry, repeated activation replaces it, back/forward re-traverses headings, and returning to the hashless entry restores the captured pre-click scroll position.
- **Desktop Table of Contents:** At `xl` and above, a fixed progress rail summarizes eligible H2s as more readable magnified bars. Hover or keyboard focus morphs each bar into the leading marker of a 240px, scrollable label panel; active and hover indicators move between rows without layout shift, and rows remain semantic anchors. Pointer-activated rows release their transient focus so the panel collapses when the pointer leaves, while keyboard activation preserves focus and the expanded state. The authored in-content table of contents is hidden only at this breakpoint.
- **Mobile Table of Contents:** Below `xl`, a bottom-centered 48px pill capped at 19rem places a small foreground marker before the active H2 and a compact 32px clockwise terracotta ring after it to show progress through that section. It opens a portal-based sheet capped at `min(72dvh, 560px)`. The sheet uses a tokenized surface, divider, safe-area padding, focus trap, background inerting, native list momentum, and drag-to-dismiss only when the list is at its top boundary. Rows retain 44px targets, reveal up to two lines of long section titles, and reinforce the active section with the existing soft accent surface.
- **Reading Progress:** A 2px terracotta top hairline uses CSS scroll-driven animation where supported; it is absent for reduced-motion preferences.
- **Diagrams:** Images from `/diagrams/` keep their original reading size and end with a quiet `Open full diagram` text cue. The native modal makes the hand-drawn sketch the sole focal object on its white teaching surface, set against a dark scrim. Pointer activation fades the scrim over 160ms, then after a 40ms handoff brings the viewport-bounded sheet from 10px below at `0.985` scale through a 240ms transform spring with a fast 160ms opacity handoff. The 160ms close has no bounce. Keyboard and reduced-motion activation are instant. It locks background scrolling, closes through its visible control, Escape, or backdrop, and returns keyboard focus to the invoking diagram.
- **Code:** Expressive Code frames retain their generated theme and copy behavior; local CSS only styles inline code. Programmatic heading navigation uses a three-frame settle loop with instant correction steps. The article tree deliberately avoids `content-visibility`: the corrected retry achieved exact anchors and a sub-700ms throttled task, but failed the unthrottled slow-frame gate.
- **Reading Stability:** The complete article body renders immediately and remains stationary during scrolling. Prose, headings, code, figures, lists, tables, and blockquotes have no reveal metadata, observers, or entrance animation; previous/next links use color-only hover feedback.

### Motion
- **Route and entry:** Navigated route wrappers become visible immediately after the outgoing 90ms exit so the page hero is the sole entrance owner. A pre-paint JavaScript marker hides only unprepared stagger roots, preventing SSR content from flashing before hydration while leaving the content visible when JavaScript is unavailable. Editorial heroes wait for loaded fonts and follow document order: optional eyebrow copy enters from 14px below with opacity and no blur, the headline splits into rendered lines and reveals from `0.4em` below with a 4px one-shot blur on a 320ms visual spring with `0.1` bounce and strong ease-out opacity, then supporting metadata and actions use the same 14px opacity-and-transform follower entrance on a 240ms visual spring with `0.1` bounce and strong ease-out opacity. Lines stagger by 60ms, pause for 180ms, and followers stagger by 50ms. Home and Articles both use this choreography while preserving their existing scale and spacing. The home introduction is the visual headline; Resume, Articles, and article titles remain the anchors on their routes. Same-path hash changes never remount the route boundary. The exiting desktop table of contents becomes inert and `display: none` immediately, then disposes after route commit.
- **Header continuity:** Article navigation transforms one persistent avatar and theme control between fixed identity and breadcrumb geometry over 300ms on the route curve; no layout projection or runtime measurement participates. Non-shared navigation and breadcrumb content crossfade, focus remains on the persistent theme control, and identity-to-identity navigation does not retrigger the header.
- **Signature interaction:** The responsive table of contents receives the motion budget through desktop shared-element morphs and mobile physical sheet drag. Both views use active-outward staggering and within-section progress; mobile backdrop opacity is coupled directly to sheet position, while velocity-aware stretch remains desktop-only.
- **Restraint:** Repeated motion is limited to transforms and opacity; scale is reserved for small page-entry blocks, the Home and Articles routes remain stationary below their heroes, and complete article bodies never animate during scroll. Home skills, work history, and article previews render immediately. Article-list focus is opacity-only, restores the active row in 140ms, and never translates content. The editorial hero's 4px blur is an explicit exception authorized only for headline lines during their one-shot mount entrance; supporting labels, descriptions, metadata, and actions travel 14px with opacity and no blur. The exception does not apply to article prose or route-sized trees. `prefers-reduced-motion: reduce` renders heroes immediately, snaps the header layout, removes entrance transforms, and keeps simple destinations instant.

## 6. Do's and Don'ts

### Do:
- **Do** keep every primary surface within the narrow reading column.
- **Do** use semantic theme tokens and test both explicit `data-theme` values.
- **Do** preserve accessible focus, reduced-motion, and overflow safeguards.
- **Do** publish guides through validated series or topic frontmatter rather than route-level title inference.
- **Do** let evidence, writing, and code carry the visual weight.

### Don't:
- **Don't** reintroduce a serif display system, oversized clamp-based headings, or magazine layouts.
- **Don't** add a second accent color, gradients, glass, or decorative card grids.
- **Don't** hardcode Markdown post metadata in route components.
- **Don't** override Expressive Code fenced-block styles with legacy `pre` rules.
- **Don't** use motion as decoration; respect reduced-motion preferences.
