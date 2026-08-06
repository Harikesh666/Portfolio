import { defineConfig } from "vite";
import type { Plugin } from "vite";
import { readFile } from "node:fs/promises";
import { relative } from "node:path";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import expressiveCode from "satteri-expressive-code";
import tailwindcss from "@tailwindcss/vite";
import satteri from "vite-plugin-satteri";
import { headingIds } from "./src/lib/satteri-plugins";
import { extractTocItems } from "./src/lib/content-headings";
import { nitro } from "nitro/vite";
import pierreDark from "@pierre/theme/pierre-dark";
import pierreLight from "@pierre/theme/pierre-light";

function guideToc(): Plugin {
    return {
        name: "guide-toc",
        enforce: "post",
        async transform(code, id) {
            const filename = id.replace(/\?.*$/, "");
            if (!filename.endsWith(".md")) return null;

            const source = await readFile(filename, "utf8");
            return {
                code: `${code}\nexport const toc = ${JSON.stringify(extractTocItems(source))};`,
                map: null,
            };
        },
    };
}

const compilerPreset = reactCompilerPreset(
    process.env.COMPILER_REPORT === "1"
        ? {
              logger: {
                  logEvent(filename, event) {
                      process.stdout.write(
                          `${JSON.stringify({
                              type: "react-compiler",
                              filename:
                                  filename === null
                                      ? null
                                      : relative(process.cwd(), filename),
                              event,
                          })}\n`,
                      );
                  },
              },
          }
        : {},
);
compilerPreset.rolldown.applyToEnvironmentHook = () => true;

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
        react(),
        babel({
            include: /[\\/]src[\\/].*\.[jt]sx(?:$|\?)/,
            presets: [compilerPreset],
        }),
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
        guideToc(),
    ],
});

export default config;
