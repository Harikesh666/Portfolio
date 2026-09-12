---
title: "JavaScript Concurrency: One Thread, Many Tasks"
description: "How JavaScript makes progress on timers, network requests, rendering, and user input without confusing concurrency with parallel execution."
category: "JavaScript"
topic: "async-and-concurrency"
order: 1
readTime: "15 min read"
date: "January 2025"
publishedAt: "2025-01-15"
---

# JavaScript Concurrency: One Thread, Many Tasks

Open a modern web application and several things appear to happen at once.

A request loads data. A spinner rotates. You move the pointer. Music continues playing. A timer counts down. Notifications arrive. The page remains ready for another click.

Then someone tells you, “JavaScript is single-threaded.”

Excuse me? If JavaScript can do only one thing at a time, who is doing all that work?

The answer begins with **concurrency**. JavaScript does not need to execute every piece of main-thread JavaScript simultaneously to keep several operations in progress.

It needs a way to start work, avoid waiting uselessly, and return to each result when it is ready.

## What is concurrency?

Concurrency means making progress on multiple tasks during overlapping periods of time.

Imagine one cook preparing tea and toast.

The cook puts water on the stove. While the water heats, the cook places bread in the toaster. While both machines work, the cook takes out two cups. When the kettle whistles, the cook returns to the tea.

The cook did not grow four hands. Only one step requiring the cook’s attention happened at a time. But the two preparations overlapped, so both made progress.

That is concurrency.

The cook could have stared at the kettle until it boiled, then started the toast. The final breakfast would still exist, but time would be wasted waiting for one operation before beginning another independent one.

In software, network requests, timers, user input, and file operations often spend time waiting. A concurrency model lets the program remain useful during that wait.

## Concurrency is not parallelism

The two words are related, but they do not mean the same thing.

**Concurrency** means multiple tasks are in progress during overlapping time. The system may switch between them or wait for external operations while working on something else.

**Parallelism** means multiple tasks are literally executing at the same instant, usually on different processor cores or hardware threads.

One cook alternating between tea and toast is concurrent.

Two cooks, one preparing tea while the other prepares toast at the exact same moment, are parallel.

Browser JavaScript can involve both:

- Main-thread JavaScript tasks run one at a time.
- Browser subsystems may perform networking, timer tracking, decoding, and other work outside the JavaScript call stack.
- Web Workers can run JavaScript in separate threads.

So “JavaScript is single-threaded” is a useful starting point, not a complete description of the browser.

## The main thread has more than JavaScript to do

In a browser page, the main thread is responsible for work such as:

- Running most of our JavaScript
- Dispatching user events
- Calculating layout
- Painting updates
- Coordinating parts of the document lifecycle

The JavaScript engine uses an execution context stack, commonly called the call stack, to track active function calls.

```js
function first() {
    console.log("First");
}

function second() {
    console.log("Second");
}

first();
second();
```

The output is predictable:

```text
First
Second
```

`first()` runs to completion before `second()` begins. The event loop does not interrupt `first` halfway through to give `second` a turn.

This is called **run-to-completion**. It makes an individual JavaScript task easier to reason about because another main-thread JavaScript task cannot modify the same state in the middle of one synchronous function.

But run-to-completion has a price. If `first()` performs five seconds of heavy computation, `second()` waits for five seconds. So do click handlers and rendering opportunities.

One thread is manageable only when we return control quickly.

## The host environment handles the waiting

JavaScript, the language, does not provide the browser’s timer, DOM, or networking APIs. The browser provides them as part of the runtime environment.

```js
console.log("Start");

setTimeout(function timerFinished() {
    console.log("Timer finished");
}, 1000);

console.log("End");
```

The browser starts tracking the timer and `setTimeout` returns. JavaScript does not keep a function call open on the stack for one second.

The output is:

```text
Start
End
Timer finished
```

While the timer is pending, the main thread can run other tasks. When the delay has elapsed, the browser can schedule a task for the callback. The callback still has to wait until the event loop selects that task.

The same broad cooperation appears with `fetch`:

```js
console.log("Requesting user");

fetch("/api/user")
    .then((response) => response.json())
    .then((user) => console.log(user));

console.log("Request started");
```

JavaScript initiates the request and continues. The browser’s networking machinery handles the waiting. When the returned promise settles, its registered reaction can be scheduled as a microtask.

The browser does not make the `.then` callback run in parallel on the main thread. It lets the slow external operation overlap with other work, then schedules JavaScript to handle the result.

That is concurrency through cooperation.

## The event loop coordinates turns

