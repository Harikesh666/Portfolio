---
title: "Callback Hell: When JavaScript Starts Leaning Sideways"
description: "How dependent asynchronous callbacks create the pyramid of doom, scatter errors, surrender control, and how promises and async functions restore structure."
category: "JavaScript"
topic: "async-and-concurrency"
order: 5
readTime: "14 min read"
date: "January 2025"
publishedAt: "2025-01-12"
---

# Callback Hell: When JavaScript Starts Leaning Sideways

```js
console.log("Namaste");
console.log("JavaScript");
console.log("Season 2");
```

The JavaScript engine executes these statements one after another:

```text
Namaste
JavaScript
Season 2
```

No suspense. No waiting. No plot twist.

JavaScript code on the main thread runs one job at a time, and each job runs to completion. Give the engine ordinary synchronous statements, and it will move through them as quickly as it can.

Time, tide, and JavaScript wait for none.

But what if we really need to wait for something?

What if we must create an order, wait for its ID, use that ID to process a payment, wait for the payment, show the order summary, and then update the wallet?

One callback is easy. Four dependent callbacks can make the code start leaning to the right. Add errors, retries, and cancellation, and soon nobody wants to touch it.

Welcome to callback hell.

## First, callbacks are not the problem

A callback is a function passed to other code so that the receiving code can call it.

```js
function greet(name, callback) {
    console.log(`Hello, ${name}`);
    callback();
}

greet("Harikesh", function finishGreeting() {
    console.log("Nice to meet you");
});
```

There is nothing hellish here. The callback runs synchronously, the order is clear, and the code is easy to read.

Callbacks also work perfectly well for array methods:

```js
const prices = [100, 200, 300];
const discounted = prices.map((price) => price * 0.9);
```

The problem begins when several **asynchronous operations depend on the result of the previous operation**, and the API communicates each result by calling another callback.

If callback functions themselves still feel unclear, start with [Callback Functions: JavaScript Calls You Back](/articles/callback-functions-javascript-calls-you-back).

## One asynchronous callback is manageable

Imagine an old callback-based API for creating an order:

```js
const cart = ["shoes", "shirt", "watch"];

createOrder(cart, function orderCreated(orderId) {
    console.log("Order created:", orderId);
});
```

`createOrder` starts some work and returns. Later, when the operation succeeds, it calls `orderCreated` with the new order ID.

That is still easy to follow:

1. Start creating the order.
2. Wait without blocking the current JavaScript stack.
3. Receive the order ID through the callback.

Now the order ID must be used to make a payment.

## Dependent work creates nesting

We cannot call `proceedToPayment` before we have an `orderId`, so the second operation goes inside the first callback:

```js
createOrder(cart, function orderCreated(orderId) {
    proceedToPayment(orderId, function paymentCompleted(paymentInfo) {
        console.log("Payment completed:", paymentInfo);
    });
});
```

Then we need to show the summary:

```js
createOrder(cart, function orderCreated(orderId) {
    proceedToPayment(orderId, function paymentCompleted(paymentInfo) {
        showOrderSummary(paymentInfo, function summaryShown(summary) {
            console.log(summary);
        });
    });
});
```

Then update the wallet:

```js
createOrder(cart, function orderCreated(orderId) {
    proceedToPayment(orderId, function paymentCompleted(paymentInfo) {
        showOrderSummary(paymentInfo, function summaryShown(summary) {
            updateWallet(summary, function walletUpdated(balance) {
                console.log("Wallet balance:", balance);
            });
        });
    });
});
```

Look at the shape of the code. It keeps moving right, then closes with a small festival of braces and parentheses.

This shape is called the **pyramid of doom**.

```text
startOperation(function () {
    nextOperation(function () {
        anotherOperation(function () {
            finalOperation(function () {
                // Send help.
            });
        });
    });
});
```

Indentation is the visible symptom. The deeper problem is that the program’s sequence, data, errors, and ownership are tangled across several nested function boundaries.

## Why callback hell is difficult

Deep nesting is ugly, but ugliness alone is not a technical argument. Let’s identify what actually becomes difficult.

### The sequence is harder to scan

In synchronous code, the next step normally appears on the next line. In nested callback code, the next step appears one level deeper.

To understand the order flow, your eyes must follow:

1. The outer function call
2. Its success callback
3. A second function call
4. Its callback
5. Another call
6. Another callback

The code’s visual structure begins to represent the implementation mechanism instead of the business process.

