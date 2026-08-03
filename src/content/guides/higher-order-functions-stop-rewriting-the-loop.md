---
title: "Higher-Order Functions: Stop Rewriting the Loop"
description: "How passing and returning functions separates repeated control flow from changing logic, with a circle calculator built step by step."
category: "JavaScript"
readTime: "14 min read"
date: "January 2025"
publishedAt: "2025-01-24"
---

# Higher-Order Functions: Stop Rewriting the Loop

Sometimes we write the same function three times without noticing.

The names are different. The formula in the middle is different. But the setup, loop, output array, and return statement are identical.

Then a fourth requirement arrives, so we copy the function again. Very efficient. We are now producing duplicate code four times faster.

Higher-order functions help us separate the part that stays the same from the part that changes.

They sound advanced because the name contains the word *higher*. The idea is much simpler:

> A function can receive another function or return another function.

JavaScript can do this because functions are values. The power comes from what we choose to separate.

## What is a higher-order function?

A **higher-order function** is a function that does at least one of these things:

1. Accepts a function as an argument
2. Returns a function as its result

Here is the smallest useful example of the first kind:

```js
function x() {
    console.log("Namaste");
}

function y(callback) {
    callback();
}

y(x);
```

Output:

```text
Namaste
```

`y` is a higher-order function because it accepts a function through the parameter `callback`.

`x` is the callback because we pass it to `y`, and `y` calls it.

The original version looked like this:

```js
function x() {
    console.log("Namaste");
}

function y() {
    x();
}
```

That code still prints `Namaste`, but `y` is not higher-order. It neither receives nor returns a function. It simply refers to `x` from an outer scope.

The difference is not academic. In the corrected version, the caller can choose the behavior:

```js
function sayGoodbye() {
    console.log("Goodbye");
}

y(x);
y(sayGoodbye);
```

`y` owns **when** the function runs. The argument supplies **what** happens.

## First-class, higher-order, and callback are related

These terms often appear together, but they describe different things.

**First-class functions** describe a language capability. JavaScript lets functions be used as values: assigned, stored, passed, and returned.

**Higher-order function** describes a function’s interface. It accepts or returns functions.

**Callback** describes a function’s role. It is supplied to other code to be called according to that code’s contract.

```js
function execute(callback) {
    callback();
}

function greet() {
    console.log("Hello");
}

execute(greet);
```

- JavaScript’s first-class function support lets us pass `greet`.
- `execute` is higher-order because it accepts a function.
- `greet` acts as the callback for this call.

A callback does not have to be asynchronous. Here, `execute` calls `greet` immediately.

For a deeper callback discussion, read [Callback Functions: JavaScript Calls You Back](/writing/callback-functions-javascript-calls-you-back).

## The circle problem

Suppose we have four circle radii:

```js
const radii = [3, 1, 2, 4];
```

We need the area of every circle:

```js
function calculateAreas(radii) {
    const output = [];

    for (let index = 0; index < radii.length; index += 1) {
        output.push(Math.PI * radii[index] ** 2);
    }

    return output;
}
```

Then we need every circumference:

```js
function calculateCircumferences(radii) {
    const output = [];

    for (let index = 0; index < radii.length; index += 1) {
        output.push(2 * Math.PI * radii[index]);
    }

    return output;
}
```

Then every diameter:

```js
function calculateDiameters(radii) {
    const output = [];

    for (let index = 0; index < radii.length; index += 1) {
        output.push(2 * radii[index]);
    }

    return output;
}
```

The functions work. That matters. A little duplication is not an emergency.

But compare their structure:

1. Create an empty output array.
2. Loop over every radius.
3. Calculate one result.
4. Push that result.
5. Return the output.

Only step three changes.

Copying the whole loop for every formula creates several maintenance points. If we later need to validate radii, preserve sparse positions, collect timing data, or change how results are stored, we must update every copied function.

The code is telling us where the abstraction boundary might belong.

## Extract the changing logic

First, give each formula its own function:

```js
function area(radius) {
    return Math.PI * radius ** 2;
}

function circumference(radius) {
    return 2 * Math.PI * radius;
}

function diameter(radius) {
    return 2 * radius;
}
```

Each function answers one small question for one radius.

Now write the repeated traversal once:

```js
function calculate(radii, logic) {
    const output = [];

    for (let index = 0; index < radii.length; index += 1) {
        output.push(logic(radii[index]));
    }

    return output;
}
```

