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
7. Spend motion deliberately: the first, server-rendered page paints in its final state so it reads before JavaScript arrives on a slow connection, article destinations may materialize as one fast shell-level gesture, pages land top to bottom, the Home and Articles heroes share the same editorial entrance and remain their routes' sole entrance owners, Home's sections follow its hero as one short capped cascade, complete article bodies stay stationary, rows and chips scale slightly on press, list rows show a soft hover surface without moving, simple portfolio destinations should swap without fading through a blank frame, and the article table of contents may retain richer spatial context and reading progress.

## Article Discovery

The articles index behaves as a small technical library rather than a chronological feed. A compact, text-only overview links directly to one guided learning path and five authored JavaScript topics, each with an honest guide count. Every article remains visible in the document for scanning, search, and crawlability; taxonomy and hover rows provide orientation without search controls, cards, tabs, or pagination. Article detail pages continue through their current series or JavaScript topic with previous/next links that follow the same recommended reading order. On desktop pointer devices, hovering a row shows a soft surface behind it without moving the layout.

## Home Composition

The home page follows the quiet text-first pattern: a name and role header, the availability line with a row of recruiter links under it (Resume, Email, GitHub, LinkedIn), a short first-person introduction with inline contact links, then Work, Writing, and Stack as plain lists at body size. Work rows name the company, role, and dates and link to the Resume for outcomes. Writing shows only guides Harikesh wrote, newest first, so publishing surfaces new work automatically, and the newest one is circled "New" for its first 120 days. Stack is a short ruled list so visitors can see what he works with. The GitHub contribution graph lives on About, and site navigation lives in the footer. On phones the header holds only the name and the theme toggle; a bottom dock (Search and a menu of pages) is the navigation, stepping aside while the reader scrolls down, and on articles the table-of-contents sheet carries the same page links.

## Syndication

Articles are syndicated at `/feed.xml`, generated from guide frontmatter alongside the sitemap and advertised with a `rel="alternate"` link on every page.

## Agent Access

The server-rendered homepage uses a semantic H1, complete Person JSON-LD, and enough visible source content to establish identity and technical focus without JavaScript. The canonical homepage negotiates a concise Markdown representation through `Accept: text/markdown`, varies caches on `Accept`, and rejects unsupported representations with `406`. `/llms.txt` states when agents should use the site and how to retrieve, cite, or continue through its content. Unknown routes keep their HTTP 404 status and point both people and agents to the sitemap, article index, homepage, and agent instructions. For people, the 404 page also suggests the closest real page or article when the path looks like a typo, and says nothing when no page is close.

The public trust surface includes substantial `/about`, `/contact`, and `/privacy` pages. Contact details use the same name, Mumbai location, email, and phone shown in the resume and structured data. The privacy page documents the site's current no-analytics posture, local theme preference, hosting logs, direct communications, and external links without claiming control over third-party services.

## Accessibility & Inclusion

Use strong text contrast, a calm reading hierarchy with semibold headings and subdued metadata, and true greyscale surfaces, with terracotta reserved for focus, selection, and reading progress. Keep interactions keyboard-accessible, layouts responsive, themes explicitly light or dark, and motion reducible. Deliver excellent technical SEO through server rendering, semantic content, accurate metadata, canonical URLs, structured data, and crawlable routes. Article navigation must retain heading anchors, readable code blocks, copy controls, expandable diagrams, and one responsive scrollspy: the desktop hook sidebar at `xl`, adapted from Rare UI's Hook Sidebar, and the same-surface mobile menu below it. On desktop it sits in the right gutter, 2rem from the text column and clear of the header: "On this page", then every `##` section title (13px, Muted, two lines at most, Strong when active). A terracotta dashed rail runs from the top of the list down to the section being read and turns into it with a small rounded hook; while the pointer or keyboard focus rests on another row, a faint dashed rail previews the way there. Both rails travel on Rare's spring (stiffness 420, damping 34, mass 0.7, `tocHookSpring`) and fade in 200ms; reduced motion moves them instantly. A list taller than the window scrolls on its own with edge fades and keeps the active row in view. As the site footer rises into view the list rides up with it and always ends 24px above the footer, the way a sticky column lets go, so the footer garden never draws over its last rows. The mobile text pill is content-measured at roughly 32px, viewport-capped, and paired with a separate invisible 44px target. The same surface expands into a content-measured `w-max` 26px squircle menu capped by the viewport and `min(64dvh, 520px)`. A 98% surface compensates for the no-blur invariant while Rare's 60%-border token remains. Neutral 30px active rows, a transparent outside layer, semantic anchors, focus trap, inert background, Escape handling, safe areas, optional bounded drag dismissal, focus return, hash history, reduced motion, and a 0.4s long-list stagger cap remain part of the interaction.
