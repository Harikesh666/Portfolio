---
name: Harikesh Mishra Portfolio
description: A proof-led portfolio and technical writing system for a full-stack developer.
colors:
  surface: "oklch(0.985 0.003 247)"
  foreground: "oklch(0.37 0.018 255)"
  foreground-strong: "oklch(0.235 0.022 255)"
  muted: "oklch(0.53 0.016 255)"
  divider: "oklch(0.89 0.008 255)"
  accent: "oklch(0.61 0.18 35)"
  accent-soft: "oklch(0.93 0.035 35)"
typography:
  display:
    fontFamily: "Source Serif 4, Georgia, serif"
    fontSize: "clamp(3.35rem, 8vw, 6rem)"
    fontWeight: 500
    lineHeight: 0.93
    letterSpacing: "-0.038em"
  body:
    fontFamily: "Atkinson Hyperlegible, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  sm: "4px"
  md: "6px"
spacing:
  sm: "12px"
  md: "20px"
  lg: "56px"
components:
  button-primary:
    backgroundColor: "{colors.foreground-strong}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground-strong}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
---

# Design System: Harikesh Mishra Portfolio

## 1. Overview

**Creative North Star: "The Production Notebook"**

This is a developer portfolio that reads like evidence collected from real systems: clear claim, visible constraint, measurable outcome. The interface is structured for recruiters scanning quickly and developers reading deeply. Its personality is rigorous, pragmatic, and candid.

The writing experience carries equal weight with the portfolio. Long-form pieces have generous reading space, stable hierarchy, and strong navigation without theatrical decoration. The system rejects generic template portfolios, buzzword-heavy copy, and flashy motion showcases.

**Key Characteristics:**
- Proof-led landing sections with concrete metrics and short, decisive labels.
- Calm blue-black ink on a neutral paper surface, with coral used only for decisions and emphasis.
- A readable humanist sans paired with a serious text serif for long-form technical work.
- Flat, rule-based structure instead of card grids, gradients, or decorative shadows.

## 2. Colors

The palette is an intentionally quiet technical field note: cool paper, dense ink, and a limited coral signal.

### Primary
- **Decision Coral** (`oklch(0.61 0.18 35)`): CTAs, key metrics, inline emphasis, and focus rings. Use it sparingly; it should make a decision or piece of evidence easier to find.

### Neutral
- **Cool Paper** (`oklch(0.985 0.003 247)`): Main page surface and secondary button background.
- **Operational Ink** (`oklch(0.235 0.022 255)`): Display type, key labels, primary actions, and code container borders.
- **Working Text** (`oklch(0.37 0.018 255)`): Body copy and supporting interface text.
- **Quiet Metadata** (`oklch(0.53 0.016 255)`): Dates, labels, and lower-priority context.
- **Structural Rule** (`oklch(0.89 0.008 255)`): Separators and low-emphasis boundaries.

**The Signal Rule.** Coral is never a background atmosphere. It marks actions, proof, and focused attention; every use should earn its place.

## 3. Typography

**Display Font:** Source Serif 4, Georgia, serif
**Body Font:** Atkinson Hyperlegible, ui-sans-serif, system-ui, sans-serif
**Label/Mono Font:** ui-monospace, Cascadia Code, monospace

**Character:** The serif gives article titles and major claims enough gravity to invite close reading. The accessible sans keeps operational copy direct, legible, and unshowy.

### Hierarchy
- **Display** (500, `clamp(3.35rem, 8vw, 6rem)`, 0.93): Home page promise and writing page titles only.
- **Headline** (500, `clamp(2.2rem, 5vw, 4rem)`, 0.98): Major home page section claims.
- **Title** (500, 1.5–2.35rem, 0.98–1.2): Article links, in-page titles, and content headings.
- **Body** (400, 1rem, 1.6): Primary explanatory copy; long-form content uses `1.0625rem` and 1.75 line height.
- **Label** (700, 0.875rem, normal): Short section labels and proof markers. Avoid making every heading a tracked uppercase eyebrow.

**The Mechanism Rule.** Never use typography to pretend a claim is deep. Give the claim room, then provide the mechanism or metric that proves it.

## 4. Elevation

This is a flat-by-default system. Depth comes from deliberate whitespace, text scale, and one-pixel structural rules; cards and decorative shadows are avoided. Hover states shift text or border color rather than lifting surfaces into space.

**The Evidence Rule.** A border separates related evidence; it never becomes a decorative frame around generic content.

## 5. Components

### Buttons
- **Shape:** Reserved rounding (6px), never pill-shaped.
- **Primary:** Operational Ink background with Cool Paper text and 12px × 20px padding. Hover changes to Decision Coral.
- **Secondary:** Cool Paper with a Structural Rule border. Hover increases border contrast and applies Accent Soft.
- **Focus:** 3px Decision Coral outline with a 3px offset.

### Cards / Containers
- **Corner Style:** Containers do not rely on rounded card shells.
- **Background:** Main content stays on Cool Paper.
- **Shadow Strategy:** No decorative shadows.
- **Border:** One-pixel Structural Rule dividers organize evidence and reading lists.
- **Internal Padding:** 20px for actions, 56px or more between major sections.

### Navigation
- **Style:** A compact identity block on the left and direct text links on the right, separated from content by a single rule.
- **State:** Active route uses Operational Ink; contact remains visibly underlined with Decision Coral.
- **Mobile:** Links wrap without collapsing into a hidden navigation control.

### Signature Component: Evidence Row
- **Style:** A named project or system, a concise explanation, and a coral metric line in a ruled list.
- **Purpose:** Makes production impact scannable without inventing glossy case-study cards.

## 6. Do's and Don'ts

### Do:
- **Do** lead portfolio claims with a specific outcome, constraint, or production lesson.
- **Do** use `text-balance` for display headings and keep display tracking at `-0.038em` or looser.
- **Do** reserve Decision Coral for interactive decisions, proof lines, and focus treatment.
- **Do** keep technical writing comfortable to read with a controlled line length and generous line height.
- **Do** keep metadata quieter than the title, but readable enough to meet contrast requirements.

### Don't:
- **Don't** use generic template portfolio sections, invented client work, or buzzword-heavy self-description.
- **Don't** add gradient text, ambient gradients, glassmorphism, or a hero-metric template.
- **Don't** make a flashy motion showcase; all motion must be brief, purposeful, and disabled for reduced-motion preferences.
- **Don't** use colored side-stripe card borders, repeated tiny uppercase eyebrows, or identical icon-card grids.
- **Don't** pair soft wide shadows with one-pixel card borders or use oversized rounded containers.
