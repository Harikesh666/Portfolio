---
name: Harikesh Mishra Portfolio
description: A quiet, single-column engineer portfolio and technical writing system.
colors:
  surface-light: "oklch(0.994 0 0)"
  foreground-light: "oklch(0.42 0 0)"
  foreground-strong-light: "oklch(0.205 0 0)"
  muted-light: "oklch(0.53 0 0)"
  divider-light: "oklch(0.92 0 0)"
  hover-light: "oklch(0.965 0 0)"
  surface-dark: "oklch(0.145 0 0)"
  foreground-dark: "oklch(0.78 0 0)"
  foreground-strong-dark: "oklch(0.97 0 0)"
  hover-dark: "oklch(0.205 0 0)"
  accent: "oklch(0.51 0.13 32)"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
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

The portfolio is a minimal, proof-led introduction to a software engineer and a home for deep technical writing. The interface behaves like a dependable reading surface: one narrow column, direct navigation, generous spacing, and evidence before ornament.

Home follows the text-first school of Emil Kowalski's and Prasanjit Dey's sites: everything at body size, hierarchy from weight and color, 128px between sections, and rows that show a soft surface on hover. The one richer element, the GitHub contribution graph, lives on About.

It is rigorous, pragmatic, and candid. Recruiters can scan tangible outcomes quickly; fellow engineers can settle into substantial articles without visual noise.

**Key Characteristics:**
- A `42rem` single-column layout across portfolio, articles index, and article pages.
- Explicit light and dark themes using the same semantic tokens.
- Inter for all interface text, prose, and headings; JetBrains Mono only for code.
- Phosphor provides the single interface-icon language across navigation, downloads, disclosures, and article controls.
- Terracotta is reduced to focus rings, selection, and the reading-progress line. Links, markers, and inline code are neutral.

## 2. Colors

The neutrals are true greyscale at chroma `0`, so terracotta is the only hue and it appears only on interaction state. All components consume semantic variables so light and dark modes switch together.

### Light Theme
- **Surface** (`oklch(0.994 0 0)`): reading background.
- **Foreground** (`oklch(0.42 0 0)`): body text and prose.
- **Strong Foreground** (`oklch(0.205 0 0)`): titles, headings, and key navigation.
- **Muted** (`oklch(0.53 0 0)`): descriptions, metadata, and secondary context.
- **Divider** (`oklch(0.92 0 0)`): hairline borders and the rare rule.
- **Hover** (`oklch(0.965 0 0)`): hover-row, chip, and inline-code surface.
- **TOC Track** (`oklch(0.62 0 0)`): the floating rail's readable inactive state.

### Dark Theme
- **Surface** (`oklch(0.145 0 0)`): near-black reading background.
- **Foreground** (`oklch(0.78 0 0)`): body text and prose.
- **Strong Foreground** (`oklch(0.97 0 0)`): titles, headings, and key navigation.
- **Muted** (`oklch(0.63 0 0)`): descriptions, metadata, and secondary context.
- **Divider** (`oklch(0.27 0 0)`): quiet structural separation.
- **Hover** (`oklch(0.205 0 0)`): hover-row, chip, and inline-code surface.
- **TOC Track** (`oklch(0.53 0 0)`): the floating rail's readable inactive state.

**The Neutral Rule.** Neutrals stay at chroma `0`. The contribution graph uses five opacity steps of Strong Foreground rather than a green ramp. The one sanctioned exception is the home intro keywords: three hue tokens (`--keyword-ship` blue, `--keyword-learn` magenta, `--keyword-backend` green), each tuned to at least 5.5:1 contrast in light and 8.6:1 in dark, appearing only while the pointer or focus is inside that paragraph.

### Accent
- **Terracotta** (`oklch(0.51 0.13 32)` light; `oklch(0.72 0.13 32)` dark): focus rings, text selection, and the reading-progress line.

**The Signal Rule.** Terracotta marks interaction state only. Links use a 30% Strong Foreground underline that darkens on hover; list markers are muted; inline code is a neutral bordered pill.

## 3. Typography

