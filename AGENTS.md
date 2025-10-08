# Repository Guidelines

## Project Structure & Module Organization
- `directus/` contains the Docker stack and `.env`; `extensions/` and `uploads/` mount into the container volumes.
- `directus/template` captures schema seeds for the CLI starter—refresh it after each Directus migration.
- `nextjs/` hosts the App Router code in `src/app`: `(public)` serves marketing flows, `(auth)` handles user onboarding, and `admin/` powers dashboards.
- Shared UI lives in `nextjs/src/components`, and `nextjs/src/lib/directus` centralises API clients; extend these modules first.
- `testsprite_tests/` documents regression scenarios (Python + JSON) and serves as the acceptance contract for features.

## Build, Test, and Development Commands
- Initialise Directus and start services: `cd directus && cp .env.example .env && docker compose up -d`.
- Rebuild Directus when schema, extensions, or env values change with `docker compose up -d --build directus`.
- Install frontend dependencies and run local dev: `cd nextjs && pnpm install && pnpm dev`.
- Ship-ready build: `pnpm build && pnpm start` for a production preview.
- Quality gates: `pnpm lint`, `pnpm format`, and `pnpm generate:types` (requires Directus running).

## Coding Style & Naming Conventions
- Let Prettier (`pnpm format`) enforce 120-character width, single quotes, and sorted imports; do not hand-edit formatting.
- Use TypeScript throughout; React components in `PascalCase`, helpers in `camelCase`, constants and env keys in `UPPER_SNAKE_CASE`.
- Keep App Router semantics—group routes with parentheses, expose API handlers via `route.ts`, and colocate loader utilities for each segment.
- Compose UI with Tailwind utilities and Shadcn primitives; avoid bespoke class names that break the ESLint Tailwind plugin.

## Testing Guidelines
- Automated runs are pending; treat the artefacts under `testsprite_tests/` as the living test plan and update them with every feature or bugfix.
- For every PR, run `pnpm lint`, regenerate Directus types, and exercise core flows (signup, checkout, dashboard) against the seeded Directus data.

## Commit & Pull Request Guidelines
- Follow the existing Portuguese, sentence-case commit style (e.g., `Ajusta fluxo de checkout`) and focus on a single concern per commit.
- In PR descriptions, list the executed commands, affected env vars, and link any updated operational docs such as `DIRECTUS-SETUP.md`.
- Attach screenshots for UI work and call out schema or permission changes so reviewers can reseed their instances.

## Environment & Security
- Keep secrets in local env files (`nextjs/.env.local`, `directus/.env`) and exclude them from commits.
- After rotating credentials, restart Directus (`docker compose restart directus`) then rerun `pnpm generate:types`.