Use the same traversal with different logic:

```js
console.log(calculate(radii, area));
console.log(calculate(radii, circumference));
console.log(calculate(radii, diameter));
```

Approximate output:

```text
[28.27, 3.14, 12.57, 50.27]
[18.85, 6.28, 12.57, 25.13]
[6, 2, 4, 8]
```

The real floating-point values contain more decimal places. The output above is rounded only to make the formulas easy to compare.

`calculate` is higher-order because it accepts `logic` as a function.

`area`, `circumference`, and `diameter` are callbacks for their respective calls.

Most importantly, `calculate` does not need to know which formula it is running. It knows only the contract:

> Give me a function that accepts one radius and returns the result for that radius.

That contract is the abstraction.

## We separated traversal from transformation

Before refactoring, every function answered two questions:

1. How should the array be traversed?
2. How should one radius be transformed?

After refactoring:

- `calculate` owns the traversal.
- The callback owns the transformation.

This is why higher-order functions can reduce repetition. They let stable control flow accept changing behavior as a value.

The pattern appears beyond arrays:

```js
function retry(operation, attempts) {
    // Stable retry control flow.
}

function withTiming(operation) {
    // Stable measurement control flow.
}

function onEvent(eventName, handler) {
    // Stable event-registration control flow.
}
```

Each function can accept behavior without knowing every future behavior in advance.

That does not mean every repeated line deserves a higher-order abstraction. The separation is valuable when the shared process is stable and the variable behavior has a clear contract.

## JavaScript already has calculate

Our `calculate` function should feel familiar:

```js
const areas = radii.map(area);
const circumferences = radii.map(circumference);
const diameters = radii.map(diameter);
```

`Array.prototype.map` is a higher-order function. It accepts a callback, calls that callback for each existing element, and creates a new array from the returned values.

Our custom function captures the central idea, but `map` provides a richer callback contract:

```js
const results = radii.map(function transform(radius, index, originalArray) {
    console.log(radius, index, originalArray);
    return radius * 2;
});
```

The callback receives:

1. The current element
2. The current index
3. The array being traversed

`map` also defines behavior for sparse arrays, array subclasses, array-like objects, callback `thisArg`, and mutations during iteration.

Our 10-line loop teaches the abstraction. It does not reproduce the entire language specification.

The next source article gives `map`, `filter`, and `reduce` their own full walkthrough, so we will not turn this one into that article early.

## Higher-order functions can return functions

The other half of the definition is just as useful.

```js
function createMultiplier(factor) {
    return function multiply(value) {
        return value * factor;
    };
}

const double = createMultiplier(2);
const triple = createMultiplier(3);

console.log(double(5));
console.log(triple(5));
```

Output:

```text
10
15
```

`createMultiplier` is higher-order because it returns a function.

The returned `multiply` function remembers the `factor` binding from the call that created it. `double` remembers `2`; `triple` remembers `3`.

This combines two JavaScript features:

- Higher-order functions let a function return another function.
- Closures let the returned function retain access to its lexical environment.

Returning functions can create specialized behavior from general behavior:

```js
function greaterThan(minimum) {
    return function check(value) {
        return value > minimum;
    };
}

const greaterThanTen = greaterThan(10);

console.log([4, 12, 18].filter(greaterThanTen));
```

Output:

```text
[12, 18]
```

The first call configures the rule. Later calls apply it.

## Higher-order functions can wrap behavior

A function can accept behavior and return enhanced behavior:

```js
function withLogging(operation) {
    return function loggedOperation(...argumentsList) {
        console.log("Arguments:", argumentsList);

        const result = operation(...argumentsList);

        console.log("Result:", result);
        return result;
    };
}

function add(first, second) {
    return first + second;
}

const loggedAdd = withLogging(add);

loggedAdd(2, 3);
```

Output:

```text
Arguments: [2, 3]
Result: 5
```

`withLogging` does not know how addition works. It surrounds an operation with shared behavior.

This pattern can support timing, authorization checks, caching, validation, retry policies, and instrumentation. Each real implementation has details and tradeoffs, but the shape is the same:

```text
behavior in → enhanced behavior out
```

## A learning implementation of map

The original note attached `calculate` to `Array.prototype` and called it a polyfill:

```js
Array.prototype.calculate = function (logic) {
    const output = [];

    for (let index = 0; index < this.length; index += 1) {
        output.push(logic(this[index]));
    }

    return output;
};
```

