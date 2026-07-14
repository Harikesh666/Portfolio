---
title: "React Rendering and Reconciliation Internals"
description: "A guided deep dive into how React turns state into UI, compares trees, and keeps updates responsive."
category: "Foundation"
readTime: "45 min read"
date: "May 2026"
publishedAt: "2026-05-01"
order: 1
series: "react-internals"
---

> Current as of React 19.2.x (latest patch 19.2.6, May 2026), with the React Compiler 1.0 stable (October 2025). Version-specific behavior is noted inline.

> **What this guide builds on.** This is the foundational guide of the series, the rendering engine every other guide stands on, so it assumes no earlier guide. It builds only on outside knowledge: JavaScript (functions, closures, objects, `Object.is`), the DOM (nodes, the document tree, and the fact that changing it is expensive), and a few general computer-science ideas (trees, linked lists, queues, and a little bitwise arithmetic when lanes arrive). Everything React-specific is built from scratch here. The later guides (Hooks and Effects, State Management, Data Fetching, Performance, the Event System, Scheduler and Lanes, Error Boundaries, Suspense, and Server Components) reach back to the concepts defined here, so this is the guide they name in their own "What this guide builds on" blocks. The per-section **Prereqs** lines name what each section needs, drawn from earlier sections here and from outside knowledge.

## Read this first (it will save you from drowning)

This guide goes deep. That is on purpose. But deep does not have to mean overwhelming, as long as you read it the right way. The trick is that **you are not supposed to absorb all of this in one sitting.** Nobody does. Here is the method that actually works.

**Read it in three passes.**

**Pass 1, one relaxed sitting (about 30 to 40 minutes).** Read only the two short parts at the top of each section: **"The itch"** and **"The short version."** Skip everything labeled "How it actually works." When you finish, you will have a complete mental map of how React renders, you will understand the cause of most of the bugs you have already hit, and you will know the vocabulary. That alone makes you noticeably better at your job. This pass is the whole point. Do not skip ahead into the deep parts on pass 1, even if you are tempted. Getting the map first is what keeps the deep parts from feeling like a wall.

**Pass 2, spread over weeks, driven by your real work.** When you hit something at work that one of these sections explains, come back and read its **"How it actually works."** A bug with a list that scrambled after sorting? Read the deep part of Section 6. An input that keeps losing focus? Section 5. A laggy search box? Sections 11 and 14. Reading the deep material right when you have a real reason to care is what makes it stick. Reading it cold makes it evaporate.

**Pass 3, someday, when you are curious.** Section 19 points you into React's actual source code. That is for the day you want to see the machinery with your own eyes. There is no rush.

**Two rules that multiply everything.**

1. **Run the experiments.** Each section ends with a short **"Try it."** A bug you have personally caused and watched happen is a bug you will never ship. Reading about it is worth maybe a tenth as much. Keep a throwaway React project open (a Vite scratch app, or any sandbox) and actually reproduce each one. It takes two minutes and it is the difference between knowing this and forgetting it.
2. **Trust the order.** The sections build on each other. If something feels arbitrary, the reason is almost always in an earlier section, so go back rather than push forward. Here is the build order, so you can see why:

```
   What problem are we even solving?            (1)
            │
   What are the things we're moving around?     (2, 3, 4)
            │
   The diff: how React decides what changed      (5, 6)   ◀── most everyday bugs live here
            │
   Fiber: the data structure that makes it      (7, 8)
   pausable
            │
   The two phases + the loop                     (9, 10)
            │
   Doing it without freezing the page            (11, 12) ◀── the "concurrent" stuff
            │
   How your hooks and state actually work        (13, 14)
            │
   Suspense, StrictMode, and the 2026 features   (15, 16, 17)
            │
   Debugging like you understand all this        (18, 19)
```

Each section also opens with a one-line **Prereqs** note: the earlier sections it leans on (here, and occasionally another guide in the series) plus any outside knowledge worth having first. Sections that need nothing past basic React and JavaScript say so.

You do not need to finish this guide to benefit from it. Finish pass 1 and you are already ahead. Everything after that is gravy you collect over time.

---

## Table of Contents

