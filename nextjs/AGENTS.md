# Repository Guidelines

## Project Structure & Module Organization
`src/app` hosts route groups, API handlers, and layout. Use `src/components` for UI building blocks, `src/contexts` for providers, `src/hooks` for reusable state logic, and `src/lib` for Directus, Stripe, and auth utilities. Shared types live in `src/types`; global styles in `src/styles`. Static assets stay in `public`. End-to-end scenarios reside in `testsprite_tests` alongside JSON test plans.

## Build, Test, and Development Commands
Install dependencies with `pnpm install` (match the lockfile; avoid mixing package managers). `pnpm dev` runs the Turbopack dev server; add `--openssl-legacy-provider` if targeting older OpenSSL runtimes. `pnpm build` and `pnpm start` produce and serve the optimized bundle. `pnpm lint`, `pnpm lint:fix`, and `pnpm format` enforce ESLint, Next, and Prettier rules. Regenerate Directus contracts with `pnpm generate:types` after schema edits.

## Coding Style & Naming Conventions
Write TypeScript-first components in `.tsx` using 2-space indentation and Prettier defaults. Components, contexts, and Zod schemas are PascalCase (`AdminDashboard.tsx`); hooks start with `use`; route folders stay lowercase (`admin`, `(public)`). Favor co-locating component-specific styles and tests. Tailwind utility classes should follow semantic grouping; rely on `tailwind-merge` to prevent duplicates. Keep imports sorted automatically via the Prettier sort-imports plugin.

## Testing Guidelines
Browser flows live under `testsprite_tests` as async Playwright scripts (`TC010_Stripe_Checkout_Payment_Failure_and_Cancel_Handling.py`). Execute targeted scenarios with `python testsprite_tests/TC010...py` inside an environment that has Playwright and browsers installed. Mirror the `TC###_Description.py` naming scheme when adding coverage. While unit tests are pending, smoke-test key routes locally and run `pnpm lint` before every PR.

## Commit & Pull Request Guidelines
Commits should be focused and concise; current history favors short Portuguese summaries (`Ajustes de relacionamentos e telas`). Continue that tone or supply an equivalent imperative English line, keeping scope limited per commit. Pull requests must describe the change, highlight Directus or Stripe impacts, list new environment variables, and attach screenshots or terminal output for UI or schema updates. Update `README.md` or relevant docs whenever onboarding or configuration steps shift.

## Configuration & Secrets
Store local credentials in `.env.local`; required keys include Directus URLs/tokens, Stripe secrets, and any feature flags referenced in `src/lib`. Never commit `.env*` files. When rotating secrets, validate impacted `src/app/api` handlers and regenerate Directus types if the schema changed.
