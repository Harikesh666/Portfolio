import type { ComponentType } from "react";
import { renderToStaticMarkup, renderToString } from "react-dom/server";
import {
    islandNameAttribute,
    islandPropsAttribute,
    islands,
    type IslandName,
    type IslandProps,
} from "../content/islands";

type MdxModule = {
    default: ComponentType<{
        components?: Record<string, ComponentType<IslandProps>>;
    }>;
};

type IslandInstance = { name: IslandName; props: IslandProps };

const guideModules = import.meta.glob<MdxModule>(
    "../content/guides/**/*.mdx",
);

/** Guides are immutable per deploy, so each one renders at most once. */
const renderedGuides = new Map<string, Promise<string>>();

const markerPattern = /<div data-island-index="(\d+)"><\/div>/g;

function escapeAttribute(value: string) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function toIslandProps(name: string, props: IslandProps): IslandProps {
    if ("children" in props && props.children !== undefined) {
        throw new Error(`Island <${name}> cannot take children`);
    }
    const serialized = JSON.stringify(props);
    const roundTripped = JSON.parse(serialized) as IslandProps;
    if (JSON.stringify(roundTripped) !== serialized) {
        throw new Error(`Island <${name}> props must be plain JSON data`);
    }
    return roundTripped;
}

async function renderGuide(path: string) {
    const load = guideModules[path];
    if (!load) throw new Error(`Missing MDX guide for ${path}`);
    const { default: Guide } = await load();

    // First pass: render the prose to static HTML, leaving an empty,
    // indexed marker wherever the guide places an island.
    const instances: IslandInstance[] = [];
    const components = Object.fromEntries(
        (Object.keys(islands) as IslandName[]).map((name) => [
            name,
            (props: IslandProps) => {
                const index =
                    instances.push({ name, props: toIslandProps(name, props) }) -
                    1;
                return <div data-island-index={index} />;
            },
        ]),
    );
    const markup = renderToStaticMarkup(<Guide components={components} />);

    // Second pass: fill each marker with hydratable island HTML and the
    // props the browser needs to hydrate it.
    const islandHtml = await Promise.all(
        instances.map(async ({ name, props }) => {
            const Island = await islands[name]();
            return renderToString(<Island {...props} />);
        }),
    );

    return markup.replace(markerPattern, (_, rawIndex: string) => {
        const index = Number(rawIndex);
        const { name, props } = instances[index];
        return `<div ${islandNameAttribute}="${name}" ${islandPropsAttribute}="${escapeAttribute(JSON.stringify(props))}">${islandHtml[index]}</div>`;
    });
}

/** Renders an MDX guide to the HTML string the article page injects. */
export function renderGuideHtml(path: string) {
    let rendered = renderedGuides.get(path);
    if (!rendered) {
        rendered = renderGuide(path);
        renderedGuides.set(path, rendered);
        rendered.catch(() => renderedGuides.delete(path));
    }
    return rendered;
}
