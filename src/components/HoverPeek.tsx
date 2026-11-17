import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type FocusEvent,
    type PointerEvent,
    type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type HoverPeekProps = Readonly<{
    children: ReactNode;
    /** What the card shows. It repeats or previews information, so it is hidden from assistive tech. */
    peek: ReactNode;
    /** `span` wraps inline text; `div` with `className="contents"` wraps a block row without adding a box. */
    as?: "div" | "span";
    className?: string;
}>;

/** The card sits this far below and to the right of the cursor. */
const cursorOffset = { x: 16, y: 20 };
/** Minimum gap between the card and the viewport edge before it flips sides. */
const viewportMargin = 8;

/**
 * A small preview card that follows a mouse cursor over its children, or sits
 * under them when they receive keyboard focus. Touch never opens it, because a
 * tap should simply follow the link. The card is portalled to `body` so
 * transformed ancestors (the entrance animations) cannot offset its fixed
 * position. Styling and timing live in `styles.css` (`.hover-peek`).
 */
export function HoverPeek({ as = "span", children, className, peek }: HoverPeekProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);
    const point = useRef({ x: 0, y: 0 });
    const frame = useRef(0);

    function place() {
        frame.current = 0;
        const card = cardRef.current;
        if (!card) return;
        const { x, y } = point.current;
        const width = card.offsetWidth;
        const height = card.offsetHeight;
        const fitsRight = x + cursorOffset.x + width <= window.innerWidth - viewportMargin;
        const fitsBelow = y + cursorOffset.y + height <= window.innerHeight - viewportMargin;
        const left = fitsRight ? x + cursorOffset.x : Math.max(viewportMargin, x - cursorOffset.x - width);
        const top = fitsBelow ? y + cursorOffset.y : Math.max(viewportMargin, y - cursorOffset.y - height);
        card.style.translate = `${Math.round(left)}px ${Math.round(top)}px`;
    }

    // Place before paint, so the card never flashes at the corner of the page.
    useLayoutEffect(() => {
        if (isOpen) place();
    }, [isOpen]);

    useEffect(() => () => cancelAnimationFrame(frame.current), []);

    function openAt(x: number, y: number) {
        point.current = { x, y };
        setIsMounted(true);
        setIsOpen(true);
    }

    function handlePointerEnter(event: PointerEvent) {
        if (event.pointerType !== "mouse") return;
        openAt(event.clientX, event.clientY);
    }

    function handlePointerMove(event: PointerEvent) {
        if (event.pointerType !== "mouse") return;
        point.current = { x: event.clientX, y: event.clientY };
        if (!frame.current) frame.current = requestAnimationFrame(place);
    }

    function handleFocus(event: FocusEvent<HTMLElement>) {
        if (!event.target.matches(":focus-visible")) return;
        const bounds = event.target.getBoundingClientRect();
        openAt(bounds.left - cursorOffset.x, bounds.bottom - cursorOffset.y + 6);
    }

    const Tag = as;
    return (
        <Tag
            className={className}
            onBlur={() => setIsOpen(false)}
            onFocus={handleFocus}
            onKeyDown={(event) => {
                if (event.key === "Escape") setIsOpen(false);
            }}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={() => setIsOpen(false)}
            onPointerMove={handlePointerMove}
        >
            {children}
            {isMounted &&
                createPortal(
                    <div
                        aria-hidden="true"
                        className="hover-peek"
                        data-open={isOpen ? "" : undefined}
                        ref={cardRef}
                    >
                        {peek}
                    </div>,
                    document.body,
                )}
        </Tag>
    );
}
