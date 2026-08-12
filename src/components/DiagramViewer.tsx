import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type RefObject,
} from "react";
import { motion, useReducedMotion } from "motion/react";
import {
    diagramDialogBackdropCloseTween,
    diagramDialogBackdropOpenTween,
    diagramDialogBackdropVariants,
    diagramDialogInstantTween,
    diagramDialogSheetCloseTransition,
    diagramDialogSheetOpenTransition,
    diagramDialogSheetVariants,
} from "../lib/motion";

type Diagram = Readonly<{
    alt: string;
    shouldAnimate: boolean;
    source: string;
}>;

type DiagramViewerProps = Readonly<{
    containerRef: RefObject<HTMLElement | null>;
}>;

export function DiagramViewer({ containerRef }: DiagramViewerProps) {
    const [diagram, setDiagram] = useState<Diagram | null>(null);
    const [isClosing, setIsClosing] = useState(false);
    const dialogRef = useRef<HTMLDialogElement>(null);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const shouldReduceMotion = useReducedMotion() ?? false;
    const diagramSource = diagram?.source;
    const shouldAnimateDialog =
        diagram?.shouldAnimate === true && !shouldReduceMotion;

    const openDiagram = useCallback(
        (
            source: string,
            alt: string,
            trigger: HTMLButtonElement,
            shouldAnimate: boolean,
        ) => {
            triggerRef.current = trigger;
            setIsClosing(false);
            setDiagram({ source, alt, shouldAnimate });
        },
        [],
    );

    const finishClosing = useCallback(() => {
        setIsClosing(false);
        setDiagram(null);
        triggerRef.current?.focus();
        triggerRef.current = null;
    }, []);

    const requestClose = useCallback(() => {
        setIsClosing(true);
    }, []);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const enhancedDiagrams: Array<{
            image: HTMLImageElement;
            trigger: HTMLButtonElement;
            onClick: (event: MouseEvent) => void;
        }> = [];

        for (const image of container.querySelectorAll<HTMLImageElement>(
            'img[src^="/diagrams/"]',
        )) {
            const source = image.getAttribute("src");
            if (!source) continue;

            const trigger = document.createElement("button");
            trigger.type = "button";
            trigger.className = "diagram-trigger";
            trigger.setAttribute("aria-haspopup", "dialog");
            trigger.setAttribute("aria-label", `Expand diagram: ${image.alt}`);

            const onClick = (event: MouseEvent) =>
                openDiagram(source, image.alt, trigger, event.detail > 0);
            trigger.addEventListener("click", onClick);
            image.replaceWith(trigger);
            trigger.append(
                image,
                Object.assign(document.createElement("span"), {
                    className: "diagram-trigger__action",
                    textContent: "Open full diagram →",
                }),
            );
            enhancedDiagrams.push({ image, trigger, onClick });
        }

        return () => {
            for (const { image, trigger, onClick } of enhancedDiagrams) {
                trigger.removeEventListener("click", onClick);
                if (trigger.isConnected) trigger.replaceWith(image);
            }
        };
    }, [containerRef, openDiagram]);

    useLayoutEffect(() => {
        const dialog = dialogRef.current;
        if (!diagramSource || !dialog) return;

        dialog.showModal();
        return () => {
            if (dialog.open) dialog.close();
        };
    }, [diagramSource]);

    useLayoutEffect(() => {
        if (!diagramSource) return;

        const html = document.documentElement;
        const body = document.body;
        const previousHtmlOverflow = html.style.overflow;
        const previousBodyOverflow = body.style.overflow;

        html.style.overflow = "hidden";
        body.style.overflow = "hidden";

        return () => {
            html.style.overflow = previousHtmlOverflow;
            body.style.overflow = previousBodyOverflow;
        };
    }, [diagramSource]);

    if (!diagram) return null;

    return (
        <motion.dialog
            aria-describedby="diagram-dialog-description"
            aria-labelledby="diagram-dialog-title"
            className="diagram-dialog"
            onCancel={(event) => {
                event.preventDefault();
                requestClose();
            }}
            onClose={finishClosing}
            ref={dialogRef}
        >
            <motion.div
                animate={isClosing ? "hidden" : "visible"}
                aria-hidden="true"
                className="diagram-dialog__backdrop"
                initial={shouldAnimateDialog ? "hidden" : false}
                onClick={requestClose}
                transition={
                    shouldAnimateDialog
                        ? isClosing
                            ? diagramDialogBackdropCloseTween
                            : diagramDialogBackdropOpenTween
                        : diagramDialogInstantTween
                }
                variants={diagramDialogBackdropVariants}
            />
            <motion.div
                animate={isClosing ? "hidden" : "visible"}
                className="diagram-dialog__sheet"
                initial={shouldAnimateDialog ? "hidden" : false}
                onAnimationComplete={() => {
                    if (isClosing) dialogRef.current?.close();
                }}
                transition={
                    shouldAnimateDialog
                        ? isClosing
                            ? diagramDialogSheetCloseTransition
                            : diagramDialogSheetOpenTransition
                        : diagramDialogInstantTween
                }
                variants={diagramDialogSheetVariants}
            >
                <div className="diagram-dialog__header">
                    <p className="diagram-dialog__title" id="diagram-dialog-title">
                        Diagram
                    </p>
                    <button
                        className="diagram-dialog__close"
                        onClick={requestClose}
                        type="button"
                    >
                        Close
                    </button>
                </div>
                <figure className="diagram-dialog__figure">
                    <div className="diagram-dialog__canvas">
                        <img
                            alt={diagram.alt}
                            className="diagram-dialog__image"
                            src={diagram.source}
                        />
                    </div>
                    <figcaption
                        className="diagram-dialog__description"
                        id="diagram-dialog-description"
                    >
                        {diagram.alt}
                    </figcaption>
                </figure>
            </motion.div>
        </motion.dialog>
    );
}
