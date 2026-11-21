// Proves guide annotations only wrap existing prose: strips <Mark> and
// <MarginNote> tags (and the blank lines a note adds around its passage)
// and compares the result with the same guide on a base git ref.
// usage: node scripts/check-annotations-preserve-prose.mjs [baseRef=main] [file...]
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";

const [base = "main", ...only] = process.argv.slice(2);
const directory = "src/content/guides";
const files = only.length ? only : readdirSync(directory).filter((file) => file.endsWith(".mdx")).map((file) => `${directory}/${file}`);

const strip = (text) =>
    text
        .replace(/\r\n/g, "\n")
        .replace(/<MarginNote note="[^"]*">\n\n([\s\S]*?)\n\n<\/MarginNote>/g, "$1")
        .replace(/<Mark kind="(?:circle|marker|underline)"(?: wraps)?>([\s\S]*?)<\/Mark>/g, "$1");

let failed = 0;
for (const file of files) {
    let original;
    try {
        original = execFileSync("git", ["show", `${base}:${file}`], { encoding: "utf8" }).replace(/\r\n/g, "\n");
    } catch {
        continue; // a new guide has nothing to compare against
    }
    const current = strip(readFileSync(file, "utf8"));
    if (current === original.replace(/<MarginNote note="[^"]*">\n\n([\s\S]*?)\n\n<\/MarginNote>/g, "$1").replace(/<Mark kind="(?:circle|marker|underline)"(?: wraps)?>([\s\S]*?)<\/Mark>/g, "$1")) continue;
    failed++;
    const a = original.split("\n");
    const b = current.split("\n");
    const at = a.findIndex((line, index) => line !== b[index]);
    console.log(`${file}: prose changed at line ${at + 1}\n  was: ${JSON.stringify(a[at])}\n  now: ${JSON.stringify(b[at])}`);
}
console.log(failed ? `${failed} guide(s) changed prose` : `prose preserved in ${files.length} guide(s)`);
process.exit(failed ? 1 : 0);
