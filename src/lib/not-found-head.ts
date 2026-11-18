import { site } from "./site";

export const notFoundTitle = `Page not found - ${site.name}`;

/** Head tags for a missing page: an honest tab title, and kept out of search results. */
export const notFoundMeta = [
    { title: notFoundTitle },
    { name: "robots", content: "noindex" },
];