The event loop connects ready work to execution time.

A beginner diagram often looks like this:

```text
Call stack ← Event loop ← Callback queue ← Browser APIs
```

The diagram is useful, but the browser model is richer:

- An event loop can have multiple task queues associated with different task sources.
- It selects runnable tasks according to the platform’s scheduling rules.
- It performs microtask checkpoints at defined points.
- It may then get an opportunity to update rendering.

The event loop does not literally take a callback and push the function object onto the call stack. It selects work to run; the engine then creates the execution contexts produced by that work.

For the detailed browser-sized loop, read [JavaScript, the Browser, and the Event Loop](/articles/asynchronous-javascript-event-loop). Here, the important concurrency rule is simpler:

> Ready work waits for a turn. Running work keeps its turn until it completes.

## Tasks and microtasks

Browser scheduling uses **tasks** and **microtasks**.

Tasks include work such as:

- Running an initial script
- Dispatching many user events
- Running timer callbacks

Microtasks include:

- Promise reaction callbacks
- `queueMicrotask` callbacks
- `MutationObserver` callbacks

You will often hear regular tasks called **macrotasks**. That name is common in tutorials, but the HTML standard calls them tasks. “Macrotask queue” can also hide the fact that the browser may have multiple task queues rather than one global FIFO line.

After a task finishes, the browser performs a microtask checkpoint and drains the microtask queue before selecting another task.

## Putting the pieces together

Put synchronous code, a timer, and a promise together:

```js
console.log("Start");

setTimeout(function timeoutCallback() {
    console.log("Timeout Callback");
}, 0);

Promise.resolve().then(function promiseCallback() {
    console.log("Promise Callback");
});

console.log("End");
```

Predict the output before continuing.

The result is:

```text
Start
End
Promise Callback
Timeout Callback
```

Let’s walk through it carefully.

### Step 1: Start the current task

The initial script is already running as a task. `"Start"` is logged.

### Step 2: Register the timer

`setTimeout` asks the browser to initialize a timer with a zero-millisecond delay.

Zero does not mean “execute the callback on this line.” It means the timer has no requested waiting period beyond the platform’s timer rules. The callback can be scheduled as a future task only after the timer machinery reaches the appropriate step.

### Step 3: Register a promise reaction

`Promise.resolve()` creates an already-fulfilled promise. Calling `.then` registers `promiseCallback`, and a promise reaction job is queued as a microtask.

The microtask does not interrupt the script that is running now.

### Step 4: Finish the script

`"End"` is logged. The initial task reaches completion.

The output so far is:

```text
Start
End
```

### Step 5: Drain microtasks

At the microtask checkpoint, `promiseCallback` runs and logs `"Promise Callback"`.

### Step 6: Run the timer task

On a later event-loop turn, the timer task is selected. `timeoutCallback` runs and logs `"Timeout Callback"`.

The promise did not execute in parallel with the script. Its callback waited for the current task, then ran during the microtask checkpoint before the event loop moved to the timer task.

## Concurrency does not guarantee order

Some ordering rules are guaranteed. Other ordering depends on which operation finishes first.

```js
const firstRequest = fetch("/api/slow");
const secondRequest = fetch("/api/fast");

firstRequest.then(() => console.log("First request finished"));
secondRequest.then(() => console.log("Second request finished"));
```

The first request starts first, but that does not guarantee it finishes first. Server time, caching, network conditions, and payload size can change the result order.

Concurrency lets operations overlap. Once they overlap, completion order may become part of the program’s behavior.

If order matters, express that dependency:

```js
fetch("/api/first")
    .then((firstResponse) => firstResponse.json())
    .then((firstData) => fetch(`/api/second?id=${firstData.id}`));
```

The second request begins only after the first result supplies the required ID.

If order does not matter, begin both operations together and wait for both:

```js
const [user, notifications] = await Promise.all([
    fetchUser(),
    fetchNotifications(),
]);
```

This is concurrent waiting. The asynchronous operations overlap, although their JavaScript result handlers still take turns on the relevant thread.

## Single-threaded code can still have race conditions

Run-to-completion prevents one task from interrupting another in the middle of synchronous code. It does not guarantee that an entire asynchronous workflow is atomic.

Consider two withdrawals:

```js
let balance = 100;

function wait(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function withdraw(name, amount, delay) {
    const startingBalance = balance;

    await wait(delay);

    balance = startingBalance - amount;
    console.log(name, balance);
}

withdraw("Shoes", 40, 100);
withdraw("Watch", 30, 50);
```

Both calls read `balance` as `100` before either reaches its `await`.

