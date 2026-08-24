import { useEffect, useState } from "react";

export const useMediaQuery = (query) => {
    const [matches, setMatches] = useState(() =>
        window.matchMedia(query).matches
    );

    useEffect(() => {
        const mediaQuery = window.matchMedia(query);
        const handleChange = (event) => setMatches(event.matches);
        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, [query]);

    return matches;
};
