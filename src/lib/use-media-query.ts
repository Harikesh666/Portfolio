import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean | null {
    const [matches, setMatches] = useState<boolean | null>(null);

    useEffect(() => {
        const mediaQuery = window.matchMedia(query);
        const updateMatch = () => setMatches(mediaQuery.matches);

        updateMatch();
        mediaQuery.addEventListener("change", updateMatch);

        return () => mediaQuery.removeEventListener("change", updateMatch);
    }, [query]);

    return matches;
}
