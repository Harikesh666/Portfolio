<!-- intent-skills:start -->

# TanStack Intent - before editing files, run the matching guidance command.

tanstackIntent:

- id: "@tanstack/devtools#devtools-app-setup"
  run: "npx @tanstack/intent@latest load @tanstack/devtools#devtools-app-setup"
  for: "Install TanStack Devtools, pick framework adapter (React/Vue/Solid/Preact), register plugins via plugins prop, configure shell (position, hotkeys, theme, hideUntilHover, requireUrlFlag, eventBusConfig). TanStackDevtools component, defaultOpen, localStorage persistence."
- id: "@tanstack/devtools#devtools-marketplace"
  run: "npx @tanstack/intent@latest load @tanstack/devtools#devtools-marketplace"
  for: "Publish plugin to npm and submit to TanStack Devtools Marketplace. PluginMetadata registry format, plugin-registry.ts, pluginImport (importName, type), requires (packageName, minVersion), framework tagging, multi-framework submissions, featured plugins."
- id: "@tanstack/devtools#devtools-plugin-panel"
  run: "npx @tanstack/intent@latest load @tanstack/devtools#devtools-plugin-panel"
  for: "Build devtools panel components that display emitted event data. Listen via EventClient.on(), handle theme (light/dark), use @tanstack/devtools-ui components. Plugin registration (name, render, id, defaultOpen), lifecycle (mount, activate, destroy), max 3 active plugins. Two paths: Solid.js core with devtools-ui for multi-framework support, or framework-specific panels."
- id: "@tanstack/devtools#devtools-production"
  run: "npx @tanstack/intent@latest load @tanstack/devtools#devtools-production"
  for: "Handle devtools in production vs development. removeDevtoolsOnBuild, devDependency vs regular dependency, conditional imports, NoOp plugin variants for tree-shaking, non-Vite production exclusion patterns."
- id: "@tanstack/devtools-event-client#devtools-bidirectional"
  run: "npx @tanstack/intent@latest load @tanstack/devtools-event-client#devtools-bidirectional"
  for: "Two-way event patterns between devtools panel and application. App-to-devtools observation, devtools-to-app commands, time-travel debugging with snapshots and revert. structuredClone for snapshot safety, distinct event suffixes for observation vs commands, serializable payloads only."
- id: "@tanstack/devtools-event-client#devtools-event-client"
  run: "npx @tanstack/intent@latest load @tanstack/devtools-event-client#devtools-event-client"
  for: "Create typed EventClient for a library. Define event maps with typed payloads, pluginId auto-prepend namespacing, emit()/on()/onAll()/onAllPluginEvents() API. Connection lifecycle (5 retries, 300ms), event queuing, enabled/disabled state, SSR fallbacks, singleton pattern. Unique pluginId requirement to avoid event collisions."
- id: "@tanstack/devtools-event-client#devtools-instrumentation"
  run: "npx @tanstack/intent@latest load @tanstack/devtools-event-client#devtools-instrumentation"
  for: "Analyze library codebase for critical architecture and debugging points, add strategic event emissions. Identify middleware boundaries, state transitions, lifecycle hooks. Consolidate events (1 not 15), debounce high-frequency updates, DRY shared payload fields, guard emit() for production. Transparent server/client event bridging."
- id: "@tanstack/devtools-vite#devtools-vite-plugin"
  run: "npx @tanstack/intent@latest load @tanstack/devtools-vite#devtools-vite-plugin"
  for: "Configure @tanstack/devtools-vite for source inspection (data-tsd-source, inspectHotkey, ignore patterns), console piping (client-to-server, server-to-client, levels), enhanced logging, server event bus (port, host, HTTPS), production stripping (removeDevtoolsOnBuild), editor integration (launch-editor, custom editor.open). Must be FIRST plugin in Vite config. Vite ^6 || ^7 only."
- id: "@tanstack/react-start#lifecycle/migrate-from-nextjs"
  run: "npx @tanstack/intent@latest load @tanstack/react-start#lifecycle/migrate-from-nextjs"
  for: "Step-by-step migration from Next.js App Router to TanStack Start: route definition conversion, API mapping, server function conversion from Server Actions, middleware conversion, data fetching pattern changes."
