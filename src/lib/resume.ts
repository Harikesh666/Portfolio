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
    projects?: readonly ResumeProject[];
    highlights?: readonly ResumeHighlight[];
};

export const resumeExperience: readonly ResumeExperience[] = [
    {
        company: "EduvanceAI",
        role: "Junior Software Developer",
        dates: "Aug 2025 – Present",
        projects: [
            {
                name: "Sales Copilot · Field sales automation, HR Johnson",
                highlights: [
                    { content: "Built 8 admin data-management pages end to end, designing reusable table, modal, and edit-form primitives that cut files-per-page by ~60% and became the module standard" },
                    { content: "Server-side pagination for a 130K+ record dataset with TanStack Table + Query — 6.4 KB / ~190ms per page request" },
                    { content: "Excel validation engine for schedule uploads with cell-level error annotations, diffing incoming data against historical records" },
                    { content: "Traced an auth-token bug logging out all active users and patched it the same day" },
                    { content: "Built a structured logging pipeline and IST logs export, replacing a legacy export that rendered values in scientific notation", resumeOnly: true },
                    { content: "Built a persona-aware Order Collection Pitch module for 5 dealer personas", resumeOnly: true },
                ],
            },
            {
                name: "Multi-tenant LMS",
                highlights: [
                    { content: "Architected database isolation across 5 client orgs: 5 PostgreSQL databases, migrated schemas, and a reusable org-header routing hook across 35+ frontend files" },
                    { content: "Caught chatbots being routed to the default DB instead of tenant DBs; root-caused and restored client data access the same day" },
                    { content: "Patched a vulnerability leaking deletion authorization codes in API responses within hours" },
                    { content: "Rebuilt the Admin Report as a dynamic engine; optimized its SQL with CTEs for ~35% faster queries — now used by leadership for training evaluation" },
                ],
            },
            {
                name: "Chatbots",
                highlights: [
                    { content: "Built the Hindi chatbot pipeline end to end with zero regressions to the English flow; rewrote 6 broken APIs and fixed a mid-conversation scoring crash" },
                    { content: "Solo-built an interview chatbot in under 2 weeks (React on Vercel, Python on GCP Cloud Run) with LLM response scoring — demoed to McKinsey stakeholders" },
                ],
            },
        ],
    },
    {
        company: "Rabs Net Solutions",
        role: "Web Developer Intern",
        dates: "Apr 2025 – Aug 2025",
        highlights: [
            { content: "Built REST APIs with Node.js/Express for a production CRM and resolved client-reported bugs across active deployments" },
        ],
    },
];
