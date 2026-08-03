---
title: "setTimeout, Closures, and the Famous Loop Problem"
description: "Why delayed callbacks share one var binding, how let creates a binding per loop iteration, and how helper functions preserve each value."
category: "JavaScript"
readTime: "15 min read"
date: "February 2025"
publishedAt: "2025-02-14"
---

# setTimeout, Closures, and the Famous Loop Problem

There is a small JavaScript puzzle that has surprised almost everyone at least once:

```js
for (var i = 1; i <= 5; i++) {
    setTimeout(function () {
        console.log(i);
    }, i * 1000);
}
```

The delays are different. The loop visits `1`, `2`, `3`, `4`, and `5`. Surely the output should follow those values.

Instead, the console prints:

```text
6
6
6
6
6
```

It looks as if `setTimeout`, closures, and `var` made a private agreement behind our backs.

They did not. Each feature is following its own rule:

1. `setTimeout` schedules a callback for later.
2. A closure keeps access to bindings from where the callback was created.
3. `var` gives the entire loop one function-scoped binding.
4. The loop finishes before any of those delayed callbacks run.

The strange output appears where those four rules meet.

Let’s rebuild the puzzle from the smallest example and change one piece at a time.

## Three ideas before the first timer

A **callback** is a function passed to other code so that code can call it later or at another useful moment.

A **closure** is a function together with access to the bindings from the scope where the function was created. A binding is the connection between a name and its current value. Think of it as a labeled slot.

And `setTimeout` is a host API. In a browser, the browser tracks the timer. The JavaScript call stack does not remain paused with the callback sitting on it.

One correction matters from the beginning:

> `setTimeout` does not create the closure. JavaScript creates the callback function, and that function closes over the bindings around it. `setTimeout` merely schedules that callback.

