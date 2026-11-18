import {
    lazy,
    Suspense,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
import {
    HeadContent,
    Scripts,
    createRootRoute,
    rootRouteId,
    useLocation,
    useRouterState,
} from "@tanstack/react-router";
import {
    AnimatePresence,
    MotionConfig,
    motion,
    useIsPresent,
    usePresenceData,
    useReducedMotion,
} from "motion/react";
import { CommandPalette } from "../components/CommandPalette";
import Footer from "../components/Footer";
import { FloatingTocProvider } from "../components/TocRegistry";
import Header from "../components/Header";
import {
    exitTween,
    instantRouteTween,
    materializeBlock,
    pageContainer,
    pageEnterTween,
    reducedPageBlock,
    reducedPageContainer,
    reducedPageEnterTween,
    routeMaterializeBlock,
    routeEntranceFallbackMs,
    routePageContainer,
    routePageEnterTween,
} from "../lib/motion";
import { placeholderStops } from "../components/pond/pond-daylight";
import { notFoundMeta } from "../lib/not-found-head";
import {
    HeroHandoffContext,
    ServerRenderedRouteContext,
} from "../lib/route-entrance";
import { createScrollPositions } from "../lib/scroll-positions";
import { absoluteUrl, site } from "../lib/site";
import { themeColors } from "../lib/theme-color";

import appCss from "../styles.css?url";

const fontStylesheetHref =
    "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,400..600;1,14..32,400..600&family=JetBrains+Mono:wght@400;500;600&display=swap";

const LazyFloatingTocHost = lazy(async () => {
    const { FloatingTocHost } = await import("../components/FloatingToc");
    return { default: FloatingTocHost };
});

const themeScript = `(() => {
  const fallback = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  try {
    const saved = window.localStorage.getItem("theme");
    document.documentElement.setAttribute("data-theme", saved === "dark" || saved === "light" ? saved : fallback);
  } catch {
    document.documentElement.setAttribute("data-theme", fallback);
  }
})();`;

/**
 * Paints the scene placeholders for Mumbai's time of day before first paint,
 * so a night visit never flashes a daylight teal box while WebGL loads. It
 * interpolates the same stops the scenes use (`placeholderStops`) and writes
 * both themes, so a later theme toggle stays right.
 */
const pondPlaceholderScript = `(() => {
  const stops = ${JSON.stringify(placeholderStops)};
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(new Date());
  const read = (type) => Number((parts.find((part) => part.type === type) || {}).value || 0);
  const hour = read("hour") + read("minute") / 60;
  let i = 0;
  while (i < stops.length - 2 && hour >= stops[i + 1].hour) i += 1;
  const from = stops[i];
  const to = stops[i + 1];
  const t = Math.min(1, Math.max(0, (hour - from.hour) / (to.hour - from.hour)));
  const eased = t * t * (3 - 2 * t);
  const mix = (a, b) => a + (b - a) * eased;
  const rgb = (a, b, scale) => "rgb(" + a.map((value, k) => Math.round(mix(value, b[k]) * scale)).join(" ") + ")";
  const dim = 0.66 + 0.34 * mix(from.night, to.night);
  const vars = (water, theme) =>
    "--pond-water-shallow:" + rgb(from.shallow, to.shallow, water) +
    ";--pond-water-deep:" + rgb(from.deep, to.deep, water) +
    ";--pond-sky-top:" + rgb(from.sky[theme][0], to.sky[theme][0], 1) +
    ";--pond-sky-bottom:" + rgb(from.sky[theme][1], to.sky[theme][1], 1);
  const style = document.createElement("style");
  style.textContent = ":root{" + vars(255, "light") + "}[data-theme=dark]{" + vars(255 * dim, "dark") + "}";
  document.head.append(style);
})();`;

const fontStylesheetScript = `(() => {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = ${JSON.stringify(fontStylesheetHref)};
  document.head.append(link);
})();`;

/**
 * A URL no route matches leaves only the root match. A route whose loader
 * throws `notFound()` marks its match instead.
 */
function isMissingPage(
    matches: ReadonlyArray<{ routeId: string; status: string }>,
) {
    return (
        matches.every((match) => match.routeId === rootRouteId) ||
        matches.some((match) => match.status === "notFound")
    );
}

export const Route = createRootRoute({
    head: ({ matches }) => ({
        meta: [
            { charSet: "utf-8" },
            {
                name: "viewport",
                content: "width=device-width, initial-scale=1",
            },
            ...(isMissingPage(matches)
                ? notFoundMeta
                : [{ title: `${site.name} - Software Engineer` }]),
            { name: "description", content: site.description },
            {
                property: "og:title",
                content: `${site.name} - Software Engineer`,
            },
            { property: "og:description", content: site.description },
            { property: "og:type", content: "website" },
            { property: "og:url", content: absoluteUrl() },
            { property: "og:image", content: absoluteUrl("/og.png") },
            { name: "twitter:card", content: "summary_large_image" },
            {
                name: "twitter:title",
                content: `${site.name} - Software Engineer`,
            },
            { name: "twitter:description", content: site.description },
            { name: "twitter:image", content: absoluteUrl("/og.png") },
        ],
        links: [
            // React hoists the app stylesheet above the inline scripts, so the
            // script that injects the font stylesheet waits for it. Preloading
            // starts the font CSS request with the HTML instead.
            { rel: "preload", as: "style", href: fontStylesheetHref },
            { rel: "preconnect", href: "https://fonts.googleapis.com" },
            {
                rel: "preconnect",
                href: "https://fonts.gstatic.com",
                crossOrigin: "anonymous",
            },
            { rel: "stylesheet", href: appCss },
            {
                rel: "alternate",
                type: "application/rss+xml",
                title: `${site.name} articles`,
                href: absoluteUrl("/feed.xml"),
            },
        ],
    }),
    shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: themeScript }} />
                <script
                    dangerouslySetInnerHTML={{ __html: pondPlaceholderScript }}
                />
                <script
                    dangerouslySetInnerHTML={{ __html: fontStylesheetScript }}
                />
                <meta
                    name="theme-color"
                    content={themeColors.light}
                    media="(prefers-color-scheme: light)"
                />
                <meta
                    name="theme-color"
                    content={themeColors.dark}
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

/**
 * Holds a route's place while the router is not rendering it. On the way in,
 * the URL changes a frame or two before the router swaps its matches, and the
 * outlet would still render the previous page on the new screen. On the way
 * out, it holds the outgoing route's place while it exits. The router has already
 * moved on by then, so the exiting tree would render the next page's content
 * (at the old scroll offset, on top of the new screen). It renders nothing
 * instead. Its frame keeps the old page's height as a minimum, measured while
 * the page was live, so the document does not shrink: a shorter document
 * clamps the scroll position and pulls the footer into view for a frame.
 */
function ExitingRouteFrame({
    children,
    isShowingRoute,
}: Readonly<{ children: React.ReactNode; isShowingRoute: boolean }>) {
    const isPresent = useIsPresent();
    const showsContent = isPresent && isShowingRoute;
    const frameRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // Measured by a ResizeObserver, after layout, so nothing here forces a
    // layout of its own.
    useEffect(() => {
        if (!showsContent) return;

        const frame = frameRef.current;
        const content = contentRef.current;
        if (!frame || !content) return;

        const resizeObserver = new ResizeObserver(([entry]) => {
            if (entry) frame.style.minHeight = `${entry.contentRect.height}px`;
        });
        resizeObserver.observe(content);

        return () => resizeObserver.disconnect();
    }, [showsContent]);

    // An entering route whose match has not landed yet holds one screen of
    // space, so the footer stays below the fold instead of flashing up.
    const frameClassName = !isPresent
        ? "pointer-events-none"
        : isShowingRoute
          ? undefined
          : "min-h-dvh";

    return (
        <div
            aria-hidden={showsContent ? undefined : true}
            className={frameClassName}
            ref={frameRef}
        >
            {showsContent ? <div ref={contentRef}>{children}</div> : null}
        </div>
    );
}

/**
 * True once the router renders `pathname`: its deepest match is that path,
 * or, for a URL no route matches, only the root matched and the router has
 * resolved to it.
 */
function isRouteRendered(
    state: Readonly<{
        matches: ReadonlyArray<{ pathname: string; routeId: string }>;
        resolvedLocation?: { pathname: string };
    }>,
    pathname: string,
) {
    const deepest = state.matches.at(-1);
    if (!deepest) return false;
    if (deepest.routeId === rootRouteId) {
        return samePath(state.resolvedLocation?.pathname, pathname);
    }
    return samePath(deepest.pathname, pathname);
}

/** Index routes match as `/articles/` while the URL reads `/articles`. */
function samePath(a: string | undefined, b: string) {
    const trim = (path: string) =>
        path.length > 1 ? path.replace(/\/+$/, "") : path;
    return a !== undefined && trim(a) === trim(b);
}

function RoutePage({
    children,
    isInitialPage,
    onEntranceSettled,
    routeId,
    routeContainerVariants,
    scrollTarget,
    shouldDeferEntrance,
    shouldReduceMotion,
}: Readonly<{
    children: React.ReactNode;
    isInitialPage: boolean;
    onEntranceSettled: (routeId: string) => void;
    routeId: string;
    routeContainerVariants:
        typeof routePageContainer | typeof reducedPageContainer;
    scrollTarget: number;
    shouldDeferEntrance: boolean;
    shouldReduceMotion: boolean;
}>) {
    const [canEnter, setCanEnter] = useState(
        isInitialPage || shouldReduceMotion || !shouldDeferEntrance,
    );
    const hasSettled = useRef(false);
    const hasPlacedScroll = useRef(false);
    const heroHandoffRef = useRef(0);
    const settleFrame = useRef<number | undefined>(undefined);
    const shouldExitInstantly = usePresenceData() === true;
    const isRouterShowingRoute = useRouterState({
        select: (state) => isRouteRendered(state, routeId),
    });
    // The server-rendered route is on screen by definition, during SSR and
    // hydration alike.
    const isShowingRoute = isInitialPage || isRouterShowingRoute;

    useLayoutEffect(() => {
        if (hasPlacedScroll.current) return;
        if (isInitialPage) {
            hasPlacedScroll.current = true;
            return;
        }
        // Until this route's content is in the page there is nothing to
        // restore a position into; hold the empty frame at the top instead.
        if (!isShowingRoute) {
            window.scrollTo({ left: 0, top: 0, behavior: "instant" });
            return;
        }
        hasPlacedScroll.current = true;

        window.scrollTo({ left: 0, top: scrollTarget, behavior: "instant"});
        performance.mark("portfolio-route-enter-commit");
        if (!shouldDeferEntrance) {
            performance.mark("portfolio-route-enter-start");
        }
    }, [isInitialPage, isShowingRoute, scrollTarget, shouldDeferEntrance]);

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
        }, routeEntranceFallbackMs);

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
            animate={canEnter ? "visible" : "hidden"}
            className="relative w-full"
            exit={
                shouldExitInstantly
                    ? {
                          opacity: 1,
                          transition: instantRouteTween,
                      }
                    : shouldReduceMotion
                      ? {
                            opacity: 0,
                            transition: reducedPageEnterTween,
                        }
                      : {
                            opacity: 0,
                            transition: exitTween,
                        }
            }
            initial={shouldReduceMotion || isInitialPage ? "visible" : "hidden"}
            onAnimationComplete={(definition) => {
                if (definition === "visible") signalEntranceSettled();
            }}
            variants={routeContainerVariants}
        >
            <ServerRenderedRouteContext value={isInitialPage}>
                <HeroHandoffContext value={heroHandoffRef}>
                    <ExitingRouteFrame isShowingRoute={isShowingRoute}>
                        {children}
                    </ExitingRouteFrame>
                </HeroHandoffContext>
            </ServerRenderedRouteContext>
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
    const [scrollPositions] = useState(createScrollPositions);
    const isInitialPage = !hasNavigated && pathname === initialPathname;
    const locationKey = useLocation({
        select: (location) => location.state.__TSR_key ?? location.href,
    });
    const scrollTarget = scrollPositions.get(locationKey) ?? 0;
    const shouldDeferEntrance = pathname.startsWith("/articles/");

    useEffect(() => {
        if (pathname !== initialPathname) setHasNavigated(true);
    }, [initialPathname, pathname]);

    useEffect(() => {
        function captureScrollY() {
            const currentLocationKey =
                window.history.state?.__TSR_key ?? window.location.href;
            scrollPositions.set(currentLocationKey, window.scrollY);
        }

        function persistWhenHidden() {
            if (document.visibilityState === "hidden") scrollPositions.persist();
        }

        captureScrollY();
        window.addEventListener("scroll", captureScrollY, { passive: true });
        window.addEventListener("pagehide", scrollPositions.persist);
        document.addEventListener("visibilitychange", persistWhenHidden);

        return () => {
            window.removeEventListener("scroll", captureScrollY);
            window.removeEventListener("pagehide", scrollPositions.persist);
            document.removeEventListener("visibilitychange", persistWhenHidden);
        };
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
                initial={false}
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
                    <AnimatePresence custom={!shouldDeferEntrance} mode="wait">
                        <RoutePage
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
                    <CommandPalette />
                    {pathname.startsWith("/articles/") ? (
                        <Suspense fallback={null}>
                            <LazyFloatingTocHost
                                settledRouteId={settledRouteId}
                            />
                        </Suspense>
                    ) : null}
                </MotionConfig>
            </motion.div>
        </MotionConfig>
    );
}
