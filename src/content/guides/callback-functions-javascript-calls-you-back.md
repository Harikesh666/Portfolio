---
title: "Callback Functions: JavaScript Calls You Back"
description: "What callbacks really are, when they run synchronously or asynchronously, and how they shape timers, events, array methods, and closures."
category: "JavaScript"
topic: "functions-and-composition"
readTime: "14 min read"
date: "January 2025"
publishedAt: "2025-01-10"
---

# Callback Functions: JavaScript Calls You Back

A callback function is not a special kind of function.

It does not have unique syntax. It does not wear a badge saying “Hello, I am a callback.” It becomes a callback because of the job we give it.

We pass a function to some other code, and that code decides when to call it.

That is the basic idea. But one word in that sentence causes a lot of confusion: **when**.

Does a callback always run later? Is every callback asynchronous? Does passing slow work to a callback stop it from blocking JavaScript?

No, no, and unfortunately no.

Let’s make the idea precise without making it complicated.

## What is a callback function?

A **callback** is a function supplied to other code so that the receiving code can call it.

```js
function x(callback) {
    console.log("x");
    callback();
}

x(function y() {
    console.log("y");
});
```

Here, `y` is passed to `x` as an argument. Inside `x`, the parameter `callback` refers to that function. When `callback()` runs, JavaScript calls `y`.

The output is:

```text
x
y
```

The names can make the example look more mysterious than it is. Replace the function with an ordinary value for a moment:

```js
function show(value) {
    console.log(value);
}

show("hello");
```

The string `"hello"` becomes the value of the parameter `value`.

In the callback example, a function becomes the value of the parameter `callback`:

```js
function show(callback) {
    console.log(callback);
}

show(function greet() {
    console.log("hello");
});
```

Functions can travel through JavaScript just like other values. That is what makes callbacks possible.

## Functions are first-class values

JavaScript functions are often called **first-class citizens** or **first-class values**. In practical terms, this means we can:

1. Assign a function to a variable
2. Store a function in an object or array
3. Pass a function as an argument
4. Return a function from another function

```js
function greet(name) {
    return `Hello, ${name}`;
}

const savedFunction = greet;
const toolbox = { greet };
const functions = [greet];

console.log(savedFunction("Harikesh"));
console.log(toolbox.greet("Binod"));
console.log(functions[0]("JavaScript"));
```

We did not execute `greet` when assigning it. We moved a reference to the function around.

These two expressions are different:

```js
greet;
greet();
```

- `greet` refers to the function.
- `greet()` calls the function now.

That tiny pair of parentheses causes one of the most common callback mistakes, and we will return to it later.

## Why is it called a callback?

Imagine giving your phone number to a repair shop.

You do not stay at the counter until the repair is complete. You give them a way to contact you and say, “Call me back when you know what happened.”

In code, the function is the contact information:

```js
function finishRepair(onComplete) {
    console.log("Repairing...");
    onComplete();
}

finishRepair(function collectLaptop() {
    console.log("The laptop is ready");
});
```

The receiving function controls the call. It may call the callback immediately, later, more than once, or not at all.

That last sentence matters. A callback is a relationship between two pieces of code. To use one safely, we need to understand the receiving function’s contract.

## A callback does not have to run later

Look again at our first example:

```js
function x(callback) {
    console.log("x");
    callback();
}

x(function y() {
    console.log("y");
});
```

The callback `y` runs **synchronously**. It is called before `x` returns.

JavaScript array methods use synchronous callbacks too:

```js
const numbers = [1, 2, 3];

const doubled = numbers.map(function double(number) {
    return number * 2;
});

console.log(doubled);
```

Output:

```text
[2, 4, 6]
```

`map` calls `double` once for each element while `map` itself is running. The callback is not sent to a timer or queue.

This gives us the first rule:

> “Callback” describes who calls the function, not how long JavaScript waits before calling it.

Some callbacks are synchronous. Some callbacks are asynchronous. Passing a function as an argument tells us nothing about timing by itself.

## Callbacks let us separate policy from action

Callbacks are useful even when no asynchronous work exists.

Suppose we want one calculator that can perform different operations:

```js
function calculate(first, second, operation) {
    return operation(first, second);
}

function add(first, second) {
    return first + second;
}

function multiply(first, second) {
    return first * second;
}

console.log(calculate(4, 5, add));
console.log(calculate(4, 5, multiply));
```

Output:

```text
9
20
```

`calculate` owns the common process: accept two values and use an operation. The callback supplies the changing decision: which operation should run?

This pattern appears everywhere:

- `map` asks how each item should be transformed.
- `filter` asks whether each item should remain.
- `sort` asks how two items should be ordered.
- An event target asks what should happen after an event.

The receiving function handles the **when** or **where**. The callback provides the **what**.

## Asynchronous callbacks need a host

Now apply that distinction to a timer:

```js
setTimeout(function timerCallback() {
    console.log("timer");
}, 5000);

function x(callback) {
    console.log("x");
    callback();
}

x(function y() {
    console.log("y");
});
```

Before moving on, predict the output.

It is:

```text
x
y
timer
```

Here is the flow.

### Step 1: Register the timer

The browser provides `setTimeout`. JavaScript gives it `timerCallback` and requests a delay of at least 5000 milliseconds.

The callback does not sit on the call stack while the browser tracks the timer. `setTimeout` returns, and the script continues.

### Step 2: Call x

JavaScript calls `x` with `y` as its argument.

```js
console.log("x");
```

This logs `x`.

### Step 3: Call y synchronously

Still inside `x`, this line runs:

```js
callback();
```

That calls `y`, which logs `y`. Then `y` returns, `x` returns, and the original script finishes.

### Step 4: Run the timer callback later

After the delay has elapsed and the timer task gets a turn, the browser causes `timerCallback` to run. It logs `timer`.

The two callbacks in this example follow different timing rules:

- `y` is a synchronous callback controlled directly by `x`.
- `timerCallback` is an asynchronous callback scheduled through a browser timer.

Callbacks do not create asynchrony on their own. The timer and the browser’s event-loop machinery create the asynchronous behavior. The callback tells the browser which JavaScript to run when the timer is ready.

For the complete scheduling model, read [JavaScript, the Browser, and the Event Loop](/articles/asynchronous-javascript-event-loop).

## Event listeners are long-lived callbacks

Event listeners are another common use of callbacks:

```js
const button = document.getElementById("clickMe");

button.addEventListener("click", function handleClick() {
    console.log("Button clicked");
});
```

Calling `addEventListener` registers `handleClick` and returns. It does not pause the script until someone clicks.

When the browser later dispatches a click event to the button, it calls the listener with an event object:

```js
button.addEventListener("click", function handleClick(event) {
    console.log(event.type);
    console.log(event.currentTarget);
});
```

Unlike `setTimeout`, an event listener is usually not a one-time callback. It can run on every matching event until it is removed or its target is no longer relevant.

Again, the contract matters:

- `map` calls its callback once per array element.
- `setTimeout` schedules one timer callback.
- `setInterval` may schedule repeated callbacks.
- `addEventListener` may call a listener every time the event occurs.

The function is just a function. The API decides how it will be used.

## Callbacks and closures work together

Callbacks become especially useful when they remember data from the place where they were created.

Consider a click counter with a global variable:

```js
let count = 0;

document.getElementById("clickMe").addEventListener("click", function () {
    count += 1;
    console.log("Button clicked", count);
});
```

This works, but any other code with access to the same scope can change `count`.

We can move the variable into a function:

```js
function attachCounter() {
    let count = 0;
    const button = document.getElementById("clickMe");

    button.addEventListener("click", function handleClick() {
        count += 1;
        console.log("Button clicked", count);
    });
}

attachCounter();
```

After `attachCounter` finishes, the listener still has access to `count`. The callback forms a closure over that binding.

The variable is no longer global, but “private and protected” would be too strong. The callback can still change it, and any other function created inside `attachCounter` could share access to it. The closure limits where the binding can be reached; it does not place the value inside a security vault.

For the full mental model, read [Closures in JavaScript: The Function’s Backpack](/articles/closures-function-backpack).

## Removing event listeners correctly

An event target keeps a reference to each registered listener. If a long-lived target keeps a callback, that callback may also keep its closed-over data reachable.

When a listener should stop with a feature or component lifecycle, remove it deliberately:

```js
const button = document.getElementById("clickMe");

function handleClick() {
    console.log("Button clicked");
}

button.addEventListener("click", handleClick);

// Later, when this behavior is no longer needed:
button.removeEventListener("click", handleClick);
```

The same function reference is important. This does not work:

```js
button.addEventListener("click", function () {
    console.log("Button clicked");
});

button.removeEventListener("click", function () {
    console.log("Button clicked");
});
```

Those two function expressions create two different function objects. The second one is not the listener that was registered.

An `AbortController` can make cleanup convenient when several listeners share one lifecycle:

```js
const controller = new AbortController();

button.addEventListener("click", handleClick, {
    signal: controller.signal,
});

// Later:
controller.abort();
```

