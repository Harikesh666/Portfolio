---
title: "JavaScript Scope: How Names Find Their Values"
description: "How global, function, and block scope shape name lookup, lexical environments, scope chains, hoisting, shadowing, and ReferenceError behavior."
category: "JavaScript"
readTime: "14 min read"
date: "February 2025"
publishedAt: "2025-02-11"
---

# JavaScript Scope: How Names Find Their Values

Suppose JavaScript reaches this line:

```js
console.log(message);
```

There may be several variables named `message` in the file. One could be global. Another could belong to the current function. A third could live inside a nearby block.

Which one does JavaScript use?

It does not search the whole program and pick whichever `message` looks convenient. It follows a predictable lookup path based on **scope**.

Scope answers one practical question:

> Where can this name be accessed?

That question sounds small, but it connects to lexical environments, execution contexts, hoisting, closures, shadowing, and the scope chain. Once the lookup rule is clear, all of those topics become easier to place.

Before we begin, remember that a name such as `message` is connected to a value through a **binding**. You can picture the binding as a labeled slot. Scope decides where JavaScript is allowed to see that label.

## The three scopes you meet most often

JavaScript programs commonly use three kinds of scope:

1. Global scope
2. Function scope
3. Block scope

They are not three unrelated rules. They are boundaries around different sets of bindings.

## Global scope

A declaration is global when it belongs to a global environment, such as the outermost scope of a classic browser script. A module has its own top-level module scope instead of placing its declarations in global scope.

```js
const siteName = "My Blog";

function printSiteName() {
    console.log(siteName);
}

printSiteName(); // My Blog
```

`printSiteName` can read `siteName` because the function's scope sits inside the outer scope where `siteName` was declared.

You will sometimes hear that a global variable can be accessed "from anywhere." That shortcut is useful, but it needs one correction. Code can reach a global binding only when that global environment is part of its lookup chain. Separate pages, workers, and server processes do not magically share one universal bag of variables.

There is another distinction worth keeping:

- Global scope is about top-level bindings.
- The global object is an object exposed by the runtime, available as `globalThis`.

In a classic browser script, some top-level declarations also become properties of `window`. Top-level `let` and `const` do not. Modules follow different rules again.

That full relationship is covered in [Global Scope and this: Look at the Call Site](/writing/global-scope-and-this-call-site). For this article, keep the simpler rule: global scope is the outermost place where name lookup can arrive in the current program environment.

## Function scope

Every function call gets access to bindings created for that function, including its parameters and local declarations.

```js
function greet(name) {
    const message = `Hello, ${name}`;
    console.log(message);
}

greet("Alice"); // Hello, Alice

console.log(name);    // ReferenceError
console.log(message); // ReferenceError
```

The parameter `name` and local binding `message` belong to `greet`. Code inside the function can use them. Code outside cannot walk inward and take them.

That direction matters:

> Inner scopes can look outward. Outer scopes cannot look inward.

Variables declared with `var` are function-scoped. A `var` inside an ordinary block still belongs to the surrounding function:

```js
function checkScore(score) {
    if (score > 50) {
        var result = "pass";
    }

    console.log(result);
}

checkScore(80); // pass
```

The braces around the `if` do not contain `result` because `var` does not use an ordinary block as its scope.

## Block scope

A block is a group of statements inside braces. `let`, `const`, and `class` declarations are scoped to their containing block.

```js
if (true) {
    let blockScopedVar = "I am block scoped";
    console.log(blockScopedVar); // Works fine
}

console.log(blockScopedVar); // ReferenceError: blockScopedVar is not defined
```

The binding exists inside the `if` block. Once lookup begins outside those braces, that block is no longer an accessible place to search.

Block scope also appears in loops, `switch` statements, `catch` clauses, and standalone blocks:

```js
{
    const temporary = "only inside";
    console.log(temporary);
}

console.log(temporary); // ReferenceError
```

The braces are doing more than making the code look organized. They create a boundary for block-scoped declarations.

For the detailed differences between `var`, `let`, and `const`, read [var, let, and const: Bindings, Scope, and the TDZ](/writing/var-let-const-and-temporal-dead-zone). For the strange cases involving blocks and redeclarations, read [JavaScript Blocks, Scope, and Shadowing](/writing/javascript-block-scope-and-shadowing).

## Scope and lexical environment are related, not identical

We now know what scope tells us. It tells us where a name can be used.

But JavaScript still needs runtime bookkeeping for the bindings inside those scopes. That is where a **lexical environment** enters the picture.

