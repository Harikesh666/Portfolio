# Product

## Register

brand

## Platform

web

## Users

The primary audience is recruiters assessing Harikesh for software engineering roles. Prospective clients need confidence that he can deliver dependable end-to-end work, while fellow developers come to learn from the writing. They need a quick, credible view of his technical judgment, production experience, and practical depth.

## Product Purpose

This is Harikesh Mishra's responsive personal portfolio and technical writing site. It turns real production work into evidence that he can build, debug, and improve full-stack systems, while giving developers a dependable place to read long-form guides. Success means qualified role enquiries first, followed by sustained readership and relevant client enquiries.

## Positioning

A software engineer who ships resilient React and backend systems end-to-end, solves production problems fast, and delivers measurable improvements at scale.

## Conversion & proof

- Primary CTA: email Harikesh about a role.
- Secondary CTA: start reading the technical writing.
- The line a visitor remembers after 10 seconds: a software engineer who ships resilient systems and solves production problems fast.
- Belief ladder: Harikesh has real production experience; he works across frontend, backend, and data boundaries; he can diagnose hard problems under constraints; he would be a strong hire for an end-to-end engineering role.
- Proof on hand: a content-versioned resume PDF with a stable download name, including production work on a 130K+ record dataset, streaming agentic workflow APIs, guardrailed OpenAI integration for HR and reporting workflows, multi-tenant isolation for five client organizations, eight end-to-end admin pages, automated testing, a 35% SQL performance improvement, and same-day production and security fixes.

## Brand Personality

Rigorous, pragmatic, and candid. The site should reward attention with specific technical detail, honest lessons from production, and calm confidence rather than self-promotion.

## Anti-references

Avoid generic template portfolios, buzzword-heavy copy, and flashy motion showcases. Do not substitute decorative polish for proof, readable technical writing, or clear paths to contact and work samples.

## Design Principles

Article examples distinguish explicitly labeled output and diagrams from source code. Readers can scroll wide tables with a keyboard or touch, read authored figure captions, and expand existing diagrams. These changes preserve the article typography and explanatory content.

Article context and exercises retain italics without quotation bars or generated quotes, and all article blockquotes omit the left border while preserving italics. Chapter headings provide separation without redundant horizontal rules. Explicit structural headings improve navigation without changing the reading typography or explanatory wording.

1. Make proof scannable: lead with concrete outcomes, constraints, and scope.
2. Let technical depth be legible: writing should be structured for both quick evaluation and deep reading.
3. Be direct without being dry: use plain, specific language and show the work behind every claim.
4. Make the best next action obvious: contacting Harikesh and entering the writing should always feel effortless.
5. Treat discoverability as quality: fast rendering, semantic structure, metadata, and structured data are part of the product.
6. Keep the interface quiet: a narrow reading column, direct navigation, and dark mode should remove friction rather than add personality for its own sake.
7. Spend motion deliberately: first loads and article destinations may materialize as one fast shell-level gesture, the Home and Articles heroes share the same editorial entrance and remain their routes' sole entrance owners, home content and complete article bodies stay stationary, desktop article rows may use opacity-only sibling focus, simple portfolio destinations should swap without fading through a blank frame, and the article table of contents may retain richer spatial context and reading progress.

## Article Discovery

The articles index behaves as a small technical library rather than a chronological feed. A compact, text-only overview links directly to one guided learning path and five authored JavaScript topics, each with an honest guide count. Every article remains visible in the document for scanning, search, and crawlability; taxonomy and tighter ruled rows provide orientation without search controls, cards, tabs, or pagination. Article detail pages continue through their current series or JavaScript topic with previous/next links that follow the same recommended reading order. On desktop pointer devices, hovering or keyboard-focusing a row dims sibling content to aid scanning without moving the layout.

## Home Composition

The home page states what Harikesh builds, then says in his own words why he builds it, then shows the evidence. About sits directly after the hero because it explains why the writing exists and should be read before the guides it motivates. Work rows carry their own outcomes and stack so proof is visible before any disclosure is opened. The articles preview shows only guides Harikesh wrote, newest first, so publishing surfaces new work automatically.

## Syndication

Articles are syndicated at `/feed.xml`, generated from guide frontmatter alongside the sitemap and advertised with a `rel="alternate"` link on every page.

## Agent Access

The server-rendered homepage uses a semantic H1, complete Person JSON-LD, and enough visible source content to establish identity and technical focus without JavaScript. The canonical homepage negotiates a concise Markdown representation through `Accept: text/markdown`, varies caches on `Accept`, and rejects unsupported representations with `406`. `/llms.txt` states when agents should use the site and how to retrieve, cite, or continue through its content. Unknown routes keep their HTTP 404 status and point both people and agents to the sitemap, article index, homepage, and agent instructions.

The public trust surface includes substantial `/about`, `/contact`, and `/privacy` pages. Contact details use the same name, Mumbai location, email, and phone shown in the resume and structured data. The privacy page documents the site's current no-analytics posture, local theme preference, hosting logs, direct communications, and external links without claiming control over third-party services.

## Accessibility & Inclusion

Use strong text contrast, a calm reading hierarchy with semibold headings and subdued metadata, and a restrained terracotta signal over true greyscale surfaces. Keep interactions keyboard-accessible, layouts responsive, themes explicitly light or dark, and motion reducible. Deliver excellent technical SEO through server rendering, semantic content, accurate metadata, canonical URLs, structured data, and crawlable routes. Article navigation must retain heading anchors, readable code blocks, copy controls, expandable diagrams, and one responsive scrollspy: the fixed right desktop proximity minimap in a 96px aside at `xl`, adapted from the Rare UI pattern, and the same-surface mobile menu below it. Marks begin 32px from the right and expand inward from the right. The build-time minimap preserves source order and includes up to 34 real H2–H4 anchors, evenly sampling in source order when needed. Major marks follow Rare's 6:34 ratio and scale down proportionally on shorter guides; every other sampled anchor uses the body/short preset. At full density the major marks occupy indices 0, 7, 13, 20, 26, and 33. Minor marks use muted foreground at 40%, and all use 1px strokes, 8px gaps, a 40px pointer radius, a connected surface label for hovered or keyboard-focused sections, and an 80ms shared scroll pulse. The mobile visual pill is content-measured at roughly 32px, viewport-capped, and paired with a separate invisible 44px target. Its 20px progress ring precedes the title, and the same surface expands into a content-measured `w-max` 26px squircle menu capped by the viewport and `min(64dvh, 520px)`. A 98% surface compensates for the no-blur invariant while Rare's 60%-border token remains. Neutral 30px active rows, a transparent outside layer, semantic anchors, focus trap, inert background, Escape handling, safe areas, optional bounded drag dismissal, focus return, hash history, reduced motion, and a 0.4s long-list stagger cap remain part of the interaction.
