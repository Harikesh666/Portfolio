---
title: "More on Closures: Scope Chains, Privacy, and Memory"
description: "A deeper look at returned functions, lexical bindings, shadowing, private state, constructor closures, and garbage collection."
category: "JavaScript"
readTime: "14 min read"
date: "January 2025"
publishedAt: "2025-01-03"
---

# More on Closures: Scope Chains, Privacy, and Memory

The [foundational closures article](/writing/closures-function-backpack) used a backpack as its mental model: a function carries access to bindings from the lexical environment where it was created.

That model explains the basics. Now we can ask harder questions.

- What does `outer()()` actually do?
- Can closures retain `let`, `const`, and function parameters?
- What happens when several nested scopes use the same name?
- How can multiple methods share one private variable?
- Do closures keep an entire function call in memory forever?

These questions move closures from “I know the definition” to “I can reason about unfamiliar code.”

Let’s take them one at a time.

## What does outer()() mean?

Start with this closure:

```js
function outer() {
    const a = 10;

    function inner() {
        console.log(a);
    }

    return inner;
}
```

The familiar version stores the returned function:

```js
const close = outer();
close(); // 10
```

The same calls can be written together:

```js
outer()(); // 10
```

Read the expression from left to right.

### First call: outer()

The first pair of parentheses calls `outer`.

```js
outer()
```

That call returns the function `inner`.

Conceptually, the expression has now become:

```js
inner();
```

### Second call: ()

The second pair of parentheses calls the function returned by the first call.

That is all `outer()()` means:

1. Call a function.
2. Take its return value.
3. Call that value as a function.

This is not automatically an IIFE. An **Immediately Invoked Function Expression** calls a function expression as soon as the expression creates it:

```js
(function runNow() {
    console.log("Running");
})();
```

`outer()()` is different. It calls an existing function, then immediately calls the function that the first call returns.

The two patterns can both contain immediate calls, but they describe different structures.

## The reusable and immediate forms serve different purposes

Use the stored form when the returned closure should run more than once:

```js
const close = outer();

close(); // 10
close(); // 10
```

Use the double-call form when the returned function is needed only once:

```js
outer()();
```

The closure exists in both versions. Storing the function changes how long and how often the program can use it.

## Are let and const bindings closed over?

Yes.

Closures are not limited to variables declared with `var`. They work with any binding in the lexical environment, including `let`, `const`, function declarations, classes, and parameters.

```js
function outer() {
    function inner() {
        console.log(a);
    }

    let a = 10;
    return inner;
}

const close = outer();
close(); // 10
```

Notice that `inner` is created before the `let` declaration executes.

Why does the example still work?

The closure retains access to the binding. The program does not call `inner` until after `a` has been initialized with `10`.

Call it too early and the temporal dead zone matters:

```js
function outer() {
    function inner() {
        console.log(a);
    }

    inner(); // ReferenceError
    let a = 10;
}

outer();
```

The binding exists, but it is uninitialized when `inner` tries to read it.

Closures do not bypass normal scope or initialization rules. They preserve access to the binding with those rules intact.

## Function parameters are bindings too

A function parameter belongs to the function’s local environment, so an inner function can close over it.

```js
function createGreeting(name) {
    return function greet() {
        console.log(`Hello, ${name}`);
    };
}

const greetMira = createGreeting("Mira");
greetMira(); // "Hello, Mira"
```

The parameter `name` is not special after the call begins. It behaves as a local binding that the returned function can access.

The binding can also change before the closure runs:

```js
function createGreeting(name) {
    name = name.trim();

    return function greet() {
        console.log(`Hello, ${name}`);
    };
}

const greetMira = createGreeting("  Mira  ");
greetMira(); // "Hello, Mira"
```

The closure observes the current value of the `name` binding, not an earlier frozen copy.

This is why function factories work. Arguments configure a lexical environment, and the returned function continues to use that configuration.

## Closures follow the complete scope chain

Now add another level:

```js
function outest() {
    const c = 20;

    function outer(b) {
        const a = 10;

        function inner() {
            console.log(a, b, c);
        }

        return inner;
    }

    return outer;
}

const close = outest()("Hello");
close(); // 10 "Hello" 20
```

There are three calls hidden in this example:

```js
const outer = outest();
const inner = outer("Hello");
inner();
```

When `inner` reads a name, JavaScript searches its lexical environments from nearest to farthest:

```text
inner's local environment
    ↓
outer's environment: a = 10, b = "Hello"
    ↓
outest's environment: c = 20
    ↓
global environment
```

