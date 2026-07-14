# React Hooks and Effects: A Guided Deep Dive

> Current as of React 19.2.x (latest patch 19.2.6, May 2026), with the React Compiler 1.0 stable (October 2025) and `useEffectEvent` stable since 19.2. Companion to the rendering and reconciliation guide; this one sits directly on top of the hook storage, the update queue, and the render and commit split described there, so it helps to have at least skimmed that guide first.

## Read this first

This guide goes deep, on purpose, and like the engine guide it is built to be climbed, not swallowed. **You are not supposed to absorb all of it in one sitting.** Here is the method that actually works.

**Read it in three passes.**

**Pass 1, one relaxed sitting (about 30 minutes).** Read only the two short parts at the top of each section: **"The itch"** and **"The short version."** Skip everything labeled "How it actually works." When you finish, you will have a complete map of how hooks store your state, why effects behave the way they do, and what most of your effect bugs actually are. That alone makes you noticeably better at this. Getting the map first is what keeps the deep parts from feeling like a wall.

**Pass 2, spread over weeks, driven by your real work.** When you hit something at work that one of these sections explains, come back and read its **"How it actually works."** An effect that fires on every render? Read the deep part of Sections 7 and 8. A value that is mysteriously stale inside a `setInterval`? Section 3. A re-render that `React.memo` was supposed to stop but did not? Sections 8 and 12. Reading the deep material right when you have a real reason to care is what makes it stick.

**Pass 3, someday, when you are curious.** Section 17 points you into React's actual source for hooks. There is no rush.

**Two rules that multiply everything.**

1. **Run the experiments.** Each section ends with a short **"Try it."** A bug you have personally caused and watched happen is a bug you will never ship. Keep a throwaway React project open (a Vite scratch app, or any sandbox) and actually reproduce each one.
2. **Trust the order.** The sections build on each other. The single most important idea in this whole guide is in Section 2 (every render is a snapshot), and almost every later section is a consequence of it. Here is the build order:

```
   Why the rules of hooks exist at all          (1)
            │
   THE mental model: a render is a snapshot      (2)   ◀── everything below is a consequence
            │
   The bug that model creates                    (3)
            │
   How state actually updates (the queue)        (4, 5)
            │
   Effects as synchronization, not lifecycle     (6)   ◀── the reframe that fixes most effect bugs
            │
   The dependency array + referential stability  (7, 8) ◀── most everyday effect bugs live here
            │
   Cleanup, and effect timing around paint       (9, 10)
            │
   The non-reactive escape hatch                  (11)
            │
   Memoization, refs, and custom hooks            (12, 13, 14)
            │
   The modern hook surface, then debugging        (15, 16, 17)
```

Each section also opens with a one-line **Prereqs** note: the earlier sections or outside concepts worth having in hand before you read that section's deep part. Sections that need nothing past basic JavaScript say so.

You do not need to finish this guide to benefit from it. Finish pass 1 and you are already ahead.

---

## Table of Contents

