---
title: "React State Management Architecture"
description: "How to choose where state lives, avoid contradictions, and scale shared state without unnecessary complexity."
category: "Architecture"
readTime: "55 min read"
date: "May 2026"
publishedAt: "2026-05-01"
order: 3
series: "react-internals"
---

> Current as of React 19.2.x (latest patch 19.2.6, May 2026), with the React Compiler 1.0 stable (October 2025). Version-specific and library-specific claims are noted inline.

> **What this guide builds on.** This is a Track B guide, and it leans on two earlier ones. From the **Hooks and Effects guide** it assumes the snapshot model (a render is a frozen copy of props and state), referential stability (objects and functions are compared by identity), the update queue, and the difference between `useState` and `useReducer`. From the **rendering and reconciliation guide** it uses how a state change re-renders a component and its subtree, the bailout (how `React.memo` skips work), and how Context propagates. You can read this guide right after the Hooks guide. Wherever it reaches for an engine concept, it defines that concept in one line at first use and points you to the fuller treatment. The per-section **Prereqs** lines tell you exactly which earlier section, in which guide, a given section depends on.

## Read this first

Same method as the other guides, because it works.

**You are not meant to absorb this in one sitting.**

### Pass 1, one relaxed sitting (about 30 minutes)

Read only **"The itch"** and **"The short version"** of each section.

Skip the "How it actually works" blocks.

You will come out with a complete map of where state should live, why Context behaves the way it does, what external state libraries are actually for, and the single most important distinction in modern app state (server state versus client state).

That alone will change how you structure features.

### Pass 2, driven by real work

When a real problem shows up (a whole screen re-renders on every keystroke, a piece of state is mysteriously out of sync with another, you cannot decide between Context and a store, a teammate proposes Redux for something that does not need it), come back and read the deep part of the matching section.

### Pass 3, when curious

The further-reading section points at the primary sources and at the one or two places in React's own code worth seeing.

Each section also opens with a one-line **Prereqs** note: the earlier sections (in this guide or the Hooks and rendering guides) or outside concepts worth having in hand first.

Sections that need nothing past basic React say so.

### Two rules that multiply everything
1. **Run the experiments.** Each section ends with a short **"Try it."** Keep a throwaway React project open (a Vite scratch app, or any sandbox) and actually reproduce each one. The re-render behavior of Context, especially, has to be watched in the Profiler to be believed.
2. **Trust the order.** The sections build a single argument, in order: keep state low, lift only when forced, do not store what you can derive, consolidate complex transitions in a reducer, reach for Context only as a transport, understand why Context cannot scale to large or fast-changing global state, and only then reach for an external store, all while keeping server state in its own world. Here is the spine:

```
   The real question: where does state live, and who owns it?   (1)
            │
   Keep it low (colocation), lift only when forced              (2, 3)
            │
   Store the minimum: derive the rest, structure it well        (4, 5)
            │
   Consolidate complex transitions (reducers, state machines)   (6)
            │
   Sharing without drilling: Context as a transport             (7, 8)
            │
   Why Context re-renders too much, and how far you can push it  (9, 10, 11) ◀── the deep middle
            │
   Stepping outside React: external stores and their archetypes  (12, 13)
            │
   The distinction that reorganizes everything: server state     (14)
            │
   A decision framework, then debugging                          (15, 16)
```

You do not need to finish this guide to benefit from it.

Finish pass 1 and you are already ahead.

---

## Table of Contents

