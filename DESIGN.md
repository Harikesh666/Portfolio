---
name: Harikesh Mishra Portfolio
description: A quiet, single-column engineer portfolio and technical writing system.
colors:
  surface-light: "oklch(0.985 0 0)"
  foreground-light: "oklch(0.33 0 0)"
  foreground-strong-light: "oklch(0.19 0 0)"
  muted-light: "oklch(0.47 0 0)"
  divider-light: "oklch(0.87 0 0)"
  surface-dark: "oklch(0.17 0 0)"
  foreground-dark: "oklch(0.84 0 0)"
  foreground-strong-dark: "oklch(0.96 0 0)"
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

The portfolio is a minimal, proof-led introduction to a software engineer and a home for deep technical writing. The interface behaves like a dependable reading surface: one narrow column, direct navigation, calm spacing, and evidence before ornament.

It is rigorous, pragmatic, and candid. Recruiters can scan tangible outcomes quickly; fellow engineers can settle into substantial articles without visual noise.

**Key Characteristics:**
- A `42rem` single-column layout across portfolio, articles index, and article pages.
- Explicit light and dark themes using the same semantic tokens.
- Atkinson Hyperlegible Next for all prose and headings, JetBrains Mono for metadata and technical labels.
- Phosphor provides the single interface-icon language across navigation, downloads, disclosures, and article controls.
- Terracotta acts as one intentional signal for links, list markers, series indices, inline code, focus, and important metrics.

## 2. Colors

The neutrals are true greyscale at chroma `0`, so terracotta is the only hue in the interface. All components consume semantic variables so light and dark modes switch together.

### Light Theme
- **Surface** (`oklch(0.985 0 0)`): reading background.
- **Foreground** (`oklch(0.33 0 0)`): body text.
- **Strong Foreground** (`oklch(0.19 0 0)`): headings and key navigation.
- **Muted** (`oklch(0.47 0 0)`): metadata and secondary context.
- **Divider** (`oklch(0.87 0 0)`): list and layout rules.
- **TOC Track** (`oklch(0.62 0 0)`): the floating rail's readable inactive state.

### Dark Theme
- **Surface** (`oklch(0.17 0 0)`): near-black reading background.
- **Foreground** (`oklch(0.84 0 0)`): body text.
- **Strong Foreground** (`oklch(0.96 0 0)`): headings and key navigation.
- **Muted** (`oklch(0.68 0 0)`): metadata and secondary context.
- **Divider** (`oklch(0.33 0 0)`): quiet structural separation.
- **TOC Track** (`oklch(0.53 0 0)`): the floating rail's readable inactive state.

**The Neutral Rule.** Neutrals stay at chroma `0`. Lightness values are unchanged from the previous warm palette, so contrast ratios are preserved exactly; only hue was removed.

### Accent
- **Terracotta** (`oklch(0.51 0.13 32)` light; `oklch(0.72 0.13 32)` dark): links, list markers, series numbers, inline-code surfaces, focus rings, and selected evidence. Soft surfaces use `oklch(0.94 0.028 32)` light and `oklch(0.31 0.04 32)` dark. Inline code blends that soft surface with the reading surface so repeated literals stay quieter than links and headings.

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
- **Guide Chapter:** 24px semibold Atkinson Hyperlegible Next at 32px leading with `-0.018em` tracking.
- **Guide Subsection:** 18px semibold Atkinson Hyperlegible Next at 28px leading with `-0.012em` tracking.

**The Reading Rule.** No oversized display type or decorative serif hierarchy. Technical ideas earn emphasis through clarity, sequence, and breathing room.

Build-time presentation gives introductory context and exercises explicit roles with italic body text and 1.6em group margins, without quotation bars or generated quotes. Actual quotations retain italics and semantic markup, but left borders are removed from every article blockquote. Rules immediately before chapter headings are omitted; other thematic breaks remain. Structural labels become authored headings at the appropriate depth, using the existing type scale and preserving wording.

## 4. Elevation

### Article Media

Explicit output and ASCII-diagram fences use Expressive Code's native titles, without restyling its internals. Tables retain their semantic table layout inside a keyboard-focusable scroll region, with restrained rules and preserved column alignment. Standalone images use figures with authored captions in 14px muted text at 1.6 leading. Local PNG dimensions reserve the image's aspect ratio before loading. These treatments preserve the existing reading type scale and italic notes.

