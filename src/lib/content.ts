export type Post = {
    slug: string;
    category: string;
    readTime: string;
    date: string;
    publishedAt: string;
    title: string;
    description: string;
    body: readonly string[];
};

export const posts = [
    {
        slug: "the-case-for-a-little-friction",
        category: "Design thinking",
        readTime: "4 min read",
        date: "May 16, 2026",
        publishedAt: "2026-05-16",
        title: "The case for a little friction",
        description:
            "Why the most memorable brands do not always make everything effortless.",
        body: [
            "A good experience removes the friction that gets in the way of someone doing what they came to do. A great one leaves a little of the useful kind behind: a beat, a surprise, a reason to look twice.",
            "That moment is not a usability failure. It is proof that a real person made a choice. In a landscape of interchangeable flows, it is often the only thing that stays with us.",
            "The trick is knowing where to place it. Never in the checkout. Never in the form. Put it in the voice, the composition, the tiny reward for paying attention.",
        ],
    },
    {
        slug: "a-website-is-not-a-pdf",
        category: "Web craft",
        readTime: "5 min read",
        date: "March 02, 2026",
        publishedAt: "2026-03-02",
        title: "A website is not a PDF with hover states",
        description:
            "The web has its own material properties. Designing for it starts there.",
        body: [
            "The web moves. It remembers. It changes shape in your hand. Yet many websites begin as a static layout that is slowly taught to behave.",
            "I prefer to start with the things only a website can do: reveal, respond, rearrange, invite. The result is less like a brochure and more like a place.",
            "This does not mean adding movement everywhere. It means treating motion, rhythm, and interaction as first-class ingredients from the first sketch.",
        ],
    },
    {
        slug: "making-room-for-taste",
        category: "Practice",
        readTime: "3 min read",
        date: "January 24, 2026",
        publishedAt: "2026-01-24",
        title: "Making room for taste",
        description:
            "Taste is not decoration at the end of a project. It is a way of making decisions.",
        body: [
            "Taste gets mistaken for a finishing touch, something you sprinkle over a project once the important work is done. I see it as a method for finding what matters.",
            "It means choosing fewer things with more intention. It means noticing when a beautiful idea is not the right one. It means caring about the last ten percent.",
            "A point of view cannot be automated, templated, or rushed into a moodboard. It is built through attention, iteration, and the courage to leave some things out.",
        ],
    },
] as const satisfies readonly Post[];

export const featuredPosts = posts.slice(0, 2);

export function getPost(slug: string) {
    return posts.find((post) => post.slug === slug);
}
