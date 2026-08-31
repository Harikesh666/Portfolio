import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { site } from "./site";

describe("resume PDF publishing", () => {
    it("uses a content-hashed public URL", async () => {
        expect(site.resumePdfPath).toMatch(
            /^\/Harikesh_Mishra_Resume_[a-f0-9]{8}\.pdf$/,
        );

        const publicFile = fileURLToPath(
            new URL(`../../public${site.resumePdfPath}`, import.meta.url),
        );
        const resumePdf = await readFile(publicFile);
        const hashPrefix = createHash("sha256")
            .update(resumePdf)
            .digest("hex")
            .slice(0, 8);

        expect(site.resumePdfPath).toBe(
            `/Harikesh_Mishra_Resume_${hashPrefix}.pdf`,
        );
        expect(site.resumePdfDownloadName).toBe("Harikesh_Mishra_Resume.pdf");
    });
});
