---
title: "React Data Fetching and Server State"
description: "A guide to remote data as a cache: query keys, stale data, mutations, optimistic updates, and Suspense."
category: "Architecture"
readTime: "55 min read"
date: "May 2026"
publishedAt: "2026-05-01"
order: 4
series: "react-internals"
---

> Current as of React 19.2.x (latest patch 19.2.6, May 2026) and TanStack Query v5 (the React package `@tanstack/react-query`, 5.100.x as of May 2026; note that the only "v6" in existence is the Svelte adapter, the React version is still v5). Version-specific and library-specific claims are noted inline and were verified against current docs.

> **What this guide builds on.** This is the Track B guide that leans on the most prior material, because it sits at the meeting point of several mechanisms. From the **State Management guide** it assumes the central distinction of Section 14: server state is a cache of remote data, not client state, and conflating the two is the root mistake this guide exists to fix. From the **Hooks and Effects guide** it uses the snapshot model, the stale-closure and fetch-race material (Sections 3 and 9), referential stability (Section 8), `useSyncExternalStore` (Section 15), and `use()` (Section 15). From the **rendering and reconciliation guide** it uses Suspense, concurrent rendering, and tearing. You can read this guide right after the State guide; wherever it reaches for an engine concept, it defines that concept in one line at first use. The per-section **Prereqs** lines name exactly what each section needs, drawn from three wells: earlier sections here, the other guides, and outside knowledge (HTTP caching, promises, the browser focus and online events).

> **A note on libraries.** Server state has a *model* that is universal: every serious server-state library (TanStack Query, formerly React Query; SWR; RTK Query) implements the same core ideas (a keyed cache, stale-while-revalidate, deduplication, background synchronization, invalidation). This guide teaches that model as the thing to understand, and uses **TanStack Query v5** as the concrete reference implementation for APIs, because it is the one you have worked with. SWR and RTK Query are siblings built on the same model; the concepts transfer.

## Read this first

Same method as the other guides. **You are not meant to absorb this in one sitting.**

**Pass 1, one relaxed sitting (about 30 minutes).** Read only **"The itch"** and **"The short version"** of each section. You will come out understanding why fetching into `useState` is the wrong tool, what a query key actually is, what "stale" means and how `staleTime` controls it, how deduplication and background refetch work, and how mutations keep the cache honest. That alone will change how you build every data-driven feature.

**Pass 2, driven by real work.** When a real problem appears (a screen refetches too often or not enough, a list flickers on pagination, a mutation leaves stale data on screen, a disabled query shows a permanent spinner), come back and read the deep part of the matching section.

