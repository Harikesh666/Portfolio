declare module "*.mdx" {
    import type { ComponentType } from "react";
    import type { MinimapItem, TocItem } from "#/lib/content-headings";

    export const frontmatter: Record<string, unknown>;
    export const toc: TocItem[];
    export const minimap: MinimapItem[];
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
