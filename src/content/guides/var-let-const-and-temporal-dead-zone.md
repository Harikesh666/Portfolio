---
title: "var, let, and const: Bindings, Scope, and the TDZ"
description: "Compare var, let, and const through declaration setup, scope, redeclaration, reassignment, global behavior, and the Temporal Dead Zone."
category: "JavaScript"
readTime: "14 min read"
date: "February 2025"
publishedAt: "2025-02-08"
---

# var, let, and const: Bindings, Scope, and the TDZ

JavaScript gives us three keywords for declaring variables:

```js
var oldWay = "var";
let changingValue = "let";
const fixedBinding = "const";
```

They can all place a value behind a name, so the difference may look small at first.

It is not small.

The connection between a name and its value is called a **binding**. You can picture it as a labeled slot inside a scope. A declaration creates the slot, and initialization gives it its first value. Before initialization, some bindings exist in an uninitialized state.

The keyword changes:

- When the binding is initialized
- Where the name can be accessed
- Whether the name can be declared again
- Whether the binding can receive another value
- Whether a top-level browser declaration becomes a `window` property

Most confusing explanations try to compress all of that into one sentence about hoisting.

Let’s slow down and compare one behavior at a time.

## 1. Hoisting with var, let, and const

You will often hear this explanation:

> JavaScript moves variable declarations to the top of their scope.

That is a useful first picture, but JavaScript does not physically move the source code.

Before evaluating statements in a scope, JavaScript creates the bindings required by that scope. Different declarations initialize those bindings at different times.

That is the real difference.

## var is initialized with undefined

```js
console.log(score);

var score = 10;
```

Output:

```text
undefined
```

Before statement evaluation begins, JavaScript creates the `score` binding and initializes it to `undefined`.

Then the statements run in order:

1. `console.log(score)` reads `undefined`.
2. `var score = 10` assigns `10` to the existing binding.

The value `10` is not hoisted. Only the binding exists early.

## let and const are created but not initialized

```js
console.log(message);

let message = "Hello";
```

This throws an error similar to:

```text
ReferenceError: Cannot access 'message' before initialization
```

The same is true for `const`:

```js
console.log(limit);

const limit = 10;
```

The `message` and `limit` bindings exist from the beginning of their scope, but they remain uninitialized until JavaScript evaluates their declarations.

That uninitialized period is the **Temporal Dead Zone**, usually shortened to TDZ.

So all three declaration types affect the scope before execution reaches their source lines, but they do not behave the same way:

```text
var   → binding created and initialized to undefined
let   → binding created but uninitialized
const → binding created but uninitialized
```

The article [JavaScript Hoisting Does Not Move Your Code](/writing/javascript-hoisting-does-not-move-code) goes deeper into declaration instantiation. Here, we will focus on how the three keywords differ in practice.

## The TDZ begins at the start of the scope

The TDZ is not limited to the line immediately above the declaration.

```js
let value = "outer";

{
    console.log(value);

    let value = "inner";
}
```

The log does not print `"outer"`. The block has its own `value` binding, and that inner binding shadows the outer one throughout the block.

At the log line, the inner binding is still uninitialized, so JavaScript throws a `ReferenceError`.

The TDZ starts when execution enters the scope and ends when the declaration is evaluated.

```js
{
    let value;
    console.log(value); // undefined

    value = 10;
    console.log(value); // 10
}
```

`let value;` initializes the binding to `undefined`. After that line, the variable is no longer in the TDZ.

## 2. Scope differences: global, function, and block scope

Scope answers where a binding can be reached.

## var is not scoped to ordinary blocks

```js
function showVarScope() {
    if (true) {
        var x = 10;
    }

    console.log(x); // 10
}

showVarScope();
```

The `if` block does not contain `x`. The binding belongs to the surrounding function.

This is why `var` is usually described as function-scoped.

```js
function outer() {
    var message = "inside outer";
}

outer();
console.log(message); // ReferenceError
```

The function boundary contains the `var` binding.

## let and const are block-scoped

```js
function showBlockScope() {
    if (true) {
        let y = 20;
        const z = 30;

        console.log(y, z); // 20 30
    }

    console.log(y); // ReferenceError
    console.log(z); // Not reached
}

showBlockScope();
```

The braces contain `y` and `z`. Code outside that block cannot access them.

This applies to standalone blocks, conditional blocks, loop blocks, `catch` blocks, and other lexical scopes.

For a complete walkthrough, read [JavaScript Blocks, Scope, and Shadowing](/writing/javascript-block-scope-and-shadowing).

## Top-level browser declarations are different

In a classic browser script, a top-level `var` normally becomes a property of the global object:

```html
<script>
    var varName = "var";
    let letName = "let";
    const constName = "const";

    console.log(window.varName);   // var
    console.log(window.letName);   // undefined
    console.log(window.constName); // undefined
</script>
```

The top-level `let` and `const` bindings still exist. They simply are not properties of `window`.

