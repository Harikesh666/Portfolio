---
title: "Map, Filter, and Reduce: Transform, Select, Combine"
description: "Learn how map, filter, and reduce work through numbers, user records, accumulator traces, and practical combinations."
category: "JavaScript"
topic: "functions-and-composition"
readTime: "15 min read"
date: "February 2025"
publishedAt: "2025-02-02"
---

# Map, Filter, and Reduce: Transform, Select, Combine

`map`, `filter`, and `reduce` are three of the most useful array methods in JavaScript.

Most developers learn their definitions quickly:

- `map` transforms values.
- `filter` selects values.
- `reduce` combines values.

That is correct, but it is easy to memorize those lines and still feel confused when a real problem appears.

Should this be a `map` or a `filter`? Why does `reduce` need an initial value? Why does one callback return a number while another returns `true`? And why does everybody try to solve every array problem with one enormous `reduce`?

Let’s examine each method one at a time, understand what it asks from its callback, and then combine them.

## The map function

The `map` function transforms an array by applying a callback to each element. It returns a new array containing the transformed values.

The question `map` asks is:

> What should this element become?

Start with the original array:

```js
const numbers = [5, 1, 3, 2, 6];

function double(value) {
    return value * 2;
}

function triple(value) {
    return value * 3;
}

function binary(value) {
    return value.toString(2);
}

console.log(numbers.map(double));
console.log(numbers.map(triple));
console.log(numbers.map(binary));
```

Output:

```text
[10, 2, 6, 4, 12]
[15, 3, 9, 6, 18]
["101", "1", "11", "10", "110"]
```

For `numbers.map(double)`, JavaScript broadly does this:

```text
double(5) → 10
double(1) → 2
double(3) → 6
double(2) → 4
double(6) → 12
```

Every returned value takes the corresponding position in the new array.

The first element does not have to remain a number. The `binary` callback returns strings, so `map` returns an array of strings.

That is the point of `map`. It keeps the one-to-one structure while allowing each value to become something else.

## How map works

A simplified learning version of `map` would follow this shape:

```js
function mapValues(array, transform) {
    const output = [];

    for (let index = 0; index < array.length; index += 1) {
        output.push(transform(array[index], index, array));
    }

    return output;
}

console.log(mapValues(numbers, double));
```

The steps are:

1. Create a result array.
2. Visit each existing element in order.
3. Call the provided function with the element, its index, and the original array.
4. Store the callback’s return value at the corresponding position.
5. Return the result array.

The real `map` has more behavior than this teaching version. It works with array-like objects, supports a `thisArg`, respects array subclass rules, and skips missing positions in sparse arrays.

Still, the simple version reveals the important relationship:

```text
one input element → one callback result → one output position
```

## Map does not directly change the original array

```js
const numbers = [5, 1, 3, 2, 6];
const doubled = numbers.map((value) => value * 2);

console.log(numbers); // [5, 1, 3, 2, 6]
console.log(doubled); // [10, 2, 6, 4, 12]
```

`map` creates a new array. It does not replace the elements in `numbers` by itself.

But do not turn that into the broader claim that “a `map` callback can never mutate anything.” The callback is ordinary JavaScript and can still change an object:

```js
const users = [{ name: "Akshay" }];

const sameUsers = users.map((user) => {
    user.name = user.name.toUpperCase();
    return user;
});

console.log(users[0].name);     // AKSHAY
console.log(sameUsers[0].name); // AKSHAY
```

The outer array is new, but both arrays contain the same object reference.

If you want new objects, return new objects deliberately:

```js
const uppercasedUsers = users.map((user) => ({
    ...user,
    name: user.name.toUpperCase(),
}));
```

## Different ways to write the map callback

Here are three equivalent ways to convert numbers to binary:

```js
const withFunctionExpression = numbers.map(function (value) {
    return value.toString(2);
});

const withArrowBody = numbers.map((value) => {
    return value.toString(2);
});

const withImplicitReturn = numbers.map((value) => value.toString(2));
```

All three return the same result.

Use the form that makes the callback easy to read. A concise arrow is useful for one clear expression. A named function is useful when the transformation deserves a name or will be reused.

