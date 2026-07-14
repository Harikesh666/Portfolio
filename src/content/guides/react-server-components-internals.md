# React Server Components and the Server/Client Boundary: A Guided Deep Dive

> Current as of React 19.2.x (2026), with Server Components stable in the React 19 line. Companion to the rendering and reconciliation guide; this one assumes you have at least skimmed that one, since RSC sits on top of the rendering engine described there.

> **What this guide builds on.** This guide sits on top of the rendering engine, so it leans on the **rendering and reconciliation guide**: the component tree, the render and commit phases, reconciliation, hydration, and Suspense (which RSC uses for streaming). You can read it after that guide; wherever it reaches for an engine concept, it recaps it in a line. It is the one genuinely framework-coupled guide in the series (the model is React, but everything runnable is your framework, almost always Next.js), which the "React core versus your framework" table below makes precise. The per-section **Prereqs** lines name what each section needs, drawn from earlier sections here, the rendering guide, and outside knowledge (HTTP requests, the server/client split, serialization, and JavaScript bundlers).

## Read this first

Same method as the rendering guide, because it works. **You are not meant to absorb this in one sitting.**

**Pass 1, one relaxed sitting.** Read only **"The itch"** and **"The short version"** of each section. Skip the "How it actually works" blocks. You will come out with the whole mental model of how Server Components and the boundary work, which is enough to stop you making the common mistakes and to read framework docs with understanding.

**Pass 2, driven by real work.** When a `"use client"` error or a "function cannot be serialized" message or a confusing data-fetching choice shows up in your Next.js work, come back and read the deep part of the matching section.

**Pass 3, when curious.** The further-reading section points at the primary sources.

One honesty note up front, because it matters for how much of this to trust over time. The *user-facing* model here (Server Components, Client Components, the directives, Server Functions) is **stable** in React 19 and will not change between minor versions. But the *framework-facing* internals that make RSC work (the exact wire format, the bundler hooks) are **not** semver-stable within the 19.x line and are tightly coupled to your framework, almost always Next.js for you. So treat the concepts as solid and the deepest plumbing details as "true today, may shift," and pin your React version in a real project. The React team says exactly this in the official docs.

A second honesty note: RSC is the one area of React that you cannot really run "plain." It needs a bundler and framework integration. Everything you try will be through Next.js (or a similar framework). That is not a detail; it shapes how you learn this.

**Trust the order.** The sections build one picture, in order: why RSC exists, the two-worlds model, the two kinds of component, the boundary between them, the wire format, how it meets SSR and hydration, Server Functions for writes, and how it all sits back on the rendering engine. Here is the spine:

```
   Why RSC exists                          (1)
            │
   The model: two worlds, one tree          (2)
            │
   The two kinds of component               (3, 4)   ◀── Server vs Client
            │
   The boundary: what can cross it          (5)      ◀── the children trick lives here
            │
   The wire format: the RSC payload          (6)
            │
   Meeting SSR and hydration                 (7)
            │
   Server Functions (writing back)           (8)
            │
   Back to the rendering engine, pitfalls    (9, 10)
```

Each section also opens with a one-line **Prereqs** note: the earlier sections it leans on (here or in the rendering guide) plus any outside knowledge worth having first. Sections that need nothing past basic React say so.

### What is React core versus what your framework implements

This distinction trips up a lot of people, and a lot of the internet blurs it by attributing pure-framework conventions to React. Keep this table in mind as you read: the *model* in this guide is genuinely React, but everything *runnable* is your framework (Next.js for you) implementing React's primitives. There is no React-only way to run any of this.

| This is React core (in the React docs, stable in React 19) | This is your framework implementing React's primitives (Next.js, etc.) |
|---|---|
| The concepts: Server Components, Client Components, the boundary | The file conventions and project structure (where pages and routes live) |
| The directives `"use client"` and `"use server"` and their meaning | How `await`ing data in a component is actually wired to a request |
| "Server Components are the default, no directive marks them" | The router, and the fact that client navigation fetches a new RSC payload instead of HTML |
| The RSC payload format and the serialization rules for props | The HTTP endpoint a Server Function is exposed at, and how forms post to it |
| Server Functions, and the hooks `useActionState`, `useFormStatus`, `useOptimistic`, `use` | Caching, revalidation, and most performance behavior |
| Progressive enhancement (a Server Action working before JS loads) as a design goal | The actual mechanism that makes that progressive enhancement happen |

The rule of thumb: read the **React docs for the *why*** (the model, the directives, the rules) and the **framework docs for the *how*** (the commands, the files, the wiring). When something in this guide is concrete enough to run, it is your framework doing the work on top of React's design.

---

## Table of Contents

