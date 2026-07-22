import {
    createContext,
    useContext,
    useState,
    type ReactNode,
    type RefObject,
} from "react";
import type { TocItem } from "../lib/content-headings";

export type FloatingTocProps = Readonly<{
    containerRef: RefObject<HTMLElement | null>;
    items: TocItem[];
    onNavigate: (id: string) => void;
    slug: string;
}>;

export type TocRegistration = FloatingTocProps & {
    instanceId: number;
    routeId: string;
    token: symbol;
};

type RegisterToc = (
    toc: Omit<TocRegistration, "instanceId" | "token">,
) => () => void;

const FloatingTocContext = createContext<RegisterToc | null>(null);
const FloatingTocRegistrationContext =
    createContext<TocRegistration | null>(null);
let nextTocRegistrationId = 0;

function getNextTocRegistrationId() {
    nextTocRegistrationId += 1;
    return nextTocRegistrationId;
}

export function FloatingTocProvider({
    children,
}: Readonly<{ children: ReactNode }>) {
    const [registration, setRegistration] =
        useState<TocRegistration | null>(null);
    const registerToc: RegisterToc = (toc) => {
        const registration = {
            ...toc,
            instanceId: getNextTocRegistrationId(),
            token: Symbol(),
        };
        setRegistration(registration);

        return () =>
            setRegistration((current) =>
                current?.token === registration.token ? null : current,
            );
    };

    return (
        <FloatingTocContext value={registerToc}>
            <FloatingTocRegistrationContext value={registration}>
                {children}
            </FloatingTocRegistrationContext>
        </FloatingTocContext>
    );
}

export function useTocRegistration() {
    const registerToc = useContext(FloatingTocContext);

    if (!registerToc) {
        throw new Error("FloatingToc must be rendered inside FloatingTocProvider");
    }

    return registerToc;
}

export function useTocRegistrationValue() {
    return useContext(FloatingTocRegistrationContext);
}

export function useHasFloatingTocRegistration() {
    return useTocRegistrationValue() !== null;
}
