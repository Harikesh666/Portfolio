import { site } from "../lib/site";

export default function Footer() {
    return (
        <footer className="mx-auto mt-20 w-[calc(100%-2rem)] max-w-[1120px] border-t border-divider pb-10 pt-7 sm:mt-28 sm:w-[calc(100%-3rem)]">
            <div className="flex flex-col justify-between gap-4 text-sm sm:flex-row sm:items-center">
                <p className="max-w-md text-foreground">
                    Interested in working together?{" "}
                    <a
                        className="font-semibold text-foreground-strong underline decoration-accent decoration-2 underline-offset-4"
                        href={`mailto:${site.email}`}
                    >
                        Send an email.
                    </a>
                </p>
                <p className="text-xs text-muted">
                    © {new Date().getFullYear()} {site.name}. Built for the web.
                </p>
            </div>
        </footer>
    );
}
