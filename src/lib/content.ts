export const seriesIndex = {
    "react-internals": {
        title: "React, from the inside out",
        description:
            "Ten long-form guides for building a durable mental model of React, from rendering fundamentals to Server Components. Not written by me.",
        readingTime: "8 hours",
        updatedAt: "May 2026",
    },
} as const;

export const topicIndex = {
    "execution-model": {
        title: "Execution model",
        description:
            "How JavaScript evaluates code, tracks execution, resolves declarations, and converts values.",
    },
    "scope-and-closures": {
        title: "Scope & closures",
        description:
            "Bindings, lexical scope, closure memory, and the rules that decide where values come from.",
    },
    "functions-and-composition": {
        title: "Functions & composition",
        description:
            "Callbacks, higher-order functions, and reusable ways to transform and combine behavior.",
    },
    "async-and-concurrency": {
        title: "Async & concurrency",
        description:
            "The event loop, scheduling, callbacks, timers, and how one thread coordinates many tasks.",
    },
} as const;

export type SeriesId = keyof typeof seriesIndex;
export type TopicId = keyof typeof topicIndex;

export type PostSummary = {
    slug: string;
    title: string;
    description: string;
    category: string;
    readTime: string;
    date: string;
    publishedAt: string;
    series?: SeriesId;
    topic?: TopicId;
    order?: number;
};

type PostRecord = PostSummary & {
    path: string;
};

const meta = import.meta.glob<Record<string, unknown>>(
    "../content/guides/**/*.md",
    { import: "frontmatter", eager: true },
);

function assertString(value: unknown, field: string, filename: string) {
    if (typeof value !== "string" || value.trim() === "") {
        throw new Error(`Invalid ${field} in ${filename}`);
    }

    return value;
}

function assertOrder(value: unknown, filename: string) {
    if (typeof value !== "number" || !Number.isInteger(value)) {
        throw new Error(`Invalid order in ${filename}`);
    }

    return value;
}

function isSeriesId(value: string): value is SeriesId {
    return value in seriesIndex;
}

function isTopicId(value: string): value is TopicId {
    return value in topicIndex;
}

function getSlug(path: string) {
    const filename = path.split("/").at(-1);
    if (!filename?.endsWith(".md")) {
        throw new Error(`Invalid content filename: ${path}`);
    }

    return filename.slice(0, -3);
}

function toPost(
    path: string,
    frontmatter: Record<string, unknown>,
): PostRecord {
    const filename = path.split("/").at(-1) ?? path;
    const seriesValue = frontmatter.series;
    const series =
        seriesValue === undefined
            ? undefined
            : assertString(seriesValue, "series", filename);

    if (series !== undefined && !isSeriesId(series)) {
        throw new Error(`Invalid series in ${filename}`);
    }

    const topicValue = frontmatter.topic;
    const topic =
        topicValue === undefined
            ? undefined
            : assertString(topicValue, "topic", filename);

    if (topic !== undefined && !isTopicId(topic)) {
        throw new Error(`Invalid topic in ${filename}`);
    }

    if (series === undefined && topic === undefined) {
        throw new Error(`Invalid topic in ${filename}`);
    }

    if (series !== undefined && topic !== undefined) {
        throw new Error(`Invalid topic in ${filename}`);
    }

    const order =
        frontmatter.order === undefined
            ? undefined
            : assertOrder(frontmatter.order, filename);

    if (series !== undefined && order === undefined) {
        throw new Error(`Invalid order in ${filename}`);
    }

    if (series === undefined && order !== undefined) {
        throw new Error(`Invalid order in ${filename}`);
    }

    return {
        path,
        slug: getSlug(path),
        title: assertString(frontmatter.title, "title", filename),
        description: assertString(
            frontmatter.description,
            "description",
            filename,
        ),
        category: assertString(frontmatter.category, "category", filename),
        readTime: assertString(frontmatter.readTime, "readTime", filename),
        date: assertString(frontmatter.date, "date", filename),
        publishedAt: assertString(
            frontmatter.publishedAt,
            "publishedAt",
            filename,
        ),
        series,
        topic,
        order,
    };
}

const postRecords = Object.entries(meta)
    .map(([path, frontmatter]) => toPost(path, frontmatter))
    .sort((first, second) => {
        if (first.series && second.series) {
            if (first.series === second.series) {
                return (first.order ?? 0) - (second.order ?? 0);
            }

            return String(first.series).localeCompare(String(second.series));
        }

        if (!first.series && !second.series) {
            return second.publishedAt.localeCompare(first.publishedAt);
        }

        return first.series ? -1 : 1;
    });

export const posts = postRecords.map(({ path: _, ...post }) => post);

export const featuredPosts = posts
    .filter((post) => post.series === "react-internals")
    .slice(0, 2);

export function getPostNeighbors(post: PostSummary) {
    if (!post.series || post.order === undefined) {
        return { previous: undefined, next: undefined };
    }

    const seriesPosts = posts.filter((item) => item.series === post.series);
    const index = seriesPosts.findIndex((item) => item.slug === post.slug);

    return {
        previous: index > 0 ? seriesPosts[index - 1] : undefined,
        next: index >= 0 ? seriesPosts[index + 1] : undefined,
    };
}

export function getPostRecord(slug: string) {
    return postRecords.find((post) => post.slug === slug);
}
