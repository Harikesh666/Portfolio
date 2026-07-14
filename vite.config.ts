import { defineConfig } from "vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import satteri from "vite-plugin-satteri";

const config = defineConfig({
    resolve: { tsconfigPaths: true },
    plugins: [
        tanstackStart({ prerender: { enabled: true, crawlLinks: true } }),
        tailwindcss(),
        viteReact(),
        satteri({
            features: {
                gfm: true,
                frontmatter: true,
            },
        }),
    ],
});

export default config;
