import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
    HeadContent,
    Scripts,
    createRootRoute,
    useLocation,
} from "@tanstack/react-router";
import {
    AnimatePresence,
    MotionConfig,
    motion,
    useIsPresent,
    useMotionValue,
    usePresenceData,
    useReducedMotion,
} from "motion/react";
import Footer from "../components/Footer";
import {
    FloatingTocHost,
    FloatingTocProvider,
} from "../components/FloatingToc";
import Header, { getHeaderHeight } from "../components/Header";
import {
    exitTween,
    materializeBlock,
    pageContainer,
    pageEnterTween,
    reducedPageBlock,
    reducedPageContainer,
    reducedPageEnterTween,
    routeMaterializeBlock,
    routePageContainer,
    routePageEnterTween,
} from "../lib/motion";
import { absoluteUrl, site } from "../lib/site";

import appCss from "../styles.css?url";

const themeScript = `(() => {
  const fallback = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  try {
    const saved = window.localStorage.getItem("theme");
    document.documentElement.setAttribute("data-theme", saved === "dark" || saved === "light" ? saved : fallback);
  } catch {
    document.documentElement.setAttribute("data-theme", fallback);
  }
})();`;

export const Route = createRootRoute({
    head: () => ({
        meta: [
            { charSet: "utf-8" },
            {
                name: "viewport",
                content: "width=device-width, initial-scale=1",
            },
            { title: `${site.name} - Full-stack developer` },
            { name: "description", content: site.description },
            {
                property: "og:title",
                content: `${site.name} - Full-stack developer`,
            },
            { property: "og:description", content: site.description },
            { property: "og:type", content: "website" },
            { property: "og:url", content: absoluteUrl() },
            { property: "og:image", content: absoluteUrl("/og.png") },
            { name: "twitter:card", content: "summary_large_image" },
            {
                name: "twitter:title",
                content: `${site.name} - Full-stack developer`,
            },
            { name: "twitter:description", content: site.description },
            { name: "twitter:image", content: absoluteUrl("/og.png") },
        ],
        links: [{ rel: "stylesheet", href: appCss }],
    }),
    shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: themeScript }} />
                <meta
                    name="theme-color"
                    content="#faf9f5"
                    media="(prefers-color-scheme: light)"
                />
                <meta
                    name="theme-color"
                    content="#25231f"
                    media="(prefers-color-scheme: dark)"
                />
                <HeadContent />
            </head>
            <body className="font-sans" suppressHydrationWarning>
                <a className="skip-link" href="#main-content">
                    Skip to content
                </a>
                <FloatingTocProvider>
                    <RouteTransition>{children}</RouteTransition>
                </FloatingTocProvider>
                <Scripts />
            </body>
        </html>
    );
}

function ExitScrollCompensation({
    children,
    headerHeight,
}: Readonly<{ children: React.ReactNode; headerHeight: number }>) {
    const isPresent = useIsPresent();
    const exitScrollY: number = usePresenceData() ?? 0;
    const scrollOffset = useMotionValue(0);

    useLayoutEffect(() => {
        if (isPresent) {
            scrollOffset.set(0);
            return;
        }

        function syncScrollOffset() {
            scrollOffset.set(headerHeight - window.scrollY);
        }

        syncScrollOffset();
        window.addEventListener("scroll", syncScrollOffset, { passive: true });

        return () => window.removeEventListener("scroll", syncScrollOffset);
    }, [headerHeight, isPresent, scrollOffset]);

    return (
        <div
            className={isPresent ? undefined : "pointer-events-none"}
            style={
                isPresent
                    ? undefined
                    : { height: `calc(100dvh + ${exitScrollY}px)` }
            }
        >
            <div
                className={
                    isPresent
                        ? undefined
                        : "fixed inset-0 h-dvh overflow-clip"
                }
            >
                <motion.div style={{ y: scrollOffset }}>{children}</motion.div>
            </div>
        </div>
    );
}

