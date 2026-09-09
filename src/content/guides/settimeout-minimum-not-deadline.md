---
title: "setTimeout Has Trust Issues"
description: "Why a timer delay is a minimum, not an exact execution time, explained through the call stack and event loop."
category: "JavaScript"
topic: "async-and-concurrency"
readTime: "8 min read"
date: "January 2025"
publishedAt: "2025-01-01"
---

# setTimeout Has Trust Issues

Yes, you read that right. A `setTimeout` with a delay of 5000 milliseconds does not always execute its callback after exactly five seconds. It might take six seconds, ten seconds, or even longer.

Why?

Because the timer is only one part of the story. The callback must also wait for the **call stack** and the **event loop**.

Let’s go through the code step by step and see where the extra time comes from.

## Example 1: The basic flow

```js
console.log("Start");

setTimeout(function callback() {
    console.log("Callback");
}, 5000);

console.log("End");
```

Before reading further, what output do you expect?

The actual output is:

```text role="output"
Start
End
Callback
```

The five-second timer does not stop the rest of the program. JavaScript registers the timer and continues to the next line.

Here is the complete flow.

### Step 1: JavaScript starts the script

The JavaScript engine creates the global execution context and places it on the call stack.

The call stack keeps track of the JavaScript that is executing now. At this point, the global script is the current work.

### Step 2: JavaScript logs Start

```js
console.log("Start");
```

`console.log` is called, `"Start"` appears in the console, and that call finishes.

The output so far is:

```text role="output"
Start
```

### Step 3: JavaScript encounters setTimeout

```js
setTimeout(function callback() {
    console.log("Callback");
}, 5000);
```

`setTimeout` is provided by the host environment. In this example, that host is the browser.

The browser starts tracking a timer for at least 5000 milliseconds. JavaScript does not keep the callback on the call stack while it waits, and the timer does not block the next line.

This is the important part: registering a timer and executing its callback are two different events.

### Step 4: JavaScript logs End

```js
console.log("End");
```

The timer is still being tracked, but JavaScript continues and logs `"End"`.

The output is now:

```text role="output"
Start
End
```

The global script then finishes, so its execution context leaves the call stack.

### Step 5: The timer becomes eligible

After at least 5000 milliseconds, the browser can queue a task for the timer callback.

This does **not** mean the callback must execute at that exact moment. It means the delay requirement has been satisfied and the callback is now waiting for its turn.

### Step 6: The event loop gives the callback a turn

The event loop coordinates queued work with the JavaScript call stack. When the current JavaScript job has finished, the event loop can select the timer task.

The browser invokes `callback`, its execution context is placed on the call stack, and `"Callback"` is logged.

The final output is:

```text role="output"
Start
End
Callback
```

So `setTimeout(callback, 5000)` means:

> Do not schedule this callback before roughly 5000 milliseconds have passed. Run it later when the event loop can give it a turn.

That is very different from “run this callback at exactly 5000 milliseconds.”

## What happens when the call stack is blocked?

Now let’s make the example more interesting.

```js
console.log("Start");

setTimeout(function callback() {
    console.log("Callback");
}, 5000);

console.log("End");

const startTime = Date.now();
let currentTime = startTime;

// Block the main thread for about 10 seconds.
while (currentTime < startTime + 10_000) {
    currentTime = Date.now();
}

console.log("While loop finished");
```

This loop is intentionally bad code. It gives the call stack work that lasts for about ten seconds, which makes the timer behavior easy to observe.

Let’s trace it.

### The first five seconds

The script logs `"Start"`, registers the five-second timer, and logs `"End"`.

Then the `while` loop begins. The global script is still running, so the call stack is not empty.

### At the five-second mark

The timer delay has passed. The browser can queue the timer task.

But the callback cannot run because the `while` loop still occupies the main thread. The event loop does not interrupt the current JavaScript job halfway through.

The callback has become eligible, but it is still waiting.

### At the ten-second mark

