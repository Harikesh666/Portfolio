export const site = {
    name: "Harikesh Mishra",
    avatar: "/apple-touch-icon.png" as string,
    email: "mharikesh11@gmail.com",
    phone: "+91 9082146400",
    resumePdfPath: "/Harikesh_Mishra_Resume_55904f69.pdf",
    resumePdfDownloadName: "Harikesh_Mishra_Resume.pdf",
    url: "https://www.harikesh.xyz",
    /** The status line on Home and Resume. Edit this one string when it changes. */
    availability: "Open to Node.js backend roles",
    description:
        "Harikesh Mishra is a software engineer who builds resilient React and backend systems, solves production problems, and writes about how modern software works.",
    socials: {
        github: "https://github.com/Harikesh666/",
        linkedin: "https://www.linkedin.com/in/harikesh-mishra/",
    },
} as const;

export const absoluteUrl = (path = "") =>
    `${site.url}${path}`.replace(/\/+$/, "") || site.url;