1. [What rendering actually is](#1-what-rendering-actually-is)
2. [Elements, components, instances](#2-elements-components-instances)
3. [The "Virtual DOM," demystified](#3-the-virtual-dom-demystified)
4. [How React talks to the screen (the reconciler/renderer split)](#4-how-react-talks-to-the-screen-the-reconcilerrenderer-split)
5. [The diff: React's two big assumptions](#5-the-diff-reacts-two-big-assumptions)
6. [Keys and lists (where most bugs live)](#6-keys-and-lists-where-most-bugs-live)
7. [Fiber: the object that makes pausing possible](#7-fiber-the-object-that-makes-pausing-possible)
8. [Two trees at once (double buffering)](#8-two-trees-at-once-double-buffering)
9. [Render phase vs. commit phase](#9-render-phase-vs-commit-phase)
10. [The work loop](#10-the-work-loop)
11. [Not freezing the page (concurrent rendering)](#11-not-freezing-the-page-concurrent-rendering)
12. [Lanes (how React ranks urgency)](#12-lanes-how-react-ranks-urgency)
13. [How hooks actually store your state](#13-how-hooks-actually-store-your-state)
14. [State updates and a bug called tearing](#14-state-updates-and-a-bug-called-tearing)
15. [Suspense, mechanically](#15-suspense-mechanically)
16. [Why StrictMode runs things twice](#16-why-strictmode-runs-things-twice)
17. [The 2026 layer: Compiler, Activity, View Transitions](#17-the-2026-layer-compiler-activity-view-transitions)
18. [Debugging with this knowledge](#18-debugging-with-this-knowledge)
19. [Reading the source (pass 3)](#19-reading-the-source-pass-3)

---

## 1. What rendering actually is

*Prereqs: basic React (you have written a component). Outside React: that the DOM is the browser's live tree of elements, and the rough sense that changing it is expensive.*

**The itch.** You change a piece of state, and the right part of the screen updates. You did not tell React which DOM nodes to touch. How does it know? And why does everyone say it is "fast" when it seems like it is doing a lot of work?

**The short version.** React's whole job is captured in one idea: `UI = f(state)`. You write a function that, given the current state, returns a description of what the screen should look like. When state changes, React re-runs your function to get a new description, compares it to the old one, and changes only the real DOM that differs. That comparison is called **reconciliation**, and it is the thing everything else in this guide exists to support. The "fast" claim is a bit of a myth, and the honest version of it is in the deep part below.

**How it actually works.**

Imagine the dumbest possible way to keep a screen in sync with your data: every time anything changes, delete the entire UI and rebuild it from scratch. This is a disaster, and understanding exactly *why* it is a disaster tells you what React is really for. Four separate things go wrong:

1. **DOM mutation is slow.** Creating nodes, recalculating layout, repainting: these are among the slowest things a browser does. Doing all of it on every keystroke would be unusable.
2. **The DOM holds state that is not in your data.** The text in an uncontrolled input, the scroll position of a list, which element has focus, the user's text selection, a video's playback position, the pixels on a canvas. Destroy the node and all of that is gone, even though your data never touched it.
3. **Animations live on specific nodes.** Recreate the node and the CSS transition restarts or disappears.
4. **It does not scale.** The cost would grow with the size of the whole app on every change, instead of with the size of the change.

So the real problem is not "draw the UI." It is: *given an old description and a new one, find the smallest set of real DOM changes that turns old into new, and apply them correctly and fast.* That is reconciliation, and it is genuinely hard. Comparing two arbitrary trees to find the minimum set of edits is a known computer-science problem (tree edit distance), and the optimal solutions run in about O(n^3) time. For a tree of a few thousand nodes that is billions of operations per update. Impossible to do constantly.

React's masterstroke is to **refuse to solve the hard version.** Instead it makes two assumptions about UI specifically (Section 5) that drop the cost to O(n), linear in the number of nodes, at the price of occasionally not finding the theoretically smallest diff. That trade, "good and linear" over "perfect and cubic," is the most important decision in the entire system, and the `key` prop you have used a hundred times is a direct consequence of it.

About "fast": diffing two JavaScript trees and then updating the DOM is *not* magically faster than a careful hand-written DOM update. For one tiny change, hand-written wins. What React actually buys you is that you get to write declaratively (describe the end state, forget the steps) and still get reasonable updates, plus React gains a data structure it can pause, prioritize, and resume. The real modern speed wins come from that scheduling, not from the diff.

> **Try it.** Open any React app, open DevTools, and watch the Elements panel while you interact. You will see individual attributes and nodes change, not the whole tree blink away and come back. That selective change is reconciliation doing its job.

**You've got this if** you can explain why "just rebuild everything" is a bad idea using more than just "it's slow."

---

## 2. Elements, components, instances

*Prereqs: Section 1. Outside React: the difference between a function, a call to that function, and the value it returns, plus plain JavaScript objects.*

**The itch.** People say "component" to mean three different things and it muddies everything. Getting these three words straight quietly fixes a lot of confusion later.

**The short version.** A **component** is the function you write (a recipe). When it runs, it returns **elements**, which are tiny plain objects describing what you want on screen (not real DOM, just descriptions). An **instance** is one live occurrence of a component in the tree, with its own state. For function components there is no instance object you can point at; that per-occurrence state lives on something called a **fiber** (Section 7). Recipe, description, live occurrence. Keep them separate.

**How it actually works.**

A **React element** is a plain, immutable object. When you write `<button className="primary">Save</button>`, a compile-time transform turns it into a call that produces roughly:

```js
{
  $$typeof: Symbol.for('react.transitional.element'), // a security guard, see below
  type: 'button',        // a STRING for host elements; a FUNCTION/CLASS for your components
  key: null,
  ref: null,             // in React 19, ref is just a normal prop now
  props: { className: 'primary', children: 'Save' },
}
```

Things worth actually knowing about this object:

- **It is immutable and cheap.** Every render makes brand-new element objects. This is what makes it safe for React to hold last render's elements and compare against them.
- **`$$typeof` is a real Symbol on purpose.** A Symbol cannot survive `JSON.parse`, so if some user input got serialized into something that merely *looks* like an element, React can check `$$typeof`, see it is fake, and refuse to render it. That closes off a class of injection attacks.
- **`type` tells you the kind.** A string like `'div'` means a **host element** (the renderer knows how to make a real node for it). A function or class means a **composite element** (React has to call it to find out what it produces).
- **The JSX transform since React 17** emits calls to `jsx()` from `react/jsx-runtime`, which is why you no longer need `React` in scope just to write JSX.
- **`ref` is a normal prop in React 19.** You no longer need `forwardRef` to pass a ref through a function component for new code.

A **component** is the recipe (`f` in `UI = f(state)`). The same recipe gets instantiated in many places. An **instance** is one concrete occurrence. Class components have a real instance object (`this`). Function components do not; their state lives on the fiber, React's internal record of "this element, at this position, across renders."

The chain of meaning, which is worth memorizing:

```
You write a component (recipe)
  → it returns elements (descriptions)
    → React reconciles those elements against the existing fibers (the live instances + state)
      → React mutates host nodes (the real DOM)
```

When someone says "the component re-rendered," what physically happened is: React called your function again, got fresh element objects, and reconciled them against fibers that already exist. Your function never touched the DOM. Reconciliation did, only where things differed.

> **Try it.** In a component, `console.log(<div className="x" />)` and look at the printed object. That object is an "element." Notice it has no methods, no DOM, nothing live. It is just a description.

**You've got this if** you can say, in one sentence each, what a component, an element, and an instance are, and which one your DOM nodes come from.

---

## 3. The "Virtual DOM," demystified

*Prereqs: Sections 1 and 2. Outside React: nothing past the idea of comparing two versions of a data structure to find what changed.*

**The itch.** "Virtual DOM" sounds mystical, like React keeps a magic shadow copy of the page. People repeat the phrase without being able to define it.

**The short version.** The "Virtual DOM" is just the tree of those cheap element objects from Section 2, plus the internal tree React keeps of what is currently on screen. React does **not** compare against the real DOM. It compares its own previous tree against its own new tree, and the DOM is only the output. The Virtual DOM is not inherently fast; its real value is letting you code declaratively while React schedules the updates.

**How it actually works.**

Two myths to kill, because they cause real misunderstanding:

- **Myth: React diffs its tree against the live DOM.** It does not. React never reads the live DOM to figure out what changed. It compares its previous element/fiber tree against the new one. The browser's DOM is purely a destination, never a source for the diff.
- **Myth: the Virtual DOM is faster than touching the DOM.** For a single small change, a hand-written DOM update is faster, because React does diffing work the expert skipped. The Virtual DOM's payoff is ergonomics (write declaratively, get sane updates) plus giving React something it can batch, pause, and prioritize. That scheduling is where modern performance wins come from.

Honest one-liner: the Virtual DOM is a programming model where you pretend to rebuild the whole UI every render, and a reconciler turns that pretense into a few real mutations.

> **Try it.** Nothing to run here. Just notice that you have never written code that reads the DOM to decide what to re-render. You describe the end state; React figures out the diff. That asymmetry *is* the Virtual DOM idea.

**You've got this if** you can correct a friend who says "the Virtual DOM is a fast copy of the real DOM."

---

## 4. How React talks to the screen (the reconciler/renderer split)

*Prereqs: Sections 2 and 3. Outside React: the idea that one piece of logic can target different outputs through a shared interface (a browser DOM, a native view, a test renderer).*

**The itch.** Why do `useState`, `useEffect`, and Suspense work *identically* in React for the web and React Native, two completely different output targets?

**The short version.** React is split into two layers. The **reconciler** owns all the smart stuff (the diff, hooks, scheduling) and knows nothing about the DOM. The **renderer** (`react-dom`, or `react-native`) is a thin platform-specific layer that knows how to actually create and change nodes. They talk through a fixed set of functions called the **host config**. Because all the cleverness is in the platform-agnostic reconciler, it behaves the same everywhere.

**How it actually works.**

The reconciler (`react-reconciler`) owns the algorithm, fibers, lanes, scheduling, hooks, Suspense, and transitions. It is completely ignorant of the DOM. The renderer supplies a set of "here is how you actually make and change a node on my platform" functions, the **host config**, such as:

```
createInstance(type, props)         // 'div' → a real <div>
createTextInstance(text)            // a text node
appendChild / insertBefore / removeChild   // structural changes
commitUpdate(instance, ...)         // apply a computed prop change to a node
```

There are renderers for the DOM, React Native, canvas, the terminal, PDFs, and test environments. Swap the renderer, keep the reconciler, and every hook and feature still works, because they live above the host config. When you read React source and see names starting with `Host` (`HostComponent` for `'div'`, `HostText` for text, `HostRoot` for the root), that is the line where the platform-agnostic brain hands off to the platform-specific hands.

> **Try it.** Skim the npm page for a niche renderer like `react-three-fiber` (React for 3D scenes) or `ink` (React for command-line UIs). Same hooks, same components, totally different output. That is the split in action.

**You've got this if** you can explain why a custom React renderer for, say, a drawing canvas would still support `useState` without that renderer implementing `useState` itself.

---

## 5. The diff: React's two big assumptions

*Prereqs: Sections 3 and 4. Outside React: why comparing two arbitrary trees exactly is expensive in general, which is what forces React to use heuristics.*

**The itch.** You have probably seen an input mysteriously lose its text or focus when a parent re-renders, or a whole section reset itself for no obvious reason. This section is the cause.

**The short version.** When React compares old and new at the same spot, it uses two rules. **Rule 1: if the element type is the same** (both `'div'`, or both the same component), reuse the existing thing and just update props. **If the type is different**, throw the whole old subtree away and build the new one from scratch, *losing all its state.* **Rule 2: within a list, a `key` tells React which item is which** across renders. These two rules are the whole diff, and they are why the bugs above happen.

**How it actually works.**

React walks the new tree against the old one. At each position it decides: reuse-and-update, replace, create, or delete. The linear (O(n)) speed comes entirely from two assumptions.

**Assumption 1: different types produce different trees.**

- **Same `type`** → keep the fiber and the real DOM node, update only the changed props, recurse into children.
- **Different `type`** (`'div'` to `'span'`, or `ComponentA` to `ComponentB`) → no attempt to find similarities. Tear down the entire old subtree (unmount everything, run cleanups, destroy nodes) and build the new one fresh.

The consequence to burn into memory: **changing the type at a position discards all state below it.** `condition ? <Editor/> : <Viewer/>` with different component types means every flip unmounts one whole subtree and mounts the other, losing local state, focus, scroll, everything. Keep the type stable and the state survives.

The bug this explains, which bites everyone at least once, is **defining a component inside another component's render:**

```jsx
// BUG: Row is a NEW function object on every render of Parent.
// New function object = different `type` = full remount every render.
// The input loses focus and its text on every single keystroke.
function Parent() {
  function Row() { return <input />; }
  return <Row />;
}
```

`Row` is redefined each render, so it is a different `type` each time, so React rebuilds it from scratch every time. Fix: define components at module scope, never inside another component.

**Assumption 2: keys identify siblings across renders.** Within a list, a `key` is your promise that "the element with this key is the same logical item as last render's element with this key, even if it moved." Keys are matched only among siblings of the same parent, never globally. The full payoff is the next section.

> **Try it.** In a scratch project, write a parent component that defines a small child component *inside* its own body and renders it, with an `<input>` in the child whose value is parent state. Type into it and watch the cursor get kicked out on every keystroke. Now move the child definition out to module scope and watch the focus stay put. Same input, one structural difference.

**You've got this if** you can explain why moving a component definition outside its parent fixes a "my input keeps losing focus" bug.

---

## 6. Keys and lists (where most bugs live)

*Prereqs: Section 5 (the diff and its two assumptions). Outside React: the difference between an item's stable identity and its position in a list.*

**The itch.** You render a list, everything is fine, then you add sorting or filtering or drag-to-reorder, and suddenly checkboxes are checked on the wrong rows or inputs show the wrong text. The data is right but the UI is scrambled.

**The short version.** When you reorder a list, React needs to know which new item is which old item. The `key` is how it knows. If you use the **array index** as the key, you are telling React "position 0 is always the same item," which is a lie the moment you reorder or insert. So any state attached to the item (a checkbox, typed text, focus) stays glued to the *position* instead of following the *item*. Fix: use a stable id from your data, never the index, for any list that can change order.

**How it actually works.**

When React reconciles a list of children, it does two passes.

**Pass 1: walk both lists together while keys match by position.** As long as the key at the current new element matches the key of the current old fiber, update in place and move both cursors forward. This is the fast path and it covers the common cases: first render, appending to the end, editing items that did not move.

**Pass 2: when order diverges, use a map.** The moment keys stop matching by position, React takes the remaining old fibers and builds a `Map` from key to fiber. Then it walks the remaining new elements: for each, it looks up its key in the map. A hit means "reuse this existing fiber" (and if it moved, mark it so the DOM node gets *moved*, not recreated). A miss means "create a new one." Anything left in the map at the end is deleted. With good keys, a reorder becomes cheap node *moves*, and component state and DOM state travel along with each item.

**Why index-as-key is a trap.** Using the index says "slot 0 is always the same logical item." True only if the list never reorders, inserts, or filters. Otherwise:

- React reuses the fiber at index 0 to render whatever data is now at index 0, a *different* item, just updating props.
- Anything bound to the instance rather than the data (uncontrolled input text, checkbox state, focus, an in-flight CSS transition) sticks to the slot and jumps to the wrong row after a reorder.
- It is both a correctness bug (state on the wrong row) and a performance bug (needless updates).

Index keys are fine in exactly one case: the list is fully static (never reordered, inserted, or filtered) and items hold no internal state. Otherwise use a stable id from the data.

**The flip side: changing a key on purpose to reset state.** Because a changed key makes React treat the element as new (unmount old, mount fresh), you can deliberately reset a component:

```jsx
<EditForm key={recordId} record={record} />
```

When `recordId` changes, the key changes, React mounts a fresh `EditForm` with clean state. This is usually cleaner than copying the new prop into state with an effect.

> **Try it.** Render a list of items where each row is a component holding its own `useState` checkbox. Add a shuffle button that reorders the array. Run it once with `key={index}` and once with `key={item.id}`. Check a few boxes, hit shuffle, and watch: with index keys the checks stay glued to their positions while the labels move under them; with stable keys the checks follow their items. This is the single most convincing experiment for understanding keys.

**You've got this if** you can predict, before clicking shuffle, which rows will be checked in index-key mode versus stable-key mode.

---

## 7. Fiber: the object that makes pausing possible

*Prereqs: Sections 2 through 5. Outside React: a linked list (nodes with pointers to parent, child, and sibling), and why a traversal you control can be paused and resumed while the JavaScript call stack cannot.*

**The itch.** Older React froze the page during big updates. Modern React can keep typing smooth even while rendering something heavy. What changed under the hood to make that possible?

**The short version.** Before React 16, rendering was plain recursion, and the progress lived on the JavaScript call stack, which you cannot pause. **Fiber** rebuilt rendering so that each unit of work is a plain object (a "fiber") on the heap, with pointers to its parent, child, and sibling. Because the progress now lives in objects React controls instead of on the call stack, React can stop in the middle, hand the browser back the thread, and resume later. That one change is what unlocks everything in Sections 11 and 12.

**How it actually works.**

The old "stack reconciler" recursed through the tree, with traversal state on the call stack. The call stack cannot be paused or resumed partway, so once a big render started, React had to finish it synchronously, blocking input and paint.

Fiber takes the call stack and rebuilds it as a heap data structure React owns. Each unit of work becomes a fiber object with explicit `parent` / `child` / `sibling` pointers. Now React can pause (just remember which fiber it was on), abandon work (drop the reference, nothing stuck on the stack), and reuse completed work.

A fiber is both "a virtual stack frame" and "an instance of a component or host node at a position." The fields that matter, grouped by job:

```
// What this fiber represents
tag           // FunctionComponent, ClassComponent, HostComponent ('div'), HostText,
              // HostRoot, Fragment, SuspenseComponent... the work loop switches on this
key           // the reconciliation key
type          // the function/class/string this fiber came from
stateNode     // the backing thing: the real DOM node, the class instance, or the root

// Tree structure (the rebuilt call stack)
return        // parent fiber. Called "return" because it's the return address: where
              // the loop goes after finishing this fiber's subtree
child         // first child
sibling       // next sibling
index         // position among siblings

// Input/output of rendering
pendingProps  // new props for the render being computed
memoizedProps // props from the last committed render
memoizedState // committed state. For a FUNCTION component this is the HEAD OF THE
              // HOOKS LINKED LIST (the key fact behind Section 13)
updateQueue   // queued state updates / effects

// Scheduling + effects
lanes         // pending work priorities on THIS fiber (Section 12)
childLanes    // union of all descendants' lanes; lets React skip a whole subtree
              // with one bitwise check if nothing below needs work
flags         // bitmask of effects to do at commit: Placement, Update, Deletion, Ref,
              // Passive (a useEffect)... (older source calls this effectTag)
subtreeFlags  // union of flags in the subtree; lets commit skip clean subtrees
deletions     // children to unmount during commit

// Double buffering
alternate     // pointer to this fiber's twin in the OTHER tree (Section 8)
```

The two fields that make React fast at scale are `childLanes` and `subtreeFlags`. Both are summaries: "is there any work below me?" and "are there any effects below me?" Each can be checked with a single bitwise operation, so React can skip an entire subtree of any size in O(1) instead of walking into it to discover there was nothing to do. In a typical update most of the tree is untouched, and these summaries are how React proves that cheaply.

> **Try it.** You cannot see fibers directly, but you can feel their effect. Build a text input next to a deliberately expensive list (a few hundred rows, each doing a little busy-work in render) and drive the list's filtering with `useDeferredValue`. Type fast: the input stays responsive while the list lags a beat behind. That responsiveness is Fiber's ability to pause mid-render made tangible.

**You've got this if** you can explain why "the work lives in heap objects instead of the call stack" is what lets React pause mid-render.

---

## 8. Two trees at once (double buffering)

*Prereqs: Section 7 (fiber). Outside React: double buffering in graphics (draw the next frame off-screen, then swap it in), the technique this is named after.*

**The itch.** If React can be interrupted mid-render, how do you never see a half-updated, broken screen?

**The short version.** React keeps **two** fiber trees: the **current** one (on screen) and the **work-in-progress** one (being built). It only ever edits the work-in-progress tree, so the on-screen tree is always whole and consistent. If React needs to abandon a render, it just throws away the work-in-progress tree; the screen never saw it. Committing is a single pointer swap that makes the new tree the current one, instantly.

**How it actually works.**

This is borrowed from graphics, where you draw the next frame in an off-screen buffer and swap it in so viewers never see a half-drawn frame.

- **current tree:** committed, on screen, always complete.
- **work-in-progress (WIP) tree:** being built, allowed to be incomplete because nothing is looking at it.

Every fiber points to its twin in the other tree via `alternate`. When React works on an update, it clones or reuses fibers from current into WIP, applies changes there, and leaves current untouched.

```
            FiberRoot
                │  current
                ▼
   [ current tree ]  ◀── alternate ──▶  [ work-in-progress tree ]
   (on screen, safe)                    (being built, disposable)
```

This is exactly why an interrupted render is safe: all the half-finished work is in the WIP tree, and the on-screen current tree is never touched during rendering. Abandon a render and the screen is unaffected.

The commit is, at heart, **one assignment:** `fiberRoot.current = workInProgressTree`. In that instant the WIP tree becomes the current tree atomically, and the old current tree becomes the spare buffer for next time. Reusing the two trees back and forth (instead of allocating a new tree each render) also keeps memory churn down.

> **Try it.** Conceptual one: next time you read "render can be interrupted," remind yourself *which* tree is being built. The reason interruption is safe is that the answer is always "the disposable one."

**You've got this if** you can explain why interrupting a render never shows the user a broken screen.

---

## 9. Render phase vs. commit phase

*Prereqs: Sections 7 and 8. Outside React: the value of separating computing a change from applying it, and why a pure computation can be safely retried or discarded while applying it cannot.*

**The itch.** Why must your render code be "pure"? Why does `useEffect` run after the screen updates but `useLayoutEffect` runs before? Why do side effects in the body of a component cause weird double-fetches?

**The short version.** Every update has two phases. The **render phase** runs your component to figure out what changed; it must be pure and side-effect-free, because React may run it multiple times or throw the work away. The **commit phase** applies the changes to the real DOM in one quick, uninterruptible burst, and that is when effects fire. `useLayoutEffect` runs during commit, before the browser paints (so it can measure/adjust with no flicker, but it blocks paint). `useEffect` runs after paint (so it does not block). Side effects belong in effects or event handlers, never in render.

**How it actually works.**

**Render phase (reconciliation).** React calls your components and builds the WIP tree, working out what changed.

- It **must be pure.** No DOM mutation, no subscriptions, no meaningful network calls, no output-affecting ref writes during render.
- It is **interruptible and restartable** under concurrency. React may render part, pause, resume, or throw it all away and restart. So **your component may run more than once for a single visible update, and some of those runs get discarded.** That is the entire reason render must be pure: side effects in render would leak out of those discarded runs as double-fetches and corrupted state. This is also exactly what StrictMode's double-invocation (Section 16) is built to catch.

**Commit phase.** Once the WIP tree is built, React applies it to the DOM in one synchronous, uninterruptible burst, in three ordered sub-phases:

1. **Before mutation.** Runs before any DOM change. (Class `getSnapshotBeforeUpdate` runs here, e.g. to capture a scroll position about to change.) React schedules passive effects (`useEffect`) for later, after paint.
2. **Mutation.** The actual DOM changes: insert/move/remove nodes, apply prop updates, detach old refs, and run the **`useLayoutEffect` cleanups** from the previous render.
3. **Layout.** Runs after the DOM is updated but before paint: `useLayoutEffect` setup, `componentDidMount`/`componentDidUpdate`, and ref attachment. Because the DOM is correct but not yet painted, this is where you can measure layout and synchronously re-render to adjust with no visible flicker. The cost is that it blocks paint, so keep it cheap.

After commit and paint, React flushes **passive effects** (`useEffect` setup, plus the previous render's `useEffect` cleanup) asynchronously, so they do not delay the user seeing the update.

The practical timing table:

| Hook | Cleanup runs | Setup runs | Blocks paint? |
|---|---|---|---|
| `useLayoutEffect` | mutation sub-phase (before paint) | layout sub-phase (before paint) | Yes |
| `useEffect` | after paint, before next setup | after paint | No |

Rule of thumb: need to measure or adjust the DOM before the user sees it (positioning a tooltip)? `useLayoutEffect`. Everything else (fetching, subscriptions, logging)? `useEffect`. Defaulting to `useLayoutEffect` is a common, avoidable perf mistake because it blocks paint.

And the headline: **render runs many times and may be discarded; commit runs once per real update and is where effects fire.** Put a side effect in render and it can run during a speculative render that never commits. Side effects go in effects or event handlers.

> **Try it.** Add `console.log('render')` to a component's body and `useEffect(() => console.log('effect'), [])`. In a StrictMode dev build you will see render logged twice and the effect run-cleanup-run. That doubling is React stress-testing your purity (Section 16), and seeing it makes the phase split concrete.

**You've got this if** you can explain why a `fetch()` in a component body is a bug but the same `fetch()` in `useEffect` is fine.

---

## 10. The work loop

*Prereqs: Sections 7 and 9. Outside React: a loop that processes one unit of work at a time and can check a condition between units.*

**The itch.** What is React literally *doing* during the render phase, step by step? "It renders" is not an answer you can debug with.

**The short version.** React processes fibers one at a time in a loop. On the way *down* the tree it runs `beginWork` (which calls your component and figures out its children, or **skips the whole subtree** if nothing changed, a "bailout"). On the way back *up* it runs `completeWork` (which builds the actual DOM nodes off-screen). Between each step it checks "should I pause and let the browser breathe?" That pause-check is what makes rendering interruptible.

**How it actually works.**

Roughly:

```js
function workLoopConcurrent() {
  while (workInProgress !== null && !shouldYield()) {
    performUnitOfWork(workInProgress);
  }
}
```

`shouldYield()` is the interruptibility (Section 11). Each `performUnitOfWork` handles one fiber in two movements.

**Going down: `beginWork`.** For a function component, this is where React **actually calls your component** (running its hooks) to get its child elements, then **reconciles** those children against existing child fibers (Sections 5 and 6), tagging them with effect `flags`. It returns the first child as the next unit of work.

**The bailout (how subtrees get skipped).** Before doing real work, `beginWork` checks: are props referentially unchanged, no pending state update here, context unchanged, and does `childLanes` say no descendant has work at the current priority? If all yes, React clones the existing subtree and skips re-rendering it entirely. This is what makes `React.memo` work and what makes "this part didn't change, skip it" cheap. The `childLanes` check skips a whole subtree with one bitwise test.

**Going up: `completeWork`.** When a fiber has no children left to process, React completes it on the way up. For host components this is where it **creates the real DOM node** (if new) or **computes the prop diff** (if updating), assembling the subtree off-screen so it never disturbs what is on screen. It also **bubbles `flags` and `lanes` up** into the parent's `subtreeFlags`/`childLanes`, which is how those fast-skip summaries stay maintained. Then it moves to the sibling (descending into it), or returns to the parent.

Trace it and it is just depth-first traversal: down to first child, across siblings, back up. The difference from old React is that it is an explicit loop over heap objects (`child`/`sibling`/`return` pointers), not recursion, which is precisely why it can pause between any two steps.

> **Try it.** In React DevTools Profiler, record an interaction and look at the flamegraph. The bars are `beginWork` calls; greyed-out components are bailouts (skipped). You are looking at the work loop's output.

**You've got this if** you can explain what a "bailout" is and why `React.memo` is really just a bailout you asked for.

---

## 11. Not freezing the page (concurrent rendering)

*Prereqs: Sections 9 and 10. Outside React: the browser's single main thread and the roughly 16ms-per-frame budget for smooth 60fps.*

**The itch.** A search box that filters a big list used to stutter as you typed. Modern React can keep the typing buttery while the list lags behind gracefully. How?

**The short version.** "Concurrent" rendering means React does a little rendering work, then hands the thread back to the browser so it can handle your keystroke and paint, then picks up where it left off. It is not multiple threads; it is cooperative time-slicing on one thread. If an urgent update (typing) arrives during a slow render, React can abandon the slow one and do the urgent one first. You opt into this with `startTransition`, `useTransition`, and `useDeferredValue`, which mark some updates as "not urgent."

**How it actually works.**

Concurrent React (via `createRoot`, the default in modern apps) interleaves rendering with the browser's other work. It is **not** multi-threaded and does **not** render in the background. It is **cooperative**: do a small chunk, give the thread back so the browser can handle input and paint, then resume.

**Time slicing.** The work loop checks `shouldYield()` between units. The implementation lives in a separate `scheduler` package:

- React gets a **time slice** (about 5ms). While time remains, it keeps processing fibers.
- When the slice is used up, or higher-priority work or input is waiting, `shouldYield()` returns true, the loop breaks, and React schedules a continuation.
- It yields using a **`MessageChannel`** (`postMessage`), which schedules a task the browser runs very soon but only after it has had a chance to handle input and paint. React tried `requestIdleCallback` (too infrequent and inconsistent) and avoids `setTimeout` (clamped to about 4ms and throttled in background tabs). `MessageChannel` is the sweet spot.

So a long render no longer freezes the page: render a slice, let the browser handle a keystroke and paint, render the next slice. And if an urgent update arrives mid-render, React can abandon the in-progress low-priority render and start the urgent one. Safe, because (Section 8) only the disposable WIP tree was being touched.

**The APIs this unlocks:**

- **`startTransition` / `useTransition`** mark an update as a non-urgent **transition**. React renders it at lower priority, keeps the UI responsive to urgent updates meanwhile, and can interrupt and restart it. `isPending` lets you show a subtle "working" state without blocking input.
- **`useDeferredValue`** renders an expensive part of the UI with a deliberately lagging copy of a value, so the input stays snappy while the heavy subtree catches up.
- **`<Suspense>`** coordinates loading states; concurrency lets React keep old content visible while preparing new content (Section 15).
- **`useSyncExternalStore`** reads external stores without a bug called tearing (Section 14).

> **Try it.** Take that same heavy-list-plus-input setup and toggle whether the filtering reads the raw input value or a `useDeferredValue` of it (or wrap the filter update in `startTransition`). With deferral off, typing stutters because every keystroke blocks on the list. With it on, the input stays smooth while the list catches up a moment later. That gap you can feel is concurrency.

**You've got this if** you can explain the difference between "concurrent" (interleaving on one thread) and "parallel" (multiple threads), and why React is the former.

---

## 12. Lanes (how React ranks urgency)

*Prereqs: Section 11. Outside React: bitwise operations on integers (a bitmask as a set of flags) and the idea of ranking work by priority.*

**The itch.** How does React actually keep "urgent typing" ahead of "lower-priority transition" in its head, and batch a bunch of `setState` calls into one render?

**The short version.** React tags every pending update with a **lane**, which is just a single bit in a number. Different kinds of updates get different bits: synchronous clicks, continuous scrolling, normal updates, transitions, idle work. Because lanes are bits, React can compare and combine priorities with single, ultra-cheap bitwise operations. Lanes are also how batching works: updates that land in the same tick share a lane and get rendered together.

**How it actually works.**

Lanes (React 18+) replaced an older single-number priority model that could not express "these updates are independent groups with different priorities, and these two must be processed together." A bitmask can.

**The representation.** One lane is one bit in a **31-bit** integer (31, not 32, because JS bitwise ops use 32-bit *signed* integers and the sign bit is reserved). A *set* of lanes is an integer with several bits on. This lets React do priority math with raw bitwise ops:

```js
(fiber.lanes & renderLanes) !== NoLanes        // any work on this fiber at these priorities?
(fiber.childLanes & renderLanes) !== NoLanes   // any work below me? (the bailout check)
const merged = laneSetA | laneSetB;            // combine two sets
const stillPending = pending & ~finished;      // remove the ones we just did
```

These are single-cycle operations, which is why the per-fiber `childLanes` bailout (Section 10) is affordable on every fiber of every render.

**The lane groups, highest to lowest priority:**

```
SyncLane             // synchronous discrete events; flush before next paint
InputContinuousLane  // dragging, scrolling, mousemove
DefaultLane          // ordinary updates (a fetch resolving, a setTimeout)
TransitionLanes      // a BAND of lanes for startTransition/useTransition
RetryLanes           // Suspense retries
IdleLane             // lowest; render only when nothing else is pending
OffscreenLane        // hidden/pre-rendered content; powers <Activity> (Section 17)
```

For each render pass, React picks the highest-priority set of lanes that has pending work and renders exactly those, urgent first.

**Why transitions get a band of lanes, not one.** So two unrelated `startTransition` updates do not get forced into the same batch and can be scheduled and interrupted independently.

**Entanglement.** Sometimes two lanes must be processed together for correctness (e.g. two updates reading the same external store, which would tear if split). React **entangles** them so rendering one always pulls in the other. This is something a single priority number could never express.

**Batching.** In React 18+, all updates are automatically batched by default: multiple `setState` calls in an event handler, a promise, a `setTimeout`, or a native handler coalesce into one render. (Pre-18, only updates inside React event handlers batched.) Lanes are the mechanism: same-tick updates share a lane and flush together. The escape hatch is `flushSync(() => {...})`, which forces a synchronous render+commit. Use it rarely; it defeats batching and concurrency.

> **Try it.** Click a button whose handler calls `setState` three times, with `console.log` in the body. You will see one render, not three. That is lane-based batching. Now wrap one call in `flushSync` and watch an extra render appear.

**You've got this if** you can explain why React represents priority as bits in a number rather than as a plain ranking.

---

## 13. How hooks actually store your state

*Prereqs: Section 7 (fiber). Outside React: a linked list, and closures (a function holding on to the variables in scope when it was created).*

**The itch.** "Don't call hooks in conditions or loops." Everyone repeats it, but *why*? Once you see the storage, the rule stops being a rule you memorize and becomes the only thing that could possibly work.

**The short version.** A function component has no `this` to hang state on. So React stores your hooks as an ordered **linked list** on the component's fiber, and it matches them up purely by **call order**: the first `useState` you call gets the first slot, the second gets the second, and so on. If you call a hook conditionally, the order shifts between renders and React reads the wrong slot. That is the entire reason for the rule.

**How it actually works.**

A function component's state lives on the fiber's `memoizedState` field, which (for function components) holds the **head of a linked list of hook objects.** Each hook is roughly:

```js
{
  memoizedState, // this hook's current value (state value, or {deps, cleanup} for effects,
                 // or the cached value for useMemo)
  queue,         // update queue for useState/useReducer; null otherwise
  next,          // pointer to the NEXT hook called in this component, or null
}
```

So `useState`, `useState`, `useEffect` builds:

```
fiber.memoizedState
   → [hook #1: useState] → [hook #2: useState] → [hook #3: useEffect] → null
```

**Why order is sacred.** React does **not** identify hooks by name or variable. It walks this list with a cursor and binds the *Nth hook call* to the *Nth node*. So:

- **Call hooks in the same order every render** (no conditionals, loops, or early returns before them). If you call one conditionally, the cursor desyncs from the list and React reads the wrong node, for example reading your `useEffect`'s slot as if it were a `useState` value. The bug is silent and bizarre, which is why the rule is absolute.
- **Call hooks only at the top level of a component or custom hook**, the only place the fiber and cursor are set up.

`eslint-plugin-react-hooks` enforces this statically (and in React 19 it also surfaces Compiler diagnostics, Section 17). Treat it as non-optional.

**Mount vs. update.** On **mount**, `useState` allocates a fresh hook node and runs your initializer. On **update**, it reads the existing node (via the fiber's `alternate`, Section 8) and applies queued updates. Same line of code, different behavior, chosen by which internal "dispatcher" is active. That dispatcher swap is also how React throws a clear error when you call a hook outside rendering: a special dispatcher whose only job is to throw.

> **Try it.** Write `if (cond) useState(0)` and watch ESLint scream, then mentally trace why: on renders where `cond` is false, every later hook shifts up one slot and reads the wrong value. The lint rule is protecting the cursor.

**You've got this if** you can explain the rules of hooks to someone using the words "linked list" and "call order."

---

## 14. State updates and a bug called tearing

*Prereqs: Sections 11 through 13. Outside React: the idea of reading one source of truth at two different moments and getting two different answers.*

**The itch.** Why does `setCount(c => c + 1)` called three times give +3, but `setCount(count + 1)` three times gives only +1? And what is this "tearing" thing that external state libraries keep mentioning?

**The short version.** Calling `setState` does not change state immediately; it **queues** an update to be applied at the next render. That is why functional updates (`c => c + 1`) stack correctly while value updates (`count + 1`) all read the same stale value and collapse to one. **Tearing** is a concurrency hazard: because a render can pause partway, an *external* store (Redux, a global variable) can change mid-render, so different components in one render read different values and the UI shows inconsistent data. `useSyncExternalStore` is the fix.

**How it actually works.**

**The update queue.** `setState` (or `dispatch`) creates an **update object** and appends it to the hook's queue (a small circular linked list), marks lanes on the fiber, bubbles `childLanes` to the root, and asks the scheduler to render. The new value is computed *later*, when React drains the queue during the next render. (Internally `useState` is `useReducer` with a built-in reducer, which is why they behave alike.)

This is why functional updates compose and value updates do not. Three `setCount(count + 1)` calls all capture the same stale `count` from the current closure, compute the same number, and collapse to one increment. Three `setCount(c => c + 1)` calls are functions, each receiving the previous result, so draining runs them in sequence: +3. The difference falls straight out of "the queue drains at render time, not at call time."

**Bailing out on equal values.** If a drained update produces a value `Object.is`-equal to the current one, React can skip re-rendering (and with clean `childLanes`, skip the subtree). There is also an **eager bailout**: for a simple state hook with no other pending updates, React computes the next value at call time and, if it equals the current value, skips scheduling a render at all. (Honest caveat: in some paths React may still re-render the component once even on a no-op while skipping the children. Rely on the principle, not an exact render count.)

**Tearing.** Plain React state is snapshot-consistent for a whole render, so it cannot tear. An **external** mutable store can: because a concurrent render can pause (Section 11), the store can be mutated in the gap between React reading it for component A and for component B in the same render. A renders with the old value, B with the new one, and the UI is internally inconsistent ("torn"). The fix is `useSyncExternalStore(subscribe, getSnapshot)`: it gives React enough hooks into the store to detect a mid-render change and re-render synchronously for a consistent value. Every serious external state library uses it. If you build your own external store and read it during render, route it through `useSyncExternalStore`, not a hand-rolled `useEffect`+`useState` subscription, which is exactly the pattern that tears.

> **Try it.** Make a counter with a button whose handler calls the setter three times in a row. Run it once as `setCount(count + 1)` three times and once as `setCount(c => c + 1)` three times. The value-style version jumps by 1, the functional version by 3, even though both call the setter the same number of times. Same calls, different result, because of when the queue drains.

**You've got this if** you can explain why `setCount(count + 1)` three times only adds 1, using the word "queue."

---

## 15. Suspense, mechanically

*Prereqs: Sections 7, 9, and 12. Outside React: `throw` interrupting normal control flow, and a promise (a value that becomes available later).*

**The itch.** Suspense feels like magic: a component "waits" for data and a fallback shows up. What is the actual mechanism, with no hand-waving?

**The short version.** When a component is not ready (its data is still loading), it literally **throws a promise.** React catches that while rendering, walks up to the nearest `<Suspense>` boundary, and shows that boundary's `fallback` instead. When the promise resolves, React retries rendering the subtree. The modern way to trigger this is the `use(promise)` hook. Combined with transitions, React can keep the old UI visible instead of flashing a spinner.

**How it actually works.**

A component that cannot finish rendering **throws a thenable** (a promise). The ergonomic trigger in React 19 is the **`use(promise)`** hook, which reads a promise and suspends if it is pending. During the render phase, when React's walk hits this thrown promise, it does not crash. It **unwinds** up to the nearest `<Suspense>` boundary and renders that boundary's `fallback`. It also attaches a callback to the promise so that, when it resolves, React schedules a **retry** (on a retry lane, Section 12) and tries the subtree again.

Concurrency makes this graceful:

- React can keep the **previously committed UI on screen** while preparing the suspended new content in the background, instead of instantly swapping in a spinner. With a transition (Section 11), React knows the update is non-urgent and prefers showing the stale-but-complete UI until the new one is ready, avoiding the "content, spinner, content" flicker.
- Suspense integrates with **streaming SSR**: the server streams HTML for ready parts, leaves placeholders for boundaries still waiting, and streams their content as data arrives, with the client hydrating each piece as it lands.

A 19.2 refinement, as a concrete example of ongoing tuning: during streaming SSR, React now **batches Suspense reveals.** Instead of swapping each fallback the instant one boundary resolves (a jarring rapid-fire of pops), it briefly holds a resolved boundary to see if siblings resolve in the same short window, then reveals the group together in one calmer update.

> **Try it.** Wrap a lazily-loaded component in `<Suspense fallback={<Spinner/>}>` and throttle your network in DevTools. Watch the fallback appear, then the real content swap in. Then move the data fetch inside a `startTransition` and notice the old content lingering instead of flashing.

**You've got this if** you can explain what a component "suspending" physically does (hint: it throws something).

---

## 16. Why StrictMode runs things twice

*Prereqs: Sections 9 and 13 (the render phase must be pure). Outside React: what a pure function is (same input, same output, no side effects) and how running something twice can reveal impurity.*

**The itch.** You added `<StrictMode>` and suddenly your `console.log` fires twice and your effect runs, cleans up, and runs again. Is React broken? Did you do something wrong?

**The short version.** Nothing is broken. In development only, StrictMode deliberately runs your render and your effects an extra time. It is a stress test: rendering twice exposes any impurity (a side effect hiding in render), and the mount-unmount-mount cycle exposes any effect that forgets to clean up. If your code only works with StrictMode off, that is a real bug that concurrency would eventually trigger in production, not a StrictMode quirk.

**How it actually works.**

`<StrictMode>` is development-only and changes nothing in production. In dev, inside a StrictMode subtree, React intentionally double-invokes:

- **render functions** (called twice in a row),
- **`useState`/`useReducer`/`useMemo` initializers and reducers** (called twice),
- **effects on initial mount** (setup, then cleanup, then setup again, since React 18). The component is effectively mounted, unmounted, then mounted again.

This is a deliberate test of the two contracts the rest of this guide leans on:

1. **Render must be pure** (Section 9). If rendering twice yields different output or a visible side effect (mutating a module variable, pushing to an external array, firing a request), double-invocation surfaces it immediately in dev, instead of as an intermittent, unreproducible bug under concurrency in production.
2. **Effects must fully clean up after themselves.** The mount-unmount-mount cycle proves your `useEffect` tears down exactly what it sets up. A leaked subscription or uncleared timer shows up right away as a double.

The forward-looking reason it matters: concurrency and `<Activity>` (Section 17) assume components can be mounted, unmounted, and re-mounted at React's discretion. StrictMode trains your code to survive that. Clean under StrictMode means safe under concurrency. "Only works with StrictMode off" means a latent bug.

> **Try it.** You already ran this in Section 9's "Try it." Now make it a teaching moment: add a `setInterval` in a `useEffect` *without* a cleanup, and watch StrictMode reveal two intervals running. Add the cleanup and watch it drop back to one.

**You've got this if** you can explain why "it only breaks with StrictMode on" means your code has a real bug.

---

## 17. The 2026 layer: Compiler, Activity, View Transitions

*Prereqs: Sections 5, 9, and 12, plus `useMemo` and `useCallback` at a user level. Outside React: a build-time compiler (a tool that rewrites your code before it runs) and the browser's View Transitions API.*

**The itch.** People say you no longer need `useMemo` and `useCallback`. Is that true? And what are these new `<Activity>` and View Transition things?

**The short version.** The **React Compiler** (stable since October 2025) reads your code at build time and inserts memoization automatically, so you mostly stop writing `useMemo`/`useCallback`/`React.memo` by hand, *if* your code follows the rules. **`<Activity>`** lets you hide part of the UI while keeping its state alive (great for tabs), instead of unmounting and losing everything. **View Transitions** let React animate UI changes using the browser's built-in animation API. None of these replace the model in this guide; they sit on top of it.

**How it actually works.**

**React Compiler (1.0 stable, October 2025).** A build-time tool (a Babel plugin, with an SWC plugin maturing for Next.js/Parcel) that statically analyzes your components and **inserts memoization** equivalent to hand-written `useMemo`, `useCallback`, and `React.memo`. It runs in production at Meta and ships enabled-by-default in newer framework templates (Next.js 16, Expo SDK 54, Vite starters).

It does not change the reconciler; it changes how *often* components re-render by memoizing precisely based on a compiler-derived understanding of your data dependencies, often more thoroughly than humans manage. Implications:

- You can largely **stop writing `useMemo`/`useCallback`/`React.memo`** as performance tools. They become escape hatches for the rare case where you need precise control over a value's identity (usually because it feeds a `useEffect` dependency array).
- The compiler **only optimizes code that follows the Rules of React.** It detects rule-breaking and **silently skips** memoizing those components, choosing correctness over speed. So "the compiler made my app fast" depends on "my components are pure." StrictMode and the upgraded `eslint-plugin-react-hooks` keep you in the optimizable set.
- The bug "you forgot a `useCallback` dependency" mostly disappears, because you stop writing the `useCallback`.

For existing apps: enable behind a flag, pin the exact compiler version, lean on tests, especially where a memoized value feeds an effect's dependencies.

**`<Activity>` (React 19.2).** Keeps part of the UI mounted but inactive instead of unmounting it:

```jsx
<Activity mode={tab === 'profile' ? 'visible' : 'hidden'}>
  <ProfilePanel />
</Activity>
```

When hidden, React **preserves the component's state** (and its DOM, hidden via styling) and **deprioritizes its work** on the low-priority `OffscreenLane` (Section 12). It can even **pre-render** hidden content so revealing it is instant. This is the public face of React's long-running internal "Offscreen" machinery, and the idiomatic replacement for conditionally unmounting tabs (which loses state and re-pays mount cost). Because hidden activities mount/unmount/re-mount at React's discretion, this is exactly what StrictMode trained your effects for.

**View Transitions (React 19.2).** React now integrates with the browser's View Transitions API to animate changes (navigations, reorders, expand/collapse) declaratively. You wrap content in `<ViewTransition>` and trigger changes through React's transition system (e.g. inside `startTransition`), optionally tagging the kind with `addTransitionType`. A small telltale plumbing change: the default `useId` prefix changed to `_r_` in 19.2 so generated IDs are valid `view-transition-name` values under CSS/XML naming rules.

**Performance Tracks (19.2 + DevTools).** New React-specific timelines in Chrome DevTools' performance panel: a **Scheduler track** (what React is working on, by priority, and when it is blocked or waiting to paint) and a **Components track** (mounts, updates, unmounts, renders blocked by yielding). This is the first time the lanes/scheduler machinery (Sections 11 and 12) is directly visible in a mainstream profiler.

> **Try it.** Build a two-tab UI where one tab has a text input. Implement it once by conditionally unmounting the inactive tab, and once with `<Activity mode="hidden">`. Type in the input, switch tabs, switch back. With unmounting your text is gone; with Activity it is preserved. That is the whole pitch in ten seconds.

**You've got this if** you can explain why the compiler "only helps if your code follows the rules," and what `<Activity>` preserves that unmounting destroys.

---

## 18. Debugging with this knowledge

*Prereqs: the rest of the guide. Outside React: the React DevTools and the browser Performance panel.*

**The itch.** Something re-renders too much, or feels janky, and you want a *procedure* instead of randomly adding `useMemo` everywhere.

**The short version.** Ask, in order: (1) what scheduled this render? (2) could it have bailed out, and if not, why not? (3) is the cost in the render phase or the commit phase? (4) is urgent work starving a transition? The DevTools Profiler and the new Performance Tracks answer all four by showing you, instead of you guessing.

**How it actually works.**

A procedure for "why did this re-render / why is it slow," top to bottom:

1. **What scheduled the render?** Always one of: a state update here, a context value it reads changing, a parent re-rendering, or an external store update. The Profiler's "why did this render" and Performance Tracks tell you directly.
2. **Could it have bailed out?** If props are referentially stable, own state did not change, and read context did not change, then it re-rendered because a parent re-rendered without a memo boundary, or a parent handed it a freshly-created object/array/function/JSX prop every render (defeating the reference check). With the Compiler on, most of this is handled; without it, this is where `React.memo` and stable references matter.
3. **Which phase is the cost in?** Long render phase = expensive component logic or too many components rendering (deprioritize with transitions/`useDeferredValue`/`<Activity>`, or split components so bailouts skip more). Long commit phase = too many/expensive DOM mutations, or heavy `useLayoutEffect` blocking paint. The Scheduler track separates these at a glance.
4. **Is work being starved by priority?** A transition that never finishes under load means urgent work is monopolizing the thread, which the Scheduler track makes visible.

The high-value pitfalls, each tied to its mechanism (the section that explains it is in parentheses):

A component defined inside another component's render gets a new function identity every render, reads as a new type, and forces a full remount that loses state and focus (5).

Array index as a key on a list that can reorder, filter, or insert binds state and uncontrolled DOM state to the slot instead of the data, so reorders attach the wrong state to the wrong row (6).

Defaulting to `useLayoutEffect` blocks paint; unless you must measure or mutate the DOM before paint to avoid a flicker, use `useEffect` (9).

A side effect in render can run during a speculative render React later discards, causing duplicate requests or corrupted state; put side effects in effects or handlers (9).

Reading an external mutable store directly in render risks tearing; route it through `useSyncExternalStore` (14).

`flushSync` to force an update "now" opts out of batching and concurrency and is almost always wrong unless you must read the updated DOM immediately (12).

Conditional or looped hook calls desync the positional hook list and read the wrong hook's state (13).

"Only breaks with StrictMode on" is a real purity or cleanup bug, not a quirk (16).

Hand-writing `useMemo`/`useCallback` everywhere once the Compiler is on adds noise and can interfere; keep them only for identity control feeding an effect dependency (17).

Conditionally unmounting tabs to "save resources" throws away their state and re-pays mount cost; `<Activity mode="hidden">` preserves state and can pre-render (17).

**The whole thing in one paragraph.** React turns `UI = f(state)` into minimal DOM changes by diffing its previous tree against a new one with two linear-time rules (same type reuse, different type rebuild; keys identify siblings). It stores the tree as fibers, heap objects that reify the call stack so work can pause, prioritize, and be discarded. It keeps two trees (a committed one on screen, a disposable work-in-progress one) so an interrupted render is always safe, and commits with a single pointer swap. Work splits into a pure interruptible render phase and a synchronous commit phase, scheduled cooperatively by a `MessageChannel`-driven scheduler and prioritized by a bitmask of lanes. Hooks are a positional linked list on the fiber, which is why their call order is non-negotiable. On top sit the Compiler (auto-memoization), Activity (state-preserving hidden UI), and View Transitions (animated swaps), all relying on the same purity and cleanup contracts StrictMode trains into your code.

> **Try it.** Pick any sluggish interaction in an app you work on, open the Profiler, record it, and walk the four questions above out loud. Do this three times on three different problems and the procedure becomes automatic.

**You've got this if** you reach for the Profiler and the four questions *before* you reach for `useMemo`.

---

## 19. Reading the source (pass 3)

*Prereqs: the rest of the guide, plus comfort reading JavaScript. This is a pass 3 section, so there is no rush.*

**The itch.** You have the model. Now you want to see it with your own eyes, in React's actual code.

**The short version.** It is all in the `react-reconciler` package, and it is more readable than you would expect once you know the map. Read the files in the order below; each maps to a section you already understand.

**How it actually works (the reading order).**

`ReactFiber.js`: the fiber object and `createFiber`/`createWorkInProgress` (double buffering). Sections 7, 8.

`ReactChildFiber.js`: `reconcileChildren` and `reconcileChildrenArray`, the two-pass key-matching list diff. Sections 5, 6.

`ReactFiberBeginWork.js`: `beginWork` and the bailout path `bailoutOnAlreadyFinishedWork`. Section 10.

`ReactFiberCompleteWork.js`: `completeWork`, where host nodes are created and flags/lanes bubble up. Section 10.

`ReactFiberWorkLoop.js`: the heart of the render phase: `workLoopConcurrent`, `performUnitOfWork`, render/commit orchestration, `shouldYield`. Sections 9, 10, 11.

`ReactFiberLane.js`: lane constants and every bitmask helper. Section 12.

`ReactFiberHooks.js`: the mount/update dispatchers and the hook linked list. Section 13.

`ReactFiberCommitWork.js`: the three commit sub-phases and effect timing. Section 9.

The standalone `scheduler` package, especially `Scheduler.js`: the `MessageChannel` host callback and priority/expiration logic. Section 11.

Pair it with the official docs at react.dev (current within the React 19 line), the React team's GitHub release notes for version-specific changes, and the `eslint-plugin-react-hooks` and React Compiler docs for the exact rules the Compiler relies on.

> **Try it (the best study loop there is).** Turn on Performance Tracks in Chrome DevTools against a real app, trigger an update wrapped in `startTransition`, and watch the Scheduler track interleave urgent work with the transition. Seeing lanes and yielding happen live, on your own app, is the fastest way to make Sections 10 through 12 stop being abstract.

**You've got this if** you opened one of these files, found a function named in this guide, and recognized what it does.

---

## Further reading (primary sources)

When you want to go past this guide, these are the canonical sources, each with a note on how it relates to what you have read here and how current it is.

**React Fiber Architecture, by Andrew Clark (acdlite).** Available at https://github.com/acdlite/react-fiber-architecture . This is the best explanation of *why* Fiber exists and *what a fiber is*, written by someone on the React team who actually built it. It maps onto Sections 5 through 8 of this guide, especially the central insight that a fiber is a reified stack frame. One important caveat: it was written in 2016 while Fiber was still being built, and it was never finished. Treat its core ideas as evergreen (the call-stack reification, `type`/`key`, `child`/`sibling`/`return`, `pendingProps`/`memoizedProps`, and `alternate` for current versus work-in-progress). But mentally update a few details that changed before Fiber shipped: its single-integer `pendingWorkPriority` became the **lanes** bitmask (Section 12); its planned reliance on `requestIdleCallback` became a **MessageChannel**-based scheduler (Section 11); and its `output` field and "coroutine" plan were dropped in favor of `flags` and `completeWork` (Sections 9 and 10). Read it for the mental model, not for the field names.

**Suspense.** Two current references plus one architecture deep dive:

1. The official `<Suspense>` reference, at https://react.dev/reference/react/Suspense , kept current within the React 19 line. Good for the everyday API and the patterns around it.
2. The `use` hook reference, at https://react.dev/reference/react/use . This is the modern, ergonomic way to suspend on a promise, and it is the surface behind much of Section 15.
3. "New Suspense SSR Architecture in React 18," by Dan Abramov, at https://github.com/reactwg/react-18/discussions/37 . This is the clearest explanation of streaming server rendering and selective hydration, which is the mechanism behind the second half of Section 15. Think of it as the Suspense equivalent of the Fiber doc above: a primary-source architectural explainer. It predates the React 19 `use` hook and the 19.2 reveal-batching refinement, so pair it with the two react.dev pages for the current API surface.

A good way to use all of these: read the relevant deep section of this guide first so you have the vocabulary, then read the primary source, then come back and reread the section. The primary sources go deeper on their one topic; this guide gives you the map that tells you where each one fits.

---

*Built to be climbed, not swallowed. Finish pass 1 and you are already ahead. Come back for the deep parts when your work gives you a reason to care, and run the experiments so the knowledge sticks to something real. Every claim about the 2026 layer (versions, the Compiler 1.0 date, the 19.2 feature set) reflects the React 19.2.x line; the architectural core (Fiber, the two phases, lanes, hook storage) has been stable since the React 16 to 18 era.*
