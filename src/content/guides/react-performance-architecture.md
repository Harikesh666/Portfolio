---
title: "React Performance Architecture"
description: "A measured approach to rendering cost, memoization, concurrency, virtualization, and bundle size."
category: "Architecture"
readTime: "55 min read"
date: "May 2026"
publishedAt: "2026-05-01"
order: 5
series: "react-internals"
---

> Current as of React 19.2.x (latest patch 19.2.6, May 2026), with the React Compiler 1.0 stable (October 2025) as an opt-in build-time tool. Version-specific and library-specific claims are noted inline and were verified against current sources.

> **What this guide builds on.** This is the capstone of Track B, so it draws on all of it. From the **rendering and reconciliation guide** it uses the render and commit phases, the work loop, the diff and keys, the bailout, concurrent rendering and lanes, and the React Compiler. From the **Hooks and Effects guide** it uses referential stability (Section 8) and `useMemo`/`useCallback` (Section 12) heavily, plus `useTransition` and `useDeferredValue` (Section 15). From the **State Management guide** it uses colocation (Section 2), the Context re-render cost (Sections 9 through 11), and the external-store model (Section 12). From the **Data Fetching guide** it uses the cache as a performance tool, and from the **RSC guide** it uses Server Components shipping zero client JavaScript. You can read this guide after the others; wherever it reaches for a concept from one of them, it recaps it in a line or two. The per-section **Prereqs** lines name what each section needs, drawn from earlier sections here, the other guides, and outside knowledge (the browser DevTools, bundlers and tree-shaking, the DOM cost of many nodes).

## Read this first

Same method as the other guides. **You are not meant to absorb this in one sitting.**

**Pass 1, one relaxed sitting (about 30 minutes).** Read only **"The itch"** and **"The short version"** of each section. You will come out understanding what actually causes a re-render, why most re-renders are cheap and which ones are not, why `React.memo` so often does nothing, how the Compiler changes the manual-memoization story, and the two axes performance work splits into (rendering too much versus shipping too much). That alone will stop you from optimizing the wrong things.

**Pass 2, driven by real work.** When a real problem appears (typing lags, a list of thousands janks while scrolling, the initial load is slow, a `React.memo` you added did nothing), come back and read the deep part of the matching section.

**Pass 3, when curious.** The further-reading section points at the canonical primary sources, including the ones that argue (correctly) for composition over memoization.

Each section opens with a one-line **Prereqs** note: the earlier sections (here or in the other guides) and any outside knowledge worth having first. Sections that need nothing past basic React say so.

**Two rules that multiply everything, and they are doubly true for performance.**

1. **Measure first, always.** This is the cardinal rule of the entire topic, important enough to be Section 4. Never optimize from a hunch. Open the Profiler, find the actual cost, then fix that. Most performance work done from intuition optimizes things that were never slow and misses the thing that was.
2. **Run the experiments.** Each section ends with a short **"Try it."** Keep a Vite scratch app open with the React DevTools Profiler, and watch renders and timings change as you apply each technique. Performance is the topic where intuition lies most often and the Profiler tells the truth.

Here is the spine:

```
   Two axes: rendering too much, or shipping too much   (1)
            │
   What causes a re-render (and the myth that misleads)  (2)
            │
   Renders are usually cheap; expensive work is the cost (3)   ◀── the reframe that prevents wasted effort
            │
   MEASURE FIRST: the Profiler                           (4)   ◀── the cardinal rule
            │
   The bailout, memo boundaries, and why memo fails       (5, 6)
            │
   Memoization, the Compiler, and composition instead     (7, 8)
            │
   Keys, Context cost, concurrency                         (9, 10, 11)
            │
   Virtualization (render less), splitting and bundles (ship less)  (12, 13, 14)
            │
   A methodology, then debugging                            (15, 16)
```

You do not need to finish this guide to benefit from it. Finish pass 1 and you are already ahead.

---

## Table of Contents

