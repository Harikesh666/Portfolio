---
title: "How JavaScript Keeps Track of Running Code"
description: "Understand execution contexts, the call stack, and how asynchronous code fits into JavaScript's single-threaded execution model."
category: "JavaScript"
readTime: "14 min read"
date: "January 2025"
publishedAt: "2025-01-30"
---

# How JavaScript Keeps Track of Running Code

JavaScript runs code inside something called an **execution context**.

You can think of an execution context as a container, or an environment, where JavaScript keeps everything it needs while some code is running.

That sounds simple enough. But what does JavaScript actually need to keep?

Suppose one function calls another. JavaScript has to remember:

- The variables that belong to each function
- The arguments passed to the current function
- Which line it was executing before the new function call
- Where it should return when that function finishes
- Which outer scopes it can search for a variable

It cannot forget the first function just because a second function has started. It needs a way to pause one piece of work, run another, and then continue from exactly where it stopped.

Execution contexts and the **call stack** are how it keeps track of all of that.

## Execution context in JavaScript

An execution context has two primary components in the usual beginner-friendly model:

1. The **variable environment**, also called the memory component
2. The **thread of execution**, also called the code component

```text
Execution context
├── Variable environment: variables and functions
└── Thread of execution: code running line by line
```

These two components answer two different questions:

- What values and functions are available to this code?
- Which part of the code is JavaScript executing now?

Let’s look at them separately.

### 1. Variable environment: the memory component

The variable environment stores the bindings for variables and function declarations.

For example:

```js
var score = 10;

function double(value) {
    return value * 2;
}
```

Before JavaScript executes the statements, it prepares the declarations it will need.

For this code, the simplified picture is:

```text
score  → undefined
double → function
```

The important detail is that different declarations are prepared differently:

- A `var` binding begins with `undefined`.
- A function declaration is available as a complete function.
- `let` and `const` bindings are created, but you cannot access them before their declarations are evaluated.

This is why a function declaration can usually be called before it appears in the file, while reading a `let` or `const` too early throws an error.

People often call this behavior **hoisting**, but JavaScript does not physically move your code to the top. It prepares bindings before it begins evaluating the statements.

The full difference is covered in [JavaScript Hoisting Does Not Move Your Code](/writing/javascript-hoisting-does-not-move-code).

One small correction to the memory-component model: this is not the same thing as the JavaScript heap. The heap stores objects and other runtime data. The variable environment describes how names such as `score` and `double` are connected to their values.

The simpler model is still useful. Just remember that it represents JavaScript’s bookkeeping, not a literal box you could find inside the engine.

### 2. Thread of execution: the code component

The thread of execution is where JavaScript evaluates the code line by line.

```js
var score = 10;
var doubledScore = score * 2;

console.log(doubledScore);
```

During execution:

1. JavaScript reaches `var score = 10` and assigns `10` to `score`.
2. It reads `score`, calculates `20`, and assigns it to `doubledScore`.
3. It calls `console.log` with the value `20`.

JavaScript does not execute all three lines at once. It evaluates one step, completes what that step requires, and then moves forward.

That brings us to the two phases of an execution context.

## The two phases

When JavaScript enters a script or calls a function, we can understand what happens in two broad phases.

### 1. Creation phase

During the creation phase, the JavaScript engine scans the relevant declarations and prepares memory for them.

```js
console.log(message);
greet();

var message = "Hello";

function greet() {
    console.log("Welcome");
}
```

Before the statements run:

- `message` exists with the value `undefined`.
- `greet` exists as a function.

So the first log prints `undefined`, and the call to `greet()` works.

This does **not** mean that every declaration receives a useful value during creation. A `var` gets `undefined`, but its assignment still happens later. A `let` or `const` exists but stays inaccessible until JavaScript evaluates its declaration.

### 2. Execution phase

After preparing the declarations, the engine starts executing the code.

It goes through the statements in order, reads values from the environment, performs calculations, updates variables, and calls functions.

When it reaches this line:

```js
var message = "Hello";
```

the value of `message` changes from `undefined` to `"Hello"`.

And whenever JavaScript calls a function, it creates another execution context for that particular call.

That last part is where the call stack becomes important.

## JavaScript is synchronous and single-threaded

JavaScript is commonly described as **synchronous and single-threaded**.

Single-threaded means one JavaScript thread executes one piece of JavaScript at a time.

Synchronous means that ordinary statements run in sequence. JavaScript does not casually skip a function call, execute the next line, and return whenever it feels like it. The caller waits for the called function to finish.

```js
console.log("First");
console.log("Second");
console.log("Third");
```

The output is:

```text
First
Second
Third
```

But functions can be nested. One function can call another, which can call another, which can call another.

If JavaScript can execute only one of them at a time, how does it remember where it came from?

It uses the call stack.

## Call stack: managing execution order

The call stack manages execution contexts and keeps track of function calls.

When a function is called:

1. JavaScript creates an execution context for that call.
2. It pushes the new context onto the call stack.
3. That function becomes the code currently running.

When the function completes:

1. Its execution context is popped from the stack.
2. JavaScript returns to the context below it.
3. The previous function continues from where it stopped.

