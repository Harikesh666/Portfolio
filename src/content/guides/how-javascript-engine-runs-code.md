---
title: "How the JavaScript Engine Runs Your Code"
description: "From source text to bytecode and optimized machine code, with the runtime, call stack, heap, and garbage collector explained."
category: "JavaScript"
readTime: "15 min read"
date: "December 2024"
publishedAt: "2024-12-27"
---

# How the JavaScript Engine Runs Your Code

JavaScript is like **Binod**—it is everywhere.

It runs inside browsers, on servers through Node.js, in desktop applications, in robots, and potentially even inside a water cooler.

But how can the same language run in all these places?

The answer is not “because every device understands JavaScript.” The device needs software that understands the language, executes it, manages its memory, and connects it to the outside world.

That software begins with a **JavaScript engine**, but the engine is only one part of the complete runtime environment.

Let’s build the picture one piece at a time.

## The JavaScript engine and runtime environment

A **JavaScript engine** implements the ECMAScript language. It understands JavaScript syntax and the behavior of values, objects, functions, promises, and other language features.

A **runtime environment** contains the engine and the surrounding facilities needed to run useful programs.

In a browser, that larger environment includes:

1. A JavaScript engine
2. Browser APIs such as the DOM, timers, storage, and networking
3. An event loop
4. Queues for scheduled work
5. Integration with rendering and user input

In Node.js, the environment includes:

1. The V8 JavaScript engine
2. Node APIs such as file-system and process access
3. An event loop built with libuv
4. Queues and native bindings for asynchronous work

You may see the abbreviation **JRE** used for “JavaScript Runtime Environment.” The idea is useful, but the term is informal in JavaScript and can be confused with Java’s formally named Java Runtime Environment. I will use **runtime environment** here.

The easiest distinction to remember is:

> The engine understands JavaScript. The runtime environment gives JavaScript a world to interact with.

## APIs connect JavaScript to the outside world

JavaScript, the language, does not define every API we use.

For example:

```js
const total = [1, 2, 3].reduce((sum, value) => sum + value, 0);
```

Arrays, functions, numbers, and `reduce` are part of JavaScript.

Now consider these examples:

```js
document.querySelector("main");
localStorage.getItem("theme");
setTimeout(() => console.log("later"), 1000);
```

The browser provides `document`, `localStorage`, and `setTimeout`. They are not implemented by the ECMAScript language itself.

Node.js exposes a different set of capabilities:

```js
import { readFile } from "node:fs/promises";

const source = await readFile("app.js", "utf8");
```

The `fs` API lets JavaScript work with files, but browser JavaScript does not receive that API.

Some names, such as `setTimeout` and `console`, exist in both browsers and Node.js. That does not make them core JavaScript features. The environments provide their own implementations.

This separation is what makes JavaScript portable. An environment can embed an engine and expose the capabilities that make sense for that environment—even if the environment is a water cooler.

## A short history of JavaScript engines

Brendan Eich created JavaScript at Netscape in 1995. The first JavaScript engine later became known as **SpiderMonkey**, and SpiderMonkey still powers Firefox today.

As websites grew into applications, engines had to do more than execute small scripts. They had to start quickly, handle large programs, manage memory, and optimize code while it was running.

Modern browsers use different engines:

- **V8**, developed by Google, powers Chrome and is embedded by Node.js.
- **SpiderMonkey**, developed by Mozilla, powers Firefox.
- **JavaScriptCore**, developed as part of WebKit, powers Safari.

These engines compete on startup time, execution speed, memory use, standards support, security, and many other trade-offs. There is no useful permanent answer to “which engine is the fastest?” Results depend on the program, device, engine version, and measurement.

The more interesting question is how an engine balances fast startup with fast long-running code.

## A JavaScript engine is a program

A JavaScript engine is not special hardware. It is a large program, commonly implemented in lower-level languages such as C++.

Its job is to take this:

```js
function add(left, right) {
    return left + right;
}

console.log(add(2, 3));
```

and produce behavior that the processor can execute while preserving the rules of JavaScript.

At a high level, the journey looks like this:

```text
Source code
    ↓
Tokens and syntax structures
    ↓
Bytecode or another internal representation
    ↓
Execution and runtime feedback
    ↓
Specialized machine code for useful hot paths
```

The exact pipeline differs between engines. Even inside one engine, not every function takes the same route.

## Phase 1: Parsing the source

Before an engine can execute a program, it must understand its structure.

Take a small statement:

```js
let answer = 7;
```

### Tokenization

The engine first recognizes meaningful pieces such as:

```text
let
answer
=
7
;
```

These pieces are called **tokens**. The engine is no longer looking at an undivided string of characters. It can identify a declaration, an identifier, an operator, a number, and punctuation.

### Parsing

The parser checks whether those tokens form valid JavaScript syntax and builds an internal representation of the program.

This representation is commonly described as an **abstract syntax tree**, or AST. Conceptually, the statement above contains:

```text
Variable declaration
└── Binding: answer
    └── Initial value: 7
```

The AST describes structure rather than formatting. Extra spaces and many source-level details no longer matter.

If the tokens do not form valid JavaScript, parsing fails before that code can execute:

```js
let = 7;
```

The parser cannot create a valid variable declaration because the binding name is missing, so the engine reports a syntax error.

Some engines also use lazy parsing. They can inspect enough of a function to validate the program without immediately generating full executable instructions for every function. If a function is never called, delaying that work can save time and memory.

## Phase 2: Interpretation and compilation

The classic explanation compares an interpreter with a compiler.

### The interpreter idea

An interpreter can begin executing an internal instruction stream quickly. It spends less time preparing highly optimized machine code before the program starts.

That helps startup, but repeatedly interpreting instructions has overhead.

### The compiler idea

A compiler spends time translating and optimizing code before executing the result. The generated machine code can run quickly, but compilation itself costs time and memory.

If a browser fully optimized every function before running anything, a page could spend too long preparing code that the user never triggers.

If it only interpreted everything forever, frequently executed code would keep paying interpreter overhead.

Modern engines solve this with **tiered execution**.

## How tiered execution works

The engine starts with a tier that is cheap to prepare. While the program runs, the engine collects information about the code that executes often and the values it receives.

Frequently executed code is often called **hot code**.

The engine can spend more compilation effort on hot code because the improved execution speed has a chance to repay the compilation cost.

The broad flow is:

1. Parse the function.
2. Generate bytecode or another initial executable form.
3. Start executing quickly.
4. Observe runtime behavior.
5. Compile hot code into more specialized machine code.
6. Fall back if later values break an optimization assumption.

This is **Just-In-Time compilation**, usually shortened to JIT compilation. Compilation happens as part of running the program, not only as a separate build step.

## V8 as a concrete example

V8 currently uses several execution tiers. Their names sound dramatic because V8 names many components around ignition, turbines, and power.

### Ignition

**Ignition** is V8’s interpreter. V8 compiles JavaScript source into Ignition bytecode, which Ignition can execute quickly without waiting for top-tier optimization.

### Sparkplug

**Sparkplug** is a fast baseline compiler. It converts bytecode into machine code with little optimization. This removes interpreter dispatch overhead without paying the full cost of aggressive optimization.

### Maglev

**Maglev** is a mid-tier optimizing compiler. It aims to produce better machine code quickly, sitting between Sparkplug and the more expensive top tier.

### TurboFan

**TurboFan** is V8’s top-tier optimizing compiler for JavaScript. It uses runtime feedback to make speculative optimizations for hot code.

Not every function must climb through every tier. The engine makes decisions based on factors such as how often code runs, what the engine has observed, current memory pressure, and whether optimization is likely to help.

## How runtime feedback helps optimization