This example is specifically about a classic browser script. JavaScript modules have a module scope, and Node.js has its own top-level environment. Do not memorize “global `var` always means `window`” without remembering the environment.

When code needs the global object across environments, `globalThis` is the standard name. That does not make lexical declarations properties of it.

## 3. Redeclaration and reassignment rules

Redeclaration and reassignment sound similar, but they are different operations.

- **Redeclaration** means declaring the same name again in the same scope.
- **Reassignment** means giving an existing binding another value.

Keeping those words separate makes the rules much easier.

## var allows redeclaration

```js
var x = 1;
var x = 2;

console.log(x); // 2
```

Both declarations refer to one binding in the same variable scope.

This flexibility can hide mistakes. If two distant parts of a function declare the same `var`, JavaScript does not warn us that the name was reused.

`var` also allows reassignment:

```js
var x = 1;
x = 2;
```

## let rejects redeclaration but allows reassignment

```js
let y = 1;
let y = 2;
```

This is a syntax error:

```text
SyntaxError: Identifier 'y' has already been declared
```

But changing the existing value is allowed:

```js
let y = 1;
y = 2;

console.log(y); // 2
```

That is the main job of `let`: create a block-scoped binding whose value is expected to change.

## const rejects both redeclaration and reassignment

```js
const z = 1;
const z = 2;
```

The duplicate declaration is a `SyntaxError`.

This is also not allowed:

```js
const z = 1;
z = 2;
```

The assignment throws a `TypeError` because the `z` binding is constant.

Unlike `let`, a `const` declaration must include an initializer:

```js
const z;
```

That is a syntax error. JavaScript cannot create a constant binding without giving it its one initial value.

## The same name can exist in a nested scope

The no-redeclaration rule applies within one scope. A nested block can create another binding with the same name:

```js
let value = "outer";

{
    let value = "inner";
    console.log(value); // inner
}

console.log(value); // outer
```

This is shadowing, not redeclaration in the same scope.

## 4. Error types associated with var, let, and const

The error type often tells us which rule was broken.

## SyntaxError: the program cannot be parsed as valid code

```js
let count = 1;
let count = 2;
```

```js
const limit;
```

These errors are detected before the surrounding code can run.

## ReferenceError: a binding cannot be resolved or accessed

```js
console.log(message);
let message = "Hello";
```

The binding exists, but it is uninitialized in the TDZ.

An entirely missing name also produces a `ReferenceError`:

```js
console.log(neverDeclared);
```

The same error class can describe different lookup failures, so read the message and inspect the scope.

## TypeError: an operation is invalid for the value or binding

```js
const price = 100;
price = 200;
```

The declaration is valid. The later assignment is not allowed for a constant binding, so execution throws a `TypeError`.

This distinction is useful while debugging:

```text
SyntaxError    → the declaration arrangement is invalid
ReferenceError → the name cannot be accessed here
TypeError      → the attempted operation is not allowed
```

## 5. Working with the Temporal Dead Zone

A common suggestion is to declare every `let` and `const` at the beginning of the scope to shrink the TDZ.

That avoids early access, but pushing every declaration to the top can separate a name from the code that gives it meaning.

A better practical rule is:

> Keep the scope small and declare a variable close to its first use.

```js
function printReceipt(order) {
    validateOrder(order);

    const subtotal = calculateSubtotal(order.items);
    const tax = subtotal * 0.18;
    const total = subtotal + tax;

    console.log({ subtotal, tax, total });
}
```

The variables appear when they become useful. There is little opportunity to access them accidentally before initialization.

Narrow scopes help more than collecting every declaration at the top of a large function.

Another useful habit is to avoid using a variable inside its own initializer:

```js
const value = value + 1;
```

The right-side `value` refers to the new binding, which is still in the TDZ. It does not reach an outer variable with the same name.

## 6. Differences between let and const in practice

`let` and `const` share several features:

- Both are block-scoped.
- Both have a TDZ.
- Neither permits redeclaration in the same scope.
- Neither becomes a `window` property merely because it appears at the top level of a classic script.

Their practical difference is reassignment.

```js
let a;
a = 10;
a = 20;
```

`let` can be declared without an initializer. JavaScript initializes it to `undefined` when execution reaches the declaration.

```js
const b = 100;
```

`const` requires an initializer and the binding cannot later point to another value.

That does not make the value itself deeply immutable.

## const protects the binding, not the object

```js
const numbers = [1, 2, 3];

numbers.push(4);
console.log(numbers); // [1, 2, 3, 4]
```

This is allowed because the `numbers` binding still points to the same array.

This is not allowed:

```js
numbers = [5, 6];
```

That assignment tries to make the binding point to a different array.

Objects behave the same way:

```js
const user = {
    name: "Harikesh",
};

user.name = "Hari";
user.role = "Developer";
```

The object can change unless some separate mechanism prevents mutation.

`Object.freeze` can prevent many direct changes to one object, but it is shallow and is a different feature from `const`:

```js
const settings = Object.freeze({
    theme: "dark",
});

settings.theme = "light"; // Fails silently or throws in strict mode
```

