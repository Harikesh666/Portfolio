import { defineConfig } from "vite";
import type { Plugin } from "vite";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative } from "node:path";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import expressiveCode from "satteri-expressive-code";
import tailwindcss from "@tailwindcss/vite";
import satteri from "vite-plugin-satteri";
import { headingIds } from "./src/lib/satteri-plugins.ts";
import { guidePresentation } from "./src/lib/guide-presentation.ts";
import { createGuideCodeBlock } from "./src/lib/guide-code.ts";
import { guideTables } from "./src/lib/guide-tables.ts";
import { guideFigures } from "./src/lib/guide-figures.ts";
import {
    extractMinimapItems,
    extractTocItems,
} from "./src/lib/content-headings.ts";
import {
    parseContributionCalendar,
    type ContributionCalendar,
} from "./src/lib/github-contributions.ts";
import { site } from "./src/lib/site.ts";
import { nitro } from "nitro/vite";
import pierreDark from "@pierre/theme/pierre-dark";
import pierreLight from "@pierre/theme/pierre-light";

function guideToc(): Plugin {
    return {
        name: "guide-toc",
        enforce: "post",
        async transform(code, id) {
            const filename = id.replace(/\?.*$/, "");
            if (!filename.endsWith(".mdx")) return null;

            const source = await readFile(filename, "utf8");
            return {
                code: `${code}\nexport const toc = ${JSON.stringify(extractTocItems(source))};\nexport const minimap = ${JSON.stringify(extractMinimapItems(source))};`,
                map: null,
            };
        },
    };
}

const contributionsCacheFile = "node_modules/.cache/github-contributions.json";
const contributionsMaxAgeMs = 12 * 60 * 60 * 1000;

type CachedContributions = {
    fetchedAt: number;
    calendar: ContributionCalendar | null;
};

async function readCachedContributions() {
    try {
        return JSON.parse(
            await readFile(contributionsCacheFile, "utf8"),
        ) as CachedContributions;
    } catch {
        return undefined;
    }
}

async function loadContributions(username: string) {
    const cached = await readCachedContributions();
    if (cached && Date.now() - cached.fetchedAt < contributionsMaxAgeMs) {
        return cached.calendar;
    }

    try {
        const response = await fetch(
            `https://github.com/users/${username}/contributions`,
            { signal: AbortSignal.timeout(10_000) },
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const calendar = parseContributionCalendar(await response.text());
        await mkdir(dirname(contributionsCacheFile), { recursive: true });
        await writeFile(
            contributionsCacheFile,
            JSON.stringify({ fetchedAt: Date.now(), calendar }),
        );
        return calendar;
    } catch (error) {
        console.warn(
            `[github-contributions] using ${cached ? "stale cache" : "no graph"}: ${String(error)}`,
        );
        return cached?.calendar ?? null;
    }
}

/**
 * Exposes the public GitHub contribution calendar as
 * `virtual:github-contributions`, resolved once per build so prerendered
 * HTML and hydration read identical data.
 */
function githubContributions(): Plugin {
    const virtualId = "virtual:github-contributions";
    const resolvedId = `\0${virtualId}`;
    const username = new URL(site.socials.github).pathname.replaceAll("/", "");
    let calendar: Promise<ContributionCalendar | null> | undefined;

    return {
        name: "github-contributions",
        resolveId(id) {
            return id === virtualId ? resolvedId : null;
        },
        async load(id) {
            if (id !== resolvedId) return null;
            calendar ??= loadContributions(username);
            return `export default ${JSON.stringify(await calendar)};`;
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
                    guidePresentation,
                    guideTables,
                    guideFigures,
                    headingIds,
                    expressiveCode({
                    customCreateBlock: createGuideCodeBlock,
                    themes: [pierreDark, pierreLight],
                    // Flat frames: a hairline border and soft radius, no drop shadow.
                    styleOverrides: {
                        borderRadius: "0.75rem",
                        frames: { frameBoxShadowCssValue: "none" },
                    },
                    useDarkModeMediaQuery: false,
                        themeCssSelector: (theme) => `[data-theme='${theme.type}']`,
                    }),
                ],
        }),
        guideToc(),
        githubContributions(),
    ],
});

export default config;
