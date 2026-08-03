---
title: "JavaScript Blocks, Scope, and Shadowing"
description: "How blocks group statements, how let and const create block scope, how shadowing works, and why some redeclarations are illegal."
category: "JavaScript"
readTime: "14 min read"
date: "February 2025"
publishedAt: "2025-02-05"
---

# JavaScript Blocks, Scope, and Shadowing

Curly braces appear everywhere in JavaScript.

```js
if (isLoggedIn) {
    showDashboard();
    loadNotifications();
}
```

At first, the braces look like simple punctuation. They keep two statements together so the `if` condition can control both of them.

Then we place `let`, `const`, and `var` inside the braces, and suddenly those braces affect which variables exist, which names are visible, and whether the code is even legal.

That is where three ideas meet:

1. Blocks
2. Scope
3. Shadowing

Let’s take them in that order.

## 1. Understanding blocks in JavaScript

A **block** is a list of statements surrounded by curly braces:

```js
{
    var a = 10;
    console.log(a);
}
```

A block is also called a **compound statement** because it lets several statements act as one statement.

Why is that useful?

An `if` statement expects one statement after its condition:

```js
if (isReady)
    start();
```

If we need more than one action, a block groups them:

```js
if (isReady) {
    start();
    showStatus();
    recordStartTime();
}
```

The same idea appears in loops, `try` and `catch`, `switch`, and function bodies.

We can also write a block by itself:

```js
{
    const message = "Inside the block";
    console.log(message);
}
```

There is no condition here. The block simply groups statements and creates a boundary for block-scoped declarations.

That second purpose is what makes blocks more than visual organization.

## 2. Block scope

Scope answers a practical question:

> Where can this name be accessed?

Variables declared with `let` and `const` are scoped to their containing block.

```js
{
    let b = 20;
    const c = 30;

    console.log(b); // 20
    console.log(c); // 30
}

console.log(b); // ReferenceError
console.log(c); // ReferenceError
```

Inside the braces, `b` and `c` are available. Outside the braces, those bindings are not in scope.

Now compare `var`:

```js
function example() {
    {
        var a = 10;
        let b = 20;
        const c = 30;
    }

    console.log(a); // 10
    console.log(b); // ReferenceError
    console.log(c); // ReferenceError
}

example();
```

`var` does not use the ordinary block as its scope. Here, `a` belongs to the surrounding function.

The broad rule is:

- `let` and `const` are block-scoped.
- `var` is function-scoped, script-scoped, or scoped to a static initialization block, depending on where it appears.

For everyday code, the contrast to remember is simpler: an ordinary pair of braces contains `let` and `const`, but it does not contain `var`.

## What JavaScript creates for a block

When JavaScript evaluates a block containing block-scoped declarations, it creates an environment for those bindings.

```js
const outside = "outer";

{
    const inside = "inner";
    console.log(outside, inside);
}
```

The block environment contains `inside` and links to the surrounding environment containing `outside`.

That link is why code inside the block can look outward.

```text
Block environment
└── inside = "inner"
    ↓ outer environment
    outside = "outer"
```

When execution leaves the block, JavaScript restores the previous lexical environment as the current one.

But be careful with one common explanation: “the block’s memory is destroyed as soon as the block finishes.”

That is not always true.

```js
let readMessage;

{
    const message = "Still here";

    readMessage = function () {
        return message;
    };
}

console.log(readMessage()); // Still here
```

The block has finished, but the function still closes over the `message` binding. As long as that function remains reachable, the needed environment data can remain reachable too.

Leaving a block ends normal access through that block in the running code. It does not force every captured binding to disappear immediately.

That is the same closure behavior explained in [Closures in JavaScript: The Function’s Backpack](/writing/closures-function-backpack).

## 3. The Temporal Dead Zone inside a block

`let` and `const` bindings belong to the entire block, but JavaScript does not let us access them before their declarations are evaluated.

```js
{
    console.log(b);
    let b = 10;
}
```

This throws an error similar to:

```text
ReferenceError: Cannot access 'b' before initialization
```

The time between entering the scope and evaluating the declaration is called the **Temporal Dead Zone**, or TDZ.

The binding exists, but it is uninitialized.

That is different from a name that does not exist in any reachable scope:

```js
console.log(neverDeclared);
```

Both situations throw a `ReferenceError`, but for different reasons.

- `b` exists but cannot be accessed yet.
- `neverDeclared` cannot be found at all.

The TDZ ends when JavaScript evaluates the declaration:

```js
{
    let b;
    console.log(b); // undefined

    b = 10;
    console.log(b); // 10
}
```

Notice that `let b;` initializes the binding to `undefined`. The assignment of `10` happens later.

The dedicated article [JavaScript Hoisting Does Not Move Your Code](/writing/javascript-hoisting-does-not-move-code) explains this setup in more detail.

