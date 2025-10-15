# Repository Guidelines

## Project Structure & Module Organization
- `directus/` hosts the Docker stack and configuration (`.env`, compose files); `extensions/` and `uploads/` mount directly into the Directus container. Refresh `directus/template` after every schema migration to keep CLI seeds current.
- `nextjs/` is the App Router frontend. Marketing lives under `src/app/(public)`, auth flows under `src/app/(auth)`, and dashboards inside `src/app/admin`. Shared UI sits in `src/components`; API helpers centralize in `src/lib/directus`; reusable state goes in `src/hooks`; contexts and types live in `src/contexts` and `src/types`.
- Acceptance scenarios reside in `testsprite_tests/` (Python + JSON). Update or add cases whenever features change.

## Build, Test, and Development Commands
- `cd directus && cp .env.example .env && docker compose up -d` bootstraps Directus locally. Rebuild with `docker compose up -d --build directus` after schema or extension tweaks.
- `cd nextjs && pnpm install && pnpm dev` starts the frontend (Turbopack). Use `pnpm build && pnpm start` for a production-like preview.
- Quality gates: `pnpm lint`, `pnpm format`, and `pnpm generate:types` (Directus must be running). Run `python testsprite_tests/TC###_*.py` for targeted acceptance scenarios.

## Coding Style & Naming Conventions
- TypeScript-first with Prettier enforcing 2-space indentation, 120-character lines, single quotes, and auto-sorted imports. Do not hand-edit formatting—run `pnpm format`.
- Components and contexts use PascalCase (`AdminDashboard.tsx`), hooks start with `use`, helpers stay camelCase, and constants/env keys are UPPER_SNAKE_CASE.
- Compose UI with Tailwind utilities and Shadcn primitives; avoid ad-hoc class names that violate ESLint Tailwind rules.

## Testing Guidelines
- Acceptance coverage centers on Playwright-driven scripts under `testsprite_tests/`. Mirror the `TC###_Description.py` pattern and keep JSON metadata aligned.
- Smoke-test signup, checkout, and dashboard flows against seeded Directus data before shipping. Note gaps if automated coverage is missing.

## Commit & Pull Request Guidelines
- Follow the concise Portuguese sentence-case convention observed in history (e.g., `Ajusta fluxo de checkout`). Scope each commit to a single concern.
- PRs must list executed commands, highlight schema/env impacts, link updated docs (e.g., `DIRECTUS-SETUP.md`), and attach screenshots for UI changes. Call out Directus permission updates so reviewers can reseed.
