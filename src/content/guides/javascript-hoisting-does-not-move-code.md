---
title: "JavaScript Hoisting Does Not Move Your Code"
description: "What actually happens to var, let, const, function, class, and function-expression bindings before JavaScript evaluates a scope."
category: "JavaScript"
readTime: "14 min read"
date: "January 2025"
publishedAt: "2025-01-27"
---

# JavaScript Hoisting Does Not Move Your Code

JavaScript can use some names before their declarations appear in the file.

```js
sayHello();

function sayHello() {
    console.log("Hello");
}
```

That works.

Then we try the same trick with a variable:

```js
console.log(message);

var message = "Hello";
```

That also runs, but it logs `undefined` instead of `"Hello"`.

Then we replace `var` with `let`:

```js
console.log(message);

let message = "Hello";
```

Now JavaScript throws a `ReferenceError`.

Three declarations. Three different results. One word is usually offered as the explanation: **hoisting**.

Unfortunately, “JavaScript moves declarations to the top” creates almost as much confusion as it solves.

The code does not move. The bindings are prepared differently before the statements are evaluated.

## Hoisting is a teaching term

Hoisting is not a general operation named by the ECMAScript specification. It is a community term for several behaviors that make declarations affect their scope before execution reaches their source position.

People say a declaration is “hoisted” when they observe behavior such as:

- A function declaration can be called before its source line.
- A `var` binding exists before its declaration but contains `undefined`.
- A `let`, `const`, or `class` declaration shadows an outer name throughout its block, even before it can be accessed.
- An imported binding is available throughout a module after module linking succeeds.

These are not identical behaviors. Grouping them under one word is convenient, but we still need to ask what kind of declaration we have.

The better mental model is:

> Before evaluating the statements in a scope, JavaScript creates the bindings required by that scope. Different declarations initialize those bindings at different times.

Nothing is cut from line 20 and pasted onto line 1.

## Setup first, evaluation second

Many courses describe an execution context with two phases:

1. Creation phase
2. Execution phase

That is a useful teaching model. The specification uses more precise operations such as declaration instantiation and evaluation, but the central idea is similar.

Before the body runs, JavaScript prepares declarations for the relevant script, module, function, or block.

During later evaluation, it executes statements in source order and performs initializers when it reaches them.

Consider:

```js
var score = 10;
```

This line combines two ideas:

1. Declare a binding named `score`.
2. Evaluate `10` and assign it to `score`.

The `var` binding is created and initialized before statement evaluation. The assignment to `10` still happens at the source line.

That separation explains most hoisting behavior.

## var exists early with undefined

```js
console.log(score);

var score = 10;

console.log(score);
```

Output:

```text
undefined
10
```

At a high level, the behavior resembles this rewritten version:

```js
var score;

console.log(score);

score = 10;

console.log(score);
```

The rewrite is only a mental model. JavaScript did not transform the source text this way.

The real points are:

- The `score` binding exists from the beginning of the `var` scope.
- It is initialized to `undefined` during declaration instantiation.
- The initializer assignment happens when execution reaches `var score = 10`.

This also explains why checking an early `var` value does not throw an undeclared-variable error. The binding is declared; it just does not contain the later value yet.

## let and const exist early but remain uninitialized

Now use `let`:

```js
console.log(score);

let score = 10;
```

JavaScript throws an error similar to:

```text
ReferenceError: Cannot access 'score' before initialization
```

The same happens with `const`:

```js
console.log(limit);

const limit = 100;
```

Why not `undefined`?

Because lexical declarations use a different binding state. The `score` or `limit` binding is created for the scope, but it remains **uninitialized** until evaluation reaches the declaration.

Accessing an uninitialized binding throws a `ReferenceError`.

This interval, from entering the scope until the declaration initializes the binding, is called the **Temporal Dead Zone**, or TDZ.

```js
{
    // The TDZ for name has already begun.
    console.log(name);

    let name = "John";
    // The TDZ ends when the declaration initializes name.

    console.log(name);
}
```

The phrase “`let` and `const` are not hoisted” is common because we cannot use them early. Another equally valid explanation is that they affect the entire scope but stay uninitialized in the TDZ.

Do not fight over the word. Remember the observable behavior.

