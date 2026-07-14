import { site } from "../lib/site";

export default function Footer() {
    return (
        <footer className="mx-auto w-[calc(100%-2rem)] max-w-[520px] pb-10 pt-8 text-center sm:w-[calc(100%-3rem)]">
            <div
                className="mb-3 flex justify-center gap-1.5"
                aria-hidden="true"
            >
                <i className="size-1.5 rounded-full bg-marker-coral" />
                <i className="size-1.5 rounded-full bg-marker-amber" />
                <i className="size-1.5 rounded-full bg-marker-green" />
            </div>
            <p className="text-base! font-medium tracking-[-0.015em] text-muted sm:text-lg!">
                © {new Date().getFullYear()} {site.name}. Built with care.
            </p>
        </footer>
    );
}
