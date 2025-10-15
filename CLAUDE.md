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
- **Error Handling:** RFC 7807 Problem Details standard with automatic toast notifications (see Error Handling section below)

## Error Handling (RFC 7807)

This project implements a complete RFC 7807 (Problem Details for HTTP APIs) error handling system with automatic toast notifications. See `nextjs/IMPLEMENTACAO_ERRO.md` for full documentation.

### Quick Start

**1. API Routes (Backend):**
```typescript
import { withApi } from '@/lib/api'
import { fromDirectusError } from '@/lib/errors'

export const GET = withApi(async (request) => {
  try {
    const data = await fetchFromDirectus()
    return Response.json(data)
  } catch (error) {
    throw fromDirectusError(error, request.headers.get('x-request-id'))
  }
})
```

**2. Client Components (Frontend):**
```typescript
import { httpClient } from '@/lib/http-client'
import { toastSuccess } from '@/lib/toast-helpers'

async function handleSubmit() {
  // Toast is shown automatically on error
  await httpClient.post('/api/posts', data)

  toastSuccess({
    title: 'Post criado!',
    description: 'Seu post foi publicado com sucesso.'
  })
}
```

### Core Files

- **`src/lib/errors.ts`** - AppError class, Directus error mapping, validation helpers
- **`src/lib/api.ts`** - `withApi` wrapper for API Routes (Edge Runtime compatible)
- **`src/lib/http.ts`** - `apiFetch` client with automatic Bearer token injection and cookie support
- **`src/lib/http-client.ts`** - `httpClient` with automatic toast on errors
- **`src/lib/toast-problem.ts`** - Converts RFC 7807 errors to user-friendly toasts
- **`src/lib/toast-helpers.ts`** - Toast helpers: `toastSuccess`, `toastError`, `toastWarning`, `toastInfo`
- **`src/middleware.ts`** - Generates and propagates `x-request-id` for request tracing

### Toast Variants

All toasts include icons and appropriate colors:

| Variant       | Color   | Icon         | Usage                    |
|---------------|---------|--------------|--------------------------|
| `success`     | Green   | CheckCircle2 | Successful operations    |
| `destructive` | Red     | XCircle      | Errors and failures      |
| `warning`     | Yellow  | AlertCircle  | Warnings                 |
| `info`        | Blue    | Info         | General information      |

### Key Features

- ✅ **Automatic authentication**: `httpClient` reads `access_token` cookie and adds `Authorization: Bearer <token>` header
- ✅ **FormData support**: Handles file uploads correctly without JSON serialization
- ✅ **SSR-safe**: Works in both client and server components
- ✅ **Edge Runtime compatible**: Uses Web Crypto API for request ID generation
- ✅ **Directus integration**: Automatic mapping of Directus errors to RFC 7807 format
- ✅ **Portuguese messages**: All error messages in PT-BR with proper formatting
- ✅ **Request tracing**: Every request has a unique `x-request-id` for debugging

### Migration Checklist

When migrating existing code to use the error handling system:

1. **API Routes**: Replace manual error handling with `withApi` wrapper
2. **Client fetches**: Replace `fetch()` with `httpClient.get/post/patch/delete`
3. **Success toasts**: Replace `toast({ variant: 'success' })` with `toastSuccess()`
4. **Remove manual error handling**: Let `httpClient` handle errors automatically via toast

For complete documentation, examples, and advanced usage, see `nextjs/IMPLEMENTACAO_ERRO.md`.