Shorter is helpful only when it stays obvious.

## The filter function

The `filter` function creates a new array containing only the elements that pass a test.

The question `filter` asks is:

> Should this element stay?

The callback does not return the transformed element. It returns a value that JavaScript converts to `true` or `false`.

### Filtering odd values

```js
const numbers = [5, 1, 3, 2, 6];

function isOdd(value) {
    return value % 2;
}

const oddNumbers = numbers.filter(isOdd);

console.log(oddNumbers); // [5, 1, 3]
```

For an odd number, `value % 2` returns `1`, which is truthy. For an even number, it returns `0`, which is falsy.

The callback does not have to return the literal Boolean values `true` or `false`. `filter` converts its result to a Boolean. Still, an explicit condition is often easier to understand:

```js
function isOdd(value) {
    return value % 2 !== 0;
}
```

### Filtering even values

```js
function isEven(value) {
    return value % 2 === 0;
}

const evenNumbers = numbers.filter(isEven);

console.log(evenNumbers); // [2, 6]
```

### Filtering values greater than four

```js
function isGreaterThanFour(value) {
    return value > 4;
}

const largeNumbers = numbers.filter(isGreaterThanFour);

console.log(largeNumbers); // [5, 6]
```

Notice what `filter` returns. It returns the original values that passed the test, not the Boolean results from the callback.

```text
isGreaterThanFour(5) → true  → keep 5
isGreaterThanFour(1) → false → skip 1
isGreaterThanFour(3) → false → skip 3
isGreaterThanFour(2) → false → skip 2
isGreaterThanFour(6) → true  → keep 6
```

## How filter works

A simplified version looks like this:

```js
function filterValues(array, predicate) {
    const output = [];

    for (let index = 0; index < array.length; index += 1) {
        if (predicate(array[index], index, array)) {
            output.push(array[index]);
        }
    }

    return output;
}
```

The callback is commonly called a **predicate** because it answers a yes-or-no question about a value.

The steps are:

1. Create an empty result array.
2. Visit each existing element.
3. Call the predicate with the value, index, and original array.
4. Convert the callback result to a Boolean.
5. Add the original element only when that result is truthy.
6. Return the result array.

Unlike `map`, the output length can be smaller than the input length. It can also be zero if nothing passes.

## The reduce function

`reduce` is the one that usually looks strange at first.

It combines the elements of an array into one final result. That result can be a number, string, object, array, `Map`, or almost any other value.

The question `reduce` asks is:

> What should the result become after seeing this element?

Before using `reduce`, let’s write an ordinary loop.

## Finding a sum without reduce

```js
const numbers = [5, 1, 3, 2, 6];

function findSum(array) {
    let sum = 0;

    for (let index = 0; index < array.length; index += 1) {
        sum += array[index];
    }

    return sum;
}

console.log(findSum(numbers)); // 17
```

The variable `sum` remembers the result so far. Each element updates it. After the loop, `sum` contains the answer.

In `reduce`, that “result so far” is called the **accumulator**.

## Finding the same sum with reduce

```js
const total = numbers.reduce(function (accumulator, currentValue) {
    return accumulator + currentValue;
}, 0);

console.log(total); // 17
```

The `0` after the callback is the initial value of the accumulator.

Trace the calls:

| Call | Accumulator | Current value | Returned value |
|---|---:|---:|---:|
| 1 | 0 | 5 | 5 |
| 2 | 5 | 1 | 6 |
| 3 | 6 | 3 | 9 |
| 4 | 9 | 2 | 11 |
| 5 | 11 | 6 | 17 |

The value returned by one callback becomes the accumulator for the next callback.

That sentence is the key to `reduce`.

If the callback forgets to return the accumulator, the next call receives `undefined`:

```js
const brokenTotal = numbers.reduce((accumulator, currentValue) => {
    accumulator + currentValue;
}, 0);

console.log(brokenTotal); // undefined
```

Writing `accumulator + currentValue` calculates a value, but the braces mean we must return it explicitly.

## What if we omit the initial value?

`reduce` allows the initial value to be omitted:

```js
const total = numbers.reduce(
    (accumulator, currentValue) => accumulator + currentValue,
);
```