- id: "@tanstack/react-start#react-start"
  run: "npx @tanstack/intent@latest load @tanstack/react-start#react-start"
  for: "React bindings for TanStack Start: createStart, StartClient, StartServer, React-specific imports, re-exports from @tanstack/react-router, full project setup with React, useServerFn hook."
- id: "@tanstack/react-start#react-start/server-components"
  run: "npx @tanstack/intent@latest load @tanstack/react-start#react-start/server-components"
  for: "Implement, review, debug, and refactor TanStack Start React Server Components in React 19 apps. Use when tasks mention @tanstack/react-start/rsc, renderServerComponent, createCompositeComponent, CompositeComponent, renderToReadableStream, createFromReadableStream, createFromFetch, Composite Components, React Flight streams, loader or query owned RSC caching, router.invalidate, structuralSharing: false, selective SSR, stale names like renderRsc or .validator, or migration from Next App Router RSC patterns. Do not use for generic SSR or non-TanStack RSC frameworks except brief comparison."
- id: "@tanstack/router-core#router-core"
  run: "npx @tanstack/intent@latest load @tanstack/router-core#router-core"
  for: "Framework-agnostic core concepts for TanStack Router: route trees, createRouter, createRoute, createRootRoute, createRootRouteWithContext, addChildren, Register type declaration, route matching, route sorting, file naming conventions. Entry point for all router skills."
- id: "@tanstack/router-core#router-core/auth-and-guards"
  run: "npx @tanstack/intent@latest load @tanstack/router-core#router-core/auth-and-guards"
  for: "Route protection with beforeLoad, redirect()/throw redirect(), isRedirect helper, authenticated layout routes (_authenticated), non-redirect auth (inline login), RBAC with roles and permissions, auth provider integration (Auth0, Clerk, Supabase), router context for auth state."
- id: "@tanstack/router-core#router-core/code-splitting"
  run: "npx @tanstack/intent@latest load @tanstack/router-core#router-core/code-splitting"
  for: "Automatic code splitting (autoCodeSplitting), .lazy.tsx convention, createLazyFileRoute, createLazyRoute, lazyRouteComponent, getRouteApi for typed hooks in split files, codeSplitGroupings per-route override, splitBehavior programmatic config, critical vs non-critical properties."
- id: "@tanstack/router-core#router-core/data-loading"
  run: "npx @tanstack/intent@latest load @tanstack/router-core#router-core/data-loading"
  for: "Route loader option, loaderDeps for cache keys, staleTime/gcTime/ defaultPreloadStaleTime SWR caching, pendingComponent/pendingMs/ pendingMinMs, errorComponent/onError/onCatch, beforeLoad, router context and createRootRouteWithContext DI pattern, router.invalidate, Await component, deferred data loading with unawaited promises."
- id: "@tanstack/router-core#router-core/navigation"
  run: "npx @tanstack/intent@latest load @tanstack/router-core#router-core/navigation"
  for: "Link component, useNavigate, Navigate component, router.navigate, ToOptions/NavigateOptions/LinkOptions, from/to relative navigation, activeOptions/activeProps, preloading (intent/viewport/render), preloadDelay, navigation blocking (useBlocker, Block), createLink, linkOptions helper, scroll restoration, MatchRoute."
- id: "@tanstack/router-core#router-core/not-found-and-errors"
  run: "npx @tanstack/intent@latest load @tanstack/router-core#router-core/not-found-and-errors"
  for: "notFound() function, notFoundComponent, defaultNotFoundComponent, notFoundMode (fuzzy/root), errorComponent, CatchBoundary, CatchNotFound, isNotFound, NotFoundRoute (deprecated), route masking (mask option, createRouteMask, unmaskOnReload)."
- id: "@tanstack/router-core#router-core/path-params"
  run: "npx @tanstack/intent@latest load @tanstack/router-core#router-core/path-params"
  for: "Dynamic path segments ($paramName), splat routes ($ / _splat), optional params ({-$paramName}), prefix/suffix patterns ({$param}.ext), useParams, params.parse/stringify, pathParamsAllowedCharacters, i18n locale patterns."
- id: "@tanstack/router-core#router-core/search-params"
  run: "npx @tanstack/intent@latest load @tanstack/router-core#router-core/search-params"
  for: "validateSearch, search param validation with Zod/Valibot/ArkType adapters, fallback(), search middlewares (retainSearchParams, stripSearchParams), custom serialization (parseSearch, stringifySearch), search param inheritance, loaderDeps for cache keys, reading and writing search params."
