#!/usr/bin/env node
// Prose gate for src/content/guides/*.{md,mdx}, implementing the AGENTS.md
// "Hard limits" table. Frontmatter, fenced code and MDX component lines
// (`<EventLoopFigure />`) are excluded from every measurement. Blockquotes
// and list items count as prose.
//
// Usage: pnpm check:prose [filename-substring]   (VERBOSE=1 lists offenders)
//
// FAIL (exit 1): limits an author can fix by structure alone, which
// AGENTS.md permits even while guide prose is frozen:
//   - paragraph over 6 sentences or 60 words (split at a sentence boundary)
//   - `##` section over ~400 words with no `###` (add a heading)
//   - run-in bold label (promote it to a heading)
//
// WARN (reported, exit 0): limits that need reworded prose or new
// teaching content, so they are judgment calls for a content phase:
//   - sentence over 25 words
//   - fewer than 8 fenced code blocks per 1,000 prose words
//   - numbered section whose "The short version" is under 70 words
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIR = "src/content/guides";
const LIMITS = {
    sentenceWords: 25,
    paragraphWords: 60,
    paragraphSentences: 6,
    codePer1k: 8,
    sectionWordsNeedingSubheads: 400,
    shortVersionWords: 70,
};

const filter = process.argv[2] ?? "";

function stripFrontmatter(text) {
    // Also drop lines that are only an MDX component, like `<EventLoopFigure example="…" />`: they are not prose.
    return text.replace(/^---\n[\s\S]*?\n---\n/, "").replace(/^<[A-Z][^\n]*\/>[ \t]*$/gm, "");
}

function countWords(text) {
    return text.split(/\s+/).filter(Boolean).length;
}

function splitSentences(text) {
    const guarded = text
        .replace(/\b(e\.g|i\.e|vs|etc|Fig|approx)\./g, "$1<DOT>")
        .replace(/(\d)\.(\d)/g, "$1<DOT>$2");
    return guarded
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.replace(/<DOT>/g, ".").trim())
        .filter(Boolean);
}

