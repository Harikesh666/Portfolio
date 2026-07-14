# Harikesh Mishra Portfolio

A fast, server-rendered portfolio and writing site built with TanStack Start, React, TypeScript, and Tailwind CSS.

## Run locally

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3000`.

## Customize it first

Update `src/lib/site.ts` with the real name, email address, and production URL. This single file supplies the site title, social metadata, canonical URLs, JSON-LD, `robots.txt`, and sitemap values used by the app.

Replace the sample work in `src/routes/index.tsx` and edit or add posts in `src/lib/content.ts`. Each post automatically receives its own SSR route, canonical tag, Open Graph metadata, and `Article` structured data.

Before launch, replace the placeholder URLs in `public/robots.txt` and `public/sitemap.xml` with the production domain from `src/lib/site.ts`.

## Production build

```bash
npm run build
```

The Vite configuration enables TanStack Start prerendering and link crawling, so the home page and writing routes are emitted as static HTML alongside SSR support.
