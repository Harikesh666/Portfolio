---
title: "JavaScript, the Browser, and the Event Loop"
description: "How browser APIs, tasks, microtasks, and the event loop let JavaScript handle delayed work without blocking the main thread."
category: "JavaScript"
readTime: "15 min read"
date: "January 2025"
publishedAt: "2025-01-07"
---

# JavaScript, the Browser, and the Event Loop

JavaScript executes one piece of code at a time on the main thread.

The call stack has a simple job: execute the current code and move on. It does not sit with a timer in its hand. It does not stare at the network until a response arrives. It does not pause everything while waiting for you to click a button.

Time, tide, and JavaScript wait for none.

But then comes the obvious question: **what if our program needs to wait for something?**

What if we want to run code after five seconds, fetch data from a server, or respond when a user clicks a button?

The call stack does not wait for any of them. As the original note puts it, “time, tide, and JavaScript wait for none.”

This is where the JavaScript engine stops being the whole story. We need the runtime around it: browser APIs, task queues, the microtask queue, and the event loop.

Let’s build that picture one part at a time.

## JavaScript runs one job at a time

You will often hear that JavaScript is a synchronous, single-threaded language. That sentence is useful, but it needs some care.

I am using **job** in the ordinary sense here: the piece of JavaScript work that currently has the main thread. Later, we will separate the browser's more precise tasks and microtasks.

On the browser’s main thread, JavaScript code runs **one job at a time**. A function that is already running is not interrupted halfway through so another JavaScript function can take over. Each job runs to completion before the next one begins.

Consider this code:

```js
function greet() {
    console.log("Hello");
}

greet();
console.log("Bye");
```

The engine does not execute half of `greet`, jump to `console.log("Bye")`, and then return. The call to `greet` finishes first.

The call stack keeps track of that active execution:

1. The global script begins executing.
2. `greet()` is called and gets its own execution context.
3. `console.log("Hello")` runs.
4. `greet()` returns.
5. `console.log("Bye")` runs.
6. The script finishes.

This run-to-completion behavior makes synchronous code predictable. It also creates a problem: if one job takes a long time, nothing else on that main thread gets a turn.

So how does JavaScript perform asynchronous work?

It gets help.

## The browser gives JavaScript superpowers

The browser is a truly remarkable invention. It contains a JavaScript engine, but it also provides tools that are not part of the ECMAScript language itself.

These browser APIs include:

1. Timers such as `setTimeout` and `setInterval`
2. DOM APIs for reading and changing the page
3. `fetch` for network requests
4. Event APIs such as `addEventListener`
5. Storage APIs such as `localStorage`
6. Browser information through `location`, `history`, and other objects

JavaScript can ask these APIs to do work outside the current call stack.

That does not mean every browser API is asynchronous. `localStorage`, for example, is synchronous. The important point is that these capabilities come from the host environment rather than from the JavaScript language itself.

This is also why the same JavaScript language can live in different environments. A browser gives it the DOM and `window`. Node.js gives it file-system, process, and server APIs. The engine understands JavaScript; the host gives JavaScript a world to interact with.

If you want the engine side of this story first, read [How the JavaScript Engine Runs Your Code](/writing/how-javascript-engine-runs-code).

## The global object is the front door

In a normal browser page, `window` is the global object. Many browser APIs are available through it:

```js
window.setTimeout(() => {
    console.log("Timer finished");
}, 1000);
```

We usually omit `window`:

```js
setTimeout(() => {
    console.log("Timer finished");
}, 1000);
```

For this browser example, both calls reach the same timer API.

However, `window` is not universal. Web Workers use a different global object, and Node.js has its own environment. When code needs a standard way to refer to the current global object, it can use `globalThis`.

Now we have the engine and the browser. We still need something to coordinate them.

## How setTimeout works behind the scenes

Let’s begin with a timer:

```js
console.log("Start");

setTimeout(function callback() {
    console.log("Callback");
}, 5000);

console.log("End");
```

Before reading further, what output do you expect?

The output is:

```text
Start
End
Callback
```

Why does `End` appear before `Callback`?

### Step 1: The script starts

The engine begins evaluating the script. You can describe the active top-level work as the global execution context. It is now represented on the execution context stack, commonly called the call stack.

### Step 2: Start is logged

```js
console.log("Start");
```

The call completes, and the output is now:

```text
Start
```

### Step 3: The timer is registered

```js
setTimeout(function callback() {
    console.log("Callback");
}, 5000);
```

The browser starts tracking the timer. The callback does not remain on the JavaScript call stack for five seconds. JavaScript registers the work and continues.

This is the first important separation:

> Starting an asynchronous operation and running its callback are two different events.

### Step 4: End is logged

```js
console.log("End");
```

The output becomes:

```text
Start
End
```

The current script then finishes.

### Step 5: The timer becomes eligible

After at least 5000 milliseconds, the browser can queue a task for the timer callback.