**Body and Headings:** Inter (optical sizing, 400–600, true italics), ui-sans-serif, system-ui, sans-serif
**Code:** JetBrains Mono, ui-monospace, monospace

### Hierarchy
- **Page Title:** 22px semibold, `-0.02em` tracking (Articles, About, Resume, Contact, Privacy). Article titles are 20px semibold with `-0.015em` tracking.
- **Home Intro:** 16px regular. The `h1` line is Strong Foreground; the paragraphs after it are Muted with Strong Foreground underlined links.
- **Section Heading:** 16px medium Strong Foreground, sentence case (`SectionHeading`). No uppercase mono labels.
- **Row Title:** 16px regular Strong Foreground; the description below is 16px regular Muted.
- **Metadata:** 13px Muted with tabular numerals.
- **Body:** 16px Inter at 1.65 line height, `-0.006em` tracking.
- **Guide Prose:** 16px Inter at 1.75 line height (28px). Top-level paragraphs are separated by one line (28px), following Emil Kowalski's rhythm.
- **Guide Chapter:** 18px semibold with `-0.014em` tracking, 56px above and 20px below.
- **Guide Subsection:** 16px semibold with `-0.01em` tracking, 36px above and 12px below.

**The Reading Rule.** Everything stays near body size. Hierarchy comes from weight, color, and generous spacing (64px between home sections, 128px from `sm`), not from display type.

Build-time presentation gives introductory context and exercises explicit roles with italic body text and 1.6em group margins, without quotation bars or generated quotes. Actual quotations retain italics and semantic markup, but left borders are removed from every article blockquote. Rules immediately before chapter headings are omitted; other thematic breaks remain. Structural labels become authored headings at the appropriate depth, using the existing type scale and preserving wording.

## 4. Elevation

### Article Media

Explicit output and ASCII-diagram fences use Expressive Code's native titles, without restyling its internals. Tables retain their semantic table layout inside a keyboard-focusable scroll region, with restrained rules and preserved column alignment. Standalone images use figures with authored captions in 14px muted text at 1.6 leading. Local PNG dimensions reserve the image's aspect ratio before loading. These treatments preserve the existing reading type scale and italic notes.

The system is flat. Whitespace establishes priority and hairline borders frame the few surfaces that need edges: the back and download chips, the Stack list, and code frames. There are no shadows, gradients, or glass effects. Expressive Code frames use a 12px radius and `frameBoxShadowCssValue: none` through `styleOverrides` in `vite.config.ts`.

Code is rendered by Expressive Code with the Pierre light and dark syntax themes (`@pierre/theme`, wired in `vite.config.ts`). Fenced blocks include a copy control and respond to the page's `data-theme` value. Inline code is a compact neutral pill with a hairline border and no generated backticks.

## 5. Components

### Navigation
- **Shape:** Identity mode is a 40px avatar beside the name (16px medium, Strong Foreground, 24px leading) over the role (16px medium, Muted, 16px leading), so the avatar matches the two-line block exactly. It sits 96px from the top, with the theme toggle on the right. There is no header nav. Article pages swap to a breadcrumb where the same avatar shrinks to 24px. Geometry constants in `Header.tsx`: identity height 136px, avatar at y 96px, toggle at y 94px; breadcrumb height 76px, avatar at y 26px, toggle at y 16px.
- **Site navigation:** Lives in the footer (Home, Articles, About, Resume, Contact, Privacy). The name links home and the article breadcrumb links to Articles.
- **Resume Asset:** Resume links use a content-hashed public URL while downloads preserve the clean `Harikesh_Mishra_Resume.pdf` filename.
- **Theme Control:** Minimum 44px target; persists explicit `light` or `dark` preference in local storage.
- **Focus:** 3px terracotta outline with 3px offset.

### Home

