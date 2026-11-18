import { useSyncExternalStore } from "react";
import { BulbulScene } from "./BulbulScene";
import { MumbaiPond } from "./MumbaiPond";

const noSubscription = () => () => {};
const readScene = () => new URLSearchParams(window.location.search).get("scene");
/** The prerendered page has no query string, so the server always renders the koi pond. */
const serverScene = () => null;

/**
 * The scene above the home intro: the koi pond, or with `?scene=bulbul`
 * the bulbul on its branch. The server snapshot is always the koi pond, so
 * hydration matches the prerendered page before the preview swaps in.
 */
export function HomeScene() {
    const scene = useSyncExternalStore(noSubscription, readScene, serverScene);
    return scene === "bulbul" ? <BulbulScene /> : <MumbaiPond />;
}