Notice the wording: **queue a task**. The browser does not force the callback into the middle of whatever JavaScript is already running.

A **task** is one scheduled turn of browser work. Running the initial script, handling a ready timer, and dispatching a click can each begin as a task.

### Step 6: The callback gets a turn

When the event loop selects the timer task, the engine calls `callback`. A new execution context is created, `"Callback"` is logged, and the function returns.

This is why a timeout delay is a minimum rather than a deadline. The timer can become ready while the main thread is still busy. The callback must wait for its turn.

The complete timing problem deserves its own walkthrough, so I covered it separately in [setTimeout Has Trust Issues](/writing/settimeout-minimum-not-deadline).

## What is the callback queue?

Beginner explanations usually draw one box called the **callback queue**:

```text
Browser API → Callback queue → Call stack
```

That picture is useful. Timer callbacks and many event callbacks do wait as queued tasks before they execute.

But the browser’s real scheduling model is more detailed. An event loop can have multiple **task queues**, and the browser may choose among runnable tasks from different task sources while preserving the required ordering within each source.

So “the callback queue is one global FIFO queue for everything” is not quite correct.

For learning, keep this simpler mental model:

1. An event or completed operation makes some JavaScript callback eligible to run.
2. The host schedules the related task or microtask.
3. The callback cannot interrupt the JavaScript that is running now.
4. The event loop gives it a turn according to the scheduling rules.

That model is simple enough to use and accurate enough not to betray you later.

## What is the event loop?

The event loop is the unsung hero coordinating all this work.

People often say that it constantly watches the call stack and pushes callbacks onto it. That is a good visual shortcut, but the event loop does not literally grab a function object and shove it onto the stack.

A more accurate browser-sized version of one loop is:

1. Select and run one runnable task.
2. Let the JavaScript started by that task run to completion.
3. Perform a microtask checkpoint, draining queued microtasks.
4. Give the browser an opportunity to update rendering when appropriate.
5. Repeat.

The task might be the initial script, a timer callback, or the dispatch of a click event. Running that task may call many functions, and those function calls create the stack we see in developer tools.

The event loop does not make JavaScript execute several main-thread functions at the same time. It lets different pieces of work take turns.

## How event listeners work

Now consider a button click:

```html
<button id="btn">Click me</button>
```

```js
console.log("Start");

document.getElementById("btn").addEventListener("click", function callback() {
    console.log("Button clicked");
});

console.log("End");
```

The output immediately after the script runs is:

```text
Start
End
```

Registering the listener is synchronous. `addEventListener` stores the relationship between the event type and the callback, then returns. It does not block the script and wait for a human finger.

Later, when the user clicks the button, the browser dispatches a click event. The registered callback runs as part of the task that handles that event:

```text
Start
End
Button clicked
```

If the main thread is stuck inside a long-running function when the user clicks, the click does not interrupt that function. Its handling must wait.

This is why a page can look frozen even though the browser has already received your click. The event exists; JavaScript simply has not returned control long enough to handle it.

## Tasks and microtasks are not the same

So far, we have talked mostly about tasks. Browsers also have a **microtask queue**.

A **microtask** is follow-up work that gets a chance before the browser moves to the next task. The browser usually processes it after the current task's JavaScript finishes, at what is called a microtask checkpoint.

Common sources of microtasks include:

- Promise reaction callbacks registered with `.then`, `.catch`, or `.finally`
- Code queued with `queueMicrotask`
- `MutationObserver` callbacks

Timer callbacks and asynchronously dispatched events run as tasks. Promise reactions run as microtasks.

Let’s see the difference:

```js
console.log("Start");

setTimeout(function timerCallback() {
    console.log("Timer");
}, 0);

Promise.resolve().then(function promiseCallback() {
    console.log("Promise");
});

console.log("End");
```

What do you expect?

The output is:

```text
Start
End
Promise
Timer
```

Here is the flow:

1. The initial script is running as a task.
2. `setTimeout` arranges a future timer task.
3. `.then` arranges a promise reaction microtask because the promise is already fulfilled.
4. `End` is logged before the current script finishes.
5. The stack becomes empty and the browser performs a microtask checkpoint.
6. `promiseCallback` runs.
7. On a later event-loop iteration, the timer task runs.

The zero-millisecond timer did not lose a race measured in milliseconds. It was scheduled in a different kind of queue.

## The microtask queue is drained

There is one detail that makes microtasks powerful and dangerous: the event loop does not run just one microtask and move on.

At a microtask checkpoint, it keeps processing microtasks until the queue is empty. If one microtask creates another microtask, the new one can run during the same checkpoint.

```js
queueMicrotask(function first() {
    console.log("First microtask");

    queueMicrotask(function second() {
        console.log("Second microtask");
    });
});

setTimeout(function timer() {
    console.log("Timer task");
}, 0);
```

The output is:

```text
First microtask
Second microtask
Timer task
```