- **Event-loop pond:** A generative pond above the intro (`src/components/pond/`), 2:1 on phones and 11:4 from `sm`, with feathered edges and a centered 13px caption. It acts out the event loop: koi are tasks that wander in "web APIs" until their timer fires, line up nose to tail in the task queue, and lap the call stack one at a time; small pale microtask fish spawned by a running task always go before the next task (`EventLoopModel`, unit-tested). Clicking queues a new timer with a ripple. Water is a WebGL shader of drifting cell edges (caustics) with grain; fish are 2D canvas spines that bend as they follow their heads. Light water is muted teal so white koi read; dark water is deep teal with softer light. A CSS gradient stands in until WebGL draws, so nothing shifts.
- **Hero:** One positioning line as the semantic `h1`, then a Muted paragraph that links to the guides, then "Want to work together?" with inline Email, GitHub, and LinkedIn links. No chips or buttons. In the second paragraph, "shipping software", "learning things" and "backend" are `IntroKeyword`s: Strong Foreground at rest with a faint Phosphor icon (rocket, book, drive). While a fine pointer hovers the paragraph or focus is inside it, each warms to its hue left to right (220ms color, 45ms stagger) and its icon lifts and tilts slightly (260ms on `--ease-out`). Reduced motion keeps the colour change and drops the lift. Touch screens keep the resting state.
- **Writing:** The six newest authored guides as hover rows (title over description), then an "All N guides" row.
- **Work:** One hover row per role: company and dates on the first line, role below. Rows link to the Resume, which holds outcomes and project detail.
- **GitHub activity (About page):** A 53-week contribution grid (26 weeks below `sm`) from `virtual:github-contributions`, which fetches `github.com/users/<name>/contributions` at build time and caches it for 12 hours in `node_modules/.cache`. The section renders nothing when no data is available.
- **Stack:** A ruled definition list in Prasanjit's craft-row style: group name on the left in Strong Foreground, comma-separated technologies on the right in Muted.
- **Footer:** An "Elsewhere" heading, one line of copy, Email · GitHub · LinkedIn · RSS links, then the site nav, local time ("Mumbai 8:45 pm IST") and copyright above a hairline. `LocalTime` reads the clock through `useSyncExternalStore` with a null server snapshot, so prerendered HTML carries no time and hydration always matches. It updates on minute boundaries inside a reserved 11ch slot, so the footer never shifts.
- **Trust Pages:** About, Contact, and Privacy use the same narrow document shell, restrained page-title scale, section labels, plain links, and prose rhythm as Resume. They add no cards, forms, or decorative treatment; credibility comes from specific, consistent information.
- **About:** The home hero carries one paragraph of it with a link to the full About page.
- **Articles:** Home shows `authoredPosts` only. The `react-internals` series is excluded because it is not Harikesh's writing and must never stand in for it on the home page.

### Articles Index
- **Map:** A `Browse` list of hover rows follows the introduction and links to every learning path and authored topic with guide counts.
- **Hierarchy:** Guided series remain the primary collection; standalone guides are divided into durable conceptual topics rather than one oversized language category.
- **Taxonomy:** Standalone topic IDs and display metadata live in `src/lib/content.ts`. Their frontmatter `order` values define and validate each recommended reading path. Series posts use their ordered learning-path metadata instead.
- **Restraint:** The full catalog remains in one narrow document. Anchor links, section headings, and hover rows provide orientation without cards, filter chips, hidden panels, search, or pagination.
- **Motion:** The index hero shares Home's font-aware editorial entrance, revealing the title by rendered line before its description and count. Browse navigation, topic sections, and article rows render immediately and retain stable geometry during scrolling.

### Article List Item
- **Structure:** A muted two-digit index column, then title, description, and date or reading time. No rules between rows.
- **Behavior:** On desktop pointer devices, hovering shows a 6px-radius Hover surface behind the whole row (`.hover-row`: 12px by 16px padding with a matching negative inline margin, 150ms background-color). Nothing translates or dims.