function RoutePage({
    children,
    headerHeight,
    isInitialPage,
    onEntranceSettled,
    routeId,
    routeContainerVariants,
    scrollTarget,
    shouldDeferEntrance,
    shouldReduceMotion,
}: Readonly<{
    children: React.ReactNode;
    headerHeight: number;
    isInitialPage: boolean;
    onEntranceSettled: (routeId: string) => void;
    routeId: string;
    routeContainerVariants:
        | typeof routePageContainer
        | typeof reducedPageContainer;
    scrollTarget: number;
    shouldDeferEntrance: boolean;
    shouldReduceMotion: boolean;
}>) {
    const [canEnter, setCanEnter] = useState(
        isInitialPage || shouldReduceMotion || !shouldDeferEntrance,
    );
    const hasSettled = useRef(false);
    const hasPlacedScroll = useRef(false);
    const settleFrame = useRef<number | undefined>(undefined);

    useLayoutEffect(() => {
        if (hasPlacedScroll.current) return;
        hasPlacedScroll.current = true;
        if (isInitialPage) return;

        window.scrollTo({ left: 0, top: scrollTarget });
        performance.mark("portfolio-route-enter-commit");
        if (!shouldDeferEntrance) {
            performance.mark("portfolio-route-enter-start");
        }
    }, [isInitialPage, scrollTarget, shouldDeferEntrance]);

    useEffect(() => {
        if (isInitialPage || shouldReduceMotion || !shouldDeferEntrance) return;

        const frame = window.requestAnimationFrame(() => {
            performance.mark("portfolio-route-enter-start");
            setCanEnter(true);
        });

        return () => window.cancelAnimationFrame(frame);
    }, [isInitialPage, shouldDeferEntrance, shouldReduceMotion]);

    useEffect(() => {
        if (isInitialPage) return;

        const timeout = window.setTimeout(() => {
            if (hasSettled.current) return;
            hasSettled.current = true;
            performance.mark("portfolio-route-enter-complete");
            onEntranceSettled(routeId);
        }, 600);

        return () => {
            window.clearTimeout(timeout);
            if (settleFrame.current !== undefined) {
                window.cancelAnimationFrame(settleFrame.current);
            }
        };
    }, [isInitialPage, onEntranceSettled, routeId]);

    const signalEntranceSettled = () => {
        if (isInitialPage || hasSettled.current) return;

        hasSettled.current = true;
        performance.mark("portfolio-route-enter-complete");
        settleFrame.current = window.requestAnimationFrame(() =>
            onEntranceSettled(routeId),
        );
    };

    return (
        <motion.div
            animate={
                isInitialPage ? undefined : canEnter ? "visible" : "hidden"
            }
            className="relative w-full"
            exit={
                shouldReduceMotion
                    ? {
                          opacity: 0,
                          transition: reducedPageEnterTween,
                      }
                    : {
                          opacity: 0,
                          transition: exitTween,
                      }
            }
            initial={isInitialPage ? undefined : "hidden"}
            onAnimationComplete={(definition) => {
                if (definition === "visible") signalEntranceSettled();
            }}
            variants={routeContainerVariants}
        >
            <ExitScrollCompensation headerHeight={headerHeight}>
                {children}
            </ExitScrollCompensation>
        </motion.div>
    );
}

function RouteTransition({ children }: { children: React.ReactNode }) {
    const pathname = useLocation({
        select: (location) => location.pathname,
    });
    const shouldReduceMotion = useReducedMotion();
    const [initialPathname] = useState(pathname);
    const [hasNavigated, setHasNavigated] = useState(false);
    const [settledRouteId, setSettledRouteId] = useState(pathname);
    const [scrollPositions] = useState(() => new Map<string, number>());
    const isInitialPage = !hasNavigated && pathname === initialPathname;
    const locationKey = useLocation({
        select: (location) =>
            location.state.__TSR_key ?? location.href,
    });
    const scrollTarget = scrollPositions.get(locationKey) ?? 0;
    const shouldDeferEntrance = pathname.startsWith("/writing/");

    useEffect(() => {
        if (pathname !== initialPathname) setHasNavigated(true);
    }, [initialPathname, pathname]);

    useEffect(() => {
        function captureScrollY() {
            const currentLocationKey =
                window.history.state?.__TSR_key ?? window.location.href;
            scrollPositions.set(currentLocationKey, window.scrollY);
        }

        captureScrollY();
        window.addEventListener("scroll", captureScrollY, { passive: true });

        return () => window.removeEventListener("scroll", captureScrollY);
    }, [scrollPositions]);

    const pageTransition = shouldReduceMotion
        ? reducedPageEnterTween
        : isInitialPage
          ? pageEnterTween
          : routePageEnterTween;
    const containerVariants = shouldReduceMotion
        ? reducedPageContainer
        : pageContainer;
    const blockVariants = shouldReduceMotion
        ? reducedPageBlock
        : materializeBlock;
    const routeBlockVariants = shouldReduceMotion
        ? reducedPageBlock
        : routeMaterializeBlock;
    const routeContainerVariants = shouldReduceMotion
        ? reducedPageContainer
        : routePageContainer;

    return (
        <MotionConfig reducedMotion="user" transition={pageTransition}>
            <motion.div
                animate="visible"
                initial="hidden"
                variants={containerVariants}
            >
                <motion.div variants={blockVariants}>
                    <Header />
                </motion.div>
                <MotionConfig
                    transition={
                        shouldReduceMotion
                            ? reducedPageEnterTween
                            : routePageEnterTween
                    }
                >
                    <AnimatePresence mode="wait">
                        <RoutePage
                            headerHeight={getHeaderHeight(pathname)}
                            isInitialPage={isInitialPage}
                            key={pathname}
                            onEntranceSettled={setSettledRouteId}
                            routeId={pathname}
                            routeContainerVariants={routeContainerVariants}
                            scrollTarget={scrollTarget}
                            shouldDeferEntrance={shouldDeferEntrance}
                            shouldReduceMotion={shouldReduceMotion ?? false}
                        >
                            {children}
                        </RoutePage>
                    </AnimatePresence>
                    <motion.div variants={routeBlockVariants}>
                        <Footer />
                    </motion.div>
                    <FloatingTocHost settledRouteId={settledRouteId} />
                </MotionConfig>
            </motion.div>
        </MotionConfig>
    );
}