## The TDZ can hide an outer variable

The inner binding affects the whole block, even before its declaration line.

```js
const message = "outer";

{
    console.log(message);
    const message = "inner";
}
```

You might expect the first line inside the block to find the outer `message`.

It does not.

The block already has its own `message` binding. That binding shadows the outer one throughout the block, but it is still in the TDZ when `console.log` tries to read it.

So JavaScript throws a `ReferenceError` instead of printing `"outer"`.

This takes us directly to shadowing.

## 4. Shadowing in JavaScript

**Shadowing** happens when an inner scope declares a name that also exists in an outer scope.

```js
const value = "outer";

{
    const value = "inner";
    console.log(value); // inner
}

console.log(value); // outer
```

Inside the block, the nearest `value` is the inner one. The outer variable still exists, but its name is hidden by the nearer binding.

Think of standing under a small umbrella while a larger roof is above it. The roof has not disappeared. The closer cover is simply the one above your head.

When the block ends, the inner binding is no longer in scope and the outer `value` becomes visible again.

Shadowing does not overwrite the outer variable by itself. It creates a different binding with the same name in a nested scope.

## Shadowing with var does not work the same way

Consider the original example:

```js
var a = 100;

{
    var a = 10;
    console.log(a); // 10
}

console.log(a); // 10
```

It looks as if the block created an inner `a` that shadowed the outer `a`.

It did not.

Both `var` declarations belong to the same variable scope. The second statement assigns `10` to the existing binding.

That is why the value outside the block is also `10`.

To see actual `var` shadowing, we need a new function scope:

```js
var a = 100;

function showValue() {
    var a = 10;
    console.log(a); // 10
}

showValue();
console.log(a); // 100
```

Now the function has its own `a`, so the inner binding genuinely shadows the outer one.

The difference is not that `var` can never shadow. The difference is that an ordinary block does not create a new `var` scope.

## 5. Shadowing with let and const

`let` and `const` create new bindings in nested blocks, so they shadow naturally:

```js
let b = 100;
const c = 100;

{
    let b = 20;
    const c = 30;

    console.log(b); // 20
    console.log(c); // 30
}

console.log(b); // 100
console.log(c); // 100
```

There are four different bindings here:

```text
Outer scope
├── b = 100
└── c = 100

Inner block
├── b = 20
└── c = 30
```

The inner declarations do not modify the outer values.

This is useful when an inner operation needs a local name that makes sense in that smaller context:

```js
const status = "application ready";

if (hasError) {
    const status = "request failed";
    console.log(status);
}

console.log(status);
```

Still, legal shadowing is not automatically good shadowing. If the same name makes the code harder to follow, choose a clearer name.

## 6. Illegal shadowing

Some declarations with the same name cannot coexist because their scopes would collide.

```js
let a = 20;

{
    var a = 10;
}
```

This is a syntax error:

```text
SyntaxError: Identifier 'a' has already been declared
```

Why?

The outer `let a` belongs to the surrounding lexical scope. The `var a` inside the ordinary block tries to belong to the surrounding variable scope because the block cannot contain it. Those declarations collide.

JavaScript rejects the code before running it.

Now reverse the declarations:

```js
var a = 20;

{
    let a = 10;
    console.log(a); // 10
}

console.log(a); // 20
```

This is allowed. The block can contain its own `let a`, separate from the outer `var a`.

The same is true for `const`:

```js
var value = "outer";

{
    const value = "inner";
    console.log(value); // inner
}
```

## A new function boundary can make the declaration legal

The original article also used a function:

```js
var a = 20;

function x() {
    let a = 10;
    console.log(a); // 10
}

x();
console.log(a); // 20
```

This is legal because the function creates a new scope. Its `let a` does not compete with the outer `var a` in the same declaration space.

Likewise, this is legal:

```js
let a = 20;

function x() {
    var a = 10;
    console.log(a); // 10
}
```

The `var a` belongs to `x`, not to the outer scope containing `let a`.

When illegal-shadowing rules feel arbitrary, ask where each declaration is trying to create its binding. If both declarations land in incompatible parts of the same scope, JavaScript rejects them.

## 7. Global, script, function, and block bindings

The original explanation described separate memory spaces for global, script, and block declarations. That is a useful picture if we make it slightly more precise.

In a classic browser script:

- A top-level `var` participates in the global environment and normally creates a property on `window`.
- A top-level `let` or `const` creates a global lexical binding but does not become a `window` property.
- A block-level `let` or `const` belongs to that block’s lexical environment.
- A `var` inside a function belongs to that function’s variable environment.