### Article Content
- **Structure:** An "Articles" back chip, title, muted metadata, prose, then collection-aware previous/next links. The links follow series or JavaScript topic reading order.
- **Pager:** Hover rows with a muted "Previous" or "Next" label above the title. Previous stays left and Next stays right in a two-column layout from `sm` upward. The links stack in reading order on narrower screens, and a lone Next link still occupies the right column on wider screens.
- **Anchors:** H2–H4 headings have stable IDs and a 2rem scroll margin. `headingIds` also appends an empty `a.heading-anchor` (`aria-hidden`, `tabindex=-1`) that CSS stretches over the heading, so clicking anywhere on a heading links to it. On wide fine-pointer screens a link icon fades into the left gutter on hover. Clicks route through the same navigation as the table of contents; keyboard and screen-reader users keep the table of contents as the semantic route, and heading names stay clean. Table-of-contents activation pushes a shareable same-route hash entry, repeated activation replaces it, back/forward re-traverses headings, and returning to the hashless entry restores the captured pre-click scroll position.
- **Desktop Table of Contents:** At `xl` and above, the build-time fixed right minimap sits in a 96px aside, with marks beginning 32px from the right edge and expanding inward from the right. It preserves source order and includes up to 34 real H2–H4 anchors, evenly sampling in source order when needed. Major marks follow Rare's 6:34 ratio and scale down proportionally on shorter guides; every other sampled anchor uses the body/short preset. At full density the major marks occupy indices 0, 7, 13, 20, 26, and 33. Minor marks use muted foreground at 40%, and all marks use 1px strokes, 8px gaps, a 40px pointer radius, a connected surface label for hovered or keyboard-focused sections, semantic hash anchors, keyboard focus, Escape behavior, reduced-motion parity, and the retained route-safe lifecycle. A shared 80ms scroll pulse provides the active cue without a persistent read-fill.
- **Mobile Table of Contents:** Below `xl`, a content-measured text pill stays near 32px tall within the viewport, with a separate invisible 44px trigger target. Opening expands that same surface upward and in place into a content-measured `w-max` menu capped by the viewport and `min(64dvh, 520px)`, with a 26px squircle radius. A 98% surface compensates for the no-blur invariant while Rare's 60%-border token remains. A transparent outside-click layer dismisses it without visible dimming. Neutral 30px semantic anchor rows retain safe-area padding, focus trapping, background inerting, native list momentum, Escape, focus return, optional bounded drag dismissal, and reduced-motion parity. Source-like surface, label, and row timing is retained, with the long-list stagger bounded at 0.4s.
- **Reading Progress:** A 2px terracotta top hairline uses CSS scroll-driven animation where supported; it is absent for reduced-motion preferences.
- **Diagrams:** Images from `/diagrams/` keep their original reading size and end with a quiet `Open full diagram` text cue. The native modal makes the hand-drawn sketch the sole focal object on its white teaching surface, set against a dark scrim. Pointer activation fades the scrim over 160ms, then after a 40ms handoff brings the viewport-bounded sheet from 10px below at `0.985` scale through a 240ms transform spring with a fast 160ms opacity handoff. The 160ms close has no bounce. Keyboard and reduced-motion activation are instant. It locks background scrolling, closes through its visible control, Escape, or backdrop, and returns keyboard focus to the invoking diagram.
- **Islands:** Interactive demos sit in the prose as a rounded-xl bordered card on the surface color with 16px padding, followed by a centered 14px muted caption that tells the reader what to do ("Press Run to watch the order."). They render on the server, so the card is in place before JavaScript loads, and each hydrates independently. Demo buttons use `.chip-link`. Article figures load lazily with reserved dimensions.
- **Code:** Expressive Code frames retain their generated theme and copy behavior; local CSS only styles inline code. Programmatic heading navigation uses a three-frame settle loop with instant correction steps. The article tree deliberately avoids `content-visibility`: the corrected retry achieved exact anchors and a sub-700ms throttled task, but failed the unthrottled slow-frame gate.
- **Reading Stability:** The complete article body renders immediately and remains stationary during scrolling. Prose, headings, code, figures, lists, tables, and blockquotes have no reveal metadata, observers, or entrance animation; previous/next links use color-only hover feedback.

