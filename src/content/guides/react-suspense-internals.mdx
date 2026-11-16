---
title: "React Suspense Internals"
description: "How promises suspend rendering, boundaries reveal content, retries work, and transitions prevent jarring fallbacks."
category: "Internals"
readTime: "45 min read"
date: "May 2026"
publishedAt: "2026-05-01"
order: 9
series: "react-internals"
---

> Current as of React 19.2.x (latest patch 19.2.6, May 2026). Suspense for data fetching and the `use` API are stable in the React 19 line. `SuspenseList` is still experimental (exposed only as `unstable_SuspenseList`), and that is flagged where it appears. The React 19 "pre-warming for suspended trees" behavior and the transition/throttling behaviors were verified against current sources and noted inline. This is a Track A engine-internals guide.

> **What this guide builds on.** This is the dedicated Suspense guide, and it is the promise side of the throw-and-unwind machinery introduced in the **Error Boundaries and resilience guide**: read that guide's Section 10 first if you can, because this one assumes the shared mechanism (a component throws, React unwinds to the nearest boundary) and goes deep on what happens when the thrown value is a _promise_. From the **rendering and reconciliation guide** it uses the render and commit phases, fibers, concurrent rendering, and the high-level Suspense introduction. From the **Scheduler and Lanes guide** it uses retry lanes and transition lanes (how a resolved promise schedules a re-render, and how transitions get a low-priority lane). From the **Data Fetching guide** it uses `use()` and `useSuspenseQuery` and the caching requirement. From the **Hooks and Effects guide** it uses `useTransition` and `useDeferredValue`. It is pure React. The _streaming SSR_ and _selective hydration_ parts of Suspense are deliberately scoped out and left to the framework-coupled Hydration and SSR Internals guide (Section 12 says what belongs there). The per-section **Prereqs** lines name what each section needs, drawn from earlier sections here, the other guides, and outside knowledge (promises and thenables, dynamic `import()` for code splitting, and caching).

## Read this first

Same method as the other guides.

**You are not meant to absorb this in one sitting.**

### Pass 1, one relaxed sitting (about 25 minutes)

Read only **"The itch"** and **"The short version"** of each section.

You will come out understanding what "suspending" actually means (throwing a promise), how Suspense recovers when the promise resolves (a retry), where to place boundaries and how nesting controls the reveal, the React 19 sibling pre-warming behavior, why fallbacks sometimes do not appear (throttling) and how transitions stop fallbacks from hiding content you can already see.

That is the whole map, and the transition behavior (Section 9) alone will fix the most common Suspense frustration.

### Pass 2, driven by real work

When a real problem appears (an infinite loading loop, a fallback flashing, a navigation that blanks content behind a spinner, a waterfall you did not expect), come back and read the deep part of the matching section.

### Pass 3, when curious

The further-reading section points at the primary sources and the files in React's own code where suspending, retrying, and throttling live.

Each section opens with a one-line **Prereqs** note.

Sections that need nothing past basic React and promises say so.

### Two rules that multiply everything

1. **Run the experiments.** Each section ends with a short **"Try it."** Suspense is best learned by making something genuinely async (a cached promise, a lazy import, a Suspense-integrated query) and watching fallbacks appear, throttle, and get suppressed by transitions.
2. **Trust the order.** The sections build one picture: what suspending is, the shared mechanism, how to suspend, how the retry works, placement and nesting, the sibling and throttling behaviors, the all-important transition interaction, the error-boundary pairing, and the experimental and SSR edges. Here is the spine:

```
   Suspending = throwing a promise; the boundary shows a fallback   (1, 2)
            │
   How you suspend (use, lazy, libraries) and how the retry recovers  (3, 4)
            │
   Placement, nesting, sibling pre-warming, throttling                (5, 6, 7, 8)
            │
   Transitions stop fallbacks from hiding revealed content            (9)   ◀── the key practical behavior
            │
   Pairing with error boundaries; experimental + SSR edges            (10, 11, 12)
            │
   Debugging, the source                                               (13, 14)
```

You do not need to finish this guide to benefit from it.

Finish pass 1 and you are already ahead.

---

## 1. What Suspense is, and what suspending means

Prereqs: basic React.

Outside React: a promise (a value that will be available later), and the idea of a loading state.

### The itch

You wrap something in `<Suspense fallback={<Spinner />}>` and it shows the spinner until the content is ready, with no `isLoading` state, no `useEffect`, no conditional rendering.

It feels like magic: the child component just...

renders, and somehow React knows it is not ready and shows the fallback.

The magic is a specific mechanism (a component _throws a promise_), and understanding it makes all of Suspense's behavior predictable.

### The short version

`<Suspense>` is a boundary that shows a `fallback` while something below it is not ready to render, and shows the real content once it is.

"Not ready" has a precise meaning: a component _suspends_ by _throwing a promise_ during render (a promise representing the thing it is waiting for, like data or lazy-loaded code).

React catches that thrown promise, shows the nearest `<Suspense>` boundary's fallback, and, when the promise resolves, retries rendering the component, which now succeeds and replaces the fallback.

So Suspense is a declarative loading-state mechanism built on "throw a promise to say I am not ready yet."

### How it actually works

The declarative experience is the selling point: instead of manually tracking a loading state and conditionally rendering a spinner (the `const [isLoading, setIsLoading] = useState(true)` pattern the Data Fetching guide calls the wrong tool for server state), you wrap a region in a boundary and declare its loading UI once:

```jsx
<Suspense fallback={<Spinner />}>
    <Profile />{" "}
    {/* if Profile is not ready, the Spinner shows; when ready, Profile shows */}
</Suspense>
```

`<Profile />` does not return a spinner or check a loading flag.

It just tries to render, using its data as if the data were already there.

If the data is not ready, `Profile` _suspends_, and the `<Suspense>` boundary shows the `Spinner`.

When the data arrives, `Profile` renders for real.

The loading logic lives in the boundary (the `fallback`), not scattered through the component, which is why Suspense is described as _declarative_ loading: you declare "while anything in here is not ready, show this fallback."

The crucial mechanism, the one that makes everything else make sense, is what "suspends" means precisely: **a component suspends by throwing a promise during render.** When a component cannot render yet because it is waiting on something asynchronous, it does not return a loading UI.

It _throws_ a promise representing what it is waiting for (Section 3 covers the ways this happens, including the `use` hook that does it for you).

Throwing during render is the same act that triggers error boundaries (the Error Boundaries guide), except the thrown value is a _promise_, not an `Error`.

React catches the thrown promise (Section 2), recognizes it as "this component is not ready, here is the thing it is waiting for," and responds by showing the nearest `<Suspense>` boundary's fallback.

So a Suspense fallback appears precisely when some component below the boundary threw a promise during render.

And the recovery is the other half: because a promise _will eventually resolve_, React attaches a callback to the thrown promise, and when it resolves, React _retries_ rendering the suspended component (Section 4).

On the retry, the thing it was waiting for is now available, so the component renders successfully, and React replaces the fallback with the real content.

So a Suspense fallback is _temporary_: shown while a promise is pending, removed when it resolves and the retry succeeds.

This temporariness is the key difference from an error boundary's fallback (which is permanent until reset), and it follows directly from the thrown value being a promise (which resolves) rather than an error (which does not fix itself).

So the whole model, in one breath: a component that is not ready throws a promise.

React catches it and shows the nearest `<Suspense>` boundary's fallback.

When the promise resolves, React retries and shows the real content.

Everything else in this guide (where to put boundaries, how nesting reveals content, how siblings behave, how transitions avoid hiding content) is a consequence or refinement of this one mechanism.

The "magic" of a component just rendering and React knowing it is not ready is exactly this: the component threw a promise, and React understood that as "not ready yet."

### Try it

> Use a Suspense-integrated data source (the simplest is `React.lazy` for a component, Section 3, or `useSuspenseQuery` if you use TanStack Query) inside a `<Suspense fallback={<Spinner />}>`. Watch the spinner show while loading and the content replace it when ready, with no `isLoading` anywhere in your component. Then, conceptually, note that the component "suspended" by throwing a promise that React caught. Seeing the declarative loading with no loading state is the feature. Knowing it is a thrown promise is the mechanism.

### You've got this if

You can explain what "suspending" means (throwing a promise during render) and what a `<Suspense>` boundary does in response (show the fallback, then retry when the promise resolves).

---

## 2. The shared machinery: throw a promise, unwind to the nearest boundary

Prereqs: Section 1, plus the Error Boundaries guide's unwind mechanism (Sections 5 and 10), recapped here so this guide stands alone.

### The itch

Suspense and error boundaries feel related (both involve a boundary catching a thrown thing and showing a fallback), and they are: the same React mechanism powers both.

If you read the Error Boundaries guide, this is the payoff.

If you did not, here is the shared backbone you need.

### The short version

