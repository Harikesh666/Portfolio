import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/writing/$slug")({
    beforeLoad: ({ location, params }) => {
        throw redirect({
            to: "/articles/$slug",
            params: { slug: params.slug },
            hash: location.hash,
            statusCode: 301,
        });
    },
});