- id: "@tanstack/router-core#router-core/ssr"
  run: "npx @tanstack/intent@latest load @tanstack/router-core#router-core/ssr"
  for: "Non-streaming and streaming SSR, RouterClient/RouterServer, renderRouterToString/renderRouterToStream, createRequestHandler, defaultRenderHandler/defaultStreamHandler, HeadContent/Scripts components, head route option (meta/links/styles/scripts), ScriptOnce, automatic loader dehydration/hydration, memory history on server, data serialization, document head management."
- id: "@tanstack/router-core#router-core/type-safety"
  run: "npx @tanstack/intent@latest load @tanstack/router-core#router-core/type-safety"
  for: "Full type inference philosophy (never cast, never annotate inferred values), Register module declaration, from narrowing on hooks and Link, strict:false for shared components, getRouteApi for code-split typed access, addChildren with object syntax for TS perf, LinkProps and ValidateLinkOptions type utilities, as const satisfies pattern."
- id: "@tanstack/router-plugin#router-plugin"
  run: "npx @tanstack/intent@latest load @tanstack/router-plugin#router-plugin"
  for: "TanStack Router bundler plugin for route generation and automatic code splitting. Supports Vite, Webpack, Rspack, and esbuild. Configures autoCodeSplitting, routesDirectory, target framework, and code split groupings."
- id: "@tanstack/start-client-core#start-core"
  run: "npx @tanstack/intent@latest load @tanstack/start-client-core#start-core"
  for: "Core overview for TanStack Start: tanstackStart() Vite plugin, getRouter() factory, root route document shell (HeadContent, Scripts, Outlet), client/server entry points, routeTree.gen.ts, tsconfig configuration. Entry point for all Start skills."
- id: "@tanstack/start-client-core#start-core/auth-server-primitives"
  run: "npx @tanstack/intent@latest load @tanstack/start-client-core#start-core/auth-server-primitives"
  for: "Server-side authentication primitives for TanStack Start: session cookies (HttpOnly, Secure, SameSite, __Host- prefix), session read/issue/destroy via createServerFn and middleware, OAuth authorization-code flow with state and PKCE, password-reset enumeration defense, CSRF for non-GET RPCs, rate limiting auth endpoints, session rotation on privilege change. Pairs with router-core/auth-and-guards for the routing side."
- id: "@tanstack/start-client-core#start-core/deployment"
  run: "npx @tanstack/intent@latest load @tanstack/start-client-core#start-core/deployment"
  for: "Deploy to Cloudflare Workers, Netlify, Vercel, Node.js/Docker, Bun, Railway. Selective SSR (ssr option per route), SPA mode, static prerendering, ISR with Cache-Control headers, SEO and head management."
- id: "@tanstack/start-client-core#start-core/execution-model"
  run: "npx @tanstack/intent@latest load @tanstack/start-client-core#start-core/execution-model"
  for: "Isomorphic-by-default principle, environment boundary functions (createServerFn, createServerOnlyFn, createClientOnlyFn, createIsomorphicFn), ClientOnly component, useHydrated hook, import protection, dead code elimination, environment variable safety (VITE_ prefix, process.env)."
- id: "@tanstack/start-client-core#start-core/middleware"
  run: "npx @tanstack/intent@latest load @tanstack/start-client-core#start-core/middleware"
  for: "createMiddleware, request middleware (.server only), server function middleware (.client + .server), context passing via next({ context }), sendContext for client-server transfer, global middleware via createStart in src/start.ts, middleware factories, method order enforcement, fetch override precedence."
- id: "@tanstack/start-client-core#start-core/server-functions"
  run: "npx @tanstack/intent@latest load @tanstack/start-client-core#start-core/server-functions"
  for: "createServerFn (GET/POST), validator (Zod or function), useServerFn hook, server context utilities (getRequest, getRequestHeader, setResponseHeader, setResponseStatus), error handling (throw errors, redirect, notFound), streaming, FormData handling, file organization (.functions.ts, .server.ts)."
- id: "@tanstack/start-client-core#start-core/server-routes"
  run: "npx @tanstack/intent@latest load @tanstack/start-client-core#start-core/server-routes"
  for: "Server-side API endpoints using the server property on createFileRoute, HTTP method handlers (GET, POST, PUT, DELETE), createHandlers for per-handler middleware, handler context (request, params, context), request body parsing, response helpers, file naming for API routes."
