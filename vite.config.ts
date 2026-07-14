import { defineConfig } from "vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import expressiveCode from "satteri-expressive-code";
import tailwindcss from "@tailwindcss/vite";
import satteri from "vite-plugin-satteri";
import { headingIds } from "./src/lib/satteri-plugins";
import { nitro } from "nitro/vite";

const config = defineConfig({
    resolve: { tsconfigPaths: true },
    plugins: [
        tanstackStart({ prerender: { enabled: true, crawlLinks: true } }),
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
                    themes: ["github-dark", "github-light"],
                    useDarkModeMediaQuery: false,
                    themeCssSelector: (theme) => `[data-theme='${theme.type}']`,
                }),
            ],
        }),
    ],
});

export default config;