1. [The two questions performance asks: too much rendering, or too much code](#1-the-two-questions-performance-asks-too-much-rendering-or-too-much-code)
2. [What actually causes a re-render](#2-what-actually-causes-a-re-render)
3. [Renders are usually cheap: the cost is the work inside them](#3-renders-are-usually-cheap-the-cost-is-the-work-inside-them)
4. [Measure first: reading the Profiler](#4-measure-first-reading-the-profiler)
5. [The bailout and how memo boundaries work](#5-the-bailout-and-how-memo-boundaries-work)
6. [Why React.memo so often does nothing](#6-why-reactmemo-so-often-does-nothing)
7. [useMemo, useCallback, and what the Compiler changes](#7-usememo-usecallback-and-what-the-compiler-changes)
8. [Composition: avoiding re-renders without memo](#8-composition-avoiding-re-renders-without-memo)
9. [Keys and reconciliation as a performance tool](#9-keys-and-reconciliation-as-a-performance-tool)
10. [The cost of Context, and when to reach for a store](#10-the-cost-of-context-and-when-to-reach-for-a-store)
11. [Concurrency as a performance tool: useTransition and useDeferredValue](#11-concurrency-as-a-performance-tool-usetransition-and-usedeferredvalue)
12. [Virtualization: rendering only what is visible](#12-virtualization-rendering-only-what-is-visible)
13. [Code splitting and lazy loading](#13-code-splitting-and-lazy-loading)
14. [Bundle cost: shipping less JavaScript](#14-bundle-cost-shipping-less-javascript)
15. [A performance methodology](#15-a-performance-methodology)
16. [Debugging performance](#16-debugging-performance)

---

## 1. The two questions performance asks: too much rendering, or too much code

*Prereqs: basic React. Outside React: the difference between runtime cost (work the CPU does while the app runs) and load cost (bytes the browser must download, parse, and execute before the app runs).*

**The itch.** "My app is slow" is not one problem, it is at least two, and the techniques that fix one do nothing for the other. You reach for `React.memo` when the real problem is a three-megabyte bundle, or you split your bundle when the real problem is a component re-rendering a thousand rows on every keystroke. Knowing which axis you are on is the first move, before any technique.

**The short version.** React performance splits into two largely separate problems. **Runtime rendering performance**: while the app runs, is it rendering too much or doing too much work per render, causing jank, lag, and dropped frames? **Load performance**: before the app runs, is it shipping too much JavaScript, causing a slow initial load? These have different symptoms, different measurements, and different fixes (memoization, virtualization, and concurrency for the first; code splitting, bundle trimming, and moving work to the server for the second). And over both sits one rule: measure before you optimize.

**How it actually works.**

It helps to see the two axes as living in different phases of your app's life.

**Load performance** is everything that happens *before* your app is interactive: the browser downloads your JavaScript bundle over the network, parses it, and executes it to mount your React tree. The dominant cost here is *bytes*: a larger bundle takes longer to download (especially on slow connections) and longer to parse and execute (especially on slow devices). The symptoms are a slow first paint, a long delay before the page responds to clicks, and poor scores on load-oriented metrics. The fixes are about *shipping less*: code splitting so you only download what the current screen needs (Section 13), trimming dependencies and dead code so the bundle is smaller (Section 14), and, with Server Components, moving code and work off the client entirely (Section 14, and the RSC guide). None of these touch how your components render; they touch how much code arrives.

**Runtime rendering performance** is everything that happens *while* the app runs and the user interacts: state changes, re-renders, and DOM updates. The dominant cost here is *work per interaction*: how many components re-render when something changes, how expensive each render is, and how many DOM mutations result. The symptoms are laggy typing, janky scrolling, slow transitions, and a UI that freezes during heavy updates. The fixes are about *doing less work*: avoiding unnecessary re-renders (Sections 5 through 10), keeping the work inside each render cheap (Section 3), rendering only what is visible (virtualization, Section 12), and using concurrency to keep the UI responsive even when work is unavoidable (Section 11). None of these touch your bundle size; they touch how much your app computes and mutates as it runs.

The reason naming the axis matters so much is that the tools do not transfer. Memoizing a component does nothing for a bundle that is too big. Splitting your bundle does nothing for a component that re-renders a thousand times. If you optimize on the wrong axis, you spend effort and the app stays slow, which is the single most common way performance work goes wrong. So the first question for any "it's slow" is always: *is this slow to load, or slow while running?* The answer points you at an entire half of this guide and rules out the other half.

And over both axes sits the rule that the rest of the guide keeps returning to, important enough to be its own section (4): **measure first.** Both axes have good measurement tools (the Profiler for rendering, bundle analyzers and load metrics for shipping), and both reward looking before acting, because both are full of things that *feel* slow but are not, and things that are slow in ways you would never guess. Performance intuition is unusually unreliable, so the discipline that separates effective performance work from cargo-culting is simply: identify the axis, measure on that axis, fix what the measurement shows, measure again.

> **Try it.** Take an app or page you think is slow and ask only one question before touching anything: does it feel slow to *load* (blank or unresponsive at first, then fine) or slow to *use* (loads fine, then lags as you interact)? Write down which. That single classification determines which half of this guide applies, and getting it right is more valuable than any individual technique.

**You've got this if** you can explain why `React.memo` and code splitting solve different problems, and name which axis (load or runtime) each one addresses.

---

## 2. What actually causes a re-render

*Prereqs: Section 1. From the rendering guide: the render phase and the work loop (React walks the tree calling component functions), recapped here. Outside React: nothing new.*

**The itch.** You believe a component re-renders "when its props change." So when a child re-renders even though its props look identical, it seems like a bug. It is not. The belief is the bug: that is not what triggers a re-render, and holding the wrong model here makes every later optimization confusing.

**The short version.** A component re-renders for exactly these reasons: its own state changed, its parent re-rendered, a Context it consumes changed, or it was remounted by a key change. The one that surprises everyone: **a parent re-rendering re-renders all its children by default, whether or not their props changed.** Props changing is not what triggers a child's render; the parent rendering is. `React.memo` is the opt-in tool that makes a child *skip* re-rendering when its props are unchanged, which is only necessary because the default is to render regardless of props.

**How it actually works.**

Recall the work loop from the rendering guide, in one line: when React renders, it starts at the component with pending work and walks *down* the tree, calling each component function to produce its output, then reconciles that output against the previous tree. The key fact for performance is what "walks down" means: when React renders a component, it then renders that component's children, and their children, all the way down, by default. Rendering is top-down and contagious.

So the complete list of what causes a component to (re-)render is:

1. **Its own state changed.** A `useState` setter or `useReducer` dispatch scheduled an update (Hooks guide, the update queue). This is the original trigger; the component whose state changed re-renders.
2. **Its parent re-rendered.** This is the one that surprises people. When a parent renders, React renders its children as part of walking down the tree, *regardless of whether the children's props changed.* A child with the exact same props as last time still re-renders if its parent rendered, unless something stops the propagation (Section 5).
3. **A Context it consumes changed.** A component reading a Context re-renders when that Context's value changes, even bypassing memo boundaries (State guide, Section 9; revisited in Section 10 here).
4. **It was remounted by a key change.** If a component's key changes, React treats it as a different element, unmounts the old one and mounts a new one (rendering guide, the diff and keys; revisited in Section 9 here). That is not a re-render, it is a remount, which is more expensive and resets state.

Now the crucial correction, because it is the foundation of everything in this guide: **point 2 means props changing does not cause a child to render.** The causation runs the other way. A parent renders (because its own state changed, say), and as part of that, React renders the parent's children. It renders them whether their props changed or not. People say "the child re-rendered because its props changed," but in the common case the child re-rendered because its *parent* rendered, and the props happened to come along for the ride, changed or not. You can prove this to yourself: a child that receives no props at all still re-renders every time its parent does.

This reframes what `React.memo` actually is. `React.memo` does not "make a component faster." It changes the default in point 2: a memoized component, when its parent renders, *checks whether its props changed* and *skips its own re-render if they did not* (Section 5). So memo is the opt-in mechanism for "do not re-render this child just because the parent did, only re-render it if its props actually changed." That is only a meaningful thing to opt into precisely because the default is the opposite: render children when the parent renders, no questions asked. If you held the (wrong) belief that components only render when props change, `React.memo` would seem pointless, because the behavior it provides would seem to already be the default. The reason memo exists is that the real default is "render on parent render," and memo opts out of it.

This single correction explains a huge amount of later confusion. "Why did this re-render, its props are the same?" Because its parent rendered. "Why didn't `React.memo` help?" Either its props are not actually stable (Section 6), or the re-render was coming from Context, not the parent (Section 10). "Why does moving state down help so much?" Because it shrinks which parent renders, and therefore how much of the tree gets dragged into the render (Section 8, and State guide Section 2). Every one of those follows from getting point 2 right: rendering propagates downward from whoever rendered, independent of props, until something stops it.

> **Try it.** Build a parent with a counter in state and a child that takes *no props* and logs every time it renders. Click the counter and watch the propless child re-render every time, purely because its parent rendered. Then wrap the child in `React.memo` and watch it go silent (no props means props never change, so memo always bails). You have just disproved "components render when props change" and seen what memo actually does.

**You've got this if** you can explain why a child with unchanged props (or no props at all) still re-renders when its parent renders, and what `React.memo` actually changes about that.

---

## 3. Renders are usually cheap: the cost is the work inside them

*Prereqs: Section 2. From the rendering guide: reconciliation (the diff) is fast, recapped here. Outside React: the rough idea that some computations (sorting a large array, heavy formatting) cost more than others.*

**The itch.** You discovered that some component re-renders "too often" and immediately reached for `React.memo` to stop it. But the app did not get faster, because that re-render was never the problem. The actual cost was somewhere else, and you optimized a thing that was already cheap.

**The short version.** A re-render is usually cheap. React calling a component function and diffing its output is fast, and a few extra re-renders of simple components cost essentially nothing. The expensive things are: an expensive computation done *inside* a render (sorting or transforming a large dataset every render), a re-render that cascades into a *very large* subtree, and a render that produces *many DOM mutations*. So "stop the re-render" is frequently the wrong goal; "stop the expensive work, or stop doing it every render" is the right one. Reaching for memoization before measuring (Section 4) usually optimizes a render that was never slow.

**How it actually works.**

Internalize how fast a plain re-render actually is. When React re-renders a simple component, it calls the function (running your JavaScript, which for a typical component is a handful of cheap operations), gets back an element tree, and reconciles it against the previous tree using the fast heuristics from the rendering guide (compare by type and position, bail out where nothing changed). For a component that renders a few elements, this is microseconds. A component re-rendering "unnecessarily" a few extra times per interaction is, by itself, almost never perceptible. This is why blanket memoization often produces no measurable improvement: you spent effort preventing renders that cost nothing.

The costs that *are* real fall into three categories, and recognizing which one you have is the whole game:

**Expensive work inside a render.** If a component sorts a 10,000-item array, runs a heavy transformation, or does expensive formatting *in its render body*, then every render pays that cost, and *that* is what is slow, not the render machinery. The fix is not to stop the component from rendering; it is to stop doing the expensive work on every render, by memoizing the computation with `useMemo` (Hooks guide, Section 12) so it only recomputes when its inputs change, or by not computing it in render at all. Note the distinction: the problem is the *work*, and `useMemo` here is caching an expensive *computation*, which is a different use of memoization than `React.memo` skipping a component render. Conflating them is common and leads to memoizing the wrong thing.

**A render that cascades into a very large subtree.** One re-render of one component is cheap. One re-render of a component that has thousands of descendants (a giant list, a deep tree) means React calls thousands of component functions and diffs thousands of elements, which adds up. Here the cost is *quantity*: the subtree is large. The fixes are to render fewer of them (virtualization, Section 12, for long lists) or to stop the cascade from reaching them (memo boundaries, Section 5, or moving state down so the cascade starts lower, Section 8). This is the case where reducing re-renders genuinely helps, because the re-render is large, not because re-renders are inherently expensive.

**A render that commits many DOM mutations.** The render (computing elements) is cheap; the commit (applying changes to the real DOM) can be expensive if it touches many nodes, because DOM operations and the layout and paint they trigger are far slower than JavaScript. A render that adds or changes thousands of DOM nodes is slow in the commit phase (rendering guide). The fixes are again to produce fewer DOM changes (virtualization, stable keys to avoid needless remounts, Section 9).

The reframe that follows is the most useful idea in performance work after "measure first," and it has a name from Kent C. Dodds: *fix the slow render before you fix the re-render.* If a component is slow, the first question is not "how do I make it render less often," it is "why is a single render slow," because if one render is slow, reducing the *count* of renders only partially helps and a single slow render still janks. Often a "re-render problem" is actually a "this render does expensive work" problem, and the fix is to make the render cheap (memoize the computation, or move it out), after which the re-render frequency stops mattering. Optimizing the frequency of a render that is already cheap is wasted effort; optimizing the cost of a render that is expensive fixes the actual jank.

So the mental order is: is this render actually expensive (expensive computation, huge subtree, many DOM changes), or is it just frequent? If it is just frequent and cheap, leave it alone; the frequency is not your problem. If it is expensive, make the single render cheaper first. Only then, if a cheap render is happening so often that the frequency itself is the cost, do you reduce the frequency (memo, composition, store selectors). And you decide which case you are in by measuring (Section 4), not by guessing, because a render's cost is exactly the kind of thing intuition gets wrong.

> **Try it.** Build a component that sorts a large array in its render body and re-renders on a counter click; profile it and see the render time dominated by the sort. Now wrap *the sort* in `useMemo` (caching the computation) and watch the render get cheap even though it still re-renders just as often. Then, separately, build a propless component that does nothing expensive, re-render it constantly, and confirm in the Profiler that it costs almost nothing. The contrast (expensive render versus frequent cheap render) is the whole lesson.

**You've got this if** you can explain why "this re-renders too often" is often the wrong diagnosis, and what "fix the slow render before you fix the re-render" means mechanically.

---

## 4. Measure first: reading the Profiler

*Prereqs: Sections 2 and 3. Outside React: browser DevTools, and the idea of a flamegraph (a chart where width represents time spent).*

**The itch.** You optimized for an afternoon and the app feels the same, because you were guessing. Performance is the one area where working from intuition reliably wastes time, and the only cure is to look at real measurements before and after every change.

**The short version.** Never optimize without measuring. The React DevTools Profiler records a session and shows you exactly which components rendered, how often, why, and how long each took, so you can find the actual cost instead of guessing. The browser's own Performance panel shows you the bigger picture (scripting, layout, paint, dropped frames). The discipline is a loop: measure to find the real bottleneck, make one change, measure again to confirm it helped. Most failed performance work skips the first and last steps.

**How it actually works.**

There are two instruments, for the two axes (Section 1).

**The React DevTools Profiler** is your instrument for *runtime rendering* performance. You record a profiling session while you interact with the app, and it gives you, per "commit" (each time React updated the DOM):

- **Which components rendered**, shown as a flamegraph where each bar is a component and its width is how long that component took to render. Wide bars are where time went; that is where to look.
- **How long each render took**, so you can tell an expensive render (Section 3) from a cheap one. A component that rendered but took microseconds is not your problem, no matter how often it rendered.
- **Why each component rendered**, if you enable "record why each component rendered." This tells you whether a component rendered because its state changed, its props changed, its parent rendered, or its context changed, which maps exactly onto the causes in Section 2 and tells you which fix applies (a parent-render cause points at memo or composition; a context cause points at Section 10; a hooks/state cause points at the component itself).
- **How often** each component rendered across the recorded interaction (the ranked chart), which surfaces components rendering far more than they should.

This is the tool that turns "I think this re-renders too much" into "this component rendered 40 times during one keystroke, each taking 8 milliseconds, because its parent re-rendered, and here is the parent." That sentence is a diagnosis you can act on; the hunch was not.

**The browser's Performance panel** is your instrument for the *whole picture*, including the commit-phase and load-phase costs that the React Profiler does not show: time spent in scripting versus layout versus paint, long tasks that block the main thread, dropped frames during a scroll or animation, and (for load) the download and parse of your bundle. When jank is about layout and paint (Section 3's "many DOM mutations" case) rather than React rendering, the React Profiler will look fine and the browser panel will show the real cost in layout and paint. Use the React Profiler to find rendering problems and the browser panel to find everything else.

The methodology that these tools enable is a strict loop, and the loop *is* the skill:

1. **Reproduce and measure the actual slow interaction.** Record the specific thing that feels slow (typing, scrolling, opening a panel), not the app in general.
2. **Read the measurement to find the real bottleneck.** Which component, which phase, which cause? Is it an expensive render, a large cascade, many DOM changes, or a big bundle? This tells you the axis and the section.
3. **Make one change** targeting that bottleneck.
4. **Measure again** to confirm it actually helped, and by how much. If it did not help, revert it (you just learned the bottleneck was elsewhere) and go back to step 2.

The reason to insist on this loop is that performance intuition is unusually bad, worse than in correctness work, because the costs are non-obvious (a re-render you can see in the console might be free; a layout thrash you cannot see might be the whole problem) and because changes interact (memoizing one thing can shift the cost elsewhere). Every optimization in the rest of this guide should be applied inside this loop: measure, change, measure. An optimization you cannot show helped in the Profiler is an optimization you should not keep, because it adds complexity (memo boundaries, split points, indirection) for a benefit you have not demonstrated. The Profiler is what keeps performance work honest.

> **Try it.** Install the React DevTools, open the Profiler tab, turn on "record why each component rendered," and profile a real interaction in your app. Find the widest bar and read why it rendered. Then make one targeted change and profile the same interaction again, comparing the before and after numbers. Doing this once, end to end, builds the habit that makes every other section in this guide effective.

**You've got this if** you can describe the measure-change-measure loop and explain why the React Profiler and the browser Performance panel show different (complementary) parts of the picture.

---

## 5. The bailout and how memo boundaries work

*Prereqs: Section 2. From the rendering guide: the bailout (how React skips re-rendering a subtree), recapped here. From the Hooks guide: `React.memo` compares props with `Object.is`.*

**The itch.** You know `React.memo` "prevents re-renders," but not what it actually does or where the prevention happens. Without the mechanism, you sprinkle it hopefully and cannot predict when it will help, which is why it so often does not (Section 6).

**The short version.** Normally, when a parent renders, React renders all its children (Section 2). A *bailout* is when React skips rendering a component and its subtree because nothing relevant changed. `React.memo` creates a bailout point: it wraps a component so that, when its parent renders, React first compares the component's new props to its previous props with `Object.is`, and if they are all equal, it *skips* rendering that component and everything below it. So `React.memo` is a *boundary* in the tree that stops the downward render propagation when props are unchanged. Understanding it as a boundary, not a per-component speedup, is what lets you place it where it actually helps.

**How it actually works.**

Start from the default (Section 2): a parent renders, React walks down and renders every child, regardless of props. A bailout is React's mechanism for *not* doing that walk for a particular subtree when it can prove the subtree's output would be unchanged. The rendering guide covers the several conditions under which React bails out; `React.memo` is the one you place deliberately.

`React.memo(Component)` returns a new component that wraps `Component` with a props check. Here is the exact behavior when the *parent* of a memoized component re-renders:

1. React reaches the memoized component while walking down.
2. Instead of immediately calling the component function, it compares the *new* props to the *previous* props, shallowly, using `Object.is` on each prop (the same comparison as dependency arrays and `useMemo`, Hooks guide Sections 7, 8, and 12).
3. If every prop is `Object.is`-equal to before, React **bails out**: it skips calling the component function and skips rendering its entire subtree, reusing the previous result.
4. If any prop differs, React renders the component normally (and the bailout does not apply to that render).

Two things about this are essential and often missed.

**It is a boundary, not a local flag.** When a memo bailout happens, React skips not just the memoized component but *everything below it*, because skipping the component means not producing new children to walk into. So `React.memo` placed on a component high in a subtree can prevent an entire branch from re-rendering. This is why the right mental image is a *boundary* in the tree: render propagation flows down from whoever rendered, and a memo boundary is a gate that stops that flow when props are unchanged. You place memo boundaries at the points where you want to stop a parent's re-render from cascading into a subtree that does not need to update.

**It only checks props, and only on parent-render.** The memo comparison is about the component's *props*. It does not prevent the component from rendering when its *own state* changes (a memoized component with internal state still re-renders when that state changes; memo only gates the parent-render path) or when a *Context it consumes* changes (Context bypasses memo entirely, Section 10). So memo addresses exactly one of the four re-render causes from Section 2: "the parent re-rendered." It is the tool for "do not re-render this subtree just because an ancestor did, unless its props actually changed." For the other causes, memo does nothing, which is one of the two big reasons it appears not to work (Section 6).

The shallow `Object.is` comparison is the crux that connects everything. Shallow means React compares each prop value with `Object.is`, not a deep equality of contents. For primitives (numbers, strings, booleans) that is exactly what you want: equal primitives are `Object.is`-equal, so unchanged primitive props let the bailout fire. For objects, arrays, and functions, `Object.is` compares *identity*, not contents (Hooks guide, Section 8), which is where memo so often fails to fire: a parent that passes a freshly-created object, array, or inline function as a prop gives the memoized child a new identity every render, so the comparison reports "changed," so the bailout does not happen, so the child renders anyway. That failure mode is so common and so important that it gets its own section next. But the mechanism to hold here is clean: `React.memo` is a boundary that compares props by `Object.is` and skips the subtree when they are all equal.

> **Try it.** Build a parent that re-renders on a counter and a memoized child receiving a single primitive prop that does *not* change. Confirm in the Profiler that the child bails out (does not render) when the counter changes. Then change the child's prop along with the counter and watch it render. You are watching the props comparison decide whether the bailout fires.

**You've got this if** you can explain why `React.memo` is best understood as a boundary that stops downward render propagation, and which one of the four re-render causes it addresses.

---

## 6. Why React.memo so often does nothing

*Prereqs: Section 5, plus the Hooks guide on referential stability (Section 8) and `useMemo`/`useCallback` (Section 12).*

**The itch.** You wrapped a component in `React.memo` to stop it re-rendering, profiled it, and it re-renders exactly as much as before. You conclude memo is unreliable or pointless. It is neither; it is doing precisely what it was told, and the problem is the props you are feeding it.

**The short version.** The number one reason `React.memo` does nothing is that the parent passes it a prop with a new identity every render: an inline object (`style={{...}}`), an inline array, or an inline function (`onClick={() => ...}`). The memo comparison uses `Object.is`, which sees a new object or function as "changed," so the bailout never fires. The fix is to make those props referentially stable (with `useMemo`/`useCallback`, by lifting constants out, or by depending on primitives), or to remove the unstable prop. The second common reason memo "fails" is that the re-render is coming from Context, not the parent, which memo cannot stop (Section 10).

**How it actually works.**

This is Section 5's `Object.is` detail and the Hooks guide's referential stability (Section 8) colliding, and it is one of the highest-value things to understand in all of React performance, because so much memoization is silently useless for this exact reason.

Recall: `React.memo` bails out only when *every* prop is `Object.is`-equal to its previous value, and `Object.is` compares objects, arrays, and functions by *identity*, not contents. Now recall that a component creates fresh object, array, and function literals on every render (Hooks guide, Section 8): `{ color: 'red' }`, `[1, 2, 3]`, and `() => doThing()` are brand-new values with new identities each time the component runs. Put those together:

```js
function Parent() {
  const [count, setCount] = useState(0);
  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      {/* Each of these is a NEW identity every render, so MemoChild's props "change" every render */}
      <MemoChild
        style={{ padding: 8 }}        // new object every render
        items={[1, 2, 3]}             // new array every render
        onSelect={() => handle()}     // new function every render
      />
    </>
  );
}
const MemoChild = React.memo(function MemoChild(props) { /* ... */ });
```

`MemoChild` is wrapped in `React.memo`, but it re-renders on every counter click anyway. Why: when `Parent` re-renders, it constructs new `style`, `items`, and `onSelect` values, each with a new identity. `React.memo` compares the new props to the old with `Object.is`, sees three "changed" props (new object, new array, new function), and concludes the props changed, so it does *not* bail out and renders the child. The memo boundary is intact and working exactly as designed; you are handing it a new key every render, so it can never report "unchanged." The memo is not broken; the props are not stable.

The fixes are the referential-stability toolkit from the Hooks guide (Sections 8 and 12), applied to the props feeding a memo boundary:

```js
function Parent() {
  const [count, setCount] = useState(0);
  const style = useMemo(() => ({ padding: 8 }), []);          // stable object identity
  const items = useMemo(() => [1, 2, 3], []);                 // stable array identity
  const onSelect = useCallback(() => handle(), []);            // stable function identity
  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>{count}</button>
      <MemoChild style={style} items={items} onSelect={onSelect} />
    </>
  );
}
```

Now the three props keep their identity across `Parent`'s re-renders, so when the counter changes, `React.memo` compares the props, finds them all `Object.is`-equal, and bails out: `MemoChild` does not render. The lesson is that **`React.memo` and prop stability are a package deal**: memoizing a component is only effective if the props you pass it are stable, which usually means memoizing the objects, arrays, and functions you pass to it. A memo boundary with unstable props is pure overhead (it does the comparison work and never bails). This is also why "I added `React.memo` everywhere and nothing got faster" is such a common experience: without also stabilizing the props, the boundaries never fire.

Even better than stabilizing the props is often to *not pass unstable props at all*: depend on primitives where you can (pass `userId` not a `{ userId }` object), move truly-constant objects to module scope (so they have one identity forever, no `useMemo` needed), and use composition to avoid passing the prop through the boundary at all (Section 8). The most robust memo boundaries are the ones whose props are naturally stable (primitives and stable references), not the ones propped up by a pile of `useMemo` calls.

The second reason memo "does nothing," worth naming so you do not chase the props when that is not the issue: the re-render is coming from a *Context* the component consumes, not from its parent. Context changes re-render consumers regardless of memo (State guide, Section 9; Section 10 here), so a perfectly memoized component with perfectly stable props still re-renders when a Context it reads changes. If the Profiler says a memoized component rendered "because Context changed," no amount of prop stabilization will help; that is a Context problem (Section 10), not a memo problem. Reading *why* it rendered in the Profiler (Section 4) is how you tell the two cases apart.

And finally, the 2026 context: the React Compiler (Section 7) largely automates the prop-stabilization that makes memo work, by inserting memoization for the values you pass and for the components themselves. With the Compiler on, the manual `useMemo`/`useCallback`/`React.memo` dance above is mostly handled for you, which is precisely why it exists: hand-stabilizing every prop feeding every memo boundary is tedious and error-prone, and the Compiler does it at the expression level more thoroughly than people do by hand.

> **Try it.** Take the unstable-props `Parent` above, confirm in the Profiler that `MemoChild` re-renders on every counter click despite the memo. Stabilize the three props with `useMemo`/`useCallback` and watch `MemoChild` go silent. Then, if you have a project with the Compiler enabled, remove the manual `useMemo`/`useCallback` and confirm `MemoChild` stays silent anyway, because the Compiler stabilized the props for you.

**You've got this if** you can explain why a `React.memo` component re-renders when given an inline object or arrow-function prop, and why memo and prop stability have to be done together.

---

## 7. useMemo, useCallback, and what the Compiler changes

*Prereqs: Section 6, plus the Hooks guide on `useMemo`/`useCallback` (Section 12) and the rendering guide on the React Compiler (the 2026 section). Outside React: build tools and the idea of a compiler plugin that transforms your code at build time.*

**The itch.** You are not sure when to reach for `useMemo` and `useCallback`, you have heard the React Compiler now does this automatically, and you do not know whether to keep writing them, delete them, or what changes once the Compiler is on. The guidance feels like it shifted under you.

**The short version.** `useMemo` caches an expensive computation; `useCallback` caches a function's identity; both exist mostly to provide *referential stability* so that memo boundaries (Section 6) and dependency arrays (Hooks guide, Section 7) work, and secondarily to skip expensive recomputation (Section 3). The React Compiler 1.0 (stable October 2025) is an opt-in build-time tool that automatically inserts this memoization for you at a fine grain, so in a project with the Compiler enabled, most hand-written `useMemo` and `useCallback` (and many `React.memo` wrappers) become unnecessary. The 2026 guidance: enable the Compiler and stop hand-memoizing defensively; without it, the manual rules from the Hooks guide still fully apply.

**How it actually works.**

This section is the performance-axis view of the Hooks guide's Section 12, plus the Compiler reality. Recall the two jobs of `useMemo` and `useCallback`:

1. **Referential stability.** They preserve the identity of an object, array, or function across renders (keyed by a dependency array compared with `Object.is`), so that value can feed a `React.memo` boundary (Section 6) or another hook's dependency array (Hooks guide, Section 7) without breaking it. This is their *primary* performance role: not making anything intrinsically faster, but keeping identities stable so equality checks fire and bailouts happen.
2. **Skipping expensive computation.** `useMemo` caches the *result* of a computation so an expensive calculation (Section 3's "expensive work inside a render") only reruns when its inputs change. This is the secondary role: avoiding redundant CPU work in render.

And recall the cautions: memoization has its own cost (storing the value, comparing deps every render), so memoizing trivial work is a net loss; memoization is not a correctness guarantee (React may discard the cache); and a memo with an unstable dependency never hits. All of that still holds. The manual model is: use `useMemo`/`useCallback` to stabilize identities feeding memo boundaries and dependency arrays, and to cache genuinely expensive computations, and not otherwise.

The thing that changed is the **React Compiler**, stable as 1.0 since October 2025. It is a build-time tool (a Babel plugin, integrated through your framework or build config) that analyzes your components and *automatically inserts memoization* equivalent to hand-written `useMemo`, `useCallback`, and `React.memo`, but at the *expression level*, more granularly and more thoroughly than people do by hand. It memoizes the objects, arrays, and functions you create in render (so the props feeding a child are stable, Section 6) and the components themselves (so they bail out when their props are unchanged), based on a real analysis of what each piece of UI depends on. Meta has reported real wins from it (initial loads and navigations improving by around 12 percent, some interactions more than 2.5 times faster, with memory neutral) on production apps.

Several facts about the Compiler matter for how you should work in 2026:

- **It is opt-in, at the build level.** Installing React 19 does not enable the Compiler; you add it to your build (the Babel plugin, or your framework's flag, such as Next.js's `reactCompiler` option). Once enabled, it processes your code and auto-memoizes throughout (or per-file in annotation mode). So "is the Compiler on" is a project-level decision, and the guidance below assumes you have turned it on.
- **It mostly removes the need for manual memoization.** With the Compiler enabled, the hand-written `useMemo`, `useCallback`, and `React.memo` you would have added for *referential stability* (Section 6's prop-stabilization, the bulk of memoization in most codebases) are redundant, because the Compiler already stabilizes those identities and inserts the component-level bailouts. So the practical advice is to *stop adding them defensively* and let the Compiler do it.
- **It is not magic and has an opt-out.** The Compiler only memoizes code it can prove is safe (components that follow the rules of React, the rules of hooks, and purity). For code it cannot prove safe, it skips memoization, and you can explicitly opt a component out with the `"use no memo"` directive. As one maintainer put it, every `"use no memo"` is a performance cliff hidden in the code, so treat it as a temporary marker for code that is not yet Compiler-safe, not a permanent fixture. The associated lint rules now live in `eslint-plugin-react-hooks` (v6 and later), which surfaces patterns that block the Compiler.
- **A few manual cases remain.** You might still hand-write a `useMemo` for a genuinely expensive computation where you want explicit control, or in a project not yet on the Compiler. But the default posture flips: with the Compiler, memoization is the Compiler's job, and reaching for `useMemo`/`useCallback` becomes the exception (and over-doing it on top of the Compiler adds noise the lint rules may flag).

So the 2026 answer to "should I write `useMemo` and `useCallback`?" is: if your project has the Compiler enabled (which is the recommended setup), mostly no, write idiomatic code and let the Compiler memoize; keep a manual one only for a specific expensive computation you want to control explicitly. If your project does *not* have the Compiler, then yes, the full manual discipline from the Hooks guide and Section 6 applies, because you are responsible for the stability that makes memo boundaries work. Either way, the *understanding* from Section 6 (why stability matters, what a memo boundary does) is what you need, because it is what the Compiler automates and what you fall back to when it cannot.

> **Try it.** In a project without the Compiler, build the Section 6 stabilized example and confirm the memo bails out. Then enable the React Compiler in your build (the docs have per-framework setup), delete the manual `useMemo`/`useCallback`/`React.memo`, and confirm in the Profiler that the unnecessary re-renders are *still* gone, because the Compiler inserted the equivalent memoization. Watching the manual code become deletable is the fastest way to understand what the Compiler does.

**You've got this if** you can explain what the React Compiler automates (the referential stability and component bailouts you would otherwise hand-write), that it is opt-in at the build level, and when a manual `useMemo` is still worth writing.

---

## 8. Composition: avoiding re-renders without memo

*Prereqs: Section 6, plus the State guide on colocation (Section 2). Outside React: nothing new.*

**The itch.** You reach for `React.memo` as the default answer to "this re-renders too much," and your code fills up with memo wrappers and `useCallback` calls. There are two structural techniques that prevent re-renders *without any memoization*, are often cleaner, and that people reach for far too late: moving state down, and passing content as children.

**The short version.** Two composition patterns prevent unnecessary re-renders structurally. **Move state down**: put state in the smallest component that needs it, so a state change re-renders a small subtree instead of a big one (this is colocation from the State guide, viewed as a performance technique). **Lift content up and pass it as children**: a component that receives JSX through `children` (or any element prop) does *not* re-render that child content when the component itself re-renders, because the child elements were created by the parent and keep their identity. Both avoid re-renders without a single `React.memo`, and both are usually preferable to memoization because they remove the cause rather than blocking the symptom.

**How it actually works.**

These two patterns come straight from Section 2's model (a render propagates down from whoever rendered) and from referential stability (Section 6), and they attack the re-render at its source instead of installing a boundary to stop it.

**Pattern one: move state down (colocation as performance).** From Section 2, a state change re-renders the component that owns the state and everything below it. So the *size* of a re-render is determined by *where the state lives*: state high in the tree re-renders a big subtree; the same state low in the tree re-renders a small one. The State guide (Section 2) presented colocation as the default for clarity and ownership; here it is also the first-line performance technique. If a piece of state (say, the value of one input) lives in a large component and changes on every keystroke, the whole large component and its subtree re-render on every keystroke. Move that state into a small dedicated component that owns just the input, and now only that small component re-renders per keystroke; the large surrounding tree is untouched. You did not add `React.memo` anywhere; you shrank the subtree that the state change re-renders by relocating the state. This is frequently the cleanest fix for "typing is laggy because the whole form re-renders," and it should be tried before memoization, because it removes the re-render rather than guarding against it.

**Pattern two: lift content up and pass it as `children`.** This one is subtle and underused. Consider a component that has some frequently-changing state and also renders some expensive content:

```js
// Expensive content re-renders every time ColorPicker's color changes
function App() {
  return (
    <ColorPicker>
      <ExpensiveTree /> {/* recreated by App, but where does it live? */}
    </ColorPicker>
  );
}
function ColorPicker({ children }) {
  const [color, setColor] = useState('red');
  return (
    <div style={{ color }}>
      <input value={color} onChange={e => setColor(e.target.value)} />
      {children} {/* this is the SAME element object App passed; ColorPicker did not create it */}
    </div>
  );
}
```

Here is the key mechanism: `<ExpensiveTree />` is created by `App`, not by `ColorPicker`. It is passed *into* `ColorPicker` as the `children` prop. When `ColorPicker`'s `color` state changes and `ColorPicker` re-renders, React re-runs `ColorPicker`'s function, but `children` is *the same element object* that `App` created and passed in; `ColorPicker` did not recreate it. Because that element's identity is unchanged, React bails out of re-rendering `ExpensiveTree` (the unchanged-element bailout from the rendering guide). So `ExpensiveTree` does *not* re-render when `color` changes, even though it sits visually inside the component whose state changed, and even though there is no `React.memo` anywhere. The state change is "trapped" in `ColorPicker` because the expensive content was created by a parent that did not re-render.

This is the technique Dan Abramov titled "Before You memo()": before reaching for memoization, see whether you can restructure so that the frequently-changing state and the expensive content are *siblings* passed in from a common parent, rather than parent-and-child. Moving the expensive content "up and in" (created by an ancestor, passed down as `children`) means a state change in the wrapper cannot reach it, because the wrapper does not own its identity. The same idea covers any element prop, not just `children`: a component that receives elements as props does not re-render those elements when it re-renders, because it did not create them.

Why prefer these over `React.memo`? Three reasons. First, they remove the cause (the re-render does not happen) rather than installing a comparison that has to run and can silently fail when props are unstable (Section 6). Second, they have no ongoing cost: there is no props comparison on every render, just a different tree shape. Third, they are robust: a memo boundary breaks the moment someone passes it an unstable prop, while "this content was created by a parent that did not render" cannot be accidentally broken by a prop. The order of preference for stopping an unwanted re-render is therefore usually: move state down (shrink the source), then lift content up as children (trap the state away from expensive content), and only then `React.memo` (block the propagation with a boundary), with the Compiler (Section 7) handling much of the third case automatically when enabled.

> **Try it.** Build a wrapper component with an input whose value is in state, containing an `<ExpensiveTree />` that logs its renders. First put `<ExpensiveTree />` directly in the wrapper's JSX and watch it re-render on every keystroke. Then restructure so `<ExpensiveTree />` is passed in as `children` from a parent, and watch it stop re-rendering, with no `React.memo`. Separately, take a laggy form, move one input's state into a small child component, and watch the rest of the form stop re-rendering per keystroke.

**You've got this if** you can explain why content passed as `children` does not re-render when the receiving component's state changes, and why moving state down shrinks the cost of a re-render, both without any memoization.

---

## 9. Keys and reconciliation as a performance tool

*Prereqs: Sections 2 and 3. From the rendering guide: reconciliation (the diff) and keys (how React matches elements across renders), recapped here. Outside React: nothing new.*

**The itch.** Your list works but feels off: items lose their state when you reorder or filter, inputs in a list jump to the wrong row, and reordering is slower than it should be. The cause is almost always keys, and getting them right is both a correctness and a performance lever.

**The short version.** React matches elements across renders by their *type and key* (rendering guide). Good keys (stable, unique identifiers tied to the data) let React recognize that an item moved rather than being destroyed and recreated, so it reuses DOM and preserves state, which is both correct and cheap. Bad keys (especially the array index) make React mismatch items on reorder or insert, causing wasted DOM work, lost or swapped component state, and subtle bugs. You can also use a key *deliberately* to force a remount (reset state) when you actually want that. Keys are a performance tool because they control how much DOM work a list update costs.

**How it actually works.**

Recall the diff from the rendering guide: when React reconciles a list of children, it matches new elements to old ones by *position* and *key*. Without keys, it matches by position alone (the first new child to the first old child, and so on). With keys, it matches by key regardless of position, so an element with key `'a'` is recognized as the same element whether it was first last time and third this time. That matching decision determines whether React *reuses* an existing component instance and its DOM (cheap, preserves state) or *destroys and recreates* it (expensive, resets state). So keys are the input to a decision that has both correctness and performance consequences.

**Why the array index as a key is a trap.** Using the array index as the key (`items.map((item, i) => <Row key={i} />)`) means the key is the *position*, which defeats the entire purpose of keys, because the key now changes meaning when the list reorders or an item is inserted or removed. Walk an insertion at the front: before, index 0 was item A; after inserting X at the front, index 0 is now X. React sees key `0` in both renders and concludes "the element with key 0 is the same, its content just changed from A to X," so instead of recognizing that a new item was inserted and everything shifted down, it *mutates every row in place* to its new content. The result is maximal DOM work (every row changed instead of one inserted) and, worse, *state corruption*: any component state or uncontrolled input value tied to a row stays with the *position*, not the item, so an input that the user typed into for item A now appears on item X. The classic symptom (a checkbox or text field in a list "follows the wrong row" after a reorder or insert) is exactly this: index keys binding state to position instead of identity.

**Why stable identity keys are both correct and fast.** Key each item by a stable identifier from the data (`item.id`), and the key travels *with the item*. Now when the list reorders, React sees key `'a'` move from position 0 to position 2, recognizes it as the same element, and *moves* the existing DOM node and preserves its component state, instead of mutating two rows' contents. An insertion at the front is recognized as exactly that: a new key appears, the existing keys are matched to their (moved) elements, and React does the minimal DOM work (insert one node) while every existing row keeps its identity and state. So a good key turns a reorder or insert from "rewrite many rows" into "move and insert a few nodes," which is both correct (state follows items) and the cheaper commit (Section 3's "many DOM mutations" cost, minimized). The performance win is real on large or frequently-reordered lists.

The rules that follow are the rendering guide's, now with their performance rationale: keys must be *stable* (the same item gets the same key across renders, so use a data id, not the index, and not `Math.random()` which generates a new key every render and forces a full remount every time), *unique* among siblings (so React can tell them apart), and *tied to identity* (the item, not its position). Get these right and list updates are correct and cheap; get them wrong and you pay in both wasted DOM work and state bugs.

**Using a key deliberately to remount.** The flip side is a tool: because changing a component's key makes React treat it as a different element and remount it (destroying the old instance and its state, mounting fresh), you can *intentionally* reset a component's state by changing its key. The canonical case is a form or detail view that should fully reset when you switch to a different entity: `<UserForm key={userId} />` remounts (and so resets all internal state) whenever `userId` changes, which is simpler and more reliable than manually clearing every field in an effect. This is "remount on purpose," and it is the correct tool when you genuinely want a fresh component for new data. It has a cost (a remount is more expensive than a re-render, and it resets state), so use it where the reset is the goal, not as a casual technique.

> **Try it.** Build a reorderable list of items, each with a text input, keyed by array index. Type into one row, reorder the list, and watch the typed value follow the position to the wrong item (the index-key bug). Switch the key to a stable `item.id` and watch the value correctly follow its item. Profile a reorder both ways and note the difference in committed DOM work. Then add `<DetailForm key={selectedId} />` and watch switching `selectedId` cleanly reset the form via remount.

**You've got this if** you can explain why an array-index key causes both wasted DOM work and state-following-the-wrong-row bugs on reorder, and how a stable key turns a reorder into cheap node moves.

---

## 10. The cost of Context, and when to reach for a store

*Prereqs: Sections 5 and 6, plus the State guide on Context propagation, the re-render trap, the selectivity gap, and external stores (Sections 9 through 12). Outside React: nothing new.*

**The itch.** You used Context to share some state, and now a whole swath of your app re-renders whenever that Context changes, including components wrapped in `React.memo`. Context turned into a performance liability, and memo did not save you. The State guide explained the mechanism; here is the performance view and the fix.

**The short version.** When a Context's value changes, every component consuming that Context re-renders, *bypassing `React.memo`* (a consumer subscribes to the Context directly, not through props, so the memo prop-check does not apply). The performance fixes are the State guide's: stabilize the Provider value so it does not change identity every render, split one Context into several so unrelated changes do not re-render everyone, and separate state from dispatch. The hard ceiling is that Context has no slice-level subscription (the selectivity gap), so for large or frequently-changing shared state read by many consumers, the performance answer is an external store with selectors, which re-renders only the components whose selected slice changed.

**How it actually works.**

This is the performance lens on the State guide's Context sections (9 through 12), so it recaps the mechanism briefly and focuses on the cost and the fix.

The core cost: a component that consumes a Context (via `useContext` or `use(Context)`) has a direct subscription to that Context, separate from props. When the Context's `value` changes (compared by `Object.is`), React schedules *every* consumer to re-render, and crucially this *bypasses `React.memo`*. Recall from Section 5 that memo gates the *parent-render* path by checking props; a Context change is not the parent-render path, it is a direct subscription, so the memo prop-check never runs for it. This is why "I wrapped my Context consumers in `React.memo` and they still re-render when the Context changes" is expected behavior, not a bug: memo cannot stop a Context-driven re-render, because that re-render does not come through props. The Profiler (Section 4) will report these renders as caused by "Context changed," which is your signal that this is a Context problem, not a props or memo problem.

The performance traps and their fixes, from the State guide, stated as performance moves:

**Unstable Provider value (the most common).** `value={{ user, setUser }}` is a new object every render (Section 6's referential instability), so the Context value "changes" every time the Provider re-renders, re-rendering every consumer every render, for nothing. Fix: stabilize the value with `useMemo` (`const value = useMemo(() => ({ user, setUser }), [user])`), or let the Compiler do it (Section 7). This single fix eliminates a large class of "Context re-renders everything constantly" problems.

**One big Context.** Putting many unrelated pieces of state in one Context value means any change to any of them re-renders every consumer, including those reading unrelated fields. Fix: split into multiple Contexts grouped by what changes together and who consumes it, so a change to one concern does not re-render consumers of another.

**State and dispatch together.** Consumers that only *dispatch* (fire actions, never read state) still re-render when the state changes if state and dispatch share one Context. Fix: split state and dispatch into two Contexts; since `dispatch` (and `useState` setters) are referentially stable, the dispatch Context never changes, so dispatch-only consumers never re-render from state changes.

The hard ceiling, which is the performance reason to leave Context for a store: Context has *no slice-level subscription*. A consumer re-renders when the Context value changes, with no way to subscribe to only the part it reads (the selectivity gap, State guide Section 11). Splitting Contexts raises the granularity to "one value per Context," but within a single Context, every consumer re-renders on any change to that value, and React 19 still adds no built-in Context selector. So when you have shared state that is (a) read by many components, (b) sliced differently by different consumers, and (c) changing frequently, Context will re-render too much no matter how you tune it, and under concurrent rendering those broad re-renders can become repeated speculative work, making the cost worse. The performance answer is an external store (State guide, Section 12): state outside the tree, components subscribe to exactly the slice they read via a selector, and the store re-renders only the components whose slice changed, through `useSyncExternalStore` (which also keeps it correct under concurrency). This gives fine-grained, roughly constant-time re-rendering that Context cannot. The same store model underlies TanStack Query's cache (Data Fetching guide, Section 14), which is why server data does not belong in Context either: the store gives you the selective subscription Context lacks.

So the performance decision for shared state mirrors the State guide's architectural one: ambient, rarely-changing values (theme, user, locale) are fine in a well-stabilized, well-split Context, because the re-renders are infrequent; large or fast-changing state read in slices by many consumers wants an external store with selectors, because that is the only thing that gives slice-level re-rendering. Reaching for the store is a performance decision driven by the selectivity gap, not a default.

> **Try it.** Build a Context with an inline-object value and several `React.memo` consumers, each reading a different field. Change one field and watch all consumers re-render despite the memo (Context bypasses memo). Stabilize the value and split state from dispatch, and watch the dispatch-only consumer go silent. Then move the frequently-changing slice into a tiny store (Zustand or a hand-rolled `useSyncExternalStore`) with per-consumer selectors and watch only the consumer reading the changed slice re-render.

**You've got this if** you can explain why `React.memo` cannot stop a Context-driven re-render, and why a store with selectors re-renders fewer components than a single Context for frequently-changing sliced state.

---

## 11. Concurrency as a performance tool: useTransition and useDeferredValue

*Prereqs: Sections 2 and 3, plus the rendering guide on concurrent rendering and lanes (recapped here) and the Hooks guide on `useTransition` and `useDeferredValue` (Section 15). Outside React: the idea of a frame budget (the browser has about 16 milliseconds per frame to stay at 60fps).*

**The itch.** You have a search box that filters a large list, and typing is laggy: each keystroke triggers an expensive re-render of the results, and the input itself stutters because that work blocks it. You have made the render as cheap as you reasonably can, but it is still heavy, and the typing has to stay smooth. This is what concurrency is for.

**The short version.** Concurrent rendering lets React treat some updates as *non-urgent*, so it can keep the UI responsive to urgent updates (like typing) while the expensive update renders at lower priority, and even interrupt the expensive render if more urgent input arrives. `useTransition` marks a *state update* as a non-urgent transition (and gives you an `isPending` flag); `useDeferredValue` produces a *lagging copy* of a value so an expensive subtree can render against the old value while the input stays snappy. These do not make the expensive work *less*; they make it *not block* the urgent work, which is a different and sometimes the only available kind of performance win.

**How it actually works.**

Recall from the rendering guide that React 19's concurrent rendering can assign updates to *lanes* of different priority and can pause, interrupt, and resume rendering work. The performance consequence is that not all updates have to be equally urgent: an update can be marked as low priority, so React renders it in a way that does not block high-priority updates like keystrokes, and can abandon a low-priority render in progress if a high-priority update comes in. This is the mechanism that `useTransition` and `useDeferredValue` expose, and it addresses a specific problem: *unavoidable* expensive work that must not block interaction.

The frame-budget framing makes the problem concrete: the browser has roughly 16 milliseconds per frame to stay smooth at 60 frames per second. If a keystroke triggers a re-render that takes 50 milliseconds (filtering and rendering a large list), that work blocks the main thread for 50 milliseconds, during which the input cannot update and the UI is frozen, so typing feels laggy. You have two options: make the work fit in the budget (cheaper render, Section 3; virtualization, Section 12), or, when you cannot, *get the work out of the way of the keystroke* so the input stays responsive while the heavy render happens at lower priority. Concurrency is the second option.

**`useTransition`** marks a state update as a non-urgent transition:

```js
const [isPending, startTransition] = useTransition();
const [query, setQuery] = useState('');
const [results, setResults] = useState(initial);

function onChange(e) {
  setQuery(e.target.value);                  // urgent: update the input immediately
  startTransition(() => {
    setResults(expensiveFilter(e.target.value)); // non-urgent: may be interrupted by more typing
  });
}
```

The `setQuery` update is urgent: it runs at high priority so the input reflects the keystroke immediately, keeping typing smooth. The `setResults` update is wrapped in `startTransition`, marking it non-urgent. React renders the expensive results update at lower priority, and if the user types again before it finishes, React can *abandon* the in-progress results render and start over with the newer query, rather than blocking the new keystroke behind the stale render. `isPending` is true while the transition is rendering, so you can show a subtle "updating" indicator. The net effect: typing stays responsive even though filtering is expensive, because the expensive part no longer blocks the urgent part.

**`useDeferredValue`** is the value-oriented version: instead of marking an update, you derive a *lagging* copy of a value, and feed that lagging copy to the expensive part:

```js
const [query, setQuery] = useState('');
const deferredQuery = useDeferredValue(query);          // lags behind query
const results = useMemo(() => expensiveFilter(deferredQuery), [deferredQuery]);
```

`query` updates immediately (the input is snappy), and `deferredQuery` lags: React keeps it at the old value while the urgent update commits, then updates it and re-renders the expensive results at lower priority. So the expensive results render against the deferred value, off the critical path of the keystroke. It is the same underlying priority mechanism as `useTransition`, expressed as "let this value lag" rather than "mark this update as a transition." Reach for `useDeferredValue` when the expensive work is driven by a *value* you receive (including a prop you do not control the setter for); reach for `useTransition` when you own the *state update* that triggers the work.

The crucial caveat, so you use these correctly: **concurrency does not reduce the work; it reschedules it.** The expensive filter still runs and still takes 50 milliseconds; concurrency just keeps that 50 milliseconds from blocking the keystroke. So these are tools for *perceived* responsiveness when expensive work is genuinely necessary, not substitutes for making the work cheaper. The right order is still: make the render cheap (Section 3), render less (virtualization, Section 12), and *then*, if there is irreducible heavy work that must not block interaction, use `useTransition`/`useDeferredValue` to get it off the critical path. Using concurrency to paper over work that could simply be made cheaper is treating a symptom; using it for work that genuinely cannot be reduced is exactly its purpose.

> **Try it.** Build a search input that filters a large list expensively, with no concurrency, and feel the typing lag. Wrap the results update in `startTransition` (or feed the expensive filter a `useDeferredValue(query)`) and feel the input become responsive while the results update slightly behind, with `isPending` showing the lag. Profile both and note that the filter still takes the same time; what changed is that it no longer blocks the keystroke.

**You've got this if** you can explain why `useTransition` and `useDeferredValue` keep typing smooth without making the expensive work any cheaper, and when you would reach for them versus making the render cheaper or virtualizing.

---

## 12. Virtualization: rendering only what is visible

*Prereqs: Sections 2 and 3. Outside React: the DOM cost of many nodes (thousands of elements are slow to create, lay out, and paint), and how scrolling and absolute positioning work.*

**The itch.** You render a list of 10,000 rows and the page is slow to load, janky to scroll, and heavy in memory, even though only a dozen rows are visible at once. You are paying to render and keep in the DOM thousands of elements the user cannot see. Virtualization renders only the ones they can.

**The short version.** Virtualization (also called windowing) renders only the list items currently visible in the viewport (plus a small buffer), instead of all of them. The mechanism: a scroll container of the full height, with only the visible items actually rendered and absolutely positioned at their correct offsets, updated as the user scrolls. This turns a list of 10,000 rows into a list of maybe 20 rendered nodes, which is dramatically faster to render, commit, and scroll, and uses far less memory. You reach for it whenever a list, grid, or feed is large enough that rendering all of it is the bottleneck. Libraries handle the mechanics: TanStack Virtual (headless), react-virtuoso (batteries-included), react-window (mature).

**How it actually works.**

The cost of a large list is not subtle: rendering 10,000 rows means React creates 10,000 (or many more) elements, reconciles them, and commits 10,000 DOM nodes, which the browser must lay out and paint, and keep in memory. That is expensive in every phase (Section 3's "large subtree" and "many DOM mutations" costs at once), and it is *wasted*, because the user sees only the dozen rows in the viewport at any moment. Virtualization eliminates the waste by rendering only what is visible.

The mechanism, which is worth understanding even though you will use a library for it:

1. **A scroll container with the full scroll height.** You create a scrollable container whose inner height (via a spacer element) equals the total height of all items as if they were rendered, say 10,000 rows times 35 pixels each. This makes the scrollbar behave correctly: the user can scroll through the whole list's worth of space, and the scroll position maps to a position in the full list.
2. **Render only the visible window.** Based on the current scroll offset and the container's height, you compute which items are currently in view (say items 120 through 140), plus a small *overscan* buffer above and below (a few extra rows so scrolling does not reveal blank space before the next render). You render *only* those items, perhaps 20 elements instead of 10,000.
3. **Position the rendered items absolutely at their real offsets.** Each rendered item is absolutely positioned at its correct place within the full-height container (item 120 at `top: 120 * 35px`, and so on, often via a `transform: translateY`). So the dozen-plus rendered rows appear exactly where they would be in the full list, and the full-height spacer makes everything around them scroll correctly.
4. **Update on scroll.** As the user scrolls, the visible window changes, so you recompute which items are in view and render that new set, recycling the small number of rendered nodes. The DOM never holds more than the visible window plus overscan.

The result is that the rendered node count, the render work, the commit work, and the memory are all bounded by the *viewport size*, not the *list size*. A list of 10,000 or 1,000,000 items renders the same handful of visible rows, so it loads fast, scrolls smoothly, and stays light. This is the only effective fix for genuinely large lists; no amount of memoization helps, because the cost is the sheer quantity of rendered and committed nodes, and the fix is to render far fewer of them.

You will not hand-write this; the offset math, dynamic item heights, scroll handling, and edge cases are what libraries exist for. The current options in 2026:

- **TanStack Virtual** (`@tanstack/react-virtual`): a *headless* virtualizer (it gives you the positions and the visible window via a hook, and you render the markup), lightweight, flexible, multi-framework, and a natural fit if you are already using TanStack Query or Table. Best when you want full control over the markup and minimal overhead.
- **react-virtuoso**: a *batteries-included* component with built-in support for dynamic item heights, grouping, sticky headers, and infinite scroll out of the box. Often the pragmatic default for complex lists (chat, feeds, grouped or variable-height content) because it handles the hard cases for you.
- **react-window**: mature, lightweight, and battle-tested (from the author of react-virtualized), but focused on fixed-size lists and no longer actively developed. Fine for an existing codebase or simple fixed-height lists; not the first choice for new projects with complex needs.

Choose by your list's complexity: react-virtuoso for rich, dynamic-height, grouped content where you want the features handled; TanStack Virtual when you want a headless, minimal, controllable virtualizer; react-window for simple fixed-size lists in a maintained codebase. All three implement the same core mechanism above; the differences are ergonomics and which hard cases they handle for you.

A caveat to keep it honest: virtualization adds complexity (absolute positioning, measurement, scroll handling, and quirks with things like find-on-page, anchored links, and accessibility), so it is worth it specifically when the list is large enough that rendering it all is a real, measured bottleneck (Section 4). For a list of fifty items, virtualization is overhead you do not need; for a list of fifty thousand, it is the difference between usable and frozen. Measure, confirm the list is the bottleneck, then virtualize.

> **Try it.** Render a list of 10,000 rows the naive way and profile the render and commit time, scroll jank, and node count in the Elements panel (10,000+ nodes). Then render the same data with TanStack Virtual or react-virtuoso and profile again: the node count drops to the visible window plus overscan, and the render, commit, and scroll all get dramatically faster. Seeing the Elements panel hold ~20 nodes for a 10,000-item list is the mechanism made visible.

**You've got this if** you can explain how virtualization bounds the rendered node count by the viewport rather than the list size, and why it is the only effective fix for a genuinely large list.

---

## 13. Code splitting and lazy loading

*Prereqs: Section 1 (the load axis), plus the rendering guide on Suspense (recapped here). Outside React: JavaScript bundles, dynamic `import()`, and the idea of loading code on demand.*

**The itch.** Your app's initial load is slow: the user waits for a large JavaScript bundle to download and parse before anything is interactive, even though they only need the login screen at first. You are shipping the entire app up front when you could ship just what the first screen needs and load the rest on demand.

**The short version.** Code splitting breaks your one big JavaScript bundle into smaller chunks that load on demand, so the initial load only downloads the code the first screen needs. In React you do this with `React.lazy` plus `Suspense` (and dynamic `import()`): a lazily-imported component is loaded in a separate chunk only when it is first rendered, with a `Suspense` fallback shown while it loads. The highest-impact place to split is by route (each page is its own chunk), so navigating to a page loads that page's code. This is a *load-performance* technique (Section 1): it reduces the bytes shipped up front, not the runtime render cost.

**How it actually works.**

This is the first of the load-axis sections (Section 1), and the mechanism is about *when* code arrives rather than *how* it renders. By default, your bundler combines all your code into one (or a few) bundles that the browser downloads, parses, and executes before the app is interactive. The larger that bundle, the longer the wait, and most of it is code for screens and features the user has not reached yet (the settings page, the admin panel, a heavy charting library used on one report). Code splitting defers that code: it is put in separate *chunks* that are only fetched when actually needed.

The primitive is the dynamic `import()`: where a static `import` is resolved at build time and bundled in, a dynamic `import('./Thing')` returns a promise that loads the module *at runtime*, which signals the bundler to put that module in its own chunk. React wraps this in `React.lazy` and integrates it with `Suspense`:

```js
import { lazy, Suspense } from 'react';
const SettingsPage = lazy(() => import('./SettingsPage')); // its own chunk, loaded on first render

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      {showSettings && <SettingsPage />}  {/* chunk fetched only when this first renders */}
    </Suspense>
  );
}
```

`lazy(() => import('./SettingsPage'))` creates a component that, the first time it is actually rendered, triggers the dynamic import to fetch its chunk. While that chunk is loading, the component *suspends* (the same Suspense mechanism from the rendering guide and the Data Fetching guide's Section 13), so React shows the nearest `<Suspense>` fallback; when the chunk arrives, the component renders. So `SettingsPage`'s code is not in the initial bundle at all; it is downloaded on demand the first time the user opens settings, and the initial load is smaller and faster by exactly that much. Suspense is what makes the loading state graceful: you declare the fallback once, and any lazy component below it shows that fallback while its chunk loads.

The highest-leverage place to split is **by route**, because routes are natural boundaries: a user on the dashboard does not need the settings page's code, the admin code, or the rarely-used report's heavy dependencies. Route-based splitting (each page lazily imported, so each becomes its own chunk) means the initial load ships only the code for the entry screen plus shared code, and each subsequent page's code loads when navigated to. Most routers and frameworks make this the default or near-default, and it typically gives the biggest initial-load win for the least effort. Beyond routes, you can split *component-level* for heavy pieces that are not always shown (a large modal, a charting widget, a rich editor): lazy-load them so their code (and their heavy dependencies) only arrives when the feature is used.

Two refinements worth knowing. First, **preloading**: because waiting for a chunk to load after the user clicks can itself feel slow, you can *preload* a chunk ahead of need (on hover, on idle, or when navigation becomes likely), so the code is already there when the component renders, exactly analogous to prefetching data (Data Fetching guide, Section 12). Frameworks often preload route chunks on link hover for this reason. Second, **do not over-split**: each chunk has overhead (a separate request, and too many tiny chunks can hurt more than they help), and splitting code that is needed immediately just adds a loading state to the critical path. Split at meaningful boundaries (routes, large optional features), not everywhere.

The key framing, tying back to Section 1: code splitting is a *load-performance* tool. It does nothing for runtime rendering cost (a split component renders exactly as fast or slow as before); it reduces the *bytes shipped up front* so the app becomes interactive sooner. So you reach for it when your measurement shows the bottleneck is load (slow first paint, large initial bundle), not when the problem is jank during use. And it pairs with the next section (trimming the bundle itself) and with Server Components (moving code off the client entirely), which are the other two ways to ship less.

> **Try it.** Build an app with a heavy page (import a large library into it) bundled normally, and measure the initial bundle size and load time. Convert that page to `React.lazy` with a `Suspense` fallback, rebuild, and confirm in the bundle output that the heavy code moved to a separate chunk and the initial bundle shrank. Load the app and watch the heavy chunk fetch only when you navigate to that page (Network tab).

**You've got this if** you can explain how `React.lazy` plus `Suspense` defers a component's code to an on-demand chunk, and why route-based splitting usually gives the biggest initial-load win.

---

## 14. Bundle cost: shipping less JavaScript

*Prereqs: Section 13. Outside React: bundlers, tree-shaking (dead-code elimination), and the download-and-parse cost of dependencies. From the RSC guide: Server Components ship zero client JavaScript.*

**The itch.** Even after code splitting, your bundle is large, and you are not sure what is in it. A single date-formatting library or a barrel import is quietly adding hundreds of kilobytes, and you cannot improve what you cannot see. The biggest load wins usually come from finding and cutting bundle weight, not from more splitting.

**The short version.** The dominant cost of initial load is the size of the JavaScript the browser must download, parse, and execute, and that size is dominated by your *dependencies* and by code that should have been removed but was not. The tools are: a bundle analyzer to *see* what is in your bundle, tree-shaking to drop unused code (which silently fails for non-tree-shakeable libraries and some barrel imports), choosing lighter dependencies, and, most powerfully, Server Components, which run on the server and ship *zero* JavaScript to the client for that code. The principle is to ship less JavaScript, and the first step is always to measure what you are shipping.

**How it actually works.**

Load performance (Section 1) is dominated by bytes of JavaScript, for two reasons: download time (more bytes take longer, especially on slow networks) and, often more importantly, *parse and execute* time (the browser must parse and run all that JavaScript on the main thread before the app is interactive, which is slow on low-end devices regardless of network speed). So "ship less JavaScript" is the core principle of load performance, and code splitting (Section 13) is only one way to do it (ship some code *later*); the others are to ship *less total* code.

**Measure what is in the bundle first.** You cannot trim what you cannot see, so the first step is always a *bundle analyzer* (most bundlers have one, often producing a treemap of what occupies the bundle). It almost always reveals surprises: a single heavy dependency taking a large fraction of the bundle, multiple versions of the same library, a large library imported for one small function, or polyfills you do not need. This is the load-axis equivalent of the Profiler (Section 4): measure, find the heavy thing, address that. Optimizing the bundle without analyzing it is the same mistake as optimizing renders without profiling.

**Dependencies are usually the biggest lever.** Application code is often a small fraction of the bundle; third-party libraries are usually the bulk. So the highest-impact moves are about dependencies: prefer a lighter library over a heavy one for the same job (a small date utility instead of a large all-in-one date library; a focused utility instead of importing a whole toolkit for one function), import only the part you use rather than the whole library, and remove dependencies you can replace with a few lines of your own code. A single well-chosen swap (replacing one heavy dependency) often beats a week of micro-optimizations, which is why the analyzer matters: it points you at the heavy dependency.

**Tree-shaking, and why it silently fails.** Tree-shaking is the bundler's dead-code elimination: it drops exports you never import, so importing one function from a library should, in principle, only bundle that function. But it fails quietly in common cases, and the failure ships code you thought you had excluded. It fails when a library is authored in a non-tree-shakeable way (CommonJS modules, or modules with *side effects* the bundler cannot prove are safe to drop), and it can fail with *barrel files* (an `index.js` that re-exports everything from a folder): importing one thing from a barrel can pull in the whole barrel if the bundler cannot prove the rest is side-effect-free, so a single import drags in dozens of modules. The practical defenses are to import from the specific module path rather than the barrel when a library is large, to prefer ES-module, side-effect-free libraries (and mark your own package `"sideEffects": false` when true), and to *verify with the analyzer* that the trimming actually happened, because tree-shaking failures are invisible until you look at the bundle.

**The most powerful lever: move code off the client (Server Components).** The biggest reduction in shipped JavaScript is not to ship some of it at all. React Server Components (the RSC guide) run on the *server*, render to a payload, and ship *zero JavaScript to the client* for that component and its server-only dependencies. So a component that uses a heavy library purely to render (a Markdown renderer, a syntax highlighter, a date formatter for display) can be a Server Component, and that heavy library never reaches the client bundle at all; only the rendered output does. This is qualitatively different from code splitting (which ships the code *later*) or tree-shaking (which ships *less* of it): the server-only code is *never shipped*. In a Server Components architecture, keeping heavy, render-only dependencies in Server Components is one of the largest available bundle wins, which is one of the central reasons RSC exists. (The framework-coupled details are in the RSC guide; the performance point is that server-rendering code removes it from the client bundle entirely.)

The framing, tying back to Section 1: this is all load performance, and the principle is to ship less JavaScript, in order of leverage: see what you ship (analyze), cut the heavy dependencies (swap, import narrowly, remove), make sure tree-shaking actually works (verify), split what is left so the initial load ships only what the first screen needs (Section 13), and move render-only code to the server so it is never shipped (RSC). None of this touches runtime rendering; it all touches the bytes the browser must process before your app runs, which for many apps is the larger performance problem.

> **Try it.** Run a bundle analyzer on a real app and look at the treemap. Find the single largest dependency and ask whether you need all of it (or all of it on the client). Try replacing one heavy library with a lighter alternative, or importing one function from its specific module path instead of the barrel, rebuild, and confirm the bundle shrank. If you have a Server Components setup, move a render-only component that uses a heavy library to the server and watch that library leave the client bundle entirely.

**You've got this if** you can explain why dependencies usually dominate bundle size, how tree-shaking can silently fail, and why moving code to a Server Component removes it from the client bundle in a way code splitting does not.

---

## 15. A performance methodology

*Prereqs: ideally Sections 1 through 14.*

**The itch.** You have the techniques. Now you want a repeatable order of operations, so that faced with a slow app you work from measurement to the right fix instead of reaching for whatever technique you read about most recently.

**The short version.** Always start by measuring and classifying the axis (load or runtime, Section 1). For runtime, measure with the Profiler, then prefer the cheapest, most structural fixes first: make the render cheap, move state down, lift content up, and let the Compiler handle memoization, before reaching for manual memo, store selectors, concurrency, or virtualization, each of which targets a specific measured cause. For load, analyze the bundle, then split by route, trim dependencies, and move render-only code to the server. Measure again after each change. The order is cheapest-and-most-structural first, targeted-and-heavier last.

**How it actually works.**

Run this as an ordered procedure. The ordering reflects two principles: measure before acting, and prefer fixes that remove the cause and add the least complexity over fixes that add boundaries and indirection.

**Step 0: Measure and classify (Sections 1, 4).** Reproduce the actual slow thing and decide whether it is *load* (slow to become interactive) or *runtime* (laggy while using). Use the Profiler for runtime and a bundle analyzer plus load metrics for load. Do not proceed on a hunch; the rest of the procedure depends on knowing the axis and the specific bottleneck.

For **runtime** problems, in order:

1. **Is the render expensive, or just frequent? (Section 3.)** If a single render is slow (expensive computation, large subtree, many DOM mutations), fix *that* first: memoize the expensive computation with `useMemo`, or move it out of render. Fixing a slow render often makes the re-render frequency irrelevant. Do not optimize the frequency of a render that is already cheap.
2. **Shrink the re-render at its source structurally (Section 8, State guide Section 2).** Move state down so changes re-render a smaller subtree; lift expensive content up and pass it as `children` so state changes cannot reach it. These remove re-renders without any memoization and are the cleanest fixes.
3. **Let the Compiler handle memoization (Section 7).** If the project has the React Compiler enabled (the recommended setup), it inserts the prop-stabilization and component bailouts automatically; do not hand-write `useMemo`/`useCallback`/`React.memo` defensively. If it is *not* enabled, apply manual memo boundaries with stable props where the Profiler shows a parent-render cascade is the cost (Sections 5, 6).
4. **For Context-driven re-renders (Section 10).** If the Profiler says components render because Context changed, stabilize and split the Context and separate dispatch; if the shared state is large or fast-changing and sliced by many consumers, move it to an external store with selectors.
5. **For irreducible expensive work that blocks interaction (Section 11).** If the work genuinely cannot be made cheaper and is blocking typing or interaction, use `useTransition`/`useDeferredValue` to move it off the critical path so the UI stays responsive.
6. **For large lists (Section 12).** If the bottleneck is the sheer number of rendered items, virtualize so only the visible window renders. This is the only effective fix for genuinely large lists.

For **load** problems, in order:

1. **Analyze the bundle (Section 14).** See what is actually shipped before changing anything.
2. **Split by route, then by heavy optional feature (Section 13).** Ship only the entry screen's code up front; load the rest on demand, preloading where navigation is likely.
3. **Trim dependencies and verify tree-shaking (Section 14).** Swap heavy libraries for lighter ones, import narrowly, and confirm with the analyzer that the trimming happened.
4. **Move render-only code to the server (Section 14, RSC guide).** Server Components ship zero client JavaScript for server-only code, the largest available reduction.

**After every change, measure again (Step 0's tools).** Confirm the change helped, and revert it if it did not (you learned the bottleneck was elsewhere, and you avoided keeping complexity for no benefit). The loop is the method.

**The whole thing in one paragraph.** React performance is two separate problems: rendering too much at runtime, and shipping too much code at load, and the first move is always to measure and decide which one you have, because the fixes do not transfer. Runtime performance rests on understanding that a render propagates downward from whoever rendered, regardless of props, so a parent rendering re-renders its children by default, and that most renders are cheap, so the real costs are expensive work inside a render, a re-render cascading into a huge subtree, or a commit touching many DOM nodes. You therefore fix the slow render before the re-render: make the single render cheap, then shrink what re-renders by moving state down and lifting content up as children (structural fixes that beat memoization), then rely on the React Compiler to insert the memoization that stabilizes props and bails out components, falling back to manual `React.memo` with stable props only where measurement shows a parent-render cascade is the cost and remembering that memo bypasses neither its own state nor Context. Context re-renders all consumers and ignores memo, so you stabilize and split it and reach for an external store with selectors when shared state is large or fast-changing; concurrency (`useTransition`, `useDeferredValue`) keeps the UI responsive when expensive work is unavoidable without making it cheaper; and virtualization is the only real fix for a genuinely large list, because it bounds rendered nodes by the viewport rather than the list. Load performance is about shipping less JavaScript: analyze the bundle, split it by route so the first screen ships only what it needs, trim and narrowly import dependencies while verifying tree-shaking actually worked, and move render-only code into Server Components so it is never shipped to the client at all. And throughout, the discipline that makes all of it work is the measure-change-measure loop, because performance intuition is unreliable and the Profiler and bundle analyzer are what keep the work honest.

> **Try it.** Take a real performance complaint about your app and run the whole procedure: classify the axis, measure, identify the specific bottleneck, apply the *first* applicable fix in the ordered list (not the fanciest one), measure again, and stop when the measurement says it is fast enough. Doing this once end to end, resisting the urge to jump to virtualization or memo before measuring, is the habit the whole guide is for.

**You've got this if** you can take an arbitrary "it's slow" and produce an ordered plan that starts with measurement and classification and reaches for the cheapest structural fix before the heavier targeted ones.

---

## 16. Debugging performance

*Prereqs: the rest of the guide.*

**The itch.** Something is slow, and you want to map the symptom to the mechanism and the fix, fast, instead of trying techniques at random.

**The short version.** Most performance problems are one of a small set, and each maps to a section. The procedure: measure (Profiler for runtime, analyzer for load), read *why* the cost is happening, and apply the fix for that cause. The Profiler's "why did this render" and the bundle analyzer's treemap are the two instruments that turn a vague "it's slow" into a specific, fixable diagnosis.

**How it actually works.**

Measure first (Section 4), then match the symptom.

**Everything re-renders when one thing changes.** Either an unstable value is cascading (an inline object/array/function prop defeating a memo boundary, Section 6) or a Context change is re-rendering all consumers (Section 10). The Profiler's "why did this render" tells you which: "props changed" points at unstable props (stabilize them, or let the Compiler do it); "context changed" points at a Context problem (stabilize and split the Context, or move to a store with selectors).

**`React.memo` did not help.** Its props are not actually stable (inline object/array/function from the parent, Section 6), or the re-render is from Context, not the parent (Section 10), which memo cannot stop. Check the props' identity and the Profiler's render reason.

**Typing or interaction lags.** A single expensive render is blocking the interaction (Section 3): first make the render cheap (memoize the computation, virtualize the list it renders), and if the work is irreducible, move it off the critical path with `useTransition`/`useDeferredValue` (Section 11).

**A long list janks while scrolling, or the page with it is slow.** Too many rendered DOM nodes (Section 12). Virtualize so only the visible window renders. No memoization fixes this; the cost is the node count.

**Inputs in a list follow the wrong row after reorder, or reordering is slow.** Array-index keys binding state to position and forcing wasteful DOM mutation (Section 9). Use stable identity keys.

**State should reset between items but does not (or resets when it should not).** A key issue (Section 9): use `key={entityId}` to remount-and-reset deliberately, or fix a key that is changing when it should be stable.

**The initial load is slow / the app is unresponsive before it starts.** A load-axis problem (Sections 1, 13, 14): analyze the bundle, split by route, trim heavy dependencies, and move render-only code to the server. The React Profiler will look fine here; the cost is in download and parse, visible in the bundle analyzer and the browser's load metrics.

**A `useMemo` or `useCallback` is everywhere but nothing is faster.** Either it is memoizing trivial work (net loss, Section 3 and Hooks Section 12), or its dependencies are unstable so it never hits (Section 6), or the project has the Compiler and the manual memoization is redundant (Section 7). Measure whether it helps; if not, remove it.

**The closing synthesis.** Performance work is the discipline of not doing unnecessary work, and it splits cleanly into not *rendering* too much at runtime and not *shipping* too much code at load, with measurement as the constant that keeps both honest. At runtime, the foundation is that rendering propagates downward from whoever rendered regardless of props, so the questions are always "is this render expensive or merely frequent," "can I shrink what re-renders by relocating state or lifting content," and "is the cost coming from props, from Context, or from sheer quantity," each of which points at a specific fix, from making the render cheap, to composition, to the Compiler-or-memo, to a store, to virtualization, to concurrency. At load, the foundation is that bytes of JavaScript dominate, so the questions are "what am I shipping," "what can I ship later (split)," "what can I ship less of (trim and tree-shake)," and "what can I never ship to the client at all (Server Components)." None of these are guesses: the Profiler tells you why a component rendered and how long it took, and the bundle analyzer tells you what occupies your bundle, and the entire method is to measure, apply the cheapest structural fix the measurement justifies, and measure again. The techniques are many, but the discipline is one: look before you optimize, fix the cause the measurement reveals, and prefer removing work over guarding against it.

> **Try it.** Take a real slow spot in your app, open the Profiler (or bundle analyzer, depending on the axis), and write a one-sentence diagnosis in the form "it is slow because X, which is Section N's mechanism, so the fix is Y." Then apply Y and measure again. Doing this on two or three real problems makes the measure-diagnose-fix loop reflexive, which is the whole point of the guide.

**You've got this if** you can take "the whole screen re-renders when I type" or "the initial load is slow" and name the axis, the mechanism, and the fix without guessing, and you reach for the Profiler or analyzer before you reach for a technique.

---

## Further reading (primary sources)

When you want to go past this guide, these are the canonical sources, each with a note on how it relates to what you read here and how current it is.

**The official React docs (react.dev), current within the React 19 line.** The reference pages for the tools in this guide are accurate and worth reading: `memo` (https://react.dev/reference/react/memo) for Sections 5 and 6, `useMemo` (https://react.dev/reference/react/useMemo) and `useCallback` (https://react.dev/reference/react/useCallback) for Section 7, `useTransition` (https://react.dev/reference/react/useTransition) and `useDeferredValue` (https://react.dev/reference/react/useDeferredValue) for Section 11, and `lazy` (https://react.dev/reference/react/lazy) with `Suspense` (https://react.dev/reference/react/Suspense) for Section 13. The "Render and Commit" learn page (https://react.dev/learn/render-and-commit) underpins Sections 2 and 3.

**The React Compiler documentation and 1.0 announcement, at https://react.dev/learn/react-compiler and https://react.dev/blog/2025/10/07/react-compiler-1 .** The primary source for Section 7: what the Compiler does, how to enable it (it is opt-in at the build level), the `"use no memo"` opt-out, and the reported performance wins. Current as of the October 2025 stable release; the lint rules now live in `eslint-plugin-react-hooks` (v6 and later).

**"Before You memo()" by Dan Abramov, at https://overreacted.io/before-you-memo/ .** The canonical argument for Section 8: prefer composition (moving state down, passing content as `children`) over memoization. It predates the Compiler, so read its `memo` advice alongside Section 7, but the composition patterns are evergreen and are the most underused performance techniques in React.

**"Fix the slow render before you fix the re-render" by Kent C. Dodds, at https://kentcdodds.com/blog/fix-the-slow-render-before-you-fix-the-re-render .** The primary source for Section 3's reframe: diagnose whether a render is expensive before trying to reduce how often it happens. Evergreen and high-value.

**The React DevTools Profiler documentation** (linked from the React docs and the React DevTools extension) for Section 4, and your browser's Performance panel documentation for the load-axis and commit-phase measurements. These are the instruments the whole guide depends on; learning to read the flamegraph and the "why did this render" data is the single highest-leverage skill here.

**Virtualization libraries (Section 12), current and maintained as of 2026:** TanStack Virtual at https://tanstack.com/virtual/latest (headless, lightweight), react-virtuoso at https://virtuoso.dev (batteries-included, the pragmatic default for complex lists), and react-window (mature, fixed-size focus, less actively developed). Read each one's introduction through the Section 12 lens (render only the visible window) rather than as isolated APIs.

**For load performance beyond React, web.dev (https://web.dev) on Core Web Vitals and loading performance.** Load performance (Sections 13 and 14) is mostly a web-platform topic, not a React-specific one, and web.dev is the canonical source for what the browser actually spends time on (download, parse, execute, layout, paint) and how it is measured.

A good way to use all of these: read the relevant deep section of this guide first so you have the model and the vocabulary, then read the primary source, then come back. This guide gives you the two axes, the mechanisms, and the ordered methodology; the primary sources go deeper on individual tools, and the Profiler and bundle analyzer are where you confirm any of it on your own app.

---

*Built to be climbed, not swallowed. Finish pass 1 and you are already ahead. Come back for the deep parts when a real lag, jank, or slow load gives you a reason to care, and run the experiments with the Profiler and bundle analyzer open, because performance is the topic where measuring beats guessing every single time. Every version and tool claim (the React Compiler 1.0 as an opt-in build tool that auto-memoizes, the 19.2.x line, the 2026 virtualization landscape of TanStack Virtual and react-virtuoso) reflects the state of things in 2026; the core model (two axes of load and runtime, rendering propagates downward, most renders are cheap so fix the expensive ones, prefer structural fixes over memoization, ship less JavaScript, and measure before and after everything) is stable and not going anywhere. This is the last guide in Track B; together with the rendering, RSC, hooks, state, and data-fetching guides, it is a complete picture of how React works and how to make it fast.*