function isProseParagraph(block) {
    return !/^\s*(#{1,6}\s|[-*+]\s|\d+\.\s|\||:{3}|<)/.test(block);
}

function unquote(block) {
    return block.replace(/^\s*>\s?/gm, "").trim();
}

function listItems(block) {
    if (!/^\s*([-*+]|\d+\.)\s/.test(block)) return [];
    return block
        .split(/\n(?=\s*(?:[-*+]|\d+\.)\s)/)
        .map((item) => item.replace(/^\s*(?:[-*+]|\d+\.)\s+/, "").trim());
}

function analyze(file) {
    const source = readFileSync(join(DIR, file), "utf8").replace(/\r\n?/g, "\n");
    const raw = stripFrontmatter(source);
    const codeBlocks = raw.match(/```[\s\S]*?```/g) ?? [];
    const prose = raw.replace(/```[\s\S]*?```/g, "");
    const words = countWords(prose);

    const blocksOfText = prose
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean);

    const paragraphs = blocksOfText
        .filter(isProseParagraph)
        .map(unquote)
        .filter(Boolean)
        .map((p) => ({ words: countWords(p), sentences: splitSentences(p).length, head: p.slice(0, 70) }));

    const maxParagraphWords = Math.max(0, ...paragraphs.map((p) => p.words));
    const maxParagraphSentences = Math.max(0, ...paragraphs.map((p) => p.sentences));

    const longParagraphs = paragraphs
        .filter((p) => p.words > LIMITS.paragraphWords || p.sentences > LIMITS.paragraphSentences)
        .sort((a, b) => b.words - a.words);

    const sentenceSources = [
        ...blocksOfText.filter(isProseParagraph).map(unquote),
        ...blocksOfText.flatMap(listItems),
    ];
    const longSentences = sentenceSources
        .flatMap(splitSentences)
        .map((s) => ({ words: countWords(s), head: s.slice(0, 70) }))
        .filter((s) => s.words > LIMITS.sentenceWords)
        .sort((a, b) => b.words - a.words);

    const blocks = [];
    let current = null;
    for (const line of prose.split("\n")) {
        const heading = /^(#{2,4}) (.*)$/.exec(line);
        if (heading) {
            if (current) blocks.push(current);
            current = { level: heading[1].length, title: heading[2], words: 0, subheads: 0 };
            for (const b of blocks) {
                if (b.open && heading[1].length > b.level) b.subheads += 1;
            }
            for (const b of blocks) b.open = b.open && heading[1].length > b.level;
            current.open = true;
        } else if (current) {
            const n = countWords(line);
            current.words += n;
            for (const b of blocks) if (b.open) b.words += n;
        }
    }
    if (current) blocks.push(current);
    const unstructured = blocks.filter(
        (b) => b.level === 2 && b.words > LIMITS.sectionWordsNeedingSubheads && b.subheads === 0,
    );

    const glossaryDefinition = /^\*\*(?:Discrete|Continuous|Fiber|Tearing|View Transitions|RSC|SSR|Hydration|Client state|Server state)\.?\*\*\s+/;
    const runIns = prose
        .split("\n")
        .filter((line) => /^\*\*[^*\n]{2,45}?\.?\*\*\s+\S/.test(line))
        .filter((line) => !glossaryDefinition.test(line))
        .map((line) => line.slice(0, 60));

    const thinShortVersions = prose
        .split(/(?=^## \d+\.)/gm)
        .map((section) => {
            const title = /^## ([^\n]+)/m.exec(section)?.[1] ?? "";
            const headingBody = /### The short version\n\n([\s\S]*?)(?=\n### )/.exec(section)?.[1];
            const runInBody = /^\*\*The short version\.\*\*\s+([^\n]+)/m.exec(section)?.[1];
            const body = (headingBody ?? runInBody ?? "").trim();
            return { title, words: countWords(body) };
        })
        .filter(({ title, words }) => /^\d+\./.test(title) && !/Reading the source/i.test(title) && words < LIMITS.shortVersionWords);

    const codePer1k = words ? (codeBlocks.length / words) * 1000 : 0;

    const failures = [];
    if (longParagraphs.length) failures.push(`${longParagraphs.length} paragraphs over ${LIMITS.paragraphSentences} sentences / ${LIMITS.paragraphWords} words`);
    if (unstructured.length) failures.push(`${unstructured.length} ## sections over ${LIMITS.sectionWordsNeedingSubheads} words without ###`);
    if (runIns.length) failures.push(`${runIns.length} run-in bold labels`);

    const warnings = [];
    if (longSentences.length) warnings.push(`${longSentences.length} sentences over ${LIMITS.sentenceWords} words`);
    if (codePer1k < LIMITS.codePer1k) warnings.push(`code density ${codePer1k.toFixed(1)}/1k (floor ${LIMITS.codePer1k})`);
    if (thinShortVersions.length) warnings.push(`${thinShortVersions.length} short versions under ${LIMITS.shortVersionWords} words`);

    return {
        file,
        words,
        codePer1k,
        maxParagraphWords,
        maxParagraphSentences,
        longSentences,
        longParagraphs,
        unstructured,
        runIns,
        thinShortVersions,
        failures,
        warnings,
    };
}

const files = readdirSync(DIR)
    .filter((f) => f.endsWith(".md") || f.endsWith(".mdx"))
    .filter((f) => f.includes(filter));

const columns = [
    ["file", 46, (r) => r.file.slice(0, 45)],
    ["words", 7, (r) => r.words],
    ["code/1k", 9, (r) => r.codePer1k.toFixed(1)],
    ["maxS", 6, (r) => r.maxParagraphSentences],
    ["maxW", 6, (r) => r.maxParagraphWords],
    [">para", 7, (r) => r.longParagraphs.length],
    [">25w", 6, (r) => r.longSentences.length],
    ["noSub", 7, (r) => r.unstructured.length],
    ["runIn", 7, (r) => r.runIns.length],
    ["short", 7, (r) => r.thinShortVersions.length],
];
const row = (cells) => cells.map((c, i) => (i === 0 ? String(c).padEnd(columns[i][1]) : String(c).padStart(columns[i][1]))).join("");

let failed = 0;
let warned = 0;
console.log(row(columns.map(([name]) => name)));
for (const file of files) {
    const r = analyze(file);
    if (r.failures.length) failed += 1;
    else if (r.warnings.length) warned += 1;
    const mark = r.failures.length ? "  FAIL" : r.warnings.length ? "  warn" : "  ok";
    console.log(row(columns.map(([, , get]) => get(r))) + mark);
    if (process.env.VERBOSE && (r.failures.length || r.warnings.length)) {
        for (const p of r.longParagraphs.slice(0, 3)) console.log(`      paragraph ${p.sentences}s/${p.words}w: ${p.head}…`);
        for (const s of r.unstructured.slice(0, 3)) console.log(`      no ###: ${s.title} (${s.words}w)`);
        for (const s of r.runIns.slice(0, 3)) console.log(`      run-in: ${s}…`);
        for (const s of r.longSentences.slice(0, 3)) console.log(`      sentence ${s.words}w: ${s.head}…`);
        for (const s of r.thinShortVersions.slice(0, 3)) console.log(`      thin short version: ${s.title} (${s.words}w)`);
    }
}

console.log(
    `\n${files.length} guides: ${failed} fail, ${warned} warn only, ${files.length - failed - warned} clean.` +
        (failed ? " Fix FAIL rows before declaring a content phase complete." : ""),
);
process.exit(failed ? 1 : 0);
