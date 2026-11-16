declare module "*.md" {
    const html: string;

    export const frontmatter: Record<string, unknown>;
    export { html };
    export default html;
}

declare module "virtual:github-contributions" {
    import type { ContributionCalendar } from "#/lib/github-contributions";

    const calendar: ContributionCalendar | null;
    export default calendar;
}
