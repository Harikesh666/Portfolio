# React's Scheduler and Lanes: A Guided Deep Dive

> Current as of React 19.2.x (latest patch 19.2.6, May 2026). The scheduler and the lane model have been stable since React 18; the specifics here (the 31-lane bitmask, the MessageChannel work loop, the 5ms time slice) were verified against current sources and apply to the React 19 line. This is a Track A engine-internals guide and the deep companion to the rendering guide's concurrency sections.

> **What this guide builds on.** This is a Track A (engine internals) guide that goes deeper than the rendering guide's concurrency overview. From the **rendering and reconciliation guide** it uses the work loop (React processes the tree in interruptible units of work), the render and commit split, fibers (React's internal objects for components), and the high-level idea of concurrent rendering and lanes; this guide is the detailed version of that lanes material. From the **Event System guide** it uses event priority (discrete versus continuous): the event system assigns a priority, and this guide is where that priority becomes a lane and gets scheduled. From the **Hooks and Effects guide** it uses the update queue (`setState` enqueues an update) and the concurrency hooks (`useTransition`, `useDeferredValue`). Wherever it reaches for one of those, it recaps it in a line. The per-section **Prereqs** lines name what each section needs, drawn from earlier sections here, the other guides, and outside knowledge (bitwise operations on integers, a priority queue or min-heap, and the browser event loop: macrotasks, the roughly 16ms frame budget, `requestAnimationFrame`, `requestIdleCallback`, and `setTimeout`'s 4ms clamp).

## Read this first

Same method as the other guides. **You are not meant to absorb this in one sitting**, and this is one of the more internals-heavy guides, so the 3-pass approach matters even more.

**Pass 1, one relaxed sitting (about 30 minutes).** Read only **"The itch"** and **"The short version"** of each section. You will come out understanding the two separate problems React solves here (when to do work, and which work to do first), how the scheduler slices work and yields to the browser, what a lane actually is (a bit in a bitmask) and why React uses bits, how an event's priority becomes a lane, and how starvation and consistency are handled. That is the whole map.

**Pass 2, driven by real work or real curiosity.** When you hit something that makes you care (jank you traced to a long render, a transition that behaved unexpectedly, a profiler trace full of 5ms slices), come back and read the deep part of the matching section.

**Pass 3, when curious.** The further-reading section points at the React working group discussions and the source files (the `scheduler` package and `ReactFiberLane.js`) where this all lives.

Each section opens with a one-line **Prereqs** note: the earlier sections (here or in the other guides) and any outside knowledge worth having first. Sections that need nothing past basic React say so.

**Two rules that multiply everything.**

1. **Run the experiments.** Each section ends with a short **"Try it."** Some of these are best seen in the browser's Performance panel (watching the main thread yield in roughly 5ms slices) rather than in the React DevTools, because this is about timing and the main thread.
2. **Trust the order.** The sections build one picture, in order: the two problems, the scheduler that solves "when," the lanes that solve "which," how lanes are assigned and chosen, and how starvation, consistency, and the concurrent features fall out. Here is the spine:

```
   Two problems: WHEN to work, and WHICH work first      (1)
            │
   Cooperative scheduling: slice work, yield to browser   (2)
            │
   The scheduler: a priority queue + time slicing         (3, 4)   ◀── solves WHEN
            │
   Lanes: a bitmask of priorities                          (5, 6)   ◀── solves WHICH
            │
   Assign a lane, choose lanes to render                   (7, 8)
            │
   Starvation (expiration) and consistency (entanglement)  (9, 10)
            │
   How it powers batching and the concurrent features       (11)
            │
   Two priority systems, debugging, the source              (12, 13, 14)
```

You do not need to finish this guide to benefit from it. Finish pass 1 and you are already ahead.

---

## Table of Contents

1. [Why React needs both a scheduler and lanes](#1-why-react-needs-both-a-scheduler-and-lanes)
2. [The problem: blocking renders and cooperative scheduling](#2-the-problem-blocking-renders-and-cooperative-scheduling)
3. [The scheduler: a priority queue with time slicing](#3-the-scheduler-a-priority-queue-with-time-slicing)
4. [The MessageChannel work loop and shouldYield](#4-the-messagechannel-work-loop-and-shouldyield)
5. [Lanes: the bitmask model](#5-lanes-the-bitmask-model)
6. [The lane layout: from Sync to Idle](#6-the-lane-layout-from-sync-to-idle)
7. [Assigning a lane: from event priority to a bit](#7-assigning-a-lane-from-event-priority-to-a-bit)
8. [Choosing what to render next: getNextLanes](#8-choosing-what-to-render-next-getnextlanes)
9. [Expiration: preventing starvation](#9-expiration-preventing-starvation)
10. [Entanglement: lanes that must render together](#10-entanglement-lanes-that-must-render-together)
11. [How lanes drive batching and the concurrent features](#11-how-lanes-drive-batching-and-the-concurrent-features)
12. [Two priority systems: scheduler priorities versus lanes](#12-two-priority-systems-scheduler-priorities-versus-lanes)
13. [Debugging and observing scheduling](#13-debugging-and-observing-scheduling)
14. [Reading the source](#14-reading-the-source)

---

## 1. Why React needs both a scheduler and lanes

*Prereqs: from the rendering guide, the work loop (React processes the tree in units of work) and concurrent rendering, recapped here. Outside React: nothing yet.*

**The itch.** You know React 18 and later can render "concurrently," keeping the UI responsive during heavy updates. But "concurrent" is doing a lot of work in that sentence, and underneath it are two distinct mechanisms with confusing names: the *scheduler* and *lanes*. They sound like the same thing (both about priority and timing), and it is hard to keep straight which does what. Separating them is the first step to understanding any of it.

**The short version.** Responsive rendering requires answering two different questions, and React has a separate mechanism for each. *When* should React do a chunk of work, and when should it pause to let the browser paint and handle input? That is the **scheduler**: it slices work into chunks and yields to the browser between them. *Which* pending work should React do first, and which can wait? That is **lanes**: a priority system that tags every update with an urgency. The scheduler answers "when," lanes answer "which," and concurrent rendering is the two working together: render the highest-priority lanes, in interruptible chunks, yielding to the browser as you go.

**How it actually works.**

Recall from the rendering guide that React processes a render as a *work loop*: it walks the fiber tree (React's internal tree of component instances) doing a small unit of work at each fiber, building up the new tree. The crucial property of concurrent rendering is that this loop is *interruptible*: React can do some units of work, pause, let the browser do other things, and resume later, rather than processing the whole tree in one uninterruptible burst. Making that work well requires solving two problems that are genuinely separate, and conflating them is what makes this topic confusing.

**Problem one: when to work and when to yield.** If React does too much work at once, it blocks the browser's main thread, and the user sees jank (input does not respond, animations stutter, paint is delayed). So React must do a little work, then *yield* to the browser so it can paint and handle input, then resume. This requires a mechanism that can schedule a chunk of work to run, measure how long it has been running, decide when to stop and yield, and arrange to be called again to continue. That mechanism is the **scheduler** (Sections 3 and 4). Its job is purely about *time*: slicing work into chunks that fit in the browser's frame budget and cooperating with the browser's event loop. The scheduler does not know or care *what* the work is; it just runs callbacks, times them, and yields.

**Problem two: which work to do first.** At any moment, there may be several pending updates of different urgency: a click the user is waiting on, a low-priority transition rendering a big list, a Suspense retry, a background idle update. React must do the urgent ones first and let the less urgent ones wait, and it must be able to *interrupt* a low-priority render in progress when a high-priority update arrives. This requires a way to *label* each update with a priority and to compare and combine those labels efficiently. That mechanism is **lanes** (Sections 5 and 6). Its job is purely about *priority*: tagging updates, choosing the highest-priority pending set to render, and tracking which updates are pending where in the tree. Lanes do not know or care about *timing*; they just rank work.

Concurrent rendering is these two mechanisms composed. When an update happens, lanes assign it a priority (Section 7). React asks lanes which pending work is most urgent (Section 8) and starts rendering that batch. It renders in the work loop, and between units of work it asks the scheduler "should I yield?" (Section 4); if the time slice is exhausted, it yields to the browser and the scheduler arranges to resume. If a higher-priority update arrives while a lower-priority render is in progress, lanes notice the higher priority and React can throw away the in-progress low-priority render and start the high-priority one. So lanes decide *what* to render and *whether to interrupt*, while the scheduler decides *when to pause and resume*. Neither alone is enough: lanes without the scheduler could prioritize but would still block the main thread doing a big render; the scheduler without lanes could yield but would have no basis for doing urgent work first or interrupting.

Keeping this division clear is the single most useful thing for the rest of the guide. Every later section is about one side or the other: Sections 2 through 4 are the scheduler (the "when"), Sections 5 through 11 are lanes (the "which"), and Section 12 is about how the two priority systems (the scheduler's own and the reconciler's lanes) connect at their boundary. When something is confusing, ask "is this about timing/yielding (scheduler) or about priority/which-work (lanes)?" and it usually resolves.

> **Try it.** This one is conceptual: take a feature where you used `useTransition` and write down which of its behaviors are about *when* (the render happening in interruptible chunks, the UI staying responsive) versus *which* (the transition update being lower priority than the click that triggered it, so the click wins). Sorting those two apart for a real case is the mental split this whole guide rests on.

**You've got this if** you can state, in one sentence each, what the scheduler is responsible for and what lanes are responsible for, and why responsive rendering needs both.

---

## 2. The problem: blocking renders and cooperative scheduling

*Prereqs: Section 1. Outside React: the browser's single main thread, the roughly 16ms-per-frame budget for 60fps, and that long-running JavaScript blocks painting and input.*

**The itch.** Before concurrent rendering, a big update (filtering a huge list, rendering a deep tree) would freeze the page: typing lagged, animations stuttered, clicks did not register until the render finished. You may have felt this and "fixed" it with debouncing or memoization. The root cause is that a synchronous render runs to completion on the one main thread, and the cure is cooperative scheduling: do a little, yield, repeat.

**The short version.** The browser has a single main thread that does everything: running your JavaScript, handling input, laying out, and painting. If React renders synchronously and the render takes longer than a frame (roughly 16ms for 60fps), it monopolizes the main thread for that whole time, during which the browser cannot paint or respond to input, so the page janks or freezes. Cooperative scheduling is the fix: instead of rendering in one uninterruptible burst, React does a small slice of work, *yields* the main thread back to the browser so it can paint and handle input, then resumes the render. This is what makes a render *interruptible*, and it is the entire reason the scheduler exists.

**How it actually works.**

The constraint is the browser's architecture: there is one main thread, and it is shared by everything visible and interactive. In a single frame (the browser aims for about 60 frames per second, so roughly 16 milliseconds per frame), the main thread may need to run your JavaScript, process user input (clicks, key presses), recalculate layout, and paint pixels. If any one task hogs the thread for longer than the frame budget, everything else waits: a 50-millisecond render means about three frames where nothing paints and no input is handled, which the user perceives as a freeze or jank.

Before concurrent rendering, React rendered *synchronously*: when an update happened, React walked the entire affected tree, computed the changes, and committed them, all in one uninterruptible run. For small updates this is fine (it finishes within a frame). For large updates (a big list, a deep tree, expensive components) it exceeds the frame budget and blocks the main thread for the whole render, and there is no way to pause it partway to let an urgent click through or to paint an animation frame. The stack-based reconciler simply could not stop in the middle. This is the jank that debouncing and memoization were partial workarounds for: they reduced *how often* or *how much* React rendered, but they could not make a necessary large render non-blocking.

Cooperative scheduling solves this by changing rendering from "run to completion" to "run in interruptible slices." The model, borrowed conceptually from cooperative multitasking, is:

1. Do a small amount of work (some units of work in the fiber work loop).
2. Check whether you have used up your time slice (Section 4, roughly 5 milliseconds).
3. If you have, *yield*: stop, hand the main thread back to the browser so it can paint, handle input, and run other tasks, and arrange to be called again to continue.
4. When called again, resume where you left off and repeat.

This requires the work to be *resumable* (you can stop after any unit and pick up later), which is exactly what the fiber architecture provides (the rendering guide): the work-in-progress tree is built incrementally, and React tracks where it is, so it can pause and resume. And it requires a mechanism to schedule the chunks, time them, and arrange resumption, which is the scheduler.

The word "cooperative" is important and worth dwelling on. React cannot *force* the browser to give it time, and the browser cannot *force* React to stop; instead React *voluntarily* yields when its time slice is up, cooperating with the browser's event loop. This is unlike preemptive multitasking (where an OS can forcibly interrupt a thread); JavaScript on the main thread cannot be preempted, so React has to cooperate by checking the clock and choosing to yield. That choice (when to yield) is the scheduler's "when" from Section 1, and the next two sections are how the scheduler implements it: a priority queue of work (Section 3) and a yield-and-resume loop built on the browser's event loop (Section 4).

The payoff, once this works, is that a large render no longer freezes the page. React renders the big list in 5-millisecond slices, yielding between them, so the browser paints and handles input in the gaps, and the user keeps typing and clicking smoothly while the render proceeds in the background. And because the render is now interruptible, React can also *abandon* an in-progress low-priority render when something more urgent arrives (Section 1), which is the other half of concurrency that synchronous rendering could never do.

> **Try it.** In the browser's Performance panel, record an interaction in an app that does a heavy synchronous update (or an old React 17 app) and find the long task: a single uninterrupted block on the main thread longer than 16ms, with no paint inside it. Then record a concurrent React app doing similar work with a transition and look for the main thread broken into smaller slices with paints in between. Seeing the long block versus the sliced work is seeing the problem and the fix.

**You've got this if** you can explain why a synchronous render longer than a frame freezes the page, and what "cooperative scheduling" means in terms of yielding the main thread.

---

## 3. The scheduler: a priority queue with time slicing

*Prereqs: Sections 1 and 2. Outside React: a priority queue / min-heap (a structure that always gives you the highest-priority item efficiently), and the idea of a callback scheduled to run later.*

**The itch.** React talks about "the scheduler" as if it were a thing. It is: a separate package with its own logic for running work by priority and yielding to the browser. Knowing it is its own component, with its own (different) priority levels from lanes, clears up a lot of confusion about why there seem to be two priority systems.

**The short version.** React's scheduler lives in a separate package (`scheduler`) and is a small, general-purpose cooperative task runner. It maintains a priority queue of callbacks (tasks), each with one of five priority levels (Immediate, UserBlocking, Normal, Low, Idle), and it runs them highest-priority first, yielding to the browser between chunks of work. Each priority level has a *timeout*; the scheduler orders tasks by their resulting expiration time in a min-heap, so the most urgent (soonest-expiring) task runs first. It is deliberately generic: it knows nothing about React, lanes, or fibers; it just runs prioritized callbacks cooperatively.

**How it actually works.**

The scheduler is genuinely a separate package, `scheduler`, that React depends on. This separation is intentional: the scheduler is a general-purpose cooperative scheduling primitive that is not React-specific, and keeping it separate keeps its concerns (timing, yielding, task ordering) cleanly apart from React's concerns (fibers, lanes, reconciliation). It is also why there are *two* priority systems in play (the scheduler's own levels and React's lanes), which Section 12 reconciles; the scheduler has its own priorities precisely because it is designed to be usable independent of React's lane model.

The scheduler's core is a priority queue of *tasks*, where a task is a callback plus a priority. You hand the scheduler a callback and a priority via `scheduleCallback` (internally `unstable_scheduleCallback`), and the scheduler arranges to run it cooperatively. There are five priority levels, in order of urgency:

- **ImmediatePriority**: must run synchronously, as soon as possible (a timeout of -1, effectively already expired). Used for the most urgent, blocking work.
- **UserBlockingPriority**: the user is actively waiting (a timeout around 250ms). Used for things like input where a short delay is acceptable but a long one is not.
- **NormalPriority**: ordinary work that should happen reasonably soon (a timeout around 5 seconds).
- **LowPriority**: work that can wait a while (a timeout around 10 seconds).
- **IdlePriority**: work that need never happen urgently (no timeout; runs only when there is nothing else to do).

The way priority becomes ordering is through *timeouts*. When you schedule a task, the scheduler computes an *expiration time* for it: `expirationTime = currentTime + timeout`, where the timeout comes from the priority level. So an ImmediatePriority task expires immediately (it is already past due), a UserBlockingPriority task expires in 250ms, a NormalPriority task in 5 seconds, and so on. The scheduler keeps tasks in a *min-heap* (the `SchedulerMinHeap`, Section 14) ordered by expiration time, so the task with the *soonest* expiration time is always at the top and runs first. This is elegant: priority and starvation prevention are unified into one number (the expiration time). A high-priority task naturally has a soon expiration time and runs first; but a low-priority task, as real time passes, gets closer to its expiration time and eventually becomes the soonest-expiring task, so it cannot be starved forever (it will run once enough time passes). The min-heap gives O(log n) insertion and O(1) access to the most urgent task, which keeps scheduling cheap even with many tasks.

The scheduler's run loop, in outline (Section 4 details the yielding): it takes the most urgent task from the heap, runs its callback, and keeps running tasks until either the heap is empty or its time slice is exhausted, at which point it yields to the browser and arranges to resume. A subtlety that matters for React's interruptible rendering: a task callback can return *another function*, which the scheduler interprets as "this task is not finished; here is its continuation." So when React's render work loop yields partway through (because the time slice ran out, Section 4), it returns a continuation, and the scheduler reschedules it to resume after yielding. This return-a-continuation mechanism is how a long React render is spread across many scheduler slices: each slice runs until `shouldYield` says stop, returns a continuation, yields, and is resumed.

So the scheduler is a compact, general thing: a min-heap of timeout-ordered tasks, a loop that runs them most-urgent-first, a time-slice check that makes it yield, and a continuation mechanism that lets a long task be resumed across many slices. It solves the "when" from Section 1 (when to run a chunk, when to yield, when to resume) without knowing anything about what the chunks are. React uses it by scheduling its render work as a task at a priority derived from the lanes being rendered (Section 12), and letting the scheduler run that work cooperatively.

> **Try it.** Conceptually, map the five scheduler priorities to kinds of React work: a click handler's update (urgent, UserBlocking-ish), a transition (lower), a prefetch or idle update (Idle). You will not call the scheduler directly, but recognizing that React translates a lane into one of these five scheduler priorities (Section 12) when it schedules its render is the connection to internalize.

**You've got this if** you can explain how the scheduler turns a priority into ordering (via a timeout and expiration time in a min-heap), and why a task returning a continuation function lets a long render span many slices.

---

## 4. The MessageChannel work loop and shouldYield

*Prereqs: Section 3. Outside React: the browser event loop (macrotasks versus microtasks), that `setTimeout(fn, 0)` is clamped to a minimum of about 4ms, that microtasks run before paint, and that `requestIdleCallback` fires only when the browser is idle.*

**The itch.** "React yields to the browser" sounds simple, but *how*? It cannot just `setTimeout`, and it cannot use a microtask, and `requestIdleCallback` turns out to be unreliable. The actual mechanism is a clever use of `MessageChannel`, and the time slice is about 5 milliseconds. Knowing this makes the Performance panel traces (work chopped into ~5ms slices) suddenly legible.

**The short version.** To yield and resume, the scheduler needs to run a chunk of work, hand control back to the browser so it can paint and handle input, and then get called again to continue, all as fast as possible. It does this with a `MessageChannel`: after a chunk, it posts a message to itself, which the browser delivers as a *macrotask* after it has had a chance to paint and process input, and that message handler runs the next chunk. It uses `MessageChannel` rather than `setTimeout` (which is clamped to a 4ms minimum) or a microtask (which runs *before* paint, defeating the yield) or `requestIdleCallback` (too infrequent and unreliable). The time slice is about 5 milliseconds: `shouldYield` returns true once a chunk has run that long, prompting a yield.

**How it actually works.**

This section is the mechanical heart of the "when," and it is a nice piece of engineering once you see the constraints. The scheduler needs a way to say "I have done a chunk of work; browser, please take over and paint and handle input, then call me back to continue." The naive options all fail for specific reasons:

- **`setTimeout(fn, 0)`** seems like "run after yielding," but browsers *clamp* nested `setTimeout` calls to a minimum of about 4 milliseconds. So yielding via `setTimeout(fn, 0)` would impose a roughly 4ms delay on every single slice, which across a long render adds up to a large, pointless slowdown. Too slow.
- **A microtask** (a promise callback) runs *before* the browser gets to paint (microtasks drain at the end of the current task, before rendering). So yielding via a microtask would hand control back to React before the browser painted, completely defeating the purpose of yielding (which is to let the browser paint and handle input). Wrong timing.
- **`requestIdleCallback`** fires only when the browser judges itself idle, which is unpredictable and can be infrequent (it may not fire for long stretches under load). React tried this in early versions and found it too unreliable for driving rendering: work could be starved waiting for idle time that never came. Too unreliable.
- **`requestAnimationFrame`** is tied to the paint cadence (about 16ms) and is for work that should happen right before a paint, not for "yield as soon as the browser has had a turn." Wrong granularity for time slicing.

The mechanism React settled on is **`MessageChannel`**. A `MessageChannel` gives you two ports; posting a message on one port causes a `message` event to fire on the other port, and the browser delivers that `message` event as a *macrotask*. Crucially, a macrotask runs *after* the browser has had the opportunity to paint and handle input (unlike a microtask), and it is delivered *promptly* (unlike `setTimeout`'s 4ms clamp, a `MessageChannel` message is delivered as soon as the browser is ready, with no artificial delay). So the scheduler sets up a `MessageChannel` once, and its loop (`performWorkUntilDeadline` in the source, Section 14) works like this:

1. Record a deadline: `deadline = now + yieldInterval`, where `yieldInterval` is about 5 milliseconds.
2. Run scheduled work (run tasks from the heap, or run React's render work loop), repeatedly, checking after each unit whether `now >= deadline`.
3. When the deadline is reached (the 5ms slice is used up) but there is still work to do, stop and `port.postMessage(null)` to schedule the next chunk as a macrotask, then return, yielding the main thread.
4. The browser now does its thing (paints, handles input, runs other tasks), and then delivers the `message` event, which calls `performWorkUntilDeadline` again, resuming at step 1 for the next 5ms slice.

So the work proceeds in roughly 5-millisecond slices with browser turns in between, and `MessageChannel` is what makes each yield both correctly-timed (after paint, because it is a macrotask) and prompt (no 4ms clamp). If `MessageChannel` is unavailable in some environment, the scheduler falls back to `setTimeout`, accepting the clamp.

The other half is **`shouldYield`** (`shouldYieldToHost` in the source), the function React's render work loop calls between units of work to decide whether to keep going or stop and yield. Its core check is time-based: has the current slice been running for at least the yield interval (about 5ms)? If so, `shouldYield` returns true, the work loop breaks, and the scheduler yields via the `MessageChannel` mechanism above. This is the literal connection between the rendering guide's work loop and the scheduler: the work loop (`workLoopConcurrent`) does a unit of work, calls `shouldYield()`, and stops if it returns true, which is how an interruptible render actually interrupts. (Modern versions of `shouldYield` also factor in input pending where supported, so React can yield even sooner if there is pending user input, but the baseline is the 5ms time slice.)

Put together: React renders in the work loop, doing units of work and checking `shouldYield` after each; when about 5ms have elapsed, it yields by posting a `MessageChannel` message; the browser paints and handles input; the message handler resumes the render for another 5ms slice; and this repeats until the render finishes. That sliced, yield-between-chunks pattern is exactly what you see in a Performance panel trace of a concurrent render: the main thread chopped into roughly 5ms pieces with paints and input handling in the gaps. The "when" of Section 1 is, concretely, this 5ms-slice MessageChannel loop.

> **Try it.** Build a component that renders a few thousand moderately expensive items, update it inside a `startTransition`, and record the Performance panel. Look for the render work split into slices of roughly 5ms with gaps in between, rather than one long block. Then look at the same update *without* `startTransition` (synchronous) and see one long task instead. The presence or absence of the 5ms slicing is the scheduler's yield loop, visible.

**You've got this if** you can explain why the scheduler yields with `MessageChannel` rather than `setTimeout`, a microtask, or `requestIdleCallback`, and what `shouldYield` checks.

---

## 5. Lanes: the bitmask model

*Prereqs: Section 1. Outside React: bitwise operations on integers (AND `&`, OR `|`, XOR `^`), and that a single integer can represent a set of flags, one per bit.*

**The itch.** You have read that React uses "lanes" for priority and that a lane is "a bit in a bitmask." That sounds like trivia until you ask *why* bits, and the answer turns out to explain a lot: React needs to represent and manipulate *sets* of priorities cheaply, and bitmasks make set operations single CPU instructions. This is the model that replaced the older expiration-time number.

**The short version.** A lane is a single bit in a 31-bit bitmask (stored in a 32-bit integer; 31 usable because JavaScript treats the top bit as a sign in bitwise operations). Each bit position is a distinct priority or category of work. A *set* of lanes is just an integer with those bits set, called `Lanes`. React uses bits because it constantly needs to operate on *sets* of priorities (which lanes are pending on this fiber, is this update's lane part of the batch being rendered, what is the highest-priority pending lane), and bitwise operations do those set operations (union, intersection, membership, subset) in single, O(1) instructions. This replaced the older model where each update had a single expiration-time number, which could not represent multiple distinct priorities at once.

**How it actually works.**

Start with what a lane *is*, precisely. React reserves a 32-bit integer to represent priority, and treats each *bit position* in that integer as a distinct "lane." A single lane is an integer with exactly one bit set, like `0b0000000000000000000000000000001` (the lowest bit) or `0b1000000000000000000000000000000` (a high bit). A *set* of lanes (called `Lanes`, plural, in the source) is an integer with possibly several bits set, representing several priorities at once. There are **31** usable lanes, not 32: although the integer is 32 bits, JavaScript's bitwise operators treat numbers as *signed* 32-bit integers, so the top (32nd) bit is the sign bit and using it would make the value negative and break the comparisons, so React uses 31 bits. The React 18 working group put it directly: there are 31 levels of granularity because that is how many fit in a single bitmask.

Now the crucial question: why bits, rather than (say) a simple priority number from 1 to 31? Because React's scheduling logic is constantly doing *set operations on priorities*, and bitmasks make those operations single instructions:

- **Membership / is-this-lane-in-this-set:** is this update's lane part of the batch currently being rendered? That is a bitwise AND: `(updateLane & renderLanes) !== 0`. One instruction, regardless of how many lanes are involved.
- **Union / add a lane to a set:** mark a lane as pending alongside others. Bitwise OR: `pendingLanes | newLane`. One instruction.
- **Removal / mark a lane as handled:** clear a lane from the pending set. Bitwise AND with NOT: `pendingLanes & ~finishedLanes`. One instruction.
- **Subset / does this set contain any of these lanes:** again a bitwise AND and a zero check.
- **Highest-priority lane in a set:** isolate the lowest set bit with the bit trick `lanes & -lanes` (two's complement makes this isolate the rightmost 1 bit), which gives the highest-priority lane in O(1).

This matters because of *where* React does these operations: constantly, all over the reconciler, on the hot path of every render. Every fiber carries a `lanes` field (the updates scheduled directly on it) and a `childLanes` (often called `subtreeLanes`) field (the union of all lanes pending anywhere in its subtree). During the work loop, when React reaches a fiber, it can check `(fiber.childLanes & renderLanes) !== 0` to decide in one instruction whether there is any work *in this subtree* matching the lanes being rendered, and if not, *skip the entire subtree* (a bailout, from the rendering guide). That subtree-skipping check happens at every fiber, so it must be a single cheap operation, and a bitwise AND is exactly that. A priority *number* could not do this: you cannot represent "this subtree has pending work at priorities 3 and 7 and 12" in a single number you can AND against, but you can in a bitmask. The need to represent and test *sets* of pending priorities, cheaply, at every node, is the whole reason for bits.

This bitmask model *replaced* an older approach. Before lanes (in React 16's experimental concurrent work), each update had a single `expirationTime` number, and priority was "the longer an update has waited, the higher its priority," compared by number. That model worked for a single linear notion of priority but could not express *multiple distinct, simultaneous* priorities or the kind of set operations above. The classic problem it could not handle well was different *kinds* of work needing to be in separate "streams" that do not block each other (an urgent update and an in-progress transition and a Suspense retry all pending at once, each needing independent tracking). Lanes replaced the single expiration number with a bitmask precisely to represent many independent priorities at once and operate on them as sets, which is what concurrent rendering, transitions, and Suspense all need. (Lanes did not throw away expiration entirely; they kept an expiration mechanism for starvation prevention, Section 9, but the *representation* changed from a number to a bitmask.)

So the one-sentence model: a lane is a bit, a set of lanes is an integer, and React uses bits because scheduling is fundamentally about cheap set operations on priorities, performed constantly and at every fiber. The next section is the actual layout of which bit means what.

> **Try it.** In a console, play with the bit operations React uses: let `renderLanes = 0b011` and `updateLane = 0b001`, and confirm `(updateLane & renderLanes) !== 0` is true (the update is in the batch), while `0b100 & 0b011` is `0` (not in the batch). Then try `lanes & -lanes` on `0b0110` and see it isolate `0b0010` (the lowest set bit, the highest-priority lane). Feeling the set operations as single expressions is the point of the model.

**You've got this if** you can explain why React represents priority as a bitmask rather than a number, in terms of needing cheap set operations (union, membership, subset) on priorities at every fiber.

---

## 6. The lane layout: from Sync to Idle

*Prereqs: Section 5. Outside React: that lower bit positions are smaller numbers; nothing else.*

**The itch.** You know lanes are bits, but which bit is which? When does React use `SyncLane` versus a transition lane versus `IdleLane`? The layout is not arbitrary: the bit positions are ordered by priority, and knowing the main lanes (and that there is a *range* of transition lanes) makes the rest of the system concrete.

**The short version.** The lanes are laid out from highest priority (lowest bits) to lowest priority (highest bits). The main ones, in order: `SyncLane` (the lowest bit, most urgent, for discrete events and synchronous work), `InputContinuousLane` (continuous events like mousemove), `DefaultLane` (ordinary updates), a *range* of `TransitionLanes` (many bits, for `useTransition` work, spread across several lanes so distinct transitions can be tracked separately), `RetryLanes` (Suspense retries), `IdleLane`, and `OffscreenLane` (the highest bit, for hidden/Activity content). Lower bit position means higher priority, which is why `SyncLane` is bit 1 and idle work is near the top.

**How it actually works.**

The lane constants are defined in `ReactFiberLane.js` (Section 14) as specific bit patterns, and their *order* encodes priority: the convention is that **lower bit positions are higher priority**. So the lanes, roughly from most to least urgent:

- **`SyncLane`** (`0b0000000000000000000000000000001`, the lowest bit): the highest priority, for synchronous and discrete-event work. This is the lane a click or keypress's update gets (Section 7), the work that must feel instant. Work in `SyncLane` is effectively rendered synchronously (it does not get time-sliced and yielded the way lower-priority work does, because there is no benefit to deferring the most urgent work).
- **`InputContinuousLane`** (a slightly higher bit): for continuous events like `mousemove`, `scroll`, and `drag` (the continuous-priority events from the Event System guide). Urgent, but below discrete clicks.
- **`DefaultLane`**: for ordinary updates that did not come from a specific event priority or a transition (for example, an update from a `setTimeout` or a network response, in the default context).
- **`TransitionLanes`** (a *range* of consecutive bits, not a single lane): for updates marked as transitions via `useTransition` or `startTransition`. There are *several* transition lanes rather than one, so React can assign different transitions to different lanes and track them separately (so two unrelated transitions do not have to render in the same batch). React cycles through the available transition lanes as transitions are scheduled. These are low priority and interruptible, which is the whole point of a transition.
- **`RetryLanes`** (another range): for Suspense retries, when a suspended boundary is retrying after its data resolves.
- **`IdleLane`**: very low priority work that should happen only when there is nothing more important to do.
- **`OffscreenLane`** (the highest usable bit): the lowest priority, used for offscreen and `<Activity>` (hidden) content that React can pre-render or keep rendering in the background without affecting visible work.
- **`NoLane` / `NoLanes`** (`0`): the absence of any lane, used as a "no work" sentinel.

A couple of structural points that make this concrete. First, the reason some categories (transitions, retries) are *ranges* of lanes rather than single lanes is to allow *independent tracking* of multiple things of the same kind. If there were one transition lane, all transitions would always render in the same batch and could not be distinguished; with a range, React can put distinct transitions in distinct lanes and handle them separately, which matters for correctness and for not letting one slow transition block an unrelated one. Second, the highest-priority lane in a set is the *lowest set bit*, which is why React isolates it with `lanes & -lanes` (Section 5): given a set of pending lanes, the most urgent one is the rightmost 1, and that bit trick extracts it in one operation. So the layout (low bits = high priority) and the bit trick (lowest set bit = highest priority) are designed together.

This layout is the bridge to the Event System guide. There, events were classified as discrete, continuous, or default, with priorities feeding "the lanes." Now you can see the actual targets: a discrete event's update gets `SyncLane` (or a discrete priority that maps to it), a continuous event's update gets `InputContinuousLane`, and a default-context update gets `DefaultLane`. The event priority from that guide is, concretely, *which of these lanes* the resulting update is assigned (Section 7). And the user-facing concurrency hooks target specific lanes: `useTransition` puts its update in a `TransitionLane`, which is why transition work is low-priority and interruptible (Section 11).

You will never type these constants in application code, but knowing the layout makes the rest of the system legible: when you read that an update was "scheduled at `DefaultLane`" or "this is a transition lane," you know exactly where it sits in the priority order and therefore how urgently React will treat it.

> **Try it.** Map your everyday React actions to lanes: a button click (`SyncLane`), dragging a slider (`InputContinuousLane`), a `setState` in a `fetch().then()` (`DefaultLane`), an update wrapped in `startTransition` (a `TransitionLane`). Writing out that mapping for a real component connects the abstract lanes to the concrete things you do, which is how the layout becomes intuition.

**You've got this if** you can name the main lanes in priority order and explain why transitions and retries occupy a *range* of lanes rather than a single one.

---

## 7. Assigning a lane: from event priority to a bit

*Prereqs: Sections 5 and 6, plus the Event System guide on event priority (discrete versus continuous, Section 8). From the Hooks guide: `setState` enqueues an update, and `useTransition`. Outside React: nothing new.*

**The itch.** You call `setState`, and somehow the resulting update ends up with the right priority: urgent if it came from a click, low if it came from a transition. Where does that assignment happen, and how does React know? It happens at the moment of the update, based on the current context, and it is the concrete link between the Event System guide and this one.

**The short version.** When an update is created (a `setState` or `dispatch`), React assigns it a lane based on the *current execution context*, in a function called `requestUpdateLane`. If React is inside a transition (`startTransition`), the update gets a transition lane. Otherwise, if there is a current event priority (set by the event system when it dispatched the event, per the Event System guide), the update gets the lane matching that priority (a discrete event gives `SyncLane`, a continuous event gives `InputContinuousLane`). Otherwise it gets `DefaultLane`. So the lane is determined by *what is happening when the update is scheduled*, which is how a click's update becomes urgent and a transition's update becomes low priority.

**How it actually works.**

Recall from the Hooks guide that `setState` does not render immediately; it enqueues an update on the fiber's update queue and asks React to schedule work. Part of "enqueuing the update" is deciding *which lane* the update belongs to, and that decision is made by `requestUpdateLane` (in the reconciler), called at the moment the update is created. Its logic is a priority-ordered series of checks against the current execution context:

1. **Are we inside a transition?** If the update is being scheduled inside a `startTransition` callback (or from a `useTransition`), React assigns it one of the **transition lanes** (Section 6). React tracks a "current transition" and picks a transition lane for it (cycling through the range so distinct transitions can get distinct lanes). This is how `startTransition` makes its updates low-priority and interruptible: the lane it assigns is a low-priority transition lane, and everything downstream (Sections 8 through 11) treats that lane as deferrable.

2. **Is there a current event priority?** If not in a transition, React checks the *current event priority*, a value the event system sets while it is dispatching an event (the Event System guide, Section 8, where discrete events get the highest priority and continuous events a lower one). React reads that priority and assigns the matching lane: a discrete event priority maps to `SyncLane` (urgent), a continuous event priority maps to `InputContinuousLane`, and so on. This is the concrete mechanism behind the Event System guide's claim that "a `setState` in an `onClick` is high priority": the event system, while dispatching the click, set the current event priority to discrete, and `requestUpdateLane`, running inside your handler when you call `setState`, reads that and assigns `SyncLane`. The event guide set the priority; this guide is where that priority becomes a lane.

3. **Otherwise, `DefaultLane`.** If there is no transition and no specific event priority (for example, an update scheduled from a `setTimeout`, a promise resolution, or other code not running inside a React-dispatched event), the update gets `DefaultLane`, ordinary priority.

So the lane is a function of *context at update time*: transition context wins (low priority, deferrable), then event context (urgent or continuous depending on the event), then default. The update carries this lane with it into the update queue, and from there the lane drives everything: which batch the update renders in (Sections 8 and 11), whether it can be interrupted, and whether it gets time-sliced or rendered synchronously (Section 6, `SyncLane` work is effectively synchronous).

This is also the precise mechanism behind the concurrency hooks from the Hooks guide. `useTransition`'s `startTransition` works by setting the transition context so that updates scheduled inside it hit check 1 and get a transition lane, which is *lower* priority than the discrete lane the surrounding click would otherwise give them. That is why, in the typeahead example from the Hooks and Performance guides, the input update (urgent, `SyncLane` from the click/keypress) and the results update (wrapped in `startTransition`, so a transition lane) get *different* lanes, and React can render the urgent input update first and interrupt or defer the results update. The "mark this update as non-urgent" of `useTransition` is, mechanically, "assign this update a transition lane instead of the event's lane," and `requestUpdateLane` is where that assignment happens.

Once the update has a lane and is enqueued, React calls `ensureRootIsScheduled` (Section 8 and 12), which makes sure the root has scheduled a render at an appropriate priority with the scheduler. So the flow from the last few guides connects here: an event fires (Event System guide), its dispatch sets the current event priority (Event System guide, Section 8), your handler calls `setState`, `requestUpdateLane` reads the context and assigns a lane (this section), the update is enqueued (Hooks guide), and the root schedules a render at that lane's priority (Sections 8 and 12). The lane is the thread connecting the event to the eventual render.

> **Try it.** Build a component where a button's `onClick` does two `setState` calls, one directly (urgent) and one wrapped in `startTransition` (transition). With the Profiler or by reasoning, recognize that the two updates get different lanes (`SyncLane`-ish versus a transition lane) even though they are in the same handler, which is why the direct update commits urgently and the transition update can be deferred. That split is `requestUpdateLane`'s context checks in action.

**You've got this if** you can explain how a single `setState` ends up with the right lane based on whether it is inside a transition, an event, or neither, and how this connects the Event System guide's event priority to a concrete lane.

---

## 8. Choosing what to render next: getNextLanes

*Prereqs: Sections 5, 6, and 7. Outside React: nothing new.*

**The itch.** At a given moment, a root may have several pending lanes (an urgent update, a transition, a retry). React has to pick which set to render *now*. How does it choose, and why does it sometimes render an urgent update and leave a transition for later (or interrupt the transition)? That choice is `getNextLanes`.

**The short version.** A root tracks all its *pending* lanes (every lane with scheduled-but-not-yet-rendered work) in a bitmask. Before each render, React calls `getNextLanes` to choose which lanes to render in this pass: in general, the highest-priority pending lanes (the lowest set bits), with adjustments for expiration (Section 9) and entanglement (Section 10). React then renders *that* set of lanes (`renderLanes`), and any update whose lane is in the set is included; the rest wait. If a higher-priority update arrives mid-render, `getNextLanes` on the next scheduling pass will pick the higher priority, and React can interrupt the lower-priority render to do it.

**How it actually works.**

A React root carries a `pendingLanes` bitmask: the union of every lane that has scheduled work not yet rendered (Section 5's union operation keeps this updated as updates are enqueued). When React is ready to render (the scheduler runs the root's work, Section 12), it must decide *which* lanes to render in this pass, because it does not necessarily render all pending lanes at once; it renders a *batch*, chosen by priority. That decision is `getNextLanes(root, wipLanes)`.

The core of `getNextLanes` is "highest priority first," implemented with the bit operations from Section 5. Given the pending lanes, it selects the highest-priority subset to work on. "Highest priority" means the lowest set bits (Section 6's layout), extracted with the lowest-set-bit trick. So if a root has both `DefaultLane` work and a transition lane's work pending, `getNextLanes` picks the `DefaultLane` work (higher priority) for this render, leaving the transition for a later pass. This is how urgent work jumps ahead of less urgent work: it is selected first, every time React chooses what to render.

But `getNextLanes` is not purely "highest bit wins"; it makes two important adjustments, which are the subjects of the next two sections:

**Expiration (Section 9).** A lane that has been pending too long is *expired* and treated as urgent regardless of its nominal priority, so low-priority work cannot be starved forever. `getNextLanes` (with help from `markStarvedLanesAsExpired`) forces expired lanes into the batch. So the choice is "highest priority, but include anything that has waited too long."

**Entanglement (Section 10).** Some lanes must be rendered *together* for consistency. If `getNextLanes` selects a lane that is entangled with others, it pulls the entangled lanes into the batch too. So the choice is "highest priority, plus expired lanes, plus anything entangled with the selected lanes."

The result of `getNextLanes` is the `renderLanes` bitmask: the exact set of lanes this render pass will process. During the render (the work loop), this is what the per-fiber checks compare against: at each fiber, `(fiber.childLanes & renderLanes) !== 0` decides whether there is matching work in the subtree (Section 5), and an update is included in this render if and only if its lane is in `renderLanes`. Updates whose lanes are *not* in `renderLanes` are simply not processed this pass; they remain in `pendingLanes` and will be picked up in a future pass when `getNextLanes` selects them.

This is also the mechanism behind *interruption*, the defining feature of concurrent rendering. Suppose React is partway through rendering a transition (a low-priority `renderLanes`) when a click schedules a `SyncLane` update. The click's update is added to `pendingLanes`. The next time React goes to schedule or continue work, `getNextLanes` is consulted and now sees `SyncLane` pending, which is higher priority than the in-progress transition lanes. React can therefore *abandon* the in-progress transition render (throw away the partial work-in-progress tree) and start a new render at `SyncLane`, handling the urgent click first; the transition's lanes remain pending and get picked up again afterward. So "a higher-priority update interrupts a lower-priority render" is, concretely, `getNextLanes` selecting the higher-priority lanes on the next scheduling decision and React restarting the render at those lanes. The interruptibility from Section 2 (the work loop yielding via `shouldYield`) is what gives React the *opportunity* to re-check, and `getNextLanes` is what *decides* to switch to the more urgent work.

So `getNextLanes` is the "which work first" decision made concrete: highest-priority pending lanes, plus expired ones, plus entangled ones, producing the `renderLanes` for this pass, and re-evaluated at each scheduling decision so that urgent work can preempt less urgent work in progress.

> **Try it.** Reason through the typeahead case in lane terms: while a transition (transition lane) is rendering the results, you type again, scheduling a new urgent input update (`SyncLane`). On the next scheduling pass, `getNextLanes` sees `SyncLane` pending and selects it over the transition lanes, so React handles the keystroke first and the in-progress transition render is restarted. Tracing this in lanes is understanding how concurrency actually preempts.

**You've got this if** you can explain how `getNextLanes` chooses the render batch (highest priority, plus expired and entangled lanes) and how that enables a high-priority update to interrupt a low-priority render in progress.

---

## 9. Expiration: preventing starvation

*Prereqs: Section 8. Outside React: starvation (low-priority work never running because high-priority work keeps arriving), and the idea of a deadline.*

**The itch.** "Highest priority first" has an obvious danger: if urgent updates keep arriving, low-priority work (a transition, an idle update) could be deferred *forever* and never render. React must prevent that, and it does, with expiration times that eventually force stale low-priority work to run.

**The short version.** Pure "highest priority first" risks *starvation*: a steady stream of high-priority updates could keep a low-priority lane waiting indefinitely. React prevents this by giving each pending lane an *expiration time*. As real time passes, if a lane has been pending past its expiration, React marks it *expired*, and an expired lane is treated as urgent (synchronous) and forced into the next render batch regardless of its nominal priority. So low-priority work is deferred, but only up to a deadline, after which it is forced through. This is the same starvation-prevention idea as the scheduler's timeouts (Section 3), applied to lanes.

**How it actually works.**

The danger is inherent in priority scheduling. If React always renders the highest-priority pending lanes (Section 8), and high-priority updates keep arriving (a user typing continuously, frequent events), then a low-priority lane (a transition rendering a big list, an idle background update) might *never* be the highest priority, so it would be deferred again and again, forever. The user would see the urgent work happen but the low-priority work never complete. That is *starvation*, and any priority scheduler must guard against it.

React's guard is *expiration*. Each lane, when it first becomes pending, is assigned an *expiration time*: a point in real time by which it must be rendered. The expiration time is derived from the lane's priority (higher-priority lanes have sooner expiration times, lower-priority lanes have later ones, idle lanes effectively never expire). React tracks these per-lane expiration times on the root (in an array indexed by lane). Then, on each scheduling pass, before choosing the next lanes (Section 8), React runs `markStarvedLanesAsExpired(root, currentTime)`: it walks the pending lanes, and for any lane whose expiration time has passed (it has been waiting too long), it marks that lane as *expired* by adding it to the root's `expiredLanes` set.

An *expired* lane changes how it is treated. When `getNextLanes` (Section 8) chooses the render batch, expired lanes are forced in regardless of their nominal priority, and an expired lane is rendered *synchronously* (not time-sliced and interruptible like normal low-priority work). In effect, "you have waited too long" promotes a lane to urgent: React stops deferring it and pushes it through to completion in the next render, even if higher-priority work also exists. So a transition that would normally be interruptible and deferrable becomes, once expired, a synchronous render that finishes. This bounds the delay any update can experience: a lane is deferred only until its expiration time, never forever.

This is, conceptually, the same mechanism as the scheduler's timeout-based ordering (Section 3), applied at the lane level. There, each scheduler task got an expiration time from its priority, and the min-heap meant that as time passed, even a low-priority task eventually became the soonest-expiring and ran. Here, each lane gets an expiration time, and as time passes, a long-pending lane is marked expired and forced through. Both are the same idea: priority determines *initial* urgency, but elapsed time provides a *deadline* that prevents indefinite deferral. React uses this idea in both its scheduling layers because both layers face the same starvation risk.

It is worth connecting this to the history from Section 5. The *original* concurrent model (pre-lanes) used expiration time as the *entire* priority mechanism: an update's priority *was* its expiration time, and "the longer you have waited, the higher your priority" was the whole model. Lanes replaced that single-number model with a bitmask (for the set-operation reasons in Section 5), but they did *not* discard expiration; they kept it as the *starvation-prevention* layer on top of the bitmask priorities. So expiration went from being the primary priority mechanism to being the safety net that ensures the bitmask-priority scheduling cannot starve anything. The bitmask decides the *normal* order; expiration guarantees a *deadline* on that order.

The practical upshot you might observe: a low-priority transition that is being continually deferred because of constant urgent activity will, after its expiration window (related to its priority), suddenly render synchronously even if that causes a brief jank, because React has decided that finishing the stale work is now more important than continuing to defer it. That is expiration firing, trading a moment of responsiveness for a guarantee that work eventually completes. It is rarely visible in normal use (expiration windows are long enough that ordinary deferral resolves first), but it is the reason you can trust that no update is lost or deferred forever.

> **Try it.** This one is hard to force in a normal app (expiration windows are long), so reason it through instead: imagine a transition rendering a huge list while the user types continuously, scheduling urgent updates every few milliseconds. Without expiration, the transition would never render (always outranked). With expiration, after the transition's deadline passes, React marks its lane expired and forces it to render synchronously, completing it. That forced completion is the starvation guard.

**You've got this if** you can explain why "highest priority first" needs an expiration mechanism to avoid starvation, and what changes about a lane once it is marked expired.

---

## 10. Entanglement: lanes that must render together

*Prereqs: Sections 8 and 9. From the rendering guide: tearing (different parts of one render seeing different values), recapped here. Outside React: nothing new.*

**The itch.** Lanes let React render different updates in different batches, which is usually good. But sometimes splitting updates across batches would produce an *inconsistent* UI: two updates that logically belong together get separated, and the user sees a torn or half-applied state. React prevents this with entanglement, which forces certain lanes to render together.

**The short version.** Normally, updates in different lanes can render in separate batches (Section 8). But some updates *must not* be separated, because rendering them apart would show an inconsistent intermediate state. *Entanglement* is React marking a set of lanes as "these must render together": once any entangled lane is included in a render batch, all the lanes entangled with it are pulled into the same batch (`getNextLanes` enforces this, Section 8). React entangles lanes in specific situations, notably across transitions that share state and certain Suspense and `useDeferredValue` cases, to guarantee consistency. It is the counterweight to lanes' ability to split work: split for responsiveness, but entangle where splitting would break consistency.

**How it actually works.**

Lanes give React the power to render updates *separately*: an update in `DefaultLane` and an update in a transition lane can render in different passes, which is what lets urgent work jump ahead and transitions be deferred (Section 8). But this power is dangerous in one specific way: if two updates that logically must be applied *together* end up in different lanes and render in different batches, the user can see an inconsistent intermediate state, where one update has been applied and the related one has not. The concept from the rendering guide that captures the failure is *tearing*, recapped in one line: tearing is when a single visible UI reflects two different versions of state at once, because different parts were rendered against different values. Splitting related updates across batches is a way to produce a tear-like inconsistency.

*Entanglement* is React's mechanism to prevent that. To entangle two lanes is to declare "if either of these lanes is rendered, the other must be rendered in the same batch." React maintains an `entangledLanes` set (and per-lane entanglement information) on the root, and when `getNextLanes` (Section 8) selects a lane that is entangled with others, it includes all the entangled lanes in the `renderLanes` for that pass. So entangled lanes always render together, never split across passes, which guarantees that the related updates are applied atomically from the user's perspective.

React entangles lanes in several specific situations where splitting would break consistency:

- **Transitions that touch the same state.** When multiple transition updates are related (they participate in the same logical transition, or update overlapping state), React entangles their lanes so they render together rather than producing an intermediate state where one transition's effect is visible and the related one is not. This keeps a transition's resulting UI consistent.
- **`useDeferredValue` and certain concurrent patterns.** When a deferred value and the urgent value it derives from must stay consistent in specific ways, entanglement ensures the relevant lanes are not split in a way that would show an inconsistent pairing.
- **Suspense retries.** When a Suspense boundary retries (its data resolved and it re-renders), the retry lanes may be entangled with related work so the revealed content is consistent.
- **Refresh transitions and other cases** where the framework needs a set of updates to be treated atomically.

The general principle is the trade-off between *responsiveness* and *consistency*. Lanes default to allowing splitting, because splitting is what enables responsiveness (urgent work first, low-priority work deferred and interruptible). But unrestricted splitting could break consistency, so entanglement is the targeted exception: in the specific cases where rendering related updates apart would produce an inconsistent or torn UI, React entangles their lanes to force them together, accepting that those updates cannot be split (a small loss of scheduling flexibility) in exchange for a guarantee that the user never sees the inconsistent intermediate state. So the system is "split by default for responsiveness, entangle where splitting would break correctness."

This is the most internals-y of the lane mechanisms and the one you are least likely to interact with directly, but it completes the picture of why lanes are a *set* model (Section 5) rather than a single priority: React needs not only to track multiple independent priorities but also to express *relationships* between them ("these must go together"), and the bitmask plus an entanglement set is what represents both the independence (separate bits) and the required-togetherness (entanglement) of pending work. Without entanglement, lanes would be purely about priority; with it, they also encode consistency constraints.

> **Try it.** This is internals you mostly trust rather than poke at, so reason it through: imagine two related transition updates that, if rendered in separate batches, would briefly show a UI where one is applied and the other is not (an inconsistent intermediate). Entanglement forces them into one batch so that inconsistent frame never appears. Recognizing entanglement as "the consistency guard that limits splitting" is the goal; you will rarely manipulate it directly.

**You've got this if** you can explain why React sometimes forces different lanes to render together, in terms of preventing an inconsistent intermediate UI, and how that trades scheduling flexibility for consistency.

---

## 11. How lanes drive batching and the concurrent features

*Prereqs: Sections 7 and 8, plus the Hooks guide on `useTransition` and `useDeferredValue` (Section 15) and batching (Section 4). From the rendering guide: Suspense, recapped here.*

**The itch.** You use `useTransition`, `useDeferredValue`, automatic batching, and Suspense as features. This section closes the loop by showing they are all *the same lane machinery* viewed from the application side, so the user-facing behaviors stop being separate magic and become consequences of lanes.

**The short version.** The concurrent features you use are lanes in disguise. *Batching* is "updates in the same lane render in the same pass," so multiple `setState` calls that get the same lane fold into one render. *Transitions* (`useTransition`, `startTransition`) assign a low-priority transition lane, which is why they are deferrable and interruptible. *`useDeferredValue`* uses a lower-priority lane to render the deferred value, so the urgent value updates first. *Suspense retries* use retry lanes. So the application-level concurrency API is a set of friendly handles on the lane system from this guide.

**How it actually works.**

Each of the concurrent features maps directly onto the lane mechanics from the previous sections.

**Automatic batching is lanes plus the update queue.** From the Hooks and Event System guides, multiple `setState` calls in the same context batch into one render. In lane terms: those updates are all assigned the *same* lane (Section 7, because they share the same context, the same event priority or transition), so they all land in the same `pendingLanes` bit, and when `getNextLanes` selects that lane (Section 8), *all* of them are processed in that one render pass. "Updates in the same lane render together" (the working-group statement from Section 5: same lane means always in the same batch) is precisely what batching is. React 18's automatic-batching-everywhere is the consequence of assigning updates from promises, timeouts, and native handlers a lane (usually `DefaultLane`) the same way it does for event-handler updates, so they batch by the same lane mechanism rather than rendering immediately. So batching is not a separate feature bolted on; it is what naturally happens when updates share a lane.

**Transitions are a low-priority lane.** `useTransition` and `startTransition` work by assigning their updates a *transition lane* (Section 7, check 1 in `requestUpdateLane`). Everything that makes a transition feel like a transition follows from that lane being low priority: because it is lower priority than the discrete lane of the click or keypress that triggered the surrounding interaction, `getNextLanes` (Section 8) renders the urgent work first and defers the transition; because the transition lane is not `SyncLane`, the transition render is time-sliced and interruptible (Sections 2 through 4), so a new urgent update can preempt it; and `isPending` is true while the transition lane has pending work that has not yet committed. So "mark this update as non-urgent and keep the UI responsive" is, end to end, "put this update in a transition lane, which the scheduling machinery then defers, slices, and allows to be interrupted." The feature is a handle on the lane.

**`useDeferredValue` renders the deferred value at a lower priority.** When you derive a deferred value, React renders the update that produces the new deferred value at a *lower priority* lane than the urgent update that changed the source value. So the urgent value (the input you are typing) updates immediately at its high-priority lane, while the expensive work driven by the deferred value renders at a lower-priority lane that can be deferred and interrupted. It is the same lane mechanism as transitions, expressed as "let this value lag" rather than "mark this update." The lagging is the lower-priority lane being scheduled after the urgent one.

**Suspense retries use retry lanes.** When a component suspends (the rendering guide: it throws a promise because its data is not ready) and later its data resolves, React schedules a *retry* to re-render that boundary, and that retry is assigned a *retry lane* (Section 6). The retry lane's priority and its entanglement (Section 10) with related work govern when and how the revealed content renders, keeping it consistent. So Suspense's "show the fallback, then reveal the content when ready" has a lane-level implementation: suspend, schedule a retry lane when the promise resolves, render that lane.

The unifying picture is that the application-facing concurrency API is a small set of *handles* on the lane system. You do not assign lanes directly; you call `startTransition` (which assigns a transition lane), or `useDeferredValue` (which schedules a lower-priority lane), or you just write `setState` in an event (which gets the event's lane), or you use Suspense (which uses retry lanes). React translates each into a lane, and then the machinery from Sections 8 through 10 (choose the highest-priority pending lanes, force expired ones, render entangled ones together, time-slice and yield via the scheduler) does the rest uniformly. This is why the concurrent features compose so well: they are not separate systems, they are different ways of putting work into the *same* lane-based scheduler, which handles all of them by the same rules. Understanding lanes is understanding all of the concurrent features at once, because they are all lanes.

> **Try it.** Take a single component that uses two of these features (say, a transition for an expensive update and automatic batching of a couple of `setState` calls) and describe each feature's behavior purely in lane terms: which lane each update gets, which `getNextLanes` picks first, what gets batched because it shares a lane. Re-deriving the feature behavior from lanes is the test that the abstraction has become mechanism for you.

**You've got this if** you can explain `useTransition`, automatic batching, and `useDeferredValue` each as a specific use of the lane system, rather than as separate features.

---

## 12. Two priority systems: scheduler priorities versus lanes

*Prereqs: Sections 3 and 6. Outside React: nothing new.*

**The itch.** You have now met two priority systems: the scheduler's five levels (Immediate, UserBlocking, Normal, Low, Idle) and the reconciler's 31 lanes. They are clearly related but clearly different, and it is confusing that React has both. The reason is that they live in different layers, and there is a deliberate mapping between them.

**The short version.** React has two priority systems because it has two layers with different jobs. The **scheduler** (a generic package, Section 3) has its own five priority levels, because it is designed to schedule *any* work, not just React's. The **reconciler** has lanes (Section 6), a React-specific, finer-grained priority model tuned for rendering. They meet at the boundary where React asks the scheduler to run a render: React takes the lanes it is about to render, derives an *event priority* from them, maps that to one of the scheduler's five priority levels, and schedules the render task at that level. So lanes are the detailed, internal priority; the five scheduler levels are the coarse priority React hands to the generic scheduler.

**How it actually works.**

The two systems exist because of the architectural separation from Section 3: the `scheduler` package is a *general-purpose* cooperative task runner, deliberately independent of React, with its own notion of priority (the five levels: Immediate, UserBlocking, Normal, Low, Idle). The *reconciler* has lanes, a much finer-grained (31-way) and React-specific priority model designed around rendering, transitions, retries, and the set operations from Section 5. Neither could simply use the other's model: the scheduler should not know about React's lanes (it would no longer be general), and the reconciler needs far more granularity and structure than five levels provide. So both exist, each appropriate to its layer, and React translates between them at the boundary.

The boundary is `ensureRootIsScheduled` (and the functions around it): the point where React, having pending lanes to render, asks the scheduler to actually run the render work. The translation goes:

1. **Lanes to event priority.** React takes the lanes it is about to render (`getNextLanes`, Section 8) and reduces them to a coarser *event priority* via `lanesToEventPriority`. The event priorities are a small set (`DiscreteEventPriority`, `ContinuousEventPriority`, `DefaultEventPriority`, `IdleEventPriority`) that you have effectively already met: they are the same priority tiers the Event System guide assigned to events (Section 8 of that guide), and they sit *between* the fine-grained lanes and the scheduler's levels. So `lanesToEventPriority` collapses "which specific lanes" into "how urgent, in broad terms."
2. **Event priority to scheduler priority.** React then maps that event priority to one of the scheduler's five levels: discrete-urgent work maps to `ImmediateSchedulerPriority` (synchronous, the most urgent), continuous to `UserBlockingPriority`, default to `NormalPriority`, idle to `IdlePriority`. 
3. **Schedule the render at that level.** React calls the scheduler's `scheduleCallback` with that priority and a callback that performs the render work on the root (`performConcurrentWorkOnRoot`). The scheduler now runs that callback cooperatively at the given priority (Sections 3 and 4): ordering it among other tasks by its timeout-derived expiration, time-slicing it, yielding via `MessageChannel`, and resuming via the continuation it returns when it yields mid-render.

So the flow across both systems, end to end, is: an update gets a *lane* based on context (Section 7); the lanes accumulate in `pendingLanes`; React selects the render batch with `getNextLanes` (Section 8); at the boundary it translates those lanes down to an *event priority* and then to a *scheduler priority* and schedules the render task with the scheduler; the scheduler runs that task cooperatively (Sections 3 and 4), and during the render the work loop checks the lanes (`renderLanes`) at each fiber to decide what to process and calls `shouldYield` to decide when to pause. Lanes govern *what* gets rendered and *whether to interrupt*; the scheduler governs *when* the rendering runs and *when it yields*; and the translation at `ensureRootIsScheduled` is where the fine-grained lane model becomes the coarse scheduler-priority the generic scheduler understands.

This also resolves the confusion about there being "two priority systems." They are not redundant; they are at different granularities for different purposes. Lanes (31-way, React-specific) are how React reasons internally about rendering priority, batching, interruption, starvation, and consistency, all the things from Sections 5 through 11. The scheduler's five levels are the simple interface the generic scheduler exposes for "how urgently should I run this callback." React needs the detail of lanes for its own logic and the simplicity of scheduler levels to talk to a general-purpose scheduler, so it keeps both and maps between them. When you see the scheduler's `UserBlockingPriority` and the reconciler's `InputContinuousLane` and wonder if they are the same thing, the answer is: they are the same *idea* (continuous-input urgency) expressed in the two layers' vocabularies, connected by `lanesToEventPriority` and the event-priority-to-scheduler-priority mapping.

> **Try it.** Trace one update through both systems on paper: a click's `setState` gets `SyncLane` (lane layer, Section 7), which `lanesToEventPriority` reduces to `DiscreteEventPriority`, which maps to the scheduler's `ImmediatePriority`, so the render runs synchronously and urgently. Then do the same for a `startTransition` update: a transition lane, to `DefaultEventPriority`-ish, to `NormalPriority`, scheduled cooperatively. Tracing both shows you the two systems and their mapping in action.

**You've got this if** you can explain why React has both lanes and scheduler priority levels, and roughly how a set of lanes is translated into a scheduler priority when React schedules a render.

---

## 13. Debugging and observing scheduling

*Prereqs: the rest of the guide. Outside React: the browser Performance panel (the flame chart of main-thread activity, long tasks).*

**The itch.** Scheduling is mostly invisible; it just works. But when it does not (jank, an unresponsive interaction, a transition that did not behave), you want to see what React is doing with priorities and time slices, and map the symptom to the mechanism.

**The short version.** The main instrument is the browser's Performance panel, where you can see the main thread sliced into work and yields, spot long tasks (synchronous work that should have been a transition), and see whether React is time-slicing. The React Profiler shows which renders happened and why. The symptoms map to mechanisms from this guide: a long blocking task means synchronous work that should be lower priority; a transition that janks anyway means the work is not actually in a transition lane or expired; a starved low-priority update eventually rendering is expiration firing.

**How it actually works.**

Most of the time, scheduling is something you trust rather than inspect. But when you need to look, here are the instruments and the symptom-to-mechanism mapping.

**The browser Performance panel** is the primary tool, because scheduling is fundamentally about main-thread timing. Record an interaction and look at the main-thread flame chart:

- **A long unbroken task** (a single block longer than about 50ms, flagged as a "long task") means a synchronous render that did not yield (Section 2). If it is work that could tolerate being deferred, it should be in a transition (a transition lane, Sections 7 and 11) so it gets time-sliced. A long task during an interaction is the classic "this should have been a transition" signal.
- **Work sliced into roughly 5ms pieces with gaps** means React is time-slicing and yielding (Section 4), which is concurrency working: the gaps are where the browser paints and handles input. Seeing this during a transition is the system behaving correctly.
- **Input or paint delayed behind React work** means React work is blocking the main thread when it should be yielding; check whether the blocking work is synchronous (`SyncLane` or expired) when it should be a lower, interruptible priority.

**The React DevTools Profiler** shows which components rendered, how long, and why (the Event System and Performance guides). It does not show lanes directly, but "why did this render" plus the timing tells you whether an update was urgent or deferred and whether renders are happening when you expect.

The symptom-to-mechanism map:

A heavy update freezes the UI: the work is synchronous (high-priority lane) when it should be a transition. Wrap it in `startTransition` so it gets a transition lane (Sections 7 and 11), which is deferred, time-sliced, and interruptible.

A transition still janks: either the work is not actually in a transition (an update escaped the `startTransition` scope and got the urgent event lane), or a single unit of work is so expensive that even one slice exceeds the budget (time-slicing helps with many units, not with one giant synchronous computation, which you must make cheaper, the Performance guide's "fix the slow render" point).

A low-priority update is delayed and then suddenly renders with a jank: expiration firing (Section 9). The lane waited past its deadline, was marked expired, and was forced through synchronously. Usually this is rare and acceptable; if frequent, the system is under sustained high-priority load that is starving the low-priority work until its deadline.

Two related updates show an inconsistent intermediate frame: a consistency issue that entanglement (Section 10) normally prevents; if you are seeing it, the updates may not be entangled as you assume, or the inconsistency is in your own logic rather than React's scheduling.

Updates that you expected to batch into one render produce several: they got *different* lanes (different contexts, Section 7), so they did not share a batch. Same lane batches; different lanes may not.

**The closing synthesis.** React's responsiveness rests on two cooperating mechanisms with cleanly separated jobs. The *scheduler*, a generic package, answers *when*: it runs work as prioritized tasks in a min-heap ordered by timeout-derived expiration, and it makes long work non-blocking by slicing it into roughly 5-millisecond pieces and yielding the main thread between them via a `MessageChannel` macrotask (chosen over `setTimeout`'s 4ms clamp, a paint-preceding microtask, and unreliable `requestIdleCallback`), checking `shouldYield` between units of work. *Lanes* answer *which*: each update is assigned a single bit in a 31-lane bitmask based on its context (a transition lane inside `startTransition`, the event's lane inside an event, `DefaultLane` otherwise), bits are used because scheduling is constantly doing cheap set operations on priorities at every fiber (is this update in the render batch, does this subtree have matching work), React renders the highest-priority pending lanes chosen by `getNextLanes`, and a higher-priority update arriving lets React interrupt and restart at the more urgent lanes. Two safety mechanisms refine pure priority ordering: expiration gives every lane a deadline so low-priority work cannot be starved forever (a stale lane is forced through synchronously), and entanglement forces related lanes to render together so splitting never produces an inconsistent intermediate UI. The application-facing concurrent features (automatic batching, `useTransition`, `useDeferredValue`, Suspense retries) are all handles on this one lane system, and the two priority models (the scheduler's five levels and the reconciler's lanes) meet at `ensureRootIsScheduled`, where React translates the fine-grained lanes into a coarse scheduler priority to hand the render to the generic scheduler. So every scheduling behavior you observe (a transition staying responsive, a click preempting a render, work sliced into 5ms pieces, a stale update eventually forced through) is one of these mechanisms, and the question to ask of any scheduling symptom is whether it is about *when* (the scheduler and yielding) or *which* (lanes and priority).

> **Try it.** Record one janky interaction in the Performance panel and classify what you see: is there a long blocking task (synchronous work that should be a transition), or is the work sliced and yielding (concurrency working) but a single unit too expensive (a slow render to fix)? Then map it to the mechanism and the fix. Doing this on a real jank turns the abstract scheduling model into a debugging skill.

**You've got this if** you can take "this interaction janks" and decide, from a Performance trace, whether it is a *when* problem (synchronous, not yielding, should be a transition) or a *which/what* problem (a single render too expensive to fix by slicing).

---

## 14. Reading the source

*Prereqs: the rest of the guide, plus comfort reading JavaScript. This is a pass 3 section; there is no rush.*

**The itch.** You have the model. Now you want to see it in React's actual code: the scheduler's loop and heap, and the lane constants and operations.

**The short version.** It lives in two places: the `scheduler` package (the generic task runner: the min-heap, the priority levels, the `MessageChannel` loop, `shouldYield`) and the `react-reconciler` package's `ReactFiberLane.js` (every lane constant and operation) plus the work-loop and scheduling functions. The pieces map cleanly onto this guide.

**How it actually works (the reading order).**

In the **`scheduler` package** (Sections 3 and 4):

`Scheduler.js` (the package's main file, historically `SchedulerHostConfig`/`forks` for the host-specific parts) contains `unstable_scheduleCallback` (schedule a task at a priority), the five priority constants and their timeouts (`ImmediatePriority`, `UserBlockingPriority`, `NormalPriority`, `LowPriority`, `IdlePriority`), the task object with its `expirationTime`, and `workLoop` (run tasks until the slice is exhausted).

`performWorkUntilDeadline` and the `MessageChannel` setup are the yield loop from Section 4: the `port.postMessage(null)` that schedules the next macrotask, and the deadline computation (`deadline = currentTime + yieldInterval`, the roughly 5ms slice). `shouldYieldToHost` is `shouldYield` from Section 4: the time-based check (and the input-pending check where supported).

`SchedulerMinHeap.js` is the priority queue from Section 3: `push`, `pop`, `peek`, and the sift operations that keep the heap ordered by expiration time.

In the **`react-reconciler` package** (Sections 5 through 12):

`ReactFiberLane.js` is the heart of the lane model: every lane constant (`NoLane`, `SyncLane`, `InputContinuousLane`, `DefaultLane`, the `TransitionLanes` and `RetryLanes` ranges, `IdleLane`, `OffscreenLane`), and the operations (`mergeLanes`, `removeLanes`, `getHighestPriorityLane` with the `lanes & -lanes` trick, `includesSomeLane`, `isSubsetOfLanes`). This file is genuinely readable and is the single best thing to read to make lanes concrete. (Historically this was split into `ReactFiberLane.old.js` and `.new.js`; the new/old fork was removed, so it is now just `ReactFiberLane.js`.)

`getNextLanes` (in `ReactFiberLane.js`) is the render-batch selection from Section 8; `markStarvedLanesAsExpired` and the `expirationTimes` array are the starvation prevention from Section 9; `markRootEntangled` and the `entangledLanes` handling are Section 10.

`requestUpdateLane` (in `ReactFiberWorkLoop.js`) is the lane assignment from Section 7: the transition check, the event-priority check, the default. `ensureRootIsScheduled` (also in the work loop) is the boundary from Section 12 where lanes are translated to a scheduler priority and the render is scheduled. `workLoopConcurrent` is the interruptible work loop that calls `shouldYield` between units (Section 4), and `lanesToEventPriority` is the lanes-to-event-priority reduction from Section 12.

> **Try it.** Open `ReactFiberLane.js` and find the lane constants and `getHighestPriorityLane`. Confirm the constants are the bit patterns from Section 6 (with `SyncLane` as the lowest bit) and that `getHighestPriorityLane` is the `lanes & -lanes` trick from Section 5. Recognizing that the entire lane priority model is a file of bit constants and one-line bitwise functions is the fastest way to demystify it.

**You've got this if** you opened the `scheduler` package or `ReactFiberLane.js` and recognized a function or constant named in this guide.

---

## Further reading (primary sources)

When you want to go past this guide, these are the canonical sources, each with a note on how it relates to what you read here and how current it is.

**The React 18 Working Group discussions, at https://github.com/reactwg/react-18/discussions .** These are the closest thing to a primary explanation of the concurrent model from the React team, written when React 18 introduced it, and they remain accurate for the React 19 line (the model did not change). The discussion on concurrent scheduling specifics (which states "we have 31 levels of granularity ... each bit in a bitmask is called a Lane") is the source for Sections 5 and 6, and others cover transitions, Suspense, and tearing. Start here for the *why* behind lanes.

**The React source, the primary primary source (pass 3):** the `scheduler` package (`Scheduler.js`, `SchedulerMinHeap.js`, and the host loop with `performWorkUntilDeadline` and `shouldYieldToHost`) for Sections 3 and 4, and `react-reconciler`'s `ReactFiberLane.js` (and `ReactFiberWorkLoop.js`) for Sections 5 through 12. Per Section 14, `ReactFiberLane.js` is unusually readable and is the single best file to confirm the lane model against. Everything in this guide is a reading of these files.

**acdlite's (Andrew Clark's) original lanes pull request and design notes** (linked from the React repository and referenced in community write-ups) document the *transition from the expiration-time model to lanes* and the reasoning for the bitmask, which is the history in Sections 5 and 9. It is from the React 18 development period and remains the design of record.

**The rendering and reconciliation guide's concurrency and lanes sections (this series).** That guide introduced the work loop, render and commit, concurrent rendering, and lanes at a high level; this guide is the deep version. Re-reading that guide's concurrency material alongside this one connects the two levels of detail.

**For the browser-platform background:** documentation on the event loop, macrotasks versus microtasks, and `MessageChannel` (on MDN, https://developer.mozilla.org/en-US/docs/Web/API/MessageChannel ) makes Section 4 concrete, since the scheduler's yield mechanism is built directly on these platform primitives. Understanding why a macrotask runs after paint and a microtask does not is the key to why React uses `MessageChannel`.

A good way to use all of these: read the relevant deep section here first so you have the model and the vocabulary, then read the source or the working-group discussion, then come back. This guide gives you the two-mechanism split (scheduler for *when*, lanes for *which*) and traces every behavior to one side or the other; the primary sources give the exact constants, the design history, and the platform details.

---

*Built to be climbed, not swallowed. Finish pass 1 and you are already ahead. Come back for the deep parts when a real scheduling question (a jank you traced to a long task, a transition that surprised you, a profiler trace full of 5ms slices) gives you a reason to care, and observe it in the Performance panel, because scheduling is about main-thread timing and the timeline is where it is visible. Every version-specific claim (the 31-lane bitmask, the MessageChannel work loop, the roughly 5ms slice, the two priority systems and their mapping) reflects the React 19.2.x line in 2026 and has been stable since React 18; the core model (a scheduler answering when, lanes answering which, with expiration for starvation and entanglement for consistency) is the architecture of concurrent React and is not going anywhere. This is the deep companion to the rendering guide's concurrency sections and the downstream of the Event System guide's priority assignment: events assign priority, lanes carry it, the scheduler runs it.*
