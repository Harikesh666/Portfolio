---
title: "JavaScript Type Conversion: Why '6' / '2' Is 3"
description: "How JavaScript converts values to strings, numbers, and booleans, including coercion, NaN, truthy and falsy values, and the special behavior of plus."
category: "JavaScript"
topic: "execution-model"
order: 3
readTime: "15 min read"
date: "February 2025"
publishedAt: "2025-02-17"
---

# JavaScript Type Conversion: Why '6' / '2' Is 3

Predict these four results before reading further:

```js
console.log("6" / "2");
console.log("6" + "2");
console.log(Number(""));
console.log(Boolean("0"));
```

JavaScript prints:

```text
3
62
0
true
```

At first glance, those answers look like four unrelated jokes.

They come from one idea: an operation sometimes needs a value in a different type from the one it currently has. Division needs numbers. String concatenation, which means joining text, needs strings. An `if` condition needs a yes-or-no decision.

JavaScript performs a **type conversion** to answer that need.

The rules are predictable. The confusion begins when we try to apply one rule everywhere. A string does not have one universal converted form. It can become a number, a boolean, or remain a string depending on what the operation asks for.

The useful question is not:

> What does this value convert to?

Ask this instead:

> What type does this operation need?

## Explicit conversion and implicit coercion

When we ask for a conversion directly, it is **explicit conversion**:

```js
String(value);
Number(value);
Boolean(value);
```

The code says what type it wants.

When JavaScript converts a value because an operation requires another type, it is commonly called **implicit conversion** or **coercion**:

```js
"6" / "2"; // The division operation needs numeric values.
```

Coercion is not automatically bad. JavaScript uses it constantly, including inside `if` statements, template literals, arithmetic, property access, and web APIs.

The danger is invisible intent. If a reader cannot tell which conversion will happen, a short expression can become a long debugging session.

We will examine the three main conversion paths:

1. String conversion
2. Numeric conversion
3. Boolean conversion

## 1. String conversion

String conversion turns a value into text.

The clearest explicit form is:

```js
String(value);
```

Start with a Boolean value:

```js
let value = true;
console.log(typeof value); // boolean

value = String(value);
console.log(typeof value); // string
```

The value begins as the boolean `true`. After `String(value)`, it becomes the string `"true"`.

The letters look similar in the console, but the types are different:

```js
console.log(true === "true"); // false
```

One is a boolean value. The other is four characters of text.

### Common primitive values as strings

Strings, numbers, booleans, `null`, and `undefined` are **primitive values**. In simple terms, they are basic values rather than objects with their own collections of properties.

```js
console.log(String(42));        // "42"
console.log(String(true));      // "true"
console.log(String(false));     // "false"
console.log(String(null));      // "null"
console.log(String(undefined)); // "undefined"
```

`null` does not become an empty string. `undefined` does not disappear. Their string forms are the words `"null"` and `"undefined"`.

That matters when building messages:

```js
const userName = null;
console.log("User: " + userName); // "User: null"
```

If that output is not useful to a user, the solution is not to memorize a stranger coercion rule. Handle the missing value before building the message:

```js
const displayName = userName ?? "Guest";
console.log(`User: ${displayName}`); // "User: Guest"
```

### Automatic string conversion

Some operations need text and convert values for us. Browser dialogs, text properties on page elements, the `${...}` parts of template literals, and string concatenation are common examples.

```js
const count = 3;

console.log("Items: " + count); // "Items: 3"
console.log(`Items: ${count}`);  // "Items: 3"
```

The number `3` becomes text because the surrounding operation is producing a string.

When the intent matters, explicit conversion can make the boundary clearer:

```js
const countText = String(count);
```

You do not need to wrap every template value in `String`. Use explicit conversion when it helps communicate or validate what the program expects.

## 2. Numeric conversion

Numeric conversion asks JavaScript to produce a number from another value.

The explicit form is:

```js
Number(value);
```

