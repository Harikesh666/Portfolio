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

A software developer who ships resilient React and backend systems end-to-end, solves production problems fast, and delivers measurable improvements at scale.

## Conversion & proof

- Primary CTA: email Harikesh about a role.
- Secondary CTA: start reading the technical writing.
- The line a visitor remembers after 10 seconds: a software developer who ships resilient systems and solves production problems fast.
- Belief ladder: Harikesh has real production experience; he works across frontend, backend, and data boundaries; he can diagnose hard problems under constraints; he would be a strong hire for an end-to-end engineering role.
- Proof on hand: `Harikesh_Mishra_Resume.pdf`, including production work on a 130K+ record dataset, streaming agentic workflow APIs, guardrailed OpenAI integration for HR and reporting workflows, multi-tenant isolation for five client organizations, eight end-to-end admin pages, automated testing, a 35% SQL performance improvement, and same-day production and security fixes.

## Brand Personality

Rigorous, pragmatic, and candid. The site should reward attention with specific technical detail, honest lessons from production, and calm confidence rather than self-promotion.

## Anti-references

Avoid generic template portfolios, buzzword-heavy copy, and flashy motion showcases. Do not substitute decorative polish for proof, readable technical writing, or clear paths to contact and work samples.

## Design Principles

1. Make proof scannable: lead with concrete outcomes, constraints, and scope.
2. Let technical depth be legible: writing should be structured for both quick evaluation and deep reading.
3. Be direct without being dry: use plain, specific language and show the work behind every claim.
4. Make the best next action obvious: contacting Harikesh and entering the writing should always feel effortless.
5. Treat discoverability as quality: fast rendering, semantic structure, metadata, and structured data are part of the product.
6. Keep the interface quiet: a narrow reading column, direct navigation, and dark mode should remove friction rather than add personality for its own sake.
7. Spend motion deliberately: first loads and article destinations may materialize as one fast shell-level gesture, the Home and Articles heroes share the same editorial entrance and remain their routes' sole entrance owners, home content and complete article bodies stay stationary, desktop article rows may use opacity-only sibling focus, simple portfolio destinations should swap without fading through a blank frame, and the article table of contents may retain richer spatial context and reading progress.

## Article Discovery

The articles index behaves as a small technical library rather than a chronological feed. A compact, text-only overview links directly to one guided learning path and four authored JavaScript topics, each with an honest guide count. Every article remains visible in the document for scanning, search, and crawlability; taxonomy and tighter ruled rows provide orientation without search controls, cards, tabs, or pagination. Article detail pages continue through their current series or JavaScript topic with previous/next links that follow the same index order. On desktop pointer devices, hovering or keyboard-focusing a row dims sibling content to aid scanning without moving the layout.

## Home Composition

The home page states what Harikesh builds, then says in his own words why he builds it, then shows the evidence. About sits directly after the hero because it explains why the writing exists and should be read before the guides it motivates. Work rows carry their own outcomes and stack so proof is visible before any disclosure is opened. The articles preview shows only guides Harikesh wrote, newest first, so publishing surfaces new work automatically.

## Syndication

Articles are syndicated at `/feed.xml`, generated from guide frontmatter alongside the sitemap and advertised with a `rel="alternate"` link on every page.

## Agent Access

The server-rendered homepage uses a semantic H1, complete Person JSON-LD, and enough visible source content to establish identity and technical focus without JavaScript. The canonical homepage negotiates a concise Markdown representation through `Accept: text/markdown`, varies caches on `Accept`, and rejects unsupported representations with `406`. `/llms.txt` states when agents should use the site and how to retrieve, cite, or continue through its content. Unknown routes keep their HTTP 404 status and point both people and agents to the sitemap, article index, homepage, and agent instructions.

The public trust surface includes substantial `/about`, `/contact`, and `/privacy` pages. Contact details use the same name, Mumbai location, email, and phone shown in the resume and structured data. The privacy page documents the site's current no-analytics posture, local theme preference, hosting logs, direct communications, and external links without claiming control over third-party services.

## Accessibility & Inclusion

Use strong text contrast, a calm reading hierarchy with semibold headings and subdued metadata, a restrained terracotta signal over true greyscale surfaces, keyboard-accessible interactions, responsive layouts, explicit light and dark themes, and reduced-motion support. Deliver excellent technical SEO through server rendering, semantic content, accurate metadata, canonical URLs, structured data, and crawlable routes. Article navigation must retain heading anchors, readable code blocks, copy controls, expandable diagrams, and one responsive scrollspy: the desktop floating table of contents at `xl`, and a focus-trapped, safe-area-aware bottom sheet below it. Diagram controls must open in a native modal, lock background scrolling, close with Escape or the visible button, and return focus to their trigger. The 48px mobile trigger stays compact at a 19rem maximum and presents the active title beside a 32px circular current-section progress ring, while sheet rows preserve 44px targets and enough title context to distinguish long headings. Both views use semantic hash links, create browser-history entries without duplicates, restore the pre-section scroll position, and keep reduced-motion navigation instant.
