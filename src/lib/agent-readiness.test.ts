import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";
import {
    homeMarkdown,
    homeStructuredData,
    mergeVary,
    negotiateRepresentation,
    notFoundMarkdown,
} from "./agent-readiness";
import { contactText, privacyText } from "./trust-pages";

describe("agent content negotiation", () => {
    test.each([
        [null, "html"],
        ["*/*", "html"],
        ["text/markdown", "markdown"],
        ["text/markdown, text/html;q=0.8", "markdown"],
        ["text/markdown;q=0.5, text/html;q=0.9", "html"],
        ["text/markdown;q=0, text/html", "html"],
        ["application/pdf", "not-acceptable"],
        ["text/html;q=0, text/markdown;q=0", "not-acceptable"],
    ])("selects %s as %s", (accept, expected) => {
        expect(negotiateRepresentation(accept)).toBe(expected);
    });

    test("rejects Markdown-only requests when only HTML is available", () => {
        expect(
            negotiateRepresentation("text/markdown", ["text/html"]),
        ).toBe("not-acceptable");
        expect(
            negotiateRepresentation("text/markdown, text/html;q=0.5", [
                "text/html",
            ]),
        ).toBe("html");
    });

    test("merges Accept into an existing Vary header", () => {
        const headers = new Headers({ Vary: "Accept-Encoding" });
        mergeVary(headers, "Accept");
        mergeVary(headers, "Accept");
        expect(headers.get("Vary")).toBe("Accept-Encoding, Accept");
    });
});

describe("agent-readable content", () => {
    test("publishes useful homepage and 404 Markdown", () => {
        expect(homeMarkdown).toMatch(/^# Harikesh Mishra/m);
        expect(homeMarkdown.length).toBeGreaterThan(500);
        expect(notFoundMarkdown).toContain("/llms.txt");
        expect(notFoundMarkdown).toContain("/sitemap.xml");
    });

    test("publishes complete Person structured data", () => {
        const person = homeStructuredData["@graph"].find(
            (entry) => entry["@type"] === "Person",
        );
        expect(person).toMatchObject({
            "@type": "Person",
            name: "Harikesh Mishra",
            description: expect.any(String),
            url: "https://www.harikesh.xyz",
            jobTitle: "Software Engineer",
            address: {
                "@type": "PostalAddress",
                addressLocality: "Mumbai",
                addressCountry: "IN",
            },
            contactPoint: {
                "@type": "ContactPoint",
                email: "mharikesh11@gmail.com",
                url: "https://www.harikesh.xyz/contact",
            },
        });
    });

    test("llms.txt explains when and how agents should use the site", async () => {
        const instructions = await readFile("public/llms.txt", "utf8");
        expect(instructions).toContain("## When to use this site");
        expect(instructions).toContain("## How agents should use it");
        expect(instructions).toContain("Accept: text/markdown");
        expect(instructions).toContain("/sitemap.xml");
        expect(instructions).toContain("/contact");
        expect(instructions).toContain("/privacy");
    });

    test("publishes substantial contact and privacy disclosures", async () => {
        expect(contactText.join(" ").length).toBeGreaterThan(500);
        expect(privacyText.join(" ").length).toBeGreaterThan(500);

        const sitemap = await readFile("public/sitemap.xml", "utf8");
        expect(sitemap).toContain("https://www.harikesh.xyz/about");
        expect(sitemap).toContain("https://www.harikesh.xyz/contact");
        expect(sitemap).toContain("https://www.harikesh.xyz/privacy");
    });
});