JavaScript is dynamic. The same function can receive numbers, strings, objects, or almost anything else:

```js
function add(left, right) {
    return left + right;
}

add(1, 2);       // 3
add("A", "B");   // "AB"
```

The `+` operator must support both numeric addition and string concatenation.

Suppose a hot call site has only passed numbers to `add`. An optimizing compiler may generate specialized code based on that observation. Specialized code can avoid some of the checks required by a fully general implementation.

But the assumption must remain safe. If the program later passes strings, the engine cannot return an incorrect result just to preserve the optimization.

The engine checks its assumptions. If an assumption fails, it can abandon the optimized path and continue in a more general tier. This process is called **deoptimization**, or a bailout in some engines.

Optimization must never change the meaning of the JavaScript program. It can only change how efficiently the engine produces that meaning.

## Common engine optimizations

Different engines use different implementations, but several ideas appear across modern engines.

### Inline caching

JavaScript programs repeatedly access properties:

```js
user.name;
user.name;
user.name;
```

An inline cache records useful information about previous accesses at a particular location in the program. If later objects have a compatible shape, the engine can take a faster path instead of repeating the most general property lookup.

### Function inlining

For a small hot function, the optimizer may place the function’s operations directly into the caller’s optimized code. This can remove call overhead and expose more opportunities for optimization.

The source file does not change. Inlining is an internal decision made by the engine.

### Speculation

The engine uses runtime feedback to specialize code for likely value types or object shapes. Guards check whether those assumptions still hold.

Speculation is one reason unpredictable changes in value shapes can affect performance. It is not a reason to write unnatural code without measurements. Engine strategies change, and readable application code matters more than guessing at an optimizer.

## Phase 3: Execution, the stack, and the heap

While code executes, the engine must track function calls and allocate memory.

### The call stack

Consider this program:

```js
function multiply(left, right) {
    return left * right;
}

function area(width, height) {
    return multiply(width, height);
}

console.log(area(4, 5));
```

The broad call sequence is:

```text
Global script
└── area(4, 5)
    └── multiply(4, 5)
```

Calling `area` creates an execution context and places it on the stack. Calling `multiply` places another context above it. When `multiply` returns, its context leaves the stack. Then `area` returns and its context leaves too.

An execution context tracks information needed to run that code, including its current evaluation state, lexical environment, variable environment, and `this` binding where applicable.

The call stack is last-in, first-out: the most recent active call finishes first.

### The heap

Objects and other managed allocations live in memory commonly described as the **heap**.

```js
const user = {
    name: "Mira",
    skills: ["JavaScript", "React"],
};
```

The engine manages storage for the object, its array, and their related data. The exact physical layout is an implementation detail and can change as the engine optimizes the program.

## Garbage collection

JavaScript does not require us to manually free every object. The engine uses a garbage collector to reclaim memory that the program can no longer reach.

Consider this:

```js
let user = {
    name: "Mira",
};

user = null;
```

If nothing else references the original object, that object becomes unreachable and is eligible for garbage collection.

### Mark and sweep as the core idea

A useful first model has two parts:

1. **Mark:** Start from known roots and find objects that are still reachable.
2. **Sweep:** Reclaim memory associated with unreachable objects.

Real collectors are more sophisticated. V8’s Orinoco collector is generational and uses parallel and concurrent work to reduce pauses. Young objects and long-lived objects can be handled differently because most newly allocated objects become unreachable quickly.

So “mark and sweep” is a good mental foundation, not a complete description of every collection cycle.

## The DOM is not part of the JavaScript engine

This distinction deserves its own section because it is easy to blur.

V8 provides the JavaScript language facilities required by ECMAScript. Chrome provides browser features such as the DOM.

When code runs this:

```js
document.querySelector("button");
```

V8 executes the JavaScript call, but the `document` object and DOM implementation come from the browser environment around V8.

This is also why V8 can run inside Node.js without giving Node programs a browser DOM. The same engine is embedded in a different host.