### Motion
- **Route and entry:** Navigated route wrappers become visible immediately after the outgoing 90ms exit so the page hero is the sole entrance owner. A pre-paint JavaScript marker hides only unprepared stagger roots, preventing SSR content from flashing before hydration while leaving the content visible when JavaScript is unavailable. Editorial heroes wait for loaded fonts and follow document order: optional eyebrow copy enters from 14px below with opacity and no blur, the headline splits into rendered lines and reveals from `0.4em` below with a 4px one-shot blur on a 320ms visual spring with `0.1` bounce and strong ease-out opacity, then supporting metadata and actions use the same 14px opacity-and-transform follower entrance on a 240ms visual spring with `0.1` bounce and strong ease-out opacity. Lines stagger by 60ms, pause for 180ms, and followers stagger by 50ms, with follower delays capped at 600ms (`editorialFollowerMaxDelay`) so long lists never stretch the entrance. Each delay applies to both opacity and transform; `withDelay` in `StaggerReveal.tsx` passes it into the opacity sub-transition, which would otherwise start at once. On Home the stagger root is the whole `main`: after the hero, each section heading, list row, and the Stack list enter as followers, matching the one-time load cascade on the reference sites. Articles uses the same choreography for its hero only. The home introduction is the visual headline; Resume, Articles, and article titles remain the anchors on their routes. Same-path hash changes never remount the route boundary. The exiting desktop table of contents becomes inert and `display: none` immediately, then disposes after route commit.
- **Header continuity:** Article navigation transforms one persistent avatar (40px to 24px from a top-left origin) and the theme control between identity and breadcrumb geometry over 300ms on the route curve, with no layout projection or runtime measurement. Identity and breadcrumb text crossfade. Focus remains on the theme control, and identity-to-identity navigation does not retrigger the header.
- **Signature interaction:** The responsive table of contents receives the motion budget through Rare-style pointer-near dash magnification and an 80ms shared scroll pulse, plus mobile same-surface expansion. The mobile outside-click layer remains transparent; optional bounded drag is secondary to the menu’s content-measured morph. Keyboard, Escape, focus return, and reduced-motion paths stay direct and complete.
- **Restraint:** Repeated motion is limited to transforms and opacity; scale is reserved for small page-entry blocks and press feedback, the Articles route remains stationary below its hero, and complete article bodies never animate during scroll. Home section headings and rows enter once per visit as followers; every one is shorter than a viewport. Rows and chips confirm presses with `scale(0.985)` and `scale(0.97)` on `:active` over 160ms on `--ease-out` (`cubic-bezier(0.23, 1, 0.32, 1)`), disabled under reduced motion. Hover stays a plain background-color change because it fires many times per visit. The editorial hero's 4px blur is an explicit exception authorized only for headline lines during their one-shot mount entrance; supporting labels, descriptions, metadata, and actions travel 14px with opacity and no blur. The exception does not apply to article prose or route-sized trees. `prefers-reduced-motion: reduce` renders heroes immediately, snaps the header layout, removes entrance transforms, and keeps simple destinations instant. The event-loop pond is the one continuous animation: its 11.5KB engine loads only after the page is idle, it renders only while on screen in a foreground tab, caps resolution (fish 2x, water 1.5x), and has an always-present Pause/Play control. Under reduced motion it starts paused on a settled still frame, clicks fast-forward instead of animating, and Play is an explicit opt-in.

## 6. Do's and Don'ts

### Do:
- **Do** keep every primary surface within the narrow reading column.
- **Do** use semantic theme tokens and test both explicit `data-theme` values.
- **Do** preserve accessible focus, reduced-motion, and overflow safeguards.
- **Do** publish guides through validated series or topic frontmatter rather than route-level title inference.
- **Do** let evidence, writing, and code carry the visual weight.
- **Do** use `SectionHeading`, `.hover-row`, `.chip-link`, and `.text-link` instead of one-off label and link styles.

### Don't:
- **Don't** reintroduce a serif display system, oversized clamp-based headings, or magazine layouts.
- **Don't** add a second accent color, gradients, glass, shadows, or image tiles to the home page.
- **Don't** bring back uppercase mono section labels or terracotta link underlines.
- **Don't** hardcode guide metadata in route components.
- **Don't** let React render guide prose; interactive pieces go through the island registry.
- **Don't** override Expressive Code fenced-block styles with legacy `pre` rules.
- **Don't** use motion as decoration; respect reduced-motion preferences.
