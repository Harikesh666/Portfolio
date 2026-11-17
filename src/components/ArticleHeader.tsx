import { ArrowUUpLeftIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { StaggerReveal } from "./StaggerReveal";

type ArticleHeaderProps = Readonly<{
    title: string;
    meta: string;
    /**
     * Whether the title plays its editorial entrance. The loading state
     * plays it, and the article that replaces it then shows the same
     * header still, so the entrance never runs twice.
     */
    animate: boolean;
}>;

const titleClassName =
    "text-[1.25rem] font-semibold leading-snug tracking-[-0.015em] text-foreground-strong";
const metaClassName = "mt-3 text-[13px] tabular-nums text-muted";

/** The back link, title and meta line above an article, shared by the article and its loading state. */
export function ArticleHeader({ title, meta, animate }: ArticleHeaderProps) {
    return (
        <header>
            <Link className="chip-link" to="/articles">
                <ArrowUUpLeftIcon
                    aria-hidden="true"
                    className="nudge-arrow"
                    data-direction="left"
                    size={14}
                />
                Articles
            </Link>

            {animate ? (
                <StaggerReveal className="mt-7">
                    <StaggerReveal.Headline className={titleClassName}>{title}</StaggerReveal.Headline>
                    <StaggerReveal.Item as="p" className={metaClassName}>
                        {meta}
                    </StaggerReveal.Item>
                </StaggerReveal>
            ) : (
                <div className="mt-7">
                    <h1 className={titleClassName}>{title}</h1>
                    <p className={metaClassName}>{meta}</p>
                </div>
            )}
        </header>
    );
}
