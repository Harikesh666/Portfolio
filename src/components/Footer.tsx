import { site } from "../lib/site";

export default function Footer() {
    return (
        <footer className="mx-auto mt-14 w-full max-w-2xl border-t border-divider px-5 pb-8 pt-5">
            <div className="flex flex-col justify-between gap-3 text-sm sm:flex-row sm:items-center">
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
