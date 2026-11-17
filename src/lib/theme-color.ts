/** The browser chrome colour for each theme: the page surface at the very top of the screen. */
export const themeColors = { light: "#fdfdfd", dark: "#0a0a0a" } as const;

/**
 * Points both theme-color tags at the chosen theme, so the status bar
 * follows the site's own toggle, not only the phone's light/dark setting.
 */
export function syncThemeColor(theme: keyof typeof themeColors) {
    for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
        meta.content = themeColors[theme];
    }
}