The stack follows **last in, first out**.

The last function placed on the stack is the first one that must leave.

## Example of the call stack in action

Consider the original example:

```js
function first() {
    console.log("Inside first function");
    second();
    console.log("Exiting first function");
}

function second() {
    console.log("Inside second function");
}

first();
```

Before looking at the explanation, try to predict the output.

```text
Inside first function
Inside second function
Exiting first function
```

Why does `"Exiting first function"` appear last even though it is inside the function that started first?

Let’s follow the calls.

### 1. The script starts

JavaScript begins with the script’s execution context:

```text
Top
┌─────────────────┐
│ Script          │
└─────────────────┘
Bottom
```

The declarations for `first` and `second` are prepared. Then JavaScript reaches `first()`.

### 2. `first()` is called

A new execution context for `first` is created and pushed onto the stack:

```text
Top
┌─────────────────┐
│ first()         │
├─────────────────┤
│ Script          │
└─────────────────┘
Bottom
```

`first` logs:

```text
Inside first function
```

Then it reaches `second()`.

### 3. `second()` is called

JavaScript creates another execution context and pushes it on top:

```text
Top
┌─────────────────┐
│ second()        │
├─────────────────┤
│ first()         │
├─────────────────┤
│ Script          │
└─────────────────┘
Bottom
```

`first` has not disappeared. It is waiting underneath `second`.

`second` logs:

```text
Inside second function
```

It has no more work to do, so it completes.

### 4. JavaScript returns to `first`

The execution context for `second` is popped from the stack:

```text
Top
┌─────────────────┐
│ first()         │
├─────────────────┤
│ Script          │
└─────────────────┘
Bottom
```

JavaScript returns to the exact point after the `second()` call. Now `first` can run:

```js
console.log("Exiting first function");
```

After that, `first` completes and its context is also popped from the stack.

This is why the order is `first → second → first`. The first function pauses while the second function is on top of the stack.

## The stack also carries return values

The call stack does more than remember function names. It also lets JavaScript return a result to the correct caller.

```js
function add(first, second) {
    return first + second;
}

function calculateTotal() {
    const total = add(10, 20);
    return total * 2;
}

console.log(calculateTotal());
```

When `calculateTotal` calls `add`, it pauses here:

```js
const total = add(10, 20);
```

`add` returns `30`. Its context leaves the stack, and `calculateTotal` continues with `30` as the result of the call.

It multiplies that value by `2` and returns `60` to the script.

So each active call needs enough information to answer two questions:

- Where should execution continue?
- What should happen with the returned value?

## The call stack is not the scope chain

This distinction is easy to miss.

The call stack tells JavaScript **who called whom**. Scope tells JavaScript **where a variable can be found**.

Those are not the same question.

```js
const message = "global";

function printMessage() {
    console.log(message);
}

function caller() {
    const message = "caller";
    printMessage();
}

caller();
```

The output is:

```text
global
```

When `printMessage` runs, `caller` is directly below it on the stack. But `printMessage` does not search `caller` for variables.

It searches the scope where it was **defined**. Since `printMessage` was defined in the global scope, it finds the global `message`.

The stack records the path of calls. The lexical environment records the path of variable lookup.

## A new scope does not always mean a new call

A block can create a scope without calling a function:

```js
function example() {
    const outside = "function";

    {
        const inside = "block";
        console.log(outside, inside);
    }
}
```

The inner block creates a place for the `inside` binding, but it does not create another function call.

So it helps to keep these ideas separate:

- Function calls create new function execution contexts.
- Blocks can create new lexical environments.
- Both affect what JavaScript is doing, but they are not interchangeable.

## Closures do not keep old calls on the stack

Closures can make the picture look strange at first:

```js
function createCounter() {
    let count = 0;

    return function increment() {
        count += 1;
        return count;
    };
}

const counter = createCounter();

console.log(counter());
console.log(counter());
```

The output is:

```text
1
2
```

You might think the execution context for `createCounter` must still be sitting somewhere on the stack. Otherwise, how can `count` still exist?

But `createCounter` has already returned. Its call is gone from the stack.

What remains reachable is the lexical environment containing `count`. The returned `increment` function keeps access to that environment.

When `counter()` is called, JavaScript creates a **new** execution context for `increment`. That new call can still reach the preserved `count` binding.

Closures preserve access to bindings. They do not keep completed function calls permanently on the stack.

The complete closure model is explained in [Closures in JavaScript: The Function’s Backpack](/writing/closures-function-backpack).

## Recursion keeps adding calls

A function can call itself:

```js
function countdown(number) {
    if (number === 0) {
        return;
    }

    console.log(number);
    countdown(number - 1);
}

countdown(3);
```

Each call gets its own execution context:

```text
countdown(3)
countdown(3) → countdown(2)
countdown(3) → countdown(2) → countdown(1)
countdown(3) → countdown(2) → countdown(1) → countdown(0)
```

Once the base case returns, the calls leave in reverse order.

But the stack has a limit. If the function keeps calling itself without reaching a base case, the engine eventually runs out of stack space:

```js
function forever() {
    forever();
}

forever();
```

You will usually see an error such as:

```text
RangeError: Maximum call stack size exceeded
```

The exact limit depends on the engine. The important point is that every unfinished recursive call occupies stack space.

## The role of AJAX and asynchronous code

This is where JavaScript can sound contradictory.

We say JavaScript is synchronous and single-threaded. Then we talk about AJAX, timers, events, promises, and asynchronous code.

So which one is it?

JavaScript executes one piece of JavaScript at a time, but the **runtime environment** can manage work outside the current JavaScript call stack.

In a browser, that environment provides Web APIs for things such as:

- Timers
- Network requests
- DOM events
- User interaction

Consider a timer:

```js
function scheduleMessage() {
    setTimeout(function showMessage() {
        console.log("Later");
    }, 1000);
}

scheduleMessage();
```

Here is the broad sequence:

1. `scheduleMessage` gets an execution context.
2. It calls `setTimeout` and gives the browser the `showMessage` callback.
3. `scheduleMessage` finishes and leaves the stack.
4. The browser keeps track of the timer outside the JavaScript call stack.
5. After the delay, the callback becomes eligible to run as a task.
6. When the event loop selects that task, JavaScript calls `showMessage` and creates a new execution context for it.

The original `scheduleMessage` call does not remain on the stack for one second. It ends normally. The callback runs later on a new stack.

That is how JavaScript can remain single-threaded while the browser handles waiting in the background.

AJAX follows the same broad idea. AJAX means **Asynchronous JavaScript and XML**, although modern applications commonly use JSON and `fetch` instead of XML and `XMLHttpRequest`.

The browser handles the network operation. When the result is ready, later JavaScript processes it through a callback or promise reaction.

AJAX does not create a second JavaScript thread for your function. It lets the runtime perform the waiting without keeping the current call stack blocked.

## What about promises and `await`?

Promise callbacks also run later, but they use the microtask queue:

```js
console.log("Start");

Promise.resolve().then(function showResult() {
    console.log("Promise");
});

console.log("End");
```

The output is:

```text
Start
End
Promise
```

The current script finishes before `showResult` runs. When the promise reaction runs, JavaScript creates the execution context needed for that callback.

`await` uses promises to suspend part of an async function:

```js
async function loadUser() {
    const response = await fetch("/api/user");
    const user = await response.json();

    return user;
}
```

When `loadUser` reaches a pending `await`, it does not freeze the call stack until the request finishes. The async function pauses, returns a promise to its caller, and allows other JavaScript to run.

When the awaited promise settles, the remaining part of the function can continue through the promise-job system.

The event-loop article goes deeper into tasks and microtasks: [JavaScript, the Browser, and the Event Loop](/writing/asynchronous-javascript-event-loop).

## Keep the pieces separate

These terms are related, but they are not different names for the same thing:

- The **JavaScript engine** parses and executes JavaScript.
- An **execution context** keeps the information needed while code is being evaluated.
- The **variable environment** provides bindings for variables and functions.
- The **call stack** tracks active function calls and where execution should return.
- The **runtime environment** provides timers, network access, DOM events, and other APIs.
- The **event loop** decides when ready tasks and microtasks get a chance to execute.

If you mix all of these into one idea, asynchronous JavaScript feels like magic. Once you separate them, the behavior becomes much easier to follow.

The engine itself is covered in [How the JavaScript Engine Runs Your Code](/writing/how-javascript-engine-runs-code).

## What to remember

1. An execution context is the environment in which JavaScript evaluates code.
2. The variable environment keeps track of bindings such as variables and functions.
3. The thread of execution evaluates the code step by step.
4. JavaScript prepares declarations before it executes statements.
5. Every function call creates execution state for that particular call.
6. The call stack tracks active calls using last in, first out.
7. The stack and the scope chain answer different questions.
8. Asynchronous operations do not leave the original function sitting on the stack.
9. Callbacks and promise reactions receive new execution contexts when they run later.

The call stack is JavaScript’s way of remembering one simple thing:

> “I was running this code, then I called that function. When it finishes, where should I continue?”

Once that clicks, function calls, recursion, stack traces, callbacks, and even `await` stop looking like separate tricks. They become different parts of the same execution story.

## Try it yourself

Draw the call stack after every function call and return:

```js
const multiplier = 2;

function double(value) {
    return multiply(value, multiplier);
}

function multiply(first, second) {
    return first * second;
}

function printResult(value) {
    const result = double(value);
    console.log(result);
}

printResult(5);
```

Then answer these questions:

1. Which function is on top of the stack when `multiply` runs?
2. Where does `multiply` find `first` and `second`?
3. Why can `double` access `multiplier`?
4. Where does the result return after `multiply` completes?
5. In what order do the function calls leave the stack?

Finally, place `printResult(5)` inside a timer callback. Which calls finish before the timer fires, and which execution contexts are created later?

## Further reading

- [ECMAScript execution contexts](https://tc39.es/ecma262/#sec-execution-contexts)
- [JavaScript execution model](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model)
- [Memory management](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Memory_management)
- [async function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function)
