import {
    HeadContent,
    Scripts,
    createRootRoute,
    useLocation,
} from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { exitTween } from "../lib/motion";
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
                <Header />
                <RouteTransition>{children}</RouteTransition>
                <Footer />
                <Scripts />
            </body>
        </html>
    );
}

function RouteTransition({ children }: { children: React.ReactNode }) {
    const pathname = useLocation({
        select: (location) => location.pathname,
    });
    const shouldReduceMotion = useReducedMotion();
    const instantTransition = { duration: 0 };

    return (
        <AnimatePresence mode="popLayout">
            <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="w-full"
                exit={
                    shouldReduceMotion
                        ? { opacity: 1, y: 0 }
                        : { opacity: 0, y: -6 }
                }
                initial={{ opacity: 1, y: 0 }}
                key={pathname}
                transition={shouldReduceMotion ? instantTransition : exitTween}
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
}
