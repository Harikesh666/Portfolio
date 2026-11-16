type SectionHeadingProps = Readonly<{
    children: React.ReactNode;
    id?: string;
    as?: "h2" | "h3";
}>;

/** Sentence-case section label: body size, set apart by weight and color. */
export function SectionHeading({ as = "h2", children, id }: SectionHeadingProps) {
    const Heading = as;

    return (
        <Heading
            className="scroll-mt-8 font-medium text-foreground-strong"
            id={id}
        >
            {children}
        </Heading>
    );
}