When no initial value is provided:

1. The first existing array element becomes the initial accumulator.
2. Reduction begins with the next existing element.

For `[5, 1, 3, 2, 6]`, the first callback receives `5` as the accumulator and `1` as the current value.

This can work, but supplying an initial value is usually clearer. It also makes empty arrays safe:

```js
[].reduce((sum, value) => sum + value, 0); // 0
```

Without an initial value, reducing an empty array throws a `TypeError`:

```js
[].reduce((sum, value) => sum + value);
```

The method has no first element to use as the accumulator.

## Finding the maximum value

A tempting first attempt starts `max` at zero:

```js
function findMax(array) {
    let max = 0;

    for (let index = 0; index < array.length; index += 1) {
        if (array[index] > max) {
            max = array[index];
        }
    }

    return max;
}
```

That works for `[5, 1, 3, 2, 6]`, but it fails when every number is negative:

```js
console.log(findMax([-8, -3, -12])); // 0, which is wrong
```

Zero was never in the array.

One safe `reduce` version uses the first element as the starting accumulator:

```js
const maximum = numbers.reduce(function (max, currentValue) {
    if (currentValue > max) {
        return currentValue;
    }

    return max;
});

console.log(maximum); // 6
```

For a possibly empty array, decide what “maximum” should mean before reducing. You might return `undefined`, throw an application error, or use an initial value such as `-Infinity` when that fits the domain.

## Reduce does not always use constant extra space

You may hear that `reduce` always has `O(1)` space complexity because it returns one value.

That depends on the accumulator.

Summing numbers uses a number accumulator, so the extra accumulator space is constant. Building an object or array makes the accumulator grow with the input:

```js
const copied = numbers.reduce((output, value) => {
    output.push(value);
    return output;
}, []);
```

The result is one array, but that array still contains `n` values. Its space usage is `O(n)`.

For all three methods, the usual time complexity is `O(n)` when the callback itself does constant work. If the callback performs a nested search or another expensive operation, include that work in the analysis too.

## Combining map, filter, and reduce

Now let’s use the original `users` array:

```js
const users = [
    { firstName: "akshay", lastName: "saini", age: 26 },
    { firstName: "donald", lastName: "trump", age: 75 },
    { firstName: "elon", lastName: "musk", age: 50 },
    { firstName: "deepika", lastName: "padukone", age: 26 },
];
```

### Map: create full names

We want one full name for every user. The output should contain the same number of items, so `map` fits.

```js
const fullNames = users.map(
    (user) => `${user.firstName} ${user.lastName}`,
);

console.log(fullNames);
```

Output:

```text
["akshay saini", "donald trump", "elon musk", "deepika padukone"]
```

### Reduce: count users by age

Now we want one object that tells us how many users have each age.

```js
const ageCounts = users.reduce((counts, user) => {
    if (counts[user.age]) {
        counts[user.age] += 1;
    } else {
        counts[user.age] = 1;
    }

    return counts;
}, {});

console.log(ageCounts); // { 26: 2, 50: 1, 75: 1 }
```

Walk through the accumulator:

```text
{}
{ 26: 1 }
{ 26: 1, 75: 1 }
{ 26: 1, 75: 1, 50: 1 }
{ 26: 2, 75: 1, 50: 1 }
```

The accumulator is not required to be a number. Here it is an object that grows as users are processed.

We can shorten the update once the behavior is clear:

```js
const ageCounts = users.reduce((counts, user) => {
    counts[user.age] = (counts[user.age] ?? 0) + 1;
    return counts;
}, {});
```

## Filter and map together

Suppose we need the first names of users younger than 30.

That request contains two jobs:

1. Select users younger than 30.
2. Transform each selected user into a first name.

The code can say exactly that:

```js
const youngUserNames = users
    .filter((user) => user.age < 30)
    .map((user) => user.firstName);

console.log(youngUserNames); // ["akshay", "deepika"]
```

Read it from left to right:

```text
users
→ keep users younger than 30
→ take each remaining first name
```

This creates an intermediate filtered array before `map` creates the final array. For ordinary application data, that clear expression is often worth more than avoiding one temporary array.

## The same result with one reduce

