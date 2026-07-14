import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { site } from "../lib/site";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
    head: () => ({
        meta: [
            {
                charSet: "utf-8",
            },
            {
                name: "viewport",
                content: "width=device-width, initial-scale=1",
            },
            {
                title: `${site.name} - Full-stack developer`,
            },
            {
                name: "description",
                content: site.description,
            },
        ],
        links: [
            {
                rel: "stylesheet",
                href: appCss,
            },
        ],
    }),
    shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <HeadContent />
            </head>
            <body
                className="font-sans selection:bg-accent selection:text-surface"
                suppressHydrationWarning
            >
                <a className="skip-link" href="#main-content">
                    Skip to content
                </a>
                <Header />
                {children}
                <Footer />
                <Scripts />
            </body>
        </html>
    );
}