We wanted to read:

```text
Create order
Process payment
Show summary
Update wallet
```

Instead, we read a maze.

### Data travels through nested scopes

Each result exists inside its callback:

```js
createOrder(cart, function orderCreated(orderId) {
    proceedToPayment(orderId, function paymentCompleted(paymentInfo) {
        showOrderSummary(paymentInfo, function summaryShown(summary) {
            // orderId, paymentInfo, and summary are all visible here.
        });
    });
});
```

Closures make this possible, which is useful. But as the chain grows, every inner function can depend on more outer variables. Refactoring one step becomes harder because its inputs are implicit in surrounding scopes.

### Errors appear at every level

Real operations fail. A callback-style API often reports that failure through another callback or through an error-first callback.

Here is the error-first style commonly associated with Node.js APIs:

```js
createOrder(cart, function orderCreated(error, orderId) {
    if (error) {
        handleError(error);
        return;
    }

    proceedToPayment(orderId, function paymentCompleted(error, paymentInfo) {
        if (error) {
            handleError(error);
            return;
        }

        showOrderSummary(paymentInfo, function summaryShown(error, summary) {
            if (error) {
                handleError(error);
                return;
            }

            console.log(summary);
        });
    });
});
```

Now the happy path is surrounded by repeated failure checks. If one branch forgets `return`, the function may continue after handling the error. If one API reports errors differently, the structure becomes even less consistent.

A synchronous `try...catch` around the outer call does not generally catch an error thrown later inside an asynchronous callback:

```js
try {
    setTimeout(function later() {
        throw new Error("Too late for this catch");
    }, 0);
} catch (error) {
    console.log("This will not run");
}
```

The `try` block has already finished by the time the timer callback runs in a later task.

### We surrender control to another API

When we pass a callback, we trust the receiving code to use it correctly.

Will it call the callback once?

```js
function unreliable(callback) {
    callback("first result");
    callback("second result");
}
```

Will it call the callback at all?

```js
function forgetful(callback) {
    console.log("I forgot something...");
}
```

Will it call synchronously on one path and asynchronously on another?

```js
function inconsistent(value, callback) {
    if (value !== undefined) {
        callback(value);
        return;
    }

    setTimeout(() => callback("later"), 0);
}
```

Good APIs document and honor their callback contract. But once control has been handed over, our code depends on that contract.

This is often called **inversion of control**: instead of our code deciding when the next step runs, another function decides when to call us back.

Inversion of control is not automatically bad. Frameworks, event systems, and libraries rely on it. It becomes painful when many dependent steps require many nested handoffs and their guarantees are difficult to compose.

## Named functions improve shape, not semantics

We can flatten the visual pyramid by extracting callbacks:

```js
function handleWallet(balance) {
    console.log("Wallet balance:", balance);
}

function handleSummary(summary) {
    updateWallet(summary, handleWallet);
}

function handlePayment(paymentInfo) {
    showOrderSummary(paymentInfo, handleSummary);
}

function handleOrder(orderId) {
    proceedToPayment(orderId, handlePayment);
}

createOrder(cart, handleOrder);
```

This is much easier to look at. Each step has a name, and each function can be tested separately.

But we have not changed the underlying callback model:

- Results still arrive through callbacks.
- Errors still need a callback convention.
- The receiving API still controls whether and when each callback runs.
- The sequence is spread across several function declarations.

Extracting functions is a valuable refactor, not a complete cure.

## Promises turn nesting into a chain

A promise represents the eventual fulfillment or rejection of an asynchronous operation. Instead of passing the next step into `createOrder`, a promise-based version returns an object we can compose.

```js
createOrder(cart)
    .then(function orderCreated(orderId) {
        return proceedToPayment(orderId);
    })
    .then(function paymentCompleted(paymentInfo) {
        return showOrderSummary(paymentInfo);
    })
    .then(function summaryShown(summary) {
        return updateWallet(summary);
    })
    .then(function walletUpdated(balance) {
        console.log("Wallet balance:", balance);
    })
    .catch(function orderFailed(error) {
        console.error("Order failed:", error);
    });
```

The process now grows downward instead of sideways.

Each `.then` returns a new promise. When a handler returns another promise, the next handler waits for it and receives its fulfillment value. A rejection can travel down the chain until a matching `.catch` handles it.

The `return` statements are important. Forgetting one creates a **floating promise**:

```js
createOrder(cart)
    .then(function orderCreated(orderId) {
        proceedToPayment(orderId); // Not returned.
    })
    .then(function tooEarly() {
        console.log("This does not wait for payment");
    });
```

The second handler only waits for the first handler’s return value. Because that handler returns `undefined`, the chain loses track of the payment promise.

The correct version returns it:

```js
createOrder(cart)
    .then(function orderCreated(orderId) {
        return proceedToPayment(orderId);
    })
    .then(function paymentCompleted(paymentInfo) {
        console.log(paymentInfo);
    });
```

Promises do not remove callbacks. Functions passed to `.then` and `.catch` are still callbacks. Promises give those callbacks a standard timing, result, error, and composition model.

## Async and await restore the story

Because `async` functions use promises, the same flow can be written with `await`:

```js
async function completeOrder(cart) {
    try {
        const orderId = await createOrder(cart);
        const paymentInfo = await proceedToPayment(orderId);
        const summary = await showOrderSummary(paymentInfo);
        const balance = await updateWallet(summary);

        console.log("Wallet balance:", balance);
    } catch (error) {
        console.error("Order failed:", error);
    }
}

completeOrder(cart);
```

Now the code reads in the same order as the process:

1. Create the order.
2. Proceed to payment.
3. Show the summary.
4. Update the wallet.

`await` pauses this particular async function until the promise settles. It does not freeze the whole JavaScript runtime or block the main thread while a network operation is pending. Other scheduled work can continue.

Promises and `async` functions improve composition, but they do not make failures disappear. We still need to decide where errors belong, which failures are recoverable, and what should be cancelled when the user leaves.

Better syntax cannot make an undefined workflow well designed.

## Do not make independent work wait unnecessarily

Nested callbacks often force us to think sequentially, but not every operation depends on the one before it.

Suppose the order summary and reward points can be fetched independently after payment:

```js
async function loadAccountDetails(paymentInfo) {
    const summary = await getOrderSummary(paymentInfo);
    const rewards = await getRewardPoints(paymentInfo.userId);

    return { summary, rewards };
}
```

This waits for the summary before it even starts requesting reward points.

If the operations are independent, start them together:

```js
async function loadAccountDetails(paymentInfo) {
    const [summary, rewards] = await Promise.all([
        getOrderSummary(paymentInfo),
        getRewardPoints(paymentInfo.userId),
    ]);

    return { summary, rewards };
}
```

The lesson is not “replace every callback with `await`.” The lesson is to express actual dependencies clearly.

- Dependent work belongs in sequence.
- Independent work can often begin together.
- Repeated events may still be better represented by listeners, streams, or async iterators.

Choose a control-flow tool that matches the shape of the problem.

## Callback hell is a design warning

You have entered callback hell when asynchronous control flow becomes difficult to reason about because callbacks are deeply nested, errors are scattered, state leaks across scopes, and ownership of the next step is unclear.

The way out is not one magic keyword. Use several habits together:

1. Give operations clear success and failure contracts.
2. Keep each step focused on one responsibility.
3. Name complex callbacks instead of hiding everything in anonymous functions.
4. Return promises from asynchronous functions when you control the API.
5. Keep promise chains flat by returning each dependent promise.
6. Use `async` and `await` when they make the sequence easier to read.
7. Start independent operations together rather than awaiting them one by one.
8. Plan cancellation and cleanup as part of the workflow.

Callbacks are not demons. A callback is just a function waiting for someone else to decide when it should run.

Hell begins when too many decisions are hidden inside too many other decisions.

## Try it yourself

Start with this callback chain:

```js
getUser(42, function userLoaded(error, user) {
    if (error) {
        console.error(error);
        return;
    }

    getPosts(user.id, function postsLoaded(error, posts) {
        if (error) {
            console.error(error);
            return;
        }

        getComments(posts[0].id, function commentsLoaded(error, comments) {
            if (error) {
                console.error(error);
                return;
            }

            console.log(comments);
        });
    });
});
```

Rewrite it twice:

1. As a flat promise chain that returns every promise
2. As an `async` function with one intentional error boundary

Then ask whether `getPosts` and `getComments` truly depend on the previous results. Do not parallelize them merely because `Promise.all` exists; parallelize them only if the data dependencies allow it.

## Further reading

- [Using promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises)
- [How to use promises](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Async_JS/Promises)
- [async function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function)
- [Promise.all](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all)
