# SupportSage AI — Marketing Site

A responsive, single-page marketing site for **SupportSage AI**, built as a frontend-only
"hollow shell" that is ready for backend integration.

## Stack

- **Next.js 16** (App Router) with TypeScript
- **Tailwind CSS v4** via the PostCSS plugin
- **shadcn/ui** components (Radix + Nova preset), with `cn` for class merging
- **Lucide React** icons
- **Geist** typography
- Brand tokens: off-white canvas `#FAFAFA`, charcoal ink `#1A1A1A`, muted gray `#6B7280`,
  maroon accent `#4A1C3A`

> The scripts use the Webpack bundler (`next dev --webpack`, `next build --webpack`). The
> sandbox this was built in could not load Next's native SWC binding, so Turbopack was not
> available. On a normal machine you can switch the scripts back to the default Turbopack
> commands if preferred.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build     # production build
npm run start     # serve the production build
npm run lint      # ESLint
```

## Project structure

```
app/
  layout.tsx              Root layout, Geist fonts, metadata
  page.tsx                Single-page composition
  globals.css             Design tokens, shadcn theme, motion, mobile card guardrail
  icon.svg                Brand favicon
components/
  site/                   Navbar, Hero, Capabilities, Pipeline, Metrics,
                          Technology, FinalCta, Footer, ChatWidget
  ui/
    3d-tilt-card.tsx      Supplied 3D tilt card (used in Hero + Pipeline)
    button.tsx, card.tsx, ... (shadcn/ui)
lib/
  data.ts                 All capabilities, pipeline, metric, tech, and nav content
  mock-api.ts             handleAction() placeholder for every API-backed control
  utils.ts                shadcn class helper
```

## shadcn/ui setup

This project is already initialized (`components.json` + `/components/ui`). For a fresh
project, the current CLI command is:

```bash
npx shadcn@latest init
```

The legacy `npx shadcn-ui@latest init` package name is deprecated; `npx shadcn@latest` is
its replacement. The components used here were added with:

```bash
npx shadcn@latest add button card input textarea badge separator sheet label
```

Icons:

```bash
npm install lucide-react
```

## Backend integration points

Everything is intentionally hollow:

- `lib/mock-api.ts` — `handleAction(action)` logs
  `"API call pending backend integration"` and is wired to every CTA.
- `lib/data.ts` — replace the arrays to make capabilities, pipeline steps, metrics, and
  stack content API-driven.
- `components/site/chat-widget.tsx` — floating launcher, disabled composer, and the
  "SupportSage AI Backend connection pending." state. Connect the form submit handler
  to your streaming chat API when ready.
- `components/site/final-cta.tsx` / `components/site/navbar.tsx` — hook the "Book a Demo"
  handlers to your scheduling backend.
- `components/ui/3d-tilt-card.tsx` — supplied verbatim by the brief, including its
  Unsplash dashboard image. Update `imageUrl` or swap in a product screenshot later.

## Content and accessibility

- All sections are anchor-linked (`#features`, `#pipeline`, `#metrics`, `#technology`,
  `#book`) with sticky-header scroll offsets.
- Responsive breakpoints: 1-column mobile, 2-column tablet, 3/4/5-column desktop grids.
- The tilt card keeps its fixed desktop dimensions and receives a narrow-screen CSS
  guardrail in `globals.css` so it stays inside the viewport without editing the supplied
  component.
- Reduced-motion preferences disable entrance animation and smooth scrolling.
- Semantic landmarks, a skip link, visible focus states, and labelled controls are included.
