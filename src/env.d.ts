/** When the site was built (ms since epoch), set by `define` in vite.config.ts. */
declare const __BUILD_TIME__: number | undefined;

declare module "*.mdx" {
    import type { ComponentType } from "react";
    import type { TocItem } from "#/lib/content-headings";

    export const frontmatter: Record<string, unknown>;
    export const toc: TocItem[];
    const MDXContent: ComponentType<{
        components?: Record<string, ComponentType<Record<string, unknown>>>;
    }>;
    export default MDXContent;
}

declare module "virtual:github-contributions" {
    import type { ContributionCalendar } from "#/lib/github-contributions";

    const calendar: ContributionCalendar | null;
    export default calendar;
}
