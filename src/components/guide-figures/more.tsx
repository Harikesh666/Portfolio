import { FlowFigure, type FlowNode, type FlowStep, type FlowWire, type Tone } from "./kit";
import { SlotsFigure } from "./slots";

/*
 * One figure each for the guides that had no text diagram: the six
 * JavaScript guides and the nine React guides beyond rendering.
 */

const node = (id: string, x: number, y: number, w: number, h: number, label: string, sub?: string | readonly string[], tone?: Tone): FlowNode => ({
    id,
    x,
    y,
    w,
    h,
    label,
    sub: sub === undefined ? undefined : typeof sub === "string" ? [sub] : sub,
    tone,
});

const subs = (entries: Record<string, string | readonly string[]>) =>
    Object.fromEntries(Object.entries(entries).map(([id, sub]) => [id, { sub: typeof sub === "string" ? [sub] : sub }]));

/* callback-functions-javascript-calls-you-back */
export function CallbackTimingFigure() {
    const nodes = [
        node("stack", 8, 8, 150, 52, "Call stack", "(empty)", "task"),
        node("timer", 202, 8, 150, 52, "Browser timer", "(nothing yet)", "accent"),
        { ...node("console", 8, 96, 344, 44, "console", "(nothing yet)"), variant: "readout" as const },
    ];
    const wires: FlowWire[] = [
        { id: "register", d: "M158 24 H200", label: { text: "register", x: 180, y: 19 }, tone: "accent" },
        { id: "later", d: "M202 46 H160", label: { text: "run later", x: 180, y: 57 }, tone: "accent" },
        { id: "logs", d: "M83 60 V94" },
    ];
    const steps: FlowStep[] = [
        {
            caption: "The browser provides `setTimeout`. JavaScript hands it `timerCallback`, then `setTimeout` returns and the script continues.",
            lit: { nodes: ["stack", "timer"], wires: ["register"], tone: "accent" },
            patch: subs({ stack: "setTimeout(timerCallback, 5000)", timer: ["holds timerCallback", "5000 ms"] }),
        },
        {
            caption: "JavaScript calls `x` with `y` as its argument. `x` logs `x`.",
            lit: { nodes: ["stack", "console"], wires: ["logs"], tone: "task" },
            patch: subs({ stack: "x(y)", timer: ["holds timerCallback", "waiting"], console: "x" }),
        },
        {
            caption: "Still inside `x`, `callback()` calls `y` synchronously, which logs `y`. Then `y` returns, `x` returns, and the script finishes.",
            lit: { nodes: ["stack", "console"], wires: ["logs"], tone: "task" },
            patch: subs({ stack: ["y()", "x(y)"], timer: ["holds timerCallback", "waiting"], console: "x  y" }),
        },
        {
            caption: "The timer callback does not sit on the call stack while the browser tracks the timer.",
            lit: { nodes: ["timer"], wires: [], tone: "accent" },
            patch: subs({ stack: "(empty)", timer: ["holds timerCallback", "waiting"], console: "x  y" }),
        },
        {
            caption: "After the delay has elapsed and the timer task gets a turn, the browser causes `timerCallback` to run. It logs `timer`.",
            lit: { nodes: ["stack", "console"], wires: ["later", "logs"], tone: "accent" },
            patch: subs({ stack: "timerCallback()", timer: "(done)", console: "x  y  timer" }),
        },
    ];
    return (
        <FlowFigure
            description={["setTimeout registers timerCallback with a browser timer.", "x calls y right away.", "Later, the browser timer causes timerCallback to run."]}
            figcaption="`y` is called synchronously by `x`, but `timerCallback` is called later through a browser timer."
            height={148}
            nodes={nodes}
            overview="Two callbacks, two different timings: `y` runs inside `x`, while `timerCallback` waits for the browser. Press Play to watch both run."
            steps={steps}
            width={360}
            wires={wires}
        />
    );
}

/* callback-hell-pyramid-of-doom */
export function PyramidFigure() {
    const stairs = [
        { id: "create", label: "createOrder", waits: "waiting for orderId", callback: "orderCreated" },
        { id: "pay", label: "proceedToPayment", waits: "waiting for paymentInfo", callback: "paymentCompleted" },
        { id: "summary", label: "showOrderSummary", waits: "waiting for summary", callback: "summaryShown" },
        { id: "wallet", label: "updateWallet", waits: "waiting for balance", callback: "walletUpdated" },
        { id: "log", label: "console.log", waits: "Wallet balance", callback: "" },
    ];
    const at = (index: number) => ({ x: 8 + index * 38, y: 8 + index * 44 });
    const nodes = stairs.map((stair, index) => node(stair.id, at(index).x, at(index).y, 176, 30, stair.label, stair.waits, index === 4 ? "accent" : "task"));
    const wires: FlowWire[] = stairs.slice(0, 4).map((stair, index) => {
        const { x, y } = at(index);
        return {
            id: `cb-${index}`,
            d: `M${x + 18} ${y + 30} V${y + 59} H${x + 36}`,
            // The callback's name sits in the gap between this step and the next.
            label: { text: stair.callback, x: x + 26, y: y + 40, anchor: "start" as const },
        };
    });
    const ids = stairs.map((stair) => stair.id);
    const steps: FlowStep[] = [
        { caption: "`createOrder` starts some work and returns. Later, it calls `orderCreated` with the new order ID.", lit: { nodes: ["create"], wires: [], tone: "task" } },
        {
            caption: "We cannot call `proceedToPayment` before we have an `orderId`, so the second operation goes inside the first callback.",
            lit: { nodes: ["create", "pay"], wires: ["cb-0"], tone: "task" },
        },
        { caption: "The next step needs `paymentInfo`, so `showOrderSummary` goes one level deeper.", lit: { nodes: ids.slice(0, 3), wires: ["cb-0", "cb-1"], tone: "task" } },
        { caption: "Updating the wallet needs the `summary`, so the code moves right again.", lit: { nodes: ids.slice(0, 4), wires: ["cb-0", "cb-1", "cb-2"], tone: "task" } },
        {
            caption: "Only at the deepest level can we log the balance. The visible shape of the code is the pyramid of doom.",
            lit: { nodes: ids, wires: ["cb-0", "cb-1", "cb-2", "cb-3"], tone: "accent" },
        },
    ];
    return (
        <FlowFigure
            description={stairs.map((stair) => `${stair.label}, ${stair.waits}${stair.callback ? `, then ${stair.callback}` : ""}`)}
            figcaption="Dependent asynchronous steps nest deeper with every result they wait for."
            height={214}
            nodes={nodes}
            overview="Each dependent step must sit inside the previous callback, so the code keeps leaning right. Press Play to watch the pyramid grow."
            steps={steps}
            width={360}
            wires={wires}
        />
    );
}