The system is flat. Borders divide lists and sections; whitespace establishes priority. There are no decorative shadows, card shells, gradients, or glass effects.

Code is rendered by Expressive Code with the Pierre light and dark syntax themes (`@pierre/theme`, wired in `vite.config.ts`). Fenced blocks include a copy control and respond to the page's `data-theme` value. Inline code is a compact, quiet terracotta-tinted surface with no generated backticks.

## 5. Components

### Navigation
- **Shape:** A single ruled row with site name, writing link, GitHub, resume, and theme toggle.
- **Resume Asset:** Resume links use a content-hashed public URL while downloads preserve the clean `Harikesh_Mishra_Resume.pdf` filename.
- **Theme Control:** Minimum 44px target; persists explicit `light` or `dark` preference in local storage.
- **Focus:** 3px terracotta outline with 3px offset.

### Home

- **Hero:** A mono eyebrow (`Software Engineer, Mumbai`), one positioning line rendered as the semantic `h1`, then the contact row. `IdentityHeader` already renders the name directly above the main column, so the heading describes the work instead of repeating it. Metrics remain on the work rows.
- **Trust Pages:** About, Contact, and Privacy use the same narrow document shell, restrained page-title scale, section labels, plain links, and prose rhythm as Resume. They add no cards, forms, or decorative treatment; credibility comes from specific, consistent information.
- **About:** Follows the hero, before Work, because it explains why the guides exist and should be read before them. Four short paragraphs in Harikesh's own voice, closing on the Hashimoto line.
- **Work:** Each collapsed row shows role and company, dates, one concrete outcome, and the role's stack as quiet mono text. Detail stays behind the existing disclosure. There is no standalone skills list; technologies are always attached to the work that shipped them.
- **Articles:** Shows `authoredPosts` only, newest first. The `react-internals` series is excluded because it is not Harikesh's writing and must never stand in for it on the home page.

### Articles Index
- **Map:** A compact ruled `Browse` navigation follows the introduction and links to every learning path and authored topic with guide counts.
- **Hierarchy:** Guided series remain the primary collection; standalone guides are divided into durable conceptual topics rather than one oversized language category.
- **Taxonomy:** Standalone topic IDs and display metadata live in `src/lib/content.ts`. Their frontmatter `order` values define and validate each recommended reading path. Series posts use their ordered learning-path metadata instead.
- **Restraint:** The full catalog remains in one narrow document. Anchor links, section headings, and tighter rows provide orientation without cards, filter chips, hidden panels, search, or pagination.
- **Motion:** The index hero shares Home's font-aware editorial entrance, revealing the title by rendered line before its description and count. Browse navigation, topic sections, and article rows render immediately and retain stable geometry during scrolling.

### Article List Item
- **Structure:** Series index, title, summary, and reading time in a compact vertically stacked ruled list.
- **Behavior:** On desktop pointer devices, hovering or keyboard-focusing a row dims sibling content to `0.35` and restores the active row over 140ms. The title also changes to terracotta; no cards, translation, or lift effects.