- id: "@tanstack/start-server-core#start-server-core"
  run: "npx @tanstack/intent@latest load @tanstack/start-server-core#start-server-core"
  for: "Server-side runtime for TanStack Start: createStartHandler, request/response utilities (getRequest, setResponseHeader, setCookie, getCookie, useSession), three-phase request handling, AsyncLocalStorage context."
- id: "@tanstack/virtual-file-routes#virtual-file-routes"
  run: "npx @tanstack/intent@latest load @tanstack/virtual-file-routes#virtual-file-routes"
  for: "Programmatic route tree building as an alternative to filesystem conventions: rootRoute, index, route, layout, physical, defineVirtualSubtreeConfig. Use with TanStack Router plugin's virtualRouteConfig option."

<!-- intent-skills:end -->

## Project Conventions

- Use `pnpm` for all package and script commands. Do not add dependencies unless the task explicitly permits them.
- This is a TanStack Start application. File routes live in `src/routes`; never edit `src/routeTree.gen.ts` manually.
- Keep shared metadata and social links in `src/lib/site.ts`. Preserve canonical URLs, JSON-LD, `robots.txt`, `sitemap.xml`, and `public/og.png` unless a task explicitly changes them.
- Publish articles by adding Markdown with validated frontmatter under `src/content/guides/`. The filename is the flat `/articles/<slug>` route; add any new series ID to `src/lib/content.ts` before using it in frontmatter.
- `src/lib/content.ts` eagerly imports frontmatter and lazy-loads rendered guide HTML. Preserve that split so the articles index does not import article prose.
- The visual system is defined in `src/styles.css`: use semantic Tailwind tokens, preserve explicit `data-theme="light"` / `data-theme="dark"` behavior, and keep the narrow single-column layout.
- Preserve accessibility safeguards: skip link, visible focus styles, reduced-motion handling, `overflow-x: clip`, and `min-width`/`minmax(0, 1fr)` guards where applicable.
- Fenced code is owned by Sätteri Expressive Code. Keep heading IDs, copy controls, and theme selectors intact; only style inline code locally.
- Update `README.md`, `PRODUCT.md`, `DESIGN.md`, and `.impeccable/design.json` when a change alters setup, publishing, product behavior, or the design system.



# AGENTS.md — Standing rules for agent work on this repo

You are an executor working under an external orchestrator. Phase prompts define *what* to build; this file defines the permanent constraints that apply to every phase. If a phase prompt conflicts with this file, stop and flag it instead of choosing silently.

## Stack facts (do not rediscover)

- Vite + React 19.2 + TypeScript, TanStack Start (file routes in `src/routes/`, prerender enabled), Tailwind v4, `motion/react` (motion.dev — never `framer-motion` imports), Pierre theme tokens.
- Markdown content is processed at build time by Sätteri (highlighting included); TOC items are extracted at build time (`extractTocItems` in vite config → `content-headings`). The DOM is never the source of truth for TOC items.
- Scrollspy lives in `src/lib/use-scroll-spy.ts`: rAF-throttled, scoped to the article container ref, `isConnected`-guarded, nullable active index until first pass. Exactly one instance runs at any viewport size.

## Motion system invariants

- All springs/tweens/variants live in `src/lib/motion.ts`, each with a one-line comment. No inline magic timing numbers in components.
- **Transforms (`y`/`scale`) only on elements ≈ one viewport tall or smaller. Anything larger animates opacity only.** This rule is why the site is smooth; never re-add transforms to route containers or full-article trees.
- No `filter` (blur etc.) on any animation that fires more than once per page view; avoid blur entirely.
- Enter = ease-out/spring, fast. Exit = ~60–70% of enter, ease-in, no bounce. Everything interruptible: springs from current velocity; never sequence awaited tweens on interactive elements.
- `useReducedMotion` parity for every animation: instant or opacity-only equivalents, never broken layout, all functionality reachable.
- The header morph is **deterministic**: constants-based transforms (documented against their Tailwind classes), single-frame height snap at route commit. Never reintroduce `layout`/`layoutId`/`LayoutGroup` into the header, and never measure header geometry at runtime.
- Route boundary uses `AnimatePresence mode="wait"`, projection-free. No `popLayout` at the route boundary.
- TOC-internal `layoutId`s (rail↔panel morph, indicators, sheet bar) are the sanctioned exception — they project only within the TOC subtree on user interaction. The exiting TOC host is retained `display:none`/inert through transitions and disposed after settle (max one retained instance; scrollspy/locks torn down synchronously at navigation start).

