---
title: "JavaScript Functions Are Values with Behavior"
description: "A practical tour of declarations, expressions, names, parameters, returned functions, first-class behavior, and arrow functions."
category: "JavaScript"
readTime: "15 min read"
date: "January 2025"
publishedAt: "2025-01-18"
---

# JavaScript Functions Are Values with Behavior

At first, a function looks like a named block of reusable code.

```js
function greet() {
    console.log("Hello");
}
```

Useful, but not very exciting.

Then JavaScript lets us assign that function to a variable, place it inside an object, pass it to another function, return it from a function, and create a new function that remembers old variables.

Suddenly, a function is not merely a block of code. It is a **value with behavior**.

That one idea connects function declarations, expressions, callbacks, higher-order functions, closures, and arrow functions. Let’s begin with the syntax and build toward the bigger picture.

## 1. Function declarations

A **function declaration** uses the `function` keyword followed by a required name:

```js
function a() {
    console.log("a called");
}

a();
```

Output:

```text
a called
```

The declaration creates a function and binds it to the name `a`. Writing `a()` calls the function.

The parentheses matter:

```js
console.log(a);   // The function value
console.log(a()); // Calls a, then logs its return value
```

Because `a` has no explicit `return`, calling it returns `undefined`. The second line therefore logs `"a called"` from inside the function and then logs `undefined` from the outer `console.log`.

Function declarations are commonly described as **hoisted**. This means the declaration is instantiated before the surrounding code begins executing, so this works:

```js
a();

function a() {
    console.log("a called");
}
```

The source code still runs from top to bottom. JavaScript does not physically move the declaration above the call. The surrounding scope creates the function binding during its setup, before evaluating the statements.

We will give hoisting its own full article later. For now, remember that a function declaration can usually be called earlier in its scope than where it appears in the file.

## 2. Function expressions

A **function expression** creates a function where JavaScript expects an expression, which means a value.

```js
const b = function () {
    console.log("b called");
};

b();
```

Output:

```text
b called
```

The function is created by the expression on the right and assigned to the variable `b`.

That distinction becomes visible if we try to call it too early:

```js
b();

const b = function () {
    console.log("b called");
};
```

This throws a `ReferenceError` because `b` is in the temporal dead zone until its declaration is evaluated.

The original example used `var`, which behaves differently:

```js
b();

var b = function () {
    console.log("b called");
};
```

The `var` binding exists and contains `undefined` before the assignment. Calling `undefined` throws a `TypeError`, typically with a message such as `b is not a function`.

The function expression itself was not available early. Only the `var` binding was created early.

This is more precise than saying “function expressions are not hoisted.” What matters is the combination of the expression and the variable declaration that stores its result.

## 3. Declarations and expressions answer different questions

Compare them directly:

```js
a(); // Works.
b(); // TypeError: b is not a function.

function a() {
    console.log("a called");
}

var b = function () {
    console.log("b called");
};
```

During setup, JavaScript creates:

- The `a` binding with the declared function as its value
- The `b` binding with `undefined` as its initial value

When execution reaches `a()`, a callable function is already there.

When execution reaches `b()`, the assignment has not happened yet, so the value is still `undefined`.

The difference is not simply “named function versus anonymous function.” A function expression can also have a name, and an anonymous expression assigned to a variable may receive an inferred name.

The reliable distinction is syntactic:

- A declaration introduces a function binding as a declaration in its surrounding scope.
- An expression produces a function value at the point where that expression is evaluated.

Use declarations when a function is a stable operation in the surrounding scope. Use expressions when creating a function as part of a larger expression, such as an assignment, object property, argument, or return value.

## 4. Anonymous functions

An **anonymous function expression** has no explicit name after the `function` keyword:

```js
const announce = function () {
    console.log("Anonymous function called");
};

announce();
```

This syntax is valid because the function appears on the right side of an assignment, where an expression is allowed.

This ordinary standalone code is invalid:

```js
function () {
    console.log("Where would my declaration name go?");
}
```

In that statement position, JavaScript attempts to parse a function declaration, and an ordinary function declaration requires a name. The result is a `SyntaxError`.

We can force the same syntax into an expression context with parentheses:

```js
(function () {
    console.log("Now I am an expression");
});
```

No call happens here. The parentheses only make the parser treat the function as an expression.

Add a second pair of parentheses to call it immediately:

```js
(function () {
    console.log("Called immediately");
})();
```

This pattern is called an **Immediately Invoked Function Expression**, or IIFE.

There is one modern detail hidden behind the word “anonymous.” JavaScript can infer a useful `name` property from the assignment:

```js
const announce = function () {};

console.log(announce.name);
```

Output:

```text
announce
```

The function expression has no explicit source name, but the created function receives the inferred name `announce`. This helps stack traces and debugging.

So a function can be syntactically anonymous while still exposing a useful inferred `name`.

## 5. Named function expressions

A function expression may include its own name:

```js
const c = function y() {
    console.log("y function called");
};

c();
```

Output:

```text
y function called
```

But this fails outside the function body:

```js
y(); // ReferenceError: y is not defined
```

The name `y` belongs to the function expression’s own scope. The outer variable is `c`.

Why give an expression an inner name at all?

One reason is recursion:

```js
const factorial = function calculate(number) {
    if (number <= 1) {
        return 1;
    }

    return number * calculate(number - 1);
};

console.log(factorial(5));
```

Output:

```text
120
```

Inside the function, `calculate` refers directly to the current function. The explicit name can also make stack traces clearer.

Names are not decoration. They create bindings with particular scopes.

## 6. Parameters and arguments

Parameters and arguments are related but not identical.

- A **parameter** is a binding listed in a function definition.
- An **argument** is a value supplied in a particular call.

```js
function showMessage(message) {
    console.log(message);
}

showMessage("argument value");
```

`message` is the parameter. `"argument value"` is the argument.

JavaScript does not require the number of arguments to match the number of parameters.

### Missing arguments become undefined

```js
function describe(name, role) {
    console.log(name, role);
}

describe("Harikesh");
```

Output:

```text
Harikesh undefined
```

We can provide a default:

```js
function describe(name, role = "developer") {
    console.log(`${name} is a ${role}`);
}

describe("Harikesh");
```

### Extra arguments are allowed

```js
function showFirst(value) {
    console.log(value);
}

showFirst("first", "second", "third");
```

Only the first argument is bound to `value`. If a function intentionally accepts any number of arguments, a rest parameter is clearer:

```js
function total(...numbers) {
    return numbers.reduce((sum, number) => sum + number, 0);
}

console.log(total(10, 20, 30));
```

Output:

```text
60
```

### Functions can be arguments too

```js
function inspect(value) {
    console.log(value);
}

inspect(function greet() {
    console.log("Hello");
});
```

This logs the function value in an environment-specific representation. It does **not** log `"Hello"`, because `inspect` never calls the function.

Compare:

```js
function run(callback) {
    callback();
}

run(function greet() {
    console.log("Hello");
});
```

Now `run` calls the received function, so `"Hello"` appears.

Passing a function and calling a function are different operations. This distinction becomes the foundation of callbacks.

## 7. Returning functions from functions

A function can return any JavaScript value, including another function.

```js
function createGreeter() {
    return function greet() {
        console.log("Returned function called");
    };
}
```

Calling `createGreeter` returns the inner function. It does not automatically call it:

```js
const returnedFunction = createGreeter();
returnedFunction();
```

Output:

```text
Returned function called
```

We can also call both functions in one expression:

```js
createGreeter()();
```

Read it from left to right:

1. `createGreeter()` returns a function.
2. The second `()` calls the returned function.

Returning functions becomes more powerful when the returned function remembers values from its creation scope:

```js
function createGreeting(greeting) {
    return function greet(name) {
        return `${greeting}, ${name}`;
    };
}

const sayHello = createGreeting("Hello");
const sayNamaste = createGreeting("Namaste");

console.log(sayHello("Harikesh"));
console.log(sayNamaste("Binod"));
```

The returned functions close over different `greeting` bindings. That leads directly into [Closures in JavaScript: The Function’s Backpack](/writing/closures-function-backpack).

## 8. First-class functions

JavaScript functions are **first-class values**. This phrase means the language lets us use functions in the same places where other values can go.

We can assign one:

```js
function greet() {
    console.log("Hello");
}

const anotherName = greet;
anotherName();
```

Both variables refer to the same function object:

```js
console.log(anotherName === greet);
```

Output:

```text
true
```

We can store functions:

```js
const operations = {
    add: (first, second) => first + second,
    subtract: (first, second) => first - second,
};

console.log(operations.add(7, 3));
```

