import { closeSync, openSync, readSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { defineHastPlugin, type HastNode } from "satteri";

type Element = Extract<HastNode, { type: "element" }>;

function soleElement(node: Element) {
    const children = node.children.filter(
        (child) => child.type !== "text" || child.value.trim() !== "",
    );
    return children.length === 1 && children[0].type === "element"
        ? children[0]
        : undefined;
}

function isWithin(directory: string, filename: string) {
    const path = relative(directory, filename);
    return path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path);
}

function pngDimensions(source: string, publicDirectory: string) {
    if (!source.startsWith("/") || source.startsWith("//")) return;

    let descriptor: number | undefined;
    try {
        const pathname = decodeURIComponent(source.split(/[?#]/, 1)[0]);
        if (!pathname.endsWith(".png")) return;

        const directory = realpathSync(publicDirectory);
        const filename = resolve(directory, `.${pathname}`);
        if (!isWithin(directory, filename)) return;
        const canonicalFilename = realpathSync(filename);
        if (!isWithin(directory, canonicalFilename)) return;

        descriptor = openSync(canonicalFilename, "r");
        const header = Buffer.alloc(24);
        if (readSync(descriptor, header, 0, header.length, 0) !== 24) return;
        if (
            !header.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")) ||
            header.readUInt32BE(8) !== 13 ||
            header.toString("ascii", 12, 16) !== "IHDR"
        ) return;

        const width = header.readUInt32BE(16);
        const height = header.readUInt32BE(20);
        if (width > 0 && height > 0) return { width, height };
    } catch {
        return;
    } finally {
        if (descriptor !== undefined) closeSync(descriptor);
    }
}

export function createGuideFigures(publicDirectory = resolve("public")) {
    return defineHastPlugin({
        name: "guide-figures",
        element: {
            filter: ["p"],
            visit(node, context) {
                const content = soleElement(node);
                if (!content) return;
                const image = content.tagName === "a" ? soleElement(content) : content;
                if (image?.tagName !== "img") return;

                const properties = { ...image.properties };
                const caption = typeof properties.title === "string"
                    ? properties.title.trim()
                    : "";
                if (caption) delete properties.title;

                if (
                    typeof properties.src === "string" &&
                    properties.width === undefined &&
                    properties.height === undefined
                ) {
                    Object.assign(properties, pngDimensions(properties.src, publicDirectory));
                }

                const figureImage: Element = { ...image, properties };
                const figureContent: Element = content === image
                    ? figureImage
                    : { ...content, children: [figureImage] };
                const figure: Element = {
                    ...node,
                    tagName: "figure",
                    properties: { ...node.properties, className: ["guide-figure"] },
                    children: [figureContent],
                };
                if (caption) {
                    figure.children.push({
                        type: "element",
                        tagName: "figcaption",
                        properties: {},
                        children: [{ type: "text", value: caption }],
                    });
                }
                context.replaceNode(node, figure);
            },
        },
    });
}

export const guideFigures = createGuideFigures();