`inner` can read:

- `a`, declared in `outer`
- `b`, passed as a parameter to `outer`
- `c`, declared in `outest`

The function does not copy these bindings into one flat object. Its internal environment connection leads through the lexical chain.

An engine can optimize how that chain is represented, but the observable lookup behavior must remain the same.

## Shadowing chooses the nearest binding

What happens when several scopes use the same name?

```js
const a = 100;

function outest() {
    const c = 20;

    function outer(b) {
        const a = 10;

        return function inner() {
            console.log(a, b, c);
        };
    }

    return outer;
}

const close = outest()("Hello");
close(); // 10 "Hello" 20
```

`inner` starts its search in the nearest environment.

It finds `a = 10` inside `outer`, so it stops searching for `a`. The global `a = 100` is shadowed.

Remove the local declaration:

```js
const a = 100;

function outest() {
    const c = 20;

    function outer(b) {
        return function inner() {
            console.log(a, b, c);
        };
    }

    return outer;
}

outest()("Hello")(); // 100 "Hello" 20
```

Now the search reaches the global environment and finds `a = 100`.

Closures do not change shadowing. They preserve the lexical environment chain in which normal name resolution occurs.

## Data hiding without a closure

Suppose a counter uses global state:

```js
let count = 0;

function incrementCounter() {
    count += 1;
}
```

Any code in the same scope can modify `count`:

```js
count = -500;
```

The function has no control over those changes.

A closure can narrow access:

```js
function createCounter() {
    let count = 0;

    return function incrementCounter() {
        count += 1;
        console.log(count);
    };
}

const counter = createCounter();
counter(); // 1
counter(); // 2
```

Only code with access to the returned function can change `count` through this operation.

This is encapsulation, but “private” does not mean secure against hostile code in every possible environment. It means the binding is not directly available through the public interface.

## Several methods can share one private binding

A useful module often needs more than one operation.

```js
function createCounter() {
    let count = 0;

    return {
        increment() {
            count += 1;
            return count;
        },
        decrement() {
            count -= 1;
            return count;
        },
        read() {
            return count;
        },
    };
}

const counter = createCounter();

console.log(counter.increment()); // 1
console.log(counter.increment()); // 2
console.log(counter.decrement()); // 1
console.log(counter.read());      // 1
```

All three methods are created during the same call to `createCounter`. They close over the same `count` binding.

The object exposes behavior while keeping the state outside the public object properties.

Create another instance and it receives another environment:

```js
const first = createCounter();
const second = createCounter();

console.log(first.increment());  // 1
console.log(first.increment());  // 2
console.log(second.increment()); // 1
```

The methods within one instance share state. Different factory calls create independent state.

## Constructor functions can also create private state

Before JavaScript private class fields, closures were often used inside constructor functions:

```js
function Counter() {
    let count = 0;

    this.increment = function increment() {
        count += 1;
        return count;
    };

    this.decrement = function decrement() {
        count -= 1;
        return count;
    };
}

const counter = new Counter();

console.log(counter.increment()); // 1
console.log(counter.increment()); // 2
console.log(counter.decrement()); // 1
console.log(counter.count);       // undefined
```

`count` belongs to the constructor call’s lexical environment. Both methods close over it.

Each `new Counter()` call creates:

- A new private `count` binding
- New `increment` and `decrement` function objects

That last point is a trade-off. Prototype methods can be shared by all instances, but prototype methods cannot directly access a constructor-local closure binding.

Modern classes provide private fields:

```js
class Counter {
    #count = 0;

    increment() {
        this.#count += 1;
        return this.#count;
    }
}
```

Closure privacy and private fields solve related problems with different object and method structures. Closures remain useful when state belongs to a function factory rather than a class instance.

## Do closures keep everything in memory?

This question needs a careful answer.

A closure must preserve the behavior of every binding it can observe. That does not require an engine to keep an entire call-stack frame or every local variable in one permanent object.

Consider:

```js
function createReader() {
    const used = "keep me";
    const unused = "not read by the closure";

    return function read() {
        return used;
    };
}

const read = createReader();
```

The returned function observes `used`. It never refers to `unused`.

The JavaScript specification defines the observable scope behavior, not the engine’s exact memory layout. An engine may avoid retaining data that cannot affect the program, but code should not depend on a particular internal optimization.

The safe rule is:

> A reachable closure can keep the environment data required for its observable behavior reachable.

