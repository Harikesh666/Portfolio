---
title: "Closures in JavaScript: The Function's Backpack"
description: "How functions remember lexical scope, retain changing bindings, and use that memory for counters, currying, memoization, and async code."
category: "JavaScript"
readTime: "13 min read"
date: "November 2024"
publishedAt: "2024-11-05"
---

# Closures in JavaScript: The Function's Backpack

A closure is created every time a JavaScript function is created.

That sentence is short, but closures often take time to understand because they connect three ideas:

1. Functions can be stored and passed around like other values.
2. JavaScript uses lexical scope.
3. A function can outlive the call that created it.

Here is the mental model that makes those ideas easier to hold together:

> A closure is a function carrying a backpack filled with access to the bindings from the scope where it was created.

The backpack does not contain every value in the program. It gives the function a route back to the surrounding bindings it needs.

Let’s unpack that slowly.

## What is a closure?

A closure is the combination of:

1. A function
2. The lexical environment in which that function was created

This lets a function access variables from its surrounding scope even when the function executes somewhere else or at a later time.

Closures matter because they let functions:

- Retain state between calls
- Keep data private
- Create specialized functions from general ones
- Remember information inside callbacks
- Cache previous results

Closures are not a special mode that we switch on. They are part of how JavaScript functions and lexical scope work.

## Start with the smallest example

```js
function x() {
    const a = 7;

    function y() {
        console.log(a);
    }

    y();
}

x(); // 7
```

Why can `y` read `a`?

`a` is not declared inside `y`, so JavaScript looks in the scope surrounding `y`. The function was created inside `x`, where the binding `a` exists.

The scope chain looks like this:

```text
y's local scope
    ↓
x's local scope: a = 7
    ↓
global scope
```

JavaScript finds `a` in `x` and logs `7`.

This example demonstrates lexical scope, but it does not yet show the most surprising part of a closure. `y` runs while `x` is still active.

Let’s make `y` outlive `x`.

## A closure survives the outer function call

```js
function x() {
    const a = 7;

    function y() {
        console.log(a);
    }

    return y;
}

const z = x();

console.log(z); // The function y
z();            // 7
```

Walk through it step by step.

### Step 1: Call x

Calling `x()` creates a new execution context. Inside that call, JavaScript creates the binding `a` and the function `y`.

### Step 2: Create y inside x

Because `y` is created inside the lexical scope of `x`, it closes over the surrounding environment. Its backpack includes access to `a`.

### Step 3: Return y

`x` returns the function itself. It does not call `y`.

The variable `z` now points to the returned function:

```js
const z = x();
```

### Step 4: x leaves the call stack

The call to `x` is complete, so its execution context leaves the call stack.

At this point, it is reasonable to ask:

> If `x` has finished, why has `a` not disappeared?

Because `z` still refers to `y`, and `y` still needs the binding `a`. That binding remains reachable through the closure.

### Step 5: Call z

```js
z();
```

Calling `z` runs the original function `y`. It follows its lexical environment back to `a` and logs `7`.

The call stack frame for `x` is gone. The required lexical environment is not.

That difference is the power of closures.

## Scope depends on creation, not calling location

A common misunderstanding is that a function can access variables from whichever function calls it.

It cannot.

JavaScript uses lexical scope, so a function’s outer scope is determined by where the function was **created**, not where it was **called**.

```js
function x(callback) {
    const a = 7;
    callback();
}

function y() {
    console.log(a);
}

x(y); // ReferenceError: a is not defined
```

`x` calls `y` while `a` exists inside `x`, but `y` was created in the global scope. Its lexical scope does not include the local bindings of `x`.

The scope chain for `y` is:

```text
y's local scope
    ↓
global scope
```

The call happens inside `x`, but that does not insert `x` into `y`’s lexical scope.

Now move the function creation inside `x`:

```js
function x() {
    const a = 7;

    return function y() {
        console.log(a);
    };
}

const y = x();
y(); // 7
```

