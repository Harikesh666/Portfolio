export type ResumeProject = {
    name: string;
    highlights: readonly ResumeHighlight[];
};

export type ResumeHighlight = {
    content: string;
    resumeOnly?: boolean;
    /**
     * Phrases in `content` the resume page annotates by hand: a pencil
     * underline or a highlighter swipe. Marks go on what a backend and cloud
     * hiring reader scans for: API design, AWS and GCP delivery, PostgreSQL
     * and tenancy, performance at scale, query tuning, observability, security.
     */
    marks?: readonly ResumeMark[];
};

export type ResumeMark = Readonly<{ text: string; kind: "underline" | "marker" }>;

export type ResumeExperience = {
    company: string;
    role: string;
    dates: string;
    /** Shown on the collapsed home row so the work carries proof before expansion. */
    outcome?: string;
    /** Technologies shipped in this role, most relevant first; shown under the role on the resume. */
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
            "Node.js",
            "Bun",
            "Express",
            "PostgreSQL",
            "React",
            "TanStack Router / Query",
            "Python",
            "AWS",
            "Docker",
        ],
        projects: [
            {
                name: "Workflow Console · Agentic operations workflow platform",
                highlights: [
                    {
                        content:
                            "Designed a job-based API in Bun, TypeScript, and Express for six agentic workflows, using Server-Sent Events for live updates, Zod-validated contracts, and retained job state to support reconnection after dropped streams",
                        marks: [{ text: "job-based API in Bun, TypeScript, and Express", kind: "underline" }],
                    },
                    {
                        content:
                            "Extended the platform with HR interview scheduling, leave-policy validation, and annual-report proofreading, restricting OpenAI to narrow interpretive steps such as resume scoring and prose review while validating a 27K-row leave dataset and report figures in deterministic TypeScript",
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
                        marks: [
                            { text: "from API design through AWS Lambda release", kind: "marker" },
                            { text: "containerizing the service with Docker, publishing images to Amazon ECR", kind: "underline" },
                        ],
                    },
                    {
                        content:
                            "Migrated the entire workflow backend from AWS ECR and Lambda to GCP Cloud Run, with its credentials held in GCP Secret Manager",
                        marks: [
                            { text: "from AWS ECR and Lambda to GCP Cloud Run", kind: "marker" },
                            { text: "GCP Secret Manager", kind: "underline" },
                        ],
                    },
                ],
            },
            {
                name: "Sales Copilot · Field sales automation, HR Johnson",
                highlights: [
                    {
                        content:
                            "Built server-side pagination for a 130K+ record dataset supporting 70 client super users, keeping page payloads near 6.4 KB and response times around 190 ms",
                        marks: [{ text: "response times around 190 ms", kind: "marker" }],
                    },
                    {
                        content:
                            "Delivered 8 admin data-management pages in 3 weeks, creating reusable table, modal, and form components that reduced the implementation files required per page by ~60%",
                    },
                    {
                        content:
                            "Introduced structured logging across API endpoints and rebuilt the log export with IST-converted timestamps, then traced session records to an authentication defect affecting active users and resolved it the same day",
                        marks: [{ text: "structured logging across API endpoints", kind: "underline" }],
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
                        marks: [{ text: "database isolation across 5 client organizations", kind: "marker" }],
                    },
                    {
                        content:
                            "Identified and patched a security vulnerability that exposed deletion authorization codes in API responses, releasing the fix within hours",
                        marks: [{ text: "patched a security vulnerability", kind: "underline" }],
                    },
                    {
                        content:
                            "Replaced a static reporting template with a dynamic Admin Report engine and optimized its SQL using CTEs, eliminating manual report compilation and reducing query execution time by ~35%",
                        marks: [{ text: "optimized its SQL using CTEs", kind: "marker" }],
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
                        marks: [{ text: "Python on GCP Cloud Run", kind: "underline" }],
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
                    "Developed REST APIs with Node.js and Express for a production CRM and resolved client-reported defects across active deployments",
                marks: [{ text: "REST APIs with Node.js and Express", kind: "underline" }],
            },
        ],
    },
];
