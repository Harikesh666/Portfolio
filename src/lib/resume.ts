export type ResumeProject = {
    name: string;
    highlights: readonly ResumeHighlight[];
};

export type ResumeHighlight = {
    content: string;
    resumeOnly?: boolean;
};

export type ResumeExperience = {
    company: string;
    role: string;
    dates: string;
    /** Shown on the collapsed home row so the work carries proof before expansion. */
    outcome?: string;
    /** Technologies shipped in this role, shown as text tags on the collapsed row. */
    stack?: readonly string[];
    projects?: readonly ResumeProject[];
    highlights?: readonly ResumeHighlight[];
};

export const resumeExperience: readonly ResumeExperience[] = [
    {
        company: "EduvanceAI",
        role: "Junior Software Developer",
        dates: "Aug 2025 to Present",
        outcome:
            "Server-side pagination over a 130K+ record dataset, database isolation for 5 client organizations, and a streaming workflow API.",
        stack: [
            "TypeScript",
            "React",
            "TanStack Router / Query",
            "Bun",
            "Express",
            "Python",
            "PostgreSQL",
            "AWS",
            "Docker",
        ],
        projects: [
            {
                name: "Workflow Console · Agentic operations workflow platform",
                highlights: [
                    {
                        content:
                            "Designed a job-based API in Bun, TypeScript, and Express for three multi-step workflows, using Server-Sent Events for live updates, Zod-validated contracts, and retained job state to support reconnection after dropped streams",
                    },
                    {
                        content:
                            "Automated the procurement pipeline from requirement matching and vendor selection through purchase-order generation, producing PDFs in memory, dispatching them over SMTP, and mapping deliveries to GRN follow-up records",
                        resumeOnly: true,
                    },
                    {
                        content:
                            "Built the React console with live progress streaming, shareable workflow URLs, and validated forms using TanStack Router and React Hook Form, then added automated tests with Vitest and Mock Service Worker",
                        resumeOnly: true,
                    },
                    {
                        content:
                            "Owned development and deployment from API design through AWS Lambda release, containerizing the service with Docker, publishing images to Amazon ECR, and deploying the console on Vercel",
                        resumeOnly: true,
                    },
                ],
            },
            {
                name: "Sales Copilot · Field sales automation, HR Johnson",
                highlights: [
                    {
                        content:
                            "Built server-side pagination for a 130K+ record dataset supporting 70 client super users, keeping page payloads near 6.4 KB and response times around 190 ms",
                    },
                    {
                        content:
                            "Delivered 8 admin data-management pages in 3 weeks, creating reusable table, modal, and form components that reduced the implementation files required per page by ~60%",
                    },
                    {
                        content:
                            "Introduced structured logging across API endpoints and rebuilt the log export with IST-converted timestamps, then traced session records to an authentication defect affecting active users and resolved it the same day",
                    },
                    {
                        content:
                            "Developed an Excel validation engine for schedule uploads that compares incoming data against existing records and flags unintended edits to historical entries with cell-level error annotations",
                    },
                    {
                        content:
                            "Implemented a persona-aware Order Collection Pitch module in React for 5 dealer personas, integrating recommendation APIs with client-side caching and responsive multi-tab product journeys",
                    },
                ],
            },
            {
                name: "Multi-tenant learning management system",
                highlights: [
                    {
                        content:
                            "Designed database isolation across 5 client organizations, provisioning separate PostgreSQL databases, migrating schemas, and introducing a reusable organization-routing hook across 35+ frontend files",
                    },
                    {
                        content:
                            "Diagnosed a tenant-routing defect that sent new chatbots to the default database and restored the affected organization's data access the same day",
                    },
                    {
                        content:
                            "Identified and patched a security vulnerability that exposed deletion authorization codes in API responses, releasing the fix within hours",
                    },
                    {
                        content:
                            "Replaced a static reporting template with a dynamic Admin Report engine and optimized its SQL using CTEs, eliminating manual report compilation and reducing query execution time by ~35%",
                    },
                    {
                        content:
                            "Developed the Hindi chatbot pipeline while preserving the existing English flow, rewriting 6 affected APIs and fixing a scoring defect that crashed conversations",
                        resumeOnly: true,
                    },
                    {
                        content:
                            "Independently built and deployed a Project Engineer Interview Chatbot in under 2 weeks (React on Vercel, Python on GCP Cloud Run), implementing LLM-based response scoring and single-attempt enforcement before demonstrating it to McKinsey stakeholders",
                        resumeOnly: true,
                    },
                ],
            },
        ],
    },
    {
        company: "Rabs Net Solutions Pvt Ltd",
        role: "Web Developer Intern",
        dates: "Apr 2025 to Aug 2025",
        outcome: "REST APIs and bug fixes on a production CRM.",
        stack: ["Node.js", "Express", "JavaScript"],
        highlights: [
            {
                content:
                    "Built REST APIs with Node.js/Express for a production CRM and resolved client-reported bugs across active deployments",
            },
        ],
    },
];