Older diagrams sometimes list **Oilpan** as if it were one of V8’s JavaScript execution components. Oilpan is associated with garbage collection for Blink’s C++ objects and cross-component heap integration. It is not another JavaScript compiler tier beside Ignition or TurboFan.

## Popular engines use different pipelines

V8 is a useful example, not a universal template.

### V8

- Used by Chrome and Node.js
- Starts with Ignition bytecode
- Uses Sparkplug, Maglev, and TurboFan as compilation tiers
- Uses the Orinoco garbage-collection project

### SpiderMonkey

- Used by Firefox
- Descends from the first JavaScript engine
- Uses interpreter, baseline, and optimizing tiers
- Uses runtime feedback and inline caches to guide optimization

### JavaScriptCore

- Used by WebKit and Safari
- Uses the LLInt interpreter
- Uses Baseline JIT, DFG JIT, and FTL JIT tiers

The component names differ, but the goal is similar: begin execution without unnecessary delay, then spend more optimization effort where it is likely to pay off.

## Put the complete picture together

When a browser loads JavaScript, the broad story is:

1. The browser gives source code to its JavaScript engine.
2. The engine tokenizes and parses the source.
3. The engine creates an executable internal form such as bytecode.
4. A low-cost tier begins running the code.
5. The engine tracks calls, scopes, values, and objects during execution.
6. Hot code can move into optimized machine-code tiers.
7. Failed optimization assumptions cause safe deoptimization.
8. The garbage collector reclaims unreachable managed memory.
9. The host environment connects the running JavaScript to APIs, events, rendering, files, or other external capabilities.

None of these components works alone. The engine, host APIs, event loop, queues, memory manager, and surrounding platform cooperate to create the runtime we use.

## Key takeaways

1. **The engine is not the whole runtime.**  
   The engine implements JavaScript. The host provides APIs and coordinates the outside world.

2. **Modern JavaScript is not only interpreted or only compiled.**  
   Engines use tiered execution to balance startup cost with long-running performance.

3. **Optimization is based on observation.**  
   Hot code can receive specialized machine code based on runtime feedback.

4. **Optimizations are allowed to fail safely.**  
   Engines deoptimize when later values break speculative assumptions.

5. **The stack and heap serve different purposes.**  
   The stack tracks active execution. The managed heap stores objects and related allocations.

6. **Garbage collection follows reachability.**  
   Unreachable managed objects can be reclaimed automatically.

7. **Each engine has its own pipeline.**  
   V8, SpiderMonkey, and JavaScriptCore use different tiers while preserving the same JavaScript semantics.

The next time someone says “JavaScript runs in the browser,” ask one more question: which part is the language engine, and which part is the browser around it?

That question is the doorway to understanding how JavaScript actually runs.

## Try it yourself

Take this function:

```js
function formatPrice(value) {
    return `₹${value.toFixed(2)}`;
}

formatPrice(10);
formatPrice(20);
formatPrice(30);
```

Walk it through the article’s model:

1. What must the parser recognize?
2. Which names require bindings?
3. What happens to the call stack during `formatPrice(10)`?
4. Which objects or strings need managed memory?
5. What repeated behavior could an engine observe?
6. What must happen if the function later receives a string instead of a number?

You do not need to predict V8’s exact optimization decision. The goal is to connect source code to parsing, execution contexts, runtime feedback, and safe fallback.

## Further reading

- [V8 documentation](https://v8.dev/docs)
- [Maglev: V8’s fast optimizing JIT](https://v8.dev/blog/maglev)
- [How SpiderMonkey optimizes](https://firefox-source-docs.mozilla.org/js/how-we-optimize.html)
- [JavaScriptCore architecture](https://docs.webkit.org/Deep%20Dive/JSC/JavaScriptCore.html)
- [ECMAScript execution contexts](https://tc39.es/ecma262/#sec-execution-contexts)