/* global-scope-and-this-call-site */
export function DetachedThisFigure() {
    const none = "—";
    return (
        <SlotsFigure
            spec={{
                fileName: "this.js",
                source: ['"use strict";', "", "const user = {", '    name: "Alice",', "    greet() {", "        console.log(`Hello, ${this.name}`);", "    },", "};", "", "const detachedGreet = user.greet;", "detachedGreet();"],
                names: ["user", "detachedGreet", "call site", "this in greet"],
                title: "bindings and the call",
                steps: [
                    { caption: "`user` is an object holding `name` and a `greet` method. Functions are values.", line: 2, values: ['{ name: "Alice", greet }', "not yet", none, none] },
                    {
                        caption: "This line does not call anything. It copies a reference to the function into `detachedGreet`.",
                        line: 9,
                        values: ['{ name: "Alice", greet }', "ƒ greet", none, none],
                    },
                    {
                        caption: "The last line is a simple function call, not a method call. There is no object before a dot, so there is no receiver.",
                        line: 10,
                        values: ['{ name: "Alice", greet }', "ƒ greet", "detachedGreet()", none],
                    },
                    {
                        caption: "In strict mode, `this` is `undefined` for a simple call. Nothing about the function remembers that it once came from `user`.",
                        line: 10,
                        values: ['{ name: "Alice", greet }', "ƒ greet", "detachedGreet()", "undefined"],
                    },
                    {
                        caption: "Reading `this.name` throws a `TypeError`.",
                        line: 5,
                        values: ['{ name: "Alice", greet }', "ƒ greet", "detachedGreet()", "undefined"],
                        console: ["TypeError: Cannot read properties of undefined"],
                    },
                ],
                overview: "The same function behaves differently depending on how it is called. Press Play to see what `this` becomes when a method is detached.",
                figcaption: "`this` comes from the call site, so a detached method loses its receiver.",
            }}
        />
    );
}

/* javascript-functions-values-with-behavior */
export function DeclarationVsExpressionFigure() {
    return (
        <SlotsFigure
            spec={{
                fileName: "functions.js",
                source: ["a(); // Works.", "b(); // TypeError: b is not a function.", "", "function a() {", '    console.log("a called");', "}", "", "var b = function () {", '    console.log("b called");', "};"],
                names: ["a", "b"],
                tags: ["function", "var"],
                title: "bindings",
                steps: [
                    {
                        caption: "During setup, JavaScript creates the `a` binding with the declared function, and the `b` binding with `undefined` as its initial value.",
                        line: null,
                        values: ["ƒ a", "undefined"],
                    },
                    { caption: "When execution reaches `a()`, a callable function is already there. It logs `a called`.", line: 0, values: ["ƒ a", "undefined"], console: ["a called"] },
                    {
                        caption: "When execution reaches `b()`, the assignment has not happened yet, so the value is still `undefined`.",
                        line: 1,
                        values: ["ƒ a", "undefined"],
                        console: ["a called"],
                    },
                    {
                        caption: "Calling `undefined` throws a `TypeError`, typically `b is not a function`.",
                        line: 1,
                        values: ["ƒ a", "undefined"],
                        console: ["a called", "TypeError: b is not a function"],
                    },
                    {
                        caption: "The function expression is only assigned when execution reaches its line, and the throw stops the script first. Only the `var` binding existed early.",
                        line: 7,
                        values: ["ƒ a", "undefined"],
                        console: ["a called", "TypeError: b is not a function"],
                    },
                ],
                overview: "A declaration and a `var` expression are prepared differently before any code runs. Press Play to see why `a()` works and `b()` fails.",
                figcaption: "A declaration arrives as a function, while a `var` expression arrives as `undefined`.",
            }}
        />
    );
}

