import { absoluteUrl, site } from "./site";

type Representation = "html" | "markdown" | "not-acceptable";
type MediaType = (typeof representations)[number];

type MediaRange = {
    position: number;
    quality: number;
    subtype: string;
    type: string;
};

const representations = ["text/html", "text/markdown"] as const;

function parseAccept(accept: string): MediaRange[] {
    return accept.split(",").flatMap((part, position) => {
        const [mediaType = "", ...parameters] = part.trim().split(";");
        const [type = "", subtype = ""] = mediaType.toLowerCase().split("/");
        const qualityParameter = parameters.find((parameter) =>
            parameter.trim().toLowerCase().startsWith("q="),
        );
        const quality = qualityParameter
            ? Number(qualityParameter.split("=")[1])
            : 1;

        if (
            !type ||
            !subtype ||
            !Number.isFinite(quality) ||
            quality < 0 ||
            quality > 1
        ) {
            return [];
        }

        return [{ position, quality, subtype, type }];
    });
}

export function negotiateRepresentation(
    accept: string | null,
    available: readonly MediaType[] = representations,
): Representation {
    if (!accept?.trim()) {
        return available.includes("text/html") ? "html" : "not-acceptable";
    }

    const ranges = parseAccept(accept);
    const ranked = available
        .map((representation) => {
            const [type, subtype] = representation.split("/");
            const matches = ranges
                .filter(
                    (range) =>
                        (range.type === "*" || range.type === type) &&
                        (range.subtype === "*" || range.subtype === subtype),
                )
                .map((range) => ({
                    position: range.position,
                    quality: range.quality,
                    specificity:
                        Number(range.type !== "*") +
                        Number(range.subtype !== "*"),
                }))
                .sort(
                    (left, right) =>
                        right.specificity - left.specificity ||
                        left.position - right.position,
                );

            return {
                representation,
                ...(matches[0] ?? {
                    position: Number.MAX_SAFE_INTEGER,
                    quality: 0,
                    specificity: -1,
                }),
            };
        })
        .filter((candidate) => candidate.quality > 0)
        .sort(
            (left, right) =>
                right.quality - left.quality ||
                right.specificity - left.specificity ||
                left.position - right.position,
        );

    if (ranked.length === 0) return "not-acceptable";
    return ranked[0].representation === "text/markdown" ? "markdown" : "html";
}

export function mergeVary(headers: Headers, value: string) {
    const values = new Set(
        (headers.get("Vary") ?? "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
    );
    values.add(value);
    headers.set("Vary", [...values].join(", "));
}

export const homeMarkdown = `# ${site.name} — Software Developer in Mumbai

${site.description}

## What I do

I build and maintain full-stack applications, with a focus on backend systems, resilient React interfaces, production debugging, and clear technical documentation. I learned backend engineering by shipping against real deadlines, and I write practical guides to test and share what I learn.

## Work and technical focus

My recent work covers TypeScript, JavaScript, React, Node.js, PostgreSQL, Redis, Docker, AWS, and production observability. The portfolio includes concrete project outcomes, a detailed resume, and long-form guides about JavaScript execution, closures, the event loop, React internals, state, performance, data fetching, and error handling.

## Best places to continue

- [Articles](${absoluteUrl("/articles")}) — technical guides and learning paths
- [About](${absoluteUrl("/about")}) — background and working approach
- [Resume](${absoluteUrl("/resume")}) — experience, projects, and skills
- [GitHub](${site.socials.github}) — source code and public work
- [LinkedIn](${site.socials.linkedin}) — professional profile

Contact: [${site.email}](mailto:${site.email})
`;

export const notFoundMarkdown = `# 404 — Page not found

The requested path does not exist. Use these machine-readable indexes to recover:

- [Agent instructions](${absoluteUrl("/llms.txt")})
- [Sitemap](${absoluteUrl("/sitemap.xml")})
- [Articles](${absoluteUrl("/articles")})
- [Homepage](${absoluteUrl()})
`;

export const homeStructuredData = {
    "@context": "https://schema.org",
    "@graph": [
        {
            "@type": "WebSite",
            "@id": `${absoluteUrl()}#website`,
            url: absoluteUrl(),
            name: site.name,
            description: site.description,
        },
        {
            "@type": "Person",
            "@id": `${absoluteUrl()}#person`,
            name: site.name,
            description: site.description,
            url: absoluteUrl(),
            image: absoluteUrl(site.avatar),
            jobTitle: "Software Developer",
            email: `mailto:${site.email}`,
            knowsAbout: [
                "Backend engineering",
                "React",
                "Node.js",
                "TypeScript",
                "Production debugging",
            ],
            sameAs: [site.socials.github, site.socials.linkedin],
        },
    ],
} as const;
