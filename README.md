# SupportSage AI — Marketing Site

A responsive, single-page marketing site for **SupportSage AI**, with a live Groq-powered
AI chat widget and backend-ready integration points for everything else.

## Stack

- **Next.js 16** (App Router) with TypeScript
- **Tailwind CSS v4** via the PostCSS plugin
- **shadcn/ui** components (Radix + Nova preset), with `cn` for class merging
- **Lucide React** icons
- **Groq** via a server-side Route Handler
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

## AI chat (Groq)

The floating chat widget is fully functional. It calls `POST /api/chat`, which keeps the
Groq key on the server and applies a mode-specific system prompt.

Create `.env.local` in the project root:

```bash
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b
```

The route defaults to `openai/gpt-oss-120b` if `GROQ_MODEL` is omitted. For production,
add both variables in your hosting provider's environment settings. Never prefix the key
with `NEXT_PUBLIC_`, and never commit `.env.local`. Add authentication or rate limiting
before exposing the chat endpoint publicly.

The widget includes:

- **Doctor** and **Business Owner** modes with separate conversation histories
- Mode-specific greetings, suggested prompts, and response behavior
- Loading, empty, error, reset, and mobile states
- Keyboard-accessible mode toggles and composer

## Project structure

```
app/
  api/chat/route.ts       Server-side Groq proxy and mode prompts
  layout.tsx              Root layout, Geist fonts, metadata
  page.tsx                Single-page composition
  globals.css             Design tokens, shadcn theme, motion, mobile card guardrail
  icon.svg                Brand favicon
components/
  site/                   Navbar, Hero, Capabilities, Pipeline, Metrics,
                          Technology, FinalCta, Footer, ChatWidget
  ui/
    3d-tilt-card.tsx      Supplied 3D tilt card (used in Hero)
    button.tsx, card.tsx, ... (shadcn/ui)
lib/
  chat-modes.ts           Chat mode labels, greetings, icons, suggestions
  data.ts                 All capabilities, pipeline, metric, tech, and nav content
  mock-api.ts             handleAction() placeholder for CTA controls
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

The chat is live; the remaining marketing controls stay intentionally hollow:

- `lib/mock-api.ts` — `handleAction(action)` logs
  `"API call pending backend integration"` and is wired to every CTA.
- `lib/data.ts` — replace the arrays to make capabilities, pipeline steps, metrics, and
  stack content API-driven.
- `app/api/chat/route.ts` — server-side Groq proxy; add streaming, persistence, or human
  handoff here when the production backend is ready.
- `lib/chat-modes.ts` — edit the mode copy, greetings, and suggested prompts.
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