/* javascript-hoisting-does-not-move-code */
export function HoistingFigure() {
    return (
        <SlotsFigure
            spec={{
                fileName: "hoisting.js",
                source: ["console.log(score);", "", "var score = 10;", "", "console.log(score);"],
                names: ["score"],
                tags: ["var"],
                title: "bindings",
                steps: [
                    {
                        caption: "Before evaluating statements, JavaScript creates the `var` binding and initializes it to `undefined`. The code itself does not move.",
                        line: null,
                        values: ["undefined"],
                    },
                    {
                        caption: "The `score` binding exists, so this does not throw an undeclared-variable error. It just does not contain the later value yet.",
                        line: 0,
                        values: ["undefined"],
                        console: ["undefined"],
                    },
                    { caption: "The initializer assignment happens when execution reaches this line.", line: 2, values: ["10"], console: ["undefined"] },
                    { caption: "Now the second `console.log` prints `10`.", line: 4, values: ["10"], console: ["undefined", "10"] },
                ],
                overview: "The binding is prepared first, and the value arrives later at its own line. Press Play to follow `score` through the script.",
                figcaption: "Hoisting prepares bindings early, but assignments still happen in source order.",
            }}
        />
    );
}

/* javascript-type-conversion-and-coercion */
export function TypeNeededFigure() {
    const nodes = [
        node("expression", 4, 12, 80, 40, "Expression", "—"),
        node("needs", 96, 12, 80, 40, "Type needed", "—", "accent"),
        node("converted", 188, 12, 80, 40, "Converted", "—", "task"),
        node("result", 280, 12, 76, 40, "Result", "—", "task"),
    ];
    const wires: FlowWire[] = [
        { id: "a", d: "M84 32 H94" },
        { id: "b", d: "M176 32 H186" },
        { id: "c", d: "M268 32 H278" },
    ];
    const all = { nodes: ["expression", "needs", "converted", "result"], wires: ["a", "b", "c"] };
    const steps: FlowStep[] = [
        {
            caption: "Division has no string-division behavior. JavaScript converts both strings to numbers and divides them.",
            lit: { ...all, tone: "accent" },
            patch: subs({ expression: '"6" / "2"', needs: "numbers", converted: "6 and 2", result: "3" }),
        },
        {
            caption: "Binary `+` can add or concatenate. Both values are strings here, so it joins them as text.",
            lit: { ...all, tone: "accent" },
            patch: subs({ expression: '"6" + "2"', needs: "strings", converted: '"6", "2"', result: '"62"' }),
        },
        {
            caption: "An empty string becomes `0` under numeric conversion.",
            lit: { ...all, tone: "accent" },
            patch: subs({ expression: 'Number("")', needs: "a number", converted: '"" → 0', result: "0" }),
        },
        {
            caption: "The string `\"0\"` is not the number `0`. It is a non-empty string, so it is truthy.",
            lit: { ...all, tone: "accent" },
            patch: subs({ expression: 'Boolean("0")', needs: "yes or no", converted: '"0" → true', result: "true" }),
        },
    ];
    return (
        <FlowFigure
            description={['"6" / "2" needs numbers: 3.', '"6" + "2" joins strings: "62".', 'Number("") is 0.', 'Boolean("0") is true.']}
            figcaption="Ask what type the operation needs, not what the value converts to."
            height={62}
            nodes={nodes}
            overview="Four lines that look unrelated come from one idea: each operation needs a particular type. Press Play to see what each one asks for."
            steps={steps}
            width={360}
            wires={wires}
        />
    );
}

/* react-data-fetching-server-state */
export function StaleWhileRevalidateFigure() {
    const nodes = [
        node("comp", 8, 8, 132, 40, "Component", "asks for ['user', 5]", "task"),
        node("server", 220, 8, 132, 40, "Server", "real home of the data"),
        node("cache", 8, 100, 132, 40, "Cache entry", "empty", "task"),
        node("check", 220, 100, 132, 40, "Fresh or stale?", "staleTime decides", "accent"),
    ];
    const wires: FlowWire[] = [
        { id: "ask", d: "M50 48 V98", label: { text: "ask", x: 44, y: 76, anchor: "end" } },
        { id: "serve", d: "M98 98 V50", label: { text: "serve now", x: 104, y: 76, anchor: "start" } },
        { id: "check", d: "M140 128 H218" },
        { id: "refetch", d: "M300 100 V50", tone: "accent", label: { text: "refetch (stale only)", x: 306, y: 78, anchor: "start" } },
        { id: "fresh", d: "M220 40 H176 Q170 40 170 46 V106 Q170 112 164 112 H142", label: { text: "fresh data", x: 176, y: 62, anchor: "start" } },
    ];
    const steps: FlowStep[] = [
        { caption: "A component mounts and asks the cache for `['user', 5]`.", lit: { nodes: ["comp", "cache"], wires: ["ask"], tone: "task" } },
        {
            caption: "The cache returns whatever the entry holds right now, instantly. No loading state, even if the copy is old.",
            lit: { nodes: ["cache", "comp"], wires: ["serve"], tone: "task" },
            patch: subs({ cache: "cached copy (maybe old)", comp: "renders it, no spinner" }),
        },
        {
            caption: "Next the cache checks the copy. Within `staleTime` it is fresh, so it is trusted as-is and no refetch happens.",
            lit: { nodes: ["cache", "check"], wires: ["check"], tone: "accent" },
            patch: subs({ cache: "cached copy (maybe old)", comp: "renders it, no spinner", check: "fresh for staleTime ms" }),
        },
        {
            caption: "After `staleTime` the copy is stale. It is still served instantly, but a trigger now causes a background revalidation. The default `staleTime` is 0.",
            lit: { nodes: ["check"], wires: [], tone: "accent" },
            patch: subs({ cache: "cached copy (stale)", comp: "renders it, no spinner", check: "stale after staleTime" }),
        },
        {
            caption: "Because the copy is stale, the cache kicks off a background refetch: on mount, refocus or reconnect.",
            lit: { nodes: ["check", "server"], wires: ["refetch"], tone: "accent" },
            patch: subs({ cache: "cached copy (stale)", comp: "renders it, no spinner", check: "stale after staleTime", server: "refetching" }),
        },
        {
            caption: "Fresh data arrives, the entry updates, and the component re-renders with it. The user saw data first, then a quiet update.",
            lit: { nodes: ["server", "cache", "comp"], wires: ["fresh", "serve"], tone: "task" },
            patch: subs({ cache: "fresh data", comp: "re-renders with fresh data", server: "responded" }),
        },
    ];
    return (
        <FlowFigure
            description={["A component asks the cache entry and is served its copy at once.", "The cache checks staleTime: fresh copies are trusted, stale ones trigger a background refetch.", "Fresh data from the server updates the entry and the component."]}
            figcaption="`staleTime` is the line between fresh (trusted) and stale (served, then revalidated in the background)."
            height={148}
            nodes={nodes}
            overview="One cache entry serves a copy at once and revalidates it only if it has gone stale. Press Play to watch a component ask for `['user', 5]`."
            steps={steps}
            width={360}
            wires={wires}
        />
    );
}

