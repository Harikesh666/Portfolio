---
title: "Global Scope and this: Look at the Call Site"
description: "How global bindings, classic scripts, modules, strict mode, methods, arrows, constructors, and event listeners determine the value of this."
category: "JavaScript"
readTime: "16 min read"
date: "January 2025"
publishedAt: "2025-01-21"
---

# Global Scope and this: Look at the Call Site

Few JavaScript keywords create as much confusion as `this`.

It looks like a shortcut to the current object. Sometimes it is. Then you move the same function into a variable, and `this` changes. You replace `function` with an arrow, and it changes again. You run the code as a module, and the global value disappears entirely.

It feels personal. JavaScript is looking directly at your code and choosing the least convenient object.

But `this` is not random.

For ordinary functions, its value usually depends on **how the function is called**. For arrow functions, it comes from the surrounding lexical environment.

Before we explore those calls, we need to separate three ideas that are often mixed together:

1. Global scope
2. The global object
3. The value of `this`

They overlap in some environments, but they are not the same thing.

## The global environment

When JavaScript evaluates a script, it needs an environment for top-level declarations and expressions. The specification models this with a global environment record and an execution context for the running code.

In a browser page, the global object is exposed as `window`.

```js
console.log(window);
```

The standard cross-environment way to refer to the global `this` value is `globalThis`:

```js
console.log(globalThis);
```

In an ordinary browser window:

```js
console.log(globalThis === window);
```

Output:

```text
true
```

Why not always write `window`?

Because `window` belongs to browser pages. A Web Worker has no `window`, and Node.js uses a different global environment. `globalThis` gives our code one standard name across those environments.

That does not mean every runtime has the same APIs. `globalThis.document` exists in a browser page, not in an ordinary Node.js process.

## Global scope is not one giant object

The original example used a top-level `var`:

```html
<script>
    var topic = "Global";

    function sayHello() {
        console.log("Hello " + topic);
    }

    console.log(this.topic);
    console.log(window.topic);
    sayHello();
</script>
```

In a classic browser script, the output is:

```text
Global
Global
Hello Global
```

The top-level `var` binding is connected to a property of the global object, so `topic` and `window.topic` reach the same value.

Top-level function declarations in classic scripts are also generally represented through the object side of the global environment:

```js
function greet() {
    console.log("Hello");
}

console.log(window.greet === greet);
```

Output in the classic-script case:

```text
true
```

Now change `var` to `let`:

```html
<script>
    let topic = "Lexical";

    console.log(topic);
    console.log(window.topic);
</script>
```

The binding exists in global scope, but it is not created as a property on `window`:

```text
Lexical
undefined
```

Top-level `const` and `class` declarations also use the declarative side of the global environment rather than becoming ordinary global-object properties.

So this claim is too broad:

> Every variable declared globally becomes a property of the global object.

The accurate version is:

> In a classic browser script, top-level `var` and many top-level function declarations create global bindings associated with global-object properties. Top-level `let`, `const`, and `class` declarations do not.

The distinction matters when old code expects every global name to appear on `window`.

## Classic scripts and modules have different top-level this

At the top level of a classic browser script:

```html
<script>
    console.log(this === window);
</script>
```

Output:

```text
true
```

But JavaScript modules use different rules:

```html
<script type="module">
    console.log(this);
</script>
```

Output:

```text
undefined
```

Module declarations are scoped to the module rather than installed as properties on `window`:

```html
<script type="module">
    var topic = "Module";

    console.log(topic);
    console.log(window.topic);
</script>
```

Assuming no other code created `window.topic`, the output is:

```text
Module
undefined
```

Modern frontend code is commonly bundled or executed as modules. That is why copying an old console example into a module can produce a different value for top-level `this`.

Node.js adds another reason not to memorize “top-level `this` is always the global object.” CommonJS modules and ECMAScript modules have their own wrappers and rules. Use `globalThis` when you actually need the global value; do not try to discover it through top-level `this`.

## Function calls create execution contexts

Each time an ordinary JavaScript function is called, the engine creates an execution context for that call. That context includes parameters, local bindings, the code being executed, and a `this` binding.

```js
function showDetails(message) {
    const localValue = "local";

    console.log(message);
    console.log(localValue);
    console.log(this);
}
```

The parameter and local variable come from the function’s lexical environment.

The value of `this` does not come from where the function was written. For an ordinary function, it is usually chosen by the form of the call.

That calling expression has a name: the **call site**. `showThis()` and `user.showThis()` may reach the same function, but they call it in two different ways. They are different call sites, and that difference can change `this`.

That gives us the most useful rule in this article:

> Do not ask where the function lives. Ask how it was called.

## A simple function call

Consider this ordinary function:

```js
function showThis() {
    console.log(this);
}

showThis();
```

The call has no object before the dot because there is no dot. This is a **simple call**.

In a non-strict classic browser script, `this` is substituted with the global `this` value, normally `window`:

```js
function showThis() {
    console.log(this === window);
}

showThis();
```

Output:

```text
true
```