Calling `radii.calculate(area)` demonstrates how a method receives its array through `this`. As a learning exercise, that is useful.

But it is not an exact `map` polyfill, and assigning directly to `Array.prototype` adds an enumerable property that can surprise code using property enumeration.

Here is a somewhat closer educational version that preserves empty slots and passes the three common callback arguments:

```js
function calculate(logic) {
    const output = new Array(this.length);

    for (let index = 0; index < this.length; index += 1) {
        if (index in this) {
            output[index] = logic(this[index], index, this);
        }
    }

    return output;
}

Object.defineProperty(Array.prototype, "calculate", {
    value: calculate,
    writable: true,
    configurable: true,
});

console.log(radii.calculate(area));

delete Array.prototype.calculate;
```

This is still not production-grade or specification-complete. Native `map` also validates the callback, accepts a `thisArg`, works generically with array-like objects, follows array-subclass construction rules, and handles several edge cases defined by ECMAScript.

Do not patch built-in prototypes merely to avoid typing a helper function. Names can collide with future platform features or other libraries, and global prototype changes affect unrelated code.

Call this an implementation exercise, not a polyfill you should ship.

## Functional programming is bigger than higher-order functions

Higher-order functions are central to functional programming because they let behavior be composed and transformed as data.

But accepting a callback does not automatically make code functional, clean, pure, fast, or maintainable.

Functional programming also commonly emphasizes ideas such as:

- Pure functions whose results depend only on their inputs
- Avoiding uncontrolled shared mutation
- Building programs by composing smaller operations
- Treating transformations as expressions with clear inputs and outputs

Our `area` function is pure:

```js
function area(radius) {
    return Math.PI * radius ** 2;
}
```

Given the same radius, it returns the same result and does not modify outside state.

This callback is not pure:

```js
let calls = 0;

function area(radius) {
    calls += 1;
    return Math.PI * radius ** 2;
}
```

It is still a perfectly valid callback, and `calculate` is still higher-order. The function now also changes shared state.

Higher-order is a structural description, not a quality certificate.

## When the abstraction helps and when it does not

A good higher-order function gives a repeated process a clear name and a small behavioral contract.

```js
calculate(radii, area);
```

We can read that as “calculate an area for each radius.”

A bad abstraction may hide simple code behind vocabulary nobody needed:

```js
executeWithContext(createUnaryOperation(incrementStrategy), value);
```

Perhaps that architecture is justified. Perhaps someone wanted to add one.

Before creating a higher-order helper, ask:

1. Is the control flow genuinely repeated?
2. Is the changing behavior easy to express as a function?
3. Can the callback contract be stated in one sentence?
4. Does the abstraction make the call site easier to understand?
5. Will errors, return values, and timing remain clear?

Do not remove repetition at the cost of removing meaning.

## What to remember

1. **A higher-order function accepts or returns functions.**

2. **First-class functions make higher-order functions possible.**  
   JavaScript lets functions travel as values.

3. **Callbacks provide changing behavior.**  
   The higher-order function owns the shared control flow.

4. **The circle refactor separates traversal from transformation.**  
   `calculate` loops; `area` supplies the formula.

5. **map is a built-in higher-order function.**  
   Our custom loop teaches its central shape without reproducing every detail.

6. **Returning functions creates specialized behavior.**  
   Closures can preserve the configuration used to create that behavior.

7. **Higher-order does not automatically mean better.**  
   An abstraction must still clarify the program.

The goal is not to make functions feel higher. The goal is to stop rewriting the same lower-level machinery whenever only one small decision changes.

## Try it yourself

Start with this repeated code:

```js
const temperatures = [0, 10, 20, 30];

function toFahrenheit(values) {
    const output = [];

    for (const value of values) {
        output.push(value * 1.8 + 32);
    }

    return output;
}

function toKelvin(values) {
    const output = [];

    for (const value of values) {
        output.push(value + 273.15);
    }

    return output;
}
```

Refactor it in three steps:

1. Extract each formula into a function that transforms one temperature.
2. Create one higher-order function that owns the traversal.
3. Replace your helper with the built-in array method that already expresses the same operation.

Then create `greaterThan(minimum)` and use its returned function to keep only temperatures above a configurable threshold.

## Further reading

- [Functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions)
- [Array.prototype.map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map)
- [Array.prototype.filter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter)
- [ECMAScript Array.prototype.map](https://tc39.es/ecma262/#sec-array.prototype.map)
