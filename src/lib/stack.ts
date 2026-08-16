// Icons are applied as CSS masks tinted with the brand color, so a single
// SVG works in both themes without needing a light and dark variant.
export type StackItem = Readonly<{
    name: string;
    color?: string;
    icon?: string;
}>;

export type StackGroup = Readonly<{
    label: string;
    items: ReadonlyArray<StackItem>;
}>;

export const stackGroups: ReadonlyArray<StackGroup> = [
    {
        label: "Languages",
        items: [
            {
                name: "TypeScript",
                color: "#3178C6",
                icon: "/icons/skills/typescript.svg",
            },
            {
                name: "JavaScript",
                color: "#F7DF1E",
                icon: "/icons/skills/javascript.svg",
            },
            {
                name: "Python",
                color: "#3776AB",
                icon: "/icons/skills/python.svg",
            },
        ],
    },
    {
        label: "Backend",
        items: [
            {
                name: "Node.js",
                color: "#5FA04E",
                icon: "/icons/skills/nodedotjs.svg",
            },
            {
                name: "Express",
                color: "currentColor",
                icon: "/icons/skills/express.svg",
            },
            { name: "Bun", color: "#E76F00", icon: "/icons/skills/bun.svg" },
            {
                name: "FastAPI",
                color: "#009688",
                icon: "/icons/skills/fastapi.svg",
            },
        ],
    },
    {
        label: "Frontend",
        items: [
            {
                name: "React",
                color: "#61DAFB",
                icon: "/icons/skills/react.svg",
            },
            {
                name: "TanStack",
                color: "#FF4154",
                icon: "/icons/skills/tanstack-black.svg",
            },
            {
                name: "Tailwind CSS",
                color: "#06B6D4",
                icon: "/icons/skills/tailwindcss.svg",
            },
        ],
    },
    {
        label: "Data and cloud",
        items: [
            {
                name: "PostgreSQL",
                color: "#4169E1",
                icon: "/icons/skills/postgresql.svg",
            },
            {
                name: "AWS",
                color: "#FF9900",
                icon: "/icons/skills/amazonaws.svg",
            },
        ],
    },
];