Start with a numeric string:

```js
let str = "123";
console.log(Number(str)); // 123
```

The result is the number `123`, not the string `"123"`.

This difference appears constantly with user input. Values read from text fields are strings, even when the user typed digits:

```js
const priceInput = "40";
const quantityInput = "2";

console.log(priceInput + quantityInput); // "402"
console.log(Number(priceInput) * Number(quantityInput)); // 80
```

The first expression joins text. The second performs arithmetic on numbers.

### Common Number conversions

| Value | `Number(value)` |
|---|---:|
| `undefined` | `NaN` |
| `null` | `0` |
| `true` | `1` |
| `false` | `0` |
| `""` | `0` |
| `"   "` | `0` |
| `"123"` | `123` |
| `"123abc"` | `NaN` |

The string conversion rules are easier to remember as a process:

1. Surrounding whitespace is ignored.
2. An empty or whitespace-only string becomes `0`.
3. A valid numeric string becomes that number.
4. A string that cannot be read as one complete number becomes `NaN`.

These examples show the conversion rules in action:

```js
console.log(Number("   123   ")); // 123
console.log(Number("123z"));       // NaN
console.log(Number(true));         // 1
console.log(Number(false));        // 0
```

The whitespace around `123` is ignored. The `z` in `"123z"` prevents the whole string from being a valid number.

### What NaN actually means

`NaN` stands for **Not-a-Number**, but its name creates a second surprise:

```js
console.log(typeof NaN); // "number"
```

`NaN` belongs to JavaScript's Number type. It is a special numeric value used to represent an invalid or unrepresentable numeric result.

Think of it as:

> We attempted a numeric operation, but no useful number came out.

```js
const result = Number("hello");

console.log(result); // NaN
console.log(Number.isNaN(result)); // true
```

Use `Number.isNaN` when you specifically want to test for this value.

There is one famously strange property:

```js
console.log(NaN === NaN); // false
```

Do not test for `NaN` with equality. Use `Number.isNaN`.

### Why null becomes 0 but undefined becomes NaN

The difference is easy to see:

```js
console.log(Number(null));      // 0
console.log(Number(undefined)); // NaN
```

These are language conversion rules, not conclusions JavaScript reaches by reading our intentions. It is tempting to invent a story such as "null means intentionally empty, so it becomes zero." That story may help memory, but it should not be mistaken for a guarantee that `null` means numeric zero in your application.

If `null` represents missing data, converting it to `0` can hide a bug:

```js
const responseCount = null;
console.log(Number(responseCount)); // 0
```

Check missing values before numeric conversion when zero and missing mean different things.

## Arithmetic usually asks for numbers

Operators such as `-`, `*`, `/`, and `%` perform numeric conversion when needed:

```js
console.log("6" / "2"); // 3
console.log("6" * "2"); // 12
console.log("6" - "2"); // 4
```

That is why the first prediction produced `3`.

Both operands, the values on the two sides of `/`, are strings. But division has no string-division behavior. JavaScript converts both to numbers and divides them.

Invalid numeric text produces `NaN`:

```js
console.log("six" / "two"); // NaN
```

## The plus operator is the troublemaker

Binary `+` needs its own rule because it does not behave like the other arithmetic operators.

**Binary** means the operator has a value on each side. Binary `+` has two jobs:

1. Numeric addition
2. String concatenation

If the values become strings for this operation, `+` joins them:

```js
console.log("6" + "2"); // "62"
console.log("6" + 2);   // "62"
console.log(6 + "2");   // "62"
```

If both values remain numeric, it adds them:

```js
console.log(6 + 2); // 8
```

This is why input conversion should happen before addition:

```js
const left = "6";
const right = "2";

console.log(Number(left) + Number(right)); // 8
```

**Unary** means the operator works with one value. Unary plus is a different operator, and it performs numeric conversion:

```js
console.log(+"6"); // 6
```