1. [The only state question that matters: location and ownership](#1-the-only-state-question-that-matters-location-and-ownership)
2. [Colocation: keep state as low as it will go](#2-colocation-keep-state-as-low-as-it-will-go)
3. [Lifting state up, and what it costs](#3-lifting-state-up-and-what-it-costs)
4. [Do not store what you can derive](#4-do-not-store-what-you-can-derive)
5. [Structuring state so it cannot contradict itself](#5-structuring-state-so-it-cannot-contradict-itself)
6. [Reducers and state machines: making impossible states impossible](#6-reducers-and-state-machines-making-impossible-states-impossible)
7. [Prop drilling: when it is fine and when it is a smell](#7-prop-drilling-when-it-is-fine-and-when-it-is-a-smell)
8. [Context is dependency injection, not state management](#8-context-is-dependency-injection-not-state-management)
9. [How context propagates, and the re-render trap](#9-how-context-propagates-and-the-re-render-trap)
10. [Taming context: split, stabilize, separate](#10-taming-context-split-stabilize-separate)
11. [The selectivity gap: why context does not scale](#11-the-selectivity-gap-why-context-does-not-scale)
12. [External stores: the shared mental model](#12-external-stores-the-shared-mental-model)
13. [The library landscape as archetypes](#13-the-library-landscape-as-archetypes)
14. [Server state is not client state](#14-server-state-is-not-client-state)
15. [A decision framework](#15-a-decision-framework)
16. [Debugging state architecture](#16-debugging-state-architecture)

---

## 1. The only state question that matters: location and ownership

Prereqs: basic React (components, props, `useState`).

Nothing from the other guides yet.

### The itch

Every "what state management should I use" debate starts in the wrong place.

You reach for a library before you have answered the question that actually determines whether your app is maintainable: where should each piece of state live, and which component owns it?

Pick the location wrong and no library saves you.

Pick it right and you often need no library at all.

### The short version

State management is not primarily about tools.

It is about deciding, for each piece of state, two things: its **location** (which component holds it) and its **ownership** (which component is responsible for changing it).

Most state should live as low in the tree as possible, owned by the component that uses it.

You only escalate to lifting, Context, or an external store when a real constraint forces you to, and each escalation has a cost.

The entire rest of this guide is a disciplined way to answer "where does this live" before you ever reach for a library.

### How it actually works

Start by noticing that "state" is not one thing.

The value of a text input, whether a modal is open, the current theme, the logged-in user, the list of products fetched from your API, the selected row in a table: these have wildly different lifetimes, owners, and sharing needs, and treating them as one undifferentiated pile is the root cause of most state-management pain.

The useful move is to ask, for each piece, a short series of questions, and the first and most important is simply: **who needs this, and who changes it?**

That question has a precise mechanical consequence in React, which is why it matters more than library choice.

When a piece of state changes, React re-renders the component that owns it and, by default, that component's entire subtree (rendering guide, the work loop and bailout sections).

So the *location* of a piece of state determines the *blast radius* of changes to it.

State held by a leaf component re-renders that leaf.

The same state lifted to the root re-renders the whole app on every change unless you work to prevent it.

Location is not a stylistic choice.

It is a performance and correctness decision baked into how rendering propagates.

Ownership is the other half.

In React's one-way data flow, the component that holds a piece of state with `useState` or `useReducer` is its owner: it is the only place that calls the setter, and everyone else either receives the value as a prop (to read) or receives a callback (to request a change).

Keeping ownership clear is what makes data flow traceable: when a value is wrong, you look at its owner, not at fifteen components that might have touched it.

Diffuse ownership, where many components can mutate the same shared blob, is exactly the condition that makes large apps hard to reason about, and it is the thing good architecture is trying to prevent, with or without a library.

So the framing for the whole guide is a ladder, and you climb it only as far as a real constraint pushes you:

1. **Local state**, owned by the component that uses it. The default. Cheapest, most traceable, smallest blast radius.
2. **Lifted state**, owned by the nearest common ancestor of the components that need it. The standard answer to "two siblings need to share." (Section 3.)
3. **Context**, when the consumers are far apart and passing props through many intermediate layers becomes noise. A transport, not a store. (Sections 8 through 11.)
4. **An external store**, when the shared state is large or changes frequently enough that Context's re-render behavior becomes a problem, or when you want selector-based subscriptions. (Sections 12 and 13.)
5. **A server-state cache** (a query library), which is a separate axis entirely, for data that actually lives on your server. (Section 14.)

Each rung is more powerful and more expensive than the one below.

The discipline is to use the lowest rung that solves your actual problem, because every rung up widens blast radius, diffuses ownership, or adds a dependency.

Most state belongs on rung one, and most "we need Redux" conversations are really "we put state on the wrong rung."

### Try it

> Take a feature you have built and list its pieces of state. For each, write down who reads it and who changes it. You will almost certainly find at least one piece sitting higher than it needs to (state in a parent that only one child uses) and at least one piece that is not really state at all (Section 4). Just labeling location and ownership surfaces both.

### You've got this if

You can explain why the location of a piece of state determines the blast radius of changes to it, in terms of how re-renders propagate.

---

## 2. Colocation: keep state as low as it will go

Prereqs: Section 1.

From the Hooks guide: the snapshot model (Section 2).

From the rendering guide: that a state change re-renders the owning component and its subtree, recapped here.

### The itch

You have a form deep in the tree, and its state lives way up in a parent "so it is easy to find." Now every keystroke in that form re-renders half the app, and you are reaching for `React.memo` everywhere to undo a problem you created.

The fix is not more memoization.

It is moving the state back down.

### The short version

Colocation means keeping each piece of state as close as possible to where it is used, ideally inside the single component that uses it.

This is the default and it is almost always right.

The mechanism is simple: a state change re-renders its owner and that owner's subtree, so the lower the owner, the smaller the re-render.

Lifting state higher than it needs to be is the most common self-inflicted performance problem in React, and it is invisible until you watch the Profiler.

### How it actually works

Recall the propagation rule from the rendering guide, stated just precisely enough for this argument: when a component's state changes, React re-renders that component, then walks down and re-renders its children, and their children, stopping only where a bailout applies (an unchanged-props `React.memo` boundary, or a subtree with no pending work).

With no memo boundaries in the way, a state change at component X re-renders the entire subtree rooted at X.

That is the whole basis of colocation: the owner of a piece of state is the root of the re-render it triggers, so you want that owner to be as small a subtree as possible.

Picture a search input whose text lives in state.

If that state lives in the input's own component, typing re-renders only the input.

If the same state lives three levels up "to keep it accessible," typing now re-renders those three levels and everything else they contain, every keystroke.

Nothing about the feature changed.

Only the location of the state changed, and with it the blast radius.

People then notice the lag and start wrapping siblings in `React.memo` to block the propagation, which is treating the symptom: you are spending memoization effort to contain a re-render that would not exist if the state were colocated.

Moving the state down removes the re-render at the source and makes the memo unnecessary.

There is a subtle, valuable corollary the React docs call "preserving and resetting state" that makes colocation even more attractive: because state lives on a component's position in the tree (rendering guide, the diff and keys sections), keeping state local also keeps its lifetime tied to the component that owns it.

When that component unmounts, its state goes with it, automatically.

Local state cleans up after itself.

Lifted state outlives the components that use it, which is sometimes what you want (a wizard that must remember earlier steps) and often a source of stale-data bugs (a parent holding a child's form state after the child is gone).

Colocation also makes a third thing better, which matters more than performance day to day: **readability and ownership.** When a piece of state lives in the component that uses it, anyone reading that component sees the whole story in one place.

When it lives three levels up and is threaded down through props, understanding the component means tracing the prop back up through every intermediate layer.

Local state is self-documenting.

Lifted state is a scavenger hunt.

So colocation is not only the performance default, it is the comprehension default.

The rule that falls out: **start every piece of state local, and lift it only at the exact moment a second component genuinely needs it, and only as high as their nearest common ancestor (Section 3).** Do not pre-lift "in case." Do not lift to a convenient central place.

Lifting is a response to a concrete sharing requirement, not a default posture, because every level you lift widens the blast radius and dilutes ownership.

One caution so you do not overcorrect: colocation does not mean duplicating the same state in two places to keep each copy local.

Two components needing the *same* value is precisely the signal to lift (Section 3), not to keep two local copies that will drift apart (that is the two-sources-of-truth bug of Section 4).

Colocation is "as low as it will go," and "as low as it will go" for shared state is the common ancestor, not two separate leaves.

### Try it

> Build a parent with several children, put a text input's state in the parent, and log a render in each child. Watch every child re-render as you type. Move the input and its state into its own child component and watch the others go silent, with no `React.memo` anywhere. That silence is colocation paying off.

### You've got this if

You can explain why moving state down the tree reduces re-renders more reliably than adding `React.memo`, and when colocation would actually be the wrong move.

---

## 3. Lifting state up, and what it costs

Prereqs: Section 2.

Outside: React's one-way data flow (props go down, events go up).

### The itch

Two sibling components need to share a value: a filter that one sets and another reads, a selected item that a list and a detail panel both care about.

You know the answer is "lift state up," but lifting feels like it makes everything re-render, and you are not sure how high is too high.

### The short version

Lifting state up means moving a piece of state to the nearest common ancestor of the components that need it, which then passes the value down as a prop and passes setter callbacks down so children can request changes.

It is the correct, framework-native answer to sibling sharing, and it is how React intends shared state to work before you reach for anything fancier.

Its cost is real and worth naming: the ancestor that now owns the state re-renders on every change, and so does its subtree, and the value and callbacks have to be threaded through any intermediate components, which is the prop drilling that later motivates Context (Section 7).

### How it actually works

The mechanism is just ownership applied to sharing.

Two siblings cannot share state directly, because neither is an ancestor of the other and React's data flow is one-way (down).

So you move the state up to a component that *is* an ancestor of both, their nearest common ancestor, and that component becomes the single owner.

It holds the state, passes the current value down to whichever children read it, and passes down callbacks (often the setter itself, or handlers that call it) so children can ask for changes.

The children become *controlled* by the lifted state: they do not own it, they reflect it and request changes to it.

This is the "single source of truth" principle in its most basic form, and it is why a controlled input takes both a `value` and an `onChange`: the value flows down, the change request flows up, and the owner is the one place the value actually lives.

The reason to lift to the *nearest* common ancestor, and no higher, is the blast radius from Section 2.

The owner is the root of the re-render that each change triggers, so you want the smallest subtree that still contains every component that needs the state.

Lift to the nearest common ancestor and the re-render covers exactly that subtree.

Lift higher "to be safe" and you have enlarged the blast radius for no benefit, re-rendering components that have nothing to do with this state.

"As high as necessary, no higher" is the same discipline as colocation, applied in the other direction.

Now the costs, stated honestly because they are what later sections exist to address:

#### Cost one: the owner and its subtree re-render on every change

This is usually fine.

A selected-row value that changes on click re-renders a panel, which is cheap and correct.

It becomes a problem only when the lifted state changes very frequently (every keystroke, every mouse move) and the subtree is large, at which point you either push the state back down (Section 2), introduce memo boundaries to contain the propagation (rendering guide), or, for genuinely global high-frequency state, step outside React's tree entirely (Section 12).

Lifting is not the wrong tool.

You just need to know its blast radius scales with how high you lifted and how often the value changes.

#### Cost two: prop drilling

If the components that need the state are far below the common ancestor, the value and callbacks have to pass through every intermediate component, none of which cares about them, purely to reach the ones that do.

A handful of levels is fine and arguably clearer than the alternative (the data flow is explicit).

Many levels, or threading the same props through large parts of the tree, is noise that obscures each intermediate component's real responsibilities.

That noise, not performance, is the primary thing Context is designed to remove (Sections 7 and 8).

A practical note on what to pass down: prefer passing the specific values and specific callbacks a child needs, rather than passing the whole state object and the raw setter.

Passing `selectedId` and `onSelect` keeps each child's contract narrow and makes its re-render dependencies clear.

Passing the entire state blob and `setState` couples every child to the whole shape and tends to spread ownership back out.

The discipline of narrow props is what keeps lifted state from quietly becoming the diffuse-ownership problem of Section 1.

### Try it

> Build two siblings, a control and a display, that need to share a value. First try to wire them directly and confirm you cannot (there is no path). Lift the state to their parent, pass `value` to the display and `onChange` to the control, and watch it work. Then deliberately lift it two levels too high and watch, in the Profiler, the extra components that now re-render for no reason.

### You've got this if

You can explain why you lift to the *nearest* common ancestor specifically, in terms of re-render blast radius, and name the two costs lifting introduces.

---

## 4. Do not store what you can derive

Prereqs: Section 1.

From the Hooks guide: "you might not need an effect" (Section 6) and memoization (Section 12).

### The itch

You keep a `filteredItems` state alongside your `items` and `filter` state, and update `filteredItems` in an effect whenever the others change.

Sometimes they get out of sync: you update `items` somewhere and forget to recompute `filteredItems`, and now the screen shows stale data.

The bug is not that you missed an update.

The bug is that `filteredItems` should never have been state.

### The short version

If a value can be computed from existing state or props, it is not state, it is a derivation, and it should be computed during render rather than stored.

Storing derived values creates two sources of truth for the same fact, which inevitably drift apart, producing the entire family of "these two things disagree" bugs.

The fix is to compute the derived value inline during render (and memoize it only if the computation is genuinely expensive).

This single principle eliminates more state-synchronization bugs than any library ever will.

### How it actually works

Here is the core insight, and it connects directly to the Hooks guide's "you might not need an effect" point.

Your component re-renders whenever its state or props change.

During that render, you have all the current values in hand.

So any value that is a pure function of those values can simply be *computed* in the render, fresh, every time.

It does not need to be stored, because it can always be recreated from its inputs, and recreating it from its inputs is the only way to guarantee it is never stale.

```js
// Anti-pattern: derived value stored as state, kept in sync with an effect
const [items, setItems] = useState([]);
const [filter, setFilter] = useState('');
const [filteredItems, setFilteredItems] = useState([]);
useEffect(() => {
  setFilteredItems(items.filter(i => i.name.includes(filter)));
}, [items, filter]); // a whole effect, an extra render, and a chance to desync

// Correct: derive during render
const [items, setItems] = useState([]);
const [filter, setFilter] = useState('');
const filteredItems = items.filter(i => i.name.includes(filter)); // always correct, by construction
```

The anti-pattern is worse than just verbose.

Walk what it costs.

There are now two pieces of state holding overlapping truth (`items` plus `filteredItems`), so it is possible for them to disagree, and they will, the first time some code path updates `items` without going through the effect, or updates `items` twice in one tick so the effect sees an intermediate value.

It also costs an extra render: the component renders with the old `filteredItems`, the effect runs after commit (Hooks guide, effect timing), calls `setFilteredItems`, and the component renders again.

So the effect version is slower *and* buggier than just computing the value.

The derived version cannot desync, because there is only one source of truth (`items` and `filter`).

`filteredItems` is recomputed from them on every render, so it is correct by construction, and there is no second render.

This is why the React docs are blunt that synchronizing one piece of state to another with an effect is almost always a mistake (Hooks guide, Section 6): the effect is trying to keep a derived value in agreement with its inputs, which is exactly the job that computing-during-render does for free and without the chance of drift.

If you find yourself writing an effect whose only job is to call `setX` based on other state or props, stop and ask whether `X` should be a derivation instead.

The answer is usually yes.

The one legitimate concern is cost.

If the derivation is genuinely expensive (sorting or transforming a large collection on every render, where most renders did not change the inputs), recomputing it on every render is wasteful.

That, and only that, is what `useMemo` is for here (Hooks guide, Section 12): it caches the derived value and recomputes only when its inputs change, while keeping the value a derivation rather than a stored piece of state.

Note the difference from the anti-pattern: `useMemo` still computes from a single source of truth and cannot desync.

It just skips redundant recomputation.

With the React Compiler on (rendering guide, the 2026 section), even that manual `useMemo` is often inserted for you.

So the decision tree is: derive during render by default.

Wrap in `useMemo` only if profiling shows the computation is expensive.

Never store a derivation as state and sync it with an effect.

A close relative of this mistake is storing in state something you could read from a single existing source: keeping a `selectedItem` object in state when you already have `items` and a `selectedId` (store the id, derive the item), or keeping a `count` alongside an array whose length is the count.

The general rule is the same: store the minimal set of independent facts, and derive everything else.

Every redundant piece of state is a future desync.

### Try it

> Build the filtered-list anti-pattern with the effect, then introduce a code path that updates `items` without the effect getting the latest filter (for example, update both in a way that batches oddly), and watch the displayed list go stale. Replace it with the derived-during-render version and confirm the staleness is impossible no matter how you update the inputs.

### You've got this if

You can explain why deriving a value during render cannot go stale while storing it as state and syncing with an effect can, in terms of sources of truth.

---

## 5. Structuring state so it cannot contradict itself

Prereqs: Section 4.

From the Hooks guide: referential stability and immutable updates (Sections 4 and 8).

### The itch

Your component has `isLoading`, `isError`, `error`, and `data` as four separate booleans and values, and you keep hitting states that should be impossible: `isLoading` true while `data` is also present, or `isError` true with no `error` and stale `data` still showing.

Each bug is a different illegal combination of independent flags.

The flags themselves are the problem.

### The short version

How you shape state determines which bugs are even possible.

Two principles do most of the work.

First, avoid redundant or contradictory state: do not keep multiple pieces of state that encode the same fact (that is Section 4) or that can disagree.

Second, when several flags really describe one situation, model the situation as a single value with named states rather than as independent booleans, so the illegal combinations become unrepresentable.

Good structure makes whole categories of bugs impossible instead of merely unlikely.

### How it actually works

Two components reading the same value disagree only if that value is stored twice.

Four booleans describing one process contradict each other only if they are allowed to vary independently.

So state-structure work is largely the work of removing the *freedom to be wrong.* There are a few concrete moves, in rough order of impact.

#### Remove redundancy (the Section 4 principle, restated as structure)

If two pieces of state always change together or one is computable from the other, you have a redundancy that can desync.

Keep one.

Derive the other.

The `selectedId` plus derived `selectedItem` example from Section 4 is a structural fix: by storing only the id, you have made "the selected item and the selected id disagree" unrepresentable, because there is no separate selected-item to disagree.

#### Collapse correlated flags into one state value

The classic offender is the request status modeled as independent booleans:

```js
// Boolean soup: 2^3 = 8 representable combinations, most of them illegal
const [isLoading, setIsLoading] = useState(false);
const [isError, setIsError] = useState(false);
const [data, setData] = useState(null);
// illegal but representable: isLoading && isError, isError && data, ...
```

Three independent booleans (or two booleans plus a nullable value) can represent eight combinations, but only a few are legal: idle, loading, success-with-data, error-with-error.

The illegal ones (loading and error at once, success with no data, error with stale data) are bugs waiting to be reached, and you end up writing defensive checks to paper over them.

Model the *one* thing that is actually true, the request's status, as a single value:

```js
// One status value: only the legal states exist
const [request, setRequest] = useState({ status: 'idle' });
// 'idle' | { status: 'loading' } | { status: 'success', data } | { status: 'error', error }
```

Now "loading and error at the same time" is not a bug you have to prevent.

It is a state that cannot be written down.

This is the same idea you will see again in Section 6 (state machines) and in the server-state section (14), where good query libraries hand you exactly this kind of status value instead of loose booleans.

The general principle is "make illegal states unrepresentable": choose a shape where the only values you can construct are valid ones.

#### Keep state flat and avoid deep nesting

Deeply nested state objects are painful to update immutably (Hooks guide, Sections 4 and 8: you must create new objects at every level you change, since React detects changes by identity), and the deeper the nesting, the more places an update can go wrong or accidentally mutate.

Flatter structures, and for collections, *normalized* structures (storing items in a lookup keyed by id, plus an array of ids for order, rather than a deeply nested tree), make updates local and identity-changes precise.

This is exactly why libraries like Redux Toolkit lean on normalized state: a flat, id-keyed shape means updating one item touches one entry, not a nested path, which keeps both correctness and re-render scope under control.

#### Do not put non-serializable or derived junk in state

State should hold the minimal independent facts (Section 4).

Class instances, functions, and the like generally do not belong in state.

They complicate updates and equality.

If you need a stable mutable thing that is not rendered on, that is a ref (Hooks guide, Section 13), not state.

The payoff of all this is that structure is leverage.

A well-shaped state object removes the need for a whole layer of validation, defensive conditionals, and "this should never happen" comments, because the bad situations are no longer expressible.

You are not being tidy for its own sake.

You are deleting bugs in advance by denying them a place to exist.

### Try it

> Take a component with `isLoading`, `isError`, and `data` booleans and deliberately reach an illegal combination (set loading and error both true) and observe the confused UI. Refactor to a single `status` value and notice that the illegal combination is now a type error or simply impossible to write, and that your render logic collapses to a clean switch over the legal states.

### You've got this if

You can explain why modeling a request as one `status` value eliminates a class of bugs that three independent booleans invite, in terms of representable states.

---

## 6. Reducers and state machines: making impossible states impossible

Prereqs: Section 5.

From the Hooks guide: `useState` vs `useReducer` and `dispatch` stability (Section 5).

This section extends that from "when to switch" to "how to architect."

### The itch

Your component's update logic has sprawled across a dozen handlers, each calling several setters, and you keep introducing bugs where one update fires and a related one does not.

You have heard "use a reducer" and "use a state machine," but they sound like ceremony.

They are actually how you move the structural discipline of Section 5 from a one-time cleanup into something the code enforces continuously.

### The short version

A reducer consolidates all the ways a piece of state can change into one pure function, `(state, action) => newState`, so the transitions live in one readable, testable place instead of scattered across handlers.

A state machine goes one step further: it makes the *legal transitions* explicit, so that from a given state, only certain actions can do anything, which is how you enforce "impossible states stay impossible" over time rather than just at the moment you refactor.

The Hooks guide covered when to choose `useReducer`.

This section is about using it as an architectural tool for complex state.

### How it actually works

Recall from the Hooks guide that `useState` and `useReducer` are mechanically almost the same (both use the update queue, `useState` is `useReducer` with a built-in reducer), and that the choice is about where transition logic lives, not performance.

Here we push on the architecture.

A reducer's value is that it turns "the set of all ways this state can change" from an emergent property of your scattered handlers into a single function you can read top to bottom.

When every transition is a `case` in one reducer, you can answer "what can happen to this state" by reading one place, and you can unit-test each transition with plain inputs and outputs and no React.

That is the consolidation win, and it pairs with Section 5: the reducer is where you enforce the well-structured shape, because it is the only thing that writes the state.

The state-machine step makes the structure active rather than passive.

A plain reducer still lets any action attempt any change from any state.

It is up to you to write the cases correctly.

A state machine constrains transitions explicitly: it defines a set of named states and, for each state, which events are even meaningful and what state they lead to.

Modeled this way, "fire a submit while already submitting" or "receive data while in the error state" are not bugs you guard against.

They are transitions that simply do not exist in the machine, so the corresponding events are ignored.

```js
// A reducer shaped as a small state machine for a fetch lifecycle
function reducer(state, action) {
  switch (state.status) {
    case 'idle':
      if (action.type === 'FETCH') return { status: 'loading' };
      return state; // any other action from idle is a no-op, by design
    case 'loading':
      if (action.type === 'SUCCESS') return { status: 'success', data: action.data };
      if (action.type === 'ERROR')   return { status: 'error', error: action.error };
      return state; // a second FETCH while loading does nothing: impossible state avoided
    case 'success':
    case 'error':
      if (action.type === 'FETCH') return { status: 'loading' };
      return state;
  }
}
```

Read what that bought you.

The illegal combinations from Section 5 (loading-and-error, success-with-no-data) cannot occur, because the only way to reach `success` is the `SUCCESS` action, which always carries `data`, and the only way to reach `error` carries `error`.

A duplicate `FETCH` while already `loading` is explicitly a no-op.

You did not add defensive checks.

You described the legal transitions and let everything else be ignored.

This is the structural discipline of Section 5 made continuous: every future change goes through the reducer, so the shape stays legal as the code evolves, not just on the day you refactored it.

Two mechanical perks carry over from the Hooks guide and matter at the architecture level.

First, `dispatch` is referentially stable for the life of the component, so handing `dispatch` to deep children or through Context does not itself cause re-renders, which makes the "reducer plus Context" pattern (Section 10) clean.

Second, the reducer is pure, so it is testable in isolation and behaves predictably under StrictMode's double-invoke (Hooks guide, Section 5).

If your reducer mutates state or has side effects, StrictMode will surface it.

When do you reach for a dedicated state-machine library (the best known is XState) rather than a hand-rolled reducer?

When the machine gets large enough that you want explicit visualization, nested or parallel states, guards, and machine-level side-effect orchestration, the things a reducer makes you hand-roll.

For most component-level state, a reducer shaped as a small machine, as above, is enough and keeps the dependency count down.

The point is the *modeling discipline* (named states, explicit transitions), which you can apply with a plain reducer.

A library is an upgrade for when that discipline outgrows a switch statement.

### Try it

> Build a fetch lifecycle first with loose `useState` booleans, then reach a duplicate-submit bug (fire the action twice quickly and watch two requests or a confused state). Rewrite it as the reducer-as-machine above and confirm the duplicate submit is now a structural no-op you did not have to special-case.

### You've got this if

You can explain how modeling transitions explicitly (a state machine) prevents illegal states more durably than writing correct setter calls by hand, and when a reducer is enough versus when a machine library earns its place.

---

## 7. Prop drilling: when it is fine and when it is a smell

Prereqs: Section 3 (lifting state).

This section is the bridge from lifting to Context.

### The itch

You lifted some state to a common ancestor, and now you are threading the same `value` and `onChange` through five intermediate components that do nothing with them but pass them along.

It feels wrong.

But you have also heard "Context is overused," so you are not sure whether this drilling is a real problem or just mild annoyance.

### The short version

Prop drilling is passing a prop down through intermediate components that do not use it, only to reach a deep descendant that does.

A little of it is completely fine and is often clearer than the alternative, because the data flow is explicit and traceable.

It becomes a smell when the same props thread through many layers or large parts of the tree, at which point the noise obscures each component's real job.

That smell, the noise of transport, not a performance problem, is the specific thing Context is built to relieve.

### How it actually works

First, be precise about what prop drilling is and is not, because the term gets used as a slur for any prop passing.

Passing a prop one or two levels to a child that uses it is not drilling.

It is just props doing their job, and it is the clearest possible data flow.

Drilling specifically means a prop passing *through* components that do not care about it, purely as a conduit to something deeper.

The cost of drilling is not performance (passing a prop is nearly free, and a well-placed `React.memo` can stop unrelated re-renders).

The cost is *clarity*.

Every intermediate component's signature now advertises props it does not use, and a reader tracing the data has to follow it through layers of indifferent middlemen.

So the honest position is that a small amount of drilling is fine and often *preferable* to reaching for Context, for two reasons.

One, explicit props make the data flow visible: you can see exactly where a value comes from and where it goes by reading the tree, whereas Context makes the connection implicit (a consumer just "knows" a value, and you have to find the matching provider).

Two, Context has real costs of its own (the re-render behavior of Sections 9 through 11, and the coupling of consumers to a provider's existence).

Trading two levels of explicit props for an implicit Context dependency is usually a bad trade.

The React docs make this point directly: before reaching for Context, consider whether passing props is actually fine, and whether the deep component even needs to be that deep.

When *is* drilling a real smell worth fixing?

When the same value threads through many layers or branches, so that a meaningful fraction of your components carry pass-through props that have nothing to do with their purpose.

The signal is qualitative: you find yourself adding a prop to several components solely so a distant descendant can receive it, and those components' signatures are getting cluttered with transport they ignore.

At that point the noise outweighs the clarity benefit, and the value is genuinely "ambient" (a theme, the current user, a locale) rather than specific to one path.

That is the case Context was designed for, and the next section is about what Context actually is before you use it.

A useful intermediate move before Context, which the docs also recommend, is component composition: instead of drilling props down to a deep child, pass the deep child itself *in* as a prop (often `children`) from higher up, where the data already lives.

This is the same "children pattern" that appears in the RSC guide for a different reason.

If a layout component is only drilling props to render a child, consider whether the parent that has the data can render that child and pass it down as an element, removing the need to drill at all.

Composition often dissolves a drilling problem without introducing Context's implicit coupling.

### Try it

> Build a four-level-deep component that needs a value held at the top, and drill it through the two middle layers. Notice how the middle components' props now mention something they do not use. Then refactor using composition: have the top-level component render the deep child as `children` and pass the value directly, and watch the middle layers lose the pass-through prop entirely.

### You've got this if

You can explain why a little prop drilling can be clearer than Context, and name the specific condition that turns drilling from fine into a smell.

---

## 8. Context is dependency injection, not state management

Prereqs: Section 7.

From the rendering guide: what Context is (the Provider and consumer concept), defined inline here.

### The itch

You reach for Context expecting it to "manage" shared state, and then you are confused when it does not give you selectors, does not prevent re-renders, and seems to need a `useState` next to it to actually hold anything.

The confusion comes from a category error: Context is not a state manager.

It is a transport.

### The short version

Context is a way to make a value available to a subtree without passing it through props at every level.

That is the whole job: dependency injection, or transport.

It does not store state, manage updates, or optimize re-renders by itself.

You hold the state with `useState` or `useReducer` in a component above, and use Context only to *deliver* that state to deep consumers without drilling.

Treating Context as a state-management solution is the source of most of the trouble people have with it.

Treating it as a delivery mechanism for state you manage elsewhere is how to use it correctly.

### How it actually works

Here is the one-line definition, in case you are coming straight from the Hooks guide.

A Context is a channel you create with `createContext`.

A `Provider` component places a value onto that channel for everything in its subtree, and any descendant can read that value with `useContext` (or `use(Context)`) without it being passed as a prop through the intervening components.

That is all Context is: a way for a deep component to read a value from an ancestor without the layers in between having to carry it.

The rendering guide covers how the read and the propagation are wired.

Here the important thing is what Context *is for*.

The category error is expecting Context to do the jobs a state library does.

Context does not hold state: a Context by itself has no memory.

You give its Provider a `value`, and that value comes from somewhere, almost always `useState` or `useReducer` in a component wrapping the Provider.

Context does not manage updates: when you want to change the shared value, you change the state that feeds the Provider, using the normal setter.

Context just carries the new value down.

And, crucially, Context does not optimize anything: every consumer re-renders when the value changes, with no way to subscribe to part of it (Sections 9 through 11).

So "Context versus Redux" is a slightly confused framing.

The real pairing is "Context plus `useState`/`useReducer`" as a way to *share* state you are managing with React's own primitives, versus an external store as a different way to *manage and share* state.

Context is the transport in the first option, not a competitor to the store in the second.

Seen correctly, the idiomatic pattern is: hold the state with a hook in a Provider component, and expose it through Context so deep consumers can read it without drilling.

```js
const ThemeContext = createContext(null);

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light'); // the state lives here, managed with React's primitives
  const value = useMemo(() => ({ theme, setTheme }), [theme]); // Context just transports it (Section 10)
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useTheme() {
  const ctx = useContext(ThemeContext);
  if (ctx === null) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
```

Notice the division of labor: `useState` *manages* the theme, Context *delivers* it, and the custom hook (`useTheme`, an application of the Hooks guide's Section 14) gives consumers a clean way to read it with a helpful error if the Provider is missing.

The state management is React's normal machinery.

Context only removes the drilling.

This is why Context is excellent for genuinely ambient, rarely-changing values, theme, current user, locale, feature flags, where the win is "deep components can read this without every layer carrying it" and the rare-change part keeps the re-render cost (next section) a non-issue.

The reason this framing matters so much is that it tells you exactly when Context is the wrong tool.

If your shared value changes frequently, or is large and different consumers need different slices of it, Context's "deliver the whole value, re-render every consumer" model is a poor fit, and no amount of using Context "better" fixes that, because optimizing slice-level subscriptions is simply not something Context does (Section 11).

Knowing Context is a transport, not a manager, is what stops you from trying to make it do a job it was never built for and reaching instead for the right tool (an external store, Section 12).

### Try it

> Build the `ThemeProvider` above and a deep consumer that calls `useTheme`. Confirm the intervening components carry no theme prop. Then notice what is doing what: remove the `useState` and watch the Provider have nothing to provide, which makes concrete that Context transports state but does not hold it.

### You've got this if

You can explain why "Context versus Redux" is a confused comparison, and state what Context actually pairs with to manage shared state.

---

## 9. How context propagates, and the re-render trap

Prereqs: Section 8.

From the Hooks guide: referential stability (Section 8).

From the rendering guide: the bailout that lets `React.memo` skip work, defined inline here.

### The itch

You put a value in Context, and now every consumer re-renders constantly, even consumers wrapped in `React.memo`, even when the part of the value they read did not change.

You suspect Context is "slow," but the real cause is almost always one specific mistake in how you build the Provider's value.

### The short version

When a Provider's `value` changes (compared by `Object.is`), React re-renders every component that consumes that context, and it does so even through `React.memo` boundaries, because context consumers subscribe to the context directly and are not protected by the normal props bailout.

The notorious trap is passing a freshly-created object as the value (`value={{ user, setUser }}`), which is a new identity every render (Hooks guide, Section 8), so the value "changes" every single render and every consumer re-renders every render.

The fix (Section 10) is to stabilize the value and split contexts.

This section is about why it happens.

### How it actually works

Two mechanisms combine here, and you need both to understand the trap.

First, how a context update reaches consumers.

When you render a Provider with a new `value`, React compares it to the previous value with `Object.is`.

If it is unchanged, nothing happens.

If it changed, React needs to update every consumer of that context, so it walks the subtree and marks each component that reads this context as needing to re-render.

The important part is the *granularity*: the unit of change is the entire `value`.

React knows "the value changed," not "the `theme` field of the value changed." Every consumer is told to re-render, regardless of which part of the value it actually reads.

(Section 11 is entirely about this limitation.)

Second, why `React.memo` does not save you.

Recall the bailout from the rendering guide, defined here in one line: `React.memo` lets a component skip re-rendering when its *props* are unchanged, by short-circuiting the normal top-down render propagation at that boundary.

But context consumption is a *separate subscription* that does not go through props.

A component that calls `useContext(C)` has registered a direct dependency on `C`, and when `C`'s value changes, React schedules that component to re-render *regardless of its props*, punching straight through any `React.memo` boundary above it.

This is by design: a consumer's whole purpose is to react to the context, so React cannot let a props-based bailout suppress that.

The practical consequence is that you cannot fix a context re-render problem with `React.memo` on the consumers.

The memo is bypassed for exactly the update you are trying to contain.

Now the trap, which is the collision of these two facts with referential stability (Hooks guide, Section 8):

```js
function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');
  // BUG: a brand-new object literal every render → new identity every render
  return (
    <AppContext.Provider value={{ user, setUser, theme, setTheme }}>
      {children}
    </AppContext.Provider>
  );
}
```

Every time `AppProvider` re-renders, for *any* reason, including a parent re-rendering or either `useState` changing, the `value={{ ...

}}` expression constructs a new object with a new identity.

React compares it to the previous value with `Object.is`, sees a different object, concludes "the value changed," and re-renders every consumer of `AppContext`, even consumers that only read `theme` when it was `user` that changed, even consumers wrapped in `React.memo`.

The context is not slow.

You are handing it a new value every render, so it faithfully propagates a "change" every render.

This one mistake, an inline object (or array, or function) as the Provider value, is the single most common cause of "Context made my app re-render everywhere," and it is pure referential instability wearing a Context costume.

There is a second, related trap worth naming: the **one big context**.

Even with a stabilized value, if you put many unrelated pieces of state into a single context's value object (`{ user, theme, notifications, cart, settings }`), then *any* change to *any* of them changes the value object, which re-renders *every* consumer of that context, including those that only read an unrelated field.

A consumer that reads only `theme` re-renders when `cart` changes, because they share one value and context cannot distinguish which field a consumer uses.

So the size and heterogeneity of a context's value is itself a re-render hazard, independent of the identity bug above.

The fixes for both are in the next section.

### Try it

> Build a Provider with an inline object value and three consumers, one reading each field, each logging its renders and wrapped in `React.memo`. Change one field and watch all three re-render despite the memo. Then change something unrelated in the Provider's parent and watch them all re-render again (the identity bug). Seeing the memo get bypassed is the moment context propagation becomes real.

### You've got this if

You can explain why a `React.memo` on a context consumer does not prevent it from re-rendering when the context value changes, and why an inline object as the Provider value re-renders every consumer every render.

---

## 10. Taming context: split, stabilize, separate

Prereqs: Section 9.

From the Hooks guide: `useMemo` for stabilizing identity (Section 12) and `dispatch` stability (Section 5).

### The itch

You understand now *why* Context over-renders.

You want the concrete moves that fix it without abandoning Context, because for ambient state Context is still the right tool, you just need it to stop re-rendering everything.

### The short version

Three fixes, each targeting a cause from Section 9.

Stabilize the Provider value with `useMemo` (or by passing already-stable values) so it stops changing identity every render.

Split one big context into several smaller ones grouped by how often each part changes and who consumes it, so a change to one part does not re-render consumers of the others.

And separate state from its setters into two contexts, because setters and `dispatch` are referentially stable and their consumers should never re-render.

Applied together, these make Context perform well for the ambient-state job it is suited to.

### How it actually works

#### Fix one: stabilize the value

The inline-object bug from Section 9 is referential instability, so the fix is the referential-stability tooling from the Hooks guide (Section 12): wrap the value in `useMemo` keyed by its actual contents, so the value object keeps the same identity until something inside it genuinely changes.

```js
const value = useMemo(() => ({ user, setUser }), [user]); // setUser is already stable; only re-create when user changes
return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
```

Now when `AppProvider` re-renders for an unrelated reason, `value` keeps its identity (because `user` did not change), `Object.is` reports "unchanged," and consumers are not disturbed.

With the React Compiler on (rendering guide, 2026 section), this memoization is often inserted for you, but the principle is the thing to understand: the Provider value must be referentially stable across renders where its contents did not change, or every consumer pays.

#### Fix two: split by change frequency and consumer

The one-big-context problem is that unrelated state shares one value, so one change re-renders everyone.

Split it into multiple contexts grouped so that things that change together, and are consumed together, live together, and things that change at very different rates live apart.

```js
// Instead of one AppContext holding everything:
<UserContext.Provider value={userValue}>
  <ThemeContext.Provider value={themeValue}>
    <NotificationsContext.Provider value={notificationsValue}>
      {children}
    </NotificationsContext.Provider>
  </ThemeContext.Provider>
</UserContext.Provider>
```

Now a component that reads only the theme consumes only `ThemeContext`, so a change to notifications (a different context) does not touch it.

The guiding question for where to draw the lines is "what changes together, and who reads what": put the rarely-changing ambient values (theme, locale, current user) in their own contexts, and keep a frequently-changing value out of any context that quiet consumers depend on.

There is a limit to this, though: pushed too far, splitting becomes "provider sprawl," a deeply nested stack of providers each holding one field, which is its own kind of complexity and still does not give you slice-level subscriptions within a context.

When you find yourself splitting contexts purely for performance rather than for logical grouping, that is the signal you have outgrown Context and want an external store (Section 11 and 12).

#### Fix three: separate state from dispatch

This one is high-leverage and underused.

The *state* in a context changes often.

The *way to change it* (a `useState` setter, or a reducer's `dispatch`) is referentially stable for the component's life (Hooks guide, Sections 4 and 5).

If you put both in one context value, then every consumer that only needs to *dispatch* (a button that fires an action but does not read the state) re-renders whenever the state changes, for nothing.

Split them into two contexts:

```js
const StateContext = createContext(null);
const DispatchContext = createContext(null);

function Provider({ children }) {
  const [state, dispatch] = useReducer(reducer, initial);
  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
    </StateContext.Provider>
  );
}
```

Because `dispatch` never changes identity, `DispatchContext`'s value is stable forever, so components that only dispatch (read `DispatchContext`, not `StateContext`) never re-render from state changes at all.

Only components that actually read the state subscribe to `StateContext` and re-render when it changes.

This "state context plus dispatch context with a reducer" is the canonical scalable-Context pattern the React docs themselves describe, and it is the natural endpoint of Sections 6, 8, and this one combined: a reducer manages the state, two contexts transport state and dispatch separately, and the stability of `dispatch` does the optimization for free.

Together these three fixes make Context perform well for ambient and moderately-changing shared state.

What they cannot do is give a single context slice-level subscriptions, so that a consumer re-renders only when the specific field it reads changes.

That is the hard ceiling, and it is the subject of the next section.

### Try it

> Take the over-rendering Provider from Section 9. Apply `useMemo` and watch the unrelated re-renders stop. Split into state and dispatch contexts, put a dispatch-only button under the dispatch context, and confirm it never re-renders when the state changes. You have now made Context behave, within its limits.

### You've got this if

You can explain why splitting state and dispatch into two contexts lets dispatch-only consumers skip re-renders entirely, using the word "stable."

---

## 11. The selectivity gap: why context does not scale

Prereqs: Sections 9 and 10.

### The itch

You have stabilized and split your contexts and it still is not enough: you have one context whose value legitimately changes often, many consumers read different slices of it, and every change re-renders all of them because each only needs a slice but gets notified of the whole thing.

You have hit Context's actual ceiling, and the fix is not more Context.

### The short version

Context has no built-in way to subscribe to *part* of its value.

A consumer of a context re-renders when the value changes, full stop.

It cannot say "only re-render me when `value.theme` changes." This is the selectivity gap.

Splitting contexts (Section 10) works around it at the granularity of whole contexts, but within a single context there is no slice-level subscription, and React 19.x still does not add one.

When you genuinely need many consumers reading different slices of frequently-changing shared state, this gap is the reason you step outside React's tree to an external store (Section 12).

### How it actually works

Make the limitation precise.

From Section 9, a context's unit of change is the whole `value`: React knows the value changed, not which field, and notifies every consumer.

Splitting into multiple contexts (Section 10) raises the granularity from "one value" to "one value per context," which helps when different concerns change at different rates.

But *within* one context, there is no selection: if a context's value is `{ a, b, c }` and a consumer only reads `a`, that consumer still re-renders when `b` or `c` changes, because it subscribed to the context, not to `a`.

There is no API to subscribe to a derived slice of a context value and re-render only when that slice changes.

This is not an oversight you can configure away.

A proposal to add context selectors to React (so a consumer could subscribe to `ctx => ctx.a` and re-render only when `a` changes) has existed as an RFC for years and has not been adopted.

As of React 19.x there is still no built-in context selector.

Userland libraries (the well-known one is `use-context-selector`) implement it, but they require creating the context with the library rather than React's own `createContext`, and they re-implement the subscription mechanism under the hood (they do not make React's native context selective).

So the honest state of things in 2026 is: native Context is all-or-nothing per context, and selectivity within a context is something you bolt on with a library or, more commonly, get by using a different tool entirely.

The concurrency angle makes the gap more expensive, which is worth knowing because it explains why the React community leans harder on external stores now than a few years ago.

Under React 19's concurrent rendering (rendering guide, the concurrency section), a render can be started, interrupted, and replayed before it commits.

A context change that broadcasts to many consumers can trigger a broad swath of speculative re-rendering that may be re-run more than once before a commit lands.

So an over-broad context update is not just "some extra re-renders".

Under concurrency it can be extra *speculative* re-renders, repeated.

The broader the broadcast, the more this costs.

The structural consequence is the bridge to the next section.

When you have shared state that is (a) read by many components, (b) sliced differently by different consumers, and (c) changing frequently, Context's "notify every consumer of the whole value" model is fundamentally the wrong shape, and the workarounds (split contexts, memoize) cannot close the gap because the gap is the lack of slice subscriptions, not a tuning problem.

The right move is to put that state in a store that lives *outside* React's tree, where components can subscribe to exactly the slice they read via a selector, so updating one slice re-renders only the components that read that slice.

That is precisely what external state libraries provide, and the mechanism React gives them to do it correctly is `useSyncExternalStore` (Hooks guide, Section 15).

The next section is the shared mental model behind all of them.

### Try it

> Build a single context whose value is `{ count, name }`, with one consumer reading only `count` and another reading only `name`, both logging renders. Update `count` and watch the `name`-only consumer re-render anyway. Confirm that no amount of `React.memo` or `useMemo` on the consumer side fixes it (the subscription is to the context, not the slice). That stubborn re-render is the selectivity gap, and it is why Section 12 exists.

### You've got this if

You can explain why splitting contexts helps but cannot fully solve the problem of consumers reading different slices of one frequently-changing value, and what mechanism external stores use instead.

---

## 12. External stores: the shared mental model

Prereqs: Section 11.

From the Hooks guide: `useSyncExternalStore` (Section 15).

From the rendering guide: tearing (why a consistent read matters under concurrency), defined inline here.

### The itch

You have decided Context is not enough and you are about to pick a library, but the libraries look wildly different on the surface (Redux's actions and reducers, Zustand's tiny hook, Jotai's atoms).

You want the *one* idea they share, so the choice is about ergonomics rather than relearning state from scratch each time.

### The short version

Every external store works the same way underneath: the state lives in a plain JavaScript object or closure *outside* React's component tree, components *subscribe* to it (usually to a specific slice via a selector function), and the store *notifies* only the subscribers whose slice actually changed, which re-renders just those components.

React's official bridge for subscribing to an external store safely (including under concurrent rendering, without a consistency bug called tearing) is `useSyncExternalStore`.

Once you see that shared shape, the libraries differ mainly in how you define state and selectors, not in what they fundamentally do.

### How it actually works

The defining move is stepping *outside* React.

A store is just some state held in a module-level object or closure that is not part of any component's render.

Because it lives outside the tree, changing it does not go through React's top-down re-render propagation at all.

Instead, the store maintains a list of subscribers (callbacks), and when its state changes it calls those callbacks.

A component connects to the store by subscribing and reading the slice it cares about.

When the store notifies, the component checks whether its slice changed and re-renders only if it did.

This inverts Context's model: Context *pushes* the whole value down to every consumer.

A store lets each component *pull* exactly the slice it needs and be notified only about that slice.

That inversion is what closes the selectivity gap from Section 11.

The selector is the key ergonomic and performance piece.

A component does not subscribe to "the store".

It subscribes with a selector function, `store => store.user.name`, that picks out the slice it reads.

The store (or the binding hook) runs the selector when the state changes and compares the selector's output to its previous output.

If the output is unchanged, the component does not re-render.

So updating `store.cart` does not re-render a component whose selector reads `store.user.name`, because that selector's output did not change.

This gives you fine-grained, roughly constant-time invalidation: a change re-renders only the components whose selected slice changed, no matter how many total consumers the store has.

That is the property Context cannot provide and the reason large or fast-changing global state belongs in a store.

The bridge to React has to be done carefully, and this is where `useSyncExternalStore` comes in (Hooks guide, Section 15).

You cannot just read a mutable external value during render and call it a day, because of a concurrency bug called **tearing** (rendering guide): under concurrent rendering, React can pause partway through rendering the tree, and if the external store mutates during that pause, components rendered before the pause would see the old value and components rendered after would see the new value, so a single screen shows two different versions of the same state, "torn." `useSyncExternalStore(subscribe, getSnapshot)` exists to prevent exactly this: it gives React a controlled way to subscribe to the store and to read a consistent snapshot, so that an entire render sees one coherent value of the store even if the store changes mid-render.

Every well-behaved store library uses `useSyncExternalStore` (or an equivalent) under the hood for this reason, which is why you can trust them under React 19's concurrency.

You will rarely call it yourself.

You will use a library that calls it for you, but knowing it is there explains *how* a store stays correct.

So the mental model, library-agnostic, is three parts: **state outside the tree**, **selector-based subscription** (pull the slice you need, re-render only when it changes), and **a safe React binding** (`useSyncExternalStore`) that avoids tearing.

Hold that, and every store library is a variation on it.

They differ in how you declare the state (one big store object, a set of small atoms, a proxy you mutate), how you write selectors (explicit functions, automatic dependency tracking), and what extras they bundle (middleware, devtools, persistence), but the engine room is the same.

The next section walks the main archetypes through that lens.

### Try it

> Without any library, build a tiny store: a module with a `let state`, a `getState`, a `setState` that updates and calls subscribers, and a `subscribe`. Connect two components with `useSyncExternalStore`, each reading a different slice via `getSnapshot`. Update one slice and confirm only the component reading it re-renders. You have just built, in about 20 lines, the core that every store library wraps in nicer ergonomics.

### You've got this if

You can explain how selector-based subscription closes the selectivity gap from Section 11, and what `useSyncExternalStore` protects against.

---

## 13. The library landscape as archetypes

Prereqs: Section 12.

Outside React: pure reducers, immutable updates (and the Immer library), JavaScript Proxies, and the idea of a selector function, since the archetypes are built from these.

### The itch

You finally have to pick something, and the field is crowded: Redux Toolkit, Zustand, Jotai, and a handful of others, plus the ghost of Recoil that tutorials still mention.

You do not want a feature-by-feature bake-off.

You want to know which *shape* of solution each one is, so you can match it to your problem and learn it as a variation on the model from Section 12.

### The short version

The libraries cluster into a few archetypes, all built on the external-store model.

#### Single-store

libraries (Redux Toolkit) keep all state in one object updated by pure reducers via dispatched actions, with selectors to read slices.

Predictable and toolable, with the most ceremony.

#### Minimal-store

libraries (Zustand) keep the same single-store-with-selectors idea but strip the ceremony down to a hook and direct setters, with no provider.

#### Atomic

libraries (Jotai, and the now-deprecated Recoil that pioneered the model) build state bottom-up from many tiny independent atoms that compose into derived atoms, giving fine-grained subscriptions by construction.

#### Proxy

libraries (Valtio, MobX) let you read and mutate state like a plain object and track access automatically.

Match the archetype to your app's shape.

Do not cargo-cult the heaviest one.

### How it actually works

Read each as a point in the design space defined by Section 12 (state outside the tree, selector subscriptions, safe binding), differing in how you declare state and how subscriptions are expressed.

#### Single store, actions and reducers: Redux Toolkit

The model is one central store holding all application state as a single (usually normalized, Section 5) object, changed only by dispatching *actions* that pure *reducers* turn into the next state, and read through *selector* functions.

Redux Toolkit is the modern, official way to write Redux.

It removes most of the old boilerplate (it generates action creators, uses Immer so you can write "mutating" reducer code that produces immutable updates, and bundles good defaults).

The strengths are predictability (every change is an explicit, logged, replayable action), powerful devtools (time-travel debugging, because the whole history is a sequence of actions over one state), and a clear place for complex shared logic and middleware (side effects, async flows).

The cost is ceremony and concepts: actions, reducers, selectors, the store, and the mental overhead of routing every change through that pipeline.

It earns its keep in large applications with complex, widely-shared client state and teams that benefit from the strict structure and tooling.

It is overkill for a small app or for state that is mostly server data (Section 14) or mostly local (Section 2).

#### Minimal store, hook and setters: Zustand

Same underlying shape as Redux (one store, selector-based reads) but stripped to the bone: you create a store as a hook, read slices by passing a selector to that hook, and update state by calling setters directly, with no actions, no reducers required, and no provider wrapping your tree.

It uses the external-store mechanism (and `useSyncExternalStore`) so selector subscriptions give you the fine-grained re-renders from Section 12.

The strength is ergonomics: very little code, an easy mental model, and good performance by default.

The trade is less imposed structure (you can organize a Zustand store well or badly, and it will not force the discipline Redux does) and lighter built-in tooling than Redux's.

It is an excellent default for global client state that needs slice subscriptions without Redux's overhead.

#### Atomic, bottom-up: Jotai (and the deprecated Recoil)

Instead of one big store you define from the top, you build state from the bottom out of many tiny *atoms*, each a small independent piece of state.

Atoms compose: a *derived atom* is defined in terms of other atoms and recomputes when they change, and components subscribe to exactly the atoms they read, so re-renders are fine-grained by construction (no manual selectors, reading an atom *is* the subscription).

This model shines when you have many small, independent pieces of state (form fields, filters, per-item state) that combine in varied ways, and it composes derived state cleanly.

Recoil pioneered this atoms-and-selectors model, but Meta archived Recoil at the start of 2025 and it is no longer maintained, so do not start new projects with it.

#### Jotai is the actively maintained successor

with the same atomic model and current React 19 support.

Reach for the atomic archetype when your state is naturally a graph of small interdependent pieces rather than one monolith.

#### Proxy, mutate-and-track: Valtio, MobX

These let you treat state as a plain mutable object: you read and write properties normally, and the library uses JavaScript Proxies (or observables) to track which components read which properties and re-render exactly those when the properties change.

The appeal is the most natural-feeling code (no setters, no selectors, just `state.count++`), with automatic fine-grained tracking.

The trade is that the "magic" is less explicit (it can be harder to reason about exactly when something re-renders) and the mutable style is a different mental model from React's usual immutability.

MobX is the long-established option.

Valtio is a lighter, more React-native take.

Choose this archetype if your team strongly prefers the mutable, automatic-tracking style and accepts the implicitness.

The decision guidance that falls out: do not start here.

Most state is local (Section 2) or lifted (Section 3) or server state (Section 14), none of which needs a global store at all.

Reach for a store only when you have genuinely global client state that many components share and slice differently, or that changes frequently enough that Context's selectivity gap (Section 11) bites.

When you do, pick the archetype by your state's shape and your team's taste: Redux Toolkit for large apps wanting strict structure and time-travel tooling, Zustand for a minimal global store with selector subscriptions, Jotai when state is a graph of small composable pieces, a proxy library if you want mutable automatic tracking.

They are variations on one model, so the cost of choosing "wrong" is mostly ergonomic, not architectural.

### Try it

> Take a small piece of genuinely global client state (say a theme plus a sidebar-open flag) and implement it twice: once with Zustand (a tiny hook store with two selectors) and once with Jotai (two atoms). Notice that the underlying behavior is identical (slice subscriptions, fine-grained re-renders) and only the *shape* of the code differs. That sameness is the Section 12 model showing through.

### You've got this if

You can place Redux Toolkit, Zustand, and Jotai as points in one design space, and say which archetype fits "a graph of many small interdependent pieces of state."

---

## 14. Server state is not client state

Prereqs: Section 1 (location and ownership).

The full mechanics are the next guide (Data Fetching and Server State).

This section is the architectural distinction that reorganizes everything above.

### The itch

You fetch data from your API and store it in `useState`, or in Redux, alongside your UI state.

Then you are hand-writing loading flags, error handling, refetch-on-focus, caching, and dedup, and the data goes stale and you are not sure when to refetch.

You are treating remote data as if it were client state, and that mismatch is the source of an enormous amount of accidental complexity.

### The short version

There are two fundamentally different kinds of state, and conflating them is the biggest state-management mistake there is.

**Client state** is state your app owns and that is synchronous and always current: UI toggles, form inputs, selections.

**Server state** is a local *cache* of data that actually lives on a server: it is asynchronous, shared, owned by the server, and can become stale the moment you fetch it, because something else can change it.

Server state needs caching, synchronization, and staleness handling that client-state tools (`useState`, Redux, Context) do not provide, which is why dedicated server-state libraries (the one you have used, React Query, now TanStack Query, and RTK Query) exist.

Putting server data in client-state tools is what forces you to reinvent all of that by hand.

### How it actually works

Lay the two side by side, because the differences are not cosmetic.

They change what the state *needs*.

Client state is owned by your application and lives only in the browser.

It is synchronous (you set it and it is immediately the new value), it is the single source of truth for itself (nothing else can change your modal-open flag behind your back), and it does not go stale (it is exactly what you last set it to).

`useState`, `useReducer`, lifted state, Context, and the stores from Section 13 are all built for this: synchronous, client-owned, single-source-of-truth state.

Server state is a different animal.

The real data lives on your server (or a third-party API), and what you hold in the browser is a *copy*, a cache, that was accurate at the moment you fetched it.

That single fact cascades into a list of needs client-state tools do not address:

- It is **asynchronous**: fetching takes time and can fail, so every piece of server state implicitly has loading and error conditions (the exact `status` modeling from Section 5).
- It is **shared and owned elsewhere**: other users, other tabs, or background processes can change the real data, so your cached copy can be **stale** without your app doing anything. "When should I refetch" is a question that simply does not exist for client state.
- It needs **caching and deduplication**: the same data is often needed by multiple components. You want one cached copy and one in-flight request, not each component fetching independently.
- It benefits from **background synchronization**: refetching on window focus or reconnect, revalidating in the background while showing cached data, so the user sees something immediately and it quietly updates.

When you store server data in `useState` or Redux, you are using a tool with none of those capabilities, so you end up hand-building all of them: a loading boolean here, an error state there, a manual cache keyed somehow, refetch logic, dedup logic, focus listeners.

That hand-built machinery is fragile, repeated across features, and exactly what a server-state library provides as its core job.

The whole reason React Query and similar tools feel like such a relief is that they treat server state as what it is, a cache with staleness, and give you the caching, deduplication, background revalidation, and `status` modeling as built-in behavior rather than something you assemble per feature.

The architectural payoff of internalizing this distinction is that it *removes* a huge amount of state from your client-state decisions.

A great deal of what people put in Redux or Context or atoms is actually server state that should live in a query cache instead, and once it moves there, your remaining client state is small, local, and simple, exactly the lower rungs of Section 1's ladder.

So "do I need Redux" often resolves to "no, most of that was server state. Put it in a query library and the rest is local." This is the single most clarifying move in modern React state architecture, and it connects directly to your own work with `useQuery`, the `enabled` flag, and the `useQuery`-versus-`useEffect` decisions.

The next guide, Data Fetching and Server State, is the full mechanism: the caching model, stale-while-revalidate, query keys, deduplication, background refetch, optimistic updates, and the rest.

This section's job is only to plant the distinction firmly, because it reorganizes everything in this guide: server state is a separate axis, and most of it should never touch your client-state tools at all.

### Try it

> Find a place in your own code where you fetch data into `useState` and then maintain `isLoading` and `isError` next to it by hand. Count the lines doing caching, loading, and error bookkeeping. That line count is the tax of treating server state as client state, and it is roughly what a server-state library would handle for you. You do not have to migrate it now. Just see the tax clearly.

### You've got this if

You can explain why server state needs caching and staleness handling that client state does not, and why moving server data out of your client-state tools usually shrinks your "do I need a store" problem.

---

## 15. A decision framework

Prereqs: ideally Sections 1 through 14.

### The itch

You have the pieces.

Now you want a repeatable way to decide, for any given piece of state, where it should live, so you are not relitigating the whole question every time.

### The short version

Ask a short, ordered series of questions for each piece of state, and stop at the first one that fits.

Is it server data?

Can it be derived?

Can it be local?

Does it need to be shared, and if so, how widely and how often does it change?

The order matters: it routes most state to the cheap, low rungs and reserves the expensive ones for the cases that truly need them.

### How it actually works

Run these in order for each piece of state.

Each question, answered yes, tells you where the state goes.

Only fall through to the next if the answer is no.

1. **Is it server data (a cache of something that lives on your server)?** If yes, it belongs in a server-state library (a query cache), not in any client-state tool (Section 14). This is first on purpose, because it removes the largest share of state from the rest of the decision. Most "global state" is server state in disguise.

2. **Can it be derived from existing state or props?** If yes, do not store it. Compute it during render, memoizing only if expensive (Section 4). This is second because it deletes state entirely rather than placing it. Every value you derive is a value you do not have to manage or risk desyncing.

3. **Is it used by only one component (or that component plus its own children)?** If yes, keep it local with `useState` or `useReducer`, owned by that component (Sections 2 and 6). This is the default and the destination for most genuinely-client, non-derived state.

4. **Is it shared by a few components near each other?** If yes, lift it to their nearest common ancestor and pass it down (Section 3). Do not escalate further unless drilling becomes a real smell (Section 7).

5. **Is it shared widely, but ambient and rarely-changing (theme, user, locale)?** If yes, use Context as a transport over `useState`/`useReducer`, with the value stabilized and contexts split sensibly (Sections 8 and 10). The rare-change part is what keeps Context's re-render cost acceptable.

6. **Is it shared widely AND frequently-changing, with different consumers reading different slices?** If yes, this is the case Context cannot serve well (the selectivity gap, Section 11). Use an external store with selector subscriptions, picking the archetype that fits your state's shape (Sections 12 and 13).

7. **Are the transitions complex, with illegal combinations to prevent?** Orthogonal to where the state lives: model it as a reducer or state machine so the legal transitions are explicit and illegal states are unrepresentable (Sections 5 and 6). This applies whether the state is local, lifted, in Context, or in a store.

The reason the order is cheap-to-expensive is the cost structure from Section 1: deriving costs nothing, local state is cheapest, lifting widens blast radius, Context adds implicit coupling and broad re-renders, and a store adds a dependency and its own concepts.

Climbing only as far as a real constraint forces you keeps your architecture at the lowest-cost rung that actually works, which is almost always lower than the instinct to "just use Redux" would put it.

#### The whole thing in one paragraph

State management is the discipline of deciding, for each piece of state, where it lives and who owns it, because the location of state is the blast radius of its changes and the clarity of its ownership is the traceability of your data flow.

Keep state as low as it will go (colocation), lift it only to the nearest common ancestor that needs it, and never store what you can derive, because a derived value computed during render cannot desync while a stored one synced by an effect always can.

Shape what state remains so illegal combinations are unrepresentable, and consolidate complex transitions in a reducer or state machine so the legal transitions are explicit.

To share without drilling, use Context as a transport for state you still manage with React's own primitives, remembering that Context delivers the whole value to every consumer and bypasses `React.memo`, so an unstable Provider value or one-big-context re-renders everyone.

Stabilize and split to contain it.

But Context has no slice-level subscriptions, a gap React 19 still does not close, so when shared state is large or fast-changing and sliced differently by many consumers, step outside the tree to an external store, which holds state outside React, lets components subscribe to exactly the slice they read via a selector, and binds to React safely through `useSyncExternalStore`.

The libraries (Redux Toolkit, Zustand, Jotai, the proxy ones) are ergonomic variations on that one model.

Above all, separate server state, a cache of remote data that is async, shared, and goes stale, from client state, and keep it in a query library rather than your client-state tools, because that single distinction removes most of what tempts people toward heavyweight global state in the first place.

### Try it

> Take a feature you are about to build and run every piece of its state through the seven questions before writing any code. Notice how few pieces make it past question three, and how the ones that reach questions five and six are the genuinely shared, genuinely client ones. That funnel is the framework working.

### You've got this if

You can run an arbitrary piece of state through the ordered questions and justify, at each step, why you did or did not escalate to the next rung.

---

## 16. Debugging state architecture

Prereqs: the rest of the guide.

### The itch

Something is structurally wrong: a whole screen re-renders on every keystroke, two values disagree, an "impossible" state appears on screen, data is stale, or a piece of state is somehow owned by the wrong component.

You want to map the symptom to the mechanism and the fix.

### The short version

Most state-architecture problems are one of a small set, and each maps to a section.

The procedure is: identify the symptom, find the rung of the ladder it implicates (wrong location, redundant state, wrong sharing tool, server-versus-client confusion), and apply that section's fix.

The Profiler is your main instrument for re-render problems.

The "two sources of truth" lens is your main instrument for desync problems.

### How it actually works

Walk the symptoms.

#### A whole subtree re-renders on a high-frequency change (typing, dragging)

The state is lifted higher than its blast radius should allow (Section 2), or it is in a context whose value changes on every keystroke (Section 9).

Fix by colocating the state lower, or, if it must be shared, moving it out of a broadly-consumed context into a store with selector subscriptions (Sections 11 and 12).

Confirm with the Profiler: record the interaction and look at which components render and why.

#### Every consumer of a context re-renders, even ones reading unrelated fields, even behind `React.memo`

Either the Provider value is an unstable inline object (new identity every render, Section 9) or it is one big context mixing unrelated state (Section 9).

Fix by stabilizing the value with `useMemo` and splitting the context, and separating state from dispatch (Section 10).

If consumers read different slices of one frequently-changing value, you have hit the selectivity gap and need a store (Section 11).

#### Two values disagree (a list and its filtered version, a count and a length, a selected id and a selected object)

You stored something derivable as independent state, creating two sources of truth (Section 4).

Fix by storing the minimal facts and deriving the rest during render.

If you were syncing them with an effect, delete the effect.

#### An "impossible" state shows up (loading and error at once, success with no data)

Your state shape allows illegal combinations (Section 5), or your transitions are not constrained (Section 6).

Fix by collapsing correlated flags into one `status` value and, if needed, modeling the transitions as a reducer-shaped state machine so illegal states are unrepresentable.

#### Data is stale, or you are hand-writing caching, loading flags, and refetch logic

You are treating server state as client state (Section 14).

Fix by moving that data into a server-state library, which removes the hand-built bookkeeping.

This single move also often dissolves a "we need Redux" pressure, because much of what was in the store was server state.

#### You cannot tell where a value comes from, or many components can change the same blob

Ownership is diffuse (Section 1).

Fix by re-establishing a single owner: lift to one clear owner with narrow props, or consolidate the changes through one reducer, so there is one place the value lives and one place it changes.

#### You reached for Redux/a store and it feels like a lot of ceremony for the app

You may have escalated past the rung the problem needed (Section 15).

Re-run the decision framework: how much of that state is server state (a query library), derivable (delete it), local (push it down), or ambient-and-rare (Context)?

Often what remains does not justify a store at all.

#### The closing synthesis

The thread through every one of these is the two ideas from Section 1: *location is blast radius* and *ownership is traceability.* Re-render problems are almost always state sitting too high, or in a transport (Context) used for a job that needs a store.

Desync problems are almost always redundant state that should have been a single source of truth with the rest derived.

Impossible-state problems are shape and transition problems, and the biggest simplification available is almost always separating server state into its own cache.

You do not debug state architecture by reaching for tools.

You debug it by asking, for the offending piece of state, "is this on the right rung, is it the only copy of its truth, and is it even client state at all," and then moving it to where the mechanics of rendering and sourcing want it to be.

### Try it

> Take a real re-render or desync problem from your own app and, before changing anything, name which symptom above it is and which section's mechanism explains it. Then apply that fix and verify in the Profiler (for re-renders) or by trying to reach the bad state (for desyncs). Doing this on two or three real problems makes the mapping reflexive.

### You've got this if

You can take "the whole screen re-renders when I type" or "these two values keep disagreeing" and name the rung, the mechanism, and the fix without guessing.

---

## Further reading (primary sources)

When you want to go past this guide, these are the canonical sources, each with a note on how it relates to what you read here and how current it is.

### The official React docs (react.dev), "Managing State" section, current within the React 19 line

This is the primary source for most of the first half of this guide, and it is genuinely good:

1. Choosing the State Structure, at https://react.dev/learn/choosing-the-state-structure . The official version of Sections 4 and 5 (avoid redundant and contradictory state, derive rather than store).
2. Sharing State Between Components, at https://react.dev/learn/sharing-state-between-components . The official version of Section 3 (lifting state up).
3. Passing Data Deeply with Context, at https://react.dev/learn/passing-data-deeply-with-context . Covers Sections 7 and 8 (when to drill, when to use Context, and composition as an alternative).
4. Scaling Up with Reducer and Context, at https://react.dev/learn/scaling-up-with-reducer-and-context . The canonical version of the reducer-plus-two-contexts pattern from Sections 6 and 10.
5. You Might Not Need an Effect, at https://react.dev/learn/you-might-not-need-an-effect . Reinforces Section 4 (do not sync derived state with an effect). Also referenced in the Hooks guide.

**Kent C.

Dodds, "Application State Management with React," at https://kentcdodds.com/blog/application-state-management-with-react , and "How to use React Context effectively," at https://kentcdodds.com/blog/how-to-use-react-context-effectively .** The first is the clearest argument for the "most state is local or server state, very little needs to be global" position that underlies Sections 1 and 14.

The second is the practical companion to Sections 8 and 10 (Context as transport, the provider-plus-hook pattern, stabilizing the value).

Both predate the React Compiler and the newest hooks, so pair the memoization advice with the Hooks guide's Section 12, but the architectural guidance is evergreen.

**TkDodo (Dominik Dorfmeister), the server-state writing, starting with "Why You Want React Query," at https://tkdodo.eu/blog/why-you-want-react-query .** The best articulation of the server-state-versus-client-state distinction from Section 14, by a TanStack Query maintainer.

This is really the on-ramp to the next guide (Data Fetching and Server State).

Read it when Section 14 makes you want the full story.

### The library docs, read as archetypes (Section 13), each current and maintained as of 2026

Redux Toolkit at https://redux-toolkit.js.org/ , Zustand at https://github.com/pmndrs/zustand , and Jotai at https://jotai.org/ .

Read each one's "why" or core-concepts page through the Section 12 lens (state outside the tree, selector subscriptions) rather than as isolated tutorials.

Note that Recoil (https://recoiljs.org) was archived by Meta in January 2025 and should not be used for new projects.

Jotai is its maintained successor for the atomic model.

### For the selectivity gap (Section 11)

`use-context-selector` by Daishi Kato, at https://github.com/dai-shi/use-context-selector , is the userland implementation of context selectors, and its README is a concise primary source on exactly why native Context re-renders all consumers and what a selector-based subscription does instead.

### If you want to see the mechanism in React's source (pass 3)

the context propagation logic lives in `ReactFiberNewContext.js` in the `react-reconciler` package (how a Provider value change marks consumers for re-render, the basis of Section 9), and the external-store binding is `useSyncExternalStore` in `ReactFiberHooks.js` (the safe-subscription primitive behind Section 12).

Reading the propagation code is the fastest way to see that "the whole value, every consumer" is not a limitation you can configure away but how the mechanism is built.

A good way to use all of these: read the relevant deep section of this guide first so you have the vocabulary, then read the primary source, then come back.

This guide gives you the ladder and the mechanisms that decide which rung each piece of state belongs on.

The primary sources go deeper on individual rungs.

---

Built to be climbed, not swallowed.

Finish pass 1 and you are already ahead.

Come back for the deep parts when a real re-render storm or desync gives you a reason to care, and run the experiments so the knowledge sticks to something real.

Every library and version claim (Recoil archived in January 2025, Jotai as its successor, no native Context selector in the React 19 line, the React Compiler 1.0) reflects the state of things in 2026.

The architectural core (location as blast radius, ownership as traceability, derive rather than store, Context as transport, the selectivity gap, server state as a separate axis) is stable and not going anywhere.