That is more accurate than “closures save every variable” and more useful than assuming an engine will always optimize unused bindings away.

## When closure retention becomes a problem

Closures are normal. They are not memory leaks by themselves.

A problem appears when a long-lived closure keeps data reachable longer than the application needs it.

```js
function registerHandler(button, largeDataset) {
    function handleClick() {
        console.log(largeDataset.length);
    }

    button.addEventListener("click", handleClick);

    return function cleanup() {
        button.removeEventListener("click", handleClick);
    };
}
```

As long as the event listener remains registered, the browser can reach `handleClick`. The handler can reach `largeDataset`, so the dataset remains reachable too.

The returned cleanup function removes the listener when it is no longer needed.

This pattern appears in:

- DOM event listeners
- Subscriptions
- Timers and intervals
- Caches
- Application-level registries
- Long-lived asynchronous callbacks

The issue is lifecycle, not the existence of a closure.

## Closures and garbage collection

JavaScript garbage collectors reclaim unreachable managed memory.

The important word is **unreachable**.

```js
let read = createReader();

console.log(read());
read = null;
```

After `read` is set to `null`, assume nothing else refers to the returned function. The function and the environment data that only it could reach can become eligible for garbage collection.

Collection does not necessarily happen immediately. The engine decides when to run its garbage collector.

Modern engines use strategies such as generational, incremental, parallel, and concurrent collection. Those strategies affect performance and pause time, but they do not change the closure rule: reachable behavior must continue to work.

## The disadvantages, stated accurately

Closures have costs, but the costs should not be exaggerated.

### Retained memory

A long-lived closure can keep required environment data reachable. This matters when the captured data is large or when many closures live for a long time.

### Per-instance functions

Factory and constructor patterns often create new function objects for each instance. That can use more memory than shared prototype methods.

### Hidden state

Private closure state can make debugging harder because the state is not visible as a normal public property.

### Stale assumptions

Asynchronous callbacks can observe values that changed between registration and execution. Closures retain bindings, so developers must reason about when those bindings change.

What closures do **not** do automatically:

- They do not create a memory leak merely by existing.
- They do not freeze the browser merely because many functions close over variables.
- They do not prevent all captured data from ever being collected.

Performance problems require a real retention path or excessive work. Measure and inspect that path instead of blaming the language feature.

## Put the advanced model together

When reading complex closure code, follow this process:

1. Mark where each function is created.
2. List the outer bindings each function reads or writes.
3. Draw the lexical chain from nearest scope to global scope.
4. Check whether a nearer declaration shadows a farther one.
5. Identify what keeps each returned function or callback reachable.
6. Determine which environment data must remain reachable with it.
7. Look for an explicit cleanup point for long-lived listeners or subscriptions.

This turns closure reasoning into a mechanical process instead of a guess.

## Key takeaways

1. **`outer()()` performs two calls.**  
   The first returns a function; the second calls that returned function.

2. **Closures retain lexical bindings of every declaration kind.**  
   `let`, `const`, function declarations, classes, and parameters can all participate.

3. **Initialization rules still apply.**  
   A closure does not bypass the temporal dead zone.

4. **Name lookup follows the lexical chain.**  
   The nearest matching binding wins, which is ordinary shadowing.

5. **Several functions can share one private environment.**  
   This enables module APIs and constructor-local state.

6. **Each factory or constructor call can create independent state.**

7. **Closures affect reachability, not the existence of garbage collection.**  
   Long-lived callbacks can retain data, but unreachable closures can be collected.

8. **Engine memory layout is an implementation detail.**  
   Reason from observable bindings and reachability, not from assumed internal objects.

The foundational backpack model still works. This deeper view tells you what is inside the backpack, how JavaScript finds each binding, and when the backpack itself can finally be discarded.

## Try it yourself

Extend the private counter so each instance supports:

```js
const counter = createCounter(10);

counter.increment(); // 11
counter.add(5);      // 16
counter.reset();     // 10
counter.read();      // 10
```

Before writing the functions, answer:

1. Which binding contains the initial value?
2. Which binding contains the current value?
3. Which methods need read access?
4. Which methods need write access?
5. Why does a second counter not share the first counter’s state?

Then decide whether a factory closure or a class with a private field expresses the design more clearly.

## Further reading

- [Closures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures)
- [JavaScript execution model](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model)
- [ECMAScript environment records](https://tc39.es/ecma262/#sec-environment-records)
- [V8 garbage collection](https://v8.dev/blog/trash-talk)