The watch finishes first and sets the balance to `70`. Then the shoes operation resumes with its old `startingBalance` and sets the balance to `60`.

We spent `70`, but the final balance says `60` instead of `30`.

No two JavaScript statements executed simultaneously on the main thread. The race happened because two asynchronous workflows read shared state, paused, and later wrote results based on stale snapshots.

This is a **logical race condition**. The final state depends on the order in which concurrent operations resume.

Solutions depend on the application. We might serialize updates, move the authoritative transaction to a database, use version checks, or design operations that do not overwrite shared state from stale reads.

“Single-threaded” is not a free pass from concurrency bugs.

## Concurrency needs fairness

The event loop can coordinate many tasks only if running code gives control back.

```js
while (true) {
    // The current task never ends.
}
```

No timer, click handler, or rendering update can take a turn after this loop begins on the main thread.

Microtasks can cause a subtler form of starvation:

```js
function keepQueueBusy() {
    queueMicrotask(keepQueueBusy);
}

keepQueueBusy();
```

Each microtask creates another. Because the browser drains microtasks before moving to the next task, regular tasks and rendering may wait indefinitely.

Concurrency is cooperative here. Code that never yields can ruin the cooperation.

Keep synchronous jobs short. Split large work when appropriate. Use a worker when computation genuinely belongs on another thread.

## Web Workers add parallel execution

An event loop helps one thread manage many pending operations. A Web Worker provides a separate JavaScript execution environment running in another thread.

```js
const worker = new Worker("./calculate.js", { type: "module" });

worker.postMessage({ limit: 1_000_000 });

worker.addEventListener("message", function receiveResult(event) {
    console.log("Result:", event.data);
});
```

The worker can perform CPU-heavy JavaScript without occupying the page’s main JavaScript thread. It sends results back through messages.

Workers do not share the page’s `window` or direct DOM access. Their separation makes accidental shared-memory races harder, though advanced shared-memory features exist and require careful synchronization.

Use asynchronous APIs for work that mostly waits, such as network I/O. Consider workers for expensive computation that would otherwise monopolize the main thread.

Do not hire a second cook merely to watch another kettle.

## Why the concurrency model matters

JavaScript’s concurrency model helps a page remain responsive while work is pending:

1. **I/O can overlap with useful work.**  
   The main JavaScript stack does not wait for every network response or timer.

2. **User interactions get scheduled.**  
   Clicks and keyboard events can run when current work returns control.

3. **Rendering gets opportunities.**  
   Short tasks give the browser chances to update the screen.

4. **Dependencies can be expressed.**  
   Promise chains and `await` describe work that must happen in order.

5. **Independent operations can begin together.**  
   Tools such as `Promise.all` let us wait for several results without unnecessary serialization.

6. **CPU-heavy work can move elsewhere.**  
   Workers provide separate execution threads when true parallelism is useful.

The model does not make every program automatically non-blocking or race-free. It gives us the tools. We still have to use them with care.

## What to remember

- **Concurrency is about overlapping progress.** It does not require simultaneous execution.
- **Parallelism means simultaneous execution.** Workers can provide it for JavaScript in browsers.
- **Main-thread JavaScript runs one task at a time.** Each task runs to completion.
- **Browser APIs handle waiting outside the current call stack.** Ready JavaScript is scheduled for a later turn.
- **Tasks and microtasks follow different rules.** Microtasks drain before the next task is selected.
- **Completion order can vary.** Concurrent operations create ordering questions even on one JavaScript thread.
- **Long tasks destroy responsiveness.** Concurrency works only when code returns control.

JavaScript may have one cook on the main thread, but the kitchen is much larger than the cook.

## Try it yourself

Predict the output:

```js
console.log("A");

setTimeout(() => console.log("B"), 0);

Promise.resolve()
    .then(() => console.log("C"))
    .then(() => console.log("D"));

queueMicrotask(() => console.log("E"));

console.log("F");
```

Then answer these questions:

1. Which code belongs to the initial task?
2. When does the second `.then` callback become queued?
3. Why can `E` run before `D` even though the promise chain started first?
4. Which callback waits for a later task?
5. Does any of this main-thread JavaScript run in parallel?

The goal is not to memorize six letters. The goal is to explain which work is active, which work is waiting, and which scheduling rule gives each callback its turn.

## Further reading

- [JavaScript execution model](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model)
- [HTML event loops](https://html.spec.whatwg.org/multipage/webappapis.html#event-loops)
- [Using microtasks in JavaScript](https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide)
- [Using Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)