/* react-error-boundaries-resilience */
export function UnwindFigure() {
    const nodes = [
        node("root", 90, 8, 180, 32, "Root"),
        node("outer", 90, 64, 180, 32, "ErrorBoundary", "has getDerivedStateFromError", "task"),
        node("mid", 90, 120, 180, 32, "Middle component"),
        node("inner", 90, 176, 180, 32, "Inner component", "renders", "accent"),
    ];
    const wires: FlowWire[] = [
        { id: "up-1", d: "M180 176 V154", tone: "accent", label: { text: "return", x: 186, y: 168, anchor: "start" } },
        { id: "up-2", d: "M180 120 V98", tone: "accent", label: { text: "return", x: 186, y: 112, anchor: "start" } },
        { id: "up-3", d: "M180 64 V42", tone: "accent", label: { text: "return", x: 186, y: 56, anchor: "start" } },
    ];
    const steps: FlowStep[] = [
        {
            caption: "React renders one fiber at a time in its work loop. The inner component throws during render, and React catches the throw there.",
            lit: { nodes: ["inner"], wires: [], tone: "accent" },
            patch: subs({ inner: "throws during render" }),
        },
        {
            caption: "React unwinds, walking up the fiber tree through each `return` pointer. It discards the half-built work in the failed subtree as it goes.",
            lit: { nodes: ["inner", "mid"], wires: ["up-1"], tone: "accent" },
            patch: subs({ inner: "throws during render" }),
        },
        {
            caption: "Each fiber is checked: is it a class with `getDerivedStateFromError` or `componentDidCatch`? The middle component is not, so the walk continues.",
            lit: { nodes: ["mid", "outer"], wires: ["up-2"], tone: "accent" },
            patch: subs({ inner: "throws during render", mid: "not a handler, keep going" }),
        },
        {
            caption: "The nearest boundary above the thrower stops the walk. React schedules an update on it carrying the error.",
            lit: { nodes: ["outer"], wires: [], tone: "task" },
            patch: subs({ inner: "throws during render", outer: "nearest boundary found" }),
        },
        {
            caption: "The boundary calls `getDerivedStateFromError`, renders its fallback instead of its children, and `componentDidCatch` runs in the commit phase. The blast radius is its subtree.",
            lit: { nodes: ["outer", "inner"], wires: [], tone: "task" },
            patch: subs({ outer: "renders its fallback", inner: "replaced by the fallback" }),
        },
        {
            caption: "Without any boundary, the unwind reaches the root. The error is uncaught and the entire tree unmounts.",
            lit: { nodes: ["root"], wires: ["up-1", "up-2", "up-3"], tone: "accent" },
            patch: { outer: { label: "(no boundary here)", sub: undefined }, root: { sub: ["whole tree unmounts"] }, ...subs({ inner: "throws during render" }) },
        },
    ];
    return (
        <FlowFigure
            description={["Inner component throws.", "React walks up through return pointers: middle component, then the error boundary, then the root.", "The nearest error boundary catches it. With none, the whole tree unmounts."]}
            figcaption="The nearest error boundary above the throw catches it, and with none the unwind reaches the root."
            height={216}
            nodes={nodes}
            overview="A thrown render error walks up the fiber tree until something can handle it. Press Play to follow the unwind from the throwing component."
            steps={steps}
            width={360}
            wires={wires}
        />
    );
}