## The first error stops the script

Put all three accesses in one script and another issue appears:

```js
console.log(varVariable);
console.log(letVariable);
console.log(constVariable);

var varVariable = "I am var";
let letVariable = "I am let";
const constVariable = "I am const";
```

It is tempting to describe three outputs:

1. `undefined`
2. A `ReferenceError` for `letVariable`
3. A `ReferenceError` for `constVariable`

But one execution does not reach step three. The `ReferenceError` on the second line stops normal script evaluation, so the third `console.log` never runs.

Test declarations in separate snippets or wrap each access deliberately if you want to observe every error.

The difference matters when teaching execution flow. JavaScript does not keep running the next line after an uncaught exception merely because that line would also fail.

## The TDZ shadows outer variables too

An uninitialized lexical binding affects the entire block:

```js
const message = "outer";

{
    console.log(message);

    const message = "inner";
}
```

You might expect `"outer"` because the inner declaration appears later. Instead, JavaScript throws a `ReferenceError`.

The block already has its own `message` binding. That binding shadows the outer one from the start of the block, but it remains uninitialized until the `const` declaration runs.

The lookup finds the inner binding and stops. It does not skip the uninitialized binding and continue searching outside.

This is strong evidence that `const` affects the scope before its source line, whether or not you choose to call that behavior hoisting.

The later article on `let`, `const`, `var`, and the TDZ will examine these differences in more detail.

## typeof has one important exception

Historically, `typeof` can inspect an undeclared name without throwing:

```js
console.log(typeof completelyMissing);
```

Output:

```text
undefined
```

But `typeof` does not bypass the TDZ:

```js
console.log(typeof message);

let message = "Hello";
```

This throws a `ReferenceError` because `message` is a real binding in the current scope and is still uninitialized.

“`typeof` is always safe” is another shortcut that works until it does not.

## Function declarations are initialized with functions

Function declarations get the most useful form of hoisting:

```js
hoistedFunction();

function hoistedFunction() {
    console.log("I am a hoisted function");
}
```

Output:

```text
I am a hoisted function
```

During declaration instantiation, JavaScript creates the function object and initializes the `hoistedFunction` binding with it. By the time statement evaluation begins, the binding is already callable.

This behavior lets us arrange related functions in a readable order:

```js
runApplication();

function runApplication() {
    loadConfiguration();
    startServer();
}

function loadConfiguration() {
    // ...
}

function startServer() {
    // ...
}
```

Calling before declaration is not automatically bad. With function declarations, it can let the main story appear before implementation details.

## Function expressions follow their variable

A function expression does not introduce a function declaration into the surrounding scope. It creates a function value when the expression is evaluated.

```js
notReady();

var notReady = function () {
    console.log("Ready now");
};
```

Before the assignment, `notReady` contains `undefined`. Calling it throws a `TypeError`:

```text
TypeError: notReady is not a function
```

The name exists, so this is not an undeclared-name `ReferenceError`. The value simply is not callable.

With `let` or `const`, the same early call hits the TDZ instead:

```js
notReady();

const notReady = function () {
    console.log("Ready now");
};
```

Output:

```text
ReferenceError: Cannot access 'notReady' before initialization
```

Arrow functions follow exactly the same outer-binding rules:

```js
run();

const run = () => {
    console.log("Running");
};
```

The arrow syntax is not the reason for the `ReferenceError`. The `const` binding is.

This is why “function expressions are partially hoisted” is not a helpful model. Ask two separate questions:

1. How is the outer variable declared?
2. When is the function-producing expression evaluated?

## Class declarations also have a TDZ

A class declaration creates a lexical binding rather than a function-declaration-style callable binding:

```js
const user = new User("Alice");

class User {
    constructor(name) {
        this.name = name;
    }
}
```

This throws:

```text
ReferenceError: Cannot access 'User' before initialization
```

The `User` binding exists for the scope, but it cannot be accessed until evaluation reaches and initializes the class declaration.

Function declarations and class declarations may look similar as named blocks of behavior, but their early-access rules are different.

## Scope decides where preparation happens

Declarations are prepared for their containing scope, not for the entire universe.

`var` is scoped to a function, script, or static initialization block. It is not scoped to an ordinary `{}` block:

```js
function example() {
    if (false) {
        var hidden = "never assigned";
    }

    console.log(hidden);
}

example();
```

Output:

```text
undefined
```

The `if` body never runs, so the initializer never assigns the string. But the `var` binding belongs to the function and was created when the function call was prepared.

`let` and `const` are block-scoped:

```js
{
    let inside = "block";
}

console.log(inside); // ReferenceError: inside is not defined
```

The binding does not escape its block.

Function declarations inside blocks are block-scoped in strict mode and modules. Historical non-strict browser semantics for block-level function declarations can be surprising, so do not rely on them in sloppy scripts.

## Functions and var with the same name

What happens when a `var` declaration and function declaration share a name?

```js
console.log(typeof greeting);

var greeting = "Hello";

function greeting() {
    console.log("Function greeting");
}

console.log(greeting);
```

Output:

```text
function
Hello
```

During declaration instantiation, the function declaration initializes `greeting` with the function. The `var greeting` declaration does not replace that value with `undefined`.

Later, statement evaluation reaches this initializer:

```js
greeting = "Hello";
```

That runtime assignment replaces the function value with the string.

You may hear that “functions are hoisted before variables.” The observable result is correct for this simple collision, but thinking in terms of declaration instantiation and later assignment is clearer.

Also, do not write code like this on purpose. A name that changes from a function into a string is legal confusion.

Lexical declarations are stricter. Declaring a `let`, `const`, or `class` with the same name as a conflicting `var` or function in the same scope is generally a `SyntaxError`.

## ReferenceError and TypeError tell different stories

Hoisting examples often produce two errors. Their difference is useful.

A `ReferenceError` means JavaScript cannot provide an accessible value for the binding operation:

```js
console.log(missingName);
```

The name may be undeclared, or it may exist but still be uninitialized in the TDZ.

A `TypeError` means JavaScript obtained a value, but that value cannot perform the requested operation:

```js
callMe();
var callMe = function () {};
```

The binding exists and contains `undefined`. Trying to call `undefined` produces the `TypeError`.

Ask what value lookup produced before memorizing an error message.

## Hoisting is not permission to write backward

Understanding hoisting helps us read JavaScript accurately. It does not mean we should hide declarations wherever possible.

Practical habits:

1. Prefer `const` by default and `let` when reassignment is required.
2. Declare lexical variables before their first use.
3. Use a function declaration when early callability improves the file’s narrative.
4. Do not depend on `var` returning `undefined` before assignment.
5. Avoid declaration collisions and block-level functions in non-strict legacy scripts.
6. Read error types as clues about binding state.

The goal is predictable code, not demonstrating that you can win an argument with the JavaScript engine.

## What to remember

- **JavaScript does not move source code.** It creates bindings before evaluating statements.
- **var starts as undefined.** Its initializer runs later at the declaration’s source position.
- **let and const start uninitialized.** Access during the TDZ throws a `ReferenceError`.
- **Function declarations start as callable functions.** Their function objects are created during declaration instantiation.
- **Function expressions and arrows follow their outer variables.** `var` gives early `undefined`; `let` and `const` give the TDZ.
- **Classes cannot be used before initialization.** Their bindings behave like lexical declarations.
- **Scope still matters.** `var` is not block-scoped; `let`, `const`, and `class` are.

Hoisting stops feeling magical when we stop imagining flying code and start tracking binding states.

## Try it yourself

Predict each line that runs before the error:

```js
console.log(typeof build);
console.log(status);

function build() {
    return "built";
}

var status = build();

console.log(status);
console.log(version);

const version = "1.0.0";
```

Then answer:

1. What value initializes `build` before evaluation?
2. What value initializes `status` before evaluation?
3. When does `build()` actually run?
4. Why does the last access throw?
5. Does the script ever initialize `version` after that uncaught error?

Finally, change `var status` to `const status` and predict how early the program stops.

## Further reading

- [Hoisting](https://developer.mozilla.org/en-US/docs/Glossary/Hoisting)
- [var](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/var)
- [let](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let)
- [Function declarations](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function)
- [GlobalDeclarationInstantiation](https://tc39.es/ecma262/#sec-globaldeclarationinstantiation)