Think of a lexical environment as:

1. A record of the bindings available here
2. A link to the surrounding environment

The first part answers, "Do I have this name?" The second answers, "If I do not, where should I look next?"

```text
Current lexical environment
├── local bindings
└── link to outer lexical environment
```

The word *lexical* tells us how that outer link is chosen. It follows where the code was written.

Scope is the rule you experience as a programmer. A lexical environment is part of how JavaScript represents the bindings and outer links needed to apply that rule while the program runs.

## Execution context is another piece of the picture

When JavaScript evaluates a script or calls a function, it creates an **execution context**. The phrase sounds more mysterious than the idea.

An execution context is the runtime workspace JavaScript needs while evaluating that script or function call. It tracks things such as the current code position, the relevant environments, and the `this` value where applicable.

A lexical environment and an execution context are not two names for the same thing:

- The execution context tracks an active evaluation.
- The lexical environment helps resolve bindings.

Function calls create execution contexts. Blocks can create new lexical environments without creating new function calls or new execution contexts.

```js
function showStatus() {
    const status = "running";

    if (status === "running") {
        const detail = "inside the block";
        console.log(detail);
    }
}
```

Calling `showStatus` creates an execution context for the call. Entering the `if` block introduces another lexical environment for `detail`, but it does not call another function.

If you want to follow execution contexts and the call stack step by step, read [How JavaScript Keeps Track of Running Code](/writing/how-javascript-keeps-track-of-running-code).

## Lexical scope follows where code was written

Now we can state the central rule:

> JavaScript decides a function's outer scope from where the function was created, not from where it was called.

That is **lexical scope**.

Consider the original nested-function example:

```js
let globalVar = "I am global";

function outerFunction() {
    let outerVar = "I am in outerFunction";

    function innerFunction() {
        let innerVar = "I am in innerFunction";
        console.log(globalVar); // Accesses global scope
        console.log(outerVar);  // Accesses outer function's scope
        console.log(innerVar);  // Accesses inner function's own scope
    }

    innerFunction();
}

outerFunction();
```

When `innerFunction` reads a name, JavaScript can search:

```text
innerFunction scope
        ↓
outerFunction scope
        ↓
global scope
```

It finds `innerVar` locally. It finds `outerVar` one level outside. It finds `globalVar` in the global scope.

This works because `innerFunction` was written inside `outerFunction`.

Calling a function from another location does not attach the caller's local variables to it:

```js
const label = "global";

function printLabel() {
    console.log(label);
}

function run() {
    const label = "inside run";
    printLabel();
}

run(); // global
```

`printLabel` is called inside `run`, but it was created in the global scope. Its lookup path does not pass through `run`'s local scope, so it prints `"global"`.

The caller decides when the function runs. The creation location decides which outer bindings the function can reach.

## The scope chain is the lookup route

The connected sequence of lexical environments is commonly called the **scope chain**.

When JavaScript needs a name, it follows a simple process:

1. Look in the current environment.
2. If the binding is not there, follow the link to the outer environment.
3. Continue until the binding is found or there is nowhere left to search.
4. If the binding is never found, throw a `ReferenceError`.

Here is the second example from the original article:

```js
let globalVar = "global";

function firstFunction() {
    let firstVar = "first";

    function secondFunction() {
        let secondVar = "second";

        console.log(globalVar); // "global"
        console.log(firstVar);  // "first"
        console.log(secondVar); // "second"
    }

    secondFunction();
}

firstFunction();
```

For `secondFunction`, the lookup route is:

```text
secondFunction environment
├── secondVar
└── outer → firstFunction environment
             ├── firstVar
             └── outer → global environment
                          └── globalVar
```

JavaScript does not jump directly to the global scope every time. It searches from the nearest environment outward.

That nearest-first rule also explains shadowing:

```js
const topic = "JavaScript";

function teach() {
    const topic = "Scope";
    console.log(topic);
}

teach(); // Scope
```

The inner `topic` is found first, so it shadows the outer `topic`. The global binding still exists. It is simply hidden from that lookup by the nearer binding with the same name.

## What happens when JavaScript cannot find the name?

If lookup reaches the end of the scope chain without finding a binding, JavaScript throws a `ReferenceError`.

```js
function testFunction() {
    console.log(myVar); // ReferenceError: myVar is not defined
}

testFunction();
```

`myVar` is not local to `testFunction`, and it does not exist in an outer accessible scope. There is no binding to read.