`Number("6")` is usually clearer in application code because it states the intent without making the reader count plus signs.

## Number and parseInt answer different questions

Consider a string containing a unit:

```js
const width = "120px";

console.log(Number(width));   // NaN
console.log(parseInt(width)); // 120
```

`Number` asks whether the entire string represents a number. `"120px"` does not.

`parseInt` reads an integer from the beginning and stops when the numeric text ends. That can be useful for formats designed that way, but it can also accept input you meant to reject.

Choose based on what the input is allowed to contain:

- Use `Number` when the whole value must be numeric.
- Use `parseInt` when reading an integer prefix is intentional.
- Validate the result instead of assuming conversion succeeded.

## 3. Boolean conversion

Boolean conversion asks one question:

> Should this value count as true or false in a condition?

The explicit form is:

```js
Boolean(value);
```

Try several truthy and falsy values:

```js
console.log(Boolean(1));       // true
console.log(Boolean(0));       // false
console.log(Boolean("hello")); // true
console.log(Boolean(""));      // false
console.log(Boolean("0"));     // true
console.log(Boolean(" "));     // true
```

The last two are the ones worth staring at.

The string `"0"` is not the number `0`. It is a non-empty string, so it is truthy.

The string `" "` contains a space. It is also non-empty, so it is truthy.

Boolean conversion does not inspect whether the text *looks false*. It follows a short list of falsy values.

## The falsy list

The common falsy values are:

```text
false
0
-0
0n
""
null
undefined
NaN
```

`0n` is zero written as a BigInt, JavaScript's integer type for values that may be larger than ordinary safe integers.

Everything else is truthy.

That means all of these are truthy:

```js
console.log(Boolean("false")); // true
console.log(Boolean("0"));     // true
console.log(Boolean(" "));     // true
console.log(Boolean([]));       // true
console.log(Boolean({}));       // true
```

An empty array is still an array object. An empty object is still an object. Objects are truthy regardless of how many properties or elements they contain.

Do not ask whether the value feels empty in everyday language. Ask whether it appears in JavaScript's falsy list.

## Conditions use boolean conversion

An `if` statement does not require a literal boolean. It converts the condition for the decision:

```js
const userName = "Harikesh";

if (userName) {
    console.log("A name was provided");
}
```

Because `userName` is a non-empty string, the body runs.

This pattern is useful, but it can merge values your application considers different:

```js
const itemCount = 0;

if (!itemCount) {
    console.log("No count available");
}
```

Does `0` mean the count is missing, or does it mean there are exactly zero items? JavaScript sees a falsy number. Your application may need a more precise check:

```js
if (itemCount === null || itemCount === undefined) {
    console.log("No count available");
}
```

Truthiness is a language rule. Meaning belongs to your program.

## Logical operators test truthiness but return values

The `&&` and `||` operators use Boolean conversion to test their operands, but they do not always return `true` or `false`.

```js
console.log("hello" && 42); // 42
console.log("" && 42);      // ""

console.log("hello" || 42); // "hello"
console.log("" || 42);      // 42
```

`&&` returns the first falsy operand it finds, or the last operand if all are truthy.

`||` returns the first truthy operand it finds, or the last operand if all are falsy.

This is why default-value patterns work:

```js
const displayName = providedName || "Guest";
```

But `||` treats every falsy value as missing. If `0`, `false`, or `""` is valid data, the **nullish coalescing operator**, written as `??`, may express the intent better:

```js
const count = providedCount ?? 0;
```

`??` falls back only for `null` or `undefined`.

## Loose equality can add another conversion layer

The `==` operator may convert values before comparing them:

```js
console.log(0 == false);  // true
console.log("0" == false); // true
```

The strict equality operator does not perform that cross-type coercion:

```js
console.log(0 === false);  // false
console.log("0" === false); // false
```

This does not mean `==` is random. It follows a detailed algorithm. But most application code is easier to read when values are normalized deliberately and compared with `===`.