**Pass 3, when curious.** The further-reading section points at the canonical primary sources (the TanStack Query docs and TkDodo's blog, written by a maintainer) and at the one place in React's own code worth seeing.

Each section opens with a one-line **Prereqs** note: the earlier sections (here or in the other guides) and any outside knowledge worth having first. Sections that need nothing past basic React say so.

**Two rules that multiply everything.**

1. **Run the experiments.** Each section ends with a short **"Try it."** Install TanStack Query in a Vite scratch app, open the Devtools panel, and watch the cache entries change state as you interact. The caching behavior has to be seen in the Devtools to become real.
2. **Trust the order.** The sections build one model, in order: server state is a cache, the manual approach reinvents that cache badly, the cache is addressed by keys, it has a status model and a freshness policy (`staleTime`) and a retention policy (`gcTime`), it deduplicates and shares, it refetches in the background, you gate it with `enabled`, you write to it with mutations and keep it honest with invalidation and optimistic updates, you page and prefetch, you integrate it with Suspense, and underneath it is an external store. Here is the spine:

```
   Server state is a cache, not state            (1)
            │
   The manual approach reinvents the cache badly  (2)
            │
   The cache is a key-value store (query keys)     (3)
            │
   Its status model (two axes) and freshness:      (4, 5)
   staleTime = stale-while-revalidate              ◀── the central mechanism
            │
   Retention (gcTime), dedup, background refetch    (6, 7, 8)
            │
   Gating (enabled), writing (mutations, optimistic) (9, 10, 11)
            │
   Pagination and prefetch, Suspense, the engine     (12, 13, 14)
            │
   Pitfalls, then debugging                          (15, 16)
```

You do not need to finish this guide to benefit from it. Finish pass 1 and you are already ahead.

---

## Table of Contents

1. [Server state is a cache, not state](#1-server-state-is-a-cache-not-state)
2. [Why useEffect and useState is the wrong tool for fetching](#2-why-useeffect-and-usestate-is-the-wrong-tool-for-fetching)
3. [Query keys: the cache is a key-value store](#3-query-keys-the-cache-is-a-key-value-store)
4. [The status model: two axes, not one boolean](#4-the-status-model-two-axes-not-one-boolean)
5. [Stale-while-revalidate, and what staleTime really controls](#5-stale-while-revalidate-and-what-staletime-really-controls)
6. [Garbage collection: gcTime and how the cache is pruned](#6-garbage-collection-gctime-and-how-the-cache-is-pruned)
7. [Deduplication and sharing: one request, many consumers](#7-deduplication-and-sharing-one-request-many-consumers)
8. [Background refetching: how the cache stays fresh](#8-background-refetching-how-the-cache-stays-fresh)
9. [The enabled flag and dependent queries](#9-the-enabled-flag-and-dependent-queries)
10. [Mutations and cache invalidation](#10-mutations-and-cache-invalidation)
11. [Optimistic updates](#11-optimistic-updates)
12. [Pagination, infinite queries, and prefetching](#12-pagination-infinite-queries-and-prefetching)
13. [Suspense for data, and React 19's use()](#13-suspense-for-data-and-react-19s-use)
14. [How the cache connects to the rendering engine and RSC](#14-how-the-cache-connects-to-the-rendering-engine-and-rsc)
15. [Pitfalls and anti-patterns](#15-pitfalls-and-anti-patterns)
16. [Debugging data fetching](#16-debugging-data-fetching)

---

## 1. Server state is a cache, not state

*Prereqs: from the State guide, Section 14 (server state versus client state). Outside React: the idea of a cache (a local copy of data whose real home is elsewhere).*

**The itch.** You keep treating fetched data like any other state: you fetch it, store it, and then spend most of your effort keeping that stored copy in agreement with a server you do not control. The data goes stale, two components fetch the same thing twice, and you are hand-writing cache logic without realizing that is what you are doing. The reframe that fixes all of it is to stop calling it state and start calling it what it is: a cache.

**The short version.** The data you fetch from a server is not your application's state; it is a *cache*, a local copy of data whose real home is the server. That single fact determines everything a server-state tool does. A cache can be stale (the real data changed), it is shared (many components want the same copy), it is owned elsewhere (you do not control when it changes), and it is asynchronous to load. A server-state library is, at its core, a cache manager that handles freshness, sharing, and synchronization for you, so you stop hand-building those things on top of `useState`.

**How it actually works.**

The State guide (Section 14) drew the line between client state (synchronous, owned by your app, single source of truth, cannot go stale) and server state (asynchronous, owned by the server, a shared copy that can go stale). This guide takes that line as its starting point and builds out the entire mechanism that follows from "server state is a cache." So it is worth making the cache framing concrete, because every later section is a consequence of it.

A cache is a local copy of something whose authoritative version lives elsewhere. Your browser's HTTP cache is a copy of files that live on a server; a CPU cache is a copy of data that lives in main memory. The defining tension of any cache is the same: the copy is fast to read but can drift out of agreement with the source, so a cache has to have a *policy* for when to trust the copy and when to go back to the source. Hold that thought, because "when do I trust the cached copy versus refetch" is exactly the question `staleTime` answers (Section 5), and it is the question the manual `useState` approach has no answer to at all.

Once you see fetched data as a cache, the list of things a server-state tool must do writes itself, and each becomes a later section:

- The cache needs an **address** for each piece of data, so it can store, find, share, and invalidate entries. That is the query key (Section 3).
- It needs a **status model**, because a cached entry can be empty, loading, present, present-but-refetching, or errored, and these are not one boolean. (Section 4.)
- It needs a **freshness policy**: when is the cached copy good enough to serve as-is, and when should it be revalidated against the server? That is `staleTime` and stale-while-revalidate (Section 5).
- It needs a **retention policy**: how long to keep a copy nobody is currently using, in case it is needed again soon. That is `gcTime` (Section 6).
- It needs **sharing and deduplication**, because many components want the same cached entry and should not each fetch it (Section 7).
- It needs **background synchronization**, because the source changes and the copy should quietly catch up (Section 8).
- It needs a **write story**: when you change data on the server, the cache is now wrong, so it must be invalidated or updated (Sections 10 and 11).

Notice what is not on that list: most of "state management." A cache does not need lifting, or Context, or a global store in the client-state sense, because it is not client state. It is its own thing, with its own concerns, which is precisely why it gets its own library rather than living in your `useState`, Redux, or Context (Section 15). The most important mental shift this whole guide asks for is in this section: the moment you call fetched data a cache instead of state, the right tool and the right behavior stop being arbitrary library features and become obvious requirements of caching.

There is also a structural payoff that echoes the State guide. When you move server state out into a cache, the amount of genuine client state left in your app shrinks dramatically, often to a handful of small, local UI flags. So "server state is a cache" is not only correct, it is the move that makes your remaining state simple.

> **Try it.** Take one screen in your app that fetches data and list everything you currently do with that data after fetching it: store it, track loading, track errors, refetch on some trigger, avoid double-fetching. Label each item as "caching concern" (freshness, sharing, retention, synchronization). You will find that nearly all of it is cache management you wrote by hand, which is the work a server-state library exists to absorb.

**You've got this if** you can explain why "can go stale" is the defining property of server state, and why that one property implies the need for a freshness policy that client state never needs.

---

## 2. Why useEffect and useState is the wrong tool for fetching

*Prereqs: Section 1. From the Hooks guide: effects as synchronization and "you might not need an effect" (Section 6), and the fetch-race cleanup pattern (Sections 3 and 9). From the State guide: the boolean-soup status problem (Section 5).*

**The itch.** The first way everyone learns to fetch is `useEffect` plus `useState`: fetch in an effect, store the result, track `isLoading` and `error` by hand. It works for one screen, then collapses under real conditions: races, duplicate requests, no caching, stale data, and refetch logic you keep rewriting. You concluded at some point that `useQuery` was better; this section is the full reason why, in terms of mechanism.

**The short version.** Fetching with `useEffect` and `useState` is not wrong because effects cannot fetch; it is wrong because it stores the result in *component-local state with no shared cache*. That single limitation forces you to hand-build everything a cache provides: loading and error status, race-condition handling, deduplication, caching across mounts, and background refetching, and to rebuild it per component, badly. A server-state library replaces all of that with one shared cache. The lesson is not "never use effects," it is "fetching is a caching problem, and local state is not a cache."

**How it actually works.**

Start with the canonical manual fetch and count what it makes you do:

```js
function User({ id }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;            // race guard (Hooks guide, Section 9)
    setIsLoading(true);
    setError(null);
    fetchUser(id)
      .then(d => { if (!ignore) { setData(d); setIsLoading(false); } })
      .catch(e => { if (!ignore) { setError(e); setIsLoading(false); } });
    return () => { ignore = true; }; // cleanup cancels the stale response
  }, [id]);
  // ...
}
```

This is *correct* manual code, and it is already carrying a lot: three pieces of state in the boolean-soup shape the State guide warned about (Section 5), and the `ignore` flag from the Hooks guide's fetch-race section (Section 9) to stop an older request from overwriting a newer one when `id` changes quickly. And it is still missing almost everything a real app needs. Walk the gaps, because each gap is a thing the library provides:

**No cache across mounts.** The data lives in *this component's* state. Unmount and remount the component (navigate away and back) and the state is gone, so it refetches from scratch and shows a spinner again, every time. There is nowhere for the data to persist between mounts, because component state dies with the component (State guide, colocation). A cache lives outside the component (Section 14), so a remount can show the previous data instantly.

**No sharing or deduplication.** If three components on the same screen each need user `id`, each runs its own effect and fires its own request: three identical network calls for one piece of data. Component-local state cannot be shared without lifting it (State guide, Section 3), and lifting it high enough to share re-renders a large subtree and still does not give you caching. A keyed cache shares one entry across all consumers and fires one request (Section 7).

**No background synchronization.** The data is fetched once and then frozen until something manually refetches. If the server's data changes, or the user tabs away for ten minutes and comes back, your copy is silently stale with no mechanism to catch up. You would have to wire up focus listeners, interval polling, and refetch logic by hand (Section 8).

**No invalidation story.** When the user edits something (a mutation), every component holding the old data is now wrong, and there is no shared place to say "this data changed, refresh it." You end up threading refetch callbacks around or lifting state just to coordinate (Section 10).

**Repetition.** Every one of these gaps is something you would solve per fetch, copy-pasting the race guard, the status booleans, and the refetch logic into every component that fetches. That repetition is the real tell: when you find yourself writing the same infrastructure around every fetch, you are hand-rolling a cache, and a cache is exactly what you should reach for instead of rebuilding.

This is why "you might not need an effect" (Hooks guide, Section 6) applies with full force to data fetching: an effect synchronizes with an external system, and the network is an external system, so an effect *can* fetch, but synchronizing your UI with a remote source is a caching problem, and effects give you no cache. The library does not abolish the effect; it owns the synchronization centrally, in a cache that every component subscribes to, so you write `useQuery({ queryKey, queryFn })` and get caching, sharing, status, races, and background sync handled, instead of rebuilding them in each component. That is the whole reason `useQuery` felt like a relief compared to `useEffect`: not nicer syntax, but a shared cache where there was none.

> **Try it.** Build the manual fetch above, then mount two copies of the component with the same `id` and watch the Network tab fire two identical requests. Navigate away and back and watch it refetch from scratch with a spinner. Then do the same with `useQuery({ queryKey: ['user', id], queryFn: () => fetchUser(id) })` and watch one request serve both copies, and the remount show cached data instantly. The difference you are seeing is "no cache" versus "cache."

**You've got this if** you can name the single structural limitation of `useEffect` plus `useState` fetching (no shared cache) and trace at least three concrete problems back to it.

---

## 3. Query keys: the cache is a key-value store

*Prereqs: Section 1. From the Hooks guide: the dependency array as a list of values an effect depends on (Section 7). Outside React: a key-value store or hash map (keys map to values).*

**The itch.** Query keys feel like a naming convention you copy from examples: `['user', id]`, `['todos']`. Then you hit a bug where changing a filter does not refetch, or two different requests stomp on each other's data, and you realize you do not actually understand what the key *is*. It is the most important concept in the whole library, and it is simpler than it looks.

**The short version.** The cache is a key-value store: a map from a serialized query key to a cache entry (the data, its status, and timestamps). The query key is the *address* of a piece of data in that map. Same key means same cache entry, which is what gives you sharing, deduplication, and instant cache hits. A different key means a different entry, which is how fetching with new parameters works. The rule that follows is exact: a query key must include every input the fetch depends on, for the same reason a `useEffect` dependency array must (an omitted input means the cache cannot tell two different requests apart).

**How it actually works.**

Picture the cache literally as a `Map`. The values are cache entries, each holding the fetched `data`, the current status, timestamps (when it was last updated, whether it is stale), and the list of components currently observing it. The keys are your query keys, hashed into a stable string so that the *contents* of the key, not its identity, determine the address. TanStack Query hashes query keys deterministically (it sorts object keys, so `['x', { a: 1, b: 2 }]` and `['x', { b: 2, a: 1 }]` hash the same), which means you address a cache entry by *value*: two `useQuery` calls anywhere in the app with the key `['user', 5]` resolve to the exact same entry. This is the mechanism behind nearly everything:

- **Same key, same entry.** Multiple components using `['user', 5]` read one shared entry, so they share data and deduplicate the request (Section 7).
- **Different key, different entry.** `['user', 5]` and `['user', 6]` are different addresses, so they are independent entries with independent data, status, and freshness. This is how fetching for different parameters works: you do not "refetch," you address a different entry.
- **Changing the key is how you react to changing inputs.** When `id` goes from 5 to 6, the key goes from `['user', 5]` to `['user', 6]`, so `useQuery` now points at a different entry, which may be empty (triggering a fetch) or already cached (an instant hit). This is the direct analog of a `useEffect` dependency array changing, and it is why the docs and the community describe query keys as "dependency arrays for your fetch."

That analogy is worth taking literally, because it gives you the one rule you must never break:

**A query key must contain every value the `queryFn` uses.** If your fetch function reads `id`, `filter`, and `page`, then all three belong in the key. The reason is mechanical and identical to the Hooks guide's dependency-array argument (Section 7): the key is how the cache distinguishes one request from another. If `filter` affects the fetched data but is not in the key, then `filter: 'active'` and `filter: 'archived'` hash to the *same address*, so the cache hands back whichever was fetched first, regardless of the current filter. You get a stale, wrong cache hit, and changing the filter does not refetch, because from the cache's point of view nothing about the address changed. Omitting an input from the key is exactly as broken as omitting a dependency from a `useEffect` array, and for the same reason: you have lied to the comparison the cache uses to decide whether two things are the same.

```js
// WRONG: filter affects the data but is not in the key → cache collisions, stale hits
useQuery({ queryKey: ['todos'], queryFn: () => fetchTodos(filter) });

// RIGHT: every input the fetch depends on is in the key
useQuery({ queryKey: ['todos', { filter }], queryFn: () => fetchTodos(filter) });
```

The other thing keys give you is **hierarchy**, which matters for invalidation (Section 10). Keys are arrays, and the library matches them by prefix: invalidating `['todos']` matches `['todos']`, `['todos', { filter: 'active' }]`, `['todos', 5]`, and any other key that starts with `'todos'`. So you structure keys from general to specific (`['todos']`, then `['todos', filter]`, then `['todos', id]`) precisely so that you can later invalidate a whole family of cached data with one broad key, or a single entry with a specific one. The key is not just an address; it is an address in a hierarchy you design.

A practical convention that falls out: keep keys consistent and structured (many teams centralize them in "query key factories," small functions that build keys so they are not retyped and cannot drift), include every input, and order them from general to specific. Get the keys right and the cache does the right thing automatically; get them wrong and you get collisions, stale hits, and refetches that do not fire, all of which are really one bug (a key that does not faithfully address its data).

> **Try it.** Build a query with key `['todos']` whose `queryFn` reads a `filter` variable not in the key. Switch the filter and watch the data *not* change (stale collision). Add `{ filter }` to the key and watch switching the filter address a new entry and fetch correctly. Then open the Devtools and watch the two filter values appear as two separate cache entries: the key-value store, made visible.

**You've got this if** you can explain why omitting an input from a query key causes the same class of bug as omitting a dependency from a `useEffect` array, in terms of how the cache addresses entries.

---

## 4. The status model: two axes, not one boolean

*Prereqs: Section 3. From the State guide: modeling state so illegal combinations are unrepresentable (Section 5). Outside React: nothing new.*

**The itch.** You want to show a spinner while loading and a "refreshing" indicator during background updates, and the flags confuse you: `isLoading`, `isPending`, `isFetching`, `isRefetching`, `status`, `fetchStatus`. You reach for `isLoading` and get a spinner that flashes during every background refetch, or a permanent spinner on a disabled query. The flags are not redundant; they describe two different things.

**The short version.** A query's state lives on two orthogonal axes, because "do I have data" and "is a request in flight right now" are independent questions. The `status` axis (`pending`, `error`, `success`) answers whether you have data. The `fetchStatus` axis (`fetching`, `paused`, `idle`) answers whether a request is currently running. You need both because the useful combination "I have data AND I am refetching it in the background" is impossible to express with one boolean, which is exactly why a single old-style `isLoading` was so confusing. The derived flags are shorthands over these two axes.

**How it actually works.**

This is the State guide's "make illegal states unrepresentable" principle (Section 5) applied to asynchronous data, and the two-axis design is the payoff. Consider the combinations a cached query can really be in: empty and idle (never fetched), empty and fetching (first load), present and idle (cached, not currently fetching), present and fetching (showing cached data while revalidating in the background), errored, errored while retrying. A single boolean cannot represent "present and fetching" distinctly from "empty and fetching," and that conflation is the source of the classic spinner bugs. So the model splits into two axes:

**The `status` axis: do I have data?**
- `pending`: there is no data yet. (In v5 this was renamed from `loading`; the status value is now `pending`.)
- `success`: there is data.
- `error`: the fetch failed and there is no data to show (or the last attempt errored).

**The `fetchStatus` axis: is a request in flight right now?**
- `fetching`: the `queryFn` is currently running (a first load *or* a background refetch).
- `paused`: the query wanted to fetch but cannot (for example, offline).
- `idle`: nothing is running right now.

These are orthogonal: a query can be `status: 'success'` (it has data) and `fetchStatus: 'fetching'` (revalidating in the background) at the same time, which is the stale-while-revalidate situation (Section 5) and the exact combination a single boolean cannot express. Splitting the axes makes every real combination representable and every illegal one impossible, which is the whole point of Section 5 of the State guide.

The boolean flags you actually use in components are derived from these two axes, and knowing the derivation tells you which to reach for:

- `isPending` is `status === 'pending'`: there is no data yet. (Renamed from the old `isLoading` in v5.)
- `isFetching` is `fetchStatus === 'fetching'`: a request is running, *including background refetches*. Reach for this to show a subtle "updating" indicator that should appear during background revalidation.
- `isError` is `status === 'error'`; `isSuccess` is `status === 'success'`.
- `isLoading` in v5 is the *combination* `isPending && isFetching`: there is no data yet *and* a request is actively running. This is the flag you want for a full-screen spinner, because it is true only on the genuine first load (no cached data to show), not during background refetches (when you have data and should keep showing it). This redefinition is the single most useful thing to internalize from the v5 changes: `isLoading` now means "first load, nothing to show, show a spinner," while `isFetching` means "something is fetching, maybe in the background."
- `isRefetching` is roughly `isFetching && !isPending`: fetching while you already have data, the background-refresh case.

The practical rule: use `isLoading` (or `isPending` when there is genuinely no cached data path) to decide whether to render a spinner *instead of* content, and use `isFetching` to decide whether to render a small *secondary* indicator *alongside* content. Reaching for `isFetching` where you meant `isLoading` is what makes a spinner flash on every background refetch; reaching for `isPending` on a disabled query (Section 9) is what makes a permanent spinner. Both bugs dissolve once you hold the two axes apart in your head.

> **Try it.** Render a query and display all of `status`, `fetchStatus`, `isPending`, `isLoading`, `isFetching` on screen. Load it once (watch `isLoading` flip true then false), then trigger a background refetch by refocusing the window (Section 8) and watch `isFetching` flip true while `isLoading` stays false and the data stays on screen. Seeing `isLoading` stay calm during a background refetch is the two-axis model working.

**You've got this if** you can explain why "I have data and I am refetching it" needs two axes to express, and which flag you would bind a full-screen spinner to versus a subtle refresh indicator.

---

## 5. Stale-while-revalidate, and what staleTime really controls

*Prereqs: Sections 1 and 4. Outside React: HTTP cache semantics (serve a cached copy, then check the source), where the term stale-while-revalidate comes from.*

**The itch.** You set `staleTime` somewhere because a tutorial did, but you are not sure what it does. Your app either refetches constantly (spinners everywhere) or never updates (stale data forever), and you cannot connect the knob to the behavior. This is the single most important setting in the library, and once it clicks, the caching behavior stops feeling magical and starts feeling like a policy you set.

**The short version.** The core behavior is stale-while-revalidate: when a component asks for data, the cache serves whatever it has *immediately* (no spinner if there is a cached copy), and then, *if that copy is stale*, kicks off a background refetch to bring it up to date, swapping in the fresh data when it arrives. `staleTime` is the knob that decides how long a freshly-fetched copy is considered "fresh" (and therefore served without any refetch) before it becomes "stale" (and therefore revalidated on the next trigger). The default `staleTime` is 0, meaning data is considered stale immediately, so it revalidates on every trigger. Raising `staleTime` is how you say "trust this cached copy for a while."

**How it actually works.**

Stale-while-revalidate is borrowed from HTTP caching, and the name is the algorithm: *serve the stale copy, and revalidate it.* When a component mounts and asks for `['user', 5]`, the cache does two things in order. First, it returns whatever is in the entry right now, instantly. If there is a cached copy, the component renders it with no loading state at all, even if that copy is old. Second, it checks whether the copy is stale, and if so, it triggers a background refetch (subject to the triggers in Section 8); when the fresh data arrives, the entry updates and the component re-renders with it. The user sees data immediately and watches it quietly update, instead of seeing a spinner and then data. That "instant, then fresh" feel is the defining experience of a good server-state setup, and it is entirely a consequence of serving stale and revalidating.

`staleTime` is the dividing line between "fresh" and "stale," and it is the knob that controls the whole behavior:

- A query's data is **fresh** for `staleTime` milliseconds after it was fetched. While fresh, the data is served from cache and **no refetch happens**, even on triggers like remount or refocus. Fresh data is trusted as-is.
- After `staleTime` elapses, the data is **stale**. Stale data is still served from cache instantly (you never see a spinner just because data went stale), but now the triggers in Section 8 (mount, refocus, reconnect) will cause a background revalidation.

So `staleTime` answers "how long do I trust a cached copy without checking the server?" The default is `0`, which means *every* copy is considered stale the instant it arrives. That sounds aggressive, and it is the source of the "it refetches constantly" surprise, but note carefully what it does and does not mean: `staleTime: 0` does **not** mean "no caching" and it does **not** mean "fetch on every render." It means "on the next *trigger* (a new component mounting with this key, a window refocus, a reconnect), revalidate in the background." Between triggers, the cached data is served and shared normally; the deduplication (Section 7) still collapses simultaneous requests into one. People conflate `staleTime: 0` with "no cache," but the cache is fully active; it just never *trusts* a copy long enough to skip a revalidation on a trigger.

Tuning `staleTime` is therefore a statement about how volatile your data is:

- Data that changes rarely or that you do not mind being slightly behind (a list of countries, a user's profile, configuration) wants a *high* `staleTime` (minutes, or even `Infinity` for truly static data), so it is served from cache without refetching and your app feels instant and quiet.
- Data that changes often and must be current (a live dashboard, a feed, anything collaborative) wants a *low* `staleTime` (the default 0, or a few seconds), so triggers keep it fresh.

This is the knob you should set deliberately per query (or as a sensible default on the `QueryClient`), because the default of 0 is conservative and optimized for correctness over network volume. Many "my app refetches too much" complaints are really "I left `staleTime` at 0 for data that barely changes," and many "my data never updates" complaints are "I set `staleTime` very high for data that changes often." The fix in both cases is to match `staleTime` to the data's real volatility, which you can only do once you understand that it controls the fresh-versus-stale line and nothing else.

Keep `staleTime` strictly separate from `gcTime` (Section 6) in your head, because confusing them is the most common conceptual error here. `staleTime` is about *freshness* (do I revalidate this data that someone is using). `gcTime` is about *retention* (how long do I keep data that *nobody* is using). They operate on different phases of an entry's life and answer different questions.

> **Try it.** Set up a query with `staleTime: 0` and one with `staleTime: 60_000`, each logging its `queryFn` call. Mount, unmount, and remount each (navigate away and back, within `gcTime`). Watch the `staleTime: 0` query refetch in the background on remount (stale, so revalidate) while the `staleTime: 60_000` query serves cache with no refetch (still fresh). Toggle window focus and watch the same split. You are watching the fresh-versus-stale line decide whether a trigger causes a refetch.

**You've got this if** you can explain why `staleTime: 0` still caches and deduplicates even though it revalidates on every trigger, and how you would choose `staleTime` for data you know changes once a day.

---

## 6. Garbage collection: gcTime and how the cache is pruned

*Prereqs: Section 5. Outside React: garbage collection (reclaiming memory that is no longer in use) and reference counting.*

**The itch.** You see `gcTime` (and remember `cacheTime` from older code) and assume it is the "how long is data cached" setting, so you set it expecting to control freshness. It does nothing you expect, because it governs a completely different phase of a cache entry's life: what happens after *nobody is using the data anymore*.

**The short version.** `gcTime` controls how long an *inactive* cache entry (one that no mounted component is currently observing) is kept in memory before it is garbage collected and removed. It is a *retention* policy, not a freshness policy. The default is 5 minutes. Its purpose is to let a user navigate away from a screen and come back within `gcTime` and instantly see the previous data (then revalidate it), rather than starting from an empty cache. It was renamed from `cacheTime` in v5 precisely because "cache time" misled people into thinking it controlled freshness, which is `staleTime`'s job (Section 5).

**How it actually works.**

Every cache entry tracks its *observers*: the mounted components currently using that query key (this is the subscription mechanism of Section 7 and Section 14). The count of observers is what decides whether an entry is "active" or "inactive":

- An entry is **active** while at least one mounted component is observing it. Active entries are never garbage collected; they are in use.
- An entry becomes **inactive** the moment its last observer unmounts (you navigate away from the only screen using it). At that point a garbage-collection timer starts, set to `gcTime`.
- If a new observer subscribes before the timer fires (you navigate back within `gcTime`), the timer is cancelled and the entry is active again, with its data intact, so the returning screen shows the previous data instantly while revalidating if stale.
- If the timer fires (nobody came back within `gcTime`), the entry is deleted from the cache to free memory. A later request for that key starts fresh, with no cached data.

This is reference-counted garbage collection: keep data while it is referenced, and reclaim it a set time after the last reference goes away. The reason for the delay (rather than deleting the instant the last component unmounts) is the navigate-away-and-back pattern: users frequently leave a screen and return shortly after, and `gcTime` is the window during which that return is instant instead of a cold load. Set `gcTime` longer and more returns are instant at the cost of holding more data in memory; set it shorter and memory is reclaimed sooner at the cost of more cold loads.

Now the crucial distinction, because confusing these two is the most common conceptual mistake in the whole library. `staleTime` and `gcTime` operate on different phases and answer different questions:

- **`staleTime`** governs an entry **while it is in use**: how long its data is trusted as fresh before triggers revalidate it. It is about *freshness*. (Section 5.)
- **`gcTime`** governs an entry **after it falls out of use**: how long the unused data is retained before being deleted. It is about *retention*.

A query can be stale but still cached (in use, past its `staleTime`, serving stale data while revalidating), and a query can be fresh but garbage-collected (if it went unused long enough, even fresh-when-last-fetched data is eventually pruned once inactive). The two settings do not interact much; they describe different moments. The rename from `cacheTime` to `gcTime` in v5 was specifically to stop people from reading "cacheTime" as "how long data stays cached/fresh," which is what `staleTime` actually controls. If you ever catch yourself reaching for `gcTime` to make data refetch more or less often, stop: that is `staleTime`. `gcTime` only decides how long the cache remembers data that no one is looking at.

> **Try it.** Set a query with `gcTime: 5000` (5 seconds) and `staleTime: Infinity` (so it never refetches from staleness). Mount it, confirm it fetched, unmount it (navigate away), and within 5 seconds navigate back: the data is there instantly with no fetch. Now unmount it and wait more than 5 seconds before returning: watch it fetch fresh, because the inactive entry was garbage collected. You just watched retention (gcTime) operate independently of freshness (staleTime).

**You've got this if** you can explain the difference between `staleTime` and `gcTime` in terms of "in use" versus "out of use," and why navigating back to a screen within `gcTime` shows data instantly.

---

## 7. Deduplication and sharing: one request, many consumers

*Prereqs: Sections 3 and 6. From the State guide: an external store with many subscribers (Section 12). Outside React: a promise being awaited by multiple callers.*

**The itch.** In the manual approach (Section 2), three components needing the same data fired three identical requests, and there was no way to share without lifting state and re-rendering a big subtree. With a keyed cache this just stops happening: many components, one request, shared data. Understanding why makes you trust the cache instead of fighting it.

**The short version.** Because the cache is keyed (Section 3) and lives in one place (Section 14), every component that uses the same query key subscribes to the same cache entry. So N components asking for `['user', 5]` get one shared cache entry and trigger one fetch, not N. In-flight requests are deduplicated too: a second request for a key whose fetch is already running attaches to the existing promise rather than starting a new one. This sharing-and-deduplication is automatic, and it is the thing component-local state fundamentally could not do.

**How it actually works.**

This is the direct payoff of the cache being a single keyed store (Section 3) with observer tracking (Section 6). When a component calls `useQuery({ queryKey: ['user', 5], ... })`, it does not own any data; it *subscribes* to the cache entry at address `['user', 5]` (this is the external-store subscription from the State guide, Section 12, realized through `useSyncExternalStore`, which Section 14 unpacks). Several consequences follow:

**Many consumers, one entry.** If three components on a screen all subscribe to `['user', 5]`, there is still exactly one cache entry for `['user', 5]`, and all three read from it. When it updates, all three are notified and re-render with the new data. There is no lifting, no prop drilling, and no enlarged re-render blast radius (State guide, Sections 2 and 3): the data is shared through the cache, not through the component tree, so a component deep in one branch and a component in another branch share the same data without any common ancestor holding it. This is the cleanest possible answer to "two distant components need the same server data," and it is only possible because the cache is outside the tree.

**Many consumers, one request.** When those three components mount at the same time and the entry is empty (or stale and due for revalidation), you do not get three network calls. The cache sees that a fetch for `['user', 5]` is already in flight and has the other consumers *await the same promise* rather than starting their own. This in-flight deduplication is why a freshly-loaded screen with a dozen widgets all reading the same query fires one request, not a dozen. It is the same idea as multiple callers awaiting one shared promise, lifted to the level of the whole app and keyed by query key.

**Deduplication respects freshness.** The dedup interacts with `staleTime` (Section 5) exactly as you would hope: if the data is fresh, new subscribers get the cached copy with no request at all; if it is stale, the *first* subscriber to trigger a revalidation starts one request and any others that arrive while it is in flight join that same request. So you never get redundant simultaneous fetches for one key, regardless of how many components ask or how they are arranged in the tree.

Step back and notice that this is the external-store model from the State guide (Section 12) specialized for server data. There, the problem was that Context re-renders every consumer because it has no slice-level subscription (the selectivity gap, Section 11 of that guide), and the solution was a store outside the tree that components subscribe to by slice. A server-state cache is exactly such a store: the "slices" are cache entries addressed by query key, and components subscribe to the entries they need. That is why server state belongs in a cache and not in Context or lifted state: the cache gives you the shared-subscription model that the client-state tools cannot, and gives it to you keyed by the natural identity of the data (Section 3). Deduplication and sharing are not bonus features; they are what you get for free once server state lives in a keyed external store instead of in component state.

> **Try it.** Render three components on one screen, each calling `useQuery` with the same key. Open the Network tab and confirm one request serves all three. Then change one of them to a different key and watch a second request appear. Open the Devtools and see the single shared entry with multiple observers (the observer count is the sharing made visible).

**You've got this if** you can explain why three components using the same query key fire one request instead of three, in terms of subscribing to a shared cache entry rather than owning local state.

---

## 8. Background refetching: how the cache stays fresh

*Prereqs: Section 5 (fresh versus stale). Outside React: the browser's window focus and online/offline events.*

**The itch.** You tab away from your app for a few minutes, come back, and the data is already current, with no spinner and no code you wrote. It feels like magic, or, if you did not expect it, like the app is "refetching for no reason." Either way you want to know what triggers a refetch and how to control it, because right now it feels nondeterministic.

**The short version.** Stale data (Section 5) is automatically revalidated in the background on a set of triggers: a component mounting with that key, the window regaining focus, the network reconnecting, and optionally a polling interval. Fresh data (within `staleTime`) is *not* refetched on these triggers. So the freshness policy (`staleTime`) and the triggers together define how current your cache stays. The window-focus refetch is the one that feels magical and occasionally surprising; it is on by default and is what keeps a tabbed-away app current the moment you return.

**How it actually works.**

The cache does not poll the server constantly; that would be wasteful. Instead it revalidates *stale* entries (Section 5) at moments when fresh data is likely to matter, which it learns about from a small set of triggers. The key interaction to hold onto is that **every trigger is gated by `staleTime`**: a trigger only causes a refetch if the data is currently stale. Fresh data is left alone no matter how many triggers fire. The triggers are:

- **Mount (`refetchOnMount`, default true).** When a component mounts and subscribes to a key whose data is stale, it revalidates. This is why navigating to a screen shows cached data instantly (Section 5) and then quietly updates it if stale. Fresh data on mount does not refetch.
- **Window focus (`refetchOnWindowFocus`, default true).** When the browser window or tab regains focus, the cache revalidates all *stale active* queries. This is the "magic" one: you tab to your email, come back, and your data is current because refocusing triggered a background revalidation of the stale entries. The cache listens to the browser's focus event globally (on the `QueryClient`) and fans the revalidation out to the stale queries that currently have observers.
- **Reconnect (`refetchOnReconnect`, default true).** When the network comes back online (the browser's online event), stale queries revalidate, because data fetched before going offline is likely out of date.
- **Interval (`refetchInterval`, off by default).** Setting an interval turns a query into a poller: it revalidates every N milliseconds while mounted, which is how you build live-updating data (a dashboard, a status page) without sockets. There is a companion `refetchIntervalInBackground` for whether polling continues while the tab is unfocused.

Because all of these are gated by `staleTime`, the way you control "how much does my app refetch" is almost always by setting `staleTime`, not by disabling triggers. If a screen refetches more than you want, the usual right fix is to raise `staleTime` for that data (it changes rarely, so trust the cache longer), which leaves the triggers in place but makes them no-ops while the data is fresh. Disabling `refetchOnWindowFocus` globally is a common over-correction: it does stop the focus refetches, but it also throws away the main mechanism keeping your app current, and it usually indicates that `staleTime` was set too low for the data in question. Reach for disabling a trigger only when the trigger itself is wrong for a specific query (for example, a one-time fetch that should never refetch on focus), and reach for `staleTime` for "this refetches too often."

There are also the *manual* and *write-driven* refetch paths, which complete the picture: you can call the `refetch` function a query returns to force a revalidation (for a "refresh" button), and, most importantly, mutations invalidate queries to trigger refetches after a write (Section 10). Those are deliberate refetches you cause; the triggers above are the automatic background synchronization that keeps the cache honest without you thinking about it. Together they are why a server-state cache feels alive (it tracks the server) where component-local state felt frozen (Section 2): the cache has a set of well-defined moments at which it checks the source, all gated by the freshness policy you set.

> **Try it.** Set a query with `staleTime: 0` and watch the Devtools as you click away from the browser window and back: a background refetch fires on refocus (the entry flips to fetching, then settles). Now set `staleTime: Infinity` and repeat: refocusing does nothing, because the data is never stale. Then add `refetchInterval: 3000` and watch it poll every three seconds. You are watching triggers fire and `staleTime` decide whether each one does anything.

**You've got this if** you can explain why raising `staleTime` is usually the right fix for "my app refetches too much," rather than disabling `refetchOnWindowFocus`, in terms of triggers being gated by freshness.

---

## 9. The enabled flag and dependent queries

*Prereqs: Sections 3 and 4. From the Hooks guide: the rules of hooks, no conditional hook calls (Section 1). Outside React: nothing new.*

**The itch.** You need to fetch a user's posts, but only after you know the user's id, which itself comes from another query. Or you only want to search once the user has typed something. You cannot just wrap `useQuery` in an `if`, because that breaks the rules of hooks. The answer is the `enabled` flag, and it is also the thing you have reached for before to gate queries.

**The short version.** `enabled` is a boolean option that controls whether a query is allowed to run. When `enabled` is false, the query does not fetch and sits in a waiting state; when it flips to true, it runs. This is the declarative way to do conditional and dependent fetching, and it exists precisely because you *cannot* call `useQuery` conditionally (the rules of hooks forbid it). The classic use is the dependent query: `enabled: !!userId` so the posts query waits until the user query has produced an id.

**How it actually works.**

Recall from the Hooks guide (Section 1) that hooks must be called unconditionally, in the same order every render, because they are stored positionally on the fiber. So you can never write `if (userId) { useQuery(...) }`; that desyncs the hook list. This is exactly why `enabled` exists: it lets you *always call* `useQuery` (satisfying the rules of hooks) while *conditionally allowing the fetch* (achieving the gating you wanted). The condition moves from "whether to call the hook" to "an option passed to the hook," which is the declarative pattern React pushes you toward throughout (it is the same shape as a dependency array gating an effect rather than an `if` around the effect).

Mechanically, when `enabled: false`, the query will not run its `queryFn`: its `fetchStatus` is `idle` and, if it has no cached data, its `status` is `pending`. When `enabled` becomes `true`, the query behaves normally (fetches if stale or empty, serves cache if fresh). So `enabled` is a gate on the *trigger* logic from Section 8: a disabled query ignores all triggers and never fetches until enabled.

The canonical uses:

**Dependent (sequential) queries.** When one query needs a value produced by another, gate the second on the presence of that value:

```js
const { data: user } = useQuery({ queryKey: ['user', email], queryFn: () => fetchUser(email) });
const userId = user?.id;
const { data: posts } = useQuery({
  queryKey: ['posts', userId],
  queryFn: () => fetchPosts(userId),
  enabled: !!userId, // do not run until we actually have an id
});
```

The posts query is created on the first render but disabled (`enabled: !!userId` is false while `userId` is undefined), so it does not fire a request for `['posts', undefined]`. When the user query resolves and `userId` becomes defined, `enabled` flips true and the posts query runs. This is sequential fetching expressed declaratively, with no effect and no `if` around a hook.

**Conditional fetching on user input.** Gate a search query on a non-empty term: `enabled: searchTerm.length > 0`, so you do not fetch for an empty search. Gate a query on authentication: `enabled: isLoggedIn`. The pattern is always "always call the hook, pass a condition to `enabled`."

There is one sharp edge worth stating plainly, because it connects to Section 4 and is a real bug people hit. A disabled query with no cached data is in `status: 'pending'`, so `isPending` is `true` while it is disabled. If you wire a spinner to `isPending`, a query that is *intentionally* waiting (for an id, for a search term) will show a spinner forever, even though nothing is loading. The fix is the Section 4 distinction: bind your spinner to `isLoading` (which is `isPending && isFetching`), so it is only true when the query is both empty *and* actively fetching, not merely disabled. A disabled query has `isFetching` false, so `isLoading` is false, so no spinner. This is the most common `enabled` gotcha, and it is really a status-model gotcha (Section 4) showing up through `enabled`.

A note on keeping `enabled` honest: the condition you pass should be derived from real values, and the query key should still include every input the `queryFn` uses (Section 3), even the ones the query is gated on. Keying `['posts', userId]` while `userId` is undefined is fine because the query is disabled and will not run; once enabled, the key already addresses the right entry. Do not try to "fix" a dependent query by leaving the dependency out of the key; gate it with `enabled` and key it fully.

> **Try it.** Build the user-then-posts dependent query above and watch the Network tab: no `posts` request fires until the `user` request resolves and supplies an id. Then bind a spinner to `isPending` and watch it show before the id exists (the gotcha), and switch it to `isLoading` and watch the spinner correctly stay hidden while the query is merely disabled.

**You've got this if** you can explain why `enabled` exists instead of wrapping `useQuery` in an `if`, and why a disabled query can show a spurious spinner if you bind it to `isPending` instead of `isLoading`.

---

## 10. Mutations and cache invalidation

*Prereqs: Sections 1, 3, and 5. From the State guide: a single source of truth and avoiding stale copies (Sections 4 and 5). Outside React: HTTP write methods (POST, PUT, DELETE) versus reads (GET).*

**The itch.** You can read data fine, but when the user *changes* something (creates a todo, edits a profile), the screen keeps showing the old data until a refresh. You are not sure how a write is supposed to tell all the cached reads that they are now out of date. That coordination is the entire point of mutations and invalidation.

**The short version.** A mutation is a write (create, update, delete). You run it with `useMutation`, which gives you a `mutate` function and its own status. Mutations do not cache; their job is to perform the write and then *make the cache honest again*, because after a successful write, your cached read queries are stale (the server changed). You reconcile in one of two ways: **invalidate** the affected queries (mark them stale so they refetch from the server, the safe default), or **write the result directly into the cache** with `setQueryData` (when you already know the new value). Invalidation is how a write tells every relevant read "you are out of date now."

**How it actually works.**

Reads and writes are different operations with different shapes, which is why they have different hooks. A read (`useQuery`) is idempotent, cacheable, and shared. A write (`useMutation`) is a one-shot action with side effects on the server; it is not cached and not keyed, and it has its own lifecycle:

```js
const queryClient = useQueryClient();
const mutation = useMutation({
  mutationFn: (newTodo) => createTodo(newTodo),
  onSuccess: () => {
    // the server changed, so the cached todos list is now stale: tell it to refetch
    queryClient.invalidateQueries({ queryKey: ['todos'] });
  },
});
// mutation.mutate({ title: 'Buy milk' });  mutation.isPending, mutation.isError, etc.
```

`useMutation` gives you `mutate` (call it to perform the write), and status flags (`isPending` while in flight, `isSuccess`, `isError`) and lifecycle callbacks (`onMutate`, `onSuccess`, `onError`, `onSettled`). The flags exist for the same reason queries have them: a write is asynchronous and can fail, and you want to disable the submit button while it is in flight and show an error if it fails. But the architecturally important part is not the write itself; it is what happens *after* the write, because a successful write invalidates assumptions baked into your cached reads.

This is the State guide's single-source-of-truth principle (Sections 4 and 5) operating across the network. After you create a todo on the server, the server's list of todos is different, so your cached `['todos']` entry is now a stale copy of a source that changed. Something has to bring the copy back into agreement with the source. There are two strategies, and choosing between them is a real design decision:

**Strategy one: invalidate (the safe default).** `queryClient.invalidateQueries({ queryKey: ['todos'] })` marks every cache entry whose key starts with `['todos']` as stale and triggers a background refetch of the active ones. You are telling the cache "the truth changed; go ask the server again." This is the safe, simple default because it does not assume you know what the server will return; it just refetches and lets the server be authoritative. The hierarchy of keys (Section 3) is what makes this ergonomic: invalidating `['todos']` catches `['todos']`, `['todos', { filter: 'active' }]`, `['todos', 5]`, and so on in one call, so a single write can refresh a whole family of related reads. The cost is a network round trip after the mutation, which is usually fine and is the correct trade when you want guaranteed consistency with the server.

**Strategy two: write the cache directly with `setQueryData`.** When you already know the exact new state (the mutation returns the created todo, or you can compute the new list locally), you can write it straight into the cache: `queryClient.setQueryData(['todos'], old => [...old, newTodo])`. This skips the refetch entirely, so the UI updates without a round trip. The cost is that you are now responsible for computing the same result the server would, and if you get it wrong, your cache disagrees with the server. So `setQueryData` is the "I know the answer" path; it is faster but assumes more, and it is the mechanism underneath optimistic updates (Section 11). Many teams combine the two: `setQueryData` for instant feedback, plus an `invalidateQueries` in `onSettled` to reconcile with the server afterward.

The mental model to carry: a mutation is not finished when the write succeeds; it is finished when the cache reflects the new reality. The `onSuccess`/`onSettled` callbacks are where you do that reconciliation, and "did I invalidate or update the right query keys after this mutation" is the question to ask whenever a write succeeds but the screen still shows old data. That stale-after-write bug is almost always a missing or mis-keyed invalidation, which is really a single-source-of-truth violation: the source changed and you did not tell the copy.

> **Try it.** Build a todos list with `useQuery(['todos'])` and a create form with `useMutation`. First write the mutation with *no* `onSuccess`, submit, and watch the new todo *not* appear until you manually refresh (the stale-after-write bug). Add `invalidateQueries({ queryKey: ['todos'] })` in `onSuccess` and watch the list refetch and update automatically. Then try `setQueryData` instead and watch it update with no network call.

**You've got this if** you can explain why a successful mutation leaves your cached reads stale, and the difference between invalidating a query and writing its cache directly with `setQueryData`.

---

## 11. Optimistic updates

*Prereqs: Section 10 (mutations, invalidation, `setQueryData`). From the Hooks guide: `useOptimistic` as the React-level version (Section 15). Outside React: nothing new.*

**The itch.** When the user toggles a checkbox or sends a message, you do not want them to wait for the server round trip before the UI responds; that lag makes the app feel sluggish. You want the change to appear instantly and only roll back if the server rejects it. That is an optimistic update, and doing it correctly (especially the rollback) has a specific recipe.

**The short version.** An optimistic update applies the expected result to the cache *before* the server confirms, so the UI feels instant, and rolls back if the mutation fails. The recipe has four parts using the mutation callbacks: in `onMutate`, cancel any in-flight refetches and snapshot the current cache, then optimistically write the expected value; in `onError`, restore the snapshot (roll back); in `onSettled`, invalidate to reconcile with the real server result. React 19's `useOptimistic` hook provides the same idea at the React level for Actions. The thing to get right is the rollback, because an optimistic update that cannot undo itself leaves the UI lying after a failure.

**How it actually works.**

Optimistic updates trade safety for responsiveness: you *assume* the write will succeed and update the UI immediately, accepting that you must undo the change if the assumption turns out wrong. The cache is the right place to do this, because every component reading the affected query will reflect the optimistic value automatically (Section 7). The classic recipe, using the mutation lifecycle from Section 10, is:

```js
useMutation({
  mutationFn: toggleTodo,
  onMutate: async (newTodo) => {
    // 1. Cancel outgoing refetches so they cannot overwrite our optimistic value
    await queryClient.cancelQueries({ queryKey: ['todos'] });
    // 2. Snapshot the current cache, so we can roll back on error
    const previous = queryClient.getQueryData(['todos']);
    // 3. Optimistically write the expected new value
    queryClient.setQueryData(['todos'], (old) => applyToggle(old, newTodo));
    // 4. Pass the snapshot to the other callbacks via the context return value
    return { previous };
  },
  onError: (err, newTodo, context) => {
    // Roll back to the snapshot we took in onMutate
    queryClient.setQueryData(['todos'], context.previous);
  },
  onSettled: () => {
    // Whether it succeeded or failed, reconcile with the server's actual state
    queryClient.invalidateQueries({ queryKey: ['todos'] });
  },
});
```

Walk the four steps and why each exists:

1. **Cancel outgoing refetches** (`cancelQueries`). If a background refetch for `['todos']` is in flight, it could resolve *after* you write your optimistic value and overwrite it with stale server data. Cancelling prevents that race. This is the same class of problem as the fetch-race in the Hooks guide (Section 9): two async results competing, and you make the right one win.
2. **Snapshot the previous data** (`getQueryData`). This is your rollback point. You stash it and return it from `onMutate`; TanStack Query passes that return value as the `context` argument to `onError` and `onSettled`, which is how the snapshot reaches the rollback step.
3. **Optimistically update** (`setQueryData`). You write the value you expect the server to produce, so the UI updates instantly. Every consumer of `['todos']` re-renders with the optimistic value.
4. **Roll back on error, reconcile on settle.** If the mutation fails, `onError` restores the snapshot, so the UI returns to the truth. Regardless of outcome, `onSettled` invalidates the query so the cache is reconciled with the server's actual state (in case your optimistic guess differed from what the server did).

The part people get wrong is the rollback. An optimistic update without a correct `onError` rollback means that when the write fails, the UI keeps showing the change that did not happen, which is worse than no optimism at all, because the user believes something succeeded that did not. So the snapshot-and-restore is not optional polish; it is the half that makes optimism safe. And the `onSettled` invalidation matters because your optimistic guess might be slightly different from the server's result (the server might add a timestamp, assign an id, or apply a rule you did not replicate), and reconciling afterward keeps the cache from quietly diverging from the source.

v5 also offers a simpler optimistic pattern for cases where you do not need to write the shared cache: you can read the mutation's `variables` and `isPending` and render the optimistic item directly in the component (for example, show the pending message in the list with a "sending" style), letting the cache update normally on success. This avoids the cache-surgery recipe above when the optimistic state only needs to appear in one place. Reach for the full `onMutate` recipe when the optimistic change must be visible everywhere the query is read; reach for the `variables` approach when it is local to the component firing the mutation.

Finally, the connection to React itself: React 19's `useOptimistic` hook (Hooks guide, Section 15; also in the RSC guide's Actions section) is the same concept at the framework level. It lets you show an optimistic value during an async Action and automatically reverts to the real state when the Action settles, without touching a query cache. The mental model is identical, "show the expected result now, reconcile when the truth arrives," applied at the level of React Actions rather than a query cache. Knowing both exist lets you pick the right layer: `useOptimistic` for a form Action's local optimistic UI, the mutation recipe for optimistic changes to shared cached data.

> **Try it.** Build a toggle backed by a mutation and add the four-step optimistic recipe. Toggle it and watch the UI flip instantly, before the network call finishes (throttle your network in DevTools to make the gap visible). Then make the `mutationFn` reject and watch the UI roll back to the previous state via `onError`. Removing the `onError` rollback and watching the failed change *stick* is the fastest way to feel why the snapshot matters.

**You've got this if** you can explain why an optimistic update must snapshot the cache before changing it, and what goes wrong if you skip the `onError` rollback.

---

## 12. Pagination, infinite queries, and prefetching

*Prereqs: Sections 3 and 5. From the State guide: referential stability and avoiding flicker from changing identity (Hooks guide, Section 8). Outside React: pagination and cursors, and the idea of warming a cache ahead of need.*

**The itch.** Paginated lists flicker: every time you change the page, the list blanks to a spinner and then fills in, because the new page is a new query with no data yet. Infinite scroll is fiddly to wire up by hand. And navigating to a detail page always shows a loading state even though you could have fetched the data while the user was hovering the link. Each of these has a built-in answer.

**The short version.** Pagination, infinite scroll, and prefetching are three patterns built on the cache. For pagination, each page is a separate cache entry keyed by page number, and `placeholderData: keepPreviousData` (v5) shows the previous page's data while the next page loads, eliminating the blank-and-spinner flicker. For infinite scroll, `useInfiniteQuery` manages an array of pages and the cursors between them, with `fetchNextPage` appending. For instant navigation, `queryClient.prefetchQuery` warms the cache before the user arrives (on hover or intent), so the destination renders from cache with no loading state.

**How it actually works.**

**Pagination.** The natural way to page is to put the page number in the query key (Section 3): `['todos', { page }]`. Each page is then its own cache entry, which is correct (page 1 and page 2 are genuinely different data) but produces an annoying behavior by default: when `page` changes from 1 to 2, the key changes, so `useQuery` points at a new entry that has no data yet, so the list blanks to a `pending` state and shows a spinner before page 2 arrives. The list flickers on every page change. The fix is `placeholderData: keepPreviousData` (in v5, the old `keepPreviousData` option was merged into `placeholderData`, and you pass the imported `keepPreviousData` function):

```js
import { keepPreviousData, useQuery } from '@tanstack/react-query';

const { data, isPlaceholderData } = useQuery({
  queryKey: ['todos', { page }],
  queryFn: () => fetchTodos(page),
  placeholderData: keepPreviousData, // while page 2 loads, keep showing page 1's data
});
```

Now when `page` changes, while the new page's entry is still loading, the query returns the *previous* page's data as a placeholder (with `isPlaceholderData: true`, so you can dim the list or disable the "next" button until the real data arrives), instead of blanking to a spinner. The list stays populated and smoothly swaps to the new page. This is a referential-stability-adjacent idea (Hooks guide, Section 8): you are avoiding a jarring identity change in what is rendered by bridging the gap with the prior value. The data still ends up correctly keyed per page in the cache; `keepPreviousData` only affects what is shown *during* the transition.

**Infinite queries.** Infinite scroll and "load more" are a different shape: you are not jumping between pages, you are *accumulating* them into one growing list. `useInfiniteQuery` is built for this. Its cache entry holds an object with `pages` (an array of the fetched page results) and `pageParams` (the cursor or page number used for each), rather than a single page. You provide `getNextPageParam` (and optionally `getPreviousPageParam`), a function that, given the last page, returns the cursor for the next one (or `undefined` if there are no more, which sets `hasNextPage` to false). Calling `fetchNextPage` runs the `queryFn` with the next cursor and appends the result to `pages`. So the component renders `data.pages.flat()` (all items so far) and calls `fetchNextPage` when the user scrolls near the bottom. The cache holds the whole accumulated list as one entry, which means it is shared and cached like any other query, and v5 can cap how many pages are retained (`maxPages`) and prefetch several pages at once. The key insight is that infinite data is *one* cache entry containing many pages, not many entries, which is why scrolling back up does not refetch.

**Prefetching.** The cache lets you fetch data *before* a component that needs it mounts, so the data is already present when it does. `queryClient.prefetchQuery({ queryKey, queryFn })` runs a fetch and stores the result in the cache without subscribing any component to it. The canonical use is instant navigation: when the user hovers a link or otherwise signals intent to navigate, prefetch the destination's data, so by the time they click and the destination mounts, its `useQuery` finds fresh cached data and renders immediately with no loading state. Because prefetched data lands in the same keyed cache, the destination's `useQuery` with the matching key just picks it up; there is no special wiring beyond matching keys. Routers often integrate this (prefetching on link hover or on route intent), and it is one of the highest-impact, lowest-effort performance wins available, because perceived performance is dominated by navigation, and prefetching removes the navigation spinner entirely.

All three patterns are the same cache (Section 1) viewed through different access patterns: pagination is many keyed entries with a placeholder bridging transitions, infinite scroll is one multi-page entry that grows, and prefetching is writing to the cache ahead of a read. None of them is a separate system; they are what a keyed, shared, persistent cache makes possible.

> **Try it.** Build a paginated list keyed by `['items', { page }]` and page through it: without `placeholderData`, watch it blank to a spinner on every page change; add `placeholderData: keepPreviousData` and watch the previous page stay visible until the next loads. Separately, add a detail link and call `prefetchQuery` on its `onMouseEnter`, then click it and watch the detail page render instantly from cache while a non-prefetched link shows a spinner.

**You've got this if** you can explain why a paginated list flickers without `keepPreviousData` (a new key means a new empty entry) and how prefetching removes a navigation spinner (the data is in the cache before the component mounts).

---

## 13. Suspense for data, and React 19's use()

*Prereqs: Section 4 (the status model you are replacing). From the Hooks guide: `use()` (Section 15). From the rendering guide: Suspense and how it shows a fallback while a child is not ready. Outside React: promises.*

**The itch.** Every data component has the same shape: check `isLoading`, return a spinner; check `isError`, return an error; otherwise render the data. That branching is repetitive and pushes loading and error handling into every component. Suspense lets you hoist that out, so components assume the data is there. You want to know how it works and what it costs.

**The short version.** Suspense lets a component *suspend* (tell React "I am not ready") while its data loads, so React shows the nearest `<Suspense>` fallback instead, and shows an error boundary if it fails. With TanStack Query you opt in via `useSuspenseQuery`, which suspends instead of returning a `pending` status, so inside the component the data is *guaranteed defined*, no loading branch needed. React 19's `use()` is the lower-level primitive that suspends on a promise; `useSuspenseQuery` builds the full caching machinery on top of that suspend-on-promise mechanism. The trade is that loading and error states move from inside the component to boundaries around it, which is cleaner but requires placing those boundaries deliberately.

**How it actually works.**

Suspense (rendering guide) is a mechanism where a component can signal "the data I need is not ready yet" by suspending, and React responds by rendering the nearest `<Suspense fallback={...}>` ancestor's fallback until the component is ready, then swapping in the real content. Errors are handled by a nearby error boundary. The effect is that loading and error handling become *structural* (expressed by where you place `<Suspense>` and error boundaries in the tree) rather than *per-component* (expressed by `isLoading`/`isError` branches inside each component).

`useSuspenseQuery` is the Suspense-flavored version of `useQuery` (stable in v5; the older `suspense: true` option on `useQuery` was removed in favor of these dedicated hooks):

```js
function Profile({ id }) {
  // No isLoading, no isError branch: if this line runs, data is defined.
  const { data } = useSuspenseQuery({ queryKey: ['user', id], queryFn: () => fetchUser(id) });
  return <h1>{data.name}</h1>;
}

function Page({ id }) {
  return (
    <ErrorBoundary fallback={<Error />}>
      <Suspense fallback={<Spinner />}>
        <Profile id={id} />
      </Suspense>
    </ErrorBoundary>
  );
}
```

Instead of returning a `pending` status, `useSuspenseQuery` *suspends* the component while the data loads, so the `<Suspense>` shows `<Spinner />`; if the fetch errors, it throws to the `<ErrorBoundary>`, which shows `<Error />`. Inside `Profile`, `data` is guaranteed to be defined (TanStack Query even encodes this in the types: `data` is not `T | undefined` here, just `T`), because the component only renders when the data is ready. The repetitive three-way branch from Section 4 is gone, replaced by two boundaries placed once around the subtree. This is a real readability and structure win: your data components describe the success case, and the loading and error cases live in the structure around them.

React 19's `use()` (Hooks guide, Section 15) is the primitive underneath this idea. `use(promise)` reads a promise: if the promise is pending, the component suspends (exactly the Suspense mechanism); when it resolves, `use` returns the value; if it rejects, it throws to the error boundary. So `use()` is "suspend on this promise" as a raw capability. `useSuspenseQuery` is not literally `use()`, but it is the same suspend-on-pending behavior with the entire cache (keys, staleTime, dedup, background refetch, invalidation) wrapped around it. The relationship to hold: `use()` gives you suspend-on-a-promise with no caching; `useSuspenseQuery` gives you suspend-on-data with the full server-state cache. For ad hoc promises (especially a promise created on the server and passed to a client component, which the RSC guide covers) `use()` is the right tool; for cached server data with all the synchronization behavior, `useSuspenseQuery` is.

The costs and cautions, because Suspense is not free of trade-offs:

- **Boundary placement matters.** The fallback you see is the *nearest* `<Suspense>` ancestor's. Place it too high and a small loading piece blanks a large region; place it per-section and each region loads independently. You now design loading states by tree structure, which is more powerful but requires thought.
- **Request waterfalls.** If you nest suspending components so that a child only starts fetching after its parent resolves, you serialize requests that could have run in parallel, producing a slow waterfall. The fix is to start fetches as early as possible (prefetch, or hoist the queries) so they run concurrently. This is a real and common Suspense pitfall (Section 15).
- **You lose the in-component background indicators.** With `useSuspenseQuery`, the component does not see `isFetching` for a background refetch the same way; background revalidation still happens, but the "show a subtle refreshing indicator" pattern from Section 4 is handled differently. Suspense is cleanest for the initial-load story; you still reach for the non-Suspense `useQuery` and its status flags when you want fine-grained in-component control over background states.

So Suspense for data is a structural choice: it makes data components assume success and pushes loading and error handling to boundaries, which is excellent for clean code and for coordinating multiple loads, at the cost of designing boundary placement and watching for waterfalls. It composes with everything else in this guide, because `useSuspenseQuery` is the same cache with a different way of surfacing the loading state.

> **Try it.** Convert a component from `useQuery` (with `isLoading`/`isError` branches) to `useSuspenseQuery` wrapped in `<Suspense>` and an error boundary, and watch the branches disappear from the component while the spinner and error move to the boundaries. Then deliberately nest two suspending components so the inner one waits for the outer, throttle the network, and watch the waterfall; hoist both queries to start together and watch them parallelize.

**You've got this if** you can explain how `useSuspenseQuery` lets a component assume its data is defined, and the relationship between it and React 19's `use()` (both suspend on a pending promise; one wraps a full cache around it).

---

## 14. How the cache connects to the rendering engine and RSC

*Prereqs: Sections 1 and 7. From the State guide: external stores and `useSyncExternalStore`, the selector model, and tearing (Sections 11 and 12). From the rendering guide: concurrent rendering and tearing. From the RSC guide: server components fetching on the server, and hydration.*

**The itch.** You have used TanStack Query as a black box. You want to see how it actually plugs into React, why v5 specifically requires React 18, how it avoids the consistency bugs that come with concurrent rendering, and how it relates to fetching in Server Components, so it stops being magic and starts being a thing you understand the shape of.

**The short version.** A server-state cache is an *external store* (State guide, Section 12) specialized for remote data: it lives outside React's tree, and components subscribe to cache entries through `useSyncExternalStore`, which is why TanStack Query v5 requires React 18 and is safe under concurrent rendering (it avoids tearing). The `select` option is a *selector* in the external-store sense: it lets a component re-render only when its chosen slice of the data changes. And in a Server Components world, server components can fetch directly on the server, while the client cache is hydrated from server-fetched data so the client starts warm. This section ties the whole series together: the cache is the external-store pattern, realized for server state.

**How it actually works.**

The State guide (Section 12) described the external-store model: state lives outside React's component tree, components subscribe to the slice they need via a selector, the store notifies only the subscribers whose slice changed, and React binds to it safely through `useSyncExternalStore` to avoid *tearing* (the concurrency bug, defined in one line: under concurrent rendering React can pause mid-render, and if external state changes during the pause, components rendered before and after the pause would see different values, so one screen shows two versions of the same data). A server-state cache is exactly this pattern, specialized for remote data:

**The cache is the store.** The `QueryClient` holds the cache, a plain object outside React's tree (Section 1). It is not component state, not Context, not lifted; it is an external store whose entries are addressed by query key (Section 3).

**Components subscribe through `useSyncExternalStore`.** When you call `useQuery`, under the hood it creates an observer for the relevant cache entry and subscribes to it using React's `useSyncExternalStore` (Hooks guide, Section 15). This is the literal reason TanStack Query v5 requires React 18 or later: `useSyncExternalStore` is the React 18 primitive for subscribing to an external store correctly, including under concurrent rendering. So the deduplication and sharing from Section 7 are the external-store "many subscribers, one store entry" model, and the safety under React 19's concurrency is `useSyncExternalStore` doing its tearing-prevention job. The cache being correct under concurrent rendering is not luck; it is built on the primitive designed for exactly that.

**`select` is a selector.** The `select` option transforms a query's data and, crucially, lets a component subscribe to a *derived slice*: if you `select` only one field of a large response, the component re-renders only when that field changes, not when unrelated parts of the data change. This is the selector-based subscription from the State guide (Section 12), the very thing Context could not do (the selectivity gap, Section 11 of that guide). So a server-state cache closes the selectivity gap for remote data the same way an external store closes it for client state, because it *is* an external store with selectors. The connection is not an analogy; it is the same mechanism.

**The RSC and hydration angle.** In a Server Components world (RSC guide), the calculus shifts. A Server Component can fetch data directly on the server (it can `await` in the component), so for data that is only needed to render server-side, you may not need a client cache at all; the data is fetched and rendered on the server and sent as HTML and the RSC payload. But the moment you want client interactivity over that data (refetching, mutations, optimistic updates, background synchronization), you want it in the client cache. The pattern is to fetch (or prefetch) on the server, *dehydrate* the cache (serialize its entries), send that to the client, and *hydrate* it (deserialize into the client `QueryClient`) so the client cache starts warm with the server-fetched data and no initial client fetch is needed. v5 also has experimental streaming integration for Next.js where a single `useSuspenseQuery` initiates fetching on the server during SSR and streams the result to the client, where it lands in the cache automatically. The shape to remember: server components fetch on the server; the client cache is seeded from that server data via hydration; from there it behaves like any client-side cache. This is where this guide meets the RSC guide, and the framework-coupled details (which the RSC guide and a future hydration guide cover) sit on top of this core relationship.

Putting it together across the series: the rendering engine gives you Suspense, concurrent rendering, and the tearing problem; the Hooks guide gives you `useSyncExternalStore` and `use()`; the State guide gives you the external-store-with-selectors model and the server-versus-client distinction; and a server-state cache is the synthesis, an external store, subscribed through `useSyncExternalStore`, with selectors (`select`), specialized for the one kind of state that is a cache of something you do not own. Seeing it as "the external-store pattern for server state" is what makes every behavior in this guide a consequence rather than a feature.

> **Try it.** Add `@tanstack/react-query-devtools` and watch a cache entry's observer count rise and fall as components mount and unmount: that is the external-store subscription. Add a `select` that picks one field and update an unrelated field of the response (via `setQueryData`): watch the selecting component *not* re-render, the selector-based subscription closing the selectivity gap. If you have a Next.js app, prefetch on the server and hydrate, and watch the client render with data and no initial client fetch.

**You've got this if** you can explain why TanStack Query v5 requires React 18 (it subscribes via `useSyncExternalStore`), and why a server-state cache is accurately described as an external store with selectors specialized for remote data.

---

## 15. Pitfalls and anti-patterns

*Prereqs: most of the guide. From the State guide: server state versus client state (Section 14) and the derived-state anti-pattern (Section 4). From the Hooks guide: the dependency-array parallel (Section 7).*

**The itch.** You want the list of mistakes that look reasonable and bite later, each tied to the mechanism it violates, so you can recognize them in review (your own or a teammate's) before they ship.

**The short version.** The recurring anti-patterns are: putting server data in client-state tools; copying query data into local state with an effect; query keys that omit inputs; confusing `staleTime` and `gcTime`; binding spinners to the wrong status flag; over-using `enabled`; and Suspense request waterfalls. Each is a violation of a specific mechanism from earlier sections, and naming the mechanism is how you fix it rather than patch the symptom.

**How it actually works.**

**Putting server data in `useState`, Redux, or Context.** This is the foundational mistake (State guide, Section 14, and Section 1 here): you lose caching, deduplication, background synchronization, and the invalidation story, and you rebuild them by hand. The fix is to keep server state in a server-state cache and reserve client-state tools for genuine client state (UI flags, form inputs, selections). If you find a server response living in Redux, that is the smell.

**Copying query data into local state with an effect.** A specific and common version of the above: you `useQuery` to get data, then `useEffect(() => setLocalData(data), [data])` to mirror it into `useState` so you can edit it or "have it locally." This is the derived-state anti-pattern (State guide, Section 4) plus the unnecessary-effect anti-pattern (Hooks guide, Section 6): you have created a second source of truth that desyncs from the cache, and an effect whose only job is to copy. The fix depends on intent: to *transform* the data, use the `select` option (Section 14); to *edit* it in a form, initialize form state from the data once and let the form own the draft, or use the cache as the source and mutate; to *read* it, just use `data` directly. The cache is already the store; do not shadow it in local state.

**Query keys that omit inputs.** Covered in Section 3, repeated here because it is so common: if the `queryFn` uses a value not present in the key, you get cache collisions and stale wrong data, and changes to that value do not refetch. The fix is to include every input in the key, treating it exactly like a `useEffect` dependency array (Hooks guide, Section 7). The linter analog is discipline (and query key factories); the mechanism is that the key is the address.

**Confusing `staleTime` and `gcTime`.** Reaching for `gcTime` to control how often data refetches (that is `staleTime`, Section 5) or for `staleTime` to control memory retention (that is `gcTime`, Section 6). The fix is the in-use-versus-out-of-use distinction: `staleTime` for freshness while in use, `gcTime` for retention while unused.

**Binding a spinner to the wrong flag.** Using `isFetching` where you meant `isLoading` makes the spinner flash on every background refetch; using `isPending` for a disabled query (Section 9) makes a permanent spinner. The fix is the two-axis status model (Section 4): `isLoading` (no data *and* fetching) for full-screen spinners, `isFetching` for subtle background indicators.

**Over-using or mis-deriving `enabled`.** Gating queries on `enabled` is correct (Section 9), but deriving the `enabled` condition from an unstable or wrong value, or using it where the real fix is a proper query key, leads to queries that never run or run at the wrong time. The fix is to gate on a clear boolean derived from real values, and to still key the query fully.

**Suspense request waterfalls.** Nesting suspending components so each waits for its parent serializes fetches that could be parallel (Section 13), producing slow loads. The fix is to start fetches as early as possible: prefetch, hoist queries above the suspense boundaries, or fetch in parallel rather than in a parent-child chain.

**Treating `staleTime: 0` as "no cache."** It is not (Section 5); the cache is fully active and deduplicating, it just revalidates on triggers. Setting it everywhere is fine for correctness but may refetch more than you want for data that rarely changes; the fix is to set `staleTime` to match each data type's volatility rather than leaving everything at the conservative default.

**Non-serializable query keys.** Keys are hashed, so they must be serializable (no functions, class instances, or other non-serializable values). The fix is to key by serializable identifiers (ids, primitive params, plain objects).

The thread through all of these: a server-state cache is a precise mechanism (a keyed external store with a freshness policy and a synchronization model), and each anti-pattern is what happens when you act against one of those mechanics, store server state where there is no cache, address an entry with an incomplete key, confuse the freshness knob with the retention knob, or read the wrong status axis. Fixing them is always a matter of naming which mechanism you violated, which is why the earlier sections are worth the depth: they are the diagnostic vocabulary.

> **Try it.** Audit one feature in your codebase against this list. Look specifically for a `useEffect` that copies query `data` into `useState`, and for any query key that does not contain every variable its `queryFn` reads. Those two are the most common and the most quietly damaging, and finding one in your own code is more convincing than any explanation.

**You've got this if** you can take "we copied the query data into local state with an effect" and name the two anti-patterns it combines and the mechanism-respecting fix.

---

## 16. Debugging data fetching

*Prereqs: the rest of the guide.*

**The itch.** Something is off: data is stale after a save, a spinner will not go away, a list flickers, the same request fires twice, or a query never runs. You want to map the symptom to the mechanism and fix it at the cause rather than papering over it.

**The short version.** Most data-fetching bugs are one of a small set, and each maps to a section. The procedure: open the Devtools to see the actual cache state, identify which mechanism the symptom implicates (a key problem, a freshness problem, a status-flag problem, an invalidation problem), and fix at that level. The Devtools panel, which shows every query, its key, status, freshness, and observer count, is your primary instrument, because it makes the cache visible.

**How it actually works.**

Install `@tanstack/react-query-devtools` first; nearly every diagnosis below is faster when you can see the cache. Then walk the symptoms.

**Data is stale after a mutation (the save did not show up).** A missing or mis-keyed invalidation (Section 10). The write succeeded but no one told the cached reads they were out of date. Check that the mutation's `onSuccess`/`onSettled` invalidates the right query key, and that the key matches (prefix-wise) the queries that should refresh. In the Devtools, after the mutation, the affected query should flip to fetching; if it does not, your invalidation key is wrong.

**A spinner never goes away, or flashes constantly.** A status-flag problem (Section 4). A permanent spinner on a query that should be waiting usually means you bound it to `isPending` on a disabled query (Section 9); switch to `isLoading`. A spinner that flashes on every background update means you bound it to `isFetching` where you wanted `isLoading`. The Devtools status field tells you which axis the query is actually on.

**A list flickers to empty on every page change.** Pagination without `placeholderData: keepPreviousData` (Section 12): the new page is a new key with no data, so it blanks. Add `keepPreviousData` to bridge the transition.

**The same request fires twice (or N times).** If it is two identical keys, that should dedupe (Section 7), so a double request usually means the keys are subtly different (one has an extra field, or a different type, so they hash differently) and are addressing two entries. Inspect the two keys in the Devtools; they will look almost identical but not hash the same. If it is the StrictMode double-invoke in development (rendering guide), that is expected in dev and does not happen in production.

**A query never runs.** Either `enabled` is false (intentionally or because its condition is wrong, Section 9) or the component is not mounted where you think. Check `enabled` and the `fetchStatus`: a query that is `idle` and `pending` with `enabled: false` is disabled by design; if you did not intend that, fix the condition.

**Changing an input does not refetch.** The input is not in the query key (Section 3), so the cache sees the same address and serves the old entry. Add the input to the key. This is the most common "it does not update" bug and it is always a key problem.

**The app refetches too much.** `staleTime` is too low for the data (Section 5 and 8). Raise `staleTime` to match the data's volatility rather than disabling triggers like `refetchOnWindowFocus`.

**Memory grows or cold loads happen too often.** A `gcTime` problem (Section 6): too high holds more memory, too low prunes data that returning users would have benefited from. Tune `gcTime` to your navigation patterns.

**The closing synthesis.** Server state is a cache, and the entire library is the management of that cache. The query key is the address of each entry, and it must contain every input the fetch depends on, exactly as a `useEffect` dependency array must, because the key is how the cache tells two requests apart. The behavior is stale-while-revalidate: serve the cached copy instantly, and revalidate it in the background when it is stale, where `staleTime` is the freshness line that decides "stale" and `gcTime` is the unrelated retention line that decides how long unused data is kept. Because the cache is a single keyed external store, many components share one entry and one in-flight request, and they subscribe through `useSyncExternalStore`, which is why the cache is correct under concurrent rendering and why v5 requires React 18; the `select` option is a selector over that store, closing for server data the selectivity gap that Context could not close for client state. Reads come from `useQuery`; writes come from `useMutation`, whose real job is to make the cache honest again afterward, by invalidating the affected queries (refetch from the server) or writing the cache directly (and, for instant feedback, optimistically updating and rolling back on error). Pagination, infinite scroll, and prefetching are the same cache through different access patterns, and Suspense (via `useSuspenseQuery`, built on the same suspend-on-promise mechanism as React 19's `use()`) moves loading and error states from inside components to boundaries around them. Every behavior is a consequence of the one reframe in Section 1: fetched data is not state, it is a cache, and once you manage it as a cache instead of rebuilding one badly on top of `useState`, the loading flags, the races, the duplicate requests, the staleness, and the refetch logic all become things the cache handles rather than things you write by hand.

> **Try it.** Take a real data-fetching bug from your own app and, before touching code, open the Devtools, find the relevant query, and read its key, status, fetchStatus, and freshness. Name which section's mechanism the symptom implicates, then fix at that level. Doing this on two or three real bugs makes the cache state, not the component code, your first place to look, which is where the truth lives.

**You've got this if** you can take "the screen still shows the old data after I saved" and name the mechanism (a missing or mis-keyed invalidation) and the fix without guessing.

---

## Further reading (primary sources)

When you want to go past this guide, these are the canonical sources, each with a note on how it relates to what you read here and how current it is.

**The TanStack Query documentation, at https://tanstack.com/query/latest , current for v5.** The official reference and the source of truth for the API specifics in this guide. The Guides section maps almost one-to-one onto these sections: "Important Defaults" and "Caching" (Sections 1, 5, 6), "Query Keys" and "Query Functions" (Section 3), "Queries" (Section 4), "Background Fetching Indicators" and "Window Focus Refetching" (Sections 4 and 8), "Dependent Queries" (Section 9), "Mutations" and "Query Invalidation" and "Updates from Mutation Responses" (Section 10), "Optimistic Updates" (Section 11), "Paginated Queries" and "Infinite Queries" and "Prefetching" (Section 12), "Suspense" (Section 13), and "Advanced Server Rendering" (Section 14). Read the "Important Defaults" page first; it resolves most early confusion.

**TkDodo's blog (Dominik Dorfmeister), at https://tkdodo.eu/blog , especially the "Practical React Query" series.** Dominik is a TanStack Query maintainer, and this blog is the best deep writing on the library and on server state generally. The essential posts: "Practical React Query" (https://tkdodo.eu/blog/practical-react-query) as the overview, "React Query as a State Manager" (https://tkdodo.eu/blog/react-query-as-a-state-manager) which is the long-form version of Sections 1 and 5 (especially the role of `staleTime`), "Effective React Query Keys" (https://tkdodo.eu/blog/effective-react-query-keys) for Section 3, "Mastering Mutations in React Query" (https://tkdodo.eu/blog/mastering-mutations-in-react-query) for Sections 10 and 11, and "Why You Want React Query" (https://tkdodo.eu/blog/why-you-want-react-query) for Sections 1 and 2. These are current and maintained, and they are the highest-signal source after the official docs.

**The official React docs (react.dev) for the rendering-side primitives, current within the React 19 line:** Suspense, at https://react.dev/reference/react/Suspense , and `use`, at https://react.dev/reference/react/use . These cover the React mechanisms underneath Section 13 (suspending on a promise, fallbacks, the relationship between `use()` and Suspense-based data fetching).

**Sibling implementations of the same model, useful for seeing the model is universal:** SWR, at https://swr.vercel.app , and RTK Query (part of Redux Toolkit), at https://redux-toolkit.js.org/rtk-query/overview . Both implement the keyed-cache, stale-while-revalidate, deduplication model from this guide with different APIs and trade-offs. Reading SWR's "Getting Started" through this guide's lens is a good way to confirm that the *model* (Sections 1, 3, 5, 7) is the durable knowledge and the specific API is the replaceable part.

**If you want to see the mechanism in the source (pass 3):** in the `@tanstack/query-core` package, look at the `QueryCache` (the keyed store from Sections 3 and 7), the `Query` class (the entry, its status, and the gc timer from Sections 4 and 6), and the `QueryObserver` (the per-component subscription); and in `@tanstack/react-query`, look at how `useBaseQuery` subscribes via `useSyncExternalStore` (the bridge from Section 14). Seeing that the cache is a plain keyed store with observers, subscribed through `useSyncExternalStore`, is the fastest way to confirm that this is the external-store pattern (State guide, Section 12) specialized for server state, not a separate kind of magic.

A good way to use all of these: read the relevant deep section of this guide first so you have the model and the vocabulary, then read the primary source, then come back. This guide gives you the cache model and ties it to the rest of React; the primary sources go deeper on the specific APIs and on the many smaller options this guide did not cover.

---

*Built to be climbed, not swallowed. Finish pass 1 and you are already ahead. Come back for the deep parts when a real staleness, flicker, or refetch problem gives you a reason to care, and run the experiments with the Devtools open so the cache becomes visible rather than magic. Every version and library claim (TanStack Query still on v5 for React, the `cacheTime` to `gcTime` and `loading` to `pending` renames, `useSuspenseQuery` stable, v5 requiring React 18 for `useSyncExternalStore`) reflects the state of things in 2026; the core model (server state is a cache, the key is its address, stale-while-revalidate, dedup through a shared keyed store, invalidation as the write-side, and the whole thing being an external store specialized for remote data) is stable and transfers to every server-state library you will meet.*
