# EPIC DRC — Provincial Reporting Platform

Bilingual (French / English) web application for **monthly health program reporting** across Democratic Republic of the Congo provinces. Province teams draft and submit structured reports; national staff review, validate, and consolidate submissions.

Built for **EPIC RDC** (Expanded Program on Immunization and related health programming workflows).

## Features

- **Role-based access** — province users, technical directors, and read-only viewers (Supabase Auth + RLS)
- **Structured monthly reports** — activities, objectives, narratives, and executive summaries
- **Workflow** — draft → submitted → validated, with autosave and draft recovery
- **Dashboards** — KPI cards, 12-month submission trends, per-province status
- **Consolidation & exports** — national views; PDF / DOCX export helpers
- **Offline-friendly PWA** — service worker, manifest, and draft queue for unreliable connectivity
- **Profile & preferences** — language, job title, and account settings

## Tech stack

| Layer | Choice |
|--------|--------|
| Framework | [TanStack Start](https://tanstack.com/start) + React 19 |
| UI | Tailwind CSS 4, Radix UI, shadcn-style components |
| Backend | [Supabase](https://supabase.com) (Postgres, Auth, RLS) |
| Charts | Recharts |
| Deploy | Cloudflare Workers (Vite + Wrangler) |

## Getting started

### Prerequisites

- Node.js 20+ (or [Bun](https://bun.sh))
- A Supabase project with migrations applied

### Setup

```bash
git clone https://github.com/pascodinamic0/display-duplicate-dream.git
cd display-duplicate-dream   # rename locally to Apex_DRC if you prefer

cp .env.example .env
# Fill SUPABASE_URL, keys, and VITE_* variables from Supabase → Settings → API

bun install   # or: npm install
bun run dev   # or: npm run dev
```

Open `http://localhost:5173`. For password-reset flows, configure redirect URLs as described in [`SUPABASE_AUTH_SETUP.md`](./SUPABASE_AUTH_SETUP.md).

### Database

Apply SQL migrations under `supabase/migrations/`. Use the Supabase CLI or dashboard SQL editor. Seed provinces and demo users per your environment policy (do not commit real credentials).

### Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Local development server |
| `bun run build` | Production build |
| `bun run preview` | Preview production build |
| `bun run lint` | ESLint |
| `bun run format` | Prettier |

## Project layout

```
src/
  routes/           # TanStack file-based routes (dashboard, reports, users, …)
  components/       # UI and feature components
  lib/              # Auth, i18n, offline sync, exports
  integrations/     # Supabase client and types
supabase/
  migrations/       # Schema and RLS policies
public/             # PWA assets (manifest, service worker)
```

## Environment variables

See [`.env.example`](./.env.example). Never commit `.env` or service-role keys. Use publishable (anon) keys in the browser; keep the service role server-side only.

## License

Private / organizational use unless otherwise specified by the EPIC RDC program owners.

## Repository

GitHub: [pascodinamic0/display-duplicate-dream](https://github.com/pascodinamic0/display-duplicate-dream)

> **Tip:** On GitHub → **Settings → General**, rename the repository to `epic-drc` or `Apex_DRC` and set the description to: *Bilingual provincial health reporting platform for EPIC RDC (TanStack Start + Supabase).*
