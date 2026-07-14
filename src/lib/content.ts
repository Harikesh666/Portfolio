export type Post = {
    order: number;
    slug: string;
    category: string;
    readTime: string;
    date: string;
    publishedAt: string;
    title: string;
    description: string;
    html: string;
};

export const series = {
    title: "React, from the inside out",
    description:
        "Ten long-form guides for building a durable mental model of React, from rendering fundamentals to Server Components.",
    readingTime: "8 hours",
    updatedAt: "May 2026",
} as const;

type PostSummary = Omit<Post, "html"> & {
    loadContent: () => Promise<{ default: string }>;
};

export const posts = [
    {
        order: 1,
        slug: "react-rendering-reconciliation-internals",
        category: "Foundation",
        readTime: "45 min read",
        date: "May 2026",
        publishedAt: "2026-05-01",
        title: "React Rendering and Reconciliation Internals",
        description:
            "A guided deep dive into how React turns state into UI, compares trees, and keeps updates responsive.",
        loadContent: () =>
            import("../content/guides/react-rendering-reconciliation-internals.md"),
    },
    {
        order: 2,
        slug: "react-hooks-and-effects-internals",
        category: "Foundation",
        readTime: "60 min read",
        date: "May 2026",
        publishedAt: "2026-05-01",
        title: "React Hooks and Effects",
        description:
            "A practical mental model for hooks, renders, effects, closures, and React's update queues.",
        loadContent: () =>
            import("../content/guides/react-hooks-and-effects-internals.md"),
    },
    {
        order: 3,
        slug: "react-state-management-architecture",
        category: "Architecture",
        readTime: "55 min read",
        date: "May 2026",
        publishedAt: "2026-05-01",
        title: "React State Management Architecture",
        description:
            "How to choose where state lives, avoid contradictions, and scale shared state without unnecessary complexity.",
        loadContent: () =>
            import("../content/guides/react-state-management-architecture.md"),
    },
    {
        order: 4,
        slug: "react-data-fetching-server-state",
        category: "Architecture",
        readTime: "55 min read",
        date: "May 2026",
        publishedAt: "2026-05-01",
        title: "React Data Fetching and Server State",
        description:
            "A guide to remote data as a cache: query keys, stale data, mutations, optimistic updates, and Suspense.",
        loadContent: () =>
            import("../content/guides/react-data-fetching-server-state.md"),
    },
    {
        order: 5,
        slug: "react-performance-architecture",
        category: "Architecture",
        readTime: "55 min read",
        date: "May 2026",
        publishedAt: "2026-05-01",
        title: "React Performance Architecture",
        description:
            "A measured approach to rendering cost, memoization, concurrency, virtualization, and bundle size.",
        loadContent: () =>
            import("../content/guides/react-performance-architecture.md"),
    },
    {
        order: 6,
        slug: "react-event-system-internals",
        category: "Internals",
        readTime: "45 min read",
        date: "May 2026",
        publishedAt: "2026-05-01",
        title: "React's Event System",
        description:
            "How synthetic events, delegation, propagation, portals, and event priority work in modern React.",
        loadContent: () =>
            import("../content/guides/react-event-system-internals.md"),
    },
    {
        order: 7,
        slug: "react-scheduler-and-lanes-internals",
        category: "Internals",
        readTime: "45 min read",
        date: "May 2026",
        publishedAt: "2026-05-01",
        title: "React's Scheduler and Lanes",
        description:
            "A guided tour of cooperative scheduling, update priority, lanes, and React's concurrent work loop.",
        loadContent: () =>
            import("../content/guides/react-scheduler-and-lanes-internals.md"),
    },
    {
        order: 8,
        slug: "react-error-boundaries-resilience",
        category: "Internals",
        readTime: "45 min read",
        date: "May 2026",
        publishedAt: "2026-05-01",
        title: "React Error Boundaries and Resilience",
        description:
            "What React catches, how it recovers, and how error boundaries contain failures in real applications.",
        loadContent: () =>
            import("../content/guides/react-error-boundaries-resilience.md"),
    },
    {
        order: 9,
        slug: "react-suspense-internals",
        category: "Internals",
        readTime: "45 min read",
        date: "May 2026",
        publishedAt: "2026-05-01",
        title: "React Suspense Internals",
        description:
            "How promises suspend rendering, boundaries reveal content, retries work, and transitions prevent jarring fallbacks.",
        loadContent: () =>
            import("../content/guides/react-suspense-internals.md"),
    },
    {
        order: 10,
        slug: "react-server-components-internals",
        category: "Framework",
        readTime: "30 min read",
        date: "May 2026",
        publishedAt: "2026-05-01",
        title: "React Server Components and the Server/Client Boundary",
        description:
            "A clear model of Server Components, Client Components, serialization, streaming, and framework boundaries.",
        loadContent: () =>
            import("../content/guides/react-server-components-internals.md"),
    },
] as const satisfies readonly PostSummary[];

export const featuredPosts = posts.slice(0, 2);

export function getPostNeighbors(order: number) {
    const toPreview = (post: PostSummary | undefined) => {
        if (!post) return undefined;

        const { loadContent, ...metadata } = post;
        return metadata;
    };

    return {
        previous: toPreview(posts[order - 2]),
        next: toPreview(posts[order]),
    };
}

export async function getPost(slug: string): Promise<Post | undefined> {
    const post = posts.find((item) => item.slug === slug);
    if (!post) return undefined;

    const { loadContent, ...metadata } = post;
    const { default: html } = await loadContent();
    return { ...metadata, html };
}