We can pass functions:

```js
function execute(operation, first, second) {
    return operation(first, second);
}

console.log(execute(operations.subtract, 7, 3));
```

And, as we just saw, we can return functions.

This is why functions can act as callbacks, strategy choices, event handlers, factories, and units of composition.

“First-class” does not mean “more important than other values.” It means functions are not trapped in declaration syntax. We can move them through the program.

## 9. Arrow functions

Arrow functions were added in ECMAScript 2015. They provide a shorter function-expression syntax:

```js
const arrowFunction = () => {
    console.log("Arrow function called");
};

arrowFunction();
```

For a single expression, braces and `return` can be omitted:

```js
const double = (number) => number * 2;

console.log(double(5));
```

Output:

```text
10
```

Be careful when returning an object literal implicitly. Parentheses prevent the braces from being parsed as the function body:

```js
const createUser = (name) => ({ name });
```

Arrow functions are not only shorter regular functions. They have different semantics.

### Arrow functions do not create their own this

An arrow function resolves `this` through its surrounding lexical scope. In simpler words, it looks outward from where it was written. Calling that arrow from somewhere else does not hand it a new `this` value.

```js
function Person() {
    this.age = 0;

    const timerId = setInterval(() => {
        this.age += 1;
        console.log(this.age);

        if (this.age === 3) {
            clearInterval(timerId);
        }
    }, 1000);
}

const person = new Person();
```

Output over three seconds:

```text
1
2
3
```

The arrow callback does not receive a new `this` from `setInterval`. It keeps using the `this` value from the surrounding `Person` call, which refers to the constructed object.

This is called **lexical `this`**.

Ordinary functions play by a different rule. Their **call site**, the expression that invokes them, usually determines the value of `this`.

Arrow functions also do not create their own `arguments`, `super`, or `new.target` bindings. They are not constructible, so this fails:

```js
const Person = () => {};
new Person(); // TypeError: Person is not a constructor
```

Use arrows when lexical `this` and concise expression syntax fit the job. Use ordinary functions when the call site should determine `this`, when you need a constructor, or when the ordinary function form communicates the intent better.

Shorter syntax is not automatically better syntax.

## A function is created before it is called

One final distinction ties everything together.

Defining a function creates a function object and makes it reachable through some value or binding:

```js
function declared() {}

const expressed = function () {};
const arrow = () => {};
```

None of their bodies has run yet.

Calling a function executes its body:

```js
declared();
expressed();
arrow();
```

Once functions are values, we can decide who stores them, who calls them, what arguments they receive, and whether another function comes back as the result.

That is why functions sit at the center of JavaScript. They are not merely containers for repeated statements. They are objects we can create, name, pass, return, and call.

## What to remember

1. **Declarations create early bindings.**  
   A function declaration is usually callable throughout its surrounding scope.

2. **Expressions create values when evaluated.**  
   Their availability depends on the variable or location receiving that value.

3. **Anonymous does not mean untraceable.**  
   JavaScript can infer a function’s `name` from an assignment.

4. **Parameters belong to definitions; arguments belong to calls.**

5. **Passing is not calling.**  
   `greet` is the function value; `greet()` executes it.

6. **Functions can return functions.**  
   Returned functions may also retain lexical bindings through closures.

7. **Functions are first-class values.**  
   They can be assigned, stored, passed, and returned.

8. **Arrow functions have lexical this.**  
   They are not just shorter ordinary functions.

## Try it yourself

Predict the output and errors without running this code first:

```js
declared();

function declared() {
    console.log("declaration");
}

const makeMessage = function createMessage(prefix) {
    return (value) => `${prefix}: ${value}`;
};

const showResult = makeMessage("Result");

console.log(makeMessage.name);
console.log(showResult("42"));

createMessage("outside");
```

Then answer:

1. Why can `declared` run before its source position?
2. Is `makeMessage` the function’s explicit name or its outer variable?
3. Where is `createMessage` accessible?
4. What value does the returned arrow function remember?
5. Which parentheses create a function, and which parentheses call one?

## Further reading

- [Functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions)
- [Function declarations](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function)
- [Function expressions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/function)
- [Arrow functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions)
- [ECMAScript function definitions](https://tc39.es/ecma262/#sec-function-definitions)
