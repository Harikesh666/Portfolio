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

**The Neutral Rule.** Neutrals stay at chroma `0`. The contribution graph uses five opacity steps of Strong Foreground rather than a green ramp. The sanctioned exceptions are the availability dot (`--status-open`, a quiet green), the guide-preview task blue (`--scene-task`), the home sketch marks (a warm graphite `--sketch-ink` and a translucent highlighter `--sketch-marker`) and the home intro keywords: three hue tokens (`--keyword-ship` blue, `--keyword-learn` magenta, `--keyword-backend` green), each tuned to at least 5.5:1 contrast in light and 8.6:1 in dark, appearing only while the pointer or focus is inside that paragraph.

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

**Emphasis in guides.** `em` and `i` inside `.guide-content` switch to the system serif italic (`ui-serif, Georgia`) at 1.05em, so emphasis reads as voice rather than volume. No font is downloaded for it.

## 4. Elevation

### Article Media

Explicit output and ASCII-diagram fences use Expressive Code's native titles, without restyling its internals. Tables retain their semantic table layout inside a keyboard-focusable scroll region, with restrained rules and preserved column alignment. Standalone images use figures with authored captions in 14px muted text at 1.6 leading. Local PNG dimensions reserve the image's aspect ratio before loading. These treatments preserve the existing reading type scale and italic notes.

The system is flat. Whitespace establishes priority and hairline borders frame the few surfaces that need edges: the back and download chips, the Stack list, and code frames. There are no shadows, gradients, or glass effects. Expressive Code frames use a 12px radius and `frameBoxShadowCssValue: none` through `styleOverrides` in `vite.config.ts`.

Code is rendered by Expressive Code with the Pierre light and dark syntax themes (`@pierre/theme`, wired in `vite.config.ts`). Fenced blocks include a copy control and respond to the page's `data-theme` value. Inline code is a compact neutral pill with a hairline border and no generated backticks.

## 5. Components

### Navigation
- **Shape:** Identity mode is a 40px avatar beside the name (16px medium, Strong Foreground, 24px leading) over the role (16px medium, Muted, 16px leading), so the avatar matches the two-line block exactly. It sits 96px from the top, with the theme toggle on the right. There is no header nav. Article pages swap to a breadcrumb where the same avatar shrinks to 24px. Geometry constants in `Header.tsx`: identity height 136px, avatar at y 96px; breadcrumb height 76px, avatar at y 26px. The toggle sits at y 94px in the identity row from `sm` and at y 16px everywhere else, as Tailwind `translate` classes with a 300ms `pageEase` transition, so on phones it stays put when an article opens. Switching theme runs a View Transition with the default crossfade turned off: the new theme grows as a circle from the toggle's center until it covers the farthest corner (520ms on `cubic-bezier(0.22, 1, 0.36, 1)`, `themeRevealTiming` in `motion.ts`). Reduced motion, or a browser without View Transitions, switches instantly.
- **Site navigation:** From `sm`, Articles, About and Resume sit in the identity row as 13px Muted links that turn Strong on hover or when active, ending before the theme toggle (no geometry change). Below `sm` the name and links don't fit in one row, so the links and the theme toggle share the empty band above it (inside `pt-24`, no geometry change) as one right-aligned bar with 44px targets. Article pages use the breadcrumb instead. On articles, the phone table-of-contents pill steps aside (fades and drops 0.75rem, inert and hidden from assistive tech) while the site footer is on screen and the sheet is closed, and returns when the reader scrolls back up. The footer keeps the full site nav.
- **Resume Asset:** Resume links use a content-hashed public URL while downloads preserve the clean `Harikesh_Mishra_Resume.pdf` filename.
- **Theme Control:** Minimum 44px target; persists explicit `light` or `dark` preference in local storage.
- **Focus:** 3px terracotta outline with 3px offset.

### Home