/* react-event-system-internals */
export function DelegationFigure() {
    const nodes = [
        node("root", 8, 8, 120, 40, "root container", "one React listener", "task"),
        node("btn", 8, 150, 120, 40, "button", "native click target"),
        node("fiber", 232, 8, 120, 40, "target fiber", "found from the node"),
        node("up", 232, 80, 120, 40, "parent fibers", "walk toward root", "accent"),
        node("synth", 232, 150, 120, 40, "SyntheticEvent", "wraps the native one", "task"),
        node("handler", 98, 214, 164, 30, "your handleClick", undefined, "task"),
    ];
    const wires: FlowWire[] = [
        { id: "bubble", d: "M68 150 V50", label: { text: "bubbles in DOM", x: 74, y: 104, anchor: "start" } },
        { id: "find", d: "M128 28 H230", label: { text: "find fiber", x: 179, y: 22 } },
        { id: "walk", d: "M292 48 V78" },
        { id: "wrap", d: "M292 120 V148" },
        { id: "call", d: "M292 190 V200 Q292 206 286 206 H186 Q180 206 180 210 V212", label: { text: "call in order", x: 300, y: 204, anchor: "start" } },
    ];
    const steps: FlowStep[] = [
        { caption: "The user clicks a deep button. The browser creates a native `click` event with the button as its `target`.", lit: { nodes: ["btn"], wires: [] } },
        {
            caption: "The native event bubbles up the real DOM to the root container, where React's single delegated `click` listener catches it.",
            lit: { nodes: ["btn", "root"], wires: ["bubble"], tone: "task" },
        },
        {
            caption: "React reads the event's `target` and uses the node's internal pointer to find its fiber, so it knows where in its own tree the event began.",
            lit: { nodes: ["root", "fiber"], wires: ["find"], tone: "task" },
        },
        {
            caption: "React walks up the fiber tree from the target, collecting every matching `onClick` and `onClickCapture` along the way, in tree order.",
            lit: { nodes: ["fiber", "up"], wires: ["walk"], tone: "accent" },
            patch: subs({ up: "collect onClick, onClickCapture" }),
        },
        {
            caption: "React wraps the native event in a `SyntheticEvent` and calls the collected handlers in order. Capture handlers go first, then bubble handlers.",
            lit: { nodes: ["synth", "handler"], wires: ["wrap", "call"], tone: "task" },
        },
        {
            caption: "The real listener sits at the root, yet React makes it behave as if each element had its own, by walking the fiber tree.",
            lit: { nodes: ["root", "up", "handler"], wires: [], tone: "task" },
            patch: subs({ root: "the listener lives here", up: "the handlers live here" }),
        },
    ];
    return (
        <FlowFigure
            description={["The native click bubbles from the button to the root container's one listener.", "React finds the target fiber, walks up collecting handlers, wraps a SyntheticEvent and calls the handlers in order."]}
            figcaption="React rebuilds the propagation path by walking its own fiber tree from the target up."
            height={252}
            nodes={nodes}
            overview="A click on a deep button is handled far away, at the root container. Press Play to follow it to your handler."
            steps={steps}
            width={360}
            wires={wires}
        />
    );
}

/* react-hooks-and-effects-internals */
export function RenderSnapshotFigure() {
    const source = [
        "function Counter() {",
        "    const [count, setCount] = useState(0);",
        "",
        "    function handleClick() {",
        "        setCount(count + 1);",
        "        console.log(count);",
        "    }",
        "",
        "    return <button onClick={handleClick}>{count}</button>;",
        "}",
    ];
    return (
        <SlotsFigure
            spec={{
                fileName: "Counter.jsx",
                source,
                names: ["render", "count", "handleClick sees", "update queue"],
                title: "this render's snapshot",
                steps: [
                    {
                        caption: "The first render of `Counter` gets `count` as 0. That value is a constant for the whole life of this render.",
                        line: 1,
                        values: ["render 1", "0", "—", "empty"],
                    },
                    {
                        caption: "`handleClick` is created fresh in this render and closes over this render's `count`. The button on screen holds this version.",
                        line: 3,
                        values: ["render 1", "0", "count = 0", "empty"],
                    },
                    {
                        caption: "Click. `setCount` does not change `count`. It enqueues an update and asks React to render again.",
                        line: 4,
                        values: ["render 1", "0", "count = 0", "count + 1 (0 + 1)"],
                    },
                    {
                        caption: "The log shows the old value, because `count` in this render is a constant. You are reading the old page.",
                        line: 5,
                        values: ["render 1", "0", "count = 0", "count + 1 (0 + 1)"],
                        console: ["0"],
                    },
                    {
                        caption: "React runs `Counter` again. The new render reads the updated value from the queue and gets a new constant, 1.",
                        line: 8,
                        values: ["render 2", "1", "count = 1", "empty"],
                        console: ["0"],
                    },
                    {
                        caption: "The old `handleClick` is untouched: it still sees 0. It belongs to a render that already happened, which is why a render is a snapshot.",
                        line: 3,
                        values: ["render 2", "1", "count = 1 (old one: 0)", "empty"],
                        console: ["0"],
                    },
                ],
                overview: "Each render of a component is a frozen snapshot, and `setCount` draws a new one instead of editing the old. Press Play to watch one click across two renders.",
                figcaption: "`count` never changes inside a render, so ask which render's snapshot your code closes over.",
            }}
        />
    );
}