Do not turn this into “every event listener always leaks memory.” Modern garbage collectors can reclaim unreachable structures. The practical risk appears when a listener is attached to something that remains reachable longer than the feature should, such as `window`, `document`, or a persistent application object.

Cleanup should follow ownership and lifecycle, not fear.

## A callback does not make heavy work non-blocking

Now consider this function:

```js
function heavyOperation() {
    let sum = 0;

    for (let index = 0; index < 1_000_000_000; index += 1) {
        sum += index;
    }

    console.log("Heavy operation completed", sum);
}

console.log("Start");
heavyOperation();
console.log("End");
```

The output is:

```text
Start
Heavy operation completed ...
End
```

While `heavyOperation` runs, the main thread cannot move to `End`, handle a click, or paint a new frame.

Could we fix it by putting the work in a callback?

```js
setTimeout(heavyOperation, 0);
console.log("Scheduled");
```

This lets `Scheduled` appear before the heavy loop begins, but the loop still blocks when the timer callback runs. We postponed the problem; we did not remove it.

Callbacks are a way to supply behavior. Asynchronous host APIs are a way to avoid waiting on the current stack. Neither one automatically moves CPU-heavy JavaScript to another thread.

For expensive computation, we may need to split the work into smaller tasks or move suitable work to a Web Worker.

## Passing a callback versus calling it

Suppose we have this function:

```js
function greet() {
    console.log("Hello");
}
```

This passes `greet` as a callback:

```js
setTimeout(greet, 1000);
```

This calls `greet` immediately and passes its return value to `setTimeout`:

```js
setTimeout(greet(), 1000);
```

Because `greet()` returns `undefined`, the second version is not giving the timer a function to call.

When the callback needs arguments, wrap the call in another function:

```js
function greet(name) {
    console.log(`Hello, ${name}`);
}

setTimeout(function greetLater() {
    greet("Harikesh");
}, 1000);
```

Or use an arrow function:

```js
setTimeout(() => greet("Harikesh"), 1000);
```

Read the punctuation carefully:

- `greet` means “use this function.”
- `greet()` means “call this function now.”
- `() => greet()` means “create another function that will call `greet` when that new function runs.”

## Callbacks transfer control

Callbacks are powerful because they let us hand behavior to another function or API. But that handoff also means giving up some control.

When you pass a callback, ask:

1. Will it run synchronously or asynchronously?
2. Will it run once, many times, or possibly never?
3. What arguments will it receive?
4. What happens if it throws an error?
5. Does its return value matter?
6. How is repeated or registered work cancelled?

With `map`, the answers are straightforward. With timers, events, network libraries, and older callback-based APIs, the contract becomes more important.

When several asynchronous callbacks depend on one another, indentation grows, error handling spreads, and control becomes difficult to follow. That is where **callback hell** begins, but that is the next lesson, not this one.

## What to remember

1. **A callback is a role.**  
   It is a function passed to other code so that code can call it.

2. **Callbacks are possible because functions are values.**  
   We can store, pass, and return them.

3. **Callbacks are not always asynchronous.**  
   `map` and our function `x` call their callbacks synchronously.

4. **Callbacks do not create asynchrony by themselves.**  
   A host API such as a timer or event system provides the asynchronous mechanism.

5. **A callback does not make slow JavaScript faster.**  
   Heavy callback code can still block the main thread when it runs.

6. **The receiving API defines the contract.**  
   It decides when, how often, and with which arguments the callback is called.

7. **Closures let callbacks retain useful state.**  
   That retained state should follow the lifetime of the callback that uses it.

JavaScript does not call a function a callback because the function is unusual. It calls it a callback because we handed it to someone else and said, “You decide when to call this.”

## Try it yourself

Predict the output before running this code:

```js
function run(callback) {
    console.log("Inside run");
    callback("from callback");
    console.log("Leaving run");
}

console.log("Start");

setTimeout(() => {
    console.log("Timer");
}, 0);

run(function message(value) {
    console.log(value);
});

console.log("End");
```

Then answer three questions:

1. Which callback is synchronous?
2. Which callback is asynchronous?
3. Which API controls the timing of each callback?

If you can answer those questions without saying “callbacks always run later,” the central idea is clear.

## Further reading

- [ECMAScript function objects](https://tc39.es/ecma262/#sec-ecmascript-function-objects)
- [Array.prototype.map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map)
- [EventTarget.addEventListener](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener)
- [EventTarget.removeEventListener](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener)
