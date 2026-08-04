import { readFile, readdir, stat, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import { createElement } from "react";
import satori from "satori";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contentDirectory = path.join(rootDirectory, "src", "content", "guides");
const outputDirectory = path.join(rootDirectory, "public", "og");
const sitemapPath = path.join(rootDirectory, "public", "sitemap.xml");
const site = { url: "https://www.harikesh.xyz" };
const absoluteUrl = (pathname = "") =>
    `${site.url}${pathname}`.replace(/\/+$/, "") || site.url;

const requiredFields = ["title", "description", "readTime", "publishedAt"];

function parseFrontmatter(source, filename) {
    const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    if (!match) {
        throw new Error(`Invalid frontmatter in ${filename}: missing YAML block`);
    }

    const metadata = {};
    for (const line of match[1].split(/\r?\n/)) {
        const field = line.match(/^([A-Za-z][A-Za-z0-9]*):\s*(.*?)\s*$/);
        if (!field) {
            throw new Error(`Invalid frontmatter in ${filename}: ${line}`);
        }

        const [, key, rawValue] = field;
        const isQuoted = rawValue.startsWith('"') || rawValue.startsWith("'");
        const value = isQuoted ? rawValue.slice(1, -1) : rawValue;
        if (!value || (isQuoted && rawValue.at(-1) !== rawValue[0])) {
            throw new Error(`Invalid frontmatter in ${filename}: ${key}`);
        }

        metadata[key] = value;
    }

    for (const field of requiredFields) {
        if (!metadata[field]) {
            throw new Error(`Invalid frontmatter in ${filename}: missing ${field}`);
        }
    }

    return metadata;
}

async function findMarkdownFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = await Promise.all(
        entries.map((entry) => {
            const entryPath = path.join(directory, entry.name);
            return entry.isDirectory()
                ? findMarkdownFiles(entryPath)
                : entry.isFile() && entry.name.endsWith(".md")
                  ? [entryPath]
                  : [];
        }),
    );

    return files.flat();
}

function escapeXml(value) {
    return value.replace(/[<>&"']/g, (character) => {
        return { "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[character];
    });
}

function card(post) {
    const titleFontSize = post.title.length > 45 ? 54 : 64;

    return createElement(
        "div",
        {
            style: {
                display: "flex",
                flexDirection: "column",
                width: "100%",
                height: "100%",
                padding: 84,
                backgroundColor: "#12120f",
            },
        },
        createElement(
            "div",
            {
                style: {
                    display: "flex",
                    color: "#ee7c55",
                    fontFamily: "JetBrains Mono",
                    fontSize: 26,
                    fontWeight: 500,
                },
            },
            "www.harikesh.xyz/articles",
        ),
        createElement(
            "div",
            {
                style: {
                    display: "flex",
                    maxHeight: titleFontSize * 1.15 * 3,
                    marginTop: 36,
                    overflow: "hidden",
                    color: "#edece7",
                    fontFamily: "Atkinson",
                    fontSize: titleFontSize,
                    fontWeight: 700,
                    lineHeight: 1.15,
                },
            },
            post.title,
        ),
        createElement(
            "div",
            {
                style: {
                    display: "flex",
                    maxHeight: 68,
                    marginTop: 24,
                    overflow: "hidden",
                    color: "#9b9890",
                    fontFamily: "Atkinson",
                    fontSize: 28,
                    lineHeight: 1.2,
                },
            },
            post.description,
        ),
        createElement(
            "div",
            {
                style: {
                    display: "flex",
                    marginTop: "auto",
                    color: "#9b9890",
                    fontFamily: "JetBrains Mono",
                    fontSize: 24,
                    fontWeight: 500,
                },
            },
            `Harikesh Mishra · ${post.readTime}`,
        ),
    );
}

async function generateCard(post, fonts) {
    const outputPath = path.join(outputDirectory, `${post.slug}.png`);
    const [markdownStats, outputStats] = await Promise.all([
        stat(post.path),
        stat(outputPath).catch(() => undefined),
    ]);

    if (outputStats && outputStats.mtimeMs >= markdownStats.mtimeMs) {
        return;
    }

    const svg = await satori(card(post), {
        width: 1200,
        height: 630,
        fonts,
    });
    const png = new Resvg(svg).render().asPng();
    await writeFile(outputPath, png);
}

async function writeSitemap(posts) {
    const dateParts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Calcutta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());
    const today = `${dateParts.find((part) => part.type === "year")?.value}-${dateParts.find((part) => part.type === "month")?.value}-${dateParts.find((part) => part.type === "day")?.value}`;
    const entries = [
        { url: absoluteUrl(), lastmod: today },
        { url: absoluteUrl("/articles"), lastmod: today },
        ...posts.map((post) => ({
            url: absoluteUrl(`/articles/${post.slug}`),
            lastmod: post.publishedAt,
        })),
    ];
    const sitemap = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...entries.map(
            ({ url, lastmod }) =>
                `  <url><loc>${escapeXml(url)}</loc><lastmod>${escapeXml(lastmod)}</lastmod></url>`,
        ),
        "</urlset>",
        "",
    ].join("\n");

    await writeFile(sitemapPath, sitemap);
}

async function main() {
    const markdownFiles = await findMarkdownFiles(contentDirectory);
    const posts = await Promise.all(
        markdownFiles.map(async (markdownPath) => {
            const source = await readFile(markdownPath, "utf8");
            const metadata = parseFrontmatter(source, markdownPath);

            return {
                ...metadata,
                path: markdownPath,
                slug: path.basename(markdownPath, ".md"),
            };
        }),
    );
    const fonts = await Promise.all([
        readFile(path.join(rootDirectory, "assets", "fonts", "Atkinson-Regular.ttf")),
        readFile(path.join(rootDirectory, "assets", "fonts", "Atkinson-Bold.ttf")),
        readFile(path.join(rootDirectory, "assets", "fonts", "JetBrainsMono-Medium.ttf")),
    ]);
    const satoriFonts = [
        { name: "Atkinson", data: fonts[0], weight: 400, style: "normal" },
        { name: "Atkinson", data: fonts[1], weight: 700, style: "normal" },
        { name: "JetBrains Mono", data: fonts[2], weight: 500, style: "normal" },
    ];

    await mkdir(outputDirectory, { recursive: true });
    await Promise.all([writeSitemap(posts), ...posts.map((post) => generateCard(post, satoriFonts))]);
}

await main();