The function now closes over `x` because that is where it was created.

## Returning a function does not call it

Consider this version:

```js
function x() {
    const a = 7;

    return function y() {
        console.log(a);
    };
}

x();
```

Calling `x()` returns `y`, but nothing stores or invokes the returned function. There is no console output.

To use the returned closure, save it:

```js
const y = x();
y(); // 7
```

Or call it immediately:

```js
x()(); // 7
```

The first pair of parentheses calls `x`. The second pair calls the function returned by `x`.

## Closures remember bindings, not frozen snapshots

Now change `a` after creating `y`:

```js
function x() {
    let a = 7;

    function y() {
        console.log(a);
    }

    a = 100;
    return y;
}

const z = x();
z(); // 100
```

If the closure had copied the value `7` when `y` was created, the output would still be `7`.

Instead, the output is `100`.

The closure retains access to the **binding** named `a`. When that binding changes, `y` observes the current value.

This is more precise than saying closures “capture values” or “capture references.” They preserve access to lexical bindings.

That distinction becomes important in loops, asynchronous callbacks, and stateful functions.

## Nested closures can reach multiple scopes

```js
function z() {
    const b = 900;

    function x() {
        const a = 7;

        function y() {
            console.log(a, b);
        }

        y();
    }

    x();
}

z(); // 7 900
```

`y` can read both `a` and `b`.

Its scope chain is:

```text
y's local scope
    ↓
x's scope: a = 7
    ↓
z's scope: b = 900
    ↓
global scope
```

JavaScript searches outward one lexical environment at a time.

The closure does not flatten these scopes into one object. The chain preserves the nesting relationship that existed when `y` was created.

## Closures and garbage collection

When a function call finishes, its call stack frame is removed. That does not mean every value associated with the call is immediately destroyed.

Garbage collection follows reachability.

```js
function createReader() {
    const message = "Still here";

    return function read() {
        return message;
    };
}

const reader = createReader();
```

The returned `reader` is still reachable. It needs `message`, so the required lexical environment also remains reachable.

If the program later removes its last reference to `reader`, the closure and the captured environment can become eligible for garbage collection:

```js
let reader = createReader();
console.log(reader());

reader = null;
```

Closures do not disable garbage collection. They affect what remains reachable.

This is useful because state can survive as long as the function needs it. It can also retain more memory than expected if a long-lived closure captures a large object.

The practical rule is simple:

> Keep closures when their state is useful. Release long-lived callbacks and references when that state is no longer needed.

## Use case 1: A counter with private state

```js
function createCounter() {
    let count = 0;

    return function increment() {
        count += 1;
        return count;
    };
}

const counter = createCounter();

console.log(counter()); // 1
console.log(counter()); // 2
console.log(counter()); // 3
```

Each call to `counter` reads and updates the same `count` binding.

Code outside `createCounter` cannot directly access that binding:

```js
console.log(count); // ReferenceError
```

The closure provides controlled access to private state.

Create another counter and it receives independent state:

```js
const firstCounter = createCounter();
const secondCounter = createCounter();

console.log(firstCounter());  // 1
console.log(firstCounter());  // 2
console.log(secondCounter()); // 1
```

Each call to `createCounter` creates a new lexical environment and a new `count` binding.

## Use case 2: Currying and specialized functions

```js
function add(a) {
    return function addToA(b) {
        return a + b;
    };
}

const addFive = add(5);

console.log(addFive(3));  // 8
console.log(addFive(10)); // 15
```

Calling `add(5)` creates a function whose backpack includes the binding `a = 5`.

`addFive` is now a specialized function. It does not need to receive `5` again.

You can create other versions from the same factory:

```js
const addTen = add(10);

console.log(addTen(3)); // 13
```

Each returned function closes over a different `a`.

## Use case 3: Run a function only once