### Article Content
- **Structure:** Back link, title, muted metadata, prose, then collection-aware previous/next links. The links follow series or JavaScript topic reading order.
- **Pager:** Previous stays left and Next stays right in a two-column layout from `sm` upward. The links stack in reading order on narrower screens, and a lone Next link still occupies the right column on wider screens.
- **Anchors:** H2–H4 headings have stable IDs and a 2rem scroll margin. Table-of-contents activation pushes a shareable same-route hash entry, repeated activation replaces it, back/forward re-traverses headings, and returning to the hashless entry restores the captured pre-click scroll position.
- **Desktop Table of Contents:** At `xl` and above, the build-time fixed right minimap sits in a 96px aside, with marks beginning 32px from the right edge and expanding inward from the right. It preserves source order and includes up to 34 real H2–H4 anchors, evenly sampling in source order when needed. Major marks follow Rare's 6:34 ratio and scale down proportionally on shorter guides; every other sampled anchor uses the body/short preset. At full density the major marks occupy indices 0, 7, 13, 20, 26, and 33. Minor marks use muted foreground at 40%, and all marks use 1px strokes, 8px gaps, a 40px pointer radius, a connected surface label for hovered or keyboard-focused sections, semantic hash anchors, keyboard focus, Escape behavior, reduced-motion parity, and the retained route-safe lifecycle. A shared 80ms scroll pulse provides the active cue without a persistent read-fill.
- **Mobile Table of Contents:** Below `xl`, a content-measured visual pill stays near 32px tall within the viewport, with a separate invisible 44px trigger target and a 20px clockwise foreground progress ring before the active title. Opening expands that same surface upward and in place into a content-measured `w-max` menu capped by the viewport and `min(64dvh, 520px)`, with a 26px squircle radius. A 98% surface compensates for the no-blur invariant while Rare's 60%-border token remains. A transparent outside-click layer dismisses it without visible dimming. Neutral 30px semantic anchor rows retain safe-area padding, focus trapping, background inerting, native list momentum, Escape, focus return, optional bounded drag dismissal, and reduced-motion parity. Source-like progress, surface, label, and row timing is retained, with the long-list stagger bounded at 0.4s.
- **Reading Progress:** A 2px terracotta top hairline uses CSS scroll-driven animation where supported; it is absent for reduced-motion preferences.
- **Diagrams:** Images from `/diagrams/` keep their original reading size and end with a quiet `Open full diagram` text cue. The native modal makes the hand-drawn sketch the sole focal object on its white teaching surface, set against a dark scrim. Pointer activation fades the scrim over 160ms, then after a 40ms handoff brings the viewport-bounded sheet from 10px below at `0.985` scale through a 240ms transform spring with a fast 160ms opacity handoff. The 160ms close has no bounce. Keyboard and reduced-motion activation are instant. It locks background scrolling, closes through its visible control, Escape, or backdrop, and returns keyboard focus to the invoking diagram.
- **Code:** Expressive Code frames retain their generated theme and copy behavior; local CSS only styles inline code. Programmatic heading navigation uses a three-frame settle loop with instant correction steps. The article tree deliberately avoids `content-visibility`: the corrected retry achieved exact anchors and a sub-700ms throttled task, but failed the unthrottled slow-frame gate.
- **Reading Stability:** The complete article body renders immediately and remains stationary during scrolling. Prose, headings, code, figures, lists, tables, and blockquotes have no reveal metadata, observers, or entrance animation; previous/next links use color-only hover feedback.

### Motion
- **Route and entry:** Navigated route wrappers become visible immediately after the outgoing 90ms exit so the page hero is the sole entrance owner. A pre-paint JavaScript marker hides only unprepared stagger roots, preventing SSR content from flashing before hydration while leaving the content visible when JavaScript is unavailable. Editorial heroes wait for loaded fonts and follow document order: optional eyebrow copy enters from 14px below with opacity and no blur, the headline splits into rendered lines and reveals from `0.4em` below with a 4px one-shot blur on a 320ms visual spring with `0.1` bounce and strong ease-out opacity, then supporting metadata and actions use the same 14px opacity-and-transform follower entrance on a 240ms visual spring with `0.1` bounce and strong ease-out opacity. Lines stagger by 60ms, pause for 180ms, and followers stagger by 50ms. Home and Articles both use this choreography while preserving their existing scale and spacing. The home introduction is the visual headline; Resume, Articles, and article titles remain the anchors on their routes. Same-path hash changes never remount the route boundary. The exiting desktop table of contents becomes inert and `display: none` immediately, then disposes after route commit.
- **Header continuity:** Article navigation transforms one persistent avatar and theme control between fixed identity and breadcrumb geometry over 300ms on the route curve; no layout projection or runtime measurement participates. Non-shared navigation and breadcrumb content crossfade, focus remains on the persistent theme control, and identity-to-identity navigation does not retrigger the header.
- **Signature interaction:** The responsive table of contents receives the motion budget through Rare-style pointer-near dash magnification and an 80ms shared scroll pulse, plus mobile same-surface expansion. The mobile outside-click layer remains transparent; optional bounded drag is secondary to the menu’s content-measured morph. Keyboard, Escape, focus return, and reduced-motion paths stay direct and complete.
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
