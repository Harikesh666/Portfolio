import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { getPost } from "../../lib/content";
import { site } from "../../lib/site";

export const Route = createFileRoute("/writing/$slug")({
    loader: ({ params }) => {
        const post = getPost(params.slug);
        if (!post) throw notFound();
        return post;
    },
    head: ({ loaderData }) => ({
        meta: [
            { title: `${loaderData?.title ?? "Writing"} - ${site.name}` },
            {
                name: "description",
                content: loaderData?.description ?? site.description,
            },
            { property: "og:title", content: loaderData?.title ?? "Writing" },
            {
                property: "og:description",
                content: loaderData?.description ?? site.description,
            },
            { property: "og:type", content: "article" },
        ],
        links: [
            {
                rel: "canonical",
                href: `${site.url}/writing/${loaderData?.slug ?? ""}`,
            },
        ],
        scripts: loaderData
            ? [
                  {
                      type: "application/ld+json",
                      children: JSON.stringify({
                          "@context": "https://schema.org",
                          "@type": "Article",
                          headline: loaderData.title,
                          description: loaderData.description,
                          datePublished: loaderData.publishedAt,
                          author: { "@type": "Person", name: site.name },
                          mainEntityOfPage: `${site.url}/writing/${loaderData.slug}`,
                      }),
                  },
              ]
            : [],
    }),
    component: PostPage,
});

function PostPage() {
    const post = Route.useLoaderData();
    return (
        <main className="mx-auto w-[calc(100%-2rem)] max-w-[520px] pt-10 sm:w-[calc(100%-3rem)]">
            <nav className="flex flex-wrap gap-x-2 sm:text-[11px] text-[11px] text-muted font-medium">
                <Link className="hover:text-foreground-strong" to="/">
                    {site.name}
                </Link>
                <span>/</span>
                <Link className="hover:text-foreground-strong" to="/writing">
                    Writing
                </Link>
                <span>/</span>
                <span>{post.title}</span>
            </nav>
            <article className="pt-9">
                <header>
                    <h1 className="font-serif text-[clamp(40px,6vw,56px)] leading-[0.95] tracking-[-0.052em] text-foreground-strong italic">
                        {post.title}
                    </h1>
                    <p className="mt-5 max-w-[480px] text-[16px] leading-[1.6] tracking-[-0.018em] text-muted">
                        {post.description}
                    </p>
                </header>
                <div className="mt-8 space-y-5 text-[17px] leading-[1.65] tracking-[-0.018em] text-foreground">
                    {post.body.map((paragraph, index) => (
                        <p
                            className={
                                index === 0
                                    ? "first-letter:float-left first-letter:mr-2 first-letter:mt-1 first-letter:font-serif first-letter:text-[64px] first-letter:leading-[0.68] first-letter:text-foreground-strong"
                                    : ""
                            }
                            key={paragraph}
                        >
                            {paragraph}
                        </p>
                    ))}
                </div>
            </article>
            <div className="mt-8 flex justify-between text-[14px]">
                <Link
                    className="font-semibold italic underline decoration-foreground/25 underline-offset-2 hover:text-foreground-strong"
                    to="/writing"
                >
                    ← All writing
                </Link>
                <a
                    className="font-semibold italic underline decoration-foreground/25 underline-offset-2 hover:text-foreground-strong"
                    href={`mailto:${site.email}`}
                >
                    Start a conversation ↗
                </a>
            </div>
        </main>
    );
}