We can also perform both jobs in one pass:

```js
const youngUserNames = users.reduce((names, user) => {
    if (user.age < 30) {
        names.push(user.firstName);
    }

    return names;
}, []);

console.log(youngUserNames); // ["akshay", "deepika"]
```

This version avoids the intermediate array, but it asks the reader to inspect the callback before understanding the operation.

The chain states the two steps directly. The `reduce` version controls both selection and transformation itself.

Neither form wins every time.

- Use `filter().map()` when the separate stages make the intention clearer.
- Consider one loop or one `reduce` when profiling shows that intermediate allocations matter, or when the reduction naturally builds one result.
- Do not replace readable code with a complicated accumulator just because one pass sounds clever.

## Choose the method by the shape of the answer

When you are unsure which method to use, ask what the result should look like.

### Use map when every input produces one output

```js
const pricesWithTax = prices.map((price) => price * 1.18);
```

The array length usually stays the same. Each position receives the callback result.

### Use filter when some inputs should disappear

```js
const availableProducts = products.filter((product) => product.inStock);
```

The kept elements remain the original values.

### Use reduce when the whole array should become one result

```js
const totalPrice = prices.reduce(
    (total, price) => total + price,
    0,
);
```

“One result” does not mean one primitive. It can be an object, array, lookup table, or any accumulator that suits the problem.

## A few traps to avoid

### Forgetting to return from map

```js
const doubled = numbers.map((value) => {
    value * 2;
});

console.log(doubled); // [undefined, undefined, undefined, undefined, undefined]
```

With braces, return the transformed value explicitly.

### Returning the element from filter instead of a condition

```js
const filtered = [0, 1, 2].filter((value) => value);

console.log(filtered); // [1, 2]
```

This works through truthiness, but it also removes `0`. If the actual rule is different, write the condition you mean.

### Forgetting the accumulator return

```js
const total = numbers.reduce((sum, value) => {
    sum += value;
}, 0);
```

The next iteration receives `undefined` because the callback did not return the updated accumulator.

### Using map only for side effects

```js
users.map((user) => console.log(user.firstName));
```

This creates an unused result array. If you only want to perform an action for each value, `forEach` or a loop communicates that intent better.

## What to remember

1. **`map` transforms.**  
   Return the new value for each existing element.

2. **`filter` selects.**  
   Return a truthy value when the original element should stay.

3. **`reduce` accumulates.**  
   Return the result that the next iteration should receive.

4. **The initial value gives reduce its starting shape.**  
   Use `0` for a sum, `{}` for a lookup object, or `[]` for a collected array.

5. **A new array does not guarantee new nested objects.**  
   `map` and `filter` return new arrays, but their elements may still be shared references.

6. **Readable stages are not a failure.**  
   A `filter().map()` chain can explain the problem better than one dense `reduce`.

The easiest memory trick is still the simplest:

```text
map    → What should each element become?
filter → Which elements should stay?
reduce → What should all elements become together?
```

## Try it yourself

Use this data:

```js
const orders = [
    { customer: "Asha", total: 250, paid: true },
    { customer: "Ravi", total: 400, paid: false },
    { customer: "Mira", total: 150, paid: true },
    { customer: "Kabir", total: 600, paid: true },
];
```

Write code that:

1. Uses `map` to create an array of customer names.
2. Uses `filter` to keep only paid orders.
3. Uses `reduce` to calculate the total value of all orders.
4. Uses `filter` and `map` to get the names of customers with paid orders above 200.
5. Uses `reduce` to create `{ paid: 3, unpaid: 1 }`.

Before writing each callback, say its job in one sentence. If you cannot explain what the callback should return, the code will probably feel confusing too.

## Further reading

- [ECMAScript Array.prototype.map](https://tc39.es/ecma262/#sec-array.prototype.map)
- [ECMAScript Array.prototype.filter](https://tc39.es/ecma262/#sec-array.prototype.filter)
- [ECMAScript Array.prototype.reduce](https://tc39.es/ecma262/#sec-array.prototype.reduce)
- [Higher-Order Functions: Stop Rewriting the Loop](/articles/higher-order-functions-stop-rewriting-the-loop)