```js
function once(fn) {
    let called = false;
    let result;

    return function runOnce(...args) {
        if (!called) {
            called = true;
            result = fn(...args);
        }

        return result;
    };
}

const startApp = once(() => {
    console.log("App started!");
    return "ready";
});

console.log(startApp()); // Logs "App started!", then "ready"
console.log(startApp()); // Only logs "ready"
```

The returned function remembers both `called` and `result`.

The first call runs `fn` and saves its result. Later calls return the saved result without running `fn` again.

This pattern can protect initialization work that should happen only once.

## Use case 4: Memoization

Memoization stores results so repeated inputs do not require repeated work.

```js
function memoize(fn) {
    const cache = new Map();

    return function memoized(value) {
        if (cache.has(value)) {
            return cache.get(value);
        }

        const result = fn(value);
        cache.set(value, result);
        return result;
    };
}

const square = memoize((value) => {
    console.log("Calculating...");
    return value * value;
});

console.log(square(5)); // Calculates, then returns 25
console.log(square(5)); // Returns cached 25
```

The `cache` binding survives because the returned function closes over it.

This example accepts one primitive argument. Real memoization utilities need a cache-key strategy that matches their inputs and memory requirements.

## Use case 5: Remembering data in asynchronous callbacks

```js
function delayedMessage(message, delay) {
    setTimeout(function showMessage() {
        console.log(message);
    }, delay);
}

delayedMessage("Hello!", 1000);
```

`delayedMessage` finishes long before the timer callback runs. The callback can still read `message` because it was created inside the lexical environment of that call.

Call the function twice:

```js
delayedMessage("First", 500);
delayedMessage("Second", 1000);
```

Each call creates a different `message` binding. Each callback carries the correct one in its backpack.

This pattern appears in event handlers, promise callbacks, request handlers, and scheduled work.

## Use case 6: A closure-based iterator

```js
function createIterator(values) {
    let index = 0;

    return function next() {
        if (index >= values.length) {
            return { done: true, value: undefined };
        }

        const value = values[index];
        index += 1;

        return { done: false, value };
    };
}

const next = createIterator(["a", "b"]);

console.log(next()); // { done: false, value: "a" }
console.log(next()); // { done: false, value: "b" }
console.log(next()); // { done: true, value: undefined }
```

The returned function remembers its current `index`.

JavaScript generators provide dedicated language machinery for pausing and resuming execution. A closure-based iterator is still useful because it shows how retained state can produce controlled iteration.

## Why closures matter

Closures are not only an interview topic. They are underneath ordinary JavaScript patterns:

- A callback remembers variables from the code that registered it.
- A factory returns functions configured with earlier arguments.
- A module exposes methods while hiding internal state.
- A memoized function keeps its cache between calls.
- An iterator remembers its current position.

The same mechanism powers all of them: a function retains access to the lexical bindings from where it was created.

## Key takeaways

1. **A closure is a function plus its lexical environment.**
2. **Closures are created when functions are created.**
3. **Scope depends on where a function is created, not where it is called.**
4. **A returned function can outlive the call that created it.**
5. **Closures retain access to bindings, not frozen copies of values.**
6. **Captured environments remain in memory while they are reachable.**
7. **Counters, currying, memoization, callbacks, and iterators all use the same mechanism.**

When closure code feels confusing, ask three questions:

1. Where was this function created?
2. Which outer bindings does it use?
3. What still holds a reference to the function?

Those questions usually reveal what is inside the function’s backpack and why it is still there.

## Try it yourself

Start with the counter:

```js
function createCounter() {
    let count = 0;

    return function increment() {
        count += 1;
        return count;
    };
}
```

Change it so that `createCounter` accepts a starting value and a step:

```js
const counter = createCounter(10, 5);

console.log(counter()); // 15
console.log(counter()); // 20
```

Before writing the code, identify the bindings the returned function must carry in its backpack.

## Further reading

- [Closures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures)
- [JavaScript execution model](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model)
- [ECMAScript environment records](https://tc39.es/ecma262/#sec-environment-records)