When React is rendering and a component throws, React catches the thrown value in its work loop and _unwinds_ up the fiber tree (React's internal component tree) to the nearest boundary that can handle what was thrown.

If the thrown value is an `Error`, it unwinds to the nearest _error boundary_ and shows a permanent fallback.

If the thrown value is a _promise_ (a thenable), it unwinds to the nearest _`<Suspense>` boundary_ and shows that boundary's fallback _temporarily_, attaching a retry for when the promise resolves.

Same unwind, same "find the nearest boundary up the tree," distinguished only by the thrown value's type and the follow-up.

This guide is the promise branch.

### How it actually works

Here is the shared mechanism, recapped so this guide is self-contained (the Error Boundaries guide has the full treatment).

React renders via a work loop that processes the fiber tree one component at a time.

A _fiber_ is React's internal object for a component, and fibers are linked into a tree with each fiber pointing to its parent (its `return` pointer).

When rendering a component throws, React does not let the throw escape to the browser.

It catches it in the work loop (`throwException` in the source, Section 14) and then _unwinds_: it walks _up_ the fiber tree from the throwing component, following parent pointers, looking for the nearest fiber that can _handle_ the thrown value.

This is exactly like a JavaScript exception bubbling up the call stack to the nearest `try`/`catch`, but over React's fiber tree.

The single most important fact is that this catch-and-unwind is _generic over what was thrown_.

When React catches the thrown value in `throwException`, it inspects _what_ it is:

- **If the thrown value is a promise** (more precisely a _thenable_, anything with a `.then` method): React interprets this as "this component is not ready. It is waiting on this promise." It unwinds to the nearest **`<Suspense>` boundary** and shows that boundary's `fallback`. Then, because the promise will resolve, it attaches a callback to the promise so that _when it resolves_, React schedules a retry (Section 4). The fallback is _temporary_.
- **If the thrown value is an `Error`** (or anything not a thenable): React interprets this as "something went wrong." It unwinds to the nearest **error boundary** and shows its fallback, with no retry, because an error will not resolve on its own. The fallback is _permanent until reset_. This is the Error Boundaries guide's territory.

So Suspense and error boundaries are _one mechanism_ with a branch on the thrown value's type.

The unwind is the same (walk up to the nearest boundary of the matching kind), the "show a fallback" is the same, and only two things differ: _which_ boundary the unwind looks for (a `<Suspense>` for a promise, an error boundary for an error), and _what happens next_ (a promise gets a retry when it resolves, an error stays caught).

This is why a component can be wrapped in _both_ a `<Suspense>` and an error boundary (Section 10): each catches its own kind of thrown value from the same subtree, the promise going to Suspense (loading) and the error going to the error boundary (failed).

Two consequences worth drawing out now, both direct parallels to error boundaries:

#### The nearest boundary catches

Because the unwind walks _up_ and stops at the first matching boundary, the `<Suspense>` that catches a suspension is the _nearest_ one _above_ the suspending component.

A `<Suspense>` that is a sibling or a descendant of the suspending component does not catch it.

This is what makes boundary _placement_ (Section 5) meaningful: where you put a `<Suspense>` determines which suspensions it catches and therefore what region shows a fallback.

#### The suspended subtree's in-progress work is set aside

When React unwinds to the Suspense boundary, the partially-rendered work of the suspended subtree is not committed.

React shows the fallback instead.

When the retry happens, React renders the subtree again from the boundary.

This matters for understanding sibling behavior (Section 7) and why suspending is "render threw, so we did not finish this subtree."

This section is deliberately the bridge from the Error Boundaries guide.

Everything that follows (suspending, retrying, placement, throttling, transitions) is the _promise branch_ of this shared machinery developed in full.

If the unwind feels shaky, the Error Boundaries guide's Section 5 is the place to solidify it.

Here, hold "a thrown promise unwinds to the nearest `<Suspense>` boundary, shows its fallback, and sets up a retry," and the rest follows.

### Try it

> Wrap a component in both a `<Suspense fallback={<Loading />}>` and an error boundary. Make it sometimes suspend (throw a promise via a lazy import or a Suspense query) and sometimes throw an `Error`. Watch the _Suspense_ boundary catch the suspension (show `Loading`, then reveal content) and the _error_ boundary catch the error (show the error fallback, permanently). The two boundaries catching the two thrown values from one subtree is the shared mechanism made visible.

### You've got this if

You can explain how a thrown promise and a thrown error use the same unwind mechanism, and what differs (which boundary, and whether there is a retry).

---

## 3. How a component suspends: use, lazy, and thrown promises

Prereqs: Sections 1 and 2, plus the Data Fetching guide on `use()` and `useSuspenseQuery`, recapped here.

Outside React: dynamic `import()` for code splitting, and that a promise created in a function runs fresh each call unless cached.

### The itch

Section 1 said components suspend by "throwing a promise," but you do not write `throw promise` in your components.

So how do components actually suspend in real code?

Through `use()`, `React.lazy`, and Suspense-integrated libraries, all of which throw promises for you.

Knowing which to use, and the caching requirement, is what makes Suspense work instead of looping forever.

### The short version

You rarely throw a promise by hand.

You use something that does it for you.

`use(promise)` (stable in React 19) reads a promise during render and suspends if it is pending.

`React.lazy(() => import('./X'))` suspends while the component's code chunk loads.

Suspense-integrated data libraries (`useSuspenseQuery` in TanStack Query, Relay, and others) throw promises internally when their data is not ready.

All of them ultimately _throw a thenable_ (Section 2).

The critical requirement across all of them: the promise must be _stable_ (cached, the same promise across renders for the same input), not created fresh on every render, or the component suspends forever in a loop.

### How it actually works

"Throw a promise" is the _mechanism_ (Section 1).

In practice you reach for one of a few APIs that perform that throw for you, so you never literally write `throw somePromise`.

#### `use(promise)` (the modern, stable way)

React 19 stabilized the `use` hook (Data Fetching guide), which reads the value of a promise _during render_: if the promise is resolved, `use` returns its value.

If the promise is still pending, `use` _suspends_ (throws the promise, triggering the nearest `<Suspense>`).

So:

```jsx
function Profile({ userPromise }) {
    const user = use(userPromise); // suspends if pending; returns the user if resolved
    return <h1>{user.name}</h1>;
}
```

When `userPromise` is pending, `use` suspends and the boundary shows its fallback.

When it resolves, the retry (Section 4) re-renders `Profile`, `use` returns the user, and the real UI shows.

`use` is the blessed primitive for reading async values in render, and unlike other hooks it can be called conditionally and is the intended way to consume promises with Suspense.

(It also reads context, but the promise-reading is the Suspense-relevant use.)

#### `React.lazy` (code splitting)

`React.lazy(() => import('./HeavyComponent'))` creates a component that, the first time it renders, triggers the dynamic import of its code chunk and _suspends_ while that chunk loads, showing the nearest `<Suspense>` fallback.

When the chunk arrives, it renders.

This is the code-splitting use of Suspense (the Performance guide's lazy loading), and it is the most common first encounter with Suspense, because it needs no data library:

```jsx
const HeavyComponent = lazy(() => import("./HeavyComponent"));
<Suspense fallback={<Spinner />}>
    <HeavyComponent /> {/* suspends while its chunk loads */}
</Suspense>;
```

#### Suspense-integrated data libraries

Libraries like TanStack Query (`useSuspenseQuery`, Data Fetching guide), Relay, and others integrate with Suspense by throwing promises internally when their data is not ready.

You call `useSuspenseQuery(...)` and treat the data as always-present.

Under the hood, if the data is not cached yet, the library suspends (throws the fetch promise), and the boundary shows the fallback until the fetch resolves.

This is the production-grade way to do Suspense for data, because the library handles the caching requirement below.

That caching requirement is the thing that bites everyone, so it deserves its own emphasis.

**The promise a component suspends on must be stable across renders for the same input**, meaning the same promise object must be returned each time the component renders for the same data, not a freshly-created promise every render.

Here is why: when the promise resolves, React _retries_ rendering the component (Section 4).

On the retry, the component runs again.

If it creates a _new_ promise on that render (a new `fetch(...)` each time), then `use` sees a _new_ pending promise and suspends _again_, which triggers another fallback, and when that resolves another retry creates another new promise, forever.

The component suspends in an infinite loop, never resolving, because every render starts a brand-new pending promise.

The fix is that the promise must be _cached_: the same input must yield the same promise object across renders, so that on the retry the component reads the _already-resolved_ cached promise and succeeds.

This is exactly what data libraries do (they cache promises by query key), and it is why you should not call `use(fetch(...))` with an inline `fetch` in render, and why raw `use` is usually paired with a promise created _outside_ render (passed as a prop, or from a cache) rather than created inline.

The Data Fetching guide's "server state is a cache" framing is the same point: the cache is what makes the promise stable, which is what makes Suspense terminate instead of loop.

So the practical picture: use `React.lazy` for code splitting (no caching concern, React handles the chunk), use a Suspense-integrated data library for data (it handles promise caching), and use raw `use` when you have a _stable_ promise to read (cached or passed in).

All three throw a thenable under the hood (Section 2).

The difference is ergonomics and who manages the promise's stability.

Get the stability right and Suspense works.

Get it wrong (a fresh promise per render) and you loop forever, which is the number-one Suspense bug (Section 13).

### Try it

> First, `React.lazy` a component and watch it suspend while its chunk loads (Network tab shows the chunk fetch). Then, to feel the caching trap, try `use` with a promise created _inline_ in render (`use(fetchUser(id))`) and watch it loop or refetch endlessly. Then fix it by creating the promise _outside_ render (memoized or from a cache) and watch it resolve once. Causing and fixing the infinite-suspend loop is the most important lesson in this section.

### You've got this if

You can name the three ways components suspend (`use`, `React.lazy`, Suspense data libraries) and explain why the suspended promise must be stable/cached to avoid an infinite loop.

---

## 4. The retry: recovering when the promise resolves

Prereqs: Sections 2 and 3, plus the Scheduler and Lanes guide on retry lanes, recapped here.

Outside React: that a promise's `.then` callback runs when it resolves.

### The itch

A component suspends, the fallback shows, and then, when the data arrives, the real content appears, on its own, with nothing in your code triggering a re-render.

How does React know the promise resolved, and how does it re-render the right thing?

That is the _retry_, and it is the mechanism that makes a Suspense fallback temporary.

### The short version

When a component suspends by throwing a promise, React attaches a callback to that promise (a `.then`) so that _when the promise resolves_, React is notified and schedules a _retry_: a re-render of the suspended subtree, on a dedicated _retry lane_ (from the Scheduler and Lanes guide).

On the retry, the data is now available (the promise resolved), so the component renders successfully instead of suspending, and React replaces the fallback with the real content.

This is why a Suspense fallback is temporary and self-resolving: React listens for the promise and retries automatically.

No re-render in your code is needed because React wired up the promise itself.

### How it actually works

The retry is what distinguishes Suspense from error boundaries (Section 2), and it follows from the thrown value being a _promise_.

When React catches a thrown promise during the unwind (Section 2), it does two things: it shows the nearest `<Suspense>` boundary's fallback (so the user sees a loading state), and it _subscribes to the promise_ by attaching a callback (effectively a `.then` on the thrown thenable, called a "ping" in React's internals).

That callback's job is to tell React "the thing this component was waiting on is now ready," so React knows when to try again.

This subscription is the key: React does not poll or guess.

It listens to the very promise the component threw.

When the promise resolves, the callback fires, and React schedules a _retry_: a re-render of the suspended subtree (from the Suspense boundary down).

This re-render is scheduled on a **retry lane** (recapped from the Scheduler and Lanes guide: lanes are React's priority levels for updates, and retry lanes are a range of lanes dedicated to Suspense retries).

Scheduling the retry on a lane means it goes through the normal scheduling machinery (the scheduler runs it cooperatively, at the retry lane's priority), so a retry is just another prioritized update, not a special out-of-band path.

The Scheduler and Lanes guide's `getNextLanes` will pick up the retry lane and render it like any other pending work.

On the retry render, the situation has changed: the promise the component was waiting on has _resolved_, so when the component runs again and reads that promise (via `use`, or the data library's now-populated cache, Section 3), it gets the resolved value instead of a pending promise, so it _does not suspend this time_.

It renders successfully, producing the real UI, and React commits that in place of the fallback.

The fallback disappears, the content appears, and the cycle is complete.

This is why the fallback is _temporary_: it shows only during the window between the suspension and the retry succeeding.

This also re-illuminates the caching requirement from Section 3 from the retry's perspective.

The retry _re-renders the component_, which means the component's render function runs again.

For the retry to _succeed_ (not re-suspend), reading the async value on the retry must return a _resolved_ value.

If the component reads a _cached_ promise (the same promise that just resolved), it gets the resolved value and succeeds.

If instead the component creates a _new_ promise on the retry render (an inline `fetch`), it reads a _new pending_ promise, suspends again, and the retry "fails" into another suspension, looping forever (the infinite-suspend bug).

So the retry mechanism is exactly why stability matters: the retry only terminates if the thing the component reads on re-render is the now-resolved promise, which requires the promise to be the same (cached) one, not a fresh one.

The retry is the moment where caching pays off or the loop happens.

Two refinements that connect forward.

First, the retry's priority (the retry lane) interacts with transitions (Section 9): when a suspension happens inside a transition, React's handling of the fallback differs, because the transition lane and the retry interact to keep already-revealed content visible.

Second, multiple suspensions resolving close together produce multiple retries, and React's _throttling_ (Section 8) staggers or batches the resulting reveals to avoid a popcorn UI.

Both build on this base mechanism: a resolved promise schedules a retry on a lane, and a successful retry replaces the fallback with content.

So the answer to "how does the content appear on its own" is: React subscribed to the promise the component threw, and when it resolved, React scheduled a retry on a retry lane, which re-rendered the subtree successfully now that the data is available.

The automaticity that feels magical is React listening to the promise and re-rendering when it resolves, all wired up by the act of throwing the promise in the first place.

### Try it

> Suspend a component on a deliberately slow (say, two-second) cached promise, and add a `console.log` in the component body. Watch it log once (suspends), show the fallback, and then log _again_ about two seconds later (the retry, after the promise resolved), this time rendering the content. Seeing the second render fire on its own when the promise resolves is the retry mechanism, visible.

### You've got this if

You can explain how React knows to re-render a suspended component (it subscribed to the thrown promise) and why the retry only succeeds if the component reads a resolved (cached) promise.

---

## 5. Fallback placement and boundary granularity

Prereqs: Sections 2 and 4.

Outside React: the idea of a loading state's scope (how much of the screen is "loading").

### The itch

You put one `<Suspense>` at the top of your page and the whole page shows a single spinner until everything is ready, even the header and nav that had no async data.

Or you put a boundary around every little thing and the screen loads in a jarring sequence of popping fragments.

Where you place boundaries determines the loading experience, and there is a principled way to choose.

### The short version

A `<Suspense>` boundary's fallback covers everything below it that suspends, so _where_ you place boundaries determines _what_ shows a fallback.

A boundary high in the tree means a large region (maybe the whole page) shows one fallback.

Boundaries lower mean smaller, independent regions show their own fallbacks.

The standard pattern is to render an immediate _shell_ (header, nav, layout that needs no async data) outside any boundary, and place boundaries around the _slow subregions_ so each shows a local fallback while the shell is visible immediately.

Match boundaries to _data dependencies_: a region that waits on its own data is a natural boundary.

### How it actually works

Section 2 established that a suspension unwinds to the _nearest_ `<Suspense>` boundary above it.

The design consequence is that a boundary's fallback covers _everything below that boundary that suspends_: if any component in the subtree suspends, the boundary shows its fallback in place of the _whole_ subtree (until the suspensions resolve).

So the boundary defines the _scope_ of a loading state, and choosing placement is choosing how much of the UI shows a fallback together.

The two failure modes from "The itch" are the extremes:

#### Too high (one big boundary)

A single `<Suspense>` wrapping the entire page means that if _anything_ on the page suspends, the _entire page_ shows one fallback, including parts that had no async data (the header, the navigation, the static layout).

The user sees a full-screen spinner and loses all context, even though most of the page could have rendered instantly.

This wastes the parts that were ready and makes the app feel slower than it is.

#### Too low (a boundary around everything)

A boundary around every small piece means each piece shows its own fallback and reveals independently, which can produce a _popcorn UI_: the title pops in, then the sidebar, then a panel, then a list, each at a different moment, causing flicker, layout shift, and uncertainty about whether the page is still loading.

Granularity past the point of meaningful regions fragments the experience.

The principled placement is between these, and it follows from a simple idea: **render the shell immediately, and put boundaries around the slow subregions.** Concretely:

- **Keep the shell outside any boundary.** The parts of the page that need no async data (header, navigation, layout, static content) should render immediately, not behind a fallback. They are not inside a `<Suspense>`, so they never show a loading state. They appear at once, giving the user context and a sense of speed.
- **Wrap each slow subregion in its own boundary.** The parts that wait on async data (a data-driven panel, a feed, a chart) each get a `<Suspense>` with a local fallback (often a skeleton matching the content's shape). Each suspends and shows its local fallback independently while the shell stays visible.

```jsx
<Layout>
    {" "}
    {/* shell: renders immediately, no boundary */}
    <Header />
    <Nav />
    <Suspense fallback={<FeedSkeleton />}>
        <Feed /> {/* slow subregion: local fallback while it loads */}
    </Suspense>
    <Suspense fallback={<SidebarSkeleton />}>
        <Sidebar /> {/* independent slow subregion: its own local fallback */}
    </Suspense>
</Layout>
```

The guiding heuristic for _where_ the boundaries go is **match boundaries to data dependencies**.

A region that depends on its own data fetch is a natural boundary, because it can be ready (or not) independently of other regions, and a local fallback for it is a coherent loading state.

This is the same instinct as the Error Boundaries guide's "match boundaries to independent failure regions" (Section 11), and indeed Suspense boundaries and error boundaries often sit at the _same_ regions, because a region with its own data dependency can both be _loading_ (Suspense) and _failed_ (error boundary).

Regions that share a data dependency, or that should appear together, can share a boundary (so they reveal together rather than popping in separately, which Section 6's nesting and Section 8's throttling also address).

So fallback placement is an _architecture_ decision driven by the shape of your data dependencies and the experience you want: shell renders immediately, slow regions get local fallbacks matching their content, granularity set at "meaningful independent regions" rather than per-element.

Place boundaries where a region can sensibly load on its own, and you get an app that shows its structure instantly and fills in each region with a coherent loading state, instead of one big spinner or a fragmented popcorn reveal.

### Try it

> Build a page with a static header and two data-driven panels. First wrap the whole page in one `<Suspense>` and watch the entire page (header included) show one fallback until everything loads. Then move the boundaries: keep the header outside any boundary and wrap each panel in its own `<Suspense>` with a skeleton, and watch the header appear instantly while each panel shows its own skeleton and fills in independently. Feeling the difference in loading experience is the placement lesson.

### You've got this if

You can explain how boundary placement controls the scope of a loading state, and why the shell-renders-immediately-with-boundaries-around-slow-regions pattern beats both one big boundary and a boundary around everything.

---

## 6. Nesting boundaries and the reveal sequence

Prereqs: Section 5.

Outside React: nothing new.

### The itch

You nest `<Suspense>` boundaries (one inside another) and the content reveals in stages: the outer region appears first, then the inner region fills in.

You want to understand how nesting controls that staged reveal, so you can design a loading sequence rather than getting an accidental one.

### The short version

Nesting `<Suspense>` boundaries creates a _staged reveal_: an outer boundary can reveal its content (showing an inner boundary's fallback in place of the still-loading inner content) before the inner content is ready, so the user sees the outer structure first and the inner detail fills in after.

This lets you design a sequence: show the page frame, then the section, then the detail, each behind its own boundary, revealing as each level's data resolves.

Nesting is how you express "reveal this much as soon as you can, and fill in the rest progressively," rather than waiting for everything.

### How it actually works

Boundaries nest like the tree they wrap, and the reveal follows the nesting.

Consider an outer boundary whose content includes an inner boundary:

```jsx
<Suspense fallback={<PageSkeleton />}>
    <PageFrame>
        {" "}
        {/* needs the page's own data */}
        <Suspense fallback={<DetailSkeleton />}>
            <Detail /> {/* needs additional, slower data */}
        </Suspense>
    </PageFrame>
</Suspense>
```

Here is how the staged reveal works.

When this first renders, suppose both `PageFrame`'s data and `Detail`'s data are pending.

`PageFrame` suspends, which unwinds to the _outer_ boundary (the nearest above it), so the outer boundary shows `PageSkeleton`.

At this point the inner boundary is not even relevant yet, because its parent has not rendered.

When `PageFrame`'s data resolves, the outer boundary retries (Section 4) and `PageFrame` renders successfully.

Now its children render, including the inner `<Suspense>` and `Detail`.

If `Detail`'s data is still pending, `Detail` suspends, which unwinds to the _inner_ boundary (now the nearest above it), so the inner boundary shows `DetailSkeleton` while the rest of `PageFrame` is visible.

When `Detail`'s data resolves, the inner boundary retries and `Detail` renders.

The user experiences a _sequence_: page skeleton, then the page frame with a detail skeleton inside it, then the full page with the detail filled in.

The key mechanism is that **an outer boundary can reveal its content while an inner boundary is still showing its fallback.** Once the outer boundary's _own_ suspension resolves (its directly-needed data is ready), it reveals its content, and any _inner_ boundaries within that content show _their_ fallbacks for _their_ still-pending content.

The outer region does not wait for the inner region.

It reveals as soon as its own level is ready, and the inner region fills in independently behind its own boundary.

This is what produces progressive disclosure: each level of nesting reveals as soon as its level's data is ready, deeper levels filling in after.

This gives you a _design tool_ for the loading sequence.

By choosing the nesting, you choose the order and granularity of the reveal:

- **A shell with nested detail** (the example above) reveals the frame first, then the detail, which feels fast because the user sees structure immediately and watches detail arrive, rather than staring at one spinner until everything is ready.
- **Deeper nesting** creates more stages: page, then section, then item detail, each behind a boundary, each revealing as its data resolves. This suits genuinely layered data (the page needs one fetch, a section needs another that depends on the first, the detail needs a third).
- **Flatter structure** (sibling boundaries rather than nested, Section 5) reveals regions independently rather than in a containment sequence. Nesting specifically expresses "this is _inside_ that, and the outer can show before the inner."

The trade-off, which connects to Sections 5 and 8, is that more nesting means more stages, and too many stages can feel like the popcorn UI (Section 5) where content keeps popping in.

So nest to match the _genuine_ layering of your content and data (frame contains section contains detail), not arbitrarily, and lean on throttling (Section 8) and reveal coordination to keep a multi-stage reveal feeling smooth rather than staccato.

Nesting is the right tool when there is a real containment relationship and a real benefit to showing the outer level before the inner one is ready.

It is the wrong tool when applied so finely that the UI becomes a sequence of unrelated pops.

So nested boundaries express a _progressive reveal_: each boundary reveals its level as soon as that level's data is ready, with deeper boundaries showing their fallbacks meanwhile, letting you design a staged loading experience (shell, then section, then detail) instead of an all-or-nothing wait.

The mechanism is just Section 2's "unwind to the nearest boundary" applied at each level of nesting: a suspension is caught by the nearest enclosing boundary, so deeper suspensions are caught deeper, producing the staged reveal.

### Try it

> Nest two boundaries as in the example, with the outer content on a fast (half-second) promise and the inner content on a slow (two-second) promise. Watch the reveal sequence: outer skeleton, then the outer content with the inner skeleton inside it, then the inner content. Then make the outer data slower than the inner and observe that the inner cannot reveal until the outer does (because the inner does not render until its parent renders). Seeing the staged reveal follow the nesting is the lesson.

### You've got this if

You can explain how nested boundaries produce a staged reveal (an outer boundary reveals its content while an inner boundary still shows its fallback) and how to use nesting to design a loading sequence.

---

## 7. Sibling behavior and pre-warming

Prereqs: Sections 2 and 4, plus the Data Fetching guide's note that fetches should run in parallel where possible.

Outside React: a request waterfall (sequential fetches that could have been parallel).

### The itch

You put two data-fetching components as siblings inside one `<Suspense>`, expecting their fetches to run in parallel.

Depending on React version, you might get a _waterfall_ (one fetch starts only after the other finishes) instead.

React 19's behavior here changed (and was briefly a regression), and the resolution, "pre-warming," is worth understanding so your siblings fetch in parallel.

### The short version

When two components are siblings inside one `<Suspense>` and the first suspends, the question is whether React still renders the second (firing its fetch) or stops.

If React stopped, the second component's fetch would not start until the first resolved, creating a _waterfall_.

React 19, after a brief regression where it did waterfall, settled on **pre-warming for suspended trees**: when a tree suspends, React continues to _pre-render_ the suspended tree's siblings in a throwaway pass purely to trigger their async work, so their fetches start in _parallel_.

The practical result in the React 19 line: siblings in the same boundary fetch in parallel, as you would want.

### How it actually works

The scenario is two siblings that each fetch, inside one boundary:

```jsx
<Suspense fallback={<Spinner />}>
    <FeedA /> {/* fetches A */}
    <FeedB /> {/* fetches B */}
</Suspense>
```

When React renders this and `FeedA` suspends (its fetch A is pending), React has a choice about `FeedB`: keep rendering `FeedB` (so fetch B _starts_), or stop because the boundary is going to show its fallback anyway.

This choice determines whether A and B fetch in parallel or in a waterfall, and it is exactly the subtle behavior that changed across React versions.

The history, because it explains the current behavior and the confusion around it:

- **Legacy Suspense (React 16/17) and React 18:** when one sibling suspended, React would _continue_ rendering the other siblings, to "collect" all their thrown promises before showing the fallback. The side effect was that the siblings' fetches _started_ (B's fetch fired even though A suspended), so siblings fetched in _parallel_. Developers relied on this to avoid waterfalls by composing fetching components as siblings in a boundary.
- **React 19 release candidate (the regression):** an early React 19 build changed this so that when a component suspended, React _bailed out_ immediately without continuing to render the siblings, reasoning that pre-rendering siblings of a tree that is going to show a fallback is "pure overhead" (the rendered output will be discarded anyway). The unintended consequence was a _waterfall_: `FeedB`'s fetch did not start until `FeedA` resolved and the tree re-rendered, because React stopped at `FeedA`'s suspension and never reached `FeedB`. This caused notable community pushback, because it silently turned parallel fetches into sequential ones.
- **React 19 stable (the resolution): pre-warming for suspended trees.** React 19's stable release added "pre-warming for suspended trees" (listed in the React 19 release notes under improvements to Suspense). The idea reconciles the two concerns: React shows the fallback promptly (it does not need the siblings' _output_, which is the perf insight), but it _also_ continues to render the suspended tree's siblings in a separate _pre-warm_ pass whose output is _discarded_, purely to _trigger their async work_ (start their fetches). So the siblings' fetches still fire in parallel (no waterfall), but React is not pretending to use their rendered output. The pre-warm render is explicitly a throwaway pass to kick off side effects like data requests. This is the behavior in the React 19.2 line.

So the current, accurate model: when a component in a `<Suspense>` suspends, React shows the boundary's fallback, and _pre-warms_ the rest of the suspended tree by rendering its siblings in a discarded pass to start their async work.

The practical upshot for you is the good one: **siblings inside the same boundary fetch in parallel**, because pre-warming starts their fetches even though one of them suspended first.

You do not get a waterfall from composing fetching siblings in a boundary, which is what most people want and expect.

A couple of practical notes that follow.

First, this is _why_ placing parallel-fetching components as siblings in one boundary is a valid pattern for parallel data loading (the React docs show exactly this for "reveal together while fetching in parallel"): the pre-warm ensures parallelism, and the single boundary makes them reveal together.

Second, if you _do_ observe a waterfall, the causes are usually either a genuinely _dependent_ fetch (B's fetch needs A's result, which is a real data dependency, not a Suspense issue) or a _boundary-placement_ issue (the components are not actually siblings in the way you think, or a nested boundary changes the timing, Section 6).

The pre-warming behavior handles the independent-siblings case for you.

Dependent fetches are inherently sequential regardless.

So sibling behavior comes down to: one sibling suspending does not stop the others' fetches, because React 19 pre-warms the suspended tree's siblings (a discarded render that triggers their async work), preserving parallel fetching.

The brief React 19 RC regression that waterfalled is gone in stable.

The pre-warming improvement is the current, intended behavior.

### Try it

> Put two components that each fetch (on independent cached promises) as siblings in one `<Suspense>`, and watch the Network tab: both fetches should start at nearly the same time (parallel), not one after the other (waterfall), thanks to pre-warming. Then make B's fetch depend on A's result (a genuine data dependency) and watch it necessarily waterfall, which is correct, because that dependency is real, not a Suspense artifact.

### You've got this if

You can explain why sibling components in one boundary fetch in parallel in React 19 (pre-warming renders the suspended tree's siblings in a discarded pass to start their fetches), and what the brief React 19 RC regression was.

---

## 8. Fallback throttling: avoiding the popcorn UI

Prereqs: Sections 2, 4, and 6.

Outside React: that a loading indicator flashing for a few dozen milliseconds is more jarring than no indicator.

### The itch

Sometimes a fallback you expected to see does not appear (the content just shows up), and sometimes a sequence of nested fallbacks does not pop in one-by-one as fast as the data resolves.

React is deliberately _throttling_ fallbacks to avoid visual thrash, and knowing this stops you from thinking your fallbacks are broken.

### The short version

React throttles the appearance of fallbacks to avoid a jarring UI.

Two behaviors fall out of this: if content resolves _quickly_ (faster than a small threshold), React may _skip showing the fallback at all_, because a spinner that flashes for 30 milliseconds is worse than no spinner.

And when multiple nested or successive boundaries resolve in quick succession, React _staggers or batches_ their reveals so you do not get a rapid sequence of pops (the popcorn UI).

This throttling is built in and intentional.

It trades a little reveal latency for a smoother, less flickery experience.

### How it actually works

A naive Suspense implementation would show a fallback the instant a component suspends and remove it the instant the promise resolves.

That would produce two kinds of visual thrash that the React team deliberately designed against:

#### Fallback flashing on fast resolution

If a component suspends but its promise resolves very quickly (tens of milliseconds, a warm cache, a fast network), showing the fallback the instant it suspends means the fallback _flashes_: it appears and disappears so fast the user perceives a flicker, which feels broken and is more distracting than if no fallback had appeared at all.

So React _throttles_ the appearance of fallbacks: it does not necessarily show a fallback the very instant a component suspends.

If the suspension resolves within a short window, React can _skip showing the fallback entirely_, letting the content appear directly without an intervening flash.

This is why you sometimes do not see a fallback you "should" have: the content resolved fast enough that React suppressed the flash.

(This interacts with transitions, Section 9, where React more aggressively avoids showing fallbacks for already-revealed content.)

#### Popcorn reveals on staggered resolution

When several boundaries (especially nested ones, Section 6, or several siblings) resolve at slightly different times, revealing each the instant its promise resolves produces a _popcorn UI_: content pops in piece by piece in rapid succession, causing flicker and layout shift and an unsettled feeling.

React's _placeholder throttling_ (a term from the React working group) addresses this by _staggering or batching_ the reveals: rather than revealing each boundary the instant it is ready, React coordinates the reveals so they happen in a smoother, less staccato way, reducing the number of distinct visual updates the user perceives.

The React 18 working group described this as throttling the appearance of "nested, successive placeholders" to reduce UI thrash, and it remains part of how Suspense reveals work.

The reasoning behind both is a UX principle: _the cost of a loading indicator is not just the wait, it is the visual disruption of showing and hiding it._ A fallback that appears and vanishes in 30 milliseconds, or a screen that pops in five fragments over 200 milliseconds, is a worse experience than a slightly-delayed but smooth reveal.

So React trades a small amount of _reveal latency_ (it might wait a beat before showing a fallback, or hold a ready boundary briefly to reveal it together with others) for _smoothness_ (no flashing, no popcorn).

This is a deliberate design choice baked into concurrent Suspense, not something you configure per boundary.

A few practical consequences:

- **Do not be alarmed if a fallback does not show for fast content.** That is throttling suppressing a flash, working as intended. If you _always_ want a fallback to show, the content is resolving fast enough that the user does not need one.
- **A multi-region reveal will feel smoother than the raw resolution timing suggests**, because React coordinates the reveals rather than firing each instantly. This is React doing work to make your staged reveal (Section 6) feel less staccato.
- **This is why the popcorn UI is a _design_ concern, not just a timing one.** Throttling mitigates it, but it does not eliminate it if you have many independent boundaries resolving over a wide time range. That is where boundary placement (Section 5), nesting (Section 6), revealing-together patterns, and (experimentally) SuspenseList (Section 11) come in. Throttling smooths small timing differences. Large structural fragmentation is still your design to manage.

React 19.2 also extended throttling-adjacent coordination to _server rendering_ with "Suspense batching," which batches the reveals of streamed boundaries during SSR for a smoother streamed experience.

That is part of the streaming story scoped to the Hydration guide (Section 12).

The client-side throttling described here is the part relevant to ordinary Suspense use.

So fallback throttling is React deliberately _not_ showing every fallback the instant it could and _not_ revealing every boundary the instant it resolves, in order to avoid flashing and popcorn.

It trades a little latency for smoothness, it is built in, and it explains both the "missing" fallbacks (fast content, flash suppressed) and the smoother-than-expected multi-region reveals (coordinated reveals).

### Try it

> Suspend a component on a _very fast_ promise (resolve in, say, 20 to 50 milliseconds) and notice the fallback may not appear at all, just the content (throttling suppressed the flash). Then suspend on a clearly slow promise (one second) and confirm the fallback does show (long enough to be worth it). The presence or absence of the fallback based on resolution speed is throttling, observable.

### You've got this if

You can explain why React sometimes does not show a fallback for fast-resolving content, and why it staggers reveals of successive boundaries, both in terms of avoiding visual thrash.

---

## 9. Transitions, useDeferredValue, and avoiding unwanted fallbacks

Prereqs: Sections 2 and 4, plus the Hooks guide on `useTransition` and `useDeferredValue` (Section 15) and the Scheduler and Lanes guide on transition lanes, recapped here.

Outside React: nothing new.

### The itch

You have content on screen (a list of search results, a detail view), the user does something that triggers new data (types a query, clicks a different item), the new data suspends, and the content you were already showing _disappears_, replaced by a fallback spinner, then comes back.

That flash of fallback over content the user was already looking at is jarring, and transitions are how you stop it.

This is the single most important practical Suspense behavior.

### The short version

When an update causes an _already-revealed_ Suspense boundary to suspend again (new data for content that was already showing), React's default is to hide the existing content and show the fallback, which flashes a spinner over content the user was looking at.

Wrapping that update in a _transition_ (`startTransition`, or via `useDeferredValue`) changes this: React keeps showing the _old_ content until the new content is ready, then swaps it in, with _no fallback flash_.

So transitions are how you update or navigate without hiding content behind a spinner.

`isPending` (from `useTransition`) lets you show a subtle "updating" indicator meanwhile.

This is the behavior that makes Suspense pleasant for navigation and filtering.

### How it actually works

This section is the one most likely to fix a real frustration, so it is worth the detail.

The setup: a Suspense boundary has _already revealed_ its content (the user is looking at search results, or a detail panel).

Then an update happens that makes that boundary's content suspend _again_, because it now needs _new_ data (a new search query, a different selected item).

What should React do with the _currently-visible_ content while the new data loads?

#### Without a transition (the default), React hides the content and shows the fallback

When the already-revealed content suspends again, the default behavior is to treat it like any suspension: unwind to the boundary, show the fallback.

But the content was _already there_, so this means _removing_ visible content and replacing it with a spinner, then bringing content back when the new data resolves.

The user sees: results, then spinner (results gone), then new results.

That flash of fallback over content they were already viewing is jarring and feels like a regression from what they were seeing.

This is the default because React cannot know, in general, that hiding the content is undesirable.

For an _initial_ load showing the fallback is right (there was nothing there yet), but for a _re-suspension of revealed content_ it usually is not.

#### With a transition, React keeps the old content visible until the new content is ready

When you mark the update as a _transition_, you are telling React "this is a transition from one valid state to another. Do not show a fallback for content that is already revealed, just keep showing the current content until the new state is ready." React then does exactly that: when the boundary re-suspends inside a transition, React _does not hide the existing content_.

It keeps the old content on screen, renders the new content in the background (on a transition lane, recapped from the Scheduler and Lanes guide: a low-priority, interruptible lane), and only swaps to the new content once it is ready.

No fallback flash.

The user sees the old content, then the new content, with no spinner-over-content in between.

This is sometimes called a "delayed transition": the visual transition to the new state is _delayed_ until the new state's data has resolved, rather than flashing a loading state.

The two ways to mark the update as a transition (both from the Hooks guide, both producing the same fallback-avoiding behavior):

- **`useTransition` / `startTransition`** for a _state update_ you control: wrap the state update that triggers the new data in `startTransition`, and the resulting suspension is handled as a transition (old content stays until new is ready). `isPending` is true meanwhile, so you can show a subtle inline "updating" indicator (dimming the old content, a small spinner in a corner) without hiding the content:

    ```jsx
    const [isPending, startTransition] = useTransition();
    function selectItem(id) {
        startTransition(() => setSelectedId(id)); // re-suspension keeps old content, no fallback flash
    }
    ```

- **`useDeferredValue`** for a _value_ that drives the suspending content: pass the deferred value to the part that suspends, and React keeps rendering with the _old_ value (showing the old content) while the new value's content renders in the background, swapping when ready. Same fallback-avoiding behavior, expressed as "let this value lag":

    ```jsx
    const deferredQuery = useDeferredValue(query);
    // <Results query={deferredQuery} /> keeps showing old results until new ones are ready
    ```

The mechanism underneath (recapped from the Scheduler and Lanes guide) is that a transition update gets a _transition lane_, a low-priority lane, and React's handling of a re-suspension on a transition lane is specifically to _not_ replace already-revealed content with a fallback, instead keeping the committed content and rendering the new content at the transition priority until it can be swapped in.

So "transitions avoid unwanted fallbacks" is, mechanically, "a re-suspension on a transition lane keeps the old content rather than showing the fallback," which is a deliberate rule in how React commits suspended transitions.

The practical guidance is strong and worth stating as a rule: **for any update that changes what an already-visible Suspense boundary shows (navigation, filtering, tab switches, selecting a different item), wrap it in a transition** (`startTransition` or `useDeferredValue`), so the user keeps seeing the current content until the new content is ready, instead of flashing a fallback.

Reserve the bare fallback (no transition) for _initial_ loads where there is no content yet to preserve.

This single practice is what separates a Suspense app that feels smooth (content stays, updates swap in cleanly) from one that feels flickery (every navigation blanks the content behind a spinner).

It is the most important behavior in this guide to internalize, because the default (flash the fallback) is so often not what you want for updates to revealed content.

One more connection: React 19.2's `<ViewTransition>` (an opt-in API) hooks into exactly these async updates: View Transitions trigger for `startTransition`, `useDeferredValue`, Actions, and a `<Suspense>` revealing from fallback to content, which means the smooth content-swap a transition produces can be animated with a view transition.

That is an additional layer on top of the fallback-avoidance described here.

The core behavior to learn is that transitions keep revealed content visible instead of flashing a fallback.

### Try it

> Build a master-detail view: a list, and a detail panel that suspends on the selected item's data. First, _without_ a transition, click between items and watch the detail panel flash its fallback (the previous detail disappears, spinner, new detail) on every click. Then wrap the selection update in `startTransition` (or drive the detail with a `useDeferredValue` of the selected id) and click between items again: the previous detail stays visible until the new one is ready, with no fallback flash, and `isPending` lets you dim it meanwhile. Feeling that difference is the single most valuable Suspense lesson.

### You've got this if

You can explain why an update to already-revealed content flashes a fallback by default, and how a transition (`startTransition` or `useDeferredValue`) keeps the old content visible until the new content is ready.

---

## 10. Suspense and error boundaries together

Prereqs: Section 2, plus the Error Boundaries guide (the error side of the shared machinery), recapped here.

Outside React: nothing new.

### The itch

An async operation can be _pending_ (loading) or _failed_ (errored), and you want to handle both: a loading fallback while it loads, an error fallback if it fails.

Suspense handles the loading.

Error boundaries handle the failure, and because they share machinery (Section 2), pairing them around the same subtree is the canonical pattern.

### The short version

A subtree that fetches data has two non-success states: _pending_ (still loading) and _failed_ (the fetch errored).

Suspense handles _pending_ (a thrown promise shows the fallback), and an error boundary handles _failed_ (a thrown error shows the error fallback).

Because they are the same throw-and-unwind mechanism distinguished by thrown value (Section 2), you handle both by wrapping the subtree in _both_: an error boundary (often outside) and a `<Suspense>` (often inside), so a thrown promise goes to Suspense (loading) and a thrown error goes to the error boundary (failed).

This is the standard pattern for Suspense data fetching.

### How it actually works

Recall Section 2: the same unwind mechanism routes a thrown _promise_ to the nearest `<Suspense>` and a thrown _error_ to the nearest error boundary.

An async data operation can throw _either_: while pending, the data source suspends (throws a promise).

If the fetch _fails_, it throws an _error_.

So to handle an async subtree completely, you need _both_ kinds of boundary, and you place them together:

```jsx
<ErrorBoundary fallback={<ErrorState />}>
    {" "}
    {/* catches a thrown error: the fetch failed */}
    <Suspense fallback={<LoadingState />}>
        {" "}
        {/* catches a thrown promise: still loading */}
        <Profile />{" "}
        {/* useSuspenseQuery / use(): suspends while pending, throws on failure */}
    </Suspense>
</ErrorBoundary>
```

With this structure, the three states of the async operation map cleanly onto the three outcomes:

- **Pending**: `Profile` suspends (throws a promise), which unwinds to the `<Suspense>` (the nearest boundary for a promise), showing `LoadingState`. When the promise resolves, the retry (Section 4) renders `Profile` for real.
- **Failed**: the fetch errors, so `Profile` (or the data library) throws an `Error`, which unwinds _past_ the `<Suspense>` (a Suspense boundary does not catch errors) to the nearest _error boundary_, showing `ErrorState`. The error boundary's fallback is permanent until reset (Error Boundaries guide).
- **Success**: `Profile` renders normally with its data, inside both boundaries (neither fallback shows).

The ordering (error boundary outside, Suspense inside) is the common arrangement, and it reflects that an error is the more "serious" outcome that should be caught at or above the loading boundary.

A thrown promise is caught by the inner `<Suspense>` first (it is the nearest boundary for a promise), while a thrown error passes the `<Suspense>` (which does not handle errors) and is caught by the outer error boundary.

Both boundaries wrap the same subtree, each catching its own kind of thrown value, which is exactly the shared-machinery picture from Section 2 made into a pattern: one subtree, two boundaries, two thrown-value types, two fallbacks.

This is precisely the pattern the Data Fetching guide's `useSuspenseQuery` example uses, and it generalizes: any Suspense data fetching should be paired with an error boundary, because a fetch that can be _pending_ can also _fail_, and Suspense alone has no answer for failure (a Suspense boundary ignores thrown errors, without an error boundary, a fetch error would unwind all the way to the root and crash the app, per the Error Boundaries guide).

So "Suspense for loading, error boundary for failure" is not two separate decisions.

It is one decision to handle both non-success states of an async operation, using the two halves of the same mechanism.

A few practical notes:

- **Recovery interplay.** The error boundary's reset (Error Boundaries guide, Section 8) lets the user retry a _failed_ fetch: resetting the error boundary re-renders the subtree, which re-attempts the fetch (suspending again, showing the Suspense fallback, then either succeeding or failing again). Pair the error fallback's "try again" with a refetch so the retry has a real chance of succeeding, not an immediate re-fail (the reset-loop caution from the Error Boundaries guide).
- **Granularity alignment.** Because both boundaries wrap the same async region, they naturally sit at the same place in the tree, and the placement reasoning is the same (Section 5 and the Error Boundaries guide's Section 11): one pair of boundaries per independent async region (a panel, a feed), matching data dependencies.
- **Libraries bundle this.** Some data libraries and frameworks provide combined components or patterns so you do not hand-write both boundaries each time, but under the hood it is always the same two-boundary structure.

So Suspense and error boundaries together are the complete handling of an async subtree: Suspense for pending (thrown promise, temporary fallback, retry), error boundary for failed (thrown error, permanent fallback, manual reset), both wrapping the same region, both expressions of the one throw-and-unwind mechanism.

Pairing them is the canonical pattern, and forgetting the error boundary is a common bug that turns a failed fetch into a whole-app crash.

### Try it

> Wrap a data-fetching component in both an error boundary and a `<Suspense>` as above. Make the fetch sometimes succeed (after a delay), sometimes fail. Watch the loading state (Suspense) during the delay, the content on success, and the error state (error boundary) on failure. Then remove the error boundary and make the fetch fail, and watch the whole app crash (the error unwound to the root). Seeing the failure crash the app without an error boundary is why pairing them is mandatory.

### You've got this if

You can explain why an async subtree needs both a `<Suspense>` and an error boundary, and which thrown value each one catches.

---

## 11. SuspenseList and reveal order (experimental)

Prereqs: Sections 6 and 8.

Outside React: nothing new.

### The itch

You have several sibling Suspense boundaries (a list of cards, each loading independently) and they reveal in whatever order their data happens to resolve, which can look chaotic (the third card appears before the first).

You want to _coordinate_ the reveal order.

React has an API for this, but it is still experimental, and you should know both what it does and that you cannot rely on it yet.

### The short version

`SuspenseList` is a component for _coordinating the reveal order_ of multiple sibling `<Suspense>` boundaries: instead of each revealing whenever its own data resolves (which can look chaotic), `SuspenseList` can make them reveal in order (`revealOrder` of `forwards`, `backwards`, or `together`) and control how many fallbacks show at once (`tail` of `collapsed` or `hidden`).

#### It is still experimental

as of the React 19 line, exposed only as `unstable_SuspenseList` (not the stable public API), so you should not rely on it in production.

The _need_ it addresses (avoiding a chaotic multi-boundary reveal) is real.

Until it stabilizes, you manage that need with boundary placement, nesting, and revealing-together patterns.

### How it actually works

First, the important caveat, stated plainly because it determines whether you can use this: **`SuspenseList` is experimental and not part of the stable React API as of the React 19.2 line in 2026.** It is exposed only under the `unstable_SuspenseList` name (in `@types/react` it appears as `unstable_SuspenseList`), which is React's convention for "this exists in the codebase and experimental builds but is not a stable, supported public API. It may change or be removed without notice." So everything below is _what it does conceptually and where it is headed_, not something to build production features on yet.

Treat this section as "understand the concept and watch for stabilization," not "use this now."

The problem it solves is the _chaotic multi-boundary reveal_.

Suppose you have several independent `<Suspense>` boundaries as siblings (a feed of cards, each fetching its own data):

```jsx
<Suspense fallback={<CardSkeleton />}><Card id={1} /></Suspense>
<Suspense fallback={<CardSkeleton />}><Card id={2} /></Suspense>
<Suspense fallback={<CardSkeleton />}><Card id={3} /></Suspense>
```

By default, each card reveals _whenever its own data resolves_, independent of the others.

If card 3's data happens to resolve first, card 3 appears before cards 1 and 2, so the list fills in out of order and at irregular times, which can look chaotic and cause layout shift (the popcorn UI from Section 8, at the list level).

Throttling (Section 8) smooths small timing differences but does not impose an _order_.

`SuspenseList` wraps a set of sibling boundaries and _coordinates_ their reveal:

```jsx
<unstable_SuspenseList revealOrder="forwards" tail="collapsed">
    <Suspense fallback={<CardSkeleton />}>
        <Card id={1} />
    </Suspense>
    <Suspense fallback={<CardSkeleton />}>
        <Card id={2} />
    </Suspense>
    <Suspense fallback={<CardSkeleton />}>
        <Card id={3} />
    </Suspense>
</unstable_SuspenseList>
```

Its two main controls:

- **`revealOrder`**: the order in which the children are revealed. `forwards` reveals top-to-bottom (a later card does not reveal until the earlier ones have, regardless of which data resolves first, so the list fills in order). `backwards` reveals bottom-to-top. `together` reveals _all_ of them at once, only when _all_ have resolved (like a `Promise.all` for the reveal), so they appear as one coordinated unit rather than piecemeal. The default (no `SuspenseList`) is "each reveals as it resolves," which is the chaotic case.
- **`tail`**: how the _unresolved_ items' fallbacks are shown. `collapsed` shows only the _next_ item's fallback (so you see one loading indicator at the leading edge, not a wall of skeletons), `hidden` shows no fallbacks for the not-yet-revealed items. This controls how much loading UI is visible during an ordered reveal.

So `SuspenseList` is the _coordination_ layer over multiple boundaries: where placement (Section 5) and nesting (Section 6) structure _which_ regions load independently, and throttling (Section 8) smooths the timing, `SuspenseList` imposes an _order_ and controls the _fallback density_ across a set of sibling boundaries, specifically to turn a chaotic out-of-order reveal into an orderly one.

Because it is experimental, the practical guidance is:

- **Do not rely on it in production** until it stabilizes. The API (and even its existence in a given build) is not guaranteed. Historically it has had unresolved edge cases (interactions with nesting, with `React.lazy` causing waterfalls, with error boundaries, and with re-renders) that are part of why it has not stabilized.
- **Address the underlying need with stable tools** for now: if you want a set of regions to reveal _together_, put them in _one_ `<Suspense>` boundary (a single boundary reveals its whole subtree together, and pre-warming, Section 7, keeps their fetches parallel), which achieves the `together` behavior without `SuspenseList`. If you want an _ordered_ reveal, you can structure with nesting (Section 6) or accept the default order with throttling smoothing it. These cover many cases that `SuspenseList` would handle more declaratively.
- **Watch for stabilization**: the concept (coordinating reveal order across boundaries) is genuinely useful, and if it stabilizes it will be the right tool for ordered multi-boundary reveals. Until then, know it exists and what it would do.

So `SuspenseList` is the (still-experimental) answer to "coordinate the reveal order of multiple sibling boundaries," with `revealOrder` and `tail` controls, exposed as `unstable_SuspenseList`, not for production use yet, with the "reveal together" case achievable today by using a single shared boundary instead.

### Try it

> Since it is experimental, the safe experiment is the _stable_ alternative: put three independently-fetching cards in _one_ `<Suspense>` boundary and watch them reveal _together_ (the single boundary waits for all of them), with pre-warming keeping their fetches parallel (Section 7). That achieves the `revealOrder="together"` effect without `SuspenseList`. If you are on an experimental build and curious, try `unstable_SuspenseList` with `revealOrder="forwards"` and watch the cards fill in order regardless of resolution order, but do not ship it.

### You've got this if

You can explain what `SuspenseList` coordinates (the reveal order of sibling boundaries, via `revealOrder` and `tail`), that it is still experimental (`unstable_SuspenseList`), and how to get the "reveal together" behavior with a single boundary today.

---

## 12. Streaming SSR and selective hydration (scoped)

Prereqs: Sections 1 and 2.

From the rendering and RSC guides: that React can render on the server and hydrate on the client, recapped lightly.

Outside React: the idea of streaming HTML (sending it in pieces).

### The itch

Suspense plays a big role on the _server_: it drives streaming SSR (sending HTML in pieces as it becomes ready) and selective hydration (making parts interactive in priority order).

But that is a framework-coupled topic with its own guide, so this section gives you the Suspense-relevant picture and points you there, rather than going deep prematurely.

### The short version

On the server, Suspense boundaries are the _unit of streaming_: React can send the HTML for the ready parts immediately and _stream_ the rest as each boundary's data resolves, sending the fallback first and the real content later (React 19.2 added "Suspense batching" to coordinate these streamed reveals).

Suspense boundaries also drive _selective hydration_: React can hydrate (make interactive) the parts that are ready or that the user interacts with first, in priority order.

These are powerful, but they are framework-coupled and belong to the dedicated Hydration and SSR Internals guide.

Here, know that Suspense is the unit both build on, and look there for the mechanics.

### How it actually works: scoped

This section is deliberately bounded, because streaming SSR and selective hydration are framework-coupled (you encounter them through Next.js or another framework) and get a full treatment in the Hydration and SSR Internals guide.

Here is the Suspense-relevant picture, enough to see where Suspense fits, with pointers for the rest.

Recall (lightly, from the rendering and RSC guides) that with server-side rendering, React renders your app to HTML on the server, sends it so the user sees content fast, and then _hydrates_ on the client (attaches interactivity to the server HTML).

Suspense connects to this in two ways:

#### Suspense is the unit of streaming SSR

The modern server renderer can _stream_ HTML rather than producing it all at once.

Suspense boundaries are the seams: React sends the HTML for everything that is ready immediately, and for each `<Suspense>` boundary whose content is not ready, it sends the _fallback_ HTML first, then _streams_ the real content's HTML later (when that boundary's data resolves on the server), along with a small script that swaps the fallback for the content in place.

So the user gets a fast initial paint (shell plus fallbacks) and the slow regions stream in as they become ready, all keyed on Suspense boundaries.

This is the server-side analog of the client behavior in this guide: a boundary shows a fallback, then reveals content, except across the network during the initial load.

React 19.2 added "Suspense batching" for SSR, which _batches_ the reveals of streamed boundaries so they arrive in coordinated groups rather than one-by-one, the streaming analog of client-side throttling (Section 8).

#### Suspense drives selective hydration

When the streamed HTML arrives, React hydrates it, and Suspense boundaries let React hydrate _selectively_: it does not have to hydrate the entire page at once before anything is interactive.

It can hydrate boundaries independently, prioritize hydrating the parts the user _interacts with first_ (if you click a not-yet-hydrated region, React can hydrate that region ahead of others), and hydrate ready boundaries without waiting for slow ones.

This makes a large page interactive in priority order rather than all-or-nothing, and Suspense boundaries are the units React hydrates selectively.

Both of these are genuinely important to how Suspense is used in real (framework-based) apps, but they are _framework-coupled_: you configure and observe them through your framework's SSR setup, not through bare React, and they involve the server renderer, the streaming protocol, and hydration internals that are their own large topic.

Per the series' scoping (and the reader's profile), that full story, attaching to server HTML, hydration mismatches as recoverable errors (which the Error Boundaries guide's Section 12 previewed), selective and progressive hydration, `hydrateRoot` versus `createRoot`, and the streaming mechanics, lives in the **Hydration and SSR Internals guide**.

This section's job is only to place Suspense within it: Suspense boundaries are the unit of both streaming and selective hydration, and the client-side mechanics you learned here (suspend, fallback, reveal) have server-side analogs (stream the fallback, then the content) that the Hydration guide develops in full.

So the scoped takeaway: on the server, Suspense boundaries are where React splits the stream (fallback first, content streamed in) and where it hydrates selectively (priority order, interaction-driven), with React 19.2 batching streamed reveals.

The deep mechanics are the Hydration guide's, and this guide stays client-focused and pure-React otherwise.

### Try it

> If you have a streaming-SSR framework (Next.js with the App Router, say), wrap a slow server component in `<Suspense fallback={<Skeleton />}>` and load the page with a throttled network: observe the shell and skeleton arriving first, then the real content streaming in to replace the skeleton, all in the initial HTML stream (visible in the network response). Seeing the fallback stream first and the content stream in later is Suspense driving streaming SSR. The full mechanics are the Hydration guide.

### You've got this if

You can explain that Suspense boundaries are the unit of streaming SSR (fallback first, content streamed in) and selective hydration, and that the full mechanics live in the Hydration and SSR guide.

---

## 13. Debugging Suspense

Prereqs: the rest of the guide.

### The itch

Something is off: an infinite loading loop, a fallback that flashes, a navigation that blanks content, an unexpected waterfall.

You want to map each symptom to the mechanism and the fix, fast.

### The short version

Most Suspense problems are one of a small set, each mapping to a section.

The procedure: identify the symptom (loops forever, flashes, hides content, waterfalls, crashes on error), and trace it to the mechanism (promise not cached, throttling or its absence, missing transition, sibling/placement, missing error boundary).

The instruments are the React DevTools (which shows suspended components and lets you simulate suspense), the Network tab (for fetch timing and waterfalls), and the Profiler.

### How it actually works

Walk the symptoms.

#### A component loads forever (infinite suspend loop)

The promise is not _stable_: the component creates a new promise on every render (an inline `fetch` or `use(fetchX())` in render body), so each retry creates a new pending promise and suspends again (Sections 3 and 4).

Fix: cache the promise (a data library keyed by query, a memoized promise, or a promise created outside render and passed in), so the retry reads the _resolved_ promise and succeeds.

This is the most common Suspense bug.

#### A fallback flashes (appears and vanishes quickly)

Either the content resolves fast and throttling did _not_ suppress it (rare, usually fine), or, more commonly, you are _re-suspending already-revealed content without a transition_ (Section 9), so the existing content is hidden behind the fallback.

Fix: if it is an update to revealed content (navigation, filter), wrap it in a transition (`startTransition` or `useDeferredValue`) so the old content stays until the new is ready, no flash.

#### Content disappears on navigation/filtering, replaced by a spinner

The classic missing-transition problem (Section 9): an update to an already-revealed boundary defaults to showing the fallback.

Fix: wrap the update in a transition.

This is the highest-value fix in practice.

#### An unexpected request waterfall

Either a genuine _data dependency_ (B's fetch needs A's result, which is inherently sequential, not a Suspense bug), or a _boundary/placement_ issue (the components are not siblings in one boundary as you assumed, or nesting changes timing, Sections 6 and 7).

In React 19, independent siblings in one boundary should fetch in parallel via pre-warming (Section 7).

If they do not, check that they are actually siblings in the same boundary and that the promises are independent.

#### A failed fetch crashes the whole app

Missing error boundary (Section 10): Suspense handles pending but not failure, so a thrown error unwinds past the `<Suspense>` to the root and crashes the app.

Fix: pair the `<Suspense>` with an error boundary.

#### `SuspenseList` does not work / is undefined

It is experimental (`unstable_SuspenseList`, Section 11) and not in the stable API.

Do not rely on it.

Use a single shared boundary for "reveal together."

#### The DevTools

help: the React DevTools shows which components are suspended and (in some versions) lets you _simulate_ a suspended state on a boundary to test its fallback without waiting for real loading.

The Network tab shows fetch timing (parallel versus waterfall) and resolution speed (relevant to throttling).

The Profiler shows the renders, including the retry render when a promise resolves.

#### The closing synthesis

Suspense is the promise side of React's throw-and-unwind mechanism: a component that is not ready _throws a promise_ during render, React catches it (the same unwind that error boundaries use, just branching on the thrown value's type) and shows the nearest `<Suspense>` boundary's _fallback_, and because a promise resolves, React subscribes to it and schedules a _retry_ on a retry lane when it does, re-rendering the subtree to replace the fallback with content, which is why the fallback is temporary and self-resolving (and why the suspended promise must be _cached_ so the retry reads a resolved value rather than looping).

You suspend in practice through `use`, `React.lazy`, or a Suspense-integrated data library, all of which throw a thenable for you.

Where you place boundaries sets the _scope_ of each loading state, so the pattern is to render the shell immediately and wrap slow regions in their own boundaries matched to data dependencies, with nesting expressing a staged reveal (outer reveals while inner still loads).

React 19 _pre-warms_ the siblings of a suspended tree (a discarded render that fires their fetches) so independent siblings load in parallel, and it _throttles_ fallbacks (suppressing flashes for fast content, staggering successive reveals) to avoid a popcorn UI.

The single most important practical behavior is that _transitions_ (`startTransition`, `useDeferredValue`) keep already-revealed content visible during an update instead of flashing a fallback over it, which is what makes navigation and filtering smooth.

You pair every Suspense data fetch with an _error boundary_ (Suspense for pending, error boundary for failed, the two halves of the one mechanism), `SuspenseList` (still experimental) would coordinate multi-boundary reveal order, and on the server Suspense boundaries are the unit of streaming SSR and selective hydration (the Hydration guide's territory).

Every Suspense behavior you will hit is one of these: a thrown promise unwinding to a boundary, the retry and its caching requirement, placement and nesting, pre-warming and throttling, or the all-important transition behavior.

### Try it

> Take a real Suspense problem (or reproduce one above) and classify it before fixing: loops (caching), flashes or blanks content (missing transition), waterfalls (dependency or placement), crashes on error (missing error boundary). Then apply the matching fix. Doing this on two or three makes the classification reflexive, and the missing-transition one alone will improve most Suspense apps.

### You've got this if

You can take "it loads forever" or "the content blanks on navigation" and name the mechanism (unstable promise / missing transition) and the fix without guessing.

---

## 14. Reading the source

Prereqs: the rest of the guide, plus comfort reading JavaScript.

This is a pass 3 section.

There is no rush.

### The itch

You have the model.

Now you want to see suspending, retrying, and throttling in React's actual code, and confirm it shares the throw machinery with error boundaries.

### The short version

It lives in the `react-reconciler` package: `ReactFiberThrow.js` (the shared catch-and-route logic that branches on thenable-versus-error, the same file as error boundaries), the Suspense component handling (`ReactFiberSuspenseComponent.js` and the work-loop's completion of Suspense fibers), the retry and ping mechanism (attaching to the promise and scheduling a retry lane), and the throttling timing.

The `use` hook's implementation is in the hooks dispatcher.

The pieces map onto this guide.

### How it actually works: the reading order

In the **`react-reconciler`** package:

`ReactFiberThrow.js` is the shared heart from Section 2 (the same file the Error Boundaries guide points to).

`throwException` is where React, having caught a thrown value, branches on _what_ it is: the check for whether the thrown value is a _thenable_ (a promise) is the fork between the Suspense path and the error-boundary path.

For a thenable, this is where React finds the nearest Suspense boundary and attaches the _ping_ (the `.then` callback that schedules a retry, Section 4).

Reading this branch is the fastest way to confirm Suspense and error boundaries are one mechanism.

The Suspense fiber handling lives in `ReactFiberSuspenseComponent.js` (and the begin/complete work for Suspense fibers in the work loop): how a Suspense boundary fiber tracks whether it is showing its fallback or its content, and how it manages the _offscreen_ fiber that holds the (hidden) content while the fallback shows.

This is where the boundary's fallback-versus-content state lives.

The **retry and ping** mechanism (Section 4): the ping listener attached to the thrown promise (`attachPingListener`), and the function that schedules the retry when the promise resolves (`pingSuspendedRoot` / the retry-lane scheduling, connecting to the Scheduler and Lanes guide's retry lanes).

This is "when the promise resolves, schedule a re-render of the suspended tree."

The **throttling** (Section 8): the timing constants and logic that delay showing a fallback and stagger reveals (in the Suspense commit logic and the work loop), which implement the flash-suppression and popcorn-avoidance behaviors.

The **`use` hook** (Section 3) is in the hooks implementation (the dispatcher), where reading a pending promise triggers the suspend (throwing the thenable) and a resolved promise returns its value.

The **pre-warming** behavior (Section 7) lives in the work-loop logic that, on a suspension, continues rendering the suspended tree's siblings in a pass whose output is not committed, to trigger their side effects.

### Try it

> Open `ReactFiberThrow.js` and find the thenable check in `throwException`. Recognize that a thrown thenable leads to the Suspense path (find the boundary, attach a ping) while a non-thenable leads to the error-boundary path. Seeing that single branch is seeing why this guide and the Error Boundaries guide are two halves of one mechanism.

### You've got this if

You opened `ReactFiberThrow.js` (or located it) and recognized the thenable-versus-error branch that splits the Suspense path from the error-boundary path.

---

## Further reading (primary sources)

When you want to go past this guide, these are the canonical sources, each with a note on how it relates to what you read here and how current it is.

### The React docs on Suspense, current within the React 19 line

The `<Suspense>` reference at https://react.dev/reference/react/Suspense documents the boundary, fallbacks, the transition behavior (revealing content without hiding it, Section 9), and nesting (Section 6).

The `use` reference at https://react.dev/reference/react/use covers suspending on a promise (Section 3).

`lazy` at https://react.dev/reference/react/lazy covers code-splitting suspense.

These are the authoritative current sources.

### The React 19 release post, at https://react.dev/blog/2024/12/05/react-19

Documents "pre-warming for suspended trees" (Section 7) and the stable `use` API.

The primary source for what React 19 changed about Suspense, including the resolution of the sibling-rendering behavior.

### The React 18 Working Group discussion on Suspense, at https://github.com/reactwg/react-18/discussions/7

The primary explanation of "Concurrent Suspense" versus "Legacy Suspense," including placeholder throttling (Section 8), delayed transitions (Section 9), and the sibling-handling behavior (Section 7).

Written for React 18 and accurate for the model the React 19 line uses.

The foundational read for the _why_ behind Suspense's behaviors.

### TkDodo's "React 19 and Suspense, a Drama in 3 Acts," at https://tkdodo.eu/blog/react-19-and-suspense-a-drama-in-3-acts

A clear account of the React 19 sibling-fetching behavior change and its resolution (Section 7), including why pre-rendering siblings of a suspended tree is "overhead" and how pre-warming reconciles parallel fetching with that.

Useful primary-adjacent context for the pre-warming story.

### The React source (pass 3)

in `react-reconciler`: `ReactFiberThrow.js` (the shared thenable-versus-error branch, Sections 2 and 14), `ReactFiberSuspenseComponent.js` (the boundary fiber and offscreen content), and the ping/retry-lane logic (Section 4), per Section 14.

Reading the thenable branch in `throwException` confirms the shared mechanism with error boundaries.

**The Error Boundaries and resilience guide, and the Data Fetching, Scheduler and Lanes, and (pending) Hydration guides in this series.** The Error Boundaries guide is the error half of this guide's shared mechanism (read its Section 10).

The Data Fetching guide covers `use`/`useSuspenseQuery` and the caching that makes Suspense terminate (Section 3).

The Scheduler and Lanes guide covers the retry lanes and transition lanes underneath Sections 4 and 9.

The Hydration guide (pending) is the home for the streaming SSR and selective hydration that Section 12 scoped out.

A good way to use all of these: read the relevant deep section here first so you have the model and the vocabulary, then read the primary source, then come back.

This guide gives you the one core idea (a thrown promise unwinds to the nearest Suspense boundary, which shows a fallback and retries on resolution) and traces suspending, placement, pre-warming, throttling, and the transition behavior all back to it.

The primary sources give the exact API, the behavior history, and the source-level detail.

---

Built to be climbed, not swallowed.

Finish pass 1 and you are already ahead.

Come back for the deep parts when a real Suspense problem (a loading loop, a flashing fallback, a navigation that blanks content) gives you a reason to care, and learn by making something genuinely async and watching fallbacks appear, throttle, and get suppressed by transitions, because the transition behavior in particular is the thing you have to see to believe.

Every version-specific claim (the stable `use` API, pre-warming for suspended trees, the transition fallback behavior, the still-experimental `unstable_SuspenseList`, React 19.2's Suspense batching for SSR) reflects the React 19.2.x line in 2026.

The core model (suspend by throwing a promise, unwind to the nearest boundary, show a fallback, retry on resolution, with caching making it terminate and transitions keeping revealed content visible) is the architecture of Suspense and is not going anywhere.

This is the promise side of the throw-and-unwind machinery the Error Boundaries guide set up: error boundaries catch thrown errors with a permanent fallback, Suspense catches thrown promises with a temporary fallback and a retry.