1. [Why Server Components exist at all](#1-why-server-components-exist-at-all)
2. [The mental model: two worlds, one tree](#2-the-mental-model-two-worlds-one-tree)
3. [Server Components: what they are and what they cannot do](#3-server-components-what-they-are-and-what-they-cannot-do)
4. [Client Components and what "use client" actually marks](#4-client-components-and-what-use-client-actually-marks)
5. [The boundary rules: what can cross, and the children trick](#5-the-boundary-rules-what-can-cross-and-the-children-trick)
6. [The RSC payload: how the server describes the tree](#6-the-rsc-payload-how-the-server-describes-the-tree)
7. [How RSC, SSR, and hydration fit together](#7-how-rsc-ssr-and-hydration-fit-together)
8. [Server Functions and Actions ("use server")](#8-server-functions-and-actions-use-server)
9. [How this connects back to the rendering engine](#9-how-this-connects-back-to-the-rendering-engine)
10. [Mental model, pitfalls, and debugging](#10-mental-model-pitfalls-and-debugging)
11. [Further reading](#11-further-reading)

---

## 1. Why Server Components exist at all

*Prereqs: basic React (client components, fetching data in `useEffect`). Outside React: the cost of downloading and parsing a JavaScript bundle, and the round trip of fetching data from an API.*

**The itch.** You have shipped React apps where the JavaScript bundle is huge, every screen starts with a spinner while it fetches, and you keep writing little API routes whose only job is to hand the frontend some data. It feels like a lot of plumbing for "show the user their data." Server Components are React's answer to that whole category of pain.

**The short version.** A Server Component is a component that runs **only on the server**, never in the browser. Because it runs on the server, it can talk directly to your database or filesystem, it ships **zero JavaScript** to the client, and it can fetch its own data with a plain `await` instead of a `useEffect` plus a loading state plus an API route. The browser only receives the *result*. This attacks four long-standing problems at once: bloated bundles, loading-spinner waterfalls, API boilerplate, and secrets leaking into client code.

**How it actually works.**

Think about what a normal (client) React component costs. Its code has to be downloaded, parsed, and executed in the browser. If it needs data, it typically renders empty, fires a `useEffect`, shows a spinner, waits for a `fetch` to an API route you wrote, then re-renders with the data. Every library it imports (a date formatter, a markdown parser, a syntax highlighter) is added to the bundle the user downloads, even if the component's output never changes after first render.

Server Components remove that cost by moving the work to where the data already is. The component executes on the server during the request (or even at build time for static content). It can `await fetch(...)` or query a database directly, because it is server code. It can import a heavy library, use it, and send only the rendered result, so that library never enters the browser bundle. And because it runs server-side, it can read environment-variable secrets and internal services safely, since none of that code is exposed to the user.

The four problems it solves, concretely:

1. **Bundle size.** Server Component code, and the libraries it uses, are never sent to the browser. For content-heavy UI this can cut the client bundle dramatically.
2. **Data waterfalls and spinners.** Data is fetched on the server as part of rendering, so the user often sees real content immediately rather than a spinner that resolves into content.
3. **API boilerplate.** For simple "read data and show it" cases, you no longer write a separate API endpoint. The component reads the data itself.
4. **Secrets and security.** Database credentials, API keys, and internal logic stay on the server, because the component that uses them never ships to the client.

The trade is that a Server Component is *not interactive*. It runs once, on the server, produces output, and that is it. No state, no effects, no event handlers, no browser APIs. Anything interactive has to live in a Client Component, which is the subject of Section 4. The art of using RSC well is deciding which parts of your UI are "stable structure that just displays data" (Server Components) and which parts are "interactive bits" (Client Components).

> **Try it.** In a Next.js App Router project, write an `async` component in a `page.js` that does `const data = await fetch(...)` (or reads a local file) and renders it, with no `"use client"` at the top. Notice you never wrote a `useEffect`, never wrote an API route, and the data is just *there* in the first render. Then check the network tab and the bundle: the component's code is not in the client JavaScript.

**You've got this if** you can name two things a Server Component can do that a normal client component cannot, and one thing it cannot do that a client component can.

---

## 2. The mental model: two worlds, one tree

*Prereqs: Section 1. From the rendering guide: the component tree (one tree of components that produces the UI). Outside React: the server/client distinction, code that runs on your server versus in the user's browser.*

**The itch.** Once both kinds of component exist, it gets confusing fast. Which runs where? Can they call each other? Why does putting `"use client"` in the wrong place break things or bloat the bundle? You need one clear mental picture before the rules make sense.

**The short version.** Picture your component tree split into two regions by a boundary. Above the boundary, components run only on the server (Server Components). Below it, components run in the browser too (Client Components). A Server Component can render a Client Component (you cross the boundary going down), but a Client Component cannot reach back *up* and import a Server Component. The boundary is decided at **build time** by the `"use client"` directive, not at runtime. Get this picture right and almost every rule is a consequence of it.

**How it actually works.**

The key shift from old React is that there is no longer one uniform kind of component. There are two, and they execute in different environments:

- **Server Components** run on the server, during the request or at build time. They run **once** and never run again in the browser. They produce a description of UI that gets sent to the client.
- **Client Components** are the React you already know. They run in the browser, can hold state, run effects, and respond to events. (They also run on the server once for the initial HTML, which is a subtlety covered in Sections 4 and 7. For now, "they run in the browser" is the useful half of the truth.)

Your app is a single tree, but a **boundary** runs through it. Everything from the root down to a `"use client"` marker is server territory; everything from that marker down is client territory. The direction of the boundary matters enormously:

- A Server Component **can render** a Client Component. This is crossing the boundary downward, and it is the normal case. The server component renders, hits a client component, and leaves a "hole" that says "the browser will fill this in with this interactive component."
- A Client Component **cannot import** a Server Component and render it directly. Once you are in client territory, you are in the browser's world, and the browser cannot run server-only code. (There is a way to get server-rendered content *into* a client component, by passing it as `children`, which is the elegant trick in Section 5. But that is the server component handing content *down*, not the client component reaching *up*.)

Because `"use client"` is read by the bundler at build time, the boundary is a **static property of your code**, not something decided while running. The bundler walks your imports: a file with `"use client"` at the top, and everything it imports, goes into the client bundle. This is why a single misplaced `"use client"` high in your tree can accidentally drag a huge subtree into client territory and balloon your bundle. The directive does not just mark one component; it marks an **entry point** into the client world for everything reachable from it.

> **Try it.** Draw your last Next.js page as a tree and draw a line where each `"use client"` sits. Everything above each line ran only on the server; everything below shipped to the browser. If a line is higher than it needs to be, that is bundle you are shipping for no reason.

**You've got this if** you can explain why a Client Component cannot import a Server Component, but a Server Component can render a Client Component.

---

## 3. Server Components: what they are and what they cannot do

*Prereqs: Section 2. Outside React: what only a server can do (read the filesystem, query a database directly, hold secrets) and what only the browser can do (hold state, handle events, run effects).*

**The itch.** You wrote a component, tried to add `useState` to it, and got an error telling you it needs `"use client"`. Why can't a Server Component just use a hook like everything else?

**The short version.** A Server Component runs once on the server and then it is done. There is no "later" for it: no re-render, no browser, no user events. So everything that depends on a "later" is forbidden in it: no `useState` (state changes over time), no `useEffect` (effects run in the browser after render), no event handlers like `onClick` (those fire in the browser), no browser APIs like `localStorage`. In exchange it gets the server superpowers: it can be `async` and `await` data directly, and it can use server-only resources. There is no directive that marks a component as a Server Component; being a Server Component is just the **default**.

**How it actually works.**

The single fact that explains every rule is this: **a Server Component executes exactly once, on the server, and never again.** It has no presence in the browser. From that, the capabilities and restrictions follow directly.

What a Server Component **can** do, that client components cannot:

- **Be `async` and `await` directly.** Because it runs in a server environment, you can write `const user = await db.users.find(id)` right in the component body. The component's render is allowed to be asynchronous. This is why data fetching no longer needs `useEffect`.
- **Access server-only resources.** Filesystem reads, direct database queries, internal services, environment-variable secrets. None of this is exposed to the client because the component's code never ships.
- **Import heavy dependencies for free.** A markdown parser, a syntax highlighter, a date library: use it on the server, send only the output, and the library never touches the client bundle.

What a Server Component **cannot** do, and why:

- **No state (`useState`, `useReducer`).** State is a value that changes over time and triggers re-renders. A Server Component has no "over time"; it runs once. There is nothing to re-render.
- **No effects (`useEffect`, `useLayoutEffect`).** Effects run in the browser after the DOM is committed. A Server Component never reaches the browser, so its effects could never run.
- **No event handlers.** `onClick` and friends fire in response to browser events. No browser, no events.
- **No browser-only APIs.** `window`, `document`, `localStorage` do not exist on the server.
- **No Context consumption in the interactive sense.** (Context is largely a client-side coordination tool; Server Components do not subscribe to changing context.)

A point that confuses nearly everyone: **there is no `"use server"` directive that marks a component as a Server Component.** Server Components are simply the default; a component with no directive, rendered in server territory, is a Server Component. The `"use server"` directive exists, but it means something entirely different (it marks Server Functions, Section 8). If you ever see advice to put `"use server"` at the top of a file to "make it a server component," that advice is wrong, and the official docs explicitly call this out as a common misunderstanding.

> **Try it.** Take a Server Component and add `const [n, setN] = useState(0)` to it. Read the exact error. Then think about which of the restrictions above it is enforcing (state needs a "later," which a server-only component does not have). Now move that stateful logic into a small child component with `"use client"` and watch it work.

**You've got this if** you can explain, from the single fact "it runs once on the server," why a Server Component cannot use `useState` or `onClick`.

---

## 4. Client Components and what "use client" actually marks

*Prereqs: Sections 2 and 3. Outside React: the idea of a boundary marker in source code that a bundler reads to split code.*

**The itch.** You assumed `"use client"` means "this component runs only in the browser." Then you learned it still shows up in the server-rendered HTML, and got confused about what the directive actually does.

**The short version.** `"use client"` does **not** mean "runs only on the client." It marks the **boundary** where your code enters the client bundle. A Client Component actually runs in *two* places: once on the server to produce the initial HTML (this is plain SSR, the same as React has done for years), and then in the browser, where it hydrates and becomes interactive. The thing that makes it a "Client Component" is that its code is **shipped to the browser** so it *can* run there. `"use client"` is the marker that tells the bundler "send this, and everything it imports, to the client."

**How it actually works.**

This is the single most misunderstood directive in modern React, so it is worth being precise.

`"use client"` is a **boundary marker read by the bundler at build time.** When the bundler sees a file starting with `"use client"`, it treats that file as an entry point into the client bundle: that module, and every module it imports, gets compiled into the JavaScript that ships to the browser. That is the entire literal meaning of the directive. It does not say "run only on the client." It says "this code needs to exist on the client."

Now, what actually happens to a Client Component at runtime:

1. **On the server, during the initial request,** React still renders the Client Component to HTML, exactly like traditional server-side rendering. This is why a Client Component's output appears in "view source." The user gets meaningful HTML immediately, even before any JavaScript loads.
2. **In the browser,** the Client Component's code (which was shipped because of `"use client"`) loads and **hydrates** that HTML: React attaches its logic to the already-present DOM nodes, wiring up state and event handlers so the component becomes interactive. From then on, it behaves like the React you already know, re-rendering in the browser as state changes.

So the accurate mental model is: a Server Component runs **only on the server, once**. A Client Component runs **on the server once (for HTML) and then in the browser (for interactivity)**. The word "client" in the name is about *where its code is shipped and where it becomes interactive*, not about it being absent from the server.

The practical consequence you must internalize is the **bundle cost of the boundary's placement**. Because `"use client"` pulls in everything reachable from that file, marking a component high in the tree as a client component drags its entire subtree of imports into the browser bundle. The guidance "push `"use client"` as far down the tree as possible" is a direct result: you want the interactive leaf to be a client component, not its big non-interactive parent. A common, costly mistake is slapping `"use client"` at the top of a page "just in case," which turns the whole page into client-shipped code and throws away most of RSC's benefit.

> **Try it.** Make a component with `"use client"` and a `console.log("rendering")` in its body, then load the page with the network tab open and JavaScript still enabled. You will see the log fire on the server (in your terminal) for the initial render and again in the browser console during hydration. Two runs, two environments. That is the "runs in two places" reality made visible.

**You've got this if** you can correct the statement "`use client` means the component runs only in the browser" with what it actually means.

---

## 5. The boundary rules: what can cross, and the children trick

*Prereqs: Sections 3 and 4. Outside React: serialization (turning a value into data that can be sent over the network) and the kinds of values that cannot be serialized, like functions and class instances.*

**The itch.** You tried to pass a function as a prop from a Server Component to a Client Component and got an error about something not being serializable. And you have heard you "can't use Server Components inside Client Components," which seems to make composing them impossible. Both of these have clean explanations.

**The short version.** When a Server Component passes props *down* to a Client Component, those props have to travel from the server to the browser as data, so they must be **serializable**. Plain values (strings, numbers, objects, arrays, dates, even promises and JSX) can cross. Arbitrary **functions and class instances cannot**, because you cannot send a live function over the network. As for "Server Components inside Client Components": you cannot *import* one into client code, but you can **pass server-rendered content as `children`** (or any prop) into a Client Component. That trick lets a client component wrap server content without ever running it.

**How it actually works.**

Two separate rules are at play, and people tangle them together.

**Rule one: props crossing the boundary must be serializable.** When a Server Component renders a Client Component and passes props, those props are part of the data the server sends to the browser (they get encoded into the RSC payload, Section 6). Anything that can be encoded as data can cross:

- primitives (string, number, boolean, null, undefined, bigint)
- plain objects and arrays of serializable things
- `Date`, `Map`, `Set`, `FormData`, typed arrays
- React elements (JSX), which is what makes the children trick below work
- promises (the client can `use()` them)
- references to **Server Functions** (Section 8), which serialize to a callable reference, not to their code

What **cannot** cross:

- arbitrary **functions** and closures (you cannot serialize a live function and its captured scope, so an `onClick` handler cannot be passed from server to client; define it in the client component instead)
- **class instances** with methods and prototypes
- anything else that is not plain data

This is why "pass data, not functions" is the rule of thumb. The error you saw was React telling you a prop could not be encoded to send across the boundary.

**Rule two: composition direction, and the children trick.** A Client Component cannot `import ServerComponent from "..."` and render it, because client code runs in the browser and cannot execute server-only logic. But composition is still possible, because the server can render content and hand it *down* as a prop:

```jsx
// Server Component
function Page() {
  return (
    <ClientLayout>      {/* a Client Component */}
      <ServerContent /> {/* rendered on the server, passed in as children */}
    </ClientLayout>
  );
}
```

Here `Page` is a Server Component. It renders `ServerContent` on the server and passes the *result* into `ClientLayout` as `children`. `ClientLayout` is a client component; it receives `children` as an already-rendered piece of UI and just places it. `ClientLayout` never imports or runs `ServerContent`; it only renders whatever it was handed. This "slot" or "donut" pattern is how you get server-rendered content visually inside a client component (a client-side interactive shell wrapping server-rendered content), without violating the import rule. The boundary is still strictly one-directional; the server is handing content down, not the client reaching up.

> **Try it.** Pass a plain object from a Server Component to a Client Component as a prop: it works. Now try to pass an inline function like `onSomething={() => ...}`: read the serialization error. Then restructure so the function is defined *inside* the client component instead. Separately, build the children pattern above and confirm the server content renders inside the client wrapper.

**You've got this if** you can explain why a function cannot be passed as a prop across the boundary, and how the `children` pattern lets server content live inside a client component anyway.

---

## 6. The RSC payload: how the server describes the tree

*Prereqs: Sections 2 and 5. From the rendering guide: that React elements are plain data describing the UI, not DOM (Section 2 there). Outside React: a streamable wire format (a response sent in pieces).*

**The itch.** A Server Component runs on the server and the browser somehow ends up showing its output, with interactive client components slotted in at the right places. What is actually sent over the wire to make that happen? It is not just HTML, and it is not the component's code.

**The short version.** The server renders your Server Components into a special streamable description of the UI tree, often called the **RSC payload** (the format is sometimes called "Flight"). It is not HTML and it is not JavaScript. It is a serialized description that says "here is the rendered tree, here are the plain values, and here are the *holes* where client components go, identified by a reference the browser can use to load that component's code." The browser takes this payload plus the client component code and assembles the final tree.

**How it actually works.**

When Server Components render, they do not produce raw HTML directly as their primary output (HTML is also produced for the first load, see Section 7, but the RSC-specific output is different). They produce a **serialized representation of the rendered React tree**. Think of it as a description, streamed in pieces, that contains:

- the rendered output of Server Components as plain data describing elements (tag names, props, text, nested structure)
- the serializable props that were passed down
- **module references** wherever a Client Component appears: instead of the client component's code, the payload contains a reference (an id plus enough information to load the right client bundle chunk) that says "a client component goes here, here is which one, and here are its props"

The browser receives this payload and reconstructs the React element tree from it. Where the payload has plain rendered output, the browser just uses it. Where the payload has a module reference to a client component, the browser loads that component's code (which was shipped because of its `"use client"` marker) and renders it with the provided props, making it interactive.

Two properties of this format matter:

- **It is streamable.** The server can send the payload in chunks as rendering progresses, which is what lets content appear progressively and integrates with Suspense (the server can stream a boundary's content when its data resolves). This is the same streaming idea from the rendering guide's Suspense section, applied to the server output.
- **Client component code is referenced, not embedded.** The payload never contains the source of a client component; it contains a pointer to it. This keeps the payload itself lean and is how the same client component can be referenced many times without duplicating code.

A crucial consequence for navigation: when you navigate between routes in an App Router app, the framework can fetch a **new RSC payload** for the destination rather than a full HTML document. The client already has React and the client component code loaded; it just needs the new tree description. This is why client-side navigation in these apps can update server-rendered content without a full page reload, and without re-downloading client component code it already has.

Remember the honesty note from the preface: the exact shape of this wire format is a framework-and-bundler-facing internal that is not semver-stable within React 19.x. You should understand *what it is and why* (a streamable tree description with module-reference holes), but not memorize byte-level details, because those are exactly the part that can change.

> **Try it.** In a Next.js App Router app, open the network tab and trigger a client-side navigation between two routes. Look for the request that fetches the new route's data: it is not a full HTML page, it is the RSC payload (you will see an unusual-looking streamed text format, not HTML tags). That is the server describing the new tree to the browser.

**You've got this if** you can explain what the browser receives for a Server Component (a tree description) versus for a Client Component inside it (a reference plus props, not code).

---

## 7. How RSC, SSR, and hydration fit together

*Prereqs: Sections 2 and 6. From the rendering guide: the render and commit phases, and that hydration attaches React to server-rendered HTML. Outside React: server-side rendering (HTML generated on the server), which is distinct from RSC.*

**The itch.** You now have several things that all sound like "rendering on the server": Server Components, server-side rendering (SSR) to HTML, and hydration. They are related but not the same, and conflating them makes the whole picture muddy.

**The short version.** They are three distinct steps that cooperate on first load. **RSC** runs your Server Components and produces the tree description (the payload). **SSR** takes the full tree (server output plus client components) and renders it to **HTML** so the user sees content immediately. **Hydration** happens in the browser, where React attaches interactivity to that HTML for the Client Components only. Server Components never hydrate, because they have no browser-side behavior to attach. So the user gets fast HTML, then the interactive bits wake up, and the non-interactive bits stay as cheap static content forever.

**How it actually works.**

On an initial page load, here is the sequence, kept deliberately concrete:

1. **RSC render (server).** React runs your Server Components. They `await` their data, render, and the result is serialized into the RSC payload (Section 6), with module-reference holes where client components sit.
2. **SSR to HTML (server).** Separately, React also renders the combined tree (the server-rendered output *plus* the client components rendered for their initial markup) into actual HTML. This is the traditional SSR step, and it is what gives the user visible content before any JavaScript runs. The server streams this HTML, and it streams the RSC payload alongside it.
3. **Hydration (browser).** The browser displays the HTML immediately. Then React loads the client component code and **hydrates**: it walks the existing DOM and attaches each Client Component's state and event handlers to the already-present nodes, making them interactive. Hydration uses the RSC payload to know the tree structure, including where the client components are and what props they received.

The defining facts to hold onto:

- **Server Components do not hydrate.** Hydration is the process of making static HTML interactive, and Server Components have no interactivity to add. Their output is rendered once, sent as HTML and as payload, and then it is just there. This is a major efficiency win: large swaths of your UI never participate in hydration at all, which reduces the client-side work on load.
- **Client Components are rendered twice on first load** (once on the server for HTML, once in the browser to hydrate), which is the normal SSR lifecycle and exactly why your purity and cleanup discipline from the rendering guide matters here too.
- **On later client-side navigations,** there is no fresh HTML document; the browser fetches a new RSC payload and updates the tree in place (Section 6).

This is also where Suspense and streaming from the rendering guide reconnect: because both the HTML and the RSC payload are streamed, a slow Server Component (say one awaiting a slow query) can be wrapped in `<Suspense>`, letting the rest of the page stream and appear while that one part fills in when its data is ready. The server-side reveal-batching refinement mentioned in the rendering guide is part of making these streamed reveals feel calm rather than janky.

> **Try it.** Load a Next.js page with JavaScript disabled in the browser. You will still see the content, because of the SSR-to-HTML step. Nothing interactive will work (no hydration without JS), but the static structure is all there. That experiment cleanly separates "HTML exists" (SSR) from "it became interactive" (hydration).

**You've got this if** you can state, in one sentence each, what RSC, SSR, and hydration each do, and why Server Components skip the third.

---

## 8. Server Functions and Actions ("use server")

*Prereqs: Sections 4 and 5. Outside React: an HTTP endpoint, a form submission, and progressive enhancement (a form working before JavaScript has loaded).*

**The itch.** Mutations (submitting a form, saving an edit) still felt like a lot of wiring: write an API route, `fetch` it from the client, manage loading and error state, revalidate. You heard `"use server"` and Server Actions fix this, but it is unclear what is really happening when you "call a server function from the client."

**The short version.** A **Server Function** is an `async` function marked with `"use server"` that runs on the server but can be **called from client code as if it were a normal function**. Under the hood, the bundler replaces it on the client with a reference, and calling it performs a network request (an RPC) to run the real function on the server. This lets a Client Component trigger server-side work (a database write, say) without you writing an API route. When wired to a form or used for a mutation, these are commonly called **Server Actions**, and React 19 adds hooks (`useActionState`, `useFormStatus`, `useOptimistic`) to manage their pending and result states cleanly.

**How it actually works.**

`"use server"` is the *other* directive, and it is unrelated to marking Server Components (Section 3 warned about this confusion). It marks **functions**, not components, as server-runnable-from-the-client. You write:

```js
"use server";
export async function savePost(formData) {
  // runs on the server: can hit the database, read secrets, etc.
}
```

When a Client Component imports `savePost` and calls it, here is the reality: the bundler does **not** ship the function's body to the browser. Instead, on the client side, `savePost` becomes a **reference**, and calling it sends a network request to the server (an RPC: remote procedure call) carrying the arguments. The server runs the real function and returns the result. From your code's point of view it looks like calling an async function; mechanically it is a typed network round-trip that React and the framework wire up for you. This is why a Server Function can be passed as a prop across the boundary (Section 5 listed it as serializable): what crosses is the *reference*, not the code.

This collapses the usual mutation boilerplate. Instead of "write an API route, `fetch` it, handle loading, handle errors, revalidate," you mark a function `"use server"` and call it. When attached to a form (a **Server Action**), the form can submit directly to it, and it even works before client JavaScript has loaded, because the form post is a real HTTP request the server can handle.

React 19 adds three hooks to make the interactive states pleasant, and they are worth knowing by what problem each solves:

- **`useActionState`** replaces the manual "`useState` for the result plus `onSubmit` plus loading flag" pattern. You give it an action and an initial state; it gives you back the current state, a wrapped action to call, and a pending flag. It is the standard way to manage a form-and-action's lifecycle.
- **`useFormStatus`** lets a component deep inside a form read the parent form's pending/submitting status without prop-drilling it down. Useful for a submit button that disables itself while the action runs.
- **`useOptimistic`** lets you show an immediate, optimistic UI update (the comment appears instantly) while the server action is still in flight, then reconciles with the real result when it returns. It is the correct tool for making mutations feel instant without lying about correctness.

Security note worth carrying: a Server Function is a real network endpoint that the client can call, so you must validate and authorize its inputs exactly as you would an API route. The convenience of "just call a function" hides the fact that it is a public entry point to your server.

> **Try it.** In a Next.js App Router project, write a Server Function with `"use server"` that logs its arguments server-side, import it into a `"use client"` component, and call it from a button. Watch the log appear in your server terminal, not the browser console, and watch the network tab show the RPC request. Then wire it to a `<form action={...}>` and submit with JavaScript disabled; it still runs, because the form post reaches the server directly.

**You've got this if** you can explain what physically happens when client code "calls" a `"use server"` function (a network request runs the real function on the server), and why that function must still validate its inputs.

---

## 9. How this connects back to the rendering engine

*Prereqs: Sections 2, 6, and 7, plus the rendering guide's reconciliation and Suspense sections, recapped here. Outside React: nothing new.*

**The itch.** You spent real effort learning fibers, reconciliation, lanes, and commit phases. Does RSC throw any of that away, or sit on top of it? You want to know how the two pictures join.

**The short version.** RSC does not replace the rendering engine; it sits **on top** of it. Everything from the rendering guide (fibers, reconciliation, the render and commit phases, hooks, Suspense) still governs what happens in the browser for Client Components. RSC is best understood as a new **source** for the element tree: instead of all elements coming from components that run in the browser, some of the tree arrives pre-rendered from the server as the RSC payload, and the browser's reconciler works with the combination. Same engine, new input.

**How it actually works.**

Recall the core loop from the rendering guide: React builds an element tree, reconciles it against the fiber tree, and commits changes to the DOM, with hooks living on fibers and Suspense unwinding to boundaries. RSC changes *where some of the tree comes from*, not how the tree is processed once it is in the browser.

- The **Server Component output** arrives as the RSC payload, a description of part of the tree that was already rendered on the server. The browser turns this into React elements. These elements have no client-side fiber behavior of their own to run again; they are essentially finished.
- The **Client Components** referenced inside that payload are where the familiar engine takes over. Each is a normal React component in the browser: it gets a fiber, runs its hooks, participates in reconciliation, re-renders when its state changes, and commits like anything else. Everything you learned about bailouts, the render and commit phases, effect timing, and keys applies to these.
- **Suspense** is the shared seam. The server can stream Server Component output and the browser can suspend on it, using the same boundary-and-fallback mechanism described in the rendering guide. The `use()` hook reads promises in both worlds.
- **On re-renders and navigations,** when only client state changes, it is pure browser reconciliation, exactly as before. When a navigation fetches a new RSC payload, the browser reconciles the new server-provided tree against the current one, reusing the same diffing rules (same type reuse, keys for lists) you already know.

So the honest framing is: RSC is an architectural layer that decides *which components run where and how their output reaches the browser*, while the reconciliation engine is the machinery that *processes the resulting tree in the browser*. The rendering guide is still the foundation; this guide is a layer that feeds it. Time spent on fibers and reconciliation was not wasted; it is precisely what lets you reason about the Client Component half of an RSC app.

> **Try it.** Take an interactive Client Component inside an RSC page and profile it with the React DevTools Profiler, the same tool from the rendering guide. You will see it render and commit exactly like any client component, with the same bailout behavior. The Server Component parts around it will not show re-renders, because they do not re-render in the browser at all.

**You've got this if** you can explain RSC as "a new source for the element tree" rather than "a replacement for how React renders."

---

## 10. Mental model, pitfalls, and debugging

*Prereqs: the rest of the guide.*

**The itch.** You want a compact set of rules and traps so you stop making the common RSC mistakes, and a way to reason when something goes wrong.

**The short version.** Default to Server Components, push `"use client"` as deep as possible, pass data not functions across the boundary, and remember that `"use server"` is for functions, not components. When something breaks, ask: which side of the boundary is this code on, and is it trying to do something only the other side can do?

**How it actually works.**

A reasoning procedure for RSC bugs:

1. **Which side of the boundary is this code on?** Trace upward to the nearest `"use client"`. If there is one above this code, you are in client territory (browser rules apply: no direct database access, no server secrets). If there is none, you are in server territory (no state, no effects, no events, no browser APIs).
2. **Is it trying to do something only the other side can do?** A server-territory component using `useState` or `onClick`, or a client-territory component trying to `await` a database, is a boundary violation. The fix is almost always to move that piece to the correct side, often by splitting one component into a server parent and a small client leaf.
3. **Is something failing to cross the boundary?** A serialization error means a non-serializable prop (usually a function or class instance) is being passed from server to client. Pass data instead, or define the behavior inside the client component.
4. **Is the bundle too big?** Look for `"use client"` markers that are higher in the tree than they need to be. Each one drags its whole import subtree into the browser.

The high-value pitfalls, each tied to the section that explains it:

Marking a component `"use client"` "just in case," or high up the tree, ships its entire subtree of code to the browser and discards most of RSC's benefit. Push the directive to the interactive leaf (Sections 2 and 4).

Believing `"use server"` makes a component a Server Component. It does not; Server Components are the default and have no directive, while `"use server"` marks Server Functions (Sections 3 and 8).

Believing `"use client"` means "runs only in the browser." It actually marks the client-bundle boundary, and such components still render to HTML on the server first (Section 4).

Trying to pass a function (like an event handler) as a prop from a Server Component to a Client Component. Functions are not serializable; define handlers inside the client component (Section 5).

Trying to `import` and render a Server Component from inside a Client Component. The boundary is one-directional; use the `children` pattern to pass server content down instead (Section 5).

Forgetting that a Server Function is a real, callable network endpoint, and skipping input validation and authorization on it (Section 8).

Putting a data fetch in a Client Component's `useEffect` out of habit, when a Server Component could fetch it directly during render with no spinner and no API route (Sections 1 and 3).

**The whole thing in one paragraph.** React Server Components split your tree into a server region and a client region, divided by the `"use client"` boundary that the bundler resolves at build time. Server Components run once on the server, ship zero JavaScript, can `await` data and touch server-only resources, but cannot be interactive. Client Components are shipped to the browser, render to HTML on the server first and then hydrate to become interactive, and are where the entire rendering engine from the companion guide still applies. The server describes its rendered output as a streamable RSC payload containing plain rendered data plus module references where client components go; the browser assembles the final tree from that payload plus the client component code. Props crossing the boundary must be serializable, which is why you pass data rather than functions, and why the `children` pattern is how server content lives inside a client shell. Server Functions marked `"use server"` let client code call server logic as if it were a local function, really a network round-trip, collapsing API boilerplate for mutations. RSC is a layer that decides where components run and how their output reaches the browser; reconciliation is still the engine that processes the result.

> **Try it.** Audit one real page in your Next.js app. For each component, mark which side of the boundary it is on and whether it needs to be there. Move at least one `"use client"` deeper, or convert one client-fetching component to a server component, and check the bundle and network tabs before and after.

**You've got this if** you can take a confusing RSC error and immediately ask "which side of the boundary is this, and is it doing something only the other side can do?"

---

## 11. Further reading

These are the canonical current sources, with notes on how each relates to this guide.

**Official Server Components reference, at https://react.dev/reference/rsc/server-components .** The authoritative description of Server Components, kept current in the React 19 line. It is also where the React team states the stability boundary directly: the user-facing model is stable, but the bundler-facing internal APIs are not semver-stable within 19.x, so pin your React version. Maps to Sections 1 through 3.

**Official `"use client"` and `"use server"` directive references, on react.dev under the RSC section.** Read these for the precise meaning of each directive. They are the cure for the two biggest misconceptions in this whole topic (Sections 4 and 8).

**The `use` hook reference, at https://react.dev/reference/react/use .** The modern way to read promises and context during render, used on both sides of the boundary. Connects this guide to Section 15 of the rendering guide.

**Server Functions and the React 19 form hooks** (`useActionState`, `useFormStatus`, `useOptimistic`), documented on react.dev. Read these when you start handling real mutations and forms (Section 8).

**Your framework's docs (almost certainly Next.js App Router).** Because RSC only runs through a framework, the Next.js documentation on Server and Client Components, data fetching, and Server Actions is where the concepts here become concrete commands and file conventions. Read the React docs for the *why* and the framework docs for the *how*.

A good loop, same as the other guide: read the relevant section here for the map, then the primary source for depth, then come back and reread. The React docs go deep on one piece; this guide gives you the boundary-shaped mental model that tells you where each piece fits.

---

*Part of a series with the rendering and reconciliation guide. Same method: finish pass 1 first, let real work pull you into the deep parts, and remember that RSC only truly makes sense when you run it through your framework. The user-facing model here is stable in React 19; the deepest wire-format details are framework-facing internals that can shift within 19.x, so understand the shapes and pin your versions.*
