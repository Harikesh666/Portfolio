---
title: "React Error Boundaries and Resilience"
description: "What React catches, how it recovers, and how error boundaries contain failures in real applications."
category: "Internals"
readTime: "45 min read"
date: "May 2026"
publishedAt: "2026-05-01"
order: 8
series: "react-internals"
---

> Current as of React 19.2.x (latest patch 19.2.6, May 2026). The error-boundary API (the `getDerivedStateFromError` and `componentDidCatch` class methods) is long-stable. React 19 added the root-level `onCaughtError`, `onUncaughtError`, and `onRecoverableError` options and changed error-logging behavior, both verified against current docs and noted inline. This is a Track A engine-internals guide.

> **What this guide builds on.** This is a Track A (engine internals) guide. From the **rendering and reconciliation guide** it uses the render and commit phases, the work loop (React processes the tree in units of work), fibers (React's internal objects for components), and the idea of *unwinding* the work-in-progress tree. It also touches **Suspense**, because error boundaries and Suspense share the same throw-and-unwind machinery (Section 10). From the **Scheduler and Lanes guide** it uses retry lanes lightly (for the Suspense comparison). Wherever it reaches for one of those, it recaps it in a line. The per-section **Prereqs** lines name what each section needs, drawn from earlier sections here, the other guides, and outside knowledge (JavaScript `throw` and `try`/`catch`, the call stack, and class components with lifecycle methods, since error boundaries are still classes).
>
> **A note on Suspense.** Error boundaries and Suspense are built on the *same* mechanism (a component throws, React unwinds to the nearest boundary), so this guide explains that shared machinery and shows how Suspense uses it. But it does **not** cover Suspense in full: Suspense gets its own dedicated guide next, which goes deep on suspending, fallbacks, boundary placement, transitions, and reveal order. Here, Suspense appears only where it illuminates the shared unwind.

## Read this first

Same method as the other guides.

**You are not meant to absorb this in one sitting.**

### Pass 1, one relaxed sitting (about 25 minutes)

Read only **"The itch"** and **"The short version"** of each section.

You will come out understanding why an uncaught render error takes down the whole app, what an error boundary is and which two methods define it, the unwind-to-boundary mechanism, what boundaries do and do not catch (and why), how to recover, the React 19 root error options, and how all of this shares machinery with Suspense.

That is the whole map.

### Pass 2, driven by real work

When a real problem appears (a white-screen crash, a boundary that did not catch an event-handler error, an error-then-reset loop, hydration-mismatch warnings), come back and read the deep part of the matching section.

### Pass 3, when curious

The further-reading section points at the primary sources and the files in React's own code where the throw-and-unwind machinery lives.

Each section opens with a one-line **Prereqs** note.

Sections that need nothing past basic React and JavaScript say so.

### Two rules that multiply everything
1. **Run the experiments.** Each section ends with a short **"Try it."** Error handling is best learned by deliberately throwing: make a component crash, watch the blast radius with and without a boundary, and watch what a boundary refuses to catch.
2. **Trust the order.** The sections build one picture: why the default is to crash, what a boundary is, how the unwind works, the catch-and-don't-catch boundary, recovery, the React 19 additions, and the shared machinery with Suspense. Here is the spine:

```
   Default: an uncaught render error crashes the whole app   (1, 2)
            │
   The boundary API and why it is a class                     (3, 4)
            │
   The unwind-to-boundary mechanism                            (5)   ◀── the core internals
            │
   What it catches and what it does not (and why)              (6, 7)
            │
   Recovery, the React 19 root options                         (8, 9)
            │
   The same machinery powers Suspense                          (10)  ◀── sets up the Suspense guide
            │
   Resilience architecture, SSR, debugging, source             (11, 12, 13, 14)
```

You do not need to finish this guide to benefit from it.

Finish pass 1 and you are already ahead.

---

## Table of Contents

1. [What an error boundary is, and why React needs one](#1-what-an-error-boundary-is-and-why-react-needs-one)
2. [Why an uncaught error unmounts the whole tree](#2-why-an-uncaught-error-unmounts-the-whole-tree)
3. [The API: getDerivedStateFromError and componentDidCatch](#3-the-api-getderivedstatefromerror-and-componentdidcatch)
4. [Why error boundaries are still class components](#4-why-error-boundaries-are-still-class-components)
5. [The unwind-to-boundary mechanism](#5-the-unwind-to-boundary-mechanism)
6. [What error boundaries catch, and what they do not](#6-what-error-boundaries-catch-and-what-they-do-not)
7. [Handling event-handler and async errors](#7-handling-event-handler-and-async-errors)
8. [Resetting and recovering from an error](#8-resetting-and-recovering-from-an-error)
9. [The React 19 root error options](#9-the-react-19-root-error-options)
10. [The shared machinery: error boundaries and Suspense](#10-the-shared-machinery-error-boundaries-and-suspense)
11. [Resilience: where to put boundaries](#11-resilience-where-to-put-boundaries)
12. [Error boundaries, SSR, and recoverable errors](#12-error-boundaries-ssr-and-recoverable-errors)
13. [Debugging errors and resilience](#13-debugging-errors-and-resilience)
14. [Reading the source](#14-reading-the-source)

---

## 1. What an error boundary is, and why React needs one

Prereqs: basic React.

Outside React: JavaScript `throw` and that an uncaught exception stops execution.

### The itch

One component deep in your tree throws during render (a property read on `undefined`, a bad map over missing data), and instead of just that component breaking, the *entire app* goes blank: a white screen.

It seems disproportionate that one broken widget takes down everything.

An error boundary is how you stop that, but to use it well you need to know why the default is so drastic.

### The short version

When a component throws an error during rendering, React's default is to unmount the *whole* component tree, leaving a blank screen, because a partially-rendered, broken UI is considered worse than no UI.

An *error boundary* is a component that wraps part of your tree and *catches* errors thrown during the rendering of its children, letting you show a fallback UI for just that part instead of crashing the whole app.

It is React's mechanism for graceful degradation: contain a failure to a subtree, show something sensible there, and keep the rest of the app alive.

### How it actually works

The behavior that surprises people is real and deliberate: before error boundaries existed (pre-React 16), a render error could leave React's internal state corrupted, producing subtle, hard-to-trace bugs where the UI showed wrong or impossible things.

React 16 changed the default to be drastic on purpose: if an error during rendering is *not* caught by an error boundary, React unmounts the entire tree from the root, giving you a blank screen rather than a broken one (Section 2 covers the rationale in full).

So "one component throws, the whole app goes blank" is not a bug.

It is React refusing to show a UI it can no longer trust.

An error boundary is the opt-in mechanism for handling that more gracefully.

It is a component you place around a part of your tree, and it does one job: if any component *below it* throws during rendering (or during a lifecycle method or constructor, Section 6), the boundary catches that error and renders a *fallback* UI in place of the subtree that failed, instead of letting the error propagate to the root and blank the whole app.

Conceptually it is a `try`/`catch` for a region of your component tree, where the "try" is rendering the children and the "catch" is showing a fallback.

```jsx
// A minimal error boundary (it must be a class, Section 4)
class ErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError(error) {
    return { hasError: true }; // tell React to render the fallback on the next render
  }
  componentDidCatch(error, errorInfo) {
    logToService(error, errorInfo.componentStack); // side effect: report it
  }
  render() {
    if (this.state.hasError) return <FallbackUI />;
    return this.props.children;
  }
}

// Usage: wrap a part of the tree
<ErrorBoundary>
  <RiskyFeature />   {/* if this throws while rendering, the boundary shows FallbackUI */}
</ErrorBoundary>
```

The mental model to carry from the start: an error boundary defines a *blast radius*.

Everything inside it that throws during render is contained by it.

The boundary shows its fallback for that subtree, and everything *outside* the boundary keeps working normally.

So where you place boundaries determines how a failure is contained: a boundary around one widget means a broken widget shows a fallback while the rest of the page is fine.

No boundary means the broken widget takes down the whole app.

The rest of this guide is about how this containment actually works (the unwind, Section 5), exactly what it catches (Section 6), how to recover (Section 8), and how to architect boundaries for resilience (Section 11).

But the core idea is this one: a boundary turns "the whole app crashes" into "this part shows a fallback," by catching errors thrown while rendering the subtree it wraps.

One framing that helps throughout: error boundaries are about *render-time* failures, the errors that happen while React is building your UI.

That is both their power (they can catch a render error anywhere below them and recover the UI) and their limit (they cannot catch errors that happen *outside* rendering, like in an event handler or an async callback, Section 6), because those are not part of the render React would need to recover.

Holding "boundaries catch render errors" from the start makes the catch-and-don't-catch list in Section 6 predictable rather than a set of arbitrary rules.

### Try it

> Build a component that throws during render (`function Boom() { throw new Error('boom'); return null; }`) and render it in your app with no boundary. Watch the whole app go blank (and check the console). Then wrap it in the `ErrorBoundary` above and watch only that spot show the fallback while the rest of the app keeps working. The difference between the blank screen and the contained fallback is the entire value of boundaries.

### You've got this if

You can explain why an uncaught render error blanks the whole app and what an error boundary changes about that, in terms of containing a failure to a subtree.

---

## 2. Why an uncaught error unmounts the whole tree

Prereqs: Section 1.

From the rendering guide: that React keeps the DOM in sync with your render, recapped here.

Outside React: the idea of corrupt or inconsistent state.

### The itch

Unmounting the entire app over one component's error feels like overkill: why not just skip the broken component and render the rest?

React chose the drastic default deliberately, and the reasoning (a broken UI is worse than no UI) is worth understanding, because it justifies why boundaries exist and where to put them.

### The short version

React unmounts the whole tree on an uncaught render error because a partially-rendered or broken UI can be *worse* than a blank one: it can show wrong, inconsistent, or impossible state, which at best confuses users and at worst causes them to act on bad information (a wrong balance, a wrong recipient, a wrong button).

Rather than risk leaving the UI in a corrupt state it cannot reason about, React tears the whole thing down to a known-safe empty state.

Error boundaries exist precisely so that you can opt into graceful degradation for the parts of your app where a contained fallback is better than a full teardown.

### How it actually works

The decision goes back to React 16, and the reasoning is about *trust in the UI's consistency*.

Recall from the rendering guide that React's whole job is to keep the DOM in sync with your render output: given your components and their state, React computes a UI and makes the DOM match it.

This works because React assumes rendering is well-behaved (a pure function of props and state that produces a valid tree).

When a component throws during render, that assumption is violated *mid-flight*: React was partway through building the new UI when something failed, so the work-in-progress tree is incomplete, and React can no longer guarantee that what it has is a consistent, correct UI.

Given that, React has two options for an *uncaught* error (one with no boundary to handle it):

1. **Leave the partially-rendered UI in place** (skip the broken component, keep whatever rendered). This is what React did *before* version 16, and it turned out to be dangerous. A half-updated UI can show *inconsistent* state: some parts reflect the new data and some the old, or a value is shown that should have been replaced but was not because the render that would have replaced it threw. The React team found that these corrupt-state situations led to subtle, hard-to-debug problems, and, more seriously, to UIs that displayed *wrong information* the user might act on. For an app showing money, medical data, recipients of a message, or any consequential value, displaying a stale or inconsistent value because a render half-failed is worse than displaying nothing, because the user cannot tell it is wrong.

2. **Unmount the whole tree** (tear down to a blank, known-safe state). This is what React 16 and later do for uncaught errors. A blank screen is bad, but it is *honestly* bad: the user can see something is broken and will not be misled into acting on wrong information. React prefers this known-safe failure over an unknown, possibly-misleading partial UI.

So the drastic default is a *safety* choice: when React cannot trust the UI's consistency and there is no boundary to define a safe fallback, it chooses the failure mode that cannot mislead (blank) over the one that can (a corrupt partial UI).

This is the same instinct as a program crashing on an assertion failure rather than continuing in an undefined state: a clean stop is safer than continuing corrupted.

Error boundaries are how you *override* this default for regions where you can define a *safe* fallback.

By placing a boundary, you are telling React: "if the subtree below this throws, you do not have to tear down the whole app. Instead, render *this* fallback, which I have designed to be a safe, consistent thing to show for this region." The boundary gives React a known-good UI to substitute for the failed subtree, so React can contain the failure there instead of escalating to a full teardown.

The fallback is consistent by construction (you wrote it to be a simple, safe "something went wrong" view), so showing it does not risk the corrupt-state problem that motivated the drastic default.

This is why boundaries are framed around graceful *degradation*: you are providing the safe degraded state that lets React avoid the nuclear option.

This reframing also tells you *where* boundaries matter most (Section 11): around regions where a contained, safe fallback is clearly better than either a corrupt partial UI or a full teardown.

A dashboard of independent widgets benefits enormously (one widget's failure should not blank the others, and a "this widget failed" fallback is a perfectly safe thing to show), while a tiny leaf with no meaningful fallback might reasonably let the error propagate to a higher boundary.

The default exists to keep you safe when you have not thought about a region's failure.

Boundaries are how you express that you have.

### Try it

> Build a UI with two independent sections, and make one throw during render with no boundary. Watch *both* sections disappear (the whole tree unmounts), even though the other section was fine. Then wrap only the throwing section in a boundary and watch the healthy section survive while the broken one shows a fallback. Seeing the healthy section get taken down in the unguarded case is feeling why the default is drastic and why boundaries are how you contain it.

### You've got this if

You can explain why React prefers a blank screen to a partially-rendered one on an uncaught error, in terms of not showing a UI it cannot trust to be consistent.

---

## 3. The API: getDerivedStateFromError and componentDidCatch

Prereqs: Section 1.

Outside React: class components and the idea of lifecycle methods (functions React calls at certain points), and the difference between rendering (producing UI, must be pure) and side effects (logging, network).

### The itch

An error boundary is defined by two methods with long names, and it is not obvious why there are two or which does what.

One returns state.

The other receives an `errorInfo`.

Getting the division right (one for the fallback, one for side effects) is what makes a boundary correct.

### The short version

An error boundary is a class component that implements one or both of two methods.

`static getDerivedStateFromError(error)` runs during rendering when a child has thrown, and returns the new state that makes the boundary render its fallback.

It must be pure (no side effects), because it runs in the render phase.

`componentDidCatch(error, errorInfo)` runs after the error is caught, in the commit phase, and is where you put *side effects* like logging the error to a service.

It receives an `errorInfo` object with a `componentStack` telling you where in the tree the error occurred.

Two methods, because rendering the fallback and performing side effects happen in two different phases with different rules.

### How it actually works

A boundary is a class component (Section 4 explains why it must be), and the two methods map onto the rendering guide's two phases: the *render* phase (React computes the UI, which must be pure and side-effect-free, because React may run it multiple times or discard it) and the *commit* phase (React applies changes and runs side effects).

Catching an error needs to do two different kinds of work, one in each phase, which is why there are two methods.

#### `static getDerivedStateFromError(error)`

is the *render-phase* half.

When a component below the boundary throws during render, React catches the error (Section 5) and then re-renders the boundary, calling this static method with the thrown error.

Its job is to return the state update that tells the boundary to render its fallback instead of its children:

```jsx
static getDerivedStateFromError(error) {
  return { hasError: true }; // merged into state; render() then shows the fallback
}
```

Because it runs in the *render* phase, it must be **pure**: it should only compute new state from the error and return it, with no side effects (no logging, no network calls, no DOM manipulation).

The reason is the same as for any render-phase code (rendering guide): React may call render-phase functions more than once or throw away the result, so a side effect here could run an unexpected number of times.

It is `static` because React needs to call it to derive the fallback state *without* relying on an instance method that itself might be compromised by the error.

So `getDerivedStateFromError` is narrowly "given the error, what state should I set to show a fallback," nothing more.

#### `componentDidCatch(error, errorInfo)`

is the *commit-phase* half.

It runs after the error is caught and the fallback is being committed, and it is where you put the *side effects* of handling an error, primarily logging or reporting:

```jsx
componentDidCatch(error, errorInfo) {
  logErrorToService(error, errorInfo.componentStack); // side effect: allowed here
}
```

Because it runs in the *commit* phase (not render), side effects are appropriate here, the same way they are in `componentDidMount` or an effect.

It receives two arguments: the `error` that was thrown, and an `errorInfo` object whose key field is `componentStack`, a string describing the component tree path where the error occurred (which component threw, and the chain of components above it).

The `componentStack` is distinct from the JavaScript error's own `stack` (the call stack): the call stack tells you the *function call path*, while the component stack tells you the *component tree path*, which is usually far more useful for locating a render error in a React app.

Reporting both to your error service is the norm.

The division of labor is the thing to internalize: `getDerivedStateFromError` decides *what to render* when there is an error (the fallback), purely.

`componentDidCatch` performs the *side effects* of an error (logging, reporting), in the commit phase.

A boundary can implement either or both.

In practice you almost always want both: `getDerivedStateFromError` so the user sees a fallback, and `componentDidCatch` so your team finds out the error happened.

You can technically do logging in `getDerivedStateFromError` in some React versions, but you should not, because it is render-phase and impure.

`componentDidCatch` is the correct home for the side effect.

Keeping "fallback = `getDerivedStateFromError` (pure, render phase), and logging = `componentDidCatch` (side effect, commit phase)" straight is what makes a boundary both correct and well-behaved.

A note that connects to later sections: the `error` these receive is whatever was thrown, and React 19's root options (Section 9) receive the same `error` and an `errorInfo` with the same `componentStack`, so the shape is consistent whether you handle an error at a boundary or at the root.

### Try it

> Build a boundary with both methods: have `getDerivedStateFromError` set `hasError`, and `componentDidCatch` `console.log` the `error` and `errorInfo.componentStack`. Throw from a child and observe the fallback render (from `getDerivedStateFromError`) and the logged component stack (from `componentDidCatch`), and notice the component stack points at the component that threw. Seeing the two methods do their two jobs is the API made concrete.

### You've got this if

You can explain why an error boundary has two methods, which phase each runs in, and why `getDerivedStateFromError` must be pure while `componentDidCatch` is where logging goes.

---

## 4. Why error boundaries are still class components

Prereqs: Section 3.

Outside React: that hooks only work in function components, and that class components have lifecycle methods.

### The itch

Everything else in modern React is function components and hooks, but error boundaries are the one thing you still have to write as a class.

There is no `useErrorBoundary` hook in React itself.

This feels like an oversight or an inconsistency, and you want to know whether it is, and what to do about it.

### The short version

As of React 19, error boundaries must still be class components: there is no built-in hook equivalent.

This is not an oversight so much as a genuine design gap that has not been resolved.

The error-catching behavior maps naturally onto class lifecycle methods (`getDerivedStateFromError`, `componentDidCatch`), and a clean hook-based equivalent has design challenges that the React team has not settled.

In practice, you either write the one small class, or use the `react-error-boundary` library, which wraps a class internally and gives you a function-component-friendly `<ErrorBoundary>` component plus a hook to trigger boundaries imperatively.

### How it actually works

It is worth being honest that this is the one place the "everything is a function component now" story breaks down, and it has been true for the entire React 16-to-19 era.

The reasons are partly historical and partly genuine design difficulty.

The error-catching mechanism predates hooks (it shipped in React 16, hooks in 16.8), and it was designed around class lifecycle methods because that was the model at the time.

The two methods (Section 3) fit the class lifecycle cleanly: `getDerivedStateFromError` is a static lifecycle method that participates in the render phase, and `componentDidCatch` is a commit-phase lifecycle method alongside `componentDidMount` and friends.

The catching behavior is fundamentally about *a component reacting to its children throwing during render*, which the class model expresses naturally as lifecycle hooks into React's render and commit of that subtree.

A function-component, hook-based equivalent has real design challenges that have kept it from shipping.

A hook like `useErrorBoundary()` would need to express "catch errors thrown while rendering my children and let me render a fallback instead," and the difficulty is that hooks run *inside* a component's own render, while catching a child's render error is about reacting to a *different* component's render failing and substituting alternative output.

The render-phase, must-be-pure nature of `getDerivedStateFromError` and the relationship between a parent's fallback and its children's failure do not map onto the hook model as cleanly as most behaviors do.

The React team has discussed hook-based error boundaries but has not settled on a design that fits the constraints, so the class API remains the only built-in one.

It is a known gap, not an accident, and not (as of React 19) resolved.

What this means in practice is straightforward: you write a small class component for your boundary, or you use a library.

The class is genuinely small (the one in Section 1 is essentially complete), and you typically write *one* reusable boundary and use it throughout, so the class is not a burden in proportion to how often you write it.

Many teams take the library route with **`react-error-boundary`** (a widely-used, maintained package), which provides:

- An `<ErrorBoundary>` component you use like any function component, configured with props (`FallbackComponent` or `fallbackRender` or `fallback` for the fallback UI, `onError` for logging, `onReset` and `resetKeys` for recovery, Section 8). Internally it is a class, so it uses the real mechanism. It just gives you a declarative, props-based interface.
- A `useErrorBoundary()` hook (in current versions, `useErrorBoundary` returning a `showBoundary` function) that lets a *function component* imperatively forward an error into the nearest boundary, which is the standard way to route event-handler and async errors (which boundaries do not catch natively, Section 6) into a boundary. This is the closest thing to a hook-based boundary experience, and it is built on top of the class mechanism.

So the resolution to "everything is hooks except this" is: the *catching* still requires a class (yours or the library's), but the *usage* can be fully function-component-friendly via the library.

You will likely never need to hand-write more than one boundary class in a codebase, and many teams write zero by using `react-error-boundary`.

Knowing it must be a class (and why) keeps you from searching for a built-in hook that does not exist, and knowing the library exists gives you the ergonomic path.

### Try it

> Write the minimal class boundary once, then install `react-error-boundary` and replace it with the library's `<ErrorBoundary FallbackComponent={Fallback} onError={log}>`. Notice you no longer write a class, but the behavior is identical, because the library wraps a class internally. Then peek at the library's source (or types) and confirm there is a class at the core. Seeing the class under the library's friendly surface is the point.

### You've got this if

You can explain why error boundaries must be classes as of React 19, and how `react-error-boundary` gives a function-component-friendly interface over the class mechanism.

---

## 5. The unwind-to-boundary mechanism

Prereqs: Sections 1 and 3.

From the rendering guide: the work loop (React processes fibers one unit at a time, building a work-in-progress tree) and that each fiber has a `return` pointer to its parent, recapped here.

Outside React: `throw` propagating up the call stack until a `try`/`catch` handles it.

### The itch

A component throws, and somehow the *right* boundary (the nearest one above the throwing component) catches it and shows its fallback.

How does React find that boundary, and what does it do with the half-built UI it was in the middle of rendering?

This is the core internals, and it is the same mechanism Suspense uses.

### The short version

When a component throws during render, React catches the error in its work loop and *unwinds*: it walks *up* the fiber tree from the throwing component, following each fiber's parent (`return`) pointer, looking for the nearest fiber that is an error boundary (one that can handle errors).

When it finds one, it discards the failed work in that subtree, schedules the boundary to re-render showing its fallback (via `getDerivedStateFromError`), and runs `componentDidCatch`.

If it reaches the root without finding a boundary, the error is uncaught and the whole tree unmounts (Section 2).

This unwinding is the same machinery Suspense uses for thrown promises (Section 10).

### How it actually works

This is the engine room, and it parallels how a thrown JavaScript exception propagates up the call stack until a `try`/`catch` handles it, except React does it over its *fiber tree* rather than the JS call stack.

Recall from the rendering guide that React renders via a *work loop*: it processes the tree one fiber at a time, building a *work-in-progress* tree, and each fiber has a `return` pointer to its parent (the fiber tree's "up").

When rendering a fiber means calling a component function (or a class's render), and that throws, here is what happens:

1. **React catches the throw in the work loop.** The work loop that calls your component is wrapped so that a thrown value does not escape to the browser. React catches it and routes it into its error-handling path (`throwException` in the source, Section 14). At this moment React knows *which fiber* was being rendered when the throw happened (the throwing component's fiber) and *what* was thrown (the error).

2. **React unwinds up the fiber tree looking for a boundary.** Starting from the throwing fiber, React walks *upward* via `return` pointers (the fiber's parent, then its parent, and so on), examining each fiber to see whether it is a *handler* for this kind of thrown value. For a thrown `Error`, the handler it is looking for is an *error boundary*: a class component fiber whose component defines `getDerivedStateFromError` or `componentDidCatch`. This upward walk is the "unwind," and it is the direct analog of an exception bubbling up the call stack until it hits a `try`/`catch`. As it unwinds, React discards the partially-built work in the failed subtree (the incomplete work-in-progress that cannot be trusted, Section 2).

3. **At the nearest boundary, React schedules the fallback.** When the unwind reaches a fiber that *is* an error boundary, React stops there and marks that boundary fiber to handle the error: it schedules an update on the boundary (carrying the error) so that the boundary re-renders, calling `getDerivedStateFromError(error)` to derive the fallback state (Section 3), and arranges to call `componentDidCatch(error, errorInfo)` in the commit phase for side effects. The boundary then renders its fallback *instead of* its children, so the failed subtree is replaced by the fallback UI. The blast radius is exactly the subtree under that boundary. Everything outside it is untouched.

4. **If no boundary is found, the error is uncaught.** If the unwind reaches the *root* without finding any error boundary, there is nothing to handle the error, so React falls back to the drastic default from Section 2: it unmounts the entire tree (and, in React 19, reports the error to `window.reportError` and to `onUncaughtError` if provided, Section 9). This is why an unguarded throw blanks the whole app: the unwind walked all the way to the root and found no boundary, so the whole tree comes down.

A few details that sharpen the model.

The boundary that catches is the *nearest* one *above* the throwing component, because the unwind walks up and stops at the first handler it finds.

A boundary that is a *sibling* or *below* the throwing component does not catch it (it is not on the upward path).

This is exactly like `try`/`catch`: the nearest enclosing `catch` handles the throw, not one elsewhere in the program.

It is also why a boundary cannot catch an error in *its own* render (Section 6): if the boundary itself throws, the unwind starts *above* the boundary and looks for the *next* boundary up, because the throwing fiber (the boundary) cannot be its own handler.

And it is why React can guarantee containment: the unwind discards the failed subtree's work and substitutes the boundary's fallback, so React never commits the half-built broken UI.

It commits a tree where the failed region is replaced by a known-good fallback.

The reason this section is labeled the core internals is that the *same* unwinding machinery handles Suspense (Section 10).

In the work loop's catch (`throwException`), React inspects *what* was thrown: if it is an `Error`, it unwinds to the nearest *error boundary* and shows a fallback permanently (until reset).

If it is a *promise* (a thenable, what a suspending component throws), it unwinds to the nearest *Suspense boundary* and shows that boundary's fallback *temporarily*, attaching a callback to retry when the promise resolves (retry lanes, from the Scheduler and Lanes guide).

Same unwind, same "find the nearest boundary up the fiber tree," but the *kind* of thrown value selects the *kind* of boundary, and the *follow-up* differs (an error stays caught, a promise retries).

Understanding the unwind here is understanding the backbone of both, which is exactly why error boundaries and Suspense are introduced together and why the Suspense guide can build directly on this one.

### Try it

> Nest components: an outer `ErrorBoundary`, then a middle component, then an inner component that throws during render. Add `console.log`s and confirm the *outer* boundary catches it (the unwind walked up through the middle component to the nearest boundary). Then add a *second* boundary between the middle and inner components and confirm the *inner* (nearest) boundary now catches it instead. Watching which boundary catches as you change their placement is watching the unwind find the nearest handler.

### You've got this if

You can describe how React finds the boundary that handles a thrown error (unwind up the fiber tree to the nearest error boundary) and what it does with the failed subtree, and why this is the same mechanism Suspense uses.

---

## 6. What error boundaries catch, and what they do not

Prereqs: Sections 1 and 5.

Outside React: that event handlers and async callbacks (`setTimeout`, promises) run at a different time than rendering.

### The itch

You wrapped a component in a boundary, but an error thrown in its `onClick` handler still blew up unhandled, and the boundary did nothing.

The list of what boundaries do and do not catch looks arbitrary until you connect it to the unwind mechanism: boundaries catch errors thrown *during rendering*, and nothing else.

### The short version

Error boundaries catch errors thrown *during rendering*, in *lifecycle methods*, and in *constructors* of the components below them.

They do **not** catch errors thrown in: event handlers, asynchronous code (`setTimeout`, promises, code after `await`), server-side rendering, or the error boundary's own render (those propagate to the next boundary up).

The reason is the unwind mechanism (Section 5): a boundary catches a throw only when React is *rendering* the subtree and can unwind to the boundary.

Event handlers and async callbacks run *outside* the render, when React is not building the UI, so a throw there does not unwind into a boundary and React has no render to recover.

### How it actually works

The catch-and-don't-catch list is not a set of arbitrary rules.

It falls directly out of Section 5's mechanism.

A boundary catches an error *only when React is rendering the subtree below it and can unwind the failed render up to the boundary*.

So the question for any error is: was React in the middle of *rendering* (the render phase, or the commit-phase lifecycle that React drives) when this threw?

If yes, the unwind can reach a boundary and it is caught.

If no (the throw happened in code React is not driving as part of rendering), there is no render to unwind and nothing for a boundary to catch.

**What boundaries catch**, because these happen during React's rendering of the subtree:

- **Errors during rendering**: a component function (or class `render`) throws while React is computing the UI. This is the central case. React is mid-render, catches the throw, and unwinds to the boundary (Section 5).
- **Errors in lifecycle methods**: a class child's lifecycle method (like `componentDidMount`, `componentDidUpdate`) throws. These run as part of React's commit phase, which React drives, so React catches them and routes to the boundary.
- **Errors in constructors** of class components below the boundary, since constructing a component is part of rendering it.

**What boundaries do not catch**, because these happen *outside* React's rendering of the subtree:

- **Event handlers.** An `onClick` (or any event handler) runs in response to a user event, *after* the UI has already rendered and committed (the Event System guide: the handler runs during event dispatch, not during a render). When your handler throws, React is *not* rendering anything, so there is no render to unwind and no boundary to catch it. The error propagates as a normal JavaScript exception. This is the most common surprise, and the reason is mechanical: boundaries catch render errors, and an event handler is not a render. (Section 7 covers how to handle these.)
- **Asynchronous code**: `setTimeout` callbacks, promise `.then` handlers, code after an `await`, and similar. These run later, on their own, when React is not rendering. A throw in a `setTimeout` callback is just an async exception. React is not involved in running it, so no unwind, no boundary catch.
- **Server-side rendering errors**: error boundaries behave differently during SSR (Section 12). The client-side catch-and-show-fallback mechanism is a client rendering concern.
- **Errors in the error boundary's own render** (or its `getDerivedStateFromError`): as Section 5 noted, a boundary cannot catch its own error, because the unwind starts *above* the throwing fiber, so a boundary's own throw unwinds to the *next* boundary up. This is why you sometimes want a higher-level boundary above your boundaries.

The unifying principle, worth stating plainly: **error boundaries are a render-time mechanism.** They catch the errors that occur while React is constructing your UI, because those are the errors that threaten the consistency of the UI React is building (Section 2) and that the unwind can route to a boundary.

Errors *outside* rendering (handlers, async) are ordinary JavaScript errors that happen when React is not building UI, so they are not React's to catch via the render-unwind mechanism, and you handle them with ordinary JavaScript tools (`try`/`catch`) or by forwarding them into a boundary explicitly (Section 7).

Once you hold "boundaries catch render errors, full stop," the entire list is predictable: rendering, lifecycles, and constructors are rendering (caught).

Handlers, async, and the boundary's own render are not the subtree's render React can unwind (not caught).

This also explains a subtle point about *why* React does not catch event-handler errors even though it could conceivably try: there is no UI-consistency reason to.

When a render throws, the UI is mid-construction and possibly inconsistent, so React must recover it (show a fallback) to avoid the corrupt-state problem (Section 2).

When an event handler throws, the UI was already fully rendered and consistent *before* the handler ran.

The handler's failure does not leave the *rendered UI* in a corrupt state (it may leave your *application* state wherever the handler got to, but that is your concern, not a render-consistency one).

So there is no rendered UI for React to recover, which is both why boundaries do not catch handler errors and why it is fine that they do not: the mechanism exists to protect render consistency, and a handler error is not a render-consistency problem.

### Try it

> Wrap a component in a boundary and have it throw two ways: once during render (the boundary catches it, fallback shows) and once inside an `onClick` handler (the boundary does *nothing*, the error goes to the console unhandled). Seeing the same boundary catch the render throw but ignore the handler throw is the clearest demonstration that boundaries are a render-time mechanism.

### You've got this if

You can explain why an error boundary catches a render error but not an `onClick` error, in terms of whether React is rendering the subtree when the throw happens.

---

## 7. Handling event-handler and async errors

Prereqs: Section 6.

Outside React: `try`/`catch` in JavaScript, including around `await`.

### The itch

Since boundaries do not catch event-handler or async errors (Section 6), those errors need a different strategy, or they crash unhandled.

You want the patterns: how to handle them locally, and how to *route* them into a boundary when you want the boundary's fallback UI for them.

### The short version

Because boundaries are render-time only, you handle event-handler and async errors with ordinary tools.

Wrap risky handler or async code in `try`/`catch` and handle the error locally (show a message, set error state, retry).

If you want such an error to trigger a *boundary's* fallback (so it is handled consistently with render errors), catch it and *forward* it into the boundary: set state that causes a re-render which then throws during render (so the boundary catches the now-render-time error), or, more cleanly, use `react-error-boundary`'s `useErrorBoundary().showBoundary(error)` to imperatively trigger the nearest boundary.

Choose local handling for recoverable, contained errors and boundary-forwarding for errors that should show the same fallback as a render crash.

### How it actually works

Section 6 established that boundaries catch render errors only, so event-handler and async errors are ordinary JavaScript exceptions that you must handle yourself.

There are two strategies, and the choice depends on how you want the error to surface.

#### Strategy one: handle it locally with `try`/`catch`

For an error that you can handle meaningfully right where it happens (a failed save, a validation error, a fetch that failed), wrap the risky code in `try`/`catch` and respond locally:

```jsx
async function handleSave() {
  try {
    await saveToServer(data);
  } catch (err) {
    setSaveError(err.message); // local error state: show an inline message, enable retry
  }
}
```

This keeps the error *contained* to the interaction and lets you show a precise, recoverable response (an inline "save failed, retry?" rather than tearing down a region).

For most event-handler and async errors, this is the right approach, because they are usually *recoverable, localized* failures (a network blip, a validation problem) where a full fallback UI would be heavier than warranted.

The error never needs to reach a boundary.

You handle it as part of the interaction.

#### Strategy two: forward it into a boundary

Sometimes an event-handler or async error is *not* locally recoverable and should produce the same "something went wrong" fallback as a render crash (a fatal failure loading critical data triggered by a button, say).

In that case you want the error to reach a boundary, but boundaries do not catch it directly, so you *forward* it.

There are two ways:

- **Set state that throws on the next render.** Catch the error in the handler and store it in state, then throw it during render so the boundary (a render-time mechanism) catches it:

  ```jsx
  const [error, setError] = useState(null);
  if (error) throw error; // re-render now throws during render → nearest boundary catches it
  async function handleClick() {
    try { await risky(); } catch (e) { setError(e); } // triggers a re-render that throws
  }
  ```

This works because setting the error state causes a re-render, and `if (error) throw error` makes that *render* throw, which is now a render-time error the boundary's unwind (Section 5) can catch.

You have converted an async error into a render error so the boundary can handle it.

- **Use `react-error-boundary`'s `showBoundary`.** The cleaner version of the same idea: the library provides `const { showBoundary } = useErrorBoundary()`, and calling `showBoundary(error)` from a handler or async callback imperatively triggers the nearest `react-error-boundary` boundary to show its fallback for that error. Internally it does the set-state-and-throw dance for you, so you get a clean imperative API:

  ```jsx
  const { showBoundary } = useErrorBoundary();
  async function handleClick() {
    try { await risky(); } catch (e) { showBoundary(e); } // nearest boundary shows its fallback
  }
  ```

  This is the idiomatic way to route handler and async errors into the boundary system, and it is one of the main reasons teams use `react-error-boundary` (Section 4): it bridges the gap between non-render errors and the render-time boundary mechanism.

The decision between the two strategies is about the *nature* of the error.

A localized, recoverable failure (this one save failed, this one field is invalid) wants local `try`/`catch` handling, because a full fallback UI would over-respond and lose the user's context.

A fatal, not-locally-recoverable failure (the data this whole section needs failed to load) wants to be forwarded into a boundary, so the user sees the same consistent "this section is broken" fallback they would get from a render crash, and your centralized error reporting (Section 9) sees it the same way.

The unifying point is that *you* decide where these errors go, because React's automatic boundary mechanism only handles render errors.

For everything else, you either handle it locally or explicitly hand it to a boundary.

### Try it

> Build a button whose handler `await`s a function that rejects. First handle it with local `try`/`catch` and show an inline error message. Then switch to forwarding it: either `setError` and `if (error) throw error`, or `react-error-boundary`'s `showBoundary(e)`, and watch the surrounding boundary's fallback appear for an error that the boundary would never have caught on its own. Doing both shows you the two strategies and when each fits.

### You've got this if

You can explain the two ways to handle event-handler and async errors (local `try`/`catch`, or forwarding into a boundary), and why forwarding requires turning the error into a render-time throw.

---

## 8. Resetting and recovering from an error

Prereqs: Sections 3 and 5.

From the rendering guide: that changing a component's key remounts it, recapped here.

Outside React: nothing new.

### The itch

Once a boundary shows its fallback, it stays there: the subtree is stuck on the error view even after the underlying problem (a transient network failure, a since-fixed input) is gone.

You want a "try again" that actually works, without reloading the page, and without instantly hitting the same error again.

### The short version

A boundary that has caught an error keeps showing its fallback until you *reset* it (clear its error state so it re-renders its children).

You reset by clearing the boundary's `hasError` state (often via a "try again" button in the fallback), by changing `resetKeys` (so the boundary resets when some value changes, like the route or an input), or by remounting the boundary via a changed `key`.

The danger is resetting back into the *same* error (an infinite error-reset loop), so a reset should be paired with a *change* that makes the next render likely to succeed (new inputs, resolved data), not a blind retry of the identical conditions.

### How it actually works

Once `getDerivedStateFromError` has set the boundary's error state (Section 3), the boundary's `render` returns the fallback instead of its children, and it will keep doing so on every subsequent render *until that error state is cleared*.

So recovery is fundamentally about *clearing the boundary's error state* so that `render` returns the children again, giving the subtree another chance to render successfully.

There are three common ways to do that, in increasing automation:

#### Manual reset (a "try again" button)

The fallback UI includes a control that clears the boundary's error state:

```jsx
class ErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  reset = () => this.setState({ hasError: false }); // clear the error → re-render children
  render() {
    if (this.state.hasError) return <Fallback onRetry={this.reset} />;
    return this.props.children;
  }
}
```

Clicking "try again" calls `reset`, which sets `hasError: false`, so the next render returns the children, which React attempts to render again.

If the underlying problem is gone (a transient failure that has resolved), the children render successfully and the user is recovered without a page reload.

(`react-error-boundary` provides this as a `resetErrorBoundary` function passed to your fallback.)

#### `resetKeys` (automatic reset on a value change)

Often you want the boundary to reset automatically when some relevant value changes, for example when the user navigates to a different route, or changes the input that caused the error.

`react-error-boundary` supports a `resetKeys` array: when any value in it changes between renders, the boundary resets itself.

This expresses "if the situation changed, give the children another try":

```jsx
<ErrorBoundary FallbackComponent={Fallback} resetKeys={[userId]}>
  <UserProfile userId={userId} /> {/* boundary auto-resets when userId changes */}
</ErrorBoundary>
```

If `UserProfile` errors for one `userId` but the user then navigates to a different `userId`, the changed `resetKeys` resets the boundary so it tries rendering the new (likely-fine) profile, rather than staying stuck on the previous error.

#### Remount via `key` (the nuclear reset)

Changing a component's `key` makes React treat it as a different element and *remount* it (rendering guide: a new key unmounts the old instance and mounts a fresh one, resetting all its state).

Changing the *boundary's* key, or the key of the subtree, forces a full remount that clears the error state along with everything else.

This is heavier (it resets all state in the subtree, not just the error) but is sometimes the cleanest way to guarantee a fresh start.

The crucial danger across all three is the **error-reset loop**: if you reset the boundary back into the *exact same conditions* that caused the error, the children will throw again immediately, the boundary will catch it again, you (or `resetKeys`) will reset again, and the UI flickers between fallback and error forever (or hammers your error-reporting service).

So a reset must be paired with a *change* that makes success plausible:

- A "try again" button is appropriate for *transient* errors (a network blip), where retrying the identical operation might now succeed because the external condition changed. It is *not* appropriate for a deterministic render bug (a null-reference that will happen every time), because retrying identical conditions just re-throws.
- `resetKeys` is the principled version: it resets *when something relevant changed* (a new `userId`, a new route), so the next render has different inputs and a real chance of succeeding, rather than retrying the same failed inputs.
- For a deterministic error that will always recur given the same inputs, the real fix is not resetting but *fixing the cause* or *changing the inputs*. Resetting alone just loops.

So the recovery model is: the boundary stays on its fallback until reset.

Reset by clearing error state (manually, via `resetKeys`, or via remount), and always pair a reset with a change in conditions, because resetting into the identical failure is the loop you must avoid.

Designing recovery is really designing *what change* makes a retry worthwhile, and tying the reset to that change.

### Try it

> Build a boundary whose child throws based on a prop. Add a "try again" button that resets and confirm that if the prop is unchanged, the child immediately re-throws (the loop). Then make the child throw only for a *transient* condition (fails the first time, succeeds after), reset, and watch it recover. Finally use `resetKeys={[someInput]}` and watch the boundary auto-recover when the input changes. Feeling the loop and then the principled recovery is the lesson.

### You've got this if

You can explain how to recover a boundary from its fallback (clear its error state) and why a reset must be paired with a change in conditions to avoid an error-reset loop.

---

## 9. The React 19 root error options

Prereqs: Sections 1 and 3.

From the rendering guide: `createRoot`/`hydrateRoot` create the root that renders your app, recapped here.

Outside React: a centralized error-reporting service (like Sentry).

### The itch

Error boundaries handle errors *within the tree*, but you also want *centralized* error reporting: every error, caught or not, logged to your monitoring service in one place, without putting `componentDidCatch` in every boundary.

React 19 added exactly this at the root level, and it also changed how React logs errors by default.

### The short version

React 19 added three options to `createRoot` and `hydrateRoot` for centralized, root-level error handling: `onCaughtError` (called when an error *is* caught by an error boundary), `onUncaughtError` (called when an error is *not* caught by any boundary), and `onRecoverableError` (called when React automatically recovers from an error, such as a hydration mismatch or a Suspense fallback to client rendering).

Each receives the `error` and an `errorInfo` with a `componentStack`.

These complement boundaries (they do not replace them): boundaries decide the *UI* response per subtree, while the root options give you one place for *reporting*.

React 19 also changed default logging: uncaught errors now go to `window.reportError` and caught errors to `console.error`, rather than being re-thrown.

### How it actually works

Recall that your app is rendered into a *root* created with `createRoot(domNode)` (or `hydrateRoot` for server-rendered HTML, the rendering guide).

React 19 added an options object to these with three error callbacks, giving you a single, centralized hook into React's error handling at the top of the app:

```jsx
const root = createRoot(domNode, {
  onCaughtError: (error, errorInfo) => {
    // An error boundary caught this error. Report it (the UI is handled by the boundary).
    reportToService({ kind: 'caught', error, componentStack: errorInfo.componentStack });
  },
  onUncaughtError: (error, errorInfo) => {
    // No boundary caught this. The app will unmount. Report it as a serious failure.
    reportToService({ kind: 'uncaught', error, componentStack: errorInfo.componentStack });
  },
  onRecoverableError: (error, errorInfo) => {
    // React recovered automatically (e.g. hydration mismatch). Report for visibility.
    reportToService({ kind: 'recoverable', error, componentStack: errorInfo.componentStack });
  },
});
```

Each callback fires for a different category of error, which maps onto the unwind outcomes from Section 5:

- **`onCaughtError`** fires when the unwind (Section 5) *found* an error boundary and the error was caught. The boundary handles the *UI* (shows its fallback). `onCaughtError` is your chance to *report* the error centrally, so you do not need a `componentDidCatch` logging call in every boundary. It receives the `error` and `errorInfo.componentStack`.
- **`onUncaughtError`** fires when the unwind reached the root *without* finding a boundary, so the error is uncaught and the whole tree unmounts (Section 2). This is your hook for the most serious failures (the ones that blank the app), useful for alerting, since an uncaught error means a user saw a broken app.
- **`onRecoverableError`** fires when React hit an error but *recovered automatically*, without your involvement. The main cases are hydration mismatches (the server-rendered HTML did not match the client render, so React discarded the server HTML and re-rendered on the client, Section 12) and certain Suspense situations (a server-streamed boundary that had to fall back to client rendering). These are not crashes (the app keeps working), but they indicate something worth knowing about (a hydration bug, a streaming fallback), so React surfaces them. Some recoverable errors include the original cause as `error.cause`.

The relationship to boundaries is *complementary, not redundant*.

Error boundaries decide the *UI* response for a subtree (what fallback to show, where to contain a failure).

The root options give you *centralized reporting* across the whole app.

You still want boundaries for the UI (the root options do not show fallbacks, and they are callbacks), and you use the root options so that reporting lives in one place rather than scattered across every boundary's `componentDidCatch`.

A common setup is exactly this: boundaries throughout the tree for graceful UI degradation, plus root `onCaughtError`/`onUncaughtError`/`onRecoverableError` wired to your monitoring service (Sentry and similar tools provide helpers for these) for centralized reporting.

Monitoring libraries integrate directly with these options, which is one of the main reasons they were added.

React 19 also changed the *default* logging behavior, which is worth knowing because it affects what you see in the console and in global error handlers:

- **Uncaught errors** (no boundary) are now reported to **`window.reportError`** (the standard browser API for reporting errors), rather than being *re-thrown* as they were before. This means a global `window.onerror`/`reportError` handler sees them, but React does not throw them up the stack a second time. (If you provide `onUncaughtError`, it overrides this default.)
- **Caught errors** (handled by a boundary) are reported to **`console.error`** by default. (If you provide `onCaughtError`, it overrides this default.)

A practical caution that follows: because providing these options *overrides* React's defaults, if you set `onCaughtError`/`onUncaughtError` you take over the logging and should make sure you still surface errors in development (the default dev-mode logging, with the helpful component name and stack, is what you replace).

Monitoring-library helpers are designed to preserve the useful default logging while adding reporting, which is why using their wrappers is often better than a bare custom callback.

So the React 19 additions give you what boundaries alone could not: a single, top-level place to *observe* every error by category (caught, uncaught, recovered), cleanly separated from the per-subtree *UI* decisions that boundaries make.

Boundaries are still how you decide what the user sees.

The root options are how you decide what your team finds out.

### Try it

> Create your root with all three callbacks logging the category and `errorInfo.componentStack`. Trigger a caught error (throw inside a boundary) and see `onCaughtError` fire. Trigger an uncaught error (throw with no boundary) and see `onUncaughtError` fire and the app unmount. If you have SSR, cause a hydration mismatch and watch `onRecoverableError` fire while the app keeps working. Seeing the three categories fire for the three situations connects them to the unwind outcomes from Section 5.

### You've got this if

You can explain what each of `onCaughtError`, `onUncaughtError`, and `onRecoverableError` reports, and why the root options complement rather than replace error boundaries.

---

## 10. The shared machinery: error boundaries and Suspense

Prereqs: Section 5 (the unwind), plus the rendering guide on Suspense (a boundary that shows a fallback while a child is not ready) and the Scheduler and Lanes guide on retry lanes, both recapped here.

### The itch

Error boundaries and Suspense look like different features (one for errors, one for loading), but they behave suspiciously alike: both involve a boundary, a thrown value, and a fallback.

They are, in fact, the *same* mechanism.

Seeing that connection is the payoff of the unwind section and the bridge to the dedicated Suspense guide.

### The short version

Error boundaries and Suspense are built on one mechanism: a component *throws*, and React *unwinds* up the fiber tree to the nearest boundary that can handle what was thrown (Section 5).

The only differences are *what* is thrown and *how React responds*.

Throw an `Error`, and React unwinds to the nearest *error boundary* and shows its fallback *permanently* (until reset).

Throw a *promise* (what a suspending component does), and React unwinds to the nearest *Suspense boundary* and shows its fallback *temporarily*, retrying when the promise resolves (via retry lanes).

Same unwind, different thrown value, different follow-up.

This is why they are introduced together, and the dedicated Suspense guide builds on this shared backbone.

### How it actually works

Recall Section 5's mechanism: when React is rendering and a fiber throws, React catches the throw in its work loop (`throwException`), unwinds *up* the fiber tree looking for the nearest fiber that can *handle* the thrown value, and at that boundary discards the failed work and renders the boundary's fallback.

The key realization is that this mechanism is *generic over what is thrown*: `throwException` inspects the thrown value and routes it to the appropriate *kind* of boundary.

There are two kinds of thrown value React knows how to handle, and they give you the two features.

#### Throw an `Error`: error boundaries (this guide)

When the thrown value is an `Error` (or any non-promise), React unwinds to the nearest *error boundary* (a class with `getDerivedStateFromError`/`componentDidCatch`, Section 3), shows its fallback, and stops there.

The error is considered *handled but final*: the boundary shows its fallback and stays on it until you reset (Section 8).

There is no automatic retry, because an error is not something React can expect to resolve on its own (the conditions that caused it are not going to change without intervention).

This is everything in Sections 1 through 9.

#### Throw a promise: Suspense

When a component is *not ready to render* because it is waiting on something asynchronous (data, lazy-loaded code), it *suspends* by throwing a *promise* (a thenable) representing the thing it is waiting for.

The `use()` hook and `React.lazy` and Suspense-integrated data libraries all do this under the hood: not-ready means throw a promise.

React's *same* `throwException` catches it, sees that the thrown value is a *promise* (not an `Error`), and unwinds to the nearest *Suspense boundary* (a `<Suspense>` component) instead of an error boundary.

It shows the Suspense boundary's `fallback` (a loading UI).

But here the follow-up differs crucially: because a promise *will* resolve, React attaches a callback to the thrown promise so that *when it resolves*, React schedules a *retry* (on a retry lane, from the Scheduler and Lanes guide) to re-render the suspended subtree, which now has its data/code and can render successfully, replacing the fallback with the real content.

So a Suspense fallback is *temporary*: shown while pending, removed when the promise resolves and the retry succeeds.

Side by side, the shared backbone and the differences are exact:

- **Shared:** a component throws. React's work-loop catch (`throwException`) catches it. React unwinds up the fiber tree to the nearest boundary that handles the thrown value's kind. It discards the failed/incomplete work and shows the boundary's fallback. This is one mechanism (Section 5), used for both.
- **Different thrown value:** an `Error` (something went wrong) versus a *promise* (not ready yet).
- **Different boundary kind:** the unwind looks for an *error boundary* for an `Error`, a *Suspense boundary* for a promise. (A component can be wrapped in both, each catches its own kind.)
- **Different follow-up:** an error boundary's fallback is *permanent until reset* (no retry, because an error will not fix itself). A Suspense boundary's fallback is *temporary*, with an automatic *retry* when the promise resolves (because a promise will resolve). The retry lane is the Scheduler and Lanes guide's mechanism for scheduling that re-render.

This is why error boundaries and Suspense are natural companions and are often discussed together: they are the *same* throw-and-unwind machinery, distinguished only by what you throw and how React follows up.

It is also why a common pattern pairs them: wrap an async subtree in *both* a `<Suspense>` (to handle the not-ready case with a loading fallback) and an error boundary (to handle the failed case with an error fallback), so that "loading" and "errored" are two boundaries catching two kinds of thrown value from the same subtree.

The data-fetching guide's `useSuspenseQuery` example does exactly this: a `<Suspense>` for the pending promise and an error boundary for a failed fetch.

This section is deliberately the bridge to the dedicated Suspense guide.

That guide goes deep on the promise side of this mechanism: what suspending actually means, how `use()` and `React.lazy` throw promises, fallback placement and nesting, how transitions interact with Suspense (avoiding unwanted fallbacks), reveal order, and the SSR streaming story.

All of that builds on the backbone established here: Suspense is the throw-and-unwind mechanism applied to *promises*, with a *retry* follow-up, just as error boundaries are that mechanism applied to *errors*, with a *fallback-until-reset* follow-up.

Understanding the shared unwind is understanding the foundation both features stand on.

### Try it

> Wrap a component in both a `<Suspense fallback={<Loading />}>` and an error boundary. Make the component sometimes suspend (throw a promise via a Suspense-integrated data source or a lazy import) and sometimes throw an `Error`. Watch the *Suspense* boundary catch the suspension (show `Loading`, then reveal content when it resolves) and the *error* boundary catch the thrown error (show the error fallback, permanently). Seeing the two boundaries catch the two thrown values from the same subtree is the shared mechanism made visible.

### You've got this if

You can explain how error boundaries and Suspense are the same unwind mechanism, distinguished by what is thrown (an `Error` versus a promise) and how React follows up (permanent fallback versus retry on resolution).

---

## 11. Resilience: where to put boundaries

Prereqs: Sections 1, 2, and 8.

Outside React: the idea of containing a failure's blast radius.

### The itch

You know *how* boundaries work.

Now the architectural question is *where* to put them.

Too few and one failure takes down too much.

Too many and you have noise and fallbacks everywhere.

You want a principled way to decide boundary placement for a resilient app.

### The short version

Boundary placement is about *blast radius*: each boundary contains failures in its subtree, so you place boundaries to make a failure take down the smallest sensible region.

The standard architecture is layered: a top-level boundary as a catch-all (so the app never white-screens), boundaries around independent *sections* or *routes* (so one broken section does not take down the others), and boundaries around specifically *risky* components (third-party widgets, data-driven views) where failure is more likely.

The principle is "isolate the parts that can fail independently," and the trade-off is granularity: enough boundaries to contain failures to meaningful regions, not so many that the UI fragments into disconnected fallbacks.

### How it actually works

Section 1 framed a boundary as defining a *blast radius*, and resilience architecture is the practice of placing boundaries so that blast radii match the *independent regions* of your UI.

The guiding question for any region is: "if this fails, what is the smallest sensible thing to take down, and what should keep working?" A good boundary layout answers that for every part of the app.

The standard layers, from outermost in:

#### A top-level catch-all boundary

At or near the root, wrap the whole app in a boundary so that *any* uncaught error produces a graceful "something went wrong" page rather than a blank white screen (Section 2).

This is the safety net: it guarantees the worst case is a designed error page, not a blank screen, and it catches anything the inner boundaries missed (including errors in regions you did not individually wrap).

Pair it with the React 19 `onUncaughtError` root option (Section 9) for reporting.

Every app should have this.

#### Section- or route-level boundaries

Wrap each independent *section* of the UI (each route, each major panel, each dashboard widget) in its own boundary, so a failure in one section is contained to that section and the others keep working.

This is the highest-value layer for most apps, because it turns "one broken feature blanks the page" into "one feature shows a fallback while the rest of the page is fine." A dashboard of independent widgets is the canonical case: each widget in its own boundary means a widget that fails (bad data, a rendering bug) shows a small "this widget is unavailable" fallback while every other widget keeps working.

Routes are another natural seam: a boundary per route means a bug on one page does not take down the shell or other navigable areas.

#### Boundaries around specifically risky components

Some components fail more often than others: third-party components you do not control, components that render based on external or user-provided data (which can be malformed), experimental features, anything that has historically been a source of crashes.

Wrapping these in their own boundary contains their (more likely) failures tightly and lets you show a targeted fallback.

This is targeted defense for the parts you trust least.

The *trade-off* is granularity, and it cuts both ways.

Too *few* boundaries means failures take down too much (the dashboard with no per-widget boundaries blanks entirely when one widget fails).

Too *many* boundaries means the UI can *fragment*: if every tiny leaf has its own boundary, a single underlying problem produces a page full of disconnected "something went wrong" fragments, which is confusing and often worse UX than a single clear error state for the whole affected region.

The right granularity is "independent regions a user would understand as separable": a widget, a panel, a route, a feature, things that can sensibly fail on their own and show their own fallback.

Below that level (individual list items, small leaves), a boundary usually belongs at the *containing* region, not the leaf, so a failure shows one coherent fallback for the region rather than many tiny ones.

A few resilience principles that tie it together:

- **Contain to the smallest sensible region.** Place boundaries at the seams of independent UI regions so a failure takes down only that region.
- **Always have a top-level net.** A root boundary guarantees no white screen, regardless of what the inner boundaries miss.
- **Degrade gracefully.** A good fallback for a region is a *safe, consistent* thing to show (Section 2): a clear "this part is unavailable, [retry]" rather than a blank or a confusing partial UI. Pair fallbacks with recovery (Section 8) where retrying makes sense.
- **Report centrally.** Use the React 19 root options (Section 9) so every error, in any region, is reported in one place, independent of the per-region UI handling.
- **Match boundaries to data dependencies.** Regions that depend on separate data sources (separate fetches) are natural boundary units, because they fail independently. This is also where Suspense boundaries (Section 10) often sit, so error and loading boundaries frequently align with the same regions.

So resilience is an *architecture* decision, not a per-component one: you lay out boundaries to match the independent failure regions of your UI, with a top-level net, section/route boundaries as the main layer, and tight boundaries around the riskiest parts, choosing a granularity that contains failures to meaningful regions without fragmenting the UI into a mosaic of fallbacks.

### Try it

> Take a real screen with several independent regions (a dashboard, a page with a sidebar and main content and widgets). Add a top-level boundary, then a boundary around each independent region. Make one region throw and confirm only that region shows a fallback while the others keep working, then remove the per-region boundaries and watch the whole screen go to the top-level fallback instead. Feeling the difference in blast radius is the architecture lesson.

### You've got this if

You can describe a layered boundary architecture (top-level net, section/route boundaries, risky-component boundaries) and explain the granularity trade-off in terms of blast radius versus UI fragmentation.

---

## 12. Error boundaries, SSR, and recoverable errors

Prereqs: Sections 9 and 10.

From the rendering guide and RSC guide: that React can render on the server and then hydrate on the client, recapped lightly here.

Outside React: the idea of server-rendered HTML.

### The itch

Error boundaries behave differently when your app is server-rendered, and you have seen "hydration mismatch" warnings (the `onRecoverableError` category from Section 9) that are not crashes but are clearly *something*.

This area is framework-adjacent, so it deserves a clear but bounded treatment with pointers to where the full story lives.

### The short version

When React renders on the server and *hydrates* on the client (attaches to the server-rendered HTML), error handling has extra cases.

A hydration *mismatch* (the client render does not match the server HTML) is a *recoverable* error: React discards the mismatched server HTML for that part and re-renders it on the client, reporting via `onRecoverableError` (Section 9), and the app keeps working.

Error boundaries still catch render errors during hydration, and Suspense boundaries participate in streaming SSR.

The deep mechanics of hydration, streaming, and selective hydration belong to the dedicated Hydration and SSR Internals guide.

This section gives you the error-handling-relevant picture and points there.

### How it actually works

This section is deliberately bounded: SSR and hydration are framework-coupled and get their own guide, so here we cover only the parts that intersect *error handling*, and point to the Hydration guide for the rest.

Recall (lightly, from the rendering and RSC guides) that with server-side rendering, React renders your app to HTML on the *server*, sends that HTML so the user sees content quickly, and then on the *client* React *hydrates*: it renders your components again and attaches to the existing server HTML, wiring up interactivity rather than recreating the DOM.

Hydration assumes the client's render *matches* the server's HTML, because React is attaching to that HTML, not rebuilding it.

Error handling enters in a few ways:

#### Hydration mismatches are recoverable errors

If the client render does *not* match the server-rendered HTML (a "hydration mismatch", caused by rendering something different on the server and client: a timestamp, a random value, browser-only state, or conditional rendering that differs), React cannot safely attach to the mismatched HTML.

Its recovery is to *discard* the server-rendered HTML for the mismatched region and *re-render it on the client* from scratch, so the UI ends up correct even though the fast server HTML was wasted for that part.

This is exactly the **`onRecoverableError`** category from Section 9: not a crash (the app works), but something worth reporting (a mismatch indicates a server/client rendering difference you probably want to fix, and you lost the SSR benefit for that region).

So those "hydration mismatch" warnings are React telling you it *recovered* by falling back to client rendering, via the recoverable-error path.

The fix is to make the server and client render the same thing (avoid rendering nondeterministic or browser-only values during the initial render).

#### Error boundaries during hydration

Error boundaries still work on the client during and after hydration: a render error during hydration unwinds to the nearest error boundary as usual (Section 5).

The interaction with SSR is that an error on the *server* during the initial render is a server concern (handled by the server framework, often producing an error response or a fallback), while the client-side boundary mechanism handles client render and hydration errors.

So a boundary protects the client experience.

The server side of an error is the framework's domain.

#### Suspense and streaming SSR

Suspense boundaries (Section 10) participate in *streaming* SSR: the server can send HTML for the parts that are ready and *stream* the rest as it becomes available, using Suspense boundaries as the unit of streaming (the fallback is sent first, then the real content streams in and replaces it).

And a Suspense boundary that cannot be resolved on the server can *fall back to client rendering*, which is another recoverable situation surfaced via `onRecoverableError`.

The full mechanics of streaming, selective hydration (hydrating interactive parts first), and how Suspense drives both are the subject of the Hydration and SSR Internals guide.

The error-handling-relevant takeaway is that Suspense fallbacks and server-to-client fallbacks show up in the recoverable-error category.

The reason to keep this section bounded is the spec's own principle (and the reader's profile): SSR and hydration are framework-coupled and best learned once you are past surface-level Next.js, so a full treatment here would be premature and would duplicate the dedicated guide.

What you need *for error handling* is: hydration mismatches and server-to-client Suspense fallbacks are *recoverable* errors (the app keeps working, report them via `onRecoverableError` and fix the underlying server/client difference), error boundaries protect client and hydration render errors as usual, and the deep streaming and hydration mechanics live in their own guide.

When you reach that guide, this section's error-handling framing (the three error categories and where SSR fits) will connect to the full hydration story.

### Try it

> If you have an SSR setup (a Next.js app, say), deliberately cause a hydration mismatch by rendering `new Date().toString()` or `Math.random()` directly in a server-rendered component, and watch the console for the hydration mismatch warning and, if you wired `onRecoverableError`, see it fire while the app still works (React re-rendered that part on the client). Seeing a mismatch surface as a *recoverable* error, not a crash, is the SSR-relevant point.

### You've got this if

You can explain why a hydration mismatch is a *recoverable* error rather than a crash, and where the full SSR and hydration mechanics are covered (their own guide).

---

## 13. Debugging errors and resilience

Prereqs: the rest of the guide.

### The itch

Something is going wrong: a white screen, a boundary that did not catch, an error-reset loop, hydration warnings.

You want to map each symptom to the mechanism and the fix, fast.

### The short version

Most error-handling problems are one of a small set, each mapping to a section.

The procedure: identify *what* threw and *where* (render versus event handler versus async versus hydration), check whether a boundary was in the right place to catch it (above the throw, and an error boundary for an `Error`), and use the `componentStack` from `errorInfo` (or the React 19 root callbacks) to locate the source.

The two instruments are the console (React 19's logging and component stacks) and the React DevTools.

### How it actually works

Walk the symptoms.

#### The whole app white-screens

An uncaught error: the unwind (Section 5) reached the root without finding a boundary, so the whole tree unmounted (Section 2).

Either there is no boundary above the throw, or the boundary that should have caught it *itself* threw (a boundary cannot catch its own error, Section 6, so it unwound to the next boundary up, which may not exist).

Fix: add a top-level catch-all boundary (Section 11), and make sure your boundaries' own render and fallback cannot throw.

Use `onUncaughtError` (Section 9) to get reported on these.

#### A boundary did not catch an error

Almost always because the error was *not a render error*: it was thrown in an event handler or async code (Section 6), which boundaries do not catch.

Check where the throw originated.

If it is a handler or a promise, handle it locally or forward it into a boundary (Section 7).

The other possibility is that the boundary was not *above* the throwing component (a sibling or descendant boundary does not catch, Section 5).

#### The boundary catches, then immediately re-catches (a flickering loop)

An error-reset loop (Section 8): something is resetting the boundary back into the same failing conditions, so it re-throws immediately.

Fix: only reset on a *change* in conditions (`resetKeys` tied to the relevant input), and for a deterministic error, fix the cause rather than retrying identical inputs.

#### You cannot tell which component threw

Use the `componentStack` from `errorInfo` (in `componentDidCatch` or the React 19 root callbacks, Sections 3 and 9), which gives the component-tree path to the throwing component, far more useful than the raw JavaScript call stack for a render error.

React 19's improved error logging and component stacks make this clearer than older versions.

#### Hydration mismatch warnings

A recoverable error (Section 12): the client render differed from the server HTML, so React re-rendered that part on the client.

Not a crash, but fix the server/client difference (nondeterministic or browser-only values rendered during initial render), and report via `onRecoverableError` for visibility.

#### An error is logged but you expected it to be thrown (or vice versa)

React 19 changed default logging (Section 9): uncaught errors go to `window.reportError` (not re-thrown), caught errors to `console.error`.

If you set the root options, you *override* these defaults, so make sure you still surface errors in development.

#### The closing synthesis

Error boundaries are a *render-time resilience* mechanism built on one core idea: when a component throws during rendering, React catches the throw in its work loop and *unwinds* up the fiber tree to the nearest boundary that can handle what was thrown, discarding the failed subtree and showing the boundary's fallback instead, which contains the failure to that subtree rather than letting it blank the whole app (React's deliberately drastic default for uncaught errors, chosen because a corrupt partial UI is worse than a blank one).

A boundary is a class component (the one place modern React still requires a class, with no settled hook equivalent) defined by `getDerivedStateFromError` (pure, render-phase, decides the fallback) and `componentDidCatch` (commit-phase, performs side effects like logging with a `componentStack`).

Because the mechanism is render-time, boundaries catch errors in rendering, lifecycles, and constructors, but *not* in event handlers, async code, SSR, or the boundary's own render, since those are not the subtree's render React can unwind.

For those you use `try`/`catch` or forward the error into a boundary by turning it into a render-time throw.

A caught boundary stays on its fallback until reset, and resets must be paired with a change in conditions to avoid an error-reset loop.

React 19 added root-level `onCaughtError`, `onUncaughtError`, and `onRecoverableError` for centralized reporting that complements (does not replace) the per-subtree UI decisions boundaries make, and changed default logging so uncaught errors go to `window.reportError`.

The same throw-and-unwind machinery powers Suspense: throw an `Error` and React unwinds to an error boundary with a permanent fallback.

Throw a *promise* and React unwinds to a Suspense boundary with a *temporary* fallback that retries when the promise resolves.

And resilient architecture is the practice of placing boundaries at the seams of independent UI regions (a top-level net, section and route boundaries, tight boundaries around risky components) so failures are contained to the smallest sensible blast radius.

Every error-handling behavior you will hit is one of these: the unwind finding (or not finding) a boundary, the render-time-only scope, the reset conditions, the React 19 reporting, or the shared mechanism with Suspense.

### Try it

> Take a real crash from your app (or reproduce one above) and, before fixing it, classify it: render error or non-render (handler/async)? Caught by a boundary or uncaught (white screen)? If caught, is the reset safe or looping? Read the `componentStack` to find the source. Then apply the matching fix. Doing this on two or three real errors makes the classification reflexive.

### You've got this if

You can take "my whole app went blank" or "my boundary did not catch the error" and name the mechanism (no boundary above the throw / a non-render error) and the fix without guessing.

---

## 14. Reading the source

Prereqs: the rest of the guide, plus comfort reading JavaScript.

This is a pass 3 section.

There is no rush.

### The itch

You have the model.

Now you want to see the throw-and-unwind machinery in React's actual code, and confirm that error boundaries and Suspense really do share it.

### The short version

The machinery lives in the `react-reconciler` package: `ReactFiberThrow.js` (the catch-and-route logic, `throwException`, which handles both errors and thrown promises, the shared mechanism), `ReactFiberUnwindWork.js` (the unwind up the fiber tree), and `ReactFiberErrorLogger.js` (the logging and the React 19 root callbacks).

The class-component handling of `getDerivedStateFromError` is in the class update logic.

The pieces map cleanly onto this guide.

### How it actually works: the reading order

In the **`react-reconciler`** package:

`ReactFiberThrow.js` is the heart, the catch-and-route logic from Sections 5 and 10.

`throwException` is where React, having caught a thrown value in the work loop, decides what to do based on *what* was thrown: it checks whether the thrown value is a *thenable* (a promise, meaning a suspense) or not (an error).

For a promise, it finds the nearest Suspense boundary and attaches a retry when the promise resolves (the Suspense path).

For an error, it routes to the error-boundary path.

This one file is where you can literally see error boundaries and Suspense sharing the mechanism, distinguished by the thrown value's type, which is the entire point of Section 10.

Look for the thenable check and the two branches.

`ReactFiberUnwindWork.js` contains `unwindWork` (and the completion/unwind logic): the upward walk over the fiber tree that pops the failed work and looks for a fiber that can handle the throw (Section 5).

This is the "unwind up the `return` pointers to the nearest boundary."

The handling of `getDerivedStateFromError` is in the class-component update logic (in `ReactFiberClassComponent.js` and the work loop's completion of a boundary fiber): where React, having routed an error to a boundary fiber, calls the static `getDerivedStateFromError` to derive the fallback state and schedules `componentDidCatch` for the commit phase (Section 3).

`ReactFiberErrorLogger.js` is the logging and reporting from Section 9: where React decides to call `console.error` (caught), `window.reportError` (uncaught), or your `onCaughtError`/`onUncaughtError`/`onRecoverableError` root callbacks, and where the default dev-mode logging with the component name lives.

The `errorInfo` object's `componentStack` (Sections 3 and 9) is built from the fiber tree (walking the fibers to produce the component-path string), which is why it reflects the *component* hierarchy rather than the JavaScript call stack.

### Try it

> Open `ReactFiberThrow.js` and find `throwException`, then find the check for whether the thrown value is a thenable (a promise). Recognizing the two branches (promise leads to the Suspense path, non-promise leads to the error-boundary path) is seeing the shared machinery from Section 10 in the actual code, and it is the fastest way to confirm that error boundaries and Suspense are one mechanism.

### You've got this if

You opened `ReactFiberThrow.js` (or even just located it) and recognized that the same function routes thrown errors to error boundaries and thrown promises to Suspense boundaries.

---

## Further reading (primary sources)

When you want to go past this guide, these are the canonical sources, each with a note on how it relates to what you read here and how current it is.

### The React docs on error handling, current within the React 19 line

The `Component` reference documents `getDerivedStateFromError` and `componentDidCatch` (Section 3) at https://react.dev/reference/react/Component (see the error-boundary sections).

The `createRoot` reference at https://react.dev/reference/react-dom/client/createRoot documents the React 19 `onCaughtError`, `onUncaughtError`, and `onRecoverableError` options (Section 9) with examples, and `hydrateRoot` at https://react.dev/reference/react-dom/client/hydrateRoot covers their use during hydration (Section 12).

These are the authoritative current sources for the API.

### The React 19 release post, at https://react.dev/blog/2024/12/05/react-19

Documents the new root-level error options and the changed default logging behavior (uncaught errors to `window.reportError`, caught to `console.error`) from Section 9, with the rationale.

This is the primary source for what React 19 changed about error handling.

### The `react-error-boundary` library, at https://github.com/bvaughn/react-error-boundary

The de facto standard library for error boundaries (Section 4), providing the `<ErrorBoundary>` component, `FallbackComponent`/`fallbackRender`, `onError`, `onReset`, `resetKeys` (Section 8), and the `useErrorBoundary`/`showBoundary` hook for forwarding handler and async errors into a boundary (Section 7).

Its README is a practical primary source for the ergonomic patterns this guide describes, and it is actively maintained.

### The React source (pass 3)

in the `react-reconciler` package: `ReactFiberThrow.js` (the shared catch-and-route logic for errors and promises, Sections 5 and 10), `ReactFiberUnwindWork.js` (the unwind, Section 5), and `ReactFiberErrorLogger.js` (logging and root callbacks, Section 9), per Section 14.

Reading `throwException` is the fastest way to confirm the shared mechanism with Suspense.

### The rendering and reconciliation guide, and the upcoming Suspense guide (this series)

The rendering guide's render/commit and work-loop material is the foundation for the unwind (Section 5), and the dedicated Suspense guide builds directly on Section 10's shared machinery, going deep on the promise side (suspending, fallbacks, transitions, reveal order, streaming).

Read them together to see both halves of the throw-and-unwind mechanism.

A good way to use all of these: read the relevant deep section here first so you have the model and the vocabulary, then read the primary source, then come back.

This guide gives you the one core idea (throw, unwind to the nearest boundary) and traces error boundaries, the React 19 options, resilience architecture, and the Suspense connection all back to it.

The primary sources give the exact API, the library ergonomics, and the source-level detail.

---

Built to be climbed, not swallowed.

Finish pass 1 and you are already ahead.

Come back for the deep parts when a real crash, a boundary that did not catch, or a hydration warning gives you a reason to care, and learn by deliberately throwing, because watching the blast radius with and without a boundary is the fastest way to internalize the mechanism.

Every version-specific claim (error boundaries still class-only, the React 19 root options and the changed default logging) reflects the React 19.2.x line in 2026.

The core model (throw during render, unwind to the nearest boundary, contain the failure, with the same machinery powering Suspense via thrown promises) has been stable since React 16 and is not going anywhere.

This is a Track A engine-internals guide, and it shares its backbone with the Suspense guide that follows: error boundaries are the throw-and-unwind mechanism for errors, Suspense is the same mechanism for promises.
