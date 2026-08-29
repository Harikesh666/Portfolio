import { createMiddleware, createStart } from "@tanstack/react-start";
import { posts } from "./lib/content";
import {
    homeMarkdown,
    mergeVary,
    negotiateRepresentation,
    notFoundMarkdown,
} from "./lib/agent-readiness";

const pagePaths = new Set([
    "/",
    "/about",
    "/articles",
    "/articles/",
    "/contact",
    "/privacy",
    "/resume",
    "/writing",
    "/writing/",
    ...posts.flatMap((post) => [
        `/articles/${post.slug}`,
        `/writing/${post.slug}`,
    ]),
]);

const agentContentMiddleware = createMiddleware().server(
    async ({ next, request }) => {
        const pathname = new URL(request.url).pathname;
        const accept = request.headers.get("Accept");
        const isHomepage = pathname === "/";
        const isKnownPage = pagePaths.has(pathname);

        if (isHomepage) {
            const representation = negotiateRepresentation(accept);
            if (representation === "markdown") {
                return markdownResponse(request, homeMarkdown, 200);
            }
            if (representation === "not-acceptable") {
                return notAcceptableResponse();
            }
        } else if (!isKnownPage && accept?.includes("text/markdown")) {
            const representation = negotiateRepresentation(accept);
            if (representation === "markdown") {
                return markdownResponse(request, notFoundMarkdown, 404);
            }
        } else if (isKnownPage && accept?.includes("text/markdown")) {
            const representation = negotiateRepresentation(accept, ["text/html"]);
            if (representation === "not-acceptable") {
                return notAcceptableResponse();
            }
            request.headers.set("Accept", "text/html");
        }

        const result = await next();
        const response = result.response;
        const negotiatesNotFound = response.status === 404;

        if (!isHomepage && !negotiatesNotFound) return result;

        const headers = new Headers(response.headers);
        mergeVary(headers, "Accept");
        mergeVary(headers, "Accept-Encoding");

        return new Response(request.method === "HEAD" ? null : response.body, {
            headers,
            status: response.status,
            statusText: response.statusText,
        });
    },
);

function markdownResponse(request: Request, body: string, status: number) {
    return new Response(request.method === "HEAD" ? null : body, {
        headers: {
            "Content-Type": "text/markdown; charset=utf-8",
            Vary: "Accept, Accept-Encoding",
        },
        status,
    });
}

function notAcceptableResponse() {
    return new Response(null, {
        headers: { Vary: "Accept, Accept-Encoding" },
        status: 406,
    });
}

export const startInstance = createStart(() => ({
    requestMiddleware: [agentContentMiddleware],
}));
