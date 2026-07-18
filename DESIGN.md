---
name: Harikesh Mishra Portfolio
description: A quiet, single-column engineer portfolio and technical writing system.
colors:
  surface-light: "oklch(0.98 0.004 95)"
  foreground-light: "oklch(0.37 0.015 95)"
  foreground-strong-light: "oklch(0.22 0.02 95)"
  muted-light: "oklch(0.52 0.014 95)"
  divider-light: "oklch(0.9 0.008 95)"
  surface-dark: "oklch(0.18 0.006 95)"
  foreground-dark: "oklch(0.78 0.01 95)"
  foreground-strong-dark: "oklch(0.93 0.008 95)"
  accent: "oklch(0.61 0.18 35)"
typography:
  display:
    fontFamily: "Atkinson Hyperlegible, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Atkinson Hyperlegible, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
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

The portfolio is a minimal, proof-led introduction to a full-stack developer and a home for deep technical writing. The interface behaves like a dependable reading surface: one narrow column, direct navigation, calm spacing, and evidence before ornament.

It is rigorous, pragmatic, and candid. Recruiters can scan tangible outcomes quickly; fellow engineers can settle into substantial articles without visual noise.

**Key Characteristics:**
- A `42rem` single-column layout across portfolio, writing index, and articles.
- Explicit light and dark themes using the same semantic tokens.
- Atkinson Hyperlegible for all prose and headings, JetBrains Mono for metadata and technical labels.
- Coral acts as one intentional signal for links, series indices, inline code, focus, and important metrics.

## 2. Colors

The palette is warm and low-chroma rather than editorial or decorative. All components consume semantic variables so light and dark modes switch together.

### Light Theme
- **Surface** (`oklch(0.98 0.004 95)`): reading background.
- **Foreground** (`oklch(0.37 0.015 95)`): body text.
- **Strong Foreground** (`oklch(0.22 0.02 95)`): headings and key navigation.
- **Muted** (`oklch(0.52 0.014 95)`): metadata and secondary context.
- **Divider** (`oklch(0.9 0.008 95)`): list and layout rules.

### Dark Theme
- **Surface** (`oklch(0.18 0.006 95)`): warm near-black reading background.
- **Foreground** (`oklch(0.78 0.01 95)`): body text.
- **Strong Foreground** (`oklch(0.93 0.008 95)`): headings and key navigation.
- **Divider** (`oklch(0.3 0.008 95)`): quiet structural separation.

### Accent
- **Coral** (`oklch(0.61 0.18 35)` light; `oklch(0.72 0.17 35)` dark): links, series numbers, inline-code surfaces, focus rings, and selected evidence.

**The Signal Rule.** Coral directs attention; it is never used as ambient decoration or a second palette.

## 3. Typography

**Body and Headings:** Atkinson Hyperlegible, ui-sans-serif, system-ui, sans-serif
**Technical Labels:** JetBrains Mono, ui-monospace, monospace

### Hierarchy
- **Page Title:** 1.75rem on mobile and 2rem from `sm`, bold, normal leading, `-0.02em` tracking.
- **Section Label:** 12px JetBrains Mono, uppercase, `0.08em` tracking, muted.
- **Article Link:** 17px bold sans with coral hover.
- **Body:** 16px Atkinson Hyperlegible at 1.6 line height.
- **Guide Prose:** 17px at 1.75 line height for long-form reading.

**The Reading Rule.** No oversized display type or decorative serif hierarchy. Technical ideas earn emphasis through clarity, sequence, and breathing room.

## 4. Elevation

The system is flat. Borders divide lists and sections; whitespace establishes priority. There are no decorative shadows, card shells, gradients, or glass effects.

Code is rendered by Expressive Code with GitHub light and dark syntax themes. Fenced blocks include a copy control and respond to the page's `data-theme` value. Inline code is a compact coral-tinted surface with no generated backticks.

## 5. Components

### Navigation
- **Shape:** A single ruled row with site name, writing link, GitHub, resume, and theme toggle.
- **Theme Control:** Minimum 44px target; persists explicit `light` or `dark` preference in local storage.
- **Focus:** 3px coral outline with 3px offset.

