import { useEffect, useLayoutEffect, useRef } from "react";
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
import Header from "../components/Header";
import {
    exitTween,
    pageBlock,
    pageContainer,
    pageEnterTween,
    reducedPageBlock,
    reducedPageContainer,
    reducedPageEnterTween,
    routePageBlock,
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
}: Readonly<{ children: React.ReactNode }>) {
    const isPresent = useIsPresent();
    const exitScrollY: number = usePresenceData() ?? 0;
    const scrollOffset = useMotionValue(0);

    useLayoutEffect(() => {
        if (isPresent) {
            scrollOffset.set(0);
            return;
        }

        function syncScrollOffset() {
            scrollOffset.set(window.scrollY - exitScrollY);
        }

        syncScrollOffset();
        window.addEventListener("scroll", syncScrollOffset, { passive: true });

        return () => window.removeEventListener("scroll", syncScrollOffset);
    }, [exitScrollY, isPresent, scrollOffset]);

    return <motion.div style={{ y: scrollOffset }}>{children}</motion.div>;
}

function RouteTransition({ children }: { children: React.ReactNode }) {
    const pathname = useLocation({
        select: (location) => location.pathname,
    });
    const shouldReduceMotion = useReducedMotion();
    const isFirstRender = useRef(true);
    const scrollY = useRef(0);
    const isInitialPage = isFirstRender.current;

    useEffect(() => {
        isFirstRender.current = false;
    }, []);

    useEffect(() => {
        function captureScrollY() {
            scrollY.current = window.scrollY;
        }

        captureScrollY();
        window.addEventListener("scroll", captureScrollY, { passive: true });

        return () => window.removeEventListener("scroll", captureScrollY);
    }, []);

    const pageTransition = shouldReduceMotion
        ? reducedPageEnterTween
        : isInitialPage
          ? pageEnterTween
          : routePageEnterTween;
    const containerVariants = shouldReduceMotion
        ? reducedPageContainer
        : pageContainer;
    const blockVariants = shouldReduceMotion ? reducedPageBlock : pageBlock;
    const routeBlockVariants = shouldReduceMotion
        ? reducedPageBlock
        : routePageBlock;

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
                    <AnimatePresence
                        custom={scrollY.current}
                        mode="popLayout"
                    >
                        <motion.div
                            animate={isInitialPage ? undefined : "visible"}
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
                            key={pathname}
                            variants={containerVariants}
                        >
                            <ExitScrollCompensation>
                                {children}
                            </ExitScrollCompensation>
                        </motion.div>
                    </AnimatePresence>
                    <motion.div variants={routeBlockVariants}>
                        <Footer />
                    </motion.div>
                    <FloatingTocHost />
                </MotionConfig>
            </motion.div>
        </MotionConfig>
    );
}