1. [The rules of hooks, and why they are not arbitrary](#1-the-rules-of-hooks-and-why-they-are-not-arbitrary)
2. [Every render is a snapshot](#2-every-render-is-a-snapshot)
3. [Stale closures: the bug hiding in every effect](#3-stale-closures-the-bug-hiding-in-every-effect)
4. [How state updates actually happen (the queue)](#4-how-state-updates-actually-happen-the-queue)
5. [useState vs useReducer](#5-usestate-vs-usereducer)
6. [useEffect is a synchronization primitive, not a lifecycle hook](#6-useeffect-is-a-synchronization-primitive-not-a-lifecycle-hook)
7. [The dependency array, and what it really compares](#7-the-dependency-array-and-what-it-really-compares)
8. [Referential stability (why a new object breaks everything)](#8-referential-stability-why-a-new-object-breaks-everything)
9. [Cleanup, and the setup and cleanup pairing](#9-cleanup-and-the-setup-and-cleanup-pairing)
10. [useLayoutEffect vs useEffect: timing around paint](#10-uselayouteffect-vs-useeffect-timing-around-paint)
11. [useEffectEvent: reading the latest without reacting to it](#11-useeffectevent-reading-the-latest-without-reacting-to-it)
12. [useMemo and useCallback (and what the Compiler changes)](#12-usememo-and-usecallback-and-what-the-compiler-changes)
13. [useRef: the mutable box that does not re-render](#13-useref-the-mutable-box-that-does-not-re-render)
14. [Custom hooks: sharing logic, not state](#14-custom-hooks-sharing-logic-not-state)
15. [The modern hook surface (a map)](#15-the-modern-hook-surface-a-map)
16. [Debugging hooks and effects](#16-debugging-hooks-and-effects)
17. [Reading the source (pass 3)](#17-reading-the-source-pass-3)

---

## 1. The rules of hooks, and why they are not arbitrary

*Prereqs: JavaScript functions and objects. This section defines "fiber" inline and re-explains the hook storage from the ground up, so you can start the series here without the rendering guide.*

**The itch.** "Don't call hooks inside conditions, loops, or after an early return. Only call them at the top level, and only from React functions." Everyone repeats these rules. But a rule you cannot derive is a rule you will eventually break by accident. Where do they actually come from?

**The short version.** A function component has no `this` and no object to hang state on. So React keeps a small internal object for each component on screen (its fiber) and stores your hooks as an ordered linked list on that fiber, matching each hook call to its stored slot purely by call order: the first hook call this render gets slot one, the second gets slot two, and so on. Call a hook conditionally and the order shifts between renders, so React reads the wrong slot. The rules are not style preferences. They are the only thing that could possibly work given how hooks are stored.

**How it actually works.**

This is the foundation, so it is worth getting exactly right.

One term first, in case you are starting the series here. A fiber is the internal object React keeps for each component instance in your tree. It holds that component's state, its links to its parent, child, and sibling, and the work React still has to do for it. The rendering guide is, in large part, the story of fibers and how React walks them; for hooks, the only thing you need to carry in is that every rendered component has exactly one fiber, and that fiber is where its hooks are stored. (If you have read the rendering guide, this is the same object from its Fiber and hook-storage sections; here we go further into why the rules of hooks follow from it and what actually breaks when you violate them.)

When React renders a function component, it does not just call your function. First it sets a module-level pointer, internally called the "currently rendering fiber," to that component's fiber, and it sets another pointer, the "work in progress hook," to walk a linked list. Then it calls your function. Every hook you call reads from those module-level pointers. That is the whole trick: `useState` is not magic syntax, it is an ordinary function that, when called, looks at "which fiber are we rendering right now" and "which hook slot are we up to," does its work, and advances the cursor to the next slot.

The hook list lives on the fiber's `memoizedState` field. Each node is roughly:

```js
{
  memoizedState, // this hook's value: the state value, or {deps, create, destroy} for an effect,
                 // or the cached {value, deps} for useMemo
  queue,         // the update queue, for useState/useReducer; null otherwise
  next,          // pointer to the NEXT hook called in this component, or null
}
```

So `useState`, `useState`, `useEffect` builds a three-node list, and React binds the Nth hook *call* to the Nth *node* by position, not by name. React never sees your variable names. It only sees order.

Now the two rules fall out:

**Rule one: call hooks in the same order on every render.** No conditionals, loops, or early returns before or around a hook. If render one calls `useState`, `useState`, `useEffect`, and render two skips the second `useState` because it sat behind an `if`, then on render two React's cursor binds your `useEffect` call to the *second* node, the one that holds your second piece of state. Now React reads a state value where it expected an effect record, or vice versa. The bug is silent and bizarre, which is exactly why the rule is absolute rather than "usually a good idea." (React does throw "Rendered fewer hooks than expected" in some shapes of this mistake, but you should never rely on getting the error rather than the corruption.)

**Rule two: only call hooks from React function components or from other hooks.** Those module-level pointers (the current fiber, the cursor) are only set up while React is rendering a component. Call a hook from a plain function or an event handler and there is no current fiber to read, so React throws the "Invalid hook call" error. There is a nice mechanical detail here: React swaps the active "dispatcher" (the object that actually implements `useState`, `useEffect`, and the rest) depending on the phase. During a mount it points to the mount implementations, during an update it points to the update implementations, and when you are not rendering at all it points to a special dispatcher whose every method just throws. The error you get from calling a hook in the wrong place is that throwing dispatcher doing its one job.

The `eslint-plugin-react-hooks` rule enforces both statically, and in React 19 the same plugin surfaces React Compiler diagnostics too (see the rendering guide's 2026 section). Treat it as non-optional. It is not nagging; it is the only thing standing between you and the positional-list corruption above.

One modern exception worth flagging now so it does not surprise you later: the `use` hook (Section 15) is deliberately allowed inside conditionals and loops. It is special-cased in the implementation precisely because the React team decided the ergonomic win was worth building the machinery to support it. Every other hook still obeys rule one.

> **Try it.** Write a component with `const [a] = useState(1)` then `if (props.flag) { useState(2) }` then `useEffect(...)`. Toggle `flag` from a parent. Watch React either throw or, worse, attach the wrong value to the wrong hook. Then move the second `useState` above the `if` and watch it become stable.

**You've got this if** you can explain why call order, not variable names, is what binds a hook call to its stored state.

---

## 2. Every render is a snapshot

*Prereqs: JavaScript closures (a function remembering the variables in scope where it was defined). Nothing from earlier sections; this is the foundation everything else rests on.*

**The itch.** You write `setCount(count + 1)` and then `console.log(count)` on the next line, and the log shows the old value. Or you set up a `setInterval` once, and it forever logs the count from the moment it was created. It feels like `count` is a stale variable that did not get the memo. Understanding why is the single highest-leverage thing in this guide.

**The short version.** Each time your component function runs, it produces one render, and that render has its own private copy of props, state, and every function defined inside it, all frozen at the values from that run. State is not a live variable you read "now." The `count` you see in a given render is a constant for the entire life of that render. When state changes, React does not mutate that constant; it schedules a brand new run of your function, which produces a new render with a new constant. Closures capture the render they were born in. Almost every effect and event-handler surprise is this one fact wearing a costume.

**How it actually works.**

Think of your component function as a frame in a flipbook. Each render is one drawing. The `count` in render number three is the number three, permanently, the way the number on page three of a flipbook does not change when you flip to page four. React does not reach back into page three and edit it. It draws page four.

Concretely, when you call `useState`, you get back the value *for this render* and a setter:

```js
function Counter() {
  const [count, setCount] = useState(0);
  // For THIS render, `count` is a specific number and never changes.
  // Everything defined below closes over that specific number.

  function handleClick() {
    setCount(count + 1);
    console.log(count); // logs the value from THIS render, not the new one
  }

  useEffect(() => {
    const id = setInterval(() => {
      console.log(count); // closes over THIS render's count, forever, if deps are []
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return <button onClick={handleClick}>{count}</button>;
}
```

Three things follow, and they are the source of most confusion in React:

1. **`setCount(count + 1)` then `console.log(count)` logs the old value** because `count` in this render is a constant. The setter does not reassign it. It schedules a new render where `count` will be recomputed to the new value. You are reading the old page; the new page has not been drawn yet.

2. **Event handlers see the state of the render that created them.** `handleClick` is a fresh function on every render, and each version closes over that render's `count`. The one that runs when you click is the one from the render that produced the button currently on screen.

3. **The `setInterval` logs a stale value forever** because the effect ran once (empty deps), the callback closed over render zero's `count`, and nothing ever recreates it. The interval is loyal to the render it was born in. This is the canonical stale closure, and it gets its own section next.

This is why people who internalize "a render is a snapshot" stop fighting React and start working with it. You do not ask "what is the current value of `count`." You ask "which render's snapshot is this code closing over." The mechanism underneath is exactly the hook storage from Section 1: `setCount` enqueues an update on the hook's queue and asks React to render again; the new render reads the updated value out of the queue and hands you a new constant. Your old closures are untouched, because they belong to a render that already happened.

There is a deliberate design choice hiding here. React could have made `count` a live, mutable thing you read at any moment. It chose snapshots instead because snapshots make rendering predictable: given the same props and state, your function returns the same UI, every time, with no spooky action from values changing mid-render. That predictability is what lets React pause, restart, and discard renders under concurrent rendering (rendering guide, concurrency section) without your code noticing. The snapshot model is not an accident you have to work around. It is load-bearing.

> **Try it.** Build the `Counter` above with the empty-deps interval. Click the button several times and watch the on-screen number climb while the console keeps logging the original value. Then add `count` to the dependency array and watch the logged value start tracking the screen (because now the effect, and its closure, is recreated each time `count` changes). You just watched a snapshot get replaced.

**You've got this if** you can explain why `count` does not change after you call `setCount`, in terms of renders rather than timing.

---

## 3. Stale closures: the bug hiding in every effect

*Prereqs: Section 2 (the snapshot model). Outside React: that a `setInterval`, event listener, or other long-lived callback captures the variables in scope at the moment it was created. This is the snapshot model showing up as a bug.*

**The itch.** A timer, a subscription, an event listener, or a memoized callback keeps acting on old data. You add the value to a dependency array and it gets fixed, but you are not sure why, and sometimes "fixing the deps" causes a different problem (the timer resets constantly). You want a way to reason about this instead of guessing.

**The short version.** A stale closure is just Section 2 biting you: a function that outlives the render it was created in keeps seeing that render's values. The fix is always one of three moves, and which one is right depends on what you actually want. Either make the function not depend on the stale value (use the updater form of `setState`, or a ref), or make React recreate the function when the value changes (put it in the deps), or declare the value as non-reactive on purpose (`useEffectEvent`, Section 11). Picking the wrong fix is what causes the "timer keeps resetting" follow-on bug.

**How it actually works.**

Walk the canonical case. You want a counter that increments once a second:

```js
useEffect(() => {
  const id = setInterval(() => {
    setCount(count + 1); // BUG: `count` is frozen at the value from the render that ran this effect
  }, 1000);
  return () => clearInterval(id);
}, []); // empty deps: this effect runs once, so its closure is render zero's, forever
```

This counts to one and stops, because every tick computes `0 + 1`. The callback closed over render zero's `count`, which is `0`, and the empty dependency array means React never recreates the effect, so the closure never refreshes. Now the three fixes, each with its mechanism and its trade.

**Fix A: do not depend on the stale value at all (updater form).**

```js
useEffect(() => {
  const id = setInterval(() => {
    setCount(c => c + 1); // reads the LATEST value from the queue, not a closed-over snapshot
  }, 1000);
  return () => clearInterval(id);
}, []);
```

This works and keeps the empty deps. The updater function `c => c + 1` does not close over `count`; React hands it the current value when it processes the queue (Section 4). When your effect's logic only needs the previous state to compute the next state, this is almost always the cleanest fix, because the effect genuinely does not depend on `count`, so it should not list `count`.

**Fix B: recreate the effect when the value changes (honest deps).**

```js
useEffect(() => {
  const id = setInterval(() => {
    setCount(count + 1);
  }, 1000);
  return () => clearInterval(id);
}, [count]); // now the effect (and its fresh closure) is recreated whenever count changes
```

This also works, but notice the cost: every time `count` changes, React runs the cleanup (clears the old interval) and the setup (starts a new one). For a once-a-second counter that is wasteful and slightly jittery, because the interval clock restarts each tick. Fix B is correct when the effect genuinely *should* tear down and rebuild on the value's change (for example, reconnecting a socket when `roomId` changes). It is the wrong tool when the value is incidental to the work.

**Fix C: declare the value non-reactive (Section 11 preview).** Sometimes you want to read the latest value inside the effect but you do not want changes to that value to re-run the effect at all. That is `useEffectEvent`, and it is the principled answer to the situation where you are tempted to just leave a value out of the deps and silence the linter. We will get there in Section 11, after the dependency array makes the problem precise.

The reasoning procedure, which you can apply to any stale-closure bug: ask "does this function actually depend on the stale value, or does it just happen to read it?" If it depends on it (the work is different for different values), use honest deps (Fix B). If it only needs the latest value to compute a next state, use the updater form or a ref (Fix A). If it reads the value but should not react to it, that is the non-reactive case (Fix C). The reason guessing fails is that all three "make the symptom go away" in the simple case, but they have different re-run behavior, and the wrong one trades a stale-value bug for a thrashing-effect bug.

> **Try it.** Build the broken counter (Fix-nothing), confirm it counts to one and stops. Apply Fix A and watch it count smoothly with empty deps. Apply Fix B and open DevTools: you will see the effect's cleanup and setup firing every single second. Feeling that difference is what teaches you which fix to reach for.

**You've got this if** you can explain why `setCount(c => c + 1)` fixes the stale counter but `setCount(count + 1)` does not, without using the word "fresh."

---

## 4. How state updates actually happen (the queue)

*Prereqs: Section 2 (snapshots). From the rendering guide: batching and lanes, which this section recaps as much as you need.*

**The itch.** You call `setCount(count + 1)` three times in one click handler and the count goes up by one, not three. But `setCount(c => c + 1)` three times goes up by three. And none of it seems to take effect until your function runs again. What is the model?

**The short version.** Calling a setter does not change a variable. It pushes an update onto that hook's queue and asks React to schedule a render. Multiple setters fired in the same tick are batched: React processes the whole queue once and renders once. When you pass a value (`count + 1`), every call in the batch is computed from the same snapshot, so they stomp on each other and the last one wins. When you pass an updater (`c => c + 1`), React applies each one in turn to the running result, so they compose. That difference is the queue doing its job.

**How it actually works.**

Each `useState` (and `useReducer`) hook node carries an update queue, the same `queue` field from Section 1. A setter call does three things: it creates an update object holding either your new value or your updater function, it appends that update to the hook's queue, and it marks the fiber as needing work at some lane (rendering guide, lanes section) and asks the scheduler to render. It does not touch the value your current render is holding. That value is a snapshot (Section 2), and snapshots do not move.

When React renders the component again, `useState` on that hook walks the queue and computes the new state by folding the updates together, starting from the previous committed value:

```
newState = previousState
for each update in queue:
  if update holds a value V:        newState = V
  if update holds an updater fn U:  newState = U(newState)
```

Now the two behaviors are not surprising, they are arithmetic. With three value-form calls in one handler:

```js
function handleClick() {
  setCount(count + 1); // count is, say, 0 this render → update holds the value 1
  setCount(count + 1); // count is STILL 0 (same snapshot) → update holds the value 1
  setCount(count + 1); // still 0 → update holds the value 1
}
// queue folds: 0 → 1 → 1 → 1. Result: 1.
```

All three read the same snapshot `count` (which is `0`), so all three enqueue the literal value `1`. Folding three "set to 1" updates lands on `1`. With three updater-form calls:

```js
function handleClick() {
  setCount(c => c + 1); // update holds a function
  setCount(c => c + 1);
  setCount(c => c + 1);
}
// queue folds: 0 → (0+1)=1 → (1+1)=2 → (2+1)=3. Result: 3.
```

Each updater receives the running result of the previous one, so they compose to `3`. The rule of thumb that falls out: if your next state depends on the previous state, use the updater form, because the value form is reading a snapshot that may already be stale within the same handler.

**Batching.** In React 18 and later, all updates are automatically batched by default, whether they fire in a React event handler, a promise callback, a `setTimeout`, or a native event handler. The lanes mechanism (rendering guide) is what implements this: same-tick updates land on a shared lane and flush together as one render. This is why three setters produce one render, not three, and why your function does not re-run between the setter calls. The escape hatch is `flushSync(() => setX(...))`, which forces a synchronous render and commit right then so you can, for example, read the updated DOM immediately. It opts you out of batching and concurrency, so it is almost always the wrong tool; reach for it only when you must observe the committed result before the next line runs.

**Bail-out on equal state.** If you set state to a value that is `Object.is`-equal to the current state, React may skip re-rendering that component. There is a subtlety the docs are explicit about: React might still render the component once before bailing out (it has to run your function to discover the new value is equal), but it will not go deeper or commit changes. So setting state to the same value is cheap, but not always literally zero work, and you should not rely on a same-value set as a way to "do nothing."

**Lazy initial state.** The argument to `useState` is only used on the first render (the mount), but it is evaluated on every render if you write it as a call. So `useState(expensiveInit())` runs `expensiveInit` every render and throws the result away after mount. Pass a function instead, `useState(() => expensiveInit())`, and React calls it only once, on mount. Same idea as Section 13's lazy ref pattern. It matters whenever the initializer is non-trivial.

> **Try it.** One button handler, three `setCount(count + 1)` calls, a `console.log` in the component body. Confirm one render and a net increase of one. Switch all three to `setCount(c => c + 1)` and confirm a net increase of three with still one render. Then wrap one call in `flushSync` and watch an extra render appear in the log.

**You've got this if** you can explain, using the word "queue," why value-form setters in the same tick do not stack but updater-form setters do.

---

## 5. useState vs useReducer

*Prereqs: Section 4 (the update queue and updater functions). Outside React: what makes a function pure.*

**The itch.** Your component has grown five `useState` calls that have to change together, your event handlers are getting tangled, and you keep introducing bugs where one piece of state updates and a related one does not. People say "use a reducer," but it is not obvious when the switch pays for itself, or what you actually gain.

**The short version.** `useState` is `useReducer` with a built-in reducer you did not write. You reach for `useReducer` when your state transitions get complex enough that describing them as named actions ("submit," "reset," "select row") is clearer than scattering setter calls, when the next state depends on several existing fields at once, or when you want the update logic in one pure function you can test and read in one place. You also get a `dispatch` function whose identity is stable for the life of the component, which is quietly useful for dependency arrays and context.

**How it actually works.**

Mechanically these two hooks are nearly the same thing. Both allocate a hook node with an update queue (Section 1). Both schedule a render and fold their queue on the next render (Section 4). The only real difference is what kind of update each enqueues and how the queue is folded:

- `useState`'s setter enqueues either a value or an updater function, and the fold applies them as in Section 4. Internally, `useState` is implemented as `useReducer` with a fixed "basic state reducer" that says: if the update is a function, call it on the previous state, otherwise use the value. That is literally the built-in reducer.
- `useReducer`'s `dispatch` enqueues an action (any value you choose), and the fold runs *your* reducer, `(state, action) => newState`, for each queued action.

So choosing between them is not a performance decision. It is a code-clarity decision about where your transition logic lives. Three signals that it is time to switch:

**Signal one: transitions touch several fields together.** A form with `values`, `errors`, `touched`, and `isSubmitting` where a single "submit failed" event has to update three of them at once is painful as four `useState` calls, because nothing forces them to move together and it is easy to update three and forget the fourth. A reducer lets you write one `case 'SUBMIT_FAILED'` that returns the whole new state object, so the transition is atomic and visible in one place.

**Signal two: the next state is a function of the current state in non-trivial ways.** Reducers receive the previous state as their first argument, so "the new state depends on the old state" is the default rather than something you have to remember to express with the updater form. This removes a whole category of snapshot-staleness bugs (Section 2) because the reducer never closes over a rendered state value; it is handed the latest one during the fold.

**Signal three: you want the update logic testable and out of the component.** A reducer is a pure function with no React in it. You can unit-test `reducer(state, action)` with plain inputs and outputs, and a teammate can read every way the state can change by reading one function instead of hunting for setter calls across handlers. State machines (explicit named states and the allowed transitions between them) are the natural endpoint of this, and a reducer is the idiomatic way to express one in React.

Two mechanical perks worth naming. First, `dispatch` is referentially stable: React guarantees the same `dispatch` function identity across renders for the life of the component, exactly like a `useState` setter. That stability means you can list `dispatch` in an effect's dependency array (or pass it through context) without causing the effect to re-run, which matters once you have read Section 8. Second, lazy initialization: `useReducer(reducer, initialArg, init)` calls `init(initialArg)` only on mount, the same once-only pattern as lazy `useState` and lazy refs.

The reducer must be pure: same state and action in, same new state out, no mutations of the existing state, no side effects. React relies on this, and under StrictMode it will call your reducer twice in development (rendering guide, StrictMode section) specifically to surface a reducer that mutates or has side effects. If "it only misbehaves in StrictMode" ever shows up here, your reducer is not pure.

> **Try it.** Take a component with three or four related `useState` calls and rewrite it with a single `useReducer`. Notice two things: the event handlers shrink to `dispatch({ type: '...' })` calls, and the "what are all the ways this state can change" question now has a single-function answer. Then write a one-line test that calls your reducer directly with no React involved.

**You've got this if** you can explain why `dispatch` is safe to omit-by-stability from a dependency array while an arbitrary handler function is not.

---

## 6. useEffect is a synchronization primitive, not a lifecycle hook

*Prereqs: Section 2 (snapshots). Outside React: the idea of an external system (a subscription, a timer, the `document.title`, a non-React widget) that lives outside React and has to be kept in step with your state. From the rendering guide: that effects run after the commit phase, recapped here.*

**The itch.** You learned effects as "componentDidMount, componentDidUpdate, and componentWillUnmount rolled into one." So you write `useEffect(..., [])` for "on mount," reach for refs to detect "did this prop change since last time," and fight the dependency linter constantly. It half-works, and the bugs are always about timing. The lifecycle framing is the problem itself.

**The short version.** An effect does not represent a moment in a component's life. It represents a *synchronization*: "this external thing (a subscription, a timer, the document title, a network resource, a non-React widget) should be kept in agreement with these values from my render." You describe the target state and how to achieve and undo it; React's job is to keep reality matching your latest render by running the effect when the values it depends on change, and running cleanup to unwind the previous synchronization first. Once you think in "keep X in sync with Y" instead of "do X on mount," the dependency array stops being a puzzle and the bugs mostly evaporate.

**How it actually works.**

Here is the reframe in full, because it is the most useful idea in this guide after the snapshot model.

A React component's render output describes what the DOM should look like, and React keeps the DOM in sync with it for you (rendering guide, reconciliation). But plenty of things your component cares about are *not* the DOM that React manages: a WebSocket connection, a `setInterval`, a subscription to a browser API or an external store, the `document.title`, a chart drawn by a non-React library, an analytics ping. React has no idea these exist. An effect is how you extend "keep this in sync with my render" to those external systems. You hand React three things:

1. **A setup function**: how to bring the external system into agreement with the current render's values (open the connection to `roomId`, start the interval, set the title to `title`).
2. **A cleanup function** (what setup returns): how to undo that, so the system can be re-synchronized cleanly (close the connection, clear the interval).
3. **A dependency array**: which values from this render the synchronization actually depends on (Section 7).

React then runs this on a simple contract: after it commits a render and the browser paints, if any dependency changed since the last committed run, React first runs the previous cleanup (unwinding the old synchronization) and then runs the new setup (establishing the new one). On the very first commit there is no previous cleanup, so it just runs setup. When the component unmounts, there is no new setup, so it just runs the final cleanup. Notice what "mount" and "unmount" became: they are not special cases you target, they are simply the first and last steps of an ongoing synchronization. You stopped writing lifecycle code and started describing a thing that should stay in sync.

This is why "run on mount only" via `[]` is better understood as "this synchronization does not depend on any changing value, so it is established once and torn down once." And why an effect with `[roomId]` is "stay connected to whatever room `roomId` currently names": when `roomId` changes, the old connection is wrong, so React tears it down and builds the right one. You did not write "if roomId changed, reconnect." You wrote "be connected to roomId," and React derived the reconnect.

Two consequences that fix real bugs:

**Most "I need to run code when a prop changes" is not an effect at all.** The lifecycle mindset reaches for an effect to respond to a prop change. But if the work is computing something from props or state, you can usually just compute it during render (no effect), and if it must happen in response to a user action, it belongs in the event handler (no effect). Effects are specifically for synchronizing with external systems that React does not manage. The React docs have a whole page, "You Might Not Need an Effect," that is really this point: if you are not syncing with something outside React, you probably should not be in an effect. Effects that exist only to copy one piece of state into another, or to "react" to a prop by setting state, are usually a sign the lifecycle framing has led you astray.

**Effects run after paint, and that is on purpose.** Passive effects (ordinary `useEffect`) run after React commits and the browser paints (rendering guide, render and commit section), so they never block the user from seeing the update. That timing is correct for synchronization: you want the screen updated first, then the external world brought into agreement. The exception, when you must read or change layout before the user sees it, is `useLayoutEffect` (Section 10), and the fact that it is the exception rather than the default is itself a consequence of this model.

A small concrete example to anchor it:

```js
useEffect(() => {
  document.title = `Inbox (${unreadCount})`; // bring the title into sync with unreadCount
}, [unreadCount]);                            // it depends on unreadCount, and only that
```

There is no "on mount" or "on update" here. There is "the title should equal this, given `unreadCount`." React runs it on the first commit and again whenever `unreadCount` changes, which is exactly "keep the title in sync." That is the whole model.

> **Try it.** Take an effect you wrote in the lifecycle style (something with `[]` plus a manual "did it change" check, or an effect that just copies a prop into state) and rewrite it as a synchronization: name the external thing it keeps in sync, and list the values it depends on. If you cannot name an external thing, that is the signal it should not be an effect at all; move it into render or a handler.

**You've got this if** you can explain why "run on mount" and "clean up on unmount" are just the boundary cases of an ongoing synchronization, not the purpose of an effect.

---

## 7. The dependency array, and what it really compares

*Prereqs: Section 6 (effects as synchronization) and Section 2. Outside React: how `Object.is` compares values.*

**The itch.** The dependency array feels like a magic incantation. Empty array means once, no array means every time, and listing things means "sometimes." When you get it wrong you either get an infinite loop or a stale value, and the linter keeps adding things you did not think you needed. You want to know what the array physically is so you can stop guessing.

**The short version.** The dependency array is a memoization key for your synchronization. React stores the previous array on the effect's hook node, and after each commit it compares the new array to the old one element by element with `Object.is`. If every element is equal, the values your effect depends on did not change, so React skips it (no cleanup, no setup). If any element differs, or there is no array at all, the synchronization is out of date, so React runs cleanup then setup. The array is not "when to run." It is "the exact set of values this effect's correctness depends on," and lying about that set is what produces both stale-value bugs and infinite loops.

**How it actually works.**

On the effect's hook node, React keeps a record shaped roughly like `{ tag, create, destroy, deps }`: the tag (passive vs layout), your setup function (`create`), the cleanup it returned last time (`destroy`), and the dependency array from the last committed run (`deps`). After a commit, for each effect, React runs a comparison that is genuinely this simple:

```js
function areHookInputsEqual(nextDeps, prevDeps) {
  if (prevDeps === null) return false;       // no previous deps: always "changed"
  for (let i = 0; i < nextDeps.length; i++) {
    if (Object.is(nextDeps[i], prevDeps[i])) continue;
    return false;                            // one element differs: "changed"
  }
  return true;                               // all equal: "unchanged", skip the effect
}
```

That is the entire dependency-array mechanism. Everything you know about it is a reading of that function:

- **Empty array `[]`**: there are zero elements to compare, so after the first run the comparison is always "all equal." The effect runs once on the first commit, never re-runs, and cleans up on unmount. This is "the synchronization depends on nothing that changes."
- **No array (omitted)**: React never gets a `nextDeps` to compare, so it treats every commit as "changed" and runs the effect after every commit. This is "re-synchronize on every render," which is rarely what you want.
- **`[a, b]`**: React compares `a` and `b` against their previous values with `Object.is`. Any change re-runs the effect. This is "the synchronization depends on `a` and `b`."

Now the two failure modes are not mysterious:

**Stale values come from leaving a dependency out.** If your effect reads `count` but you do not list it, the comparison never notices `count` changing, so React never re-runs the effect, so the effect keeps using the `count` from the render where it last ran. This is precisely the stale closure of Section 3, now with a mechanical cause: you told React this synchronization does not depend on `count`, and React believed you. The fix is to tell the truth about the dependencies (or to genuinely make the effect not depend on `count`, via Section 4's updater form or Section 11's `useEffectEvent`).

**Infinite loops come from a dependency whose identity changes every render.** If a dependency is a new object, array, or function every render (Section 8), then `Object.is` reports "changed" on every commit, so the effect runs on every commit. If that effect also sets state, the set schedules another render, which creates another new identity, which runs the effect again, forever. The loop is not the effect being greedy; it is you feeding it a dependency that can never compare equal.

This is why the linter matters so much, and why silencing it is almost always the wrong move. The `exhaustive-deps` rule computes the *true* set of reactive values your effect reads (props, state, and anything derived from them) and insists the array match. When it complains, it is telling you the array does not describe what the effect actually depends on, which means React's `areHookInputsEqual` comparison will give the wrong answer. The honest responses are: add the dependency (Fix B from Section 3), restructure so the effect genuinely does not need it (updater form, Section 4), or declare it non-reactive on purpose (`useEffectEvent`, Section 11). Disabling the rule with a comment just hides the mismatch and ships the stale-value bug.

One more precise note: the comparison is `Object.is`, not `===`. They differ in only two cases: `Object.is(NaN, NaN)` is `true` (where `NaN === NaN` is `false`), and `Object.is(0, -0)` is `false` (where `0 === -0` is `true`). For everyday dependencies the distinction never bites, but it is the same comparison React uses for state bail-out (Section 4) and for `useMemo`/`useCallback` (Section 12), so it is worth knowing the exact operator.

> **Try it.** Write an effect with `[]` that reads a state value and logs it; watch it log the initial value forever as the value changes (stale). Add the value to the array; watch it start re-running and tracking. Then create the loop on purpose: make a dependency `const opts = { id }` defined in render, list `opts`, and have the effect call `setState`. Watch it spin, then move `opts` into a `useMemo` (Section 8) and watch it stop.

**You've got this if** you can explain why omitting a dependency causes a stale value and an unstable dependency causes an infinite loop, both in terms of the same `Object.is` comparison.

---

## 8. Referential stability (why a new object breaks everything)

*Prereqs: Section 7. Outside React: that JavaScript compares objects, arrays, and functions by identity, not by contents. From the rendering guide: the bailout and memo idea (referenced, not required).*

**The itch.** You wrapped a child in `React.memo` and it still re-renders. You wrote a perfectly correct dependency array and the effect still fires every render. Both times the value "looks the same." You are running into identity, and it is one of the two or three things that separate people who can reason about React from people who cargo-cult `useMemo`.

**The short version.** In JavaScript, objects, arrays, and functions are compared by identity, not by contents: `{} !== {}` and `(() => {}) !== (() => {})`, even though they look identical. Every time your component renders, every object, array, and function literal written inside it is created fresh, so it has a new identity. React's equality checks (dependency arrays, `React.memo`, `useMemo`) all use `Object.is`, which sees those fresh identities as "changed." So an inline object or function handed to a dependency array re-runs the effect every render, and one handed to a memoized child defeats the memo. Primitives (numbers, strings, booleans) compare by value, so they are stable when they are equal. The fixes are: depend on primitives where you can, preserve identity with `useMemo`/`useCallback` where you cannot, or hoist truly-constant objects out of the component.

**How it actually works.**

Start with the JavaScript fact, because React inherits it rather than inventing it. Two object literals with identical contents are different objects:

```js
{ a: 1 } === { a: 1 } // false: different objects in memory
[1, 2] === [1, 2]     // false
const f = () => {};
const g = () => {};
f === g               // false: different function objects
1 === 1               // true: primitives compare by value
'x' === 'x'           // true
```

`Object.is` behaves like `===` here. So "same value" for a primitive means equal, but "same value" for an object means *the same object*, the same identity in memory. Now layer on Section 2: your component function runs top to bottom on every render, so every literal inside it is constructed anew each time.

```js
function Parent({ userId }) {
  const config = { userId };          // NEW object every render
  const handleClick = () => doThing(); // NEW function every render
  const items = data.map(d => d.name); // NEW array every render
  // ...
}
```

`config`, `handleClick`, and `items` have a brand new identity on every single render, even when `userId` and the contents are unchanged. This is the root cause behind two of the most common "React is not doing what I told it" experiences:

**Effects that fire every render.** From Section 7, the dependency array compares with `Object.is`. List `config` (a fresh object every render) and the comparison reports "changed" every commit, so the effect runs every commit. The effect is behaving correctly; the dependency you gave it can never compare equal. People often "fix" this by removing `config` from the deps and silencing the linter, which trades the over-firing for a stale-value bug. The real fix is to stabilize the identity or depend on the primitive inside it.

**`React.memo` that does not prevent re-renders.** `React.memo` makes a component bail out of re-rendering when its props are unchanged, where "unchanged" again means `Object.is`-equal prop by prop (rendering guide, bailout section). Pass a memoized child an inline object, array, or function prop and that prop is a new identity every render, so the memo's prop check always reports "changed," so the child re-renders every time. The memo boundary is intact; you keep handing it a new key. This is why "I added `React.memo` and nothing improved" is, nine times out of ten, an unstable-prop problem rather than a memo problem.

The fixes, in order of preference:

1. **Depend on or pass primitives.** If the effect only needs `userId`, list `userId`, not `config`. If the child only needs the id, pass the id, not the object. A primitive is stable when it is equal, so this sidesteps identity entirely. This is the cleanest fix and the one to try first.
2. **Hoist genuinely constant values out of the component.** An object or array that never changes does not belong inside the render function. Move it to module scope (`const DEFAULTS = {...}` outside the component) and it has one identity for the life of the program.
3. **Preserve identity with `useMemo`/`useCallback`** when you truly need a stable object or function that depends on changing values (Section 12). `useMemo(() => ({ userId }), [userId])` returns the same object identity until `userId` changes, so a downstream dependency array or memo boundary sees stability.

There is a deep connection to the rendering guide worth making explicit. The most extreme case of identity instability is defining a component *inside* another component's render: the inner component is a new function (a new `type`) every render, so React's reconciler treats it as a different component type and remounts the whole subtree, throwing away its state and DOM (rendering guide, the diff section). That catastrophic version and the everyday "my effect fires too often" version are the same phenomenon at different scales: a fresh identity where React expected a stable one. Once you see identity as the thread connecting remounts, broken memos, and over-firing effects, a large class of bugs collapses into one idea.

A caution so you do not over-correct: this does not mean wrap everything in `useMemo`. Most props and dependencies are primitives and are already stable. Identity only matters for the specific objects, arrays, and functions you actually feed into an equality check (a dependency array, a `React.memo` boundary, or another memo's deps). And with the React Compiler on (Section 12), much of the manual stabilization is handled for you. The goal is to *recognize* identity as the cause when an equality check misbehaves, not to defensively memoize the entire component.

> **Try it.** Make a `React.memo` child that logs when it renders. Pass it `style={{ color: 'red' }}` inline and watch it re-render every time the parent does. Pull the object into a module-scope constant (or a `useMemo`) and watch the child go quiet. Then do the same with a function prop and an inline arrow vs a `useCallback`. Seeing the child fall silent is the moment identity becomes real.

**You've got this if** you can explain why `style={{ color: 'red' }}` defeats `React.memo` but `style={STABLE_STYLE}` does not, using the word "identity."

---

## 9. Cleanup, and the setup and cleanup pairing

*Prereqs: Section 6 (synchronization) and Section 7 (the dependency comparison). Outside React: promises and async callbacks (for the fetch-race example). From the rendering guide: StrictMode's double-invoke, referenced near the end.*

**The itch.** You set up a subscription or an event listener in an effect and you are vaguely aware you should clean it up, but the timing confuses you. Does cleanup only run on unmount? Why does your subscription seem to fire twice, or your fetch sometimes show stale results? And why does StrictMode make the effect run, then clean up, then run again?

**The short version.** The function your effect returns is its cleanup, and it is not just an unmount handler. Cleanup and setup are a pair that React runs to move from one synchronization to the next. Before re-running an effect because its dependencies changed, React runs the previous cleanup first, then the new setup. On unmount, it runs the final cleanup. The mental model: each render's effect cleans up the previous render's effect before establishing its own. Get this and double-subscriptions, leaks, and fetch races stop happening.

**How it actually works.**

Recall the effect record on the hook node from Section 7: `{ create, destroy, deps }`. When React first runs an effect, it calls `create` (your setup) and stores whatever it returns as `destroy` (your cleanup). The contract for subsequent commits is the pairing:

- If the dependencies are unchanged (`areHookInputsEqual` is true), React does nothing: no cleanup, no setup. The previous synchronization is still valid.
- If the dependencies changed, React calls the stored `destroy` (cleaning up the *previous* render's synchronization) and then calls `create` again (establishing this render's synchronization), storing the new cleanup.
- On unmount, React calls the stored `destroy` one last time, with no following setup.

So cleanup is emphatically not "unmount-only." It runs every time the effect is about to re-synchronize. This is the piece the lifecycle mindset (Section 6) gets wrong, and the mistake has teeth. Consider a subscription:

```js
useEffect(() => {
  const sub = source.subscribe(roomId, onMessage);
  return () => sub.unsubscribe(); // cleanup: undo THIS subscription
}, [roomId]);
```

When `roomId` changes from `A` to `B`, React runs the cleanup for the `A` subscription, then sets up the `B` subscription. If you had treated cleanup as unmount-only and, say, only unsubscribed in a separate unmount path, you would now be subscribed to both `A` and `B`, and `onMessage` would fire twice. The leak and the double-fire are the same bug: a setup without its paired cleanup. Thinking "this render's effect cleans up the previous render's effect" makes the correct code obvious, because you write the cleanup that exactly undoes the setup sitting two lines above it.

**The fetch race**, which is the same idea applied to async work:

```js
useEffect(() => {
  let ignore = false;
  fetchUser(userId).then(data => {
    if (!ignore) setUser(data); // only the latest effect's response is allowed to win
  });
  return () => { ignore = true; }; // cleanup flips the flag for the superseded request
}, [userId]);
```

If `userId` changes quickly, you fire two requests. Without the flag, whichever resolves last sets the state, which might be the *older* request finishing after the newer one (a race that shows the wrong user). The cleanup flips `ignore = true` on the superseded effect, so when its `fetch` finally resolves, its `setUser` is skipped. You did not write race-handling logic; you wrote "this synchronization is being torn down, so ignore its in-flight result," which is just cleanup doing its normal job.

**Ordering within a commit**, stated carefully because the exact details are an implementation concern you should not lean on: within a single commit, React runs the needed cleanups before the needed setups, so no setup ever runs while a stale cleanup is still pending. For layout effects this happens synchronously during commit; for passive effects it happens after paint (Section 10). The precise order *between different components'* effects (which sibling's cleanup runs first) is not part of React's public contract, so do not write code that depends on it. What you can rely on is the pairing: a given effect's cleanup always runs before that same effect's next setup, and before unmount.

**Why StrictMode runs setup, cleanup, setup on mount in development.** In development, StrictMode deliberately mounts each component, runs effects, immediately runs their cleanups, and runs the effects again (rendering guide, StrictMode section). This is not a quirk to work around; it is a test. If your effect is a correct synchronization with a cleanup that exactly undoes its setup, the extra cleanup-then-setup cycle is invisible (you disconnect and reconnect, ending in the same state). If your effect leaks (subscribes without unsubscribing, starts a timer without clearing it, fetches without an ignore flag), the double-invoke makes the leak show up immediately, in development, instead of in production under fast navigation. "It only breaks with StrictMode on" always means a real missing-or-wrong cleanup, never a React bug. The fix is to make setup and cleanup a clean pair, after which StrictMode goes quiet.

> **Try it.** Write the `roomId` subscription effect, but comment out the `return () => sub.unsubscribe()`. Change `roomId` a few times and watch handlers stack up (log inside `onMessage`). Restore the cleanup and watch it return to exactly one active subscription. Then turn on StrictMode and confirm the well-behaved version survives the double-invoke unchanged while the leaky version visibly doubles.

**You've got this if** you can explain why cleanup runs before every re-run of an effect, not only on unmount, and why that makes the subscription example correct.

---

## 10. useLayoutEffect vs useEffect: timing around paint

*Prereqs: Section 9 (setup and cleanup). Outside React: the browser's paint cycle and reading layout with `getBoundingClientRect`. From the rendering guide: the commit phase order, recapped here as a sequence of moments.*

**The itch.** You position a tooltip or measure an element in a `useEffect`, and the user sees it flash in the wrong place for one frame before it jumps to the right place. Switching to `useLayoutEffect` fixes the flicker. You want to know what the difference actually is so you know when each one is right, and why the docs warn against reaching for `useLayoutEffect` by default.

**The short version.** Both hooks run after React updates the DOM, but at different moments relative to the browser painting pixels. `useLayoutEffect` runs synchronously right after React mutates the DOM and *before* the browser paints, so you can measure layout and make corrections the user never sees. `useEffect` runs *after* paint, asynchronously, so it never blocks the user from seeing the update. Default to `useEffect`. Reach for `useLayoutEffect` only when you must read or change layout before paint to avoid a visible flicker, because it blocks painting and so can make the page feel slow if you do heavy work in it.

**How it actually works.**

This is best understood as a sequence of moments in the commit phase (rendering guide, render and commit section). After React finishes rendering (the interruptible phase) and is ready to commit, the order of events is:

1. React mutates the real DOM to match the new render (inserts, updates, removes nodes). The DOM is now correct in memory, but the browser has not painted it yet.
2. React synchronously runs all `useLayoutEffect` cleanups and setups for this commit. Because this is before paint, anything you do here, including reading layout with `getBoundingClientRect` and synchronously setting state to reposition, happens before the user sees a single frame.
3. The browser paints. The user now sees the result, including any layout correction you made in step 2.
4. Later, asynchronously (in a separate task scheduled after paint), React runs all `useEffect` cleanups and setups. These are the "passive" effects, and they never delay what the user sees.

That sequence explains both the flicker and the fix. If you measure-and-reposition in a `useEffect`, the browser already painted the element in its initial position in step 3, then your effect runs in step 4 and sets state, causing another render and another paint that moves it. The user sees the intermediate frame: a flash. Move the measure-and-reposition into `useLayoutEffect` and it happens in step 2, before any paint, so the user only ever sees the corrected position. There is no intermediate frame to flash.

The genuine use cases for `useLayoutEffect` are narrow and they all share a shape: you must read the laid-out DOM (a measurement) or mutate it (set a scroll position, position an overlay) *and have that reflected in the same paint the user first sees*. Tooltip and popover positioning, measuring an element to size something relative to it, synchronously restoring scroll position. Outside that shape, `useEffect` is correct.

The cost, and why it is not the default: step 2 is synchronous and blocks the browser from getting to step 3. Heavy work in a `useLayoutEffect` (or many of them) delays paint, which the user perceives as jank or a frozen frame. `useEffect` running after paint is what keeps updates feeling instant even when there is follow-up work to do. So the rule is not "layout effect is the powerful one, use it when in doubt." It is "passive effect by default, layout effect only to prevent a visible flicker, and keep the layout effect cheap."

Two further notes. First, server rendering: `useLayoutEffect` cannot run on the server (there is no layout to read), and React warns if you use it in code that renders on the server. If you have a layout effect in shared code, either guard it or move the logic so it does not run during server rendering. Second, there is a rarely-needed third member of this family, `useInsertionEffect`, which runs even earlier (before layout effects) and exists almost exclusively for CSS-in-JS libraries to inject styles before layout is read. You will likely never write one directly; it is worth knowing it exists so the name does not surprise you.

> **Try it.** Build a tooltip that measures its own width in an effect and centers itself over a button by setting a `left` offset in state. Do it with `useEffect` first and watch it flash from the corner to centered. Switch the same code to `useLayoutEffect` and watch the flash disappear. Then put a deliberately slow loop inside the layout effect and feel the paint stall, which is the cost you are trading for.

**You've got this if** you can place `useLayoutEffect` and `useEffect` correctly in the sequence "mutate DOM, run X, paint, run Y," and say which is X and which is Y.

---

## 11. useEffectEvent: reading the latest without reacting to it

*Prereqs: Section 7 (the dependency array) and Section 3 (stale closures). This is the principled fix for the tension between them.*

**The itch.** You have an effect that should re-run only when one value changes (reconnect when `roomId` changes), but inside it you also read another value (show a notification using the current `theme`). If you put `theme` in the deps, changing the theme needlessly reconnects the socket. If you leave `theme` out, you get a stale closure and the linter is right to complain. Every "just disable the linter here" instinct is pointing at this exact situation.

**The short version.** `useEffectEvent` (stable since React 19.2) lets you carve the non-reactive part out of an effect. You wrap the "read the latest value but do not treat it as a trigger" logic in an Effect Event. Inside that wrapped function, props and state always read at their latest committed values, but the function is intentionally excluded from the dependency array, so changes to what it reads do not re-run the effect. It is the principled, lint-understood answer to the cases where you were tempted to lie to the dependency array.

**How it actually works.**

First, name the problem precisely using Section 7. The dependency array is "the set of values this synchronization depends on." But real effects sometimes contain two kinds of logic mixed together: *reactive* logic (the part that, when its inputs change, genuinely means the synchronization is out of date and must be redone) and *non-reactive* logic (the part that should run as part of the effect but should always use the latest values without itself being a trigger). The classic case:

```js
function ChatRoom({ roomId, theme }) {
  useEffect(() => {
    const connection = createConnection(roomId);
    connection.on('connected', () => {
      showNotification('Connected!', theme); // reads theme, but theme should NOT trigger reconnect
    });
    connection.connect();
    return () => connection.disconnect();
  }, [roomId, theme]); // including theme means changing the theme disconnects and reconnects: wrong
}
```

The reconnection should be reactive to `roomId` (a new room genuinely means "tear down and reconnect"). The notification reads `theme`, but `theme` changing should not reconnect anything; you just want the notification to use whatever the theme currently is. Listing `theme` makes the effect over-react. Omitting `theme` gives a stale closure (the notification shows an old theme) and is exactly the dishonest-deps situation the linter flags.

`useEffectEvent` resolves this by separating the two:

```js
function ChatRoom({ roomId, theme }) {
  const onConnected = useEffectEvent(() => {
    showNotification('Connected!', theme); // always reads the LATEST theme at call time
  });

  useEffect(() => {
    const connection = createConnection(roomId);
    connection.on('connected', () => onConnected());
    connection.connect();
    return () => connection.disconnect();
  }, [roomId]); // theme is gone; only roomId is a genuine trigger now
}
```

The mechanism and model: `onConnected` is an Effect Event. The logic inside it is non-reactive, and when you call it, it reads the latest committed values of any props and state it closes over. So `theme` is read fresh every time `onConnected` runs, even though `theme` is not in the effect's dependency array. The effect now correctly reconnects only on `roomId` changes, and the notification still uses the current theme.

Here is the precise detail that is easy to get wrong, and the official reference is explicit about it: Effect Event functions do **not** have a stable identity. Their identity intentionally changes on every render. So the reason you omit `onConnected` from the dependency array is *not* that it is referentially stable (it is not). It is that Effect Events are defined as non-reactive, and the linter has special knowledge of them: it knows they must be excluded from dependency arrays and enforces that exclusion. This is a different stability story from `useState` setters and `dispatch` (which truly are stable) and from `useRef` (also stable). Effect Events are stable in *behavior contract* (always omit from deps), not in identity. Getting this right matters because if you reasoned "it must be stable, so I can pass it around like a callback," you would be wrong on both counts.

That leads to the rules, which are real constraints, not style advice:

- **Only call Effect Events from inside effects (or from other Effect Events).** You can call them from `useEffect`, `useLayoutEffect`, `useInsertionEffect`, or another Effect Event in the same component. Do not call them during render, do not pass them as props or into other hooks. The linter enforces this. The reason is that "read the latest committed value" only has a well-defined meaning at the times effects run; calling one during render or handing it to unrelated code breaks that guarantee.
- **It is a hook, so it follows rule one (Section 1).** Top level only, no conditionals or loops. If you need a conditional Effect Event, extract a component.
- **Do not use it to dodge real dependencies.** This is the abuse the React docs warn against by name. If a value changing genuinely means the effect's work is now wrong (the notification should fire *separately for each different value*, like logging a visit per URL), then that value is reactive and belongs in the dependency array; an Effect Event would wrongly suppress the re-run. Effect Events are only for logic that is genuinely "an event fired from inside the effect," where you want the latest value but the value is not a trigger.

You may have previously solved this with a `useRef` that you keep updating in an effect to hold the latest value, then read inside the main effect. That pattern works but has real downsides the Effect Event fixes: it separates a value from its usage (harder to read), the linter does not understand the ref as a reactive value (so it cannot help you keep things correct), and it is awkward for cases where some of the logic should be reactive and some should not. `useEffectEvent` is the supported, lint-aware version of that pattern. On versions before 19.2, the ref pattern is still your fallback (it was experimental in 19.0 and 19.1, and not available in 18 and earlier).

> **Try it.** Build the `ChatRoom` with `theme` in the deps and a notification on connect. Toggle the theme and watch the console show a disconnect and reconnect every toggle. Extract the notification into a `useEffectEvent`, drop `theme` from the deps, and watch the toggles stop reconnecting while the notification still picks up the new theme. Then deliberately misuse it: try to also remove `roomId` and read it inside the Effect Event, and notice the room stops reconnecting when it should, which is the abuse the rules exist to prevent.

**You've got this if** you can explain why you omit an Effect Event from the dependency array even though its identity is not stable, and when reaching for one would actually be a bug.

---

## 12. useMemo and useCallback (and what the Compiler changes)

*Prereqs: Section 7 (the `Object.is` deps comparison) and Section 8 (referential stability). From the rendering guide: the Compiler and bailouts, referenced.*

**The itch.** You have sprinkled `useMemo` and `useCallback` around "for performance," you are not sure they help, and you have heard the React Compiler now does this automatically and you should maybe delete them all. You want to know what these hooks actually cache, when they earn their keep, and what changes once the Compiler is on.

**The short version.** `useMemo` caches a computed value, and `useCallback` caches a function, each keyed by a dependency array compared with `Object.is`, all stored on the hook node. Their primary real job is referential stability (Section 8): keeping an object or function identity the same across renders so it does not break a downstream dependency array or memo boundary. Their secondary job is skipping genuinely expensive recomputation. They are not a correctness tool (React may throw the cache away), and used reflexively they add cost and noise. With the React Compiler 1.0 (stable October 2025), most manual memoization becomes unnecessary, because the Compiler inserts equivalent memoization for you.

**How it actually works.**

Both hooks store a small record on their hook node: `{ value, deps }` for `useMemo`, and the function plus its deps for `useCallback`. On each render, React compares the new deps to the stored deps with the same `areHookInputsEqual` (`Object.is` element by element) from Section 7. If the deps are unchanged, React returns the cached value (or function) without recomputing. If any dep changed, it recomputes (or takes the new function) and updates the cache. `useCallback(fn, deps)` is literally `useMemo(() => fn, deps)`; it just memoizes a function instead of a computed result. So everything you know about dependency arrays and identity from Sections 7 and 8 applies unchanged here.

Their *primary* purpose is the one people underweight: referential stability. Recall from Section 8 that an inline object or function gets a new identity every render and that this breaks dependency arrays and `React.memo`. `useMemo` and `useCallback` are how you hand a *stable* identity to something that checks identity:

```js
const filterOptions = useMemo(() => ({ status, sortBy }), [status, sortBy]);
useEffect(() => { /* uses filterOptions */ }, [filterOptions]); // now stable until status/sortBy change

const handleSelect = useCallback((id) => onSelect(id), [onSelect]);
return <MemoizedRow onSelect={handleSelect} />; // memo boundary not defeated by a new function each render
```

Without the `useMemo`, `filterOptions` is a new object every render and the effect runs every render. Without the `useCallback`, `handleSelect` is a new function every render and `MemoizedRow` re-renders every render. The memoization here is not about CPU; it is about not breaking the identity contract of a dependency array and a memo boundary. That is the use that actually matters at 1 to 2 years of experience.

The *secondary* purpose is skipping expensive recomputation: if computing a value is genuinely costly (sorting a large list, an expensive transform), `useMemo` lets you recompute only when its inputs change. The trap is that the memoization itself has a cost (storing the value, comparing deps every render), so wrapping a trivial computation makes your code slower and noisier, not faster. The bar for "expensive enough to memoize for CPU reasons" is higher than people assume; measure before assuming a `useMemo` helps.

Two important non-guarantees. First, **memoization is not correctness.** React reserves the right to discard a `useMemo`/`useCallback` cache (for example to free memory) and recompute, so your code must be correct even if the memo "forgets." Never use `useMemo` to ensure something runs only once for correctness, or to store state; use state or a ref for that. Second, **an unstable dep defeats the whole thing.** If you memoize with a dependency that itself changes identity every render (Section 8), the memo never hits, and you have added overhead for nothing. Memoization only stabilizes if its inputs are stable.

**What the Compiler changes.** The React Compiler (rendering guide, 2026 section), stable as 1.0 since October 2025, analyzes your components at build time and automatically inserts memoization for values and functions that would benefit, based on what each piece of UI actually depends on. When it is enabled, the large majority of hand-written `useMemo` and `useCallback` calls become redundant, because the Compiler is already doing equivalent (often more precise) memoization. The practical guidance for a codebase with the Compiler on: stop adding `useMemo`/`useCallback` reflexively, and lean on the Compiler. Where you still might keep a manual one is the narrow case where you need a guaranteed-stable identity feeding an effect's dependency array and you want it explicit, though even there the Compiler frequently handles it. Hand-memoizing everything on top of the Compiler adds noise and, in some cases, can interfere; the `eslint-plugin-react-hooks` and Compiler diagnostics will flag patterns that fight it. If the Compiler is *not* on in your project, the manual rules above still fully apply.

> **Try it.** Make a `React.memo` child and pass it an inline `onClick={() => ...}`; confirm it re-renders every parent render. Wrap the handler in `useCallback` with correct deps and confirm the child goes quiet. Then wrap a trivial computation like `useMemo(() => a + b, [a, b])` and recognize that you just added cost for no benefit. If you have a project with the Compiler enabled, delete a defensive `useCallback` and confirm the child stays quiet anyway, because the Compiler stabilized it.

**You've got this if** you can explain that the main job of `useCallback` is preserving a function's identity for a dependency array or memo boundary, not making the function "faster."

---

## 13. useRef: the mutable box that does not re-render

*Prereqs: Section 4 (the update queue, which refs deliberately bypass) and Section 2. Outside React: DOM nodes and element methods like `focus()` and `getBoundingClientRect`. From the rendering guide: the commit phase, when DOM refs are attached.*

**The itch.** You need to remember a value across renders (an interval ID, the previous value of a prop, a flag) but you do not want changing it to trigger a re-render. Or you need to reach a real DOM node to focus it or measure it. `useRef` does both, and the "does not cause a re-render" part trips people up because it seems to violate everything else about React.

**The short version.** `useRef(initial)` returns a stable object `{ current: initial }` that lives on the hook node and persists across renders. Reading or writing `ref.current` does not schedule a render, because refs are deliberately outside the state and update-queue machinery. That makes refs perfect for two things: holding a reference to a DOM node (React sets `ref.current` to the node during commit), and storing a mutable value you want to remember but not render on. The rule is: do not read or write `ref.current` during render; do it in effects or event handlers, because mutating it during render makes rendering impure.

**How it actually works.**

A ref's hook node stores a single object, and `useRef` returns that same object on every render. That is the entire "stability" guarantee: the identity of the ref object never changes for the life of the component, and it carries a single mutable property, `current`, that you can read and write freely. Crucially, writing to `current` does none of the things `setState` does (Section 4): it does not create an update, it does not append to a queue, it does not mark a lane, and it does not ask the scheduler for a render. It just mutates a property on an object. So the value changes, but the screen does not, until something *else* triggers a render, at which point your render reads the latest `current`.

That non-reactivity is the whole point, and it gives refs two distinct jobs.

**Job one: reaching the DOM.** When you pass a ref to a host element, `<input ref={inputRef} />`, React sets `inputRef.current` to the actual DOM node during the commit phase, specifically after mutating the DOM and before running layout effects (rendering guide, commit section), and sets it back to `null` when the node is removed. So inside a `useEffect` or `useLayoutEffect` or an event handler, `inputRef.current` is the real element, and you can call `inputRef.current.focus()` or measure it. You do not get the node during render (it does not exist yet on first render), which is one more reason not to read refs during render.

```js
const inputRef = useRef(null);
useEffect(() => {
  inputRef.current.focus(); // the node exists by commit time
}, []);
return <input ref={inputRef} />;
```

**Job two: a mutable instance variable.** Any value you want to persist across renders without rendering on it goes in a ref: an interval or timeout ID so you can clear it later, a flag like the `ignore` boolean from Section 9, the previous value of a prop for comparison, a mutable counter that should not paint. The classic "latest value" pattern (the manual predecessor to `useEffectEvent`, Section 11) is a ref you update in an effect so that other long-lived callbacks can read the current value without being recreated:

```js
const latestCount = useRef(count);
useEffect(() => { latestCount.current = count; }); // keep the box current after each commit
// elsewhere, a long-lived callback reads latestCount.current to get the newest value
```

**The rule and why it exists.** Do not read or write `ref.current` during rendering (the body of your component, before it returns), with one sanctioned exception below. The reason is purity: React expects rendering to be a pure function of props and state (rendering guide, first-principles section), and it relies on that to render safely under StrictMode's double-invoke and under concurrent rendering, where a render can be started, abandoned, and restarted. Mutating a ref during render is a side effect that can run zero, one, or two times in ways you cannot predict, leading to bugs that appear only under StrictMode or concurrency. Confine ref reads and writes to effects and handlers, which run at well-defined times after commit. The one accepted exception is lazy initialization of an expensive ref value, guarding it so it only happens once:

```js
const ref = useRef(null);
if (ref.current === null) ref.current = createExpensiveThing(); // runs once, idempotent
```

This is acceptable because it is idempotent (running it twice is harmless), which is the property StrictMode's double-invoke checks for.

A connection worth noting: `useImperativeHandle` lets a parent's ref expose a custom imperative API of a child instead of a raw DOM node, which is the controlled way to give a parent methods like `focus()` or `scrollToTop()` on a child. It is a focused topic that belongs with refs; the engine-internals track's refs guide goes into the commit-phase timing in more depth if you want it.

> **Try it.** Make a ref, write to `ref.current` from a button handler, and `console.log` it, confirming the screen does not change but the logged value does. Then add a normal `useState` next to it and watch only the state change cause a re-render. Finally, try writing to the ref directly in the component body and turn on StrictMode to see why that is discouraged (the write runs twice).

**You've got this if** you can explain why mutating `ref.current` does not re-render, in terms of the update queue it deliberately bypasses.

---

## 14. Custom hooks: sharing logic, not state

*Prereqs: Section 1 (the positional hook list). Everything in this section follows from that one fact.*

**The itch.** Custom hooks feel slightly magical, like they create some shared thing. You are not sure whether two components using the same custom hook share state, whether the rules of hooks apply inside them, or what is actually being reused. Getting this wrong leads to expecting shared state that is not there, or to subtle rule-of-hooks violations.

**The short version.** A custom hook is just a function whose name starts with `use` and that calls other hooks. There is no magic and no shared instance. When a component calls a custom hook, that hook's internal `useState`, `useEffect`, and so on are appended to the *calling component's* own hook list, inline, at the call site. So two components calling the same custom hook each get their own completely independent state; what they share is the *logic*, not the data. And because the hook's calls become part of the caller's positional list, custom hooks obey the rules of hooks exactly like everything else.

**How it actually works.**

This follows directly from Section 1's linked list, and seeing it that way removes the mystery entirely. Recall that hooks are stored as an ordered list on the rendering component's fiber, bound by call order. A custom hook is not a component and has no fiber of its own. It is a plain function call that happens during a component's render. So when the component runs and reaches your custom hook call, the hooks *inside* that custom hook execute as part of the component's render, and their nodes are appended to the component's hook list right where the call sits.

Picture a component that calls a custom hook:

```js
function useToggle(initial = false) {
  const [on, setOn] = useState(initial);        // becomes a node in the CALLER's hook list
  const toggle = useCallback(() => setOn(o => !o), []); // also the caller's list
  return [on, toggle];
}

function Panel() {
  const [open, toggleOpen] = useToggle();   // appends useToggle's hooks here
  const [count, setCount] = useState(0);    // then this one
  // Panel's hook list, in order: [useToggle's useState] → [useToggle's useCallback] → [count's useState]
}
```

`Panel`'s hook list is the flattened sequence of every hook call that executed during its render, including the ones that happened to live inside `useToggle`. There is no `useToggle` instance and no boundary; the calls are simply inlined into `Panel`'s list by execution order. Three important consequences fall out:

**Two components calling the same custom hook do not share state.** If both `Panel` and `Sidebar` call `useToggle()`, each call happens during a *different* component's render, on a *different* fiber, and so allocates *different* hook nodes. `Panel`'s toggle and `Sidebar`'s toggle are entirely independent. This is the answer to the most common custom-hook misconception: custom hooks share *stateful logic* (the recipe for how to manage a piece of state), never the *state itself*. If you actually want two components to share the same state, that is what lifting state up or context (the state-management guide) is for; a custom hook will not do it, by construction.

**The rules of hooks apply inside custom hooks, for the same reason they apply anywhere.** Because the custom hook's calls land in the caller's positional list, calling one of them conditionally inside the custom hook desyncs that list exactly as it would in a component (Section 1). So a custom hook must also call its hooks unconditionally, at the top level. This is not a separate rule; it is the same rule, because there is only one list.

**Composition is just more inlining.** A custom hook can call another custom hook, which appends *its* hooks into the list too, still flattened by execution order. There is no nesting in the storage; it is all one linear list on the rendering component's fiber. This is why deeply composed custom hooks still work fine, as long as every link in the chain follows the rules.

The `use` naming convention is not cosmetic. It is how `eslint-plugin-react-hooks` knows to apply and enforce the rules inside your function (treating it as a hook rather than a regular function), and it is part of how the React Compiler identifies hooks. Name a hook-calling function without the `use` prefix and the tooling can no longer protect you, and a function that does not call hooks should *not* have the prefix, to avoid misleading the tooling. Follow the convention precisely; it is load-bearing for the linter and Compiler, not just for readability.

A good custom hook returns whatever shape fits its use: an array when the values are positional and you want callers to rename them freely (like `useState`), an object when there are several named values. The point of extracting one is to give a piece of stateful logic a name and a single place to live, so it can be reused, tested in isolation by rendering it in a test component, and reasoned about as a unit. What you are reusing is always the logic; the state is minted fresh at every call site.

> **Try it.** Write `useToggle` and use it in two sibling components. Toggle one and confirm the other does not move, proving the state is independent. Then, inside `useToggle`, wrap its `useState` in an `if` and watch the rules-of-hooks violation surface in the consuming component, demonstrating that the hook's calls really are part of the caller's list.

**You've got this if** you can explain why two components using the same custom hook have independent state, in terms of separate fibers and separate hook nodes.

---

## 15. The modern hook surface (a map)

*Prereqs: Section 1, plus a skim of the rendering guide (Suspense, concurrency, tearing) and the RSC guide (Server Functions), since this maps onto them.*

**The itch.** Beyond `useState` and `useEffect`, React 19 ships a pile of hooks (`use`, `useId`, `useSyncExternalStore`, `useTransition`, `useDeferredValue`, `useActionState`, `useFormStatus`, `useOptimistic`), and it is hard to know which matter to you, which connect to things you already know, and where to go to learn each one properly. You want a map, not a tutorial on each.

**The short version.** Most of the modern hooks fall into three groups: reading external things (`use`, `useSyncExternalStore`), concurrency (`useTransition`, `useDeferredValue`), and forms and Server Functions (`useActionState`, `useFormStatus`, `useOptimistic`), plus a couple of utilities (`useId`, `useDebugValue`). Each connects to a mechanism you have already met in this guide or the two engine guides, so you can learn them on demand rather than all at once.

**How it actually works (as a map, with where to go deeper).**

**Reading external things.**

- `use(resource)` is the modern reader. Given a promise, it suspends the component until the promise resolves (rendering guide, Suspense section; RSC guide for the server side), integrating data fetching with Suspense. Given a context, `use(Context)` reads it like `useContext` but, uniquely, may be called inside conditionals and loops (the deliberate exception to rule one from Section 1). It is the ergonomic surface behind a lot of modern data and context reading.
- `useSyncExternalStore(subscribe, getSnapshot)` is how you subscribe to a store that lives outside React (a global store, a browser API like `navigator.onLine`, anything with its own change events) without the "tearing" bug where different parts of one render see different values of the store (rendering guide, tearing section). You will mostly meet it inside state libraries rather than write it by hand, but knowing it exists explains how those libraries stay correct under concurrent rendering. The state-management guide will return to it.

**Concurrency (rendering guide, concurrency and lanes sections).**

- `useTransition` gives you `[isPending, startTransition]` to mark a state update as a non-urgent transition, so React can keep the UI responsive to urgent input while the heavier update renders at lower priority, and `isPending` lets you show a subtle pending state.
- `useDeferredValue(value)` hands you a copy of a value that is allowed to lag, so an expensive subtree can render against the old value while the input that drives it stays snappy. Both are about not letting heavy rendering block interaction; the data-fetching and performance guides will use them.

**Forms and Server Functions (RSC guide, Server Functions section).**

- `useActionState(action, initialState)` manages the state, pending status, and result of a form action, and is the client-side companion to Server Functions, though it works with plain client functions too.
- `useFormStatus()` lets a component deep inside a form read the parent form's submission status without prop drilling.
- `useOptimistic(state, updateFn)` shows an optimistic value immediately while an async action is in flight, then reconciles to the real result when it settles. These three are the backbone of React 19's form story and connect directly to the RSC and data-fetching material; learn them when you are building forms or working with actions.

**Utilities.**

- `useId()` generates a stable, unique ID that matches between server and client rendering, for accessibility attributes (`aria-describedby`, label associations) where you need a unique id that does not break hydration. Do not use it for list keys.
- `useDebugValue(value)` adds a label to a custom hook in React DevTools; purely a developer-experience tool for library authors.

The reason this is a map rather than five more deep sections is that each of these is best learned the moment you have a real reason to reach for it, with the relevant deep guide open. They all rest on mechanisms you now understand: the hook list and rules (Section 1), the snapshot and queue model (Sections 2 and 4), Suspense and concurrency and tearing (the rendering guide), and Server Functions (the RSC guide). None of them is a new kind of thing; they are new surfaces over machinery you have already seen.

> **Try it.** Pick the one closest to your current work. If you do data fetching, wrap a slow update in `startTransition` and watch `isPending` while typing stays smooth. If you build forms, wire up `useActionState` with a trivial async action and watch its pending and result states. Learning one in context beats skimming all eight.

**You've got this if** you can sort an unfamiliar modern hook into "reads external things," "concurrency," "forms and actions," or "utility," and name the deeper guide that covers it.

---

## 16. Debugging hooks and effects

*Prereqs: ideally Sections 1 through 15, since this is the synthesis. At minimum Sections 2, 7, and 8.*

**The itch.** Something is wrong: an effect fires constantly, or never; a value is stale; a memoized child re-renders anyway; the count went up by one when you set it three times. You want a procedure that turns "React is being weird" into "I know exactly which mechanism this is."

**The short version.** Almost every hook and effect bug is one of a small set, and each maps to a section of this guide. The procedure is: figure out which render's snapshot the bad value came from, check the dependency array against what the code actually reads (run the linter), and ask whether the misbehaving value is a primitive or an identity. Those three questions resolve the large majority of cases.

**How it actually works.**

Run these questions in order against any hook or effect bug.

**Question one: which render's snapshot is this value from?** (Sections 2 and 3.) If a callback, timer, or effect is using an old value, it closed over an earlier render. Decide whether it should depend on the value (then list it honestly, Section 7), only needs the latest to compute next state (use the updater form, Section 4), or reads it but should not react to it (`useEffectEvent`, Section 11). "Stale value" is never random; it is a closure pinned to a render.

**Question two: does the dependency array match what the effect reads?** (Section 7.) Turn on `eslint-plugin-react-hooks` and believe it. If it wants a dependency you left out, your effect has a stale-value bug waiting to happen. If the effect fires every render, look for a dependency whose identity changes every render (Section 8). If the effect loops forever, it is almost always setting state that changes one of its own dependencies' identities.

**Question three: is the misbehaving value a primitive or an identity?** (Section 8.) When `React.memo` does not stop a re-render, or an effect fires too often, inspect the suspect prop or dependency. If it is an object, array, or function created inline in the parent's render, that is the cause: a new identity every render. Stabilize it (lift it out, `useMemo`, `useCallback`) or depend on the primitive inside it. "Looks the same but is treated as different" is always an identity issue.

The common bugs, each tagged with its mechanism:

An effect that runs on every render is being fed a dependency with a fresh identity each render (an inline object, array, or function); stabilize the dependency or depend on a primitive (Section 8).

An effect that loops forever is setting state that changes one of its own dependencies; break the cycle by removing the dependency, using the updater form, or moving the computation out of the effect (Sections 4, 7, 8).

A stale value inside a timer, subscription, or handler is a closure over an old render; choose the honest-deps, updater-form, or `useEffectEvent` fix based on whether the value is a real trigger (Sections 3, 11).

An effect that runs setup then cleanup then setup on mount in development is StrictMode surfacing a missing or incorrect cleanup; make setup and cleanup a clean pair (Sections 9, and the rendering guide's StrictMode section). If it breaks only with StrictMode on, it is a real bug, not a quirk.

A crash or wrong-hook value after a conditional is a desynced positional hook list; move every hook to the top level (Section 1).

State that "did not update" right after you set it is the snapshot model: the setter scheduled a new render and your current `count` is still this render's constant (Sections 2, 4).

A `React.memo` child that re-renders anyway is getting an unstable prop identity from its parent; stabilize the prop (Sections 8, 12).

Three `setCount(count + 1)` calls that only bumped the value by one are value-form setters all reading the same snapshot; use the updater form to compose them (Section 4).

A flicker where an element paints in the wrong place for one frame is a layout read happening in a passive effect after paint; move it to `useLayoutEffect` (Section 10).

**The whole thing in one paragraph.** Hooks are an ordered linked list on a component's fiber, bound by call order, which is why their order is sacred (Section 1). Each render is a frozen snapshot of props, state, and the closures defined in it, so state never mutates in place; setters enqueue updates and schedule a new render that recomputes the value (Sections 2 and 4). Effects are not lifecycle callbacks but synchronizations: you describe how to bring an external system into agreement with the current render and how to undo that, and React keeps reality matching your latest render by pairing cleanup with setup, gated by a dependency array that is nothing more than an `Object.is` comparison of the values the synchronization depends on (Sections 6, 7, 9). That same `Object.is` comparison is why referential identity governs effects, memoization, and memo boundaries alike: a fresh object or function every render reads as "changed," which over-fires effects, defeats `React.memo`, and, in the extreme, remounts whole subtrees (Section 8). `useLayoutEffect` runs before paint and `useEffect` after it (Section 10); `useEffectEvent` carves the non-reactive part out of an effect so you can read the latest value without making it a trigger (Section 11); `useMemo` and `useCallback` exist mostly to preserve identity, a job the React Compiler now largely automates (Section 12); `useRef` is a mutable box that deliberately sidesteps the update queue so changing it does not render (Section 13); and custom hooks reuse logic, not state, because their hooks inline into each caller's own list (Section 14). Every rule you were told to memorize is a consequence of one of these mechanisms, which is why understanding the mechanism lets you derive the rule instead of reciting it.

> **Try it.** Take a real hook or effect bug from your own code (or reproduce one of the eight above) and walk the three questions out loud before changing anything. Do this on three different bugs and the procedure becomes reflexive, which is the goal: reach for the model before you reach for `useMemo`.

**You've got this if** you can take "my effect fires on every render" and name the mechanism and the fix without guessing.

---

## 17. Reading the source (pass 3)

*Prereqs: the rest of the guide, plus comfort reading JavaScript source. This is a pass 3 section; there is no rush.*

**The itch.** You have the model. Now you want to see hooks in React's actual code and confirm the linked list, the dispatcher swap, the update queue, and the `Object.is` dependency check are really there.

**The short version.** Nearly all of it lives in one file, `ReactFiberHooks.js`, plus the commit-time effect handling in `ReactFiberCommitWork.js`. It is more readable than you expect once you know the map, because every function corresponds to something in this guide.

**How it actually works (the reading order).**

`ReactFiberHooks.js` is the main event. Look for:

The `Hook` type and `mountWorkInProgressHook` / `updateWorkInProgressHook`: the linked list and the cursor that walks it. This is Section 1 made literal, including why order is non-negotiable.

`HooksDispatcherOnMount` versus `HooksDispatcherOnUpdate`: the two dispatcher objects React swaps between, which is how the same `useState` line allocates on mount and reads on update. The throwing dispatcher (`ContextOnlyDispatcher` and related) is the one that produces the "Invalid hook call" error from Section 1.

`mountState` / `updateState`, the update queue, and `dispatchSetState`: the queue from Section 4, including the fold over pending updates and the basic state reducer that makes `useState` a special case of `useReducer` (Section 5). The bail-out on `Object.is`-equal state is here too.

`mountEffect` / `updateEffect`, `pushEffect`, and `areHookInputsEqual`: the effect record, the dependency array, and the exact `Object.is` element-by-element comparison from Section 7. `areHookInputsEqual` is the few-line function the entire dependency-array mental model rests on; reading it is genuinely clarifying.

`mountRef` / `updateRef`: the ref box from Section 13, and how little there is to it (no queue, no scheduling).

Then `ReactFiberCommitWork.js` for `commitHookEffectListMount` and `commitHookEffectListUnmount`: where setups and cleanups actually run in the commit phase, which is the timing behind Sections 9 and 10 (passive versus layout effects).

Pair this with `eslint-plugin-react-hooks` (the source of the rules-of-hooks and `exhaustive-deps` enforcement from Sections 1 and 7) and the React Compiler docs (for what it automates over Section 12). And keep the official react.dev references open; they are current within the React 19 line.

> **Try it.** Open `ReactFiberHooks.js`, find `areHookInputsEqual`, and read it. It is short. Recognizing that the entire dependency-array model in Section 7 is that one loop is the fastest way to stop treating the array as magic.

**You've got this if** you opened `ReactFiberHooks.js`, found a function named in this guide, and recognized what it does.

---

## Further reading (primary sources)

When you want to go past this guide, these are the canonical sources, each with a note on how it relates to what you read here and how current it is.

**A Complete Guide to useEffect, by Dan Abramov.** Available at https://overreacted.io/a-complete-guide-to-useeffect/ . This is the single best long-form explanation of the snapshot model and effects-as-synchronization, written by someone who was on the React team. It maps onto Sections 2, 3, 6, and 7 of this guide, and it is where the "each render has its own everything" framing comes from. One caveat on currency: it predates `useEffectEvent` going stable (it discusses the underlying problem and an earlier experimental shape of the solution) and predates the React Compiler, so pair its `useCallback`/`useMemo` advice with Section 12 and its non-reactive-value discussion with Section 11. The core model is evergreen.

**React as a UI Runtime, by Dan Abramov.** Available at https://overreacted.io/react-as-a-ui-runtime/ . A deeper, more complete mental model of how React treats your components as a program it runs, including state, identity, and reconciliation. It maps onto Sections 2, 13, and 14, and complements the rendering guide. Also predates the Compiler and the newest hooks, so treat it as model-not-API.

**The official React docs (react.dev), current within the React 19 line.** Several pages are directly relevant and kept up to date:

1. Synchronizing with Effects, at https://react.dev/learn/synchronizing-with-effects . The official version of Section 6.
2. You Might Not Need an Effect, at https://react.dev/learn/you-might-not-need-an-effect . The official version of "most prop-reaction code is not an effect," from Section 6.
3. Removing Effect Dependencies, at https://react.dev/learn/removing-effect-dependencies . Directly supports Sections 7 and 8.
4. Separating Events from Effects, at https://react.dev/learn/separating-events-from-effects . The conceptual home of Section 11, more thorough than the reference page.
5. The useEffectEvent reference, at https://react.dev/reference/react/useEffectEvent . The exact rules and caveats for Section 11, including the deliberately-unstable-identity point.
6. Rules of Hooks, at https://react.dev/reference/rules/rules-of-hooks . The official statement of Section 1.

**eslint-plugin-react-hooks.** The plugin that enforces the rules of hooks and `exhaustive-deps`. It is not optional tooling; it is the mechanical guardrail for Sections 1, 7, and 11. Keep it on and believe it.

A good way to use all of these: read the relevant deep section of this guide first so you have the vocabulary, then read the primary source, then come back and reread the section. The primary sources go deeper on their one topic; this guide gives you the map that tells you where each one fits, and ties each rule back to the mechanism that makes it true.

---

*Built to be climbed, not swallowed. Finish pass 1 and you are already ahead. Come back for the deep parts when your work gives you a reason to care, and run the experiments so the knowledge sticks to something real. Every claim about the 2026 surface (the 19.2.x line, `useEffectEvent` going stable, the React Compiler 1.0) reflects React 19.2.x; the core model (the hook linked list, the snapshot, the update queue, effects as synchronization, the `Object.is` dependency check) has been stable across the React 18 to 19 era.*
