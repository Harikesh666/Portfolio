import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/writing/")({
    beforeLoad: ({ location }) => {
        throw redirect({
            to: "/articles",
            hash: location.hash,
            statusCode: 301,
        });
    },
});