This behavior lets libraries finish small pieces of related work before the browser moves to another task. But it can also cause **task starvation**.

If every microtask keeps creating another microtask, the queue may never become empty. Timer callbacks, input handling, and rendering can be delayed because the event loop never reaches the next task.

High priority does not mean free. A mountain of tiny microtasks can still bury the page.

## setTimeout and fetch: who runs first?

The original version of this lesson used an example like this:

```js
console.log("Start");

setTimeout(function timerCallback() {
    console.log("Timer");
}, 5000);

fetch("https://api.example.com/data").then(function fetchCallback() {
    console.log("Fetch");
});

console.log("End");
```

It is tempting to say the output must be:

```text
Start
End
Fetch
Timer
```

But that is not guaranteed.

The first two lines are predictable:

```text
Start
End
```

After that, the order depends on when the network request settles.

- If the response arrives before the five-second timer task runs, the fetch promise reaction can run first.
- If the network takes longer than five seconds, the timer can run first.
- If both become ready around the same time, microtask rules matter only at the relevant microtask checkpoint. They do not make an unfinished network request jump ahead through time.

There is another small correction worth making: calling `.then(fetchCallback)` does not immediately place `fetchCallback` in the microtask queue. It registers a reaction. The reaction is queued as a microtask only after the fetch promise fulfills.

Microtasks have scheduling priority once they are queued. They do not make the asynchronous operation itself complete faster.

## Asynchronous does not mean parallel JavaScript

The browser may perform networking, timer tracking, rendering preparation, and other internal work outside the JavaScript call stack. That lets the main thread continue instead of waiting.

But when a timer callback, promise handler, or event listener executes on the main thread, it still runs one at a time.

```js
setTimeout(function heavyWork() {
    const end = Date.now() + 5000;

    while (Date.now() < end) {
        // Keep the main thread busy.
    }
}, 0);
```

That callback blocks the main thread for roughly five seconds. During that time, other main-thread JavaScript cannot run, and the page may not respond to input or paint updates smoothly.

Asynchronous APIs prevent waiting from blocking the stack. They do not make expensive callback code harmless.

If you genuinely need JavaScript computation on another thread in a browser, Web Workers provide that capability. A worker has its own execution environment and communicates with the main thread through messages. It does not turn two main-thread callbacks into simultaneous work.

## Where rendering fits

The event loop coordinates more than JavaScript callbacks. The browser also needs opportunities to calculate styles, lay out the page, and paint pixels.

Rendering does not necessarily happen after every task, but long tasks and endless microtasks can prevent the browser from reaching a rendering opportunity.

That explains code like this:

```js
statusElement.textContent = "Working...";

const end = Date.now() + 5000;
while (Date.now() < end) {
    // Expensive synchronous work.
}

statusElement.textContent = "Done";
```

You might expect the page to show `Working...` for five seconds and then `Done`. Instead, the browser may not paint the intermediate state at all. The script changes the DOM twice inside one long task, and the browser cannot render between those statements while JavaScript still owns the main thread.

The DOM changed. The screen did not get its turn.

## A mental model that holds up

When asynchronous JavaScript feels confusing, ask these questions in order:

1. **What JavaScript is running now?**  
   Follow the call stack and remember that the current job runs to completion.

2. **Which part belongs to the host?**  
   A browser API may track a timer, wait for a network response, or listen for input outside the current stack.

3. **What becomes queued when the operation is ready?**  
   Timer and event work usually becomes a task. Promise reactions become microtasks.

4. **When does the current task finish?**  
   Queued callbacks cannot interrupt it.

5. **Are there microtasks to drain?**  
   They run at a microtask checkpoint before the browser moves to the next task.

6. **Does the browser get a rendering opportunity?**  
   Long tasks and unbounded microtasks can delay the screen as well as other callbacks.

The event loop is not magic. It is a scheduling system that lets the JavaScript engine and its host environment cooperate.

The engine runs JavaScript. The browser waits on the outside world. Queues hold work that is ready. The event loop decides when that work gets a turn.

Once those responsibilities are separate in your head, asynchronous JavaScript becomes much easier to predict.

## Try it yourself

Predict the output before running this example:

```js
console.log("A");

setTimeout(() => {
    console.log("B");
}, 0);

Promise.resolve()
    .then(() => {
        console.log("C");
    })
    .then(() => {
        console.log("D");
    });

queueMicrotask(() => {
    console.log("E");
});

console.log("F");
```

Then explain the result without saying only “promises are faster.” Identify:

1. The current task
2. The timer task
3. Each microtask
4. The moment the second `.then` reaction becomes queued
5. The point at which the browser can move to the timer task

If you can explain those five pieces, you understand the event loop better than someone who has merely memorized an output order.

## Further reading

- [JavaScript execution model](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model)
- [Using microtasks in JavaScript](https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide)
- [HTML event loops](https://html.spec.whatwg.org/multipage/webappapis.html#event-loops)
- [HTML timers](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers)