The result is not `null`. It is not `undefined` either.

Those cases are different:

```js
const emptyValue = null;
let notAssigned;

console.log(emptyValue);  // null
console.log(notAssigned); // undefined
console.log(missingValue); // ReferenceError
```

- `emptyValue` exists and explicitly contains `null`.
- `notAssigned` exists and currently contains `undefined`.
- `missingValue` has no accessible binding at all.

An existing binding with the value `undefined` is still a successful lookup. A missing binding is a failed lookup.

There is one famous exception that can safely test an undeclared name:

```js
console.log(typeof missingValue); // "undefined"
```

That special `typeof` behavior is useful, but do not let it blur the normal rule. Reading an undeclared identifier directly throws a `ReferenceError`.

## Hoisting changes what exists early, not where lookup goes

Hoisting is often described like this:

> JavaScript moves declarations to the top of their scope.

That is a mental shortcut, not a literal operation. JavaScript does not rearrange your source file.

Before evaluating the statements in a scope, JavaScript creates the bindings required by that scope. Different declaration forms initialize those bindings at different times.

Now the original example becomes easier to explain:

```js
console.log(hoistedVar); // undefined
var hoistedVar = "I'm hoisted!";

console.log(hoistedLet); // ReferenceError
let hoistedLet = "I'm not accessible until initialized";
```

The `var` binding exists before evaluation reaches its declaration, and it has already been initialized with `undefined`.

The `let` binding also exists for the scope, but it remains uninitialized until JavaScript evaluates the declaration. The time before that evaluation is the **Temporal Dead Zone**, or TDZ. Trying to read the binding during that time throws a `ReferenceError`.

Notice that scope lookup still follows the same path. The surprising part is the state of the binding JavaScript finds:

- A `var` binding exists and contains `undefined`.
- A `let` binding exists but is still uninitialized.
- An undeclared name has no binding to find.

Those are three different situations, even though two of them can produce a `ReferenceError`.

For the full declaration-by-declaration walkthrough, read [JavaScript Hoisting Does Not Move Your Code](/writing/javascript-hoisting-does-not-move-code).

## Scope does not decide lifetime by itself

The original note connected scope boundaries with the lifetime of variables. That connection needs care.

Scope decides where a binding can be reached from the code. It does not guarantee the exact moment when the required data disappears from memory.

Consider a closure:

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
```

The call to `createCounter` finishes, but the returned function still needs the `count` binding. JavaScript preserves access to the required environment while that closure remains reachable.

The binding's scope has not expanded. Code outside still cannot write `count` directly. The returned function can reach it because that function was created inside the scope where `count` lives.

Scope tells us who can reach the binding. Reachability helps the engine decide how long the required environment data must remain available.

That difference is explored fully in [Closures in JavaScript: The Function's Backpack](/writing/closures-function-backpack).

## A practical way to trace scope

When a name looks confusing, do not stare at the whole file. Start at the line using the name and ask:

1. Is the name declared in the current block or function?
2. If not, what scope surrounds this code where it was written?
3. Does a nearer declaration shadow an outer one?
4. If JavaScript finds the binding, has that binding been initialized yet?
5. If no scope contains it, should this be a `ReferenceError`?

Draw the lookup route if necessary:

```text
current scope → outer function scope → global scope → stop
```

Do not follow the order in which functions happened to call one another. That is the call stack. For scope, follow where the functions are nested in the source.

## What to remember

1. **Scope answers where a name can be accessed.**
2. **Global, function, and block scopes create different boundaries.**
3. **Lexical scope follows where code was written, not where a function was called.**
4. **A lexical environment records bindings and links to an outer environment.**
5. **The scope chain searches from the nearest environment outward.**
6. **A missing binding causes a `ReferenceError`; an existing binding may contain `undefined` or `null`.**
7. **Hoisting does not move code. Declaration setup changes which bindings exist before statement evaluation.**
8. **Scope controls access, while closures can keep required environment data reachable after a call finishes.**

The next time JavaScript sees `message`, it does not guess. It checks the nearest place first, follows the outer links one by one, and either finds the binding or tells you that the name does not exist.

Once you can draw that route, scope stops feeling invisible.

## Further reading

- [ECMAScript lexical environments and environment records](https://tc39.es/ecma262/#sec-lexical-environments)
- [MDN glossary: Scope](https://developer.mozilla.org/en-US/docs/Glossary/Scope)
- [MDN guide: Closures and lexical scoping](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures)
