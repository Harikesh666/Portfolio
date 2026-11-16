---
title: "React's Event System"
description: "How synthetic events, delegation, propagation, portals, and event priority work in modern React."
category: "Internals"
readTime: "45 min read"
date: "May 2026"
publishedAt: "2026-05-01"
order: 6
series: "react-internals"
---

> Current as of React 19.2.x (latest patch 19.2.6, May 2026). The event system has been stable since React 17 (which moved delegation to the root container and removed event pooling). The facts here were verified against current sources and apply to the React 19 line. This is a Track A engine-internals guide, and it is pure React: nothing here needs a framework.

> **What this guide builds on.** This is the first Track A (engine internals) guide, and it leans mainly on the rendering and reconciliation guide. From there it uses the **fiber tree** (React's internal tree of component instances, which the event system walks to find your handlers), **lanes and priority** (how React ranks updates by urgency, which events feed into), and **batching** and the **render and commit** split (events are where updates originate). It touches the **Hooks and Effects guide** lightly, for the update queue (how `setState` schedules work). It needs no framework knowledge at all. Wherever it reaches for one of those engine concepts, it defines it in a line at first use. The per-section **Prereqs** lines name what each section needs, drawn from earlier sections here, the rendering guide, and outside knowledge (the DOM event model: `addEventListener`, the capture and bubble phases, `target` and `currentTarget`, `stopPropagation`, `preventDefault`).

## Read this first

Same method as the other guides.

**You are not meant to absorb this in one sitting.**

### Pass 1, one relaxed sitting (about 30 minutes)

Read only **"The itch"** and **"The short version"** of each section.

You will come out understanding why there is no click listener on your buttons, how one listener at the root dispatches to thousands of handlers, why React events bubble through the component tree rather than the DOM tree (and what that means for portals), how events set the priority of the updates they trigger, and where React events and native listeners collide.

That alone demystifies a large amount of "why did my event do that" confusion.

### Pass 2, driven by real work

When a real problem appears (a handler that will not fire, a `stopPropagation` that does nothing, a portal's click reaching a surprising parent, a native listener firing in the wrong order), come back and read the deep part of the matching section.

### Pass 3, when curious

The further-reading section points at the primary sources and the files in React's own code where the event system lives.

Each section opens with a one-line **Prereqs** note: the earlier sections (here or in the rendering guide) and any outside knowledge worth having first.

Sections that need nothing past basic React and the DOM say so.

### Two rules that multiply everything

1. **Run the experiments.** Each section ends with a short **"Try it."** Keep a Vite scratch app open and the browser DevTools handy. Several of these are best understood by inspecting the real DOM (and noticing what listeners are and are not there) while events fire.
2. **Trust the order.** The sections build one picture, in order: why the system exists, what a synthetic event is, how delegation and the root container work, how an event dispatches by walking the fiber tree, how propagation and `stopPropagation` behave, how events set update priority and batch, and where the system meets portals and native listeners. Here is the spine:

```
   Why React intercepts events at all                 (1)
            │
   The synthetic event wrapper                          (2)
            │
   Delegation: one listener, not thousands              (3)
            │
   Where the listener lives: the root container         (4)
            │
   Dispatch: native event to your handler               (5)   ◀── the core path
            │
   Capture and bubble by walking the fiber tree         (6)   ◀── the key internals idea
            │
   stopPropagation, priority, batching                   (7, 8, 9)
            │
   Where it gets surprising: portals, native listeners   (10, 11)
            │
   Gotchas, debugging, the source                         (12, 13, 14)
```

You do not need to finish this guide to benefit from it.

Finish pass 1 and you are already ahead.

---

## 1. Why React has its own event system

Prereqs: basic React (you have written an `onClick`).

Outside React: that the DOM has native events you normally handle with `addEventListener`.

### The itch

You write `<button onClick={handleClick}>`, and it works.

But open the DevTools, inspect that button, and look at its event listeners: there is no `click` listener on it.

There is no `click` listener on its parent either.

So where does your handler live, and how does clicking the button ever reach it?

React is doing something between your JSX and the DOM, and that something is the synthetic event system.

### The short version

React does not attach your event handlers to your DOM nodes.

Instead it runs its own event system: a single set of listeners at one place (the root of your app) that catches native events and dispatches them to your handlers by consulting React's internal component tree.

React built this for four reasons: to normalize events across browsers, to get the performance of attaching very few real listeners instead of thousands, to assign each event a _priority_ that feeds React's scheduler, and to make event propagation follow the React component tree (which matters for things like portals).

Your `onClick` is a description of intent that React's event system fulfills, not a direct DOM listener.

### How it actually works

The puzzle in "The itch" is real and worth sitting with: your handlers are genuinely not on your nodes.

When you write `onClick={handleClick}`, React does not call `button.addEventListener('click', handleClick)`.

The handler is stored in React's internal data structures (on the fiber for that element, which we will meet in Section 5), and the actual DOM listener that will eventually run it lives somewhere else entirely (the root container, Section 4).

React stands between the browser's native event model and your components, intercepting events and routing them.

That intercepting layer is the _synthetic event system_, and understanding why React bothered to build it explains everything it does.

There are four reasons, and they have shifted in relative importance over React's life.

#### Cross-browser normalization

Historically, browsers disagreed about events in maddening ways: different property names, different behaviors, different quirks for the same logical event.

React's synthetic event wraps the native event in an object with one consistent interface, so your handler sees the same `SyntheticEvent` API regardless of browser (Section 2).

This was a major motivation in React's early years.

Modern browsers are far more consistent now, so this matters less than it used to, but the normalization is still there and still removes some sharp edges.

#### Performance through delegation

If a list has a thousand rows each with an `onClick`, attaching a thousand real DOM listeners would cost memory and setup time.

Instead React attaches a _small_ number of listeners (roughly one per event type) at a single root, and when an event fires there, it figures out which component's handler to invoke (Section 3).

A thousand `onClick` props become a handful of real listeners.

This is event delegation, a standard pattern that React automates and generalizes for you.

#### Integration with React's rendering and concurrency model

This is the reason that is easy to overlook and is arguably the most important today.

React is not just routing events.

It is the thing that decides _how urgent_ the resulting update is.

When a click handler calls `setState`, React needs to know that a click is a high-priority, the-user-is-waiting interaction, while a `mousemove` is low priority and can be coalesced or deferred.

The event system is where React assigns that priority (Section 8), feeding it into the lanes and scheduler from the rendering guide.

A pile of native `addEventListener` calls could never do this, because they have no connection to React's update machinery.

The event system is the bridge: it is where a user interaction becomes a prioritized, batched React update.

#### Consistency with the component tree

Native event propagation follows the _DOM_ tree.

React event propagation follows React's _component_ (fiber) tree (Section 6).

Usually these match, but they diverge for portals (Section 10), where a component's DOM lives in one place but its position in the React tree is elsewhere.

By running its own propagation over the fiber tree, React makes events follow the structure _you wrote in JSX_, which is the structure you reason about, rather than the structure the DOM happens to have.

So the synthetic event system is not React reinventing the wheel for its own sake.

It is the layer that lets React give you consistent cross-browser events, cheap delegation, priority-tagged and batched updates, and propagation that follows your component hierarchy.

Every later section in this guide is one part of how that layer works, and the strangeness in "The itch" (no listener on your node) is the first visible consequence: your handlers live in React's world, and React decides when to run them.

### Try it

> In a scratch app, render a button with an `onClick`. Open DevTools, select the button, and look at its event listeners (in Chrome, the "Event Listeners" tab of the Elements panel, with "Ancestors" toggled). Notice there is no `click` listener on the button itself. Then look at the root container element (the one you passed to `createRoot`) and find React's delegated listeners there. Seeing your handler absent from the button and a listener present on the root is the whole motivation for this guide, made concrete.

### You've got this if

You can explain why React routes events through its own system instead of calling `addEventListener` on your nodes, and name at least two of the four reasons.

---

## 2. Synthetic events: the cross-browser wrapper

Prereqs: Section 1.

Outside React: the native DOM event object and its methods (`preventDefault`, `stopPropagation`, `target`, `currentTarget`).

### The itch

Your handler receives an event argument `e`, and it has `e.preventDefault()`, `e.target`, `e.stopPropagation()`, just like a native event, but it is not a native event.

You may also have read old advice about calling `e.persist()` to use the event asynchronously, tried it, and found it does nothing now.

The object you get is a `SyntheticEvent`, and its history explains both the familiarity and the outdated advice.

### The short version

The `e` your handler receives is a `SyntheticEvent`, a wrapper React puts around the native browser event.

It exposes the same interface as a native event (`preventDefault`, `stopPropagation`, `target`, `currentTarget`, and so on) but behaves identically across browsers, and you can reach the raw native event via `e.nativeEvent`.

The one historical wrinkle: React used to _pool_ (reuse) these objects for performance and null them out after your handler ran, so accessing `e` asynchronously gave you a blank event unless you called `e.persist()`.

**Event pooling was removed in React 17**, so today you can hold onto and read a synthetic event asynchronously freely, and `e.persist()` is a no-op kept only for compatibility.

### How it actually works

When React dispatches an event to your handler (Section 5), it does not hand you the raw native event.

It constructs a `SyntheticEvent` that wraps the native event and presents a normalized interface.

The wrapper has the same shape as a native event: the standard methods (`preventDefault()`, `stopPropagation()`), the standard properties (`type`, `target`, `currentTarget`, `bubbles`, and the event-specific ones like `clientX` or `key`), so your handler code looks exactly like native event code.

The difference is that React guarantees these behave consistently across browsers, smoothing over the historical inconsistencies that motivated the wrapper (Section 1).

If you ever need the actual underlying browser event (to reach a non-standard property, or to interoperate with a native API), `e.nativeEvent` gives it to you.

A subtlety worth knowing: a synthetic event does not always map one-to-one to a single native event type.

React sometimes synthesizes a logical event from a different native event.

The documented example is `onMouseLeave`: its `e.nativeEvent` is actually a `mouseout` event, because React builds the non-bubbling enter/leave semantics on top of the bubbling `mouseover`/`mouseout` native events (Section 12).

Similarly, `onChange` is built on the native `input` event, not the native `change` event (Section 12).

So the synthetic event is a _logical_ event in React's model, which usually corresponds to a native event but is sometimes assembled from a different one to give more useful semantics.

Now the pooling history, because it is the source of outdated advice you will still encounter.

In React 16 and earlier, creating a fresh `SyntheticEvent` object for every event was seen as a performance and memory concern (lots of short-lived objects and garbage collection), so React _pooled_ them: it kept a pool of synthetic event objects, took one from the pool for each event, populated its properties, passed it to your handler, and then, after your handler returned, _reset all its properties to null_ and returned it to the pool for reuse.

The consequence was a notorious gotcha: if you tried to read the event asynchronously (in a `setTimeout`, a promise, or after an `await`), the event had already been nulled out and reused, so you saw a blank event.

The escape hatch was `e.persist()`, which pulled the event out of the pool so it would not be reset, letting you read it later.

#### React 17 removed event pooling entirely

The React team found that pooling did not actually improve performance in modern browsers (which handle short-lived objects efficiently) and that it confused developers far more than it helped.

So as of React 17 and through the React 19 line, every event gets its own `SyntheticEvent` object that is _not_ reused or nulled out, which means you can access the event asynchronously with no special handling:

```js
function handleClick(e) {
    setTimeout(() => {
        console.log(e.type); // works fine in React 17+; would have been null with pooling
    }, 1000);
}
```

`e.persist()` still exists but is now a no-op, kept only so that old code calling it does not break.

So the practical rules today are: treat the synthetic event like a native event with a consistent interface, reach for `e.nativeEvent` when you need the raw event, and ignore any advice about `e.persist()` or pooling unless you are on a very old React, because that entire concern was removed years ago.

If you ever see an event mysteriously coming back blank asynchronously in a modern app, the cause is something else, not pooling.

### Try it

> Write a click handler that reads `e.type` inside a `setTimeout(..., 1000)` and logs it. Confirm it logs correctly (no blank event), proving pooling is gone. Then log `e.nativeEvent` and inspect it to see the raw browser event under the wrapper. For a flavor of the synthesized-event point, add an `onMouseLeave` and log `e.nativeEvent.type` to see it report `mouseout`.

### You've got this if

You can explain what a `SyntheticEvent` is and why `e.persist()` is no longer necessary, in terms of the removal of event pooling in React 17.

---

## 3. Event delegation: there is no listener on your node

Prereqs: Sections 1 and 2.

Outside React: event delegation in vanilla JavaScript (one listener on a container handling events from many children, using the event's `target`).

### The itch

You confirmed in Section 1 that your buttons have no click listeners on them.

So how does React handle clicks on a thousand different elements without attaching a thousand listeners?

The answer is a pattern you may have used by hand: delegation.

React just does it for the whole app, automatically.

### The short version

Event delegation means attaching one listener high up and using it to handle events from many descendants, instead of attaching a listener to each descendant.

React does this for your entire app: it attaches a small set of listeners (roughly one per supported event type, for each of the capture and bubble phases) at a single root, and when a native event fires and reaches that root, React works out which of your components' handlers should run by consulting its internal tree.

So no matter how many `onClick` props you write, the number of _real_ DOM listeners stays small and constant.

This is why your nodes have no listeners: the listeners are all at the root.

### How it actually works

Start with the same pattern in plain JavaScript:

```js
const list = document.querySelector("[data-list]");

list.addEventListener("click", (event) => {
    const item = event.target.closest("[data-item]");
    if (!item || !list.contains(item)) return;
    console.log(item.dataset.item);
});
```

Delegation is an old vanilla-JavaScript pattern.

Instead of attaching a listener to each of a hundred list items, you attach one listener to the list container.

When any item is clicked, the click bubbles up to the container, the container's listener fires, and you use `event.target` to figure out which item was clicked.

One listener, many handled elements.

The win is fewer listeners (less memory and setup cost) and the ability to handle dynamically added elements without wiring up new listeners.

React generalizes this to your whole application.

When a React root mounts, React attaches its delegated listeners to the root container (Section 4 covers exactly where).

It does not attach one listener per event type per element.

It attaches roughly one listener per supported event type, total, at the root, for both the capture and bubble phases.

So there is one `click` listener (well, one for capture and one for bubble) handling clicks for your entire app, one `keydown` listener for all key presses, and so on, rather than thousands scattered across your nodes.

React attaches the full set of these listeners eagerly when the root mounts, so it is ready for any event type any component might use.

The mechanism, in outline (Section 5 has the full path): a native event fires on some deep element and bubbles up the real DOM until it reaches the root container, where React's single delegated listener for that event type catches it.

React then looks at where the event originated (the native event's `target`), finds the corresponding component in its internal tree, and dispatches the event to the appropriate handlers (Sections 5 and 6).

So the _real_ listener count is tiny and fixed, while the number of _logical_ handlers (`onClick` props) can be enormous.

React bridges the gap by doing the "which element was this, and which handlers care" lookup itself, rather than relying on a real listener sitting on each element.

This is why your nodes have no listeners (Section 1's puzzle): they do not need any, because the one listener at the root handles everything by delegation.

It is also why React can handle events on elements that did not exist when the app started: a newly rendered button needs no listener attached, because the root listener already catches its clicks.

React just needs the button to be in its internal tree to know which handler to call.

And it is why adding `onClick` to a component is so cheap: you are not creating a DOM listener, you are recording, in React's data structures, that this fiber has a click handler, which the root listener will find when a click on that element bubbles up.

Delegation has been part of React since its first release.

What changed over time is _where_ the delegated listeners are attached, which is the subject of the next section and matters more than it sounds.

### Try it

> Render a list of many items, each with an `onClick`. In DevTools, confirm none of the items has a click listener. Then find the root container and confirm React's listeners are there. Add a new item dynamically (via state) and click it. It works immediately with no new listener, because the root listener already handles it. The fixed, tiny listener count regardless of element count is delegation in action.

### You've got this if

You can explain how React handles clicks on thousands of elements with only a handful of real DOM listeners, and why a dynamically added element needs no new listener.

---

## 4. The root container: where the listeners actually live

Prereqs: Section 3.

Outside React: `createRoot` and the DOM node you pass it.

The difference between `document` and a specific container element.

### The itch

Section 3 said the delegated listeners live "at the root." But which root?

You may have read older explanations that say React attaches everything to `document`, and newer ones that say the root container, and they disagree.

The difference is a real change React made, and it matters when you mix React with native listeners or other React apps on the same page.

### The short version

React attaches its delegated listeners to the **root container**: the specific DOM node you pass to `createRoot` (or the older `ReactDOM.render`).

This changed in React 17.

Before 17, React attached them to the `document`.

React 17 moved them down to the root container, and React 18's `createRoot` continues this.

The move solved real problems: multiple React versions or multiple React roots on one page no longer interfere with each other, and React embedded inside a larger non-React page no longer collides with the host page's `document`-level handlers.

A practical consequence: a native listener on `document` now sits _above_ React's listeners, which changes ordering (Section 11).

### How it actually works

Recall from Section 3 that React attaches a small set of delegated listeners when a root mounts.

The question this section answers is _to which DOM node_, and the answer changed at React 17 in a way that is worth understanding because it explains several otherwise-confusing interactions.

#### Before React 17

React attached its delegated listeners to the `document` node.

Every event for the entire page bubbled all the way up to `document`, where React's single listener per event type caught it and dispatched.

This worked, but it had problems on pages that were not a single, sole React app.

#### React 17 and later (including React 19)

React attaches its delegated listeners to the **root container**, the DOM node you pass to `createRoot(container)`.

So the listeners live on _your app's container element_, not on `document`.

Each React root attaches its own set of listeners to its own container.

The React 17 changelog records this directly: "Delegate events to roots instead of document."

Why the move mattered enough to make in a release that was otherwise deliberately almost featureless:

#### Multiple React versions on one page

Large apps sometimes run more than one copy or version of React simultaneously, especially during a gradual migration (an old app slowly being replaced by a new one, both live at once).

With every copy attaching listeners to the same `document`, their event handling interfered: in particular, a `stopPropagation` (Section 7) in one React tree could prevent an event from ever reaching the other React tree's `document` listener, because both were on the same node.

Moving listeners to each root's container isolates them: each React tree handles events within its own container, and one tree's `stopPropagation` does not silently break another tree's events.

This was the primary motivation, and it is what made safe incremental upgrades between React versions possible.

#### Embedding React in a larger page

If your React app is one widget on a page otherwise built with other technology (or other frameworks), `document`-level listeners from React reached the entire page and could interfere with the host page's own `document` handlers, and vice versa.

Scoping React's listeners to its container keeps React's event handling inside React's part of the page, which is much friendlier for embedding.

#### Cleaner mental model and teardown

Listeners scoped to a container are scoped to that root's lifetime and footprint, which is tidier than a global pile on `document`.

The practical consequence you must keep in mind (and which Section 11 develops) is about _ordering relative to native listeners_.

Because React's listeners now sit on the root container rather than `document`, a native listener you attach to `document` is now _above_ React in the real DOM bubbling order: a bubbling event passes through React's root-container listener _before_ it reaches `document`.

Pre-17, with React on `document`, the relationship was different.

So if you have native `document`-level listeners (common with third-party libraries, global keyboard handlers, outside-click detection), their ordering relative to React's handlers is determined by this: React is on the container, your `document` listener is above it.

This is the kind of subtle interaction that the root-container change quietly altered, and knowing where React's listeners actually live is what lets you reason about it.

A small completeness note: while the _main_ delegated listeners are on the root container, React still attaches a few specific listeners at the `document` level for events that fundamentally operate at the document scope (for example, `selectionchange`, which the browser only fires on `document`).

So "everything is on the root container" is the right model for the overwhelming majority of events, with a small number of inherently-document-level exceptions.

The headline, and the thing that changed in 17, is that the bulk of delegation moved from `document` to your root container.

### Try it

> Mount a React app and, in DevTools, inspect the container element you passed to `createRoot`. Find React's delegated listeners on it (not on `document`). Then attach a native `document.addEventListener('click', ...)` and a React `onClick` on a button, log from both, and observe the order: the native `document` listener and React's container listener fire in an order determined by React's listeners being on the container, below `document`. Section 11 unpacks that ordering. For now, just confirm the listeners are on the container.

### You've got this if

You can explain why React 17 moved delegation from `document` to the root container, and what that means for a native listener attached to `document`.

---

## 5. The dispatch path: from a native event to your handler

Prereqs: Sections 3 and 4.

From the rendering guide: the fiber tree (React's internal tree of component instances), defined inline here.

Outside React: the native event's `target` (the element where the event originated).

### The itch

A click happens on a deep button.

The real listener is at the root container, far away.

Somehow, your specific `handleClick` runs, with the right event.

You want the actual step-by-step path from "user clicked" to "my function ran," because every later behavior (propagation, `stopPropagation`, portals) is a variation on this path.

### The short version

The path is: the native event fires on the target element and bubbles up the real DOM to the root container, where React's single delegated listener for that event type catches it.

React reads the native event's target element, finds the corresponding _fiber_ (React's internal object for that element), and walks the fiber tree from that fiber up to the root, collecting every matching handler along the way (the `onClick`s and `onClickCapture`s).

It wraps the native event in a `SyntheticEvent` and calls the collected handlers in the correct order.

So the real listener is at the root, but React reconstructs the full path to your handler by walking its own tree.

### How it actually works

First, the one term from the rendering guide this section needs, defined inline: a _fiber_ is React's internal object for one component or DOM element in your tree.

Each rendered element has a fiber, the fibers are linked into a tree mirroring your component structure (each fiber points to its parent, child, and siblings), and crucially, each real DOM node React creates has an internal pointer back to its fiber.

That last fact is what makes dispatch possible: given a DOM node, React can find its fiber, and from the fiber it can walk the component tree.

Now the full path, step by step, for a click on a deeply nested button:

1. **The native event fires and bubbles.** The user clicks the button. The browser creates a native `click` event at the button (the event's `target`) and bubbles it up the _real DOM_ tree: button, then its DOM parent, then that parent's parent, and so on, upward.
2. **It reaches the root container, where React's listener catches it.** Because React's delegated `click` listener is on the root container (Section 4), the bubbling event eventually reaches that listener, which is React's entry point into dispatch. This single listener handles clicks for the whole app (Section 3).
3. **React finds the fiber for the target.** React's listener reads the native event's `target` (the button DOM node) and looks up that node's internal fiber pointer to get the button's fiber. Now React knows _where in its own tree_ the event originated.
4. **React walks the fiber tree to collect handlers.** Starting from the target fiber, React walks _up the fiber tree_ toward the root, and at each fiber it checks whether that component has a handler for this event (an `onClick` for the bubble phase, an `onClickCapture` for the capture phase). It accumulates the handlers it finds along this path, in tree order. This is the heart of dispatch, and Section 6 details the capture-versus-bubble ordering. The key point here is that React reconstructs the propagation path by walking _its own tree_, not by relying on the native event to visit each element.
5. **React builds a `SyntheticEvent` and calls the handlers.** React wraps the native event in a `SyntheticEvent` (Section 2) and invokes the collected handlers in the correct order (capture handlers first, root-to-target, then bubble handlers, target-to-root, Section 6), passing each the synthetic event. Your `handleClick` is one of these, and now it runs.
6. **Resulting updates are prioritized and batched.** If your handler calls `setState`, the resulting update is tagged with the event's priority (Section 8) and batched with any other updates from the same event (Section 9), then handed to React's scheduler to render.

The thing to take away is the inversion between where the _listener_ is and where the _handlers conceptually are_.

The real DOM listener is a single one at the root.

But React makes it _behave_ as if every element along the path had its own listener, by walking the fiber tree from the target up to the root and gathering the handlers itself.

So `onClick` on a deep button works exactly as if the button had a real click listener, even though it does not, because React reconstructs the path and finds the handler by tree traversal.

Every behavior in the rest of the guide is a consequence of this reconstruction: propagation order (Section 6) is the order React walks and fires the collected handlers.

`stopPropagation` (Section 7) is React stopping its own walk.

Portal behavior (Section 10) is the walk following the _fiber_ tree even when the DOM tree diverges.

### Try it

> Nest a few components, each with an `onClick` that logs its name, around a deep button. Click the button and watch the handlers fire from the innermost outward (the bubble walk up the fiber tree). Then, to see step 3, in DevTools find the button DOM node and look at its properties for a key beginning with `__reactFiber$`. That is the pointer React uses to get from the DOM node to its fiber. Seeing that pointer is seeing how dispatch starts.

### You've got this if

You can describe the path from a native click on a deep element to your handler running, including how React gets from the DOM target to your handler by walking the fiber tree.

---

## 6. Capture and bubble by walking the fiber tree

Prereqs: Section 5.

Outside React: the DOM's two-phase event propagation (capture phase from the root down to the target, then bubble phase from the target back up).

### The itch

React has `onClick` and also `onClickCapture`, mirroring the DOM's capture and bubble phases.

But the real listener is at the root, so React is not using the DOM's propagation to reach your nested handlers.

So how does React produce capture-then-bubble ordering, and why does it sometimes differ from what the raw DOM would do?

The answer is that React replays propagation over its own tree.

### The short version

The DOM propagates an event in two phases: capture (from the root down to the target) and bubble (from the target back up to the root).

React reproduces both, but by walking its _fiber_ tree rather than relying on the DOM.

When dispatching, React collects the handlers along the path from the target fiber to the root, then fires the capture-phase handlers (`onClickCapture`) in root-to-target order and the bubble-phase handlers (`onClick`) in target-to-root order.

Because this walk follows the fiber tree (your component hierarchy), React propagation matches the structure you wrote in JSX, which usually equals the DOM but diverges for portals (Section 10).

### How it actually works

This component makes the two orders visible in the console:

```jsx
function PropagationDemo() {
    const log = (label) => () => console.log(label);

    return (
        <div
            onClickCapture={log("outer capture")}
            onClick={log("outer bubble")}
        >
            <section
                onClickCapture={log("inner capture")}
                onClick={log("inner bubble")}
            >
                <button
                    onClickCapture={log("button capture")}
                    onClick={log("button bubble")}
                >
                    Click me
                </button>
            </section>
        </div>
    );
}
```

Start with the native model, because React mirrors it.

When a native event fires, the browser propagates it in two phases.

First the _capture_ phase: the event travels from the top of the DOM (the window/document) down through each ancestor to the target.

Then the _bubble_ phase: the event travels from the target back up through each ancestor to the top.

Listeners can register for either phase (the third argument to `addEventListener`).

Most listeners use the bubble phase by default.

So a click on a nested element visits each ancestor twice, once going down (capture) and once coming up (bubble).

React exposes both phases: `onClick` registers a bubble-phase handler, and `onClickCapture` registers a capture-phase handler (every React event has a `Capture` variant).

But here is the internals point: React is not attaching real listeners to each of your elements for these phases.

The real listeners are at the root container (Section 4).

So React cannot rely on the _DOM_ visiting each of your elements in capture and bubble order.

Instead, React _reconstructs_ both phases by walking its own fiber tree during dispatch (Section 5, step 4), and then firing the collected handlers in the right order:

1. React finds the target fiber (from the native event's target DOM node, Section 5).
2. It walks from the target fiber _up_ to the root, building the list of fibers on that path (target, parent, grandparent, up to root). This is the propagation path, taken from the _fiber_ tree.
3. For the **capture** phase, it fires the `onClickCapture` handlers along that path in _root-to-target_ order (top down), matching the DOM capture phase.
4. For the **bubble** phase, it fires the `onClick` handlers along that path in _target-to-root_ order (bottom up), matching the DOM bubble phase.

So a click on a nested button fires: the capture handlers from the outermost ancestor down to the button, then the bubble handlers from the button up to the outermost ancestor.

This is exactly the order the DOM would produce, but React produces it by walking its own tree and firing the handlers it collected, not by letting the DOM dispatch to per-element listeners.

(As a registration detail, React 17 also made the capture-phase listeners use the browser's _real_ capture phase at the root, so React's internal capture ordering lines up correctly with any native capture listeners, and the changelog notes "Make all Capture events use the browser capture phase.")

The consequence that matters most is in step 2: **the path is taken from the fiber tree, not the DOM tree.** React walks parent pointers in _its_ tree, which represents the component hierarchy you wrote in JSX.

In the common case, the fiber tree and the DOM tree have the same shape, so React's propagation matches the DOM's, and everything is unsurprising.

But they are not the same tree, and the place they diverge is portals (Section 10): a portal renders a component's DOM into a different part of the real DOM, while keeping the component in the React tree where you wrote it.

Because React walks the _fiber_ tree to propagate events, an event inside a portal propagates to the portal's _React_ ancestors (where you wrote the portal in JSX), not to its DOM ancestors (where the DOM node actually lives).

That behavior, which surprises almost everyone the first time, is nothing more than this section's mechanism applied to a case where the two trees differ: React propagation follows fibers.

In day-to-day code you mostly use the bubble phase (`onClick`, `onChange`), and the capture variants (`onClickCapture`) are for the occasional case where you need to handle an event on the way _down_ before descendants see it (for example, an ancestor that wants to intercept clicks before its children's handlers run).

Knowing both phases exist, and that React reproduces them by walking the fiber tree, is what lets you reason about ordering precisely instead of by trial and error.

### Try it

> Nest three components around a button, and on each put both an `onClick` and an `onClickCapture` that log their name and phase. Click the button and watch the order: capture handlers fire outermost-to-button, then bubble handlers fire button-to-outermost. That sequence is React firing the handlers it collected by walking the fiber path, in the two phases.

### You've got this if

You can explain how React produces capture-then-bubble ordering without per-element DOM listeners, and why the propagation path comes from the fiber tree rather than the DOM tree.

---

## 7. stopPropagation and preventDefault in the synthetic world

Prereqs: Sections 5 and 6.

Outside React: what native `stopPropagation` (stop the event traveling to further elements) and `preventDefault` (cancel the browser's default action) do.

### The itch

You call `e.stopPropagation()` in a handler expecting the event to stop, and within your React components it does.

But mix in a native listener (on `document`, or attached directly to a node) and `stopPropagation` does not stop _that_, or a native listener's `stopPropagation` makes your React handler never fire.

The synthetic and native worlds handle propagation separately, and the seams are where bugs live.

### The short version

`preventDefault()` on a synthetic event cancels the browser's default action (form submission, link navigation), just like native.

React forwards it to the native event.

`stopPropagation()` on a synthetic event stops _React's_ propagation: it halts React's walk of the fiber tree, so handlers on React ancestors do not fire.

But it does this within React's own dispatch.

It does not necessarily stop _native_ listeners, because by the time React dispatches, the native event has already bubbled to the root container where React caught it.

So `stopPropagation` is reliable _between React handlers_ but does not cleanly cross the boundary to native listeners, which is the source of the classic mixing bugs.

### How it actually works

`preventDefault()` is the simpler of the two.

The browser performs default actions for certain events: submitting a form on a submit event, navigating on a link click, scrolling on certain key presses.

Calling `e.preventDefault()` cancels that default.

On a synthetic event, React forwards this to the underlying native event (`e.nativeEvent.preventDefault()`), so it behaves exactly like native `preventDefault`.

There is one wrinkle involving passive listeners (Section 12): if the underlying native listener is _passive_, the browser ignores `preventDefault`, which can matter for `wheel`/`touch` events.

Otherwise `preventDefault` works as you expect.

For the common cases (forms, links), it just works.

`stopPropagation()` is where the synthetic and native worlds separate, and understanding why requires Sections 5 and 6.

Native `stopPropagation` stops the event from continuing to the next element in the DOM's propagation.

But React is not propagating through the DOM to reach your handlers.

It has already caught the event at the root container and is now firing handlers it collected by walking the _fiber_ tree (Section 6).

So when you call `e.stopPropagation()` in a React handler, what it stops is _React's walk_: React stops firing the remaining handlers it collected along the fiber path.

Concretely, if you `stopPropagation` in a child's `onClick`, the `onClick` handlers on its React ancestors do not fire, because React halts its bubble walk.

So _between React handlers_, `stopPropagation` behaves exactly as you would expect: it prevents ancestor React handlers from running.

The complication is the boundary with native listeners, and it has two directions:

#### React's `stopPropagation` does not stop native listeners above the root

By the time React is firing your handlers, the native event has _already_ bubbled up the real DOM to the root container (that is how React caught it, Section 5).

So a native listener attached _above_ React's root container, most commonly on `document` (which is above the container since React 17, Section 4), has either already fired during the bubble up to the container, or will fire as the event continues bubbling past the container, regardless of your React `stopPropagation`.

React stopping its own internal walk does nothing to a native `document` listener, because that listener is part of the native propagation that React does not control from inside its dispatch.

So "I called `stopPropagation` but my outside-click handler on `document` still fired" is expected: you stopped React's propagation, not the native event's.

#### A native listener's `stopPropagation` can stop your React handler entirely

The reverse is sharper.

If you attach a native listener to a child node (via `addEventListener` in a ref, Section 11) and call `stopPropagation` there, you stop the _native_ event from bubbling further up the real DOM.

But React's listener is up at the root container, which the native event must reach for React to dispatch at all.

So a native `stopPropagation` on a child _prevents the event from ever reaching React's root listener_, which means React never dispatches it, which means your React `onClick` handlers (on that element and its ancestors) _never fire_.

A native listener can silently swallow React events this way, and it is a genuinely confusing bug if you do not know that React's dispatch depends on the event reaching the root.

The mental model to carry: there are two propagation systems running, the native DOM one and React's fiber-tree one, and `stopPropagation` acts within whichever system you call it in.

Inside a React handler, it stops React's walk (ancestor React handlers do not fire) but not native listeners above the root.

Inside a native listener, it stops native bubbling, which can starve React's root listener and kill React dispatch.

So `stopPropagation` is clean and predictable _within_ React, and requires care _across_ the React-native boundary.

When you find `stopPropagation` "not working," the question is always: which system is the handler in, and which system is the listener you expected to stop in?

They are usually different systems, which is the bug.

### Try it

> Put an `onClick` with `e.stopPropagation()` on a child inside a parent with its own `onClick`, and confirm the parent's React handler does not fire (React-to-React works). Now add `document.addEventListener('click', ...)` and confirm it _still_ fires despite the child's `stopPropagation` (React cannot stop the native document listener). Finally, attach a native listener to the child with `addEventListener` and call `stopPropagation` there, and watch your React `onClick` handlers stop firing entirely, because the event never reaches React's root.

### You've got this if

You can explain why `e.stopPropagation()` in a React handler stops ancestor React handlers but not a native `document` listener, and why a native child listener's `stopPropagation` can prevent a React handler from ever running.

---

## 8. Event priority: discrete versus continuous events

Prereqs: Section 5.

From the rendering guide: lanes (React's system of priority levels for updates) and concurrent rendering, recapped here.

Outside React: that some events fire rarely and deliberately (click) while others fire in rapid streams (mousemove).

### The itch

A click feels instant, but a component that does heavy work on every `mousemove` can lag without freezing the click.

React seems to treat some events as more urgent than others, and it does: the event system is where each event's _priority_ is decided, and that priority flows into React's scheduler.

This is one of the most important and least-known parts of the system.

### The short version

React classifies events by urgency and assigns the resulting updates a matching priority, which feeds the lanes system from the rendering guide (lanes are React's priority levels for updates).

**Discrete** events (click, keydown, input, submit: distinct, deliberate user actions) get the highest priority, because the user is waiting for a direct response.

**Continuous** events (mousemove, scroll, drag, wheel: rapid streams) get a lower priority, because they fire constantly and React can coalesce or defer them.

So when an event handler calls `setState`, the update inherits the event's priority, which is how React knows a click is urgent while a `mousemove` can wait.

The event system is where update priority originates.

### How it actually works

The one concept from the rendering guide this section needs, recapped: React assigns every update to a _lane_, where lanes are priority levels.

Higher-priority lanes are processed more urgently.

Lower-priority lanes can be deferred, interrupted, or coalesced under concurrent rendering.

The lanes mechanism is how React decides what to render first and what can wait.

The question this section answers is: where does an update's priority _come from_?

For updates triggered by user interaction, the answer is the event system.

The event is the origin of the urgency.

React classifies the events it handles into priority tiers (in the source, this is `getEventPriority`, Section 14), and the classification reflects how users perceive each kind of interaction:

#### Discrete events get the highest (discrete) priority

These are distinct, intentional, one-at-a-time user actions: `click`, `keydown`, `keyup`, `input`, `change`, `submit`, `touchstart`, and similar.

When the user clicks a button or types a key, they have done a deliberate thing and are waiting for an immediate response, so React treats the resulting update as high priority and processes it urgently.

There should be no perceptible lag between a click and its effect, so discrete-event updates are not the kind React defers.

#### Continuous events get a lower (continuous) priority

These fire in rapid streams as a side effect of continuous motion: `mousemove`, `mouseover`, `mouseout`, `drag`, `scroll`, `wheel`, `pointermove`, `touchmove`.

They can fire dozens of times per second, and the user is not waiting for each individual one.

They care about the _overall_ responsiveness of the motion.

So React gives these updates a lower priority, which lets it coalesce a burst of them and avoid blocking more urgent work.

If a `mousemove` triggers expensive work, React can keep the UI responsive to a click that arrives in the middle, because the click's update outranks the in-flight `mousemove` update.

#### Everything else gets a default priority

between the two, for events that do not clearly fall into either bucket.

The mechanism that connects this to your code is simple and powerful: **when an event handler calls `setState`, the resulting update is assigned the lane corresponding to the event's priority.** React sets the "current event priority" as part of dispatching the event (Section 5), and any state updates your handler schedules inherit it.

So a `setState` in an `onClick` produces a high-priority (discrete) update.

A `setState` in an `onMouseMove` produces a lower-priority (continuous) update.

React did not have to be told, it inferred the urgency from the event that triggered the update.

This is the bridge between the event system and the rendering engine: the event system is the _source_ of priority for interaction-driven updates, and the lanes and scheduler from the rendering guide are what _act_ on that priority.

This is also the mechanistic underpinning of the concurrency features from the Hooks and rendering guides.

`useTransition` lets you _lower_ an update's priority below the discrete level even inside a discrete event handler (marking it a non-urgent transition), precisely because the default for a discrete event is high, and sometimes you want the expensive part of a click's work to be interruptible.

So the priority the event assigns is the _default_, and transitions are how you deliberately override it downward.

Understanding that the event system sets a default priority based on event type makes the concurrency features legible: they are adjustments to a priority that the event already established.

So the event system is doing more than routing: it is the entry point where a user interaction becomes a _prioritized_ React update, and that priority is what lets React keep clicks instant while letting mouse-move-driven work yield.

The next section adds the other half of what the event system does to your updates: batching.

### Try it

> Build a component with an expensive render driven by `mousemove` state and a separate counter button. Move the mouse rapidly over the area (flooding low-priority updates) and, in the middle of that, click the counter. Notice the click still responds promptly, because its discrete-priority update outranks the continuous `mousemove` updates. You are feeling the event system's priority classification flow into the scheduler.

### You've got this if

You can explain why a `setState` in an `onClick` is treated as more urgent than a `setState` in an `onMouseMove`, in terms of the event system assigning priority that feeds the lanes.

---

## 9. Events trigger updates: batching and the render connection

Prereqs: Section 8.

From the Hooks guide: the update queue (setState enqueues an update) and batching (Section 4), recapped here.

From the rendering guide: that React renders once per batch.

### The itch

You call `setState` three times in one click handler, and the component renders once, not three times, with all three updates applied.

You learned this as "React batches," but where does the batching actually happen?

It happens in the event dispatch: the event handler is the boundary React batches around.

### The short version

Event handlers are the canonical place `setState` is called, and the event dispatch is where React batches the resulting updates.

When your handler runs, React is inside a batching context: every `setState` you call enqueues an update (the update queue from the Hooks guide) rather than rendering immediately, and when your handler (and the other handlers for that event) finish, React flushes all the enqueued updates as _one_ render, at the event's priority (Section 8).

So three `setState` calls in one click produce one render.

React 18 extended automatic batching to everywhere (promises, timeouts), but the event handler remains the prototypical batched context.

### How it actually works

Here is the smallest batching experiment:

```jsx
function BatchedCounter() {
    const [count, setCount] = useState(0);
    console.count("render");

    function handleClick() {
        setCount((value) => value + 1);
        setCount((value) => value + 1);
        setCount((value) => value + 1);
    }

    return <button onClick={handleClick}>{count}</button>;
}
```

Recall two things from the Hooks guide, recapped here.

First, `setState` does not render immediately.

It _enqueues_ an update on the component's update queue and asks React to schedule a render.

Second, React _batches_: multiple updates scheduled together are folded into a single render rather than rendering once per `setState`.

This section is about where, in the event flow, that batching boundary sits, because the event handler is the original and clearest example of it.

When React dispatches an event (Section 5) and calls your handler(s), it does so inside a _batching context_.

The sequence is:

1. React begins dispatching the event and enters a batched context.
2. It calls the collected handlers (Section 6). Inside them, you call `setState` as many times as you like. Each call enqueues an update on the relevant component's queue and marks that work is pending, but does _not_ trigger a render yet, because React is batching.
3. When all the handlers for this event have finished, React _flushes_: it processes the enqueued updates and performs a single render that reflects all of them, at the priority the event established (Section 8).

So three `setState` calls in one `onClick` enqueue three updates and then flush together as one render.

This is why the component renders once, not three times, and why (with the updater form, Hooks guide Section 4) the three updates compose correctly within that single flush.

The event handler is the batching boundary: everything you do synchronously inside it is collected and applied together.

This connects the entire event system to the rendering engine, completing the picture.

An event arrives, React dispatches it (Sections 5 and 6), your handler runs and calls `setState`, those updates are tagged with the event's priority (Section 8) and _batched_ (this section), and then React's scheduler renders once at that priority, running the render and commit phases from the rendering guide.

So the event system is the _front door_ to React's update pipeline: it is where a user interaction becomes one or more prioritized, batched updates that flow into the scheduler.

Without the event system, a `setState` would have no event-derived priority and no natural batching boundary.

With it, every interaction produces a clean, single, appropriately-urgent render.

A note on the history, because it explains advice you may have seen.

Before React 18, this automatic batching happened _only_ inside React event handlers.

If you called `setState` multiple times inside a promise callback, a `setTimeout`, or a native event handler, React did _not_ batch them, and you got multiple renders.

React 18 introduced _automatic batching everywhere_: now updates are batched regardless of where they originate (promises, timeouts, native handlers, as well as React event handlers).

So the special status of the React event handler as "the place batching happens" is now less special.

Batching is universal.

But the React event handler remains the prototypical case and the easiest place to see batching clearly, and it is still where interaction-driven updates get their priority.

The escape hatch, if you ever need a `setState` to flush synchronously and immediately rather than batch (rare, usually to read the resulting DOM before the next line), is `flushSync`, which opts out of batching for that update.

Reach for it only when you genuinely must observe the committed result mid-handler.

### Try it

> In a click handler, call three different `setState` calls and put a `console.log` in the component body. Confirm one render (one log) with all three updates applied. Then move the three `setState` calls into a `setTimeout` inside the handler and confirm, in React 18+, they still batch into one render (automatic batching everywhere). Finally wrap one in `flushSync` and watch an extra render appear, the batching boundary opened on purpose.

### You've got this if

You can explain why three `setState` calls in one event handler cause a single render, in terms of the handler being a batching boundary that flushes one render at the event's priority.

---

## 10. Portals: events bubble through the React tree

Prereqs: Section 6 (propagation follows the fiber tree).

Outside React: `createPortal`, and that a portal renders DOM into a different part of the document while keeping the component in the React tree.

### The itch

You render a modal with `createPortal` so its DOM lands at the end of `document.body`, escaping a parent's `overflow: hidden`.

Then a click inside the modal triggers an `onClick` on the component that _rendered_ the portal, even though, in the real DOM, the modal is nowhere near that component.

It looks like the event teleported.

It did not.

It followed the React tree, exactly as Section 6 said.

### The short version

A portal renders a component's DOM into a different location in the real DOM, while keeping the component in the React tree where you wrote it.

Because React propagates events by walking the _fiber_ tree (Section 6), not the DOM tree, an event inside a portal bubbles to the portal's _React_ ancestors (the component that rendered the portal and its parents), not to the portal's _DOM_ ancestors (wherever the portal node actually sits).

This is the cleanest demonstration of fiber-tree dispatch: the DOM and React trees diverge, and events follow React's.

### How it actually works

A portal (created with `createPortal(children, domNode)`) is React's mechanism for rendering a component's DOM output into a _different_ part of the real DOM than where the component sits in the tree.

The classic use is a modal, tooltip, or dropdown that must visually escape a parent's clipping (`overflow: hidden`) or stacking context: you render it via a portal into `document.body` so its DOM is a top-level element, even though you wrote the modal component deep inside some other component.

The crucial property of a portal is the split it creates: the portal's DOM lives where you sent it (say, the end of `body`), but the portal's _component_ stays in the React tree exactly where you wrote it (inside, say, your `Sidebar`).

The fiber tree and the DOM tree now disagree about where the modal is.

Section 6 established that React propagates events by walking the _fiber_ tree.

Apply that to a portal and the behavior follows immediately.

When the user clicks something inside the portaled modal:

1. The native click fires on the modal's DOM node and bubbles up the _real DOM_, which means it bubbles through the modal's DOM ancestors (`body` and up), since that is where the modal's DOM actually lives. It still reaches React's root container listener (Section 5), because the container is an ancestor in the DOM.
2. React finds the target fiber (the clicked element's fiber) and walks _up the fiber tree_ to collect handlers (Section 6). But in the fiber tree, the modal's parent is the component that _rendered the portal_ (the `Sidebar`), not `body`. So React's walk goes from the clicked element, up through the modal's React ancestors, _through the component that rendered the portal_, and up to the root.
3. React fires the collected handlers along _that_ path. So an `onClick` on the `Sidebar` (or any React ancestor of the portal) _does_ fire, even though the modal's DOM is not inside the `Sidebar`'s DOM at all.

So the event "bubbles" to the portal's React parent, which is exactly what you would expect if you think in terms of the component tree you wrote, and exactly what surprises you if you think in terms of the DOM.

From React's perspective, the modal is a child of the `Sidebar` (that is where you wrote it), so events inside the modal bubble to the `Sidebar`.

The fact that the DOM put the modal under `body` is irrelevant to React's propagation, because React walks fibers.

This is the single most illustrative consequence of fiber-tree dispatch, and once you see it as "React propagation follows the tree you wrote, not the DOM," it stops being magic.

The practical implications are worth spelling out, because they cut both ways:

- **React handlers on ancestors catch portal events.** If you have an `onClick` on a container that conceptually owns the modal, it will fire for clicks inside the portaled modal, which is often what you want (the modal is logically part of that subtree). Event delegation patterns that rely on a React ancestor handler keep working across the portal.
- **Native DOM listeners follow the DOM, not React.** A native listener attached to the modal's actual DOM parent (`body`, say) sees the click via _real_ DOM bubbling, on the DOM path. And a native listener on the React ancestor's DOM node does _not_ see it, because the modal's DOM is not inside that node. So if you mix portals with native listeners (Section 11), the two systems disagree about the path, which is a source of subtle bugs (the classic one: an outside-click handler attached natively to a wrapper does not detect clicks inside a portaled child, because the portal's DOM is outside the wrapper, even though React considers it inside).
- **`stopPropagation` in the modal stops the React walk to the React ancestors** (Section 7), which can be exactly how you prevent a portal's click from triggering an ancestor handler.

So portals are not a special case in the event system.

They are the case that reveals the rule.

The rule is Section 6: React events propagate along the fiber tree.

Portals are just the situation where the fiber tree and the DOM tree visibly differ, so the rule becomes observable.

Hold "React propagation follows the component tree you wrote" and portal event behavior is predictable rather than surprising.

### Try it

> Render a modal via `createPortal` into `document.body`, with the portal written inside a wrapper component that has an `onClick` logging "wrapper clicked." Click inside the modal and watch "wrapper clicked" fire, even though the modal's DOM is at the end of `body`, far from the wrapper. Then attach a native `addEventListener` to the wrapper's DOM node and confirm it does _not_ fire for the modal click (the DOM path does not include the wrapper). The divergence between the two is fiber-tree dispatch made visible.

### You've got this if

You can explain why a click inside a portaled modal triggers an `onClick` on the component that rendered the portal, and why a native listener on that component's DOM node does not see the same click.

---

## 11. React events versus native addEventListener

Prereqs: Sections 4, 5, and 7.

Outside React: `addEventListener` in a ref or effect, and the order native listeners fire in (capture down, then bubble up).

### The itch

You add a native `addEventListener` (in a ref or effect) alongside React's `onClick`, and the firing order is not what you expect: the native listener on a child runs _before_ React's handler, or a native listener seems to run "too early." Mixing the two systems has ordering rules that follow directly from where React's listeners live.

### The short version

React's delegated listeners live at the root container (Section 4), while a native listener you attach with `addEventListener` lives on the actual node.

So a native listener on a child node fires when the event passes _that node_ during native propagation, which is _before_ the event reaches React's root container and React dispatches.

The result inverts the common intuition: a native bubble listener on a child runs _before_ React's `onClick`, not after.

And a native `stopPropagation` on a child can prevent the event from reaching React's root at all, so React never fires (Section 7).

When you must use native listeners, reason about ordering from "React is at the root, native is at the node."

### How it actually works

Sometimes you must drop to native listeners: for _passive_ event listeners (Section 12, for scroll/touch performance, which React does not expose a simple option for), for listeners on `window` or `document` (global keyboard shortcuts, outside-click detection), for non-React-managed DOM (a third-party widget), or to interoperate with libraries.

You attach these the normal way, usually in an effect with a ref:

```js
useEffect(() => {
    const node = ref.current;
    const onNativeClick = (e) => console.log("native listener on the node");
    node.addEventListener("click", onNativeClick);
    return () => node.removeEventListener("click", onNativeClick);
}, []);
```

The moment you do this, you have two event systems handling the same click: the native one (your listener, on the actual node) and React's (your `onClick`, dispatched from the root container).

Their _ordering_ relative to each other follows entirely from _where each listener sits_, which Sections 4 and 5 already established.

The key fact: **React's listener is at the root container.

Your native listener is at the node.** Consider a native bubble listener on a child element and a React `onClick` on the same element.

When the user clicks:

1. The native event fires at the target and bubbles up the real DOM.
2. As it passes through the child node (early in the bubble, near the bottom), the browser runs _your native bubble listener on that node_. This happens while the event is still low in the DOM, far from the root.
3. The event continues bubbling up to the root container, where React's delegated listener finally catches it and React dispatches to your `onClick` (Section 5).

So the native listener on the child fires in step 2, and React's handler fires in step 3, which means **the native listener runs before React's `onClick`**, even though both are "on" the same element conceptually.

This inverts the intuition many people hold (that React handlers run first, or that handlers run in the order written), and it is purely a consequence of React's listener being up at the root while the native listener is down at the node.

The native one is encountered first during bubbling because it is lower in the tree.

This also explains the swallowing behavior from Section 7 in ordering terms.

If your native child listener calls `e.stopPropagation()`, it stops the native event from bubbling further up the real DOM.

But React's listener is _up at the root_, which the event must reach for React to dispatch.

So the native `stopPropagation` prevents the event from ever reaching React's root listener, and React's `onClick` _never fires_.

A native listener can not only run before React's handler but can prevent it entirely, by stopping the bubbling that React depends on.

And the reverse boundary from Section 7: React's `stopPropagation` (inside an `onClick`) stops React's own fiber-walk but does nothing to a native listener on `document`, because `document` is _above_ the root container (Section 4) and the event reaches it through native bubbling that React does not control.

So a native `document` listener fires regardless of React's `stopPropagation`.

The two `stopPropagation` directions are both explained by the same geometry: React at the container, native at the node or at `document`.

The practical guidance: when you mix native listeners with React handlers, decide the ordering deliberately by thinking about positions.

React handlers effectively run "at the root container" in bubble order.

Native listeners run "at their node." If you need a native listener to run _after_ React's logic, that is awkward with this geometry and usually a sign to restructure (do the work in the React handler instead).

Prefer React's event system for anything React manages, and reserve native listeners for the cases that genuinely require them (passive listeners, `window`/`document` scope, non-React nodes), accepting that those will interleave with React according to the root-versus-node positions.

Reason from geometry, not from order-written, and the surprises disappear.

### Try it

> On one element, put a React `onClick` and, via a ref and effect, a native `addEventListener('click', ...)`. Click it and observe the native listener logs _before_ the React handler (native at the node, React at the root). Then add `e.stopPropagation()` to the native listener and watch the React `onClick` stop firing entirely (the event never reaches React's root). Both results follow from where each listener lives.

### You've got this if

You can explain why a native `addEventListener` on a child fires before React's `onClick` on the same element, and why a native `stopPropagation` can prevent a React handler from running at all.

---

## 12. Event gotchas tied to the mechanism

Prereqs: Sections 2, 4, 6, and 11.

Outside React: native event names (`input` vs `change`, `focus` vs `focusin`, `mouseover` vs `mouseenter`), and passive listeners.

### The itch

A handful of React event behaviors seem arbitrary until you know the mechanism: `onChange` fires on every keystroke, `onScroll` does not bubble, `onFocus` _does_ bubble (unlike native focus), and `preventDefault` sometimes silently fails on wheel or touch.

Each one is a deliberate choice with a mechanical reason.

### The short version

Several React events differ from their naive native counterparts for good reasons: `onChange` is built on the native `input` event so it fires on every change (not on blur like native `change`).

`onScroll` does not bubble (matching the browser and avoiding distant-ancestor confusion).

`onFocus`/`onBlur` are built on `focusin`/`focusout` so they _do_ bubble (unlike native `focus`/`blur`).

`onMouseEnter`/`onMouseLeave` are synthesized to not bubble (over the bubbling `mouseover`/`mouseout`), and `preventDefault` can be ignored for passive listeners (wheel/touch).

Each is the event system giving you more useful semantics than the raw native event, and knowing the mechanism makes each predictable.

### How it actually works

Each of these is a case where React's _logical_ event (Section 2) deliberately differs from the naive native event, and the difference is a feature once you see why.

#### `onChange` is really the `input` event

Native `change` on a text input fires only when the input _loses focus_ after its value changed, which is rarely what React developers want.

They want to react to every keystroke (for controlled inputs, Hooks and State guides).

So React's `onChange` is built on the native `input` event, which fires on _every_ change to the value.

This is why your `onChange` runs on every keystroke, not on blur: React renamed the more-useful `input` behavior to the more-intuitive `onChange` name.

(In the source this is the `ChangeEventPlugin`.) If you specifically need the native blur-based change behavior, you would use the native event.

React's `onChange` is the per-keystroke one.

#### `onScroll` does not bubble

Since React 17, `onScroll` does not bubble (the changelog: "Don't emulate bubbling of the onScroll event").

The reason is that native scroll does not bubble in a useful way, and emulating bubbling caused confusion: a scroll inside a deeply nested scrollable element would fire `onScroll` handlers on distant ancestors that had nothing to do with that scroll.

Making `onScroll` not bubble matches the browser and removes that confusion.

The practical consequence: put your `onScroll` handler on the element that actually scrolls, not on an ancestor expecting to catch descendants' scrolls, because it will not bubble up to the ancestor.

**`onFocus` and `onBlur` _do_ bubble.** Native `focus` and `blur` famously do _not_ bubble, which makes it hard to catch focus changes on a container.

React solves this by building `onFocus`/`onBlur` on the native `focusin`/`focusout` events, which _do_ bubble (this was a React 17 change: "Use browser focusin and focusout for onFocus and onBlur").

So in React you _can_ put `onFocus`/`onBlur` on a parent and catch focus entering or leaving any descendant, which is the useful behavior and the opposite of naive native `focus`/`blur`.

Knowing this is built on `focusin`/`focusout` explains why React's focus events bubble when you might expect them not to.

**`onMouseEnter`/`onMouseLeave` are synthesized and do _not_ bubble.** The native bubbling mouse events are `mouseover`/`mouseout`, which bubble and fire repeatedly as the pointer moves over descendants, which is noisy.

The non-bubbling `mouseenter`/`mouseleave` semantics (fire once when entering or leaving an element and its subtree, do not bubble) are what you usually want for hover effects.

React provides `onMouseEnter`/`onMouseLeave` with those non-bubbling semantics, synthesized on top of the bubbling `mouseover`/`mouseout` native events (this is the `EnterLeaveEventPlugin`, and it is why Section 2 noted `onMouseLeave`'s `nativeEvent` is a `mouseout`).

So React gives you the cleaner enter/leave behavior by building it from the noisier native events.

#### `preventDefault` can be ignored for passive listeners

A _passive_ event listener promises the browser it will not call `preventDefault`, which lets the browser optimize scrolling performance (it does not have to wait to see whether you will cancel the scroll).

For high-frequency events like `wheel` and `touchmove`, listeners are often passive by default in modern browsers for exactly this reason.

The consequence: if the underlying listener is passive, calling `preventDefault` does nothing (the browser ignores it, sometimes with a console warning).

So if you need to _prevent_ scrolling or a touch default and find `preventDefault` silently not working, the cause is a passive listener, and the escape hatch is to attach a _native_, explicitly non-passive listener yourself (`addEventListener('wheel', handler, { passive: false })`, Section 11), because that is where you control the passive option.

The thread through all of these is that React's event system is not a thin pass-through of native events.

It is a layer that chooses the _most useful logical semantics_ for each event, sometimes by renaming a more-useful native event (`input` to `onChange`), sometimes by switching to a bubbling variant (`focusin` for `onFocus`), sometimes by suppressing emulated bubbling (`onScroll`), sometimes by synthesizing cleaner semantics (`onMouseEnter`).

Each "gotcha" is really React deciding the native default was not the most useful behavior.

Knowing which native event underlies each React event (via `e.nativeEvent`, Section 2) lets you predict these instead of memorizing them.

### Try it

> Add an `onChange` to a text input and confirm it fires on every keystroke (it is `input`, not native `change`). Put `onFocus` on a parent `div` and confirm it fires when a child input is focused (it bubbles, via `focusin`). Put `onScroll` on a parent of a scrollable child and confirm it does _not_ fire when the child scrolls (no bubbling). Each confirms the underlying-native-event mechanism.

### You've got this if

You can explain why `onChange` fires on every keystroke and why `onFocus` bubbles when native `focus` does not, in terms of the native events React builds each on.

---

## 13. Debugging the event system

Prereqs: the rest of the guide.

### The itch

An event will not fire, fires in the wrong order, reaches a surprising component, or `stopPropagation` does nothing.

You want to map each symptom to the mechanism and the fix, instead of trying things at random.

### The short version

Most event bugs are one of a small set, and each maps to a section.

The procedure: identify whether the problem is about _which handler fires_ (delegation, fiber-tree propagation, portals), _ordering_ (React at the root versus native at the node), _propagation control_ (the two `stopPropagation` worlds), or _event semantics_ (the gotchas).

Inspect the real DOM to see where listeners actually are, and remember that React propagation follows the fiber tree, not the DOM.

### How it actually works

Walk the symptoms.

#### A handler does not fire at all

Several mechanism-specific causes: the event does not bubble in React (`onScroll`, Section 12, so a handler on an ancestor never sees a descendant's scroll), put it on the scrolling element.

A native listener below stopped propagation before the event reached React's root (Sections 7 and 11), so React never dispatched, check for native `addEventListener` with `stopPropagation` on a descendant.

Or the event name/semantics are not what you think (you expected native `change` semantics but `onChange` is `input`, Section 12).

#### Handlers fire in an unexpected order, especially mixed with native listeners

This is the root-versus-node geometry (Section 11): a native listener on a node fires during native bubbling at that node, _before_ the event reaches React's root container where React dispatches.

So native-on-child runs before React's `onClick`.

Reason from where each listener lives, not from order written.

#### An event reaches a component whose DOM is elsewhere (or does not reach one whose DOM contains it)

Portals (Section 10): React propagation follows the fiber tree, so a portal's events bubble to its React ancestors, not its DOM ancestors.

A native listener, following the DOM, sees the opposite.

The classic case is an outside-click handler attached natively to a wrapper failing to detect clicks in a portaled child (the child's DOM is outside the wrapper).

Fix by handling it in React (which considers the portal inside) or by accounting for the portal in the native check.

#### `stopPropagation` does not stop what you expected

The two-systems issue (Section 7): React's `stopPropagation` stops React's fiber walk (ancestor React handlers) but not native listeners on `document` (which is above the root container, Section 4).

A native listener's `stopPropagation` stops native bubbling, which can starve React's root listener.

Identify which system your handler is in and which system the listener you wanted to stop is in.

They are usually different.

#### `preventDefault` silently does nothing on wheel or touch

A passive listener (Section 12) ignores `preventDefault`.

Attach a native non-passive listener for that case.

#### An event came back blank when read asynchronously

That was event pooling (Section 2), removed in React 17.

If you genuinely see this, you are on a pre-17 React.

On any modern React it cannot happen, so the cause is something else.

#### A new React copy or version broke another's events

Pre-17 `document`-level delegation interference (Section 4).

React 17+ scopes listeners to each root container, which fixes this.

If you see it, something is still on `document` or you are on an old version.

To debug any of these, two habits help.

First, _inspect the real DOM_ to see where listeners actually are (your nodes have none, and the root container has React's, you can see your own native ones), which grounds you in the geometry.

Second, _think in two trees_: the DOM tree (where native propagation and native listeners live) and the fiber tree (where React propagation lives), and ask which tree the behavior you are seeing follows.

Almost every confusing event behavior is the two trees, or the two propagation systems, diverging, and naming which one you are in resolves it.

#### The closing synthesis

React's event system is a layer between the browser's native events and your components, and almost everything it does follows from two facts: it _delegates_ (a small set of real listeners at the root container, not one per node, since React 17), and it _dispatches by walking the fiber tree_ (reconstructing capture and bubble propagation over the component hierarchy you wrote, rather than relying on the DOM).

From the first fact come delegation's efficiency, the root-container location and its isolation benefits, and the ordering geometry when you mix in native listeners (React at the root, native at the node).

From the second come capture-and-bubble ordering, the behavior of `stopPropagation` within React, and the portal behavior that is the rule's clearest demonstration (events follow the fiber tree even when the DOM tree diverges).

On top of those, the synthetic event gives you a consistent cross-browser object (no longer pooled, so freely usable asynchronously) with sometimes-more-useful semantics than the raw native event (`onChange` as `input`, `onFocus` as `focusin`, non-bubbling `onScroll` and `onMouseEnter`).

And the system is not just routing: it is where each interaction is assigned a _priority_ (discrete versus continuous) that feeds React's lanes, and where the resulting `setState` updates are _batched_ into a single prioritized render.

So the event system is the front door to React's update pipeline, turning a user gesture into a consistent, prioritized, batched update that flows into the renderer, and every event surprise you will hit is one of these mechanisms (delegation location, fiber-tree propagation, the two `stopPropagation` worlds, or chosen semantics) showing through.

### Try it

> Take a real event bug (or reproduce one above), and before changing anything, classify it: is it about _which_ handler fires (propagation/portals), _ordering_ (root versus node), _propagation control_ (which `stopPropagation` world), or _semantics_ (a gotcha)? Then inspect the DOM to confirm where the listeners are, and apply the matching fix. Doing this on two or three bugs makes the classification reflexive.

### You've got this if

You can take "my `stopPropagation` does not work" or "my portal's click reached a surprising component" and name the mechanism and the fix without guessing.

---

## 14. Reading the source

Prereqs: the rest of the guide, plus comfort reading JavaScript.

This is a pass 3 section.

There is no rush.

### The itch

You have the model.

Now you want to see the event system in React's actual code: the single dispatch entry, the plugins that build each logical event, the fiber-tree walk that collects handlers, and the priority classification.

### The short version

The event system lives in the `react-dom` package, mostly under its events directory.

The pieces map cleanly onto this guide: a dispatch entry that catches delegated events, a plugin system that turns native events into the logical React events, a fiber-tree walk that collects handlers for the two phases, eager listener registration at the root, and a priority classifier that feeds the lanes.

### How it actually works: the reading order

In `react-dom`, look for these, roughly in the order an event flows:

`listenToAllSupportedEvents` (in `DOMPluginEventSystem.js`) is where React, when a root mounts, attaches the delegated listeners for all supported event types to the root container (Sections 3 and 4).

This is "attach all known event listeners when the root mounts" from the React 17 changelog.

`dispatchEvent` and the listener wrapper in `ReactDOMEventListener.js` are the entry point: the function React's delegated listener calls when a native event fires at the root (Section 5).

This is where dispatch begins, and where the event's priority is established.

`getEventPriority` (in `ReactDOMEventListener.js`) is the priority classifier from Section 8: it maps each native event type to a priority (the discrete events like `click` and `keydown` to the highest, the continuous ones like `mousemove` and `scroll` to a lower one, others to default), which becomes the lane of any update the handler schedules.

The **plugin system** is the heart of how logical events are built.

`DOMPluginEventSystem.js` coordinates a set of plugins, each responsible for a family of events: `SimpleEventPlugin` (the straightforward ones like click and keydown), `ChangeEventPlugin` (the `onChange`-as-`input` behavior, Section 12), `EnterLeaveEventPlugin` (the synthesized non-bubbling `onMouseEnter`/`onMouseLeave`, Section 12), `SelectEventPlugin`, and `BeforeInputEventPlugin`.

Reading a plugin shows you how a native event becomes a `SyntheticEvent` with React's chosen semantics.

`accumulateSinglePhaseListeners` (and the two-phase accumulation logic) in `DOMPluginEventSystem.js` is the fiber-tree walk from Sections 5 and 6: starting from the target fiber, it walks up the tree collecting the handlers for the event, which React then fires in capture and bubble order.

This is the literal implementation of "propagation follows the fiber tree."

`getClosestInstanceFromNode` (and the internal `__reactFiber$...` property on DOM nodes) is how React gets from a native event's target DOM node to its fiber (Section 5).

The `__reactFiber$` key is the pointer you can inspect in DevTools.

The `SyntheticEvent` construction (the synthetic event factory) is where the wrapper from Section 2 is built around the native event, with the normalized interface and the `nativeEvent` reference.

Pair this with the React 17 blog post on the delegation change for the _why_ behind the root-container move (Section 4), and the SyntheticEvent reference for the per-event details (Section 12).

### Try it

> In DevTools, select a DOM node React rendered and look in its properties for keys starting with `__reactFiber$` and `__reactProps$`: the first is the node-to-fiber pointer from Section 5, the second holds the props (including your handlers) React stored. Finding your `onClick` on the `__reactProps$` key, and the fiber pointer next to it, is seeing the two things dispatch needs, sitting right on the DOM node.

### You've got this if

You opened the `react-dom` events code (or even just inspected a node's `__reactFiber$` and `__reactProps$` keys) and recognized a piece named in this guide.

---

## Further reading (primary sources)

When you want to go past this guide, these are the canonical sources, each with a note on how it relates to what you read here and how current it is.

**The React 17 announcement and its event-delegation section, at https://legacy.reactjs.org/blog/2020/10/20/react-v17.html (and the release candidate post with the detailed delegation explanation at https://legacy.reactjs.org/blog/2020/08/10/react-v17-rc.html).** This is the primary source for Section 4: why React moved delegation from `document` to the root container, with the multiple-versions-on-one-page motivation.

It is on the legacy docs site because it dates to React 17, but the change it describes is exactly the behavior in the current React 19 line, so it is accurate for today.

### The SyntheticEvent and event-object reference

The current React docs document the event object as part of common component props, at https://react.dev/reference/react-dom/components/common (see the "React event object" section), which covers `preventDefault`, `stopPropagation`, `nativeEvent`, and the event types for Sections 2, 7, and 12.

The older but more exhaustively enumerated reference at https://legacy.reactjs.org/docs/events.html lists every synthetic event and notes behaviors like `onScroll` not bubbling and the `onMouseLeave`-is-`mouseout` detail.

It is framed for React 16 to 17 but the event-object facts remain accurate.

### "Responding to Events," at https://react.dev/learn/responding-to-events , and the propagation section it links to

The official current-docs introduction to event handling, capture and bubble phases, `stopPropagation`, and `preventDefault` (Sections 6 and 7), written for the React 19 line.

### `createPortal`, at https://react.dev/reference/react-dom/createPortal

The reference for portals, which explicitly documents that events from a portal propagate to React-tree ancestors rather than DOM-tree ancestors (Section 10).

Current.

### The React source (pass 3)

in the `react-dom` package under its events directory: `DOMPluginEventSystem.js`, `ReactDOMEventListener.js`, and the individual plugins (`SimpleEventPlugin`, `ChangeEventPlugin`, `EnterLeaveEventPlugin`), per Section 14.

This is the ground truth.

Everything above is a reading of it.

The acdlite and React-team explanations of the fiber architecture (linked from the rendering guide's further reading) give the surrounding context for the fiber tree that dispatch walks.

A good way to use all of these: read the relevant deep section here first so you have the model and the vocabulary, then read the primary source, then come back.

This guide gives you the two load-bearing ideas (delegation at the root container, and dispatch by walking the fiber tree) and traces every behavior back to them.

The primary sources give the per-event details and the historical reasoning.

---

Built to be climbed, not swallowed.

Finish pass 1 and you are already ahead.

Come back for the deep parts when a real event surprise (a dead handler, a wrong order, a portal click, a stubborn `stopPropagation`) gives you a reason to care, and run the experiments with the DOM inspector open, because the geometry of where listeners live is the thing you have to see to believe.

Every version-specific claim (delegation on the root container and no event pooling since React 17, `onScroll` not bubbling, `onFocus`/`onBlur` on `focusin`/`focusout`) reflects the React 19.2.x line in 2026.

The core model (a small set of delegated listeners at the root, dispatching by walking the fiber tree, assigning priority and batching the resulting updates) has been stable since React 17 and is not going anywhere.

This is the first Track A engine-internals guide.

It is pure React, and it connects to the rendering guide's fiber tree, lanes, and batching at every turn.