## Dependencies & scope

- **No new runtime dependencies.** Build-time-only compiler exceptions granted so far: `babel-plugin-react-compiler`, `@rolldown/plugin-babel`, `@babel/core`, `@types/babel__core`, and `oxlint`. Anything else requires explicit authorization before installing.
- **Compiler lint/coverage invariant:** use oxlint + compiler build report, not ESLint.
- No vaul, radix, GSAP, lenis, smooth-scroll or focus-trap libraries; these capabilities are implemented in-repo by design.
- Never remove features to gain performance. Feel tokens (spring/tween values) change only when a phase prompt explicitly says so.

## Performance protocol

- All reported traces: **production build** (`pnpm build` + preview), median of 3 runs with range, 4× CPU throttle for throttled scenarios. State the command used.
- Standing budgets: zero Motion-attributed forced layout during route transitions; no composited animated layer approaching full-article height; back-navigation longest task ≤ 300ms (4×); blog open bounded by the React commit itself.
- Fix causes, not symptoms: no `will-change` sprinkling, no timeouts/polling/MutationObservers to dodge race conditions, no debouncing router state to hide sync issues.
- If a trace contradicts the phase prompt's attribution, stop and present the trace before implementing an alternative.

## Accessibility invariants (regression-test every phase)

- One `<header>` landmark; focus survives header morphs; ThemeToggle never remounts across modes.
- Sheet: dialog semantics, focus trap, `inert` background, Escape, focus return to trigger; body scroll lock never outlives the route.
- TOC rows are semantic anchors; section clicks push hash history; back/forward re-traverse positions; deep links land exactly (settle-loop if `content-visibility` is active).
- `aria-current`/`aria-expanded` stay truthful; keyboard paths exercised, not assumed.

## Verification honesty (Zed environment)

You have terminal + filesystem but **no browser or DevTools**. Self-verify only what you can observe: builds, tests, lints, greps, trace harness output (`scripts/profile-route-transitions.mjs`), profiler dumps. Anything visual — frame scrubs, FPS meter, React DevTools badges, real-device behavior — must be reported as **"needs human verification"**, never as "passed". Misreporting an unobserved check as verified is a hard failure.

## Workflow

- One branch per phase; commit per sub-milestone with conventional messages matching the repo's style (`ui:`, `router:`, `perf:` …).
- `pnpm build`, `pnpm test`, `git diff --check` before declaring any phase complete.
- End every phase report with: numbers table (where applicable), list of human-verification items, and any constraint you were forced to bend — bending one without flagging it is worse than failing the phase.

## Guide prose style (binding on every file in `src/content/guides/`)

The JavaScript guides define the house style. It is Orwell's six rules plus ASD-STE100 Simplified Technical English, with one exemption: **precise technical vocabulary is never simplified away.** `fiber`, `lane`, `microtask`, and `reconciliation` stay. Prefer the short common word everywhere else.

### Preserve the reader's mental model