Strict mode removes that substitution:

```js
"use strict";

function showThis() {
    console.log(this);
}

showThis();
```

Output:

```text
undefined
```

Module code is always strict, so simple calls inside modules follow the strict behavior.

This is why relying on the global fallback is fragile. The same function can appear to work in an old script and fail in a module.

## A method call uses the receiver

Place a function on an object and call it through that object:

```js
const user = {
    name: "Alice",
    greet: function () {
        console.log(`Hello, ${this.name}`);
    },
};

user.greet();
```

Output:

```text
Hello, Alice
```

In `user.greet()`, the receiver is `user`, so `this` is `user` during that call.

You will often hear, “Inside an object method, `this` refers to the object the method belongs to.” That works for this example, but the word *belongs* can mislead us.

Functions are values. The same function can be attached to another object:

```js
const greet = function () {
    console.log(`Hello, ${this.name}`);
};

const alice = { name: "Alice", greet };
const binod = { name: "Binod", greet };

alice.greet();
binod.greet();
```

Output:

```text
Hello, Alice
Hello, Binod
```

The function did not permanently belong to either object. Each call supplied a different receiver.

## Detaching a method loses the receiver

Now separate the function from the object call:

```js
"use strict";

const user = {
    name: "Alice",
    greet() {
        console.log(`Hello, ${this.name}`);
    },
};

const detachedGreet = user.greet;
detachedGreet();
```

The last line is a simple function call, not a method call. In strict mode, `this` is `undefined`, so reading `this.name` throws a `TypeError`.

Nothing about the function remembers that it once came from `user`.

This often appears when passing methods as callbacks:

```js
setTimeout(user.greet, 1000);
```

The timer receives a function value. It does not receive the original `user.greet()` call expression, so the original receiver relationship is gone.

One fix is an arrow wrapper:

```js
setTimeout(() => user.greet(), 1000);
```

When the arrow callback runs, it performs a fresh method call through `user`.

Another fix is `bind`:

```js
const boundGreet = user.greet.bind(user);
setTimeout(boundGreet, 1000);
```

`bind` creates a new function whose `this` value is fixed to `user` for ordinary calls.

## call, apply, and bind set this explicitly

JavaScript lets us choose the `this` value for an ordinary function.

```js
function introduce(greeting, punctuation) {
    console.log(`${greeting}, I am ${this.name}${punctuation}`);
}

const person = { name: "Harikesh" };
```

`call` invokes the function immediately with arguments listed separately:

```js
introduce.call(person, "Hello", "!");
```

`apply` invokes it immediately with arguments supplied in an array-like value:

```js
introduce.apply(person, ["Namaste", "."]);
```

`bind` does not invoke the function immediately. It creates another function:

```js
const introduceHarikesh = introduce.bind(person, "Hello");
introduceHarikesh("!");
```

Output:

```text
Hello, I am Harikesh!
Namaste, I am Harikesh.
Hello, I am Harikesh!
```

These methods are useful when an API will call our function later but we need the function to retain a particular receiver.

## Arrow functions do not create this

Arrow functions use **lexical `this`**. They do not receive a new `this` value from the way they are called. Instead, a `this` reference inside an arrow resolves through the surrounding lexical environment.

Return to the original object example:

```js
const person = {
    name: "Alice",
    greet: function () {
        console.log(`Hello, ${this.name}`);
    },
    greetWithArrow: () => {
        console.log(this);
    },
};

person.greet();
person.greetWithArrow();
```

`person.greet()` uses `person` as the receiver.

But `person.greetWithArrow()` does not give the arrow its own `this`. The arrow looks outside the object literal, because object literals do not create lexical scopes or `this` bindings.

What value does it find?

- In a classic browser script, the surrounding top-level `this` is normally `window`.
- In a JavaScript module, the surrounding top-level `this` is `undefined`.
- In another enclosing function, it may inherit that function call’s `this`.

That is why “an arrow method’s `this` is always `window`” is incorrect. The answer depends on the arrow’s lexical surroundings.

Arrows are useful inside an ordinary method when we want an inner callback to keep the method’s receiver:

```js
const counter = {
    value: 0,
    start() {
        const timerId = setInterval(() => {
            this.value += 1;
            console.log(this.value);

            if (this.value === 3) {
                clearInterval(timerId);
            }
        }, 1000);
    },
};

counter.start();
```

`start` receives `counter` as `this`. The arrow inside `setInterval` captures that same `this`.

Calling `call`, `apply`, or `bind` on an arrow cannot replace its lexical `this`:

```js
const showThis = () => console.log(this);
showThis.call({ name: "Ignored" });
```

The supplied object is ignored for `this` binding.

## Constructor calls create a new receiver

When an ordinary constructible function is called with `new`, JavaScript creates a new object and uses it as `this` during the constructor call.

```js
function Person(name) {
    this.name = name;
}

const person = new Person("John");

console.log(person.name);
```

Output:

```text
John
```

At a high level, `new Person("John")` does this:

1. Creates a new object linked to `Person.prototype`
2. Calls `Person` with that object as `this`
3. Returns the new object unless the constructor explicitly returns another object

Arrow functions cannot be constructors because they have no constructor behavior and no own `this` binding:

```js
const Person = (name) => {
    this.name = name;
};

new Person("John"); // TypeError
```

Classes use the same broad instance idea:

```js
class Person {
    constructor(name) {
        this.name = name;
    }

    greet() {
        console.log(`Hello, ${this.name}`);
    }
}
```

Class bodies run in strict mode, so a detached class method does not receive a global fallback.

## Event listeners: currentTarget, not necessarily target

For a regular function registered with `addEventListener`, the browser calls the listener with `this` set to the event’s `currentTarget`:

```js
const button = document.querySelector("button");

button.addEventListener("click", function handleClick(event) {
    console.log(this === event.currentTarget);
});
```

Output after clicking:

```text
true
```

The original summary said `this` refers to the element that triggered the event. That can be close, but `event.target` and `event.currentTarget` are different.

Imagine a button containing an icon:

```html
<button id="save">
    <span>Save</span>
</button>
```

If the user clicks the `span`:

- `event.target` may be the `span` where the event originated.
- `event.currentTarget` is the `button` whose listener is currently running.
- `this` in a regular listener is the same as `event.currentTarget`.

An arrow listener does not receive this event-listener binding:

```js
button.addEventListener("click", (event) => {
    console.log(event.currentTarget);
});
```

Use `event.currentTarget` when that is what you mean. It is explicit and works regardless of whether the listener is ordinary or arrow-shaped.

## this is not lexical scope

This distinction prevents many bugs.

```js
const name = "Outer";

const user = {
    name: "Object",
    showName() {
        const name = "Local";

        console.log(name);
        console.log(this.name);
    },
};

user.showName();
```

Output:

```text
Local
Object
```

The identifier `name` is resolved through lexical scope.

The expression `this.name` first resolves `this` from the call and then reads a property from that value.

`this` does not mean “look for a variable in the nearest scope.” It is a value supplied by an ordinary function call or inherited lexically by an arrow.

Closures answer **where was this function created?**

Ordinary `this` usually answers **how was this function called?**

Those are different questions.

## A practical this checklist

When `this` surprises you, inspect the actual call expression.

| Call form | Typical `this` value |
| --- | --- |
| `functionCall()` | `undefined` in strict mode; global fallback in non-strict code |
| `object.method()` | `object`, the receiver of the call |
| `method.call(value)` | `value`, subject to ordinary-function rules |
| `method.apply(value, args)` | `value`, subject to ordinary-function rules |
| `boundFunction()` | The value captured by `bind` |
| `new Constructor()` | The newly created instance |
| Arrow function call | Inherited from the lexical environment |
| Regular DOM listener | `event.currentTarget` while the listener runs |
| Top-level classic browser script | Usually `window` |
| Top-level module | `undefined` |

This table is a map, not a replacement for reasoning. The fastest reliable process is:

1. Is the function an arrow?
2. If yes, find the nearest enclosing non-arrow `this` environment.
3. If no, inspect the call form.
4. Check whether strict mode or module rules apply.
5. Do not confuse a lexical variable with an object property.

## What to remember

1. **Global scope and the global object are related, not identical.**  
   Top-level `let`, `const`, and `class` bindings do not become `window` properties.

2. **Top-level this depends on the source type.**  
   A classic browser script gets `window`; a module gets `undefined`.

3. **Ordinary-function this depends on the call.**  
   Look at the receiver, `call`, `apply`, `bind`, or `new`.

4. **Methods do not permanently remember their objects.**  
   Detaching a method removes the original receiver.

5. **Arrows inherit this lexically.**  
   They do not receive a new `this` from method, event, or explicit binding calls.

6. **Event target and currentTarget differ.**  
   A regular listener’s `this` matches `currentTarget`, not necessarily the originating element.

7. **this is not scope.**  
   Lexical identifier lookup and property lookup through `this` follow different rules.

JavaScript is not asking which object owns the function forever. It is asking what kind of call is happening now.

Look at the call site, and `this` becomes far less mysterious.

## Try it yourself

Predict every output or error:

```js
"use strict";

function show() {
    console.log(this?.name ?? "no receiver");
}

const first = { name: "First", show };
const second = { name: "Second", show };

first.show();
second.show();

const detached = first.show;
detached();

show.call({ name: "Explicit" });

const bound = show.bind({ name: "Bound" });
bound.call({ name: "Ignored" });

const arrow = () => console.log(this);
arrow.call({ name: "Also ignored" });
```

Then run the same snippet once as a classic browser script and once as a module. Only one line depends on that surrounding top-level environment. Can you identify it before running the code?

## Further reading

- [this](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this)
- [globalThis](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/globalThis)
- [Arrow functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions)
- [Event.currentTarget](https://developer.mozilla.org/en-US/docs/Web/API/Event/currentTarget)
- [ECMAScript global environment records](https://tc39.es/ecma262/#sec-global-environment-records)
