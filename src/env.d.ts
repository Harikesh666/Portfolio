declare module "*.md" {
    const html: string;

    export const frontmatter: Record<string, unknown>;
    export { html };
    export default html;
}