For the complete timer model, read [setTimeout Has Trust Issues](/writing/settimeout-minimum-not-deadline). For the full closure model, read [Closures in JavaScript: The Function's Backpack](/writing/closures-function-backpack).

Now we can follow the original examples.

## Example 1: One timer, one var binding

```js
function x() {
    var i = 1;

    setTimeout(function () {
        console.log(i);
    }, 1000);
}

x();
```

The output is:

```text
1
```

No surprise yet, but the reason matters.

### What happens during x

Calling `x()` creates a function execution context, the runtime workspace JavaScript needs for this particular call. Inside it, the local `i` binding begins with the value `1`.

JavaScript then creates the timer callback:

```js
function () {
    console.log(i);
}
```

That callback uses `i`, but it does not declare an `i` of its own. Because it was created inside `x`, its scope chain, the lookup path from the current scope outward, leads to the `i` binding belonging to this call of `x`.

The browser begins tracking a timer with a minimum delay of 1000 milliseconds. `setTimeout` returns, and `x` finishes.

### Why i is still available

The call to `x` has left the call stack, the running list of active function calls. But the timer system still has a reference to the callback. The callback still needs `i`, so the required environment remains reachable through the closure.

When the callback eventually gets a turn, it follows its closure back to `i` and reads the current value, which is still `1`.

The closure did not keep the whole function call running. It kept the required binding reachable.

## Closures remember bindings, not frozen screenshots

Before adding a loop, change the binding after scheduling the callback:

```js
function x() {
    var i = 1;

    setTimeout(function () {
        console.log(i);
    }, 1000);

    i = 42;
}

x();
```

What gets printed?

```text
42
```

The callback did not receive a frozen copy of `1`. It retained access to the `i` binding. That binding later changed to `42`, so `42` is what the callback reads.

Keep this sentence nearby because it explains the entire loop problem:

> A closure reads the binding when the callback runs, not necessarily the value that existed when the callback was created.

## Example 2: JavaScript does not wait politely

The second original example adds one immediate log:

```js
function x() {
    var i = 1;

    setTimeout(function () {
        console.log(i);
    }, 3000);

    console.log("Time, Tide and JavaScript waits for none");
}

x();
```

The output is:

```text
Time, Tide and JavaScript waits for none
1
```

The grammar may make an English teacher suspicious, but the line captures the idea perfectly.

`setTimeout` registers the timer and returns. It does not stop `x` for three seconds. JavaScript immediately reaches the next `console.log`, so the sentence appears first.

After at least three seconds, the timer callback becomes eligible to run. It still has to wait until the event loop gives it a turn and the main thread is available. Only then does it read `i` and print `1`.

The delay means "not before this much time has passed." It does not mean "run at this exact millisecond."

## Example 3: The var loop prints 6 five times

Now we reach the famous version:

```js
function x() {
    for (var i = 1; i <= 5; i++) {
        setTimeout(function () {
            console.log(i);
        }, i * 1000);
    }

    console.log("Namaste");
}

x();
```

The output is:

```text
Namaste
6
6
6
6
6
```

Why `6`? Why five times? And why does `Namaste` arrive before everyone?

### The loop has only one i binding

`var` is function-scoped. The loop body does not create a fresh `i` binding for each iteration.

There is one labeled slot:

```text
x environment
└── i
```

Every iteration changes the value inside that same slot:

```text
iteration 1: i becomes 1
iteration 2: i becomes 2
iteration 3: i becomes 3
iteration 4: i becomes 4
iteration 5: i becomes 5
loop ends:   i becomes 6
```

Each callback is created inside the same function scope. Each one closes over the same `i` binding.

It is tempting to say that all callbacks "capture the final value." That wording can mislead us. They do not know the final value while they are being created. They all keep access to the same binding, and that binding contains `6` by the time they read it.

### Why the loop reaches 6

The loop continues while this condition is true:

```js
i <= 5
```

During the fifth iteration, `i` is `5`. After that iteration, the update expression runs:

```js
i++
```

Now `i` is `6`. The condition `6 <= 5` is false, so the loop stops.

The value `6` is not random. It is the first value that fails the loop condition.

### Why Namaste appears first

Scheduling five timers is quick. JavaScript does not wait one second during the first iteration, two seconds during the second, and so on.

It registers all five timers, finishes the loop, and immediately logs:

```text
Namaste
```

By the time the first timer callback can run, the ordinary call to `x` has completed and the shared `i` binding contains `6`.

The callbacks become eligible at different minimum delays, so they usually print one `6` around each second. The exact times can be later if the main thread is busy.

## Example 4: let creates a binding for each iteration

Now change one word:

```js
function x() {
    for (let i = 1; i <= 5; i++) {
        setTimeout(function () {
            console.log(i);
        }, i * 1000);
    }

    console.log("Namaste");
}

x();
```

The output becomes:

```text
Namaste
1
2
3
4
5
```

It is common to explain this by saying, "`let` is block-scoped." That is true, but it is not the complete reason.

For a `for` loop whose initializer uses `let`, JavaScript creates a fresh binding for the next iteration. Each callback closes over the binding for its own iteration.

The picture now looks like this:

```text
iteration 1 environment → i = 1 → callback 1
iteration 2 environment → i = 2 → callback 2
iteration 3 environment → i = 3 → callback 3
iteration 4 environment → i = 4 → callback 4
iteration 5 environment → i = 5 → callback 5
```

The callbacks are not fighting over one shared slot anymore.

When the first callback runs, its `i` binding contains `1`. The second callback has another binding containing `2`, and so on.

This is why changing `var` to `let` fixes the loop. It changes the binding structure, not the speed of the timers and not the nature of closures.

## Example 5: A helper function gives var a fresh binding

What if we must use `var`? The original article solves that with a helper function:

```js
function x() {
    for (var i = 1; i <= 5; i++) {
        function close(i) {
            setTimeout(function () {
                console.log(i);
            }, i * 1000);
        }

        close(i);
    }

    console.log("Namaste");
}

x();
```

The output is again:

```text
Namaste
1
2
3
4
5
```

The loop still has one function-scoped `var i`. That part has not changed.

The important change is this call:

```js
close(i);
```

Every call to `close` creates a new function execution context with a new parameter binding named `i`.

During the first iteration:

```text
outer var i = 1
close parameter i = 1
callback closes over close's parameter
```

During the second iteration, `close` is called again. That call gets another parameter binding containing `2`. The pattern repeats for all five calls.

The timer callbacks no longer close directly over the loop's shared `var i`. Each one closes over the parameter binding belonging to a different call of `close`.

The helper function does not freeze the outer variable. It creates a fresh local binding and passes the current number into it.

Before `let` became common, this was a standard way to preserve each iteration's value for an asynchronous callback. An immediately invoked function expression, or IIFE, was often used for the same reason:

```js
for (var i = 1; i <= 5; i++) {
    (function (current) {
        setTimeout(function () {
            console.log(current);
        }, current * 1000);
    })(i);
}
```

The syntax is different, but the mechanism is the same. Each function call creates a separate parameter binding.

## Example 6: The parameter name is not magic

The final original example renames the helper parameter:

```js
function x() {
    for (var i = 1; i <= 5; i++) {
        function close(x) {
            setTimeout(function () {
                console.log(x);
            }, x * 1000);
        }

        close(i);
    }

    console.log("Namaste");
}

x();
```

The output stays the same:

```text
Namaste
1
2
3
4
5
```

The name `i` was never the trick.

The outer loop has a binding named `i`. The helper function has a parameter binding named `x`. When we call `close(i)`, JavaScript reads the current value from the outer `i` binding and uses that value to initialize the new parameter binding `x`.

Each call to `close` gets a different `x` binding:

```text
close call 1 → x = 1
close call 2 → x = 2
close call 3 → x = 3
close call 4 → x = 4
close call 5 → x = 5
```

Each timer callback closes over the `x` belonging to its own helper call.

Renaming a variable does not change closure behavior. Creating a new binding does.

## Put the six examples side by side

| Example | Binding reached by the callback | Result |
|---|---|---|
| One timer with `var` | The `i` binding from one call to `x` | `1` |
| Immediate log plus timer | The same unchanged `i` binding | Message first, then `1` |
| `var` loop | One shared loop binding | `6` five times |
| `let` loop | A different binding for each iteration | `1` through `5` |
| Helper parameter named `i` | A different parameter binding for each call | `1` through `5` |
| Helper parameter named `x` | The same mechanism with another name | `1` through `5` |

The timer delay changes when each callback becomes eligible. The binding structure changes what each callback reads.

Those are separate questions. Mixing them is what makes the puzzle feel harder than it is.

## Common explanations that almost work

### setTimeout stores the value

Not here. `setTimeout` receives a function. The function later reads through its closure.

### var belongs to the loop block

It does not. A `var` declared inside an ordinary loop belongs to the surrounding function, or to the top-level scope when there is no surrounding function.

### Every callback gets a copy of i

Not in the `var` loop. Every callback reaches the same binding.

### let freezes the value

No freezing is involved. The loop creates a new binding for each iteration. Each callback simply reaches a different binding.

### A one-second timeout runs exactly one second later

The delay is a minimum. The callback waits for its timer to mature and then waits for the event loop to give the scheduled work a turn.

## How to debug this kind of code

When delayed code reads a loop variable, ask these questions in order:

1. **When is the callback created?**
2. **Which binding does it close over?**
3. **Do all iterations share that binding?**
4. **Can the binding change before the callback runs?**
5. **When does the synchronous loop finish?**
6. **When can each timer task actually run?**

Do not begin with the delay. Begin with the binding.

For the `var` loop, the shortest correct explanation is:

> The five callbacks share one `i` binding. The loop changes that binding to `6` before any callback runs, so every callback reads `6`.

For the `let` loop:

> Each iteration gets its own `i` binding, so each callback reads the binding created for its iteration.

And for the helper function:

> Each call creates a new parameter binding, so each callback closes over a different call's parameter.

## What to remember

1. **A closure retains access to bindings, not frozen snapshots of values.**
2. **`setTimeout` schedules a callback; it does not create the closure or pause JavaScript.**
3. **A `var` loop uses one function-scoped binding shared by all callbacks.**
4. **The loop reaches `6` before the delayed callbacks run.**
5. **A `let` loop creates a fresh binding for each iteration.**
6. **A helper function works because every call creates fresh parameter bindings.**
7. **Changing the parameter name changes nothing. Creating a new binding changes everything.**
8. **Timer delays are minimum waiting times, not exact execution deadlines.**

Once you separate timing from binding lookup, the famous loop problem stops being a trick question.

The timers decide **when** the callbacks get a turn. The closures and scopes decide **which `i`** they read when that turn finally arrives.

## Further reading

- [MDN: setTimeout](https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout)
- [MDN: Closures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures)
- [ECMAScript for-loop runtime semantics](https://tc39.es/ecma262/#sec-for-statement-runtime-semantics-labelledevaluation)