Use `const` to express that the binding should not be reassigned. Do not use it as a promise that every reachable object is immutable.

## 7. Practical advice: when to use let and const

A useful default is:

1. Start with `const`.
2. Change it to `let` when the binding must be reassigned.
3. Use `var` mainly when maintaining older code or deliberately teaching its behavior.

Use `const` when one binding should keep one value:

```js
const apiUrl = "/api/users";
const user = await loadUser();
const total = calculateTotal(cart);
```

Use `let` when the binding must change:

```js
let total = 0;

for (const price of prices) {
    total += price;
}
```

Notice that the loop value can still be `const`. Each iteration creates a new `price` binding. The binding is not reassigned within that iteration.

A traditional counter needs `let` because the same binding is incremented:

```js
for (let index = 0; index < items.length; index += 1) {
    console.log(items[index]);
}
```

This version fails when written with `const` because `index += 1` attempts reassignment.

The point is not “always use `const` because it is faster” or “never use `let`.” The point is to communicate whether reassignment is part of the variable’s job.

## 8. Block-scope benefits with let and const

Block scope keeps temporary names from leaking farther than needed.

Compare a block-level `var` with a block-level `let`:

```js
function compareScope() {
    if (true) {
        var x = 10;
        let y = 20;

        console.log(x, y); // 10 20
    }

    console.log(x); // 10
    console.log(y); // ReferenceError
}

compareScope();
```

The `var x` belongs to `compareScope`, so it remains available after the `if` block.

The `let y` belongs only to the block. Once the block ends, later code in the function cannot reach it.

That smaller scope gives us several benefits:

- Temporary names do not remain visible through the entire function.
- Nested blocks can reuse sensible local names without overwriting outer bindings.
- Loop bindings can be separate for each iteration.
- Accidental access from unrelated code becomes less likely.

Scope does not automatically make code bug-free. It reduces the amount of code that can interact with a binding.

That is a very practical form of protection.

## A comparison table

| Behavior | `var` | `let` | `const` |
|---|---|---|---|
| Initialized during scope setup | Yes, with `undefined` | No | No |
| Has a TDZ | No | Yes | Yes |
| Ordinary block scope | No | Yes | Yes |
| Function scope | Yes | Yes, when declared in the function body | Yes, when declared in the function body |
| Same-scope redeclaration | Allowed with another `var` | Not allowed | Not allowed |
| Reassignment | Allowed | Allowed | Not allowed |
| Initializer required | No | No | Yes |
| Classic-script global becomes `window` property | Normally yes | No | No |

The table is useful, but do not memorize it without the reason behind each row.

`var` uses a variable environment and begins as `undefined`. `let` and `const` use lexical environments and remain uninitialized until their declarations are evaluated. `const` then adds one more rule: its binding cannot be reassigned.

## What to remember

1. **Hoisting does not move source code.**  
   JavaScript prepares bindings before evaluating statements.

2. **`var` starts as `undefined`.**  
   Early access works, but it often hides a timing mistake.

3. **`let` and `const` have a TDZ.**  
   Their bindings exist but remain inaccessible until initialization.

4. **`var` ignores ordinary blocks.**  
   `let` and `const` stay within their lexical blocks.

5. **Redeclaration is not reassignment.**  
   `let` can be reassigned but not redeclared in the same scope.

6. **`const` protects a binding.**  
   It does not deeply freeze arrays or objects.

7. **Top-level behavior depends on the environment.**  
   The `window` example applies to classic browser scripts, not every JavaScript file.

8. **Prefer the narrowest clear scope.**  
   Start with `const`, use `let` for reassignment, and treat `var` as a deliberate choice.

The three keywords are not different spellings of the same declaration. Each one tells JavaScript, and the next developer, what kind of binding this name should be.

## Try it yourself

Predict the output or error for each section before running it:

```js
console.log(first);
var first = 1;

{
    // What happens here?
    console.log(second);
    let second = 2;
}

let third = 3;
third = 4;
console.log(third);

const fourth = { value: 4 };
fourth.value = 5;
console.log(fourth.value);

function example() {
    if (true) {
        var functionValue = "var";
        const blockValue = "const";
    }

    console.log(functionValue);
    console.log(blockValue);
}
```

Then answer:

1. Which error stops the script first?
2. What would change if `second` used `var`?
3. Why can `third` change?
4. Why can `fourth.value` change?
5. Which binding escapes the `if` block inside `example`?

## Further reading

- [ECMAScript let and const declarations](https://tc39.es/ecma262/#sec-let-and-const-declarations)
- [ECMAScript var statements](https://tc39.es/ecma262/#sec-variable-statement)
- [JavaScript Hoisting Does Not Move Your Code](/writing/javascript-hoisting-does-not-move-code)
- [JavaScript Blocks, Scope, and Shadowing](/writing/javascript-block-scope-and-shadowing)
- [Global Scope and this: Look at the Call Site](/writing/global-scope-and-this-call-site)