```html
<script>
    var a = 10;
    let b = 100;

    {
        let b = 20;
        const c = 30;

        console.log(a, b, c); // 10 20 30
    }

    console.log(window.a); // 10
    console.log(window.b); // undefined
    console.log(b);        // 100
</script>
```

This browser-script behavior should not be copied blindly into modules or Node.js. Top-level environments differ.

The important lesson for shadowing is stable across them: each declaration belongs to a particular environment, and nested environments can contain the same name as outer ones when the declaration rules allow it.

## 8. Lexical scoping and the scope chain

JavaScript uses **lexical scoping**. The location where code is written determines the chain of outer scopes it can search.

Consider the original nested-block example:

```js
const a = 20;

{
    const a = 100;

    {
        const a = 200;
        console.log(a); // 200
    }
}
```

The innermost `console.log` finds `a` in its own block, so the search stops at `200`.

Remove that declaration:

```js
const a = 20;

{
    const a = 100;

    {
        console.log(a); // 100
    }
}
```

Now JavaScript looks one environment outward and finds `100`.

Remove the middle declaration too:

```js
const a = 20;

{
    {
        console.log(a); // 20
    }
}
```

The lookup travels outward until it finds the nearest matching binding.

It never searches inward:

```js
{
    console.log(secret); // ReferenceError

    {
        const secret = "inside";
    }
}
```

An outer block cannot reach into a nested block for a variable.

The rule is:

```text
current scope → outer scope → next outer scope → global scope
```

The first matching binding wins.

## A switch statement shares one block scope

There is one practical block-scope surprise worth knowing.

All `case` clauses in one `switch` share the same `switch` block:

```js
switch (status) {
    case "loading":
        const message = "Please wait";
        break;
    case "complete":
        const message = "Done";
        break;
}
```

This causes a syntax error because both declarations try to create `message` in the same block scope.

Add a block around each case when each case needs its own declarations:

```js
switch (status) {
    case "loading": {
        const message = "Please wait";
        console.log(message);
        break;
    }
    case "complete": {
        const message = "Done";
        console.log(message);
        break;
    }
}
```

Now each `message` belongs to a different block.

## Block scope helps loops keep separate values

Block scope also explains why `let` behaves so well with callbacks inside loops:

```js
for (let index = 0; index < 3; index += 1) {
    setTimeout(function () {
        console.log(index);
    }, 0);
}
```

Output:

```text
0
1
2
```

For this form of `for` loop, JavaScript creates a fresh per-iteration binding for `index`. Each callback closes over the binding for its own iteration.

With `var`, the callbacks would share one function-scoped binding:

```js
for (var index = 0; index < 3; index += 1) {
    setTimeout(function () {
        console.log(index);
    }, 0);
}
```

By the time the callbacks run, the shared `index` is `3`, so the output is `3`, `3`, `3`.

This is not a timer trick. It is a scope and closure difference.

## What to remember

1. **A block groups statements.**  
   Curly braces let several statements act as one compound statement.

2. **`let` and `const` are block-scoped.**  
   Their bindings are available only within the block that contains them.

3. **`var` ignores ordinary block boundaries.**  
   It belongs to a surrounding function, script, or other variable scope.

4. **The TDZ begins at the start of the scope.**  
   A lexical binding exists before its declaration line but cannot be accessed yet.

5. **Shadowing chooses the nearest binding.**  
   An inner declaration can hide an outer name without changing the outer value.

6. **A `var` in a plain block may be the same binding.**  
   Do not mistake reassignment in one variable scope for true shadowing.

7. **Some redeclarations are syntax errors.**  
   Check which scope each declaration is trying to enter.

8. **Scope lookup moves outward, never inward.**

The braces are not merely keeping the code tidy. They can create a boundary around names, and that boundary changes what every line inside can see.

## Try it yourself

Predict every output or error before running this code:

```js
const value = 1;

{
    console.log(value);

    {
        const value = 2;
        console.log(value);
    }

    console.log(value);
}

function test() {
    var value = 3;

    if (true) {
        let value = 4;
        console.log(value);
    }

    console.log(value);
}

test();
console.log(value);
```

Then answer:

1. Which lines use the outer `const value`?
2. Which declaration creates a function-scoped binding?
3. Which declaration creates a block-scoped binding?
4. What would change if the inner `let value` became `var value`?
5. Where would a TDZ error appear if the nested `const value` moved below its first log?

## Further reading

- [ECMAScript block statements](https://tc39.es/ecma262/#sec-block)
- [ECMAScript let and const declarations](https://tc39.es/ecma262/#sec-let-and-const-declarations)
- [ECMAScript environment records](https://tc39.es/ecma262/#sec-environment-records)
- [JavaScript Hoisting Does Not Move Your Code](/writing/javascript-hoisting-does-not-move-code)
- [Closures in JavaScript: The Function’s Backpack](/writing/closures-function-backpack)