```js
const enteredAge = "18";
const age = Number(enteredAge);

if (age === 18) {
    console.log("Exactly eighteen");
}
```

Convert at the boundary, validate the result, then let the rest of the program work with a stable type.

## Objects take an extra step

So far, most examples used primitive values such as strings, numbers, booleans, `null`, and `undefined`.

When an operation needs to convert an object, JavaScript first tries to obtain a primitive value from it. Built-in objects have their own behavior for that step.

This creates results such as:

```js
console.log(String([1, 2])); // "1,2"
console.log(Number([]));     // 0
console.log(Number([1]));    // 1
console.log(Number([1, 2])); // NaN
```

These results are explainable, but memorizing them is not a useful programming strategy.

The practical lesson is simpler:

> Do not depend on clever object coercion when you can choose the value you actually mean.

```js
const values = [1, 2];

console.log(values.join(",")); // "1,2"
console.log(values.length);     // 2
```

The explicit code tells the reader whether you wanted the array's text, length, sum, or something else.

## A practical conversion routine

When values enter your program from forms, URLs, storage, JSON, or APIs, handle conversion near that boundary.

```js
function readQuantity(rawValue) {
    const quantity = Number(rawValue);

    if (!Number.isInteger(quantity) || quantity < 0) {
        throw new Error("Quantity must be a non-negative integer");
    }

    return quantity;
}
```

This function does three separate jobs:

1. Convert the string to a number.
2. Validate that the conversion produced the kind of number we accept.
3. Return a stable value for the rest of the program.

Conversion alone is not validation. `Number("2.5")` succeeds, but `2.5` may still be invalid when the application expects a whole quantity.

## How to predict a conversion

When an expression looks strange, walk through these questions:

1. **What types do the values have now?**
2. **What operation is being performed?**
3. **Does that operation ask for strings, numbers, booleans, or primitives?**
4. **Is `+` choosing between addition and concatenation?**
5. **Could numeric conversion produce `NaN`?**
6. **Is a logical operator returning an operand rather than a boolean?**
7. **Would explicit conversion make the intent clearer?**

Now return to the opening puzzle:

```js
"6" / "2";    // Division needs numbers, so the result is 3.
"6" + "2";    // Plus can concatenate strings, so the result is "62".
Number("");    // An empty string converts to 0.
Boolean("0"); // A non-empty string is truthy.
```

Four results. Four rules. No guessing required.

## What to remember

1. **Explicit conversion uses `String`, `Number`, or `Boolean`.**
2. **Implicit conversion, or coercion, happens when an operation needs another type.**
3. **String conversion gives `null` and `undefined` the text forms `"null"` and `"undefined"`.**
4. **Numeric conversion trims strings, turns empty text into `0`, and produces `NaN` for invalid numeric text.**
5. **`NaN` is a Number value; test it with `Number.isNaN`.**
6. **Binary `+` can concatenate strings, unlike `-`, `*`, and `/`.**
7. **Only a short list is falsy; non-empty strings, arrays, and objects are truthy.**
8. **`&&` and `||` test truthiness but return operands.**
9. **Conversion is not validation. Convert at boundaries and validate what your application accepts.**

JavaScript type conversion stops feeling strange when you stop asking what a value "normally becomes."

Values do not convert in isolation. An operation asks a question, and the conversion rule produces the type that operation needs.

## Further reading

- [ECMAScript type conversion operations](https://tc39.es/ecma262/#sec-type-conversion)
- [ECMAScript binary plus semantics](https://tc39.es/ecma262/#sec-applystringornumericbinaryoperator)
- [MDN: Type coercion](https://developer.mozilla.org/en-US/docs/Glossary/Type_coercion)
- [MDN: Truthy](https://developer.mozilla.org/en-US/docs/Glossary/Truthy)
- [MDN: Falsy](https://developer.mozilla.org/en-US/docs/Glossary/Falsy)
