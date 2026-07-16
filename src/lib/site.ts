export const site = {
    name: "Harikesh Mishra",
    handle: "@Harikesh666",
    avatar: "public/apple-touch-icon.png" as string,
    email: "mharikesh11@gmail.com",
    url: "https://www.harikesh.xyz",
    description:
        "Harikesh Mishra is a software developer who builds resilient React and backend systems, solves production problems, and writes about how modern software works.",
    socials: {
        github: "https://github.com/Harikesh666/",
        linkedin: "https://www.linkedin.com/in/harikesh-mishra/",
    },
} as const;

export const absoluteUrl = (path = "") =>
    `${site.url}${path}`.replace(/\/+$/, "") || site.url;