The loop finally ends, and JavaScript logs `"While loop finished"`.

Only after the current script finishes can the event loop select the timer task and invoke the callback.

The output is:

```text role="output"
Start
End
While loop finished
Callback
```

The timer was set for five seconds, but the callback ran after roughly ten seconds.

It did not wait ten seconds because the browser forgot about it. It waited because JavaScript was busy. The timer completed its part after five seconds; the callback then spent another five seconds waiting for the call stack.

This is where the “trust issues” come from.

## What about setTimeout with zero milliseconds?

Here is another interesting example:

```js
console.log("Start");

setTimeout(function callback() {
    console.log("Callback");
}, 0);

console.log("End");
```

You might expect the zero-delay callback to run immediately. It does not.

The output is:

```text role="output"
Start
End
Callback
```

Why?

1. JavaScript logs `"Start"`.
2. The browser registers the timer.
3. JavaScript continues and logs `"End"`.
4. The current script finishes.
5. The event loop can then select the timer task.
6. The callback runs and logs `"Callback"`.

A delay of zero removes an intentional wait, but it does not remove the queue. The callback still runs in a later task.

## Why would anyone use setTimeout(0)?

If it does not run immediately, why use it?

### To defer work

`setTimeout(callback, 0)` can move work out of the current synchronous flow. The callback runs only after the current script and earlier eligible work have had their turns.

That can be useful when a task should happen later but does not need a meaningful time delay.

### To split long work

A long calculation can freeze input and rendering because it keeps the main thread busy. Dividing that calculation into smaller tasks can give the browser opportunities to respond between them.

`setTimeout(0)` is one way to schedule those later chunks, although it is not a precision tool and it is not always the best modern scheduling API.

The lesson is not “put every slow operation inside `setTimeout`.” The lesson is that smaller tasks release the main thread more often.

## The concurrency model behind the behavior

The examples rely on a few connected pieces.

### JavaScript runs one job at a time

On the browser’s main JavaScript thread, one job runs at a time. A timer callback cannot execute in the middle of another JavaScript job.

### The call stack tracks current execution

Function calls add execution contexts to the stack. Returning from those functions removes them. When the current job finishes, its stack becomes empty.

### The browser manages the timer

`setTimeout` is not part of the ECMAScript language itself. The browser provides it and tracks the delay outside the JavaScript call stack.

### A task waits after the delay

When the delay requirement has been met, the browser can queue a timer task. The callback is ready, but readiness does not guarantee immediate execution.

### The event loop coordinates the next turn

The event loop lets queued work run after the current JavaScript job has completed. If the main thread stays busy, queued work stays waiting.

These pieces allow JavaScript to coordinate asynchronous operations without executing two main-thread JavaScript jobs at the same time.

## Key takeaways

1. **A timer delay is a minimum, not an exact execution time.**  
   `setTimeout(callback, 5000)` does not guarantee that the callback runs at exactly five seconds.

2. **The callback must wait for the call stack.**  
   A long synchronous task can delay timers, user input, rendering, and other queued work.

3. **A zero delay still means later.**  
   `setTimeout(callback, 0)` schedules a future task. It does not insert the callback into the current execution.

4. **Registering a timer and running its callback are separate events.**  
   The browser tracks the delay. The event loop coordinates when the callback gets its turn.

5. **Avoid blocking the main thread.**  
   If work is expensive, split it into smaller tasks or move suitable computation away from the main thread.

The next time a timer callback arrives late, do not look only at the delay. Look at what the call stack was doing while the callback waited.

That is when `setTimeout` starts to feel trustworthy again.

## Try it yourself

Run the blocked-stack example and change the loop from ten seconds to three seconds. Then change the timer from five seconds to zero.

Before each run, predict the output and the approximate timing. The goal is not to memorize one example. It is to see the two waits separately:

1. Waiting for the timer delay
2. Waiting for the call stack

## Further reading

- [JavaScript execution model](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model)
- [setTimeout](https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout)
- [HTML timers](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers)
