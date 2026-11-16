import { createServerFn } from "@tanstack/react-start";
import type { MinimapItem, TocItem } from "./content-headings";
import { getPostRecord, type PostSummary } from "./content";

type Post = PostSummary & {
    html: string;
    minimap: MinimapItem[];
    toc: TocItem[];
};

const tocLoaders = import.meta.glob<TocItem[]>(
    "../content/guides/**/*.mdx",
    { import: "toc" },
);

const minimapLoaders = import.meta.glob<MinimapItem[]>(
    "../content/guides/**/*.mdx",
    { import: "minimap" },
);

export const getPost = createServerFn({ method: "GET" })
    .validator((data: { slug: string }) => {
        if (typeof data.slug !== "string" || data.slug.length === 0) {
            throw new Error("A post slug is required");
        }

        return data;
    })
    .handler(async ({ data }): Promise<Post | undefined> => {
        const post = getPostRecord(data.slug);
        if (!post) return undefined;

        const tocLoader = tocLoaders[post.path];
        const minimapLoader = minimapLoaders[post.path];
        if (!tocLoader || !minimapLoader) {
            throw new Error(`Missing content loader for ${post.path}`);
        }

        // Server-only: the MDX guide renders to static HTML with island
        // markers, so the browser receives a string as it always has.
        const { renderGuideHtml } = await import("./guide-render.server");
        const { path: _, ...metadata } = post;
        const [html, toc, minimap] = await Promise.all([
            renderGuideHtml(post.path),
            tocLoader(),
            minimapLoader(),
        ]);

        return { ...metadata, html, minimap, toc };
    });
