# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Directus CMS starter template repository containing multiple frontend framework implementations (Next.js, Nuxt, Astro, Svelte) that integrate with a Directus headless CMS backend. The primary implementation is the Next.js template located in `./nextjs/`.

## Architecture

### Monorepo Structure
- `./directus/` - Self-hosted Directus CMS instance (Docker-based)
- `./nextjs/` - Next.js 15 App Router frontend implementation
- `./nuxt/`, `./astro/`, `./sveltekit/` - Other framework implementations

### Next.js Architecture

**Block-Based Page Builder System:**
- Pages are composed dynamically from reusable content blocks stored in Directus
- `PageBuilder` component (src/components/layout/PageBuilder.tsx) orchestrates block rendering
- `BaseBlock` component (src/components/blocks/BaseBlock.tsx) maps Directus collection names to React components
- Available blocks: `block_hero`, `block_richtext`, `block_gallery`, `block_pricing`, `block_posts`, `block_form`

**Directus Integration Layer:**
- `src/lib/directus/directus.ts` - Directus SDK client with rate-limiting queue (p-queue) and 429 retry logic
- `src/lib/directus/fetchers.ts` - Data fetching functions with deep relational queries
- `src/types/directus-schema.ts` - Generated TypeScript types from Directus schema

**Key Data Patterns:**
- `fetchPageData()` - Fetches pages by permalink with nested blocks and dynamic blog post injection
- `fetchSiteData()` - Fetches global site data, header/footer navigation
- `fetchPostBySlug()` - Fetches blog posts with draft/preview support using token authentication
- All fetchers use Directus SDK's deep field selection to fetch nested relational data in a single request

**Forms System:**
- Dynamic forms generated from Directus schema (`src/components/forms/`)
- `DynamicForm.tsx` - Renders forms with Zod validation
- `FormBuilder.tsx` - Handles form lifecycle and submission to Directus
- `FormField.tsx` - Dynamically renders field types based on Directus configuration

**Draft Mode & Visual Editing:**
- Draft preview API route: `src/app/api/draft/route.ts`
- Supports Directus Live Preview integration with token-based authentication
- Visual editing enabled via `@directus/visual-editing` package

**Stripe Integration (Payments & Connect):**
- All Stripe integration is implemented in Next.js (not in Directus extensions)
- `src/app/api/stripe/webhook/route.ts` - Webhook handler for payment events
- `src/app/api/organizer/stripe/onboarding/route.ts` - Stripe Connect onboarding for event organizers
- `src/lib/stripe/webhooks.ts` - Webhook event handlers (payment_intent.succeeded, account.updated)
- Webhooks update Directus collections via admin token (`DIRECTUS_ADMIN_TOKEN`)
- For local development, use Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`

## Development Commands

### Directus (Backend)
```bash
cd directus
docker compose up -d          # Start Directus, PostgreSQL, Redis
docker compose down           # Stop services
docker compose logs -f        # View logs
```

### Next.js (Frontend)
```bash
cd nextjs
pnpm install                  # Install dependencies (pnpm preferred)
pnpm dev                      # Start dev server (uses Turbopack)
pnpm build                    # Production build
pnpm start                    # Start production server
pnpm generate:types           # Generate TypeScript types from Directus schema
pnpm lint                     # Run ESLint
pnpm lint:fix                 # Fix ESLint errors
pnpm format                   # Format with Prettier
```

### Testing
No test suite currently configured.

## Configuration

### Environment Variables (Next.js)
Required in `nextjs/.env`:
- `NEXT_PUBLIC_DIRECTUS_URL` - Directus instance URL (default: http://localhost:8055)
- `DIRECTUS_PUBLIC_TOKEN` - Public content access token (from Webmaster account)
- `DIRECTUS_FORM_TOKEN` - Form submission token (from Frontend Bot User account)
- `NEXT_PUBLIC_SITE_URL` - Frontend application URL
- `DRAFT_MODE_SECRET` - Secret for draft preview mode
- `NEXT_PUBLIC_ENABLE_VISUAL_EDITING` - Enable/disable visual editing (true/false)

### Environment Variables (Directus)
Configured in `directus/.env` - see `directus/.env.example` for full list including database credentials, CORS settings, email transport, etc.

## Type Generation

After schema changes in Directus, regenerate types:
```bash
cd nextjs
pnpm generate:types
```

This runs `src/lib/directus/generateDirectusTypes.ts` using the `directus-sdk-typegen` package.

## Deployment Notes

- **Live Preview Limitation:** Directus CSP policies block live preview on localhost. Deploy to staging/production for full preview functionality.
- **One-Click Deploy:** Template supports Vercel and Netlify deployment buttons.
- **Package Manager:** Project is optimized for pnpm but works with npm.

## Key Technical Decisions

- **Rate Limiting:** Custom fetch wrapper with p-queue prevents 429 errors from Directus API
- **Deep Queries:** Extensive use of Directus SDK's deep field selection minimizes API round trips
- **Type Safety:** Full TypeScript coverage with auto-generated Directus schema types
- **UI Framework:** Tailwind CSS + Shadcn components + Radix UI primitives
- **Validation:** Zod schemas for form validation (built dynamically from Directus field config)