- **Mumbai pond:** A generative koi pond above the intro (`MumbaiPond`, garden mode of `src/components/pond/`), 2:1 on phones and 11:4 from `sm`. On phones it runs edge to edge like a photo in a feed, square-cornered with only its top and bottom feathered; from `sm` it sits on the text column with rounded corners and all four edges feathered. Its light follows the current hour in Mumbai (`pond-daylight.ts`, unit-tested): teal by day, rose at dawn, golden at dusk, and deep blue at night with a moon glow, a wavering reflection and slower koi; the dark theme softens daylight to 66% so it never glares but still reads as day. Night stays a readable blue rather than near-black, so the koi and lily pads remain visible at every hour. A WebGL2 renderer (`pond-gpu.ts`) draws the water, floor and koi. A ripple simulation runs on the GPU: a tap drops a ripple, every tail beat drops a small one so swimming koi leave wakes, and a pointer trailing through the water stirs it. The floor (sand and smooth stones) is refracted through the moving surface and lit by caustics that the ripples bend and focus, with glints on ripple crests and, at night, a moon glow whose reflection breaks into glitter. Koi (kohaku, ogon, sanke, tancho, showa, yamabuki; `pond-fish.ts`) are ribbon meshes that bend with the spine, shaded as rounded bodies with soft-edged markings, faint scales and translucent rayed fins, and cast soft shadows onto the floor. Each spine joint bends at most 0.28 radians, so a koi turning on the spot never folds. Reeds sway at two corners and lily pads drift slowly with the koi passing beneath them (`pond-decor.ts`); night and the dark theme dim everything drawn above the water. Without WebGL2 the older WebGL1 caustics shader (`pond-water.ts`) and the 2D koi take over. Koi gather in a loose ring near a mouse or pen, and a tap drops food they swim to. The caption says so and ends with the live Mumbai time. `?pond-hour=18.5` previews another hour. The event-loop version of the same engine lives in the event-loop guide as an island.
- **Availability line (Home, Resume):** `AvailabilityStatus` reads "Open to Node.js backend and cloud roles · Mumbai 2:14 pm IST" in 13px Muted with the role in Strong. The string lives in `site.availability`. A 7px `--status-open` dot carries one soft ring that swells to 2.8× and fades every 2.4s on `--ease-out`; reduced motion keeps the dot and drops the ring. On Home it sits above the `h1` and enters first; on Resume it sits under the name.
- **Hover previews (`HoverPeek`):** A small card that follows a mouse cursor 16px right and 20px below, flipping sides near the viewport edge, or sits under its trigger on keyboard focus. Touch never opens it. It is portalled to `body` so transformed entrance ancestors cannot offset its fixed position, and it is `aria-hidden` because it only previews. It enters 60ms after the pointer arrives, from 96% scale at its top-left corner (160ms opacity, 200ms transform on `--ease-out`), and exits in 110ms ease-in. Text-only previews were tried on Home and removed.
- **Event-loop figures (in the guides):** `EventLoopFigure` is an island that takes one prop, `example`, naming an entry in `src/components/event-loop/examples.ts`. Each example runs a guide's own code, line for line, through a small deterministic simulator (`src/lib/event-loop-sim.ts`, unit tested): one call stack, a microtask queue, a task queue and timers in web APIs, one visible event per tick, following the guides' rule (finish the current job, drain every microtask, then take one task). Time is kept apart from ticks: by default every tick costs one unit, but an example can make ordinary statements free so that only real work and waiting move the clock, and timers count down in that time alongside JavaScript. Two examples exist. `tasks-and-microtasks` sits in the event-loop guide after "Tasks and microtasks are not the same". `blocked-timer` sits in "setTimeout Has Trust Issues" after the blocked-stack example: one unit is one second, the timer finishes at 5s while the loop holds the stack, and its callback starts at 10s, as the guide says. The style was studied from about twenty PlanetScale embeds. Layout: the diagram across the full width, a caption, then the source beside the console and a "what held the stack" trace, then the controls and a figcaption, in one hairline-divided frame. The source highlights the line being executed in the job's colour and tints the lines of whichever callback is running. The console prints each log in its job's colour with a muted stamp (seconds for timer examples, otherwise the tick) and scrolls to the newest line. The trace draws one lane each for script, microtask and task, with a dashed line at every switch. Controls are monospace: Play/Pause (primary), ‹ Back, Step ›, Restart ↺, a 0.5× / 1× / 2× segmented speed control, and colour-coded "+ setTimeout" and "+ microtask" buttons that add work (and play). Keyboard: ← and → step, Space plays or pauses (a legend shows on fine pointers). Back walks through up to 400 earlier states, including added work. The figure waits behind a start button with the diagram dimmed to 55%, pauses when it scrolls out of view, ticks every 1.3s at 1× (`eventLoopBeatMs`), and keeps working under reduced motion with movement removed.
- **Event-loop diagram:** `EventLoopDiagram`, shared by the figures and the hover cards, renders a simulator state as one SVG (320 × 168 viewBox, scaling to its container). Hairline boxes on a faint dot grid, each with a header strip and dashed empty slots, dashed while idle and solid with a 7% tint of the current job's colour in focus; microtasks, task queue and web APIs on the left, the loop node in the middle, the call stack on the right with a readout (TICK 07, or T = 5s for timer examples; hidden on phones). Dashed connectors run from the queues through the loop node to the stack, and from web APIs to the task queue; active ones light up and flow. A pill that changes zone travels its wire on a 720ms ease-in-out JavaScript tween along the real SVG path (queue, through the loop node, into its stack slot; or web APIs down into the task queue), so a timer finishing mid-step travels while the stack keeps working. Other changes ease with CSS (520ms); a pop rises and fades in 300ms ease-in; a waiting timer marches its dashed outline. One colour per kind of job, everywhere: script is Strong, microtasks terracotta (`--accent`), tasks blue (`--scene-task`, a sanctioned exception). Phones step the diagram's text up and compress long names to fit their pill.
- **Guide preview scenes:** Guides listed in `src/components/guide-previews/index.tsx` open a `HoverPeek` card (`.hover-peek--scene`, 24rem, no padding) when their row is hovered on Home or the Articles page. One lazy `LoopPreview` chunk plays the guide's figure example on a loop (one event every 1.1s, `guidePreviewBeatMs`) with the same diagram and captions, restarting on every open; under reduced motion it holds the example's key moment (the microtask running while the timer's task waits, or the callback waiting while the loop holds the stack). The event-loop guide and "setTimeout Has Trust Issues" have one.
- **Row lists:** Lists marked `dim-siblings` (Home Work and Writing, the Articles browse map and every article list) fade the other rows to 45% while one `hover-row` is hovered (150ms on `--ease-out`). Fine pointers only.
- **Arrows:** Link arrows (`.nudge-arrow` with `data-direction`) step toward where they point on hover, 160ms on `--ease-out`: ↗ moves 2px up and right (footer GitHub and LinkedIn, Resume "Open in new tab"), → moves 3px right (Home "All guides"), and the article back arrow moves 3px left. Fine pointers only, never under reduced motion.
- **Command palette:** "/" or Ctrl/⌘ K opens it anywhere outside a text field. A magnifier button in the header (in the phone top bar, before the theme toggle) and a "Search" button in the footer open it too. A native `<dialog>` supplies the focus trap, inert page, Escape and focus return, and the page scroll locks while it is open. With no query it lists Pages, Actions (switch theme, send or copy the email, download the resume PDF) and the five latest guides; typing searches every guide, matching every word anywhere in a title, hint or keywords, with titles that start with the query ranked first (`filterCommands` in `src/lib/command-palette.ts`, unit tested). Rows are one line: a 16px Muted icon, the title in Strong, and a Muted hint pushed right that truncates first. Guides show their title only; the description is used for matching. The list never shows a scrollbar: a scroll-driven mask fades whichever edge has more rows beyond it (none at rest), with no fade in browsers without scroll timelines. A legend (↑↓ move, ↵ open, esc close) closes the panel on fine pointers. Touch gets 44px rows, a Cancel button and no legend. Desktop: 34rem wide, 14vh from the top, at most 28rem tall. Phones: 12px from every edge, sized to the visual viewport (tracked while open), so the list ends above the keyboard. It opens from 8px lower at 98% scale (160ms opacity, 200ms transform on `--ease-out`) over a 28% black backdrop and closes in 120ms ease-in; reduced motion fades only. "Switch theme" closes the palette first, then asks the header toggle to switch so the circle reveal still runs.
- **Native controls:** `:root` declares `color-scheme: light` and the dark theme `color-scheme: dark`, so page scrollbars and form controls follow the site theme.
- **Hero:** One positioning line as the semantic `h1`, then a Muted paragraph that links to the guides, then "Want to work together?" with inline Email, GitHub, and LinkedIn links. No chips or buttons. In the second paragraph, "shipping software", "learning things" and "backend" are `IntroKeyword`s: Strong Foreground at rest with a faint Phosphor icon (rocket, book, drive). While a fine pointer hovers the paragraph or focus is inside it, each warms to its hue left to right (220ms color, 45ms stagger) and its icon lifts and tilts slightly (260ms on `--ease-out`). Reduced motion keeps the colour change and drops the lift. Touch screens keep the resting state. Two `SketchMark`s point a hiring reader at what matters: a graphite double pencil underline under "deadlines and no roadmap" in the second paragraph, and a soft highlighter swipe behind "work together" in the contact line. They are fixed SVG strokes stretched to the words with constant line weight, revealed once, left to right, by a clip-path wipe the first time the paragraph is comfortably on screen (560ms and 680ms on `cubic-bezier(0.65, 0, 0.35, 1)`, the second 420ms after the first). Before the wipe the clip has zero width, so no part of a stroke shows early. They never redraw or animate on hover, and appear without motion under reduced motion. Their colours are `--sketch-ink` and `--sketch-marker`, set for each theme (the highlighter is 75% opaque in light and 50% in dark, strong enough to read as a swipe). Words under the highlighter switch to Strong Foreground so they keep contrast on it.
- **Writing:** The six newest authored guides as hover rows (title over description), then an "All N guides" row.
- **Work:** One hover row per role: company and dates on the first line, role below. Rows link to the Resume, which holds outcomes and project detail.
- **GitHub activity (About page):** A 53-week contribution grid (26 weeks below `sm`) from `virtual:github-contributions`, which fetches `github.com/users/<name>/contributions` at build time and caches it for 12 hours in `node_modules/.cache`. The section renders nothing when no data is available.
- **Stack:** Ruled rows: the group name in 14px Muted on the left (above on phones), rounded icon chips on the right. Icons are Muted at rest and take their brand colour, left to right, while a fine pointer hovers the row; touch screens show the brand colours at rest. Express, which has no brand colour, uses Strong Foreground.
- **Footer:** An "Elsewhere" heading, one line of copy, Email · GitHub · LinkedIn · Contact links (the external two carry a nudging ↗; the RSS feed stays discoverable through the page head), then the site nav with a "Search" button for the command palette, local time ("Mumbai 8:45 pm IST") and copyright above a hairline. `LocalTime` reads the clock through `useSyncExternalStore` with a null server snapshot, so prerendered HTML carries no time and hydration always matches. It updates on minute boundaries inside a reserved 11ch slot, so the footer never shifts. A full-bleed strip of fallen pink petals on moss closes the page (`FooterGarden`, 4.675rem on phones and 6.8rem from `sm`; the photo tile scales with the strip, 1.3 strip heights up to 170px, so petals keep their proportion). The photo (`public/footer/petals.webp`, 1600×520, generated for the site) is drawn by a WebGL2 shader, tiled with mirroring so it has no seam, and slightly desaturated. It keeps the photo's own colours at every hour, so the petals stay pink; the dark theme dims it to 86% and night takes off up to another 10%. Its top edge is a ragged skyline cut from the photo itself: bright leaves and petals stand taller than the dark gaps, clumps rise and dip, and a few stray specks scatter above, so it needs no CSS fade. The first time it scrolls into view that skyline rises into place over 1.6s, easing out. A pointer parts the leaves around it and drops ripples from the pond's simulation (`pond-ripples.ts`); a tap drops a larger one. It loads only within 300px of the viewport, stays a still frame until touched, and runs until it settles, about four seconds after the last touch. Under reduced motion it appears fully grown and never moves, and without WebGL2 it stays hidden.
- **Trust Pages:** About, Contact, and Privacy use the same narrow document shell, restrained page-title scale, section labels, plain links, and prose rhythm as Resume. They add no cards, forms, or decorative treatment; credibility comes from specific, consistent information.
- **Resume:** Aimed at Node backend roles. Under the name and contact line, four proof figures in a 2-column grid (4 from `sm`): the value 20px semibold Strong above a 13px Muted label. Every figure is lifted from a highlight below, never invented. The summary leads with Node.js and TypeScript. Skills list Backend first, Node.js first. Experience uses the About rail (`.journey`): dates as the label, role and company, the role's stack as one Muted line (most relevant first), then projects and highlights. The current role has the filled dot (`.journey__step--current`). Inside highlights, figures (130K+, 190 ms, ~60%) are set in Strong with tabular numerals so a skim lands on the proof. The downloadable PDF is a separate file and must be updated by hand.
- **About:** The home hero carries one paragraph of it with a link to the full About page. The page itself: the intro, then "How I got here" as four milestones on a hairline rail (`.journey`). Each step has a 13px Muted label ("Apr 2025 · Internship, Rabs Net Solutions") with the date in Strong, and a hollow 11px dot on the label line joined to the next dot by a Divider segment. The last step, "Now", has a filled dot (`.journey__step--current`) and no segment. The prose itself is unchanged. Three `SketchMark`s annotate it, the same marks as on Home: the highlighter on "backend work" in the intro, a pencil underline on "start anyway" in the internship step, and the highlighter on "Curiosity". "How I think about the work" sets one Mitchell Hashimoto line as a pull quote (`.pull-quote`: 20px medium Strong with a hanging Muted quote mark, aligned to the rail's text column, caption 13px Muted). Then the GitHub activity graph, and one closing line pointing to the resume. Stack lists and contact links live on Home, Resume and the footer, so About doesn't repeat them.
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
- **Route and entry:** Navigated route wrappers become visible immediately after the outgoing 90ms exit so the page hero is the sole entrance owner. A pre-paint JavaScript marker hides only unprepared stagger roots, preventing SSR content from flashing before hydration while leaving the content visible when JavaScript is unavailable. Editorial heroes wait for loaded fonts and follow document order: optional eyebrow copy enters from 14px below with opacity and no blur, the headline splits into rendered lines (measured with ordinary greedy wrapping, so headlines never use `text-pretty` or `text-balance`), reveals from `0.4em` below with a 4px one-shot blur on a 320ms visual spring with `0.1` bounce and strong ease-out opacity, then supporting metadata and actions use the same 14px opacity-and-transform follower entrance on a 240ms visual spring with `0.1` bounce and strong ease-out opacity. Lines stagger by 60ms, pause for 180ms, and followers stagger by 50ms, with follower delays capped at 600ms (`editorialFollowerMaxDelay`) so long lists never stretch the entrance. Once its line animations finish, the headline returns to plain text, so it reflows on rotation and resize instead of keeping the lines it was measured with. Each delay applies to both opacity and transform; `withDelay` in `StaggerReveal.tsx` passes it into the opacity sub-transition, which would otherwise start at once. On Home the stagger root is the whole `main`: after the hero, each section heading, list row, and the Stack list enter as followers, matching the one-time load cascade on the reference sites. Articles uses the same choreography for its hero only. The home introduction is the visual headline; Resume, Articles, and article titles remain the anchors on their routes. Same-path hash changes never remount the route boundary. The exiting desktop table of contents becomes inert and `display: none` immediately, then disposes after route commit.
- **Header continuity:** Article navigation transforms one persistent avatar (40px to 24px from a top-left origin) and the theme control between identity and breadcrumb geometry over 300ms on the route curve, with no layout projection or runtime measurement. Identity and breadcrumb text crossfade. Focus remains on the theme control, and identity-to-identity navigation does not retrigger the header.
- **Signature interaction:** The responsive table of contents receives the motion budget through Rare-style pointer-near dash magnification and an 80ms shared scroll pulse, plus mobile same-surface expansion. The mobile outside-click layer remains transparent; optional bounded drag is secondary to the menu’s content-measured morph. Keyboard, Escape, focus return, and reduced-motion paths stay direct and complete.
- **Restraint:** Repeated motion is limited to transforms and opacity; scale is reserved for small page-entry blocks and press feedback, the Articles route remains stationary below its hero, and complete article bodies never animate during scroll. Home section headings and rows enter once per visit as followers; every one is shorter than a viewport. Rows and chips confirm presses with `scale(0.985)` and `scale(0.97)` on `:active` over 160ms on `--ease-out` (`cubic-bezier(0.23, 1, 0.32, 1)`), disabled under reduced motion. Hover stays a plain background-color change because it fires many times per visit. The editorial hero's 4px blur is an explicit exception authorized only for headline lines during their one-shot mount entrance; supporting labels, descriptions, metadata, and actions travel 14px with opacity and no blur. The exception does not apply to article prose or route-sized trees. `prefers-reduced-motion: reduce` renders heroes immediately, snaps the header layout, removes entrance transforms, and keeps simple destinations instant. The ponds are the only continuous animations (the footer garden moves only while growing in and for a few seconds after a touch): their shared engine (44KB of lazy chunks, 17KB gzipped: the engine with its GPU renderer, fish and decor, plus the ripple simulation it shares with the footer garden) loads only after the page is idle, it renders only while on screen in a foreground tab, caps resolution (fish 2x, water 1.5x), and has an always-present Pause/Play control. Under reduced motion it starts paused on a settled still frame, clicks fast-forward instead of animating, and Play is an explicit opt-in.

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