/* react-performance-architecture */
export function MemoBailoutFigure() {
    const nodes = [
        node("parent", 8, 8, 150, 38, "Parent", "state: counter"),
        node("props", 202, 8, 150, 38, "props", "old vs new, Object.is", "accent"),
        node("memo", 8, 82, 150, 38, "React.memo child", "compares props", "accent"),
        node("sub", 8, 156, 150, 38, "child subtree", "everything below", "task"),
    ];
    const wires: FlowWire[] = [
        { id: "renders", d: "M83 46 V80", label: { text: "renders it", x: 89, y: 66, anchor: "start" } },
        { id: "compare", d: "M277 46 V95 Q277 101 271 101 H160", tone: "accent", label: { text: "compare", x: 283, y: 76, anchor: "start" } },
        { id: "down", d: "M83 120 V154", tone: "task", label: { text: "renders down", x: 89, y: 140, anchor: "start" } },
    ];
    const steps: FlowStep[] = [
        {
            caption: "The parent re-renders. Normally React walks down and renders every child, regardless of props.",
            lit: { nodes: ["parent"], wires: [] },
            patch: subs({ parent: "counter changes, re-renders" }),
        },
        {
            caption: "React reaches the `React.memo` component. Instead of calling it, it compares new props to previous props with `Object.is`.",
            lit: { nodes: ["memo", "props"], wires: ["renders", "compare"], tone: "accent" },
        },
        {
            caption: "Every prop is `Object.is`-equal, so React bails out. The child function is not called, and its whole subtree is skipped too.",
            lit: { nodes: ["memo"], wires: [], tone: "accent" },
            patch: subs({ memo: "all props equal: bail out", sub: "skipped" }),
        },
        {
            caption: "If any prop differs, React renders the component normally, and the walk continues below it.",
            lit: { nodes: ["memo", "sub"], wires: ["down"], tone: "task" },
            patch: subs({ memo: "a prop differs: render", sub: "renders" }),
        },
        {
            caption: "Objects, arrays and functions compare by identity. An inline `style={{ padding: 8 }}` is new every render, so the bailout does not fire.",
            lit: { nodes: ["props"], wires: ["compare"], tone: "accent" },
            patch: subs({ props: "inline object: new identity" }),
        },
        {
            caption: "The memo boundary only gates the parent-render path. Its own state changes and Context changes still re-render it.",
            lit: { nodes: ["memo", "sub"], wires: ["down"], tone: "task" },
            patch: subs({ memo: "own state or Context: renders" }),
        },
    ];
    return (
        <FlowFigure
            description={["The parent renders the React.memo child.", "The child compares old and new props with Object.is.", "All equal: it skips itself and its subtree. Any difference: it renders, and the subtree too."]}
            figcaption="`React.memo` compares props with `Object.is` and skips the whole subtree when they are all equal."
            height={202}
            nodes={nodes}
            overview="`React.memo` is a gate that stops a parent's re-render from flowing down when props are unchanged. Press Play to watch the props check decide."
            steps={steps}
            width={360}
            wires={wires}
        />
    );
}

/* react-scheduler-and-lanes-internals */
export function LanesInterruptFigure() {
    const nodes = [
        node("pending", 8, 8, 150, 38, "pendingLanes", "transition lane", "task"),
        node("pick", 202, 8, 150, 38, "getNextLanes", "chooses the lanes", "accent"),
        { ...node("keep", 8, 84, 150, 38, "still pending", "—"), variant: "ghost" as const },
        node("render", 202, 84, 150, 38, "render pass", "renderLanes: —", "task"),
        node("work", 202, 160, 150, 38, "shouldYield check", "about every 5ms", "task"),
    ];
    const wires: FlowWire[] = [
        { id: "choose", d: "M158 27 H200" },
        { id: "start", d: "M277 46 V82" },
        { id: "slice", d: "M277 122 V158" },
        { id: "recheck", d: "M202 179 H186 Q180 179 180 173 V46 Q180 40 186 40 H200", label: { text: "re-check", x: 176, y: 150, anchor: "end" } },
        { id: "left", d: "M202 103 H160" },
    ];
    const steps: FlowStep[] = [
        {
            caption: "A root tracks every lane with scheduled-but-not-yet-rendered work in `pendingLanes`. Right now only a transition lane is pending.",
            lit: { nodes: ["pending"], wires: [], tone: "task" },
        },
        {
            caption: "Before rendering, React calls `getNextLanes` to choose which lanes to render. It picks the highest-priority pending lanes.",
            lit: { nodes: ["pending", "pick"], wires: ["choose"], tone: "accent" },
            patch: subs({ pick: "highest priority wins" }),
        },
        {
            caption: "The chosen set is `renderLanes`. The transition render starts, and updates whose lane is in `renderLanes` are included.",
            lit: { nodes: ["pick", "render"], wires: ["start"], tone: "task" },
            patch: subs({ render: "renderLanes: transition" }),
        },
        {
            caption: "The work loop does a unit of work and calls `shouldYield`. About every 5ms it yields, which gives React the chance to re-check.",
            lit: { nodes: ["render", "work"], wires: ["slice"], tone: "task" },
            patch: subs({ render: "renderLanes: transition", work: "slice used up: yield" }),
        },
        {
            caption: "A click schedules a `SyncLane` update mid-render. It is added to `pendingLanes` alongside the transition lane.",
            lit: { nodes: ["pending"], wires: [], tone: "accent" },
            patch: subs({ pending: "transition + SyncLane", render: "renderLanes: transition" }),
        },
        {
            caption: "At the next scheduling decision `getNextLanes` sees `SyncLane` pending, which is higher priority than the transition lanes in progress.",
            lit: { nodes: ["work", "pick"], wires: ["recheck"], tone: "accent" },
            patch: subs({ pending: "transition + SyncLane", pick: "SyncLane beats transition", render: "renderLanes: transition" }),
        },
        {
            caption: "React abandons the partial work-in-progress tree and restarts the render at `SyncLane`. The click is handled first.",
            lit: { nodes: ["pick", "render"], wires: ["start"], tone: "accent" },
            patch: subs({ pending: "transition + SyncLane", render: "renderLanes: SyncLane" }),
        },
        {
            caption: "The transition lane was not chosen, so it stays in `pendingLanes` and is picked up again in a later pass.",
            lit: { nodes: ["render", "keep"], wires: ["left"], tone: "task" },
            patch: subs({ pending: "transition lane", keep: "transition lane", render: "renderLanes: SyncLane" }),
        },
    ];
    return (
        <FlowFigure
            description={["pendingLanes feeds getNextLanes, which picks renderLanes for a render pass.", "The work loop yields about every 5ms and re-checks.", "A more urgent lane can take over. Lanes not chosen stay pending."]}
            figcaption="Interruption is `getNextLanes` choosing the higher-priority lanes at the next scheduling decision."
            height={206}
            nodes={nodes}
            overview="A transition render is under way when an urgent click arrives. Press Play to see an urgent update interrupt a transition."
            steps={steps}
            width={360}
            wires={wires}
        />
    );
}

