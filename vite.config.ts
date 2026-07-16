import { defineConfig } from "vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import expressiveCode from "satteri-expressive-code";
import tailwindcss from "@tailwindcss/vite";
import satteri from "vite-plugin-satteri";
import { headingIds } from "./src/lib/satteri-plugins";
import { nitro } from "nitro/vite";
import pierreDark from "@pierre/theme/pierre-dark";
import pierreLight from "@pierre/theme/pierre-light";

const config = defineConfig({
    resolve: { tsconfigPaths: true },
    plugins: [
        tanstackStart({
            prerender: {
                enabled: true,
                crawlLinks: true,
                // Never "prerender" binary public assets: the crawler
                // round-trips them as text, corrupting the bytes that
                // get deployed from .output/public (e.g. the resume PDF
                // rendering as blank pages in production).
                filter: (page) =>
                    !/\.(pdf|png|jpe?g|gif|webp|svg|ico|zip)$/i.test(
                        page.path,
                    ),
            },
        }),
        nitro(),
        tailwindcss(),
        viteReact(),
        satteri({
            features: {
                gfm: true,
                frontmatter: true,
            },
            hastPlugins: [
                headingIds,
                expressiveCode({
                    themes: [pierreDark, pierreLight],
                    useDarkModeMediaQuery: false,
                    themeCssSelector: (theme) => `[data-theme='${theme.type}']`,
                }),
            ],
        }),
    ],
});

export default config;
