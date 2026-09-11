import { createServerFn } from "@tanstack/react-start";
import type { MinimapItem, TocItem } from "./content-headings";
import { getPostRecord, type PostSummary } from "./content";

type Post = PostSummary & {
    html: string;
    minimap: MinimapItem[];
    toc: TocItem[];
};

const loaders = import.meta.glob<string>("../content/guides/**/*.md", {
    import: "default",
});

const tocLoaders = import.meta.glob<TocItem[]>("../content/guides/**/*.md", {
    import: "toc",
});

const minimapLoaders = import.meta.glob<MinimapItem[]>(
    "../content/guides/**/*.md",
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

        const loader = loaders[post.path];
        const tocLoader = tocLoaders[post.path];
        const minimapLoader = minimapLoaders[post.path];
        if (!loader || !tocLoader || !minimapLoader) {
            throw new Error(`Missing content loader for ${post.path}`);
        }

        const { path: _, ...metadata } = post;
        const [html, toc, minimap] = await Promise.all([
            loader(),
            tocLoader(),
            minimapLoader(),
        ]);

        return { ...metadata, html, minimap, toc };
    });