- **Existing guide prose is immutable during this restructuring.** Preserve every sentence's wording and order. You may promote structural labels to headings and split paragraphs at existing sentence boundaries for formatting, but do not rephrase, shorten, simplify, or substitute prose.
- **Avoid semicolons in guide prose.** Prefer an ordinary conjunction when the thought should stay together, or a period when two thoughts genuinely need separation. Do not use punctuation patterns that make the prose feel machine-generated.
- **Understanding is the primary goal.** Assume the reader is a complete beginner to the topic. Never trade motivation, context, causal explanation, or a useful analogy for brevity, metrics, or technical density.
- **Define before relying.** Introduce every mechanism in plain language before using its name as shorthand. Explain what problem it solves, how it works, and why the reader should care.
- **Structure is additive, not a compression target.** Headings, tables, and shorter sentences must preserve the original motivation, causal chain, examples, caveats, and reassuring reader guidance.
- **A "Short version" is a self-contained teaching map, not a definition.** It must explain the problem, the mechanism, why the mechanism works, and the consequence the reader should remember. Most need 70–140 words.
- **Keep concrete anchors inside the "Short version."** Preserve conditions, numbers, examples, contrasts, and causal phrases that make the summary understandable, such as "roughly 16ms at 60fps." Do not move essential context into the deep section.
- **Keep qualifiers attached to the claim they explain.** Moving a number, condition, contrast, or reason into a nearby sentence can still weaken understanding. Preserve its original logical attachment whenever the sentence remains clear.
- **Do not reduce explanatory coverage.** Measure explanatory sentence count before and after each guide. The result must not decrease, and prose word count must not fall by more than 5% without explicit approval.
- **Do not split prose mechanically.** Rewrite each long sentence as complete thoughts. Preserve the connective reasoning carried by words such as "because," "therefore," "but," and "which is why."
- **Code density must come from teaching examples.** Do not split one example into artificial fences or add fragments that depend on undeclared context merely to satisfy the metric.
- **The original guide is the teaching source of truth.** Preserve its wording and sequence unless a change clearly improves beginner understanding. Do not rewrite strong prose merely to make it shorter or more uniform.
- **"How it actually works" remains a guided narrative.** Code supports the explanation; it does not replace or repeatedly interrupt it. Never treat the guide-level code-density target as a per-section quota.
- **Add subheadings only at genuine conceptual turns.** Do not fragment one causal explanation into many tiny reference-style entries.

### Hard limits

| Rule | Limit | Why |
|---|---|---|
| Sentence length | ≤ 25 words; ≤ 20 in a procedure | STE. A sentence with four clauses is four sentences. |
| Paragraph length | ≤ 6 sentences and ≤ 60 words | STE. One topic per paragraph. |
| Heading depth | `###` inside any `##` longer than ~400 words | A section with no internal landmark cannot be navigated or resumed. |
| Code density | ≥ 8 fenced blocks per 1,000 words of prose | The JS guides run 16.5. Internals prose earns some slack, not an exemption. |
| Voice | Active. Name the actor: "React reads the slot", not "the slot is read". | Orwell. |
| Emphasis | Bold and italics mark terms on first use only | Emphasis is not a substitute for a heading. If a paragraph needs four bolds to be scannable, it needs to be three paragraphs. |
| Run-in labels | **None.** A bold label with body text on the same line is a heading that lost an argument | The JS guides use headings in this position and have 0.3 run-ins per 1k words. Pre-fix, the React guides had 5.8. |

### Structural requirements

- **The section scaffold is headings, not bold labels.** Every part gets its own `###` and its content starts on the line below:

  ```markdown
  ## 5. Lanes: the bitmask model

  *Prereqs: …*

  ### The itch

  You have read that a lane is "a bit in a bitmask." …

  ### The short version

  A lane is one bit in a 31-bit mask. …

  ### How it actually works

  #### A lane is one bit, while Lanes is a set
  ```

  Never `**The itch.** You have read that…`. The reader's eye has nowhere to land, the part gets no anchor, and the heading styles in `styles.css` never fire. Repeated scaffold headings are fine — `headingIds` in `src/lib/satteri-plugins.ts` suffixes duplicate slugs (`the-itch`, `the-itch-2`).
- **Every section that enumerates gets a table.** Priority levels, lane assignments, hook comparisons, timing orders — if it has more than two parallel items with more than one attribute each, it is a table, not a bulleted list and never a prose run.
- **No closing-synthesis paragraph.** Recaps are numbered lists, one claim per line. A 300-word single paragraph is not a summary; it is the thing a summary replaces.
- **Show before you tell.** Any mechanism a reader could run gets a runnable block first, prose second. Where the real implementation is too large, write a simplified teaching version and label it as one — `mapValues` in `map-filter-reduce-transform-select-combine.md` is the pattern.
- **"Try it" exercises reference code that exists in the guide.** "Build the fetch above" is only legal if there is an above.
- Keep the section scaffold: Prereqs → The itch → The short version → How it actually works → Try it → You've got this if. It works; the failures are inside the fourth part.

### Verification before declaring a content phase complete

Run `pnpm check:prose` (`scripts/check-prose.mjs`). It reports words, longest paragraph, sentences over 25 words, code blocks per 1k words, and `##` sections missing `###`. Fix what it flags or state why the exemption holds.