### Writing List Item
- **Structure:** Series index, title, summary, and reading time in a vertically stacked ruled list.
- **Behavior:** Only the title changes to coral on hover; no cards or lift effects.

### Article Content
- **Structure:** Back link, title, muted metadata, prose, then optional previous/next links.
- **Anchors:** H2–H4 headings have stable IDs and a 2rem scroll margin. Table-of-contents activation pushes a shareable same-route hash entry, repeated activation replaces it, back/forward re-traverses headings, and returning to the hashless entry restores the captured pre-click scroll position.
- **Desktop Table of Contents:** At `xl` and above, a fixed progress rail summarizes eligible H2s as magnified bars. Hover or keyboard focus morphs each bar into the leading marker of a 240px, scrollable label panel; active and hover indicators move between rows without layout shift, and rows remain semantic anchors. The authored in-content table of contents is hidden only at this breakpoint.
- **Mobile Table of Contents:** Below `xl`, a bottom-centered 44px progress pill names the active H2 and opens a portal-based sheet capped at `min(72dvh, 560px)`. The sheet uses a tokenized surface, divider, safe-area padding, focus trap, background inerting, native list momentum, and drag-to-dismiss only when the list is at its top boundary.
- **Reading Progress:** A 2px coral top hairline uses CSS scroll-driven animation where supported; it is absent for reduced-motion preferences.
- **Code:** Expressive Code frames retain their generated theme and copy behavior; local CSS only styles inline code. Programmatic heading navigation uses a three-frame settle loop with instant correction steps. The article tree deliberately avoids `content-visibility`: the corrected retry achieved exact anchors and a sub-700ms throttled task, but failed the unthrottled slow-frame gate.

### Motion
- **Route and entry:** Header, first-viewport blocks, and footer share one root timeline. Viewport-sized blocks materialize with opacity, a 10px rise, and `0.985` scale on an expo-out curve; route wrappers and oversized blocks use opacity only. First load uses a 400ms tween and route changes use 240ms tweens with a 40ms stagger. Routes wait through a 90ms in-place opacity exit with live scroll compensation clipped to one viewport; light routes enter in their mount commit, while article destinations retain the next-frame defer for layout cost. Same-path hash changes never remount the route boundary. The exiting desktop table of contents becomes inert and `display: none` immediately, then disposes after the entrance settles.
- **Header continuity:** Article navigation transforms one persistent avatar and theme control between fixed identity and breadcrumb geometry over 300ms on the route curve; no layout projection or runtime measurement participates. Non-shared navigation and breadcrumb content crossfade, focus remains on the persistent theme control, and identity-to-identity navigation does not retrigger the header.
- **Signature interaction:** The responsive table of contents receives the motion budget through desktop shared-element morphs and mobile physical sheet drag. Both views use active-outward staggering and within-section progress; mobile backdrop opacity is coupled directly to sheet position, while velocity-aware stretch remains desktop-only.
- **Restraint:** Repeated motion is limited to transforms and opacity; `y` and `scale` are reserved for elements no taller than approximately one viewport, while larger trees fade only. Entrances are one-shot, coarse, and never per paragraph. `prefers-reduced-motion: reduce` snaps the header layout, removes entrance transforms, and uses a 150ms route opacity fade.

## 6. Do's and Don'ts

### Do:
- **Do** keep every primary surface within the narrow reading column.
- **Do** use semantic theme tokens and test both explicit `data-theme` values.
- **Do** preserve accessible focus, reduced-motion, and overflow safeguards.
- **Do** publish guides through validated frontmatter rather than a hardcoded registry.
- **Do** let evidence, writing, and code carry the visual weight.

### Don't:
- **Don't** reintroduce a serif display system, oversized clamp-based headings, or magazine layouts.
- **Don't** add a second accent color, gradients, glass, or decorative card grids.
- **Don't** hardcode Markdown post metadata in route components.
- **Don't** override Expressive Code fenced-block styles with legacy `pre` rules.
- **Don't** use motion as decoration; respect reduced-motion preferences.