/* react-server-components-internals */
export function ChildrenSlotFigure() {
    const nodes = [
        node("page", 110, 8, 140, 34, "Page", "Server Component", "accent"),
        node("content", 8, 82, 140, 34, "ServerContent", "Server Component", "accent"),
        node("layout", 212, 82, 140, 34, "ClientLayout", "Client Component", "task"),
        node("result", 8, 156, 140, 34, "rendered result", "—", "accent"),
        node("browser", 212, 156, 140, 34, "browser", "—", "task"),
    ];
    const wires: FlowWire[] = [
        { id: "renders", d: "M150 42 V54 Q150 60 144 60 H84 Q78 60 78 66 V80", tone: "accent", label: { text: "renders on server", x: 96, y: 55 } },
        { id: "children", d: "M210 42 V54 Q210 60 216 60 H276 Q282 60 282 66 V80", tone: "task", label: { text: "children", x: 262, y: 55 } },
        { id: "becomes", d: "M78 116 V154", tone: "accent" },
        { id: "down", d: "M148 173 H170 Q176 173 176 167 V105 Q176 99 182 99 H210", tone: "accent", label: { text: "passed down", x: 180, y: 140, anchor: "start" } },
        { id: "ships", d: "M282 116 V154", tone: "task" },
    ];
    const steps: FlowStep[] = [
        { caption: "`Page` is a Server Component. It renders `ClientLayout` and puts `ServerContent` between its tags.", lit: { nodes: ["page"], wires: [], tone: "accent" } },
        {
            caption: "`ServerContent` runs on the server. Client code could not run it, so a client file cannot `import` it.",
            lit: { nodes: ["page", "content"], wires: ["renders"], tone: "accent" },
            patch: subs({ content: "runs on the server" }),
        },
        {
            caption: "The server turns `ServerContent` into a rendered result. `Page` passes the result, not the component.",
            lit: { nodes: ["content", "result"], wires: ["becomes"], tone: "accent" },
            patch: subs({ result: "already-rendered UI" }),
        },
        {
            caption: "The result is handed down into `ClientLayout` as `children`. This is the slot, or donut, pattern.",
            lit: { nodes: ["result", "layout"], wires: ["down", "children"], tone: "task" },
            patch: subs({ result: "already-rendered UI", layout: "receives children" }),
        },
        {
            caption: "`ClientLayout` never imports or runs `ServerContent`. It only renders whatever it was handed.",
            lit: { nodes: ["layout"], wires: [], tone: "task" },
            patch: subs({ result: "already-rendered UI", layout: "just places children" }),
        },
        {
            caption: "The client shell wraps server-rendered content. The server hands content down, and the client never reaches up.",
            lit: { nodes: ["layout", "browser"], wires: ["ships"], tone: "task" },
            patch: subs({ result: "already-rendered UI", layout: "just places children", browser: ["interactive shell,", "server content inside"] }),
        },
    ];
    return (
        <FlowFigure
            description={["Page, a Server Component, renders ServerContent on the server and ClientLayout with children.", "The rendered result of ServerContent is passed down into ClientLayout as children."]}
            figcaption="Server content can live inside a client shell because it is passed down as `children`, not imported."
            height={198}
            nodes={nodes}
            overview="A Client Component cannot import a Server Component, yet server content can still sit inside it. Press Play to follow `ServerContent` into `ClientLayout` as `children`."
            steps={steps}
            width={360}
            wires={wires}
        />
    );
}

/* react-state-management-architecture */
export function ContextValueFigure() {
    const nodes = [
        node("provider", 8, 8, 150, 38, "AppProvider", "renders"),
        node("value", 202, 8, 150, 38, "value", "{ user, setUser, … }", "accent"),
        node("compare", 202, 82, 150, 38, "Object.is", "old value vs new", "accent"),
        node("theme", 8, 156, 150, 38, "theme consumer", "React.memo", "task"),
        node("user", 202, 156, 150, 38, "user consumer", "React.memo", "task"),
    ];
    const wires: FlowWire[] = [
        { id: "builds", d: "M158 27 H200" },
        { id: "compares", d: "M277 46 V80", tone: "accent" },
        { id: "to-theme", d: "M240 120 V132 Q240 138 234 138 H89 Q83 138 83 144 V154", tone: "task" },
        { id: "to-user", d: "M277 120 V154", tone: "task" },
    ];
    const steps: FlowStep[] = [
        {
            caption: "`AppProvider` re-renders, for example because a parent re-rendered or a `useState` changed.",
            lit: { nodes: ["provider"], wires: [] },
            patch: subs({ provider: "re-renders for any reason" }),
        },
        {
            caption: "`value={{ ... }}` builds a brand-new object with a new identity on every render.",
            lit: { nodes: ["provider", "value"], wires: ["builds"], tone: "accent" },
            patch: subs({ value: "new object literal" }),
        },
        {
            caption: "React compares the old and new value with `Object.is`. A different identity means React concludes the value changed.",
            lit: { nodes: ["value", "compare"], wires: ["compares"], tone: "accent" },
            patch: subs({ value: "new object literal", compare: "different object: changed" }),
        },
        {
            caption: "React re-renders every consumer of `AppContext`. The unit of change is the whole `value`, not one field.",
            lit: { nodes: ["compare", "theme", "user"], wires: ["to-theme", "to-user"], tone: "task" },
            patch: subs({ value: "new object literal", compare: "different object: changed", theme: "re-renders", user: "re-renders" }),
        },
        {
            caption: "Consumers subscribe to the context directly, so `React.memo` does not protect them. Even one that reads only `theme` re-renders.",
            lit: { nodes: ["theme", "user"], wires: [], tone: "task" },
            patch: subs({ theme: "memo bypassed", user: "memo bypassed" }),
        },
        {
            caption: "Context is not slow. It was handed a new value every render, so it faithfully propagated a change every render.",
            lit: { nodes: ["value"], wires: [], tone: "accent" },
            patch: subs({ value: "new every render" }),
        },
    ];
    return (
        <FlowFigure
            description={["AppProvider builds a new value object.", "Object.is sees a different object, so React re-renders every consumer.", "React.memo does not stop context consumers."]}
            figcaption="Context compares the whole `value` by identity, so an inline object re-renders every consumer past `React.memo`."
            height={202}
            nodes={nodes}
            overview="An inline object as a Provider value looks harmless. Press Play to see how it re-renders every consumer, even memoized ones."
            steps={steps}
            width={360}
            wires={wires}
        />
    );
}

/* react-suspense-internals */
export function TransitionFallbackFigure() {
    const nodes = [
        node("click", 8, 8, 150, 38, "selectItem(id)", "—", "accent"),
        node("boundary", 202, 8, 150, 38, "Suspense boundary", "content revealed", "task"),
        node("old", 8, 96, 108, 38, "old content", "on screen", "task"),
        node("fallback", 126, 96, 108, 38, "fallback", "not shown", "accent"),
        node("new", 244, 96, 108, 38, "new content", "not ready", "task"),
    ];
    const wires: FlowWire[] = [
        { id: "update", d: "M158 27 H200", tone: "accent" },
        { id: "to-old", d: "M250 46 V58 Q250 64 244 64 H68 Q62 64 62 70 V94", tone: "task" },
        { id: "to-fallback", d: "M260 46 V68 Q260 74 254 74 H186 Q180 74 180 80 V94", tone: "accent" },
        { id: "to-new", d: "M298 46 V94", tone: "task" },
    ];
    const steps: FlowStep[] = [
        {
            caption: "The boundary has already revealed its content, such as a detail panel. The user is looking at it.",
            lit: { nodes: ["boundary", "old"], wires: ["to-old"], tone: "task" },
            patch: subs({ old: "already revealed" }),
        },
        {
            caption: "The user selects a different item. The boundary's content now needs new data, and it suspends again.",
            lit: { nodes: ["click", "boundary"], wires: ["update"], tone: "accent" },
            patch: subs({ click: "new id needs new data", boundary: "suspends again" }),
        },
        {
            caption: "Without a transition, React unwinds to the boundary and shows the fallback. The visible content is removed for a spinner.",
            lit: { nodes: ["boundary", "fallback"], wires: ["to-fallback"], tone: "accent" },
            patch: subs({ click: "plain update", boundary: "suspended", old: "hidden", fallback: "shown" }),
        },
        {
            caption: "Results, then spinner, then new results. That flash over content the user was already viewing is jarring.",
            lit: { nodes: ["new"], wires: ["to-new"], tone: "task" },
            patch: subs({ click: "plain update", old: "hidden", fallback: "flashed", new: "swapped in when resolved" }),
        },
        {
            caption: "Now the same update is wrapped in `startTransition`. It gets a transition lane: a low-priority, interruptible lane.",
            lit: { nodes: ["click"], wires: ["update"], tone: "accent" },
            patch: subs({ click: "in startTransition", old: "already revealed" }),
        },
        {
            caption: "On re-suspension in a transition, React does not hide revealed content. The old content stays, and `isPending` can drive a subtle updating indicator.",
            lit: { nodes: ["boundary", "old"], wires: ["to-old"], tone: "task" },
            patch: subs({ click: "isPending: true", boundary: "suspended in a transition", old: "kept on screen" }),
        },
        {
            caption: "The new content renders in the background at transition priority. The fallback never appears.",
            lit: { nodes: ["new"], wires: ["to-new"], tone: "task" },
            patch: subs({ click: "isPending: true", old: "kept on screen", new: "rendering in background" }),
        },
        {
            caption: "Once the data resolves, React swaps in the new content, with no fallback flash. Keep the bare fallback for initial loads.",
            lit: { nodes: ["new"], wires: ["to-new"], tone: "task" },
            patch: subs({ click: "isPending: false", old: "replaced", new: "on screen" }),
        },
    ];
    return (
        <FlowFigure
            description={["Without a transition, re-suspending already-revealed content swaps it for the fallback until new content is ready.", "With startTransition, the old content stays on screen until the new content is ready."]}
            figcaption="Wrap updates to already-visible Suspense content in a transition, so the old content stays until the new is ready."
            height={142}
            nodes={nodes}
            overview="Selecting a new item re-suspends content that was already showing. Press Play to compare the fallback flash with keeping the old content."
            steps={steps}
            width={360}
            wires={wires}
        />
    );
}
