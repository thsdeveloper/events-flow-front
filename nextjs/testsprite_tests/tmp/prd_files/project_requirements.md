# Product Requirements Document - Event Management Platform

## Project Overview
Event management platform built with Next.js 15 and Directus CMS that allows organizers to create and manage events, sell tickets through Stripe, and provides attendees with ticket purchasing and management capabilities.

## Core Features

### 1. Authentication & Authorization
- User registration and login
- Password reset functionality
- Role-based access control (User, Organizer, Admin)
- JWT token-based authentication with refresh tokens
- Protected routes and middleware
- Session management with cookies

### 2. Event Management (Organizers)
- Create new events with details (title, description, date, location, images)
- Edit existing events
- Configure event settings
- View event statistics and analytics
- Manage event participants and registrations
- View all registrations/inscriptions for events
- Upload event images and media

### 3. Ticket System
- Create and configure ticket types for events
- Set ticket prices, quantities, and availability
- Manage ticket inventory
- View sold tickets and revenue
- Display available tickets to users
- Ticket selection and cart functionality

### 4. Payment Processing (Stripe)
- Stripe integration for payment processing
- Secure checkout flow
- Organizer Stripe account onboarding
- Payment success and cancellation handling
- Fee calculation (platform and payment processor fees)
- Webhook handling for payment events
- Connect accounts for organizers to receive payments

### 5. User Dashboard
- View purchased tickets
- Manage user profile
- Change password
- View event registrations
- Access personal dashboard

### 6. Organizer Dashboard
- View organizer statistics (events, tickets, revenue)
- Manage all created events
- Configure organizer profile
- Upload organizer logo
- Manage Stripe connection status
- Access to Stripe onboarding

### 7. Public Event Pages
- Browse available events
- View event details
- Purchase tickets through checkout
- Event listing and discovery
- Event slug-based routing

### 8. CMS Integration (Directus)
- Headless CMS for content management
- Block-based page builder system
- Dynamic page rendering from CMS
- Support for multiple block types:
  - Hero blocks
  - Rich text content
  - Image galleries
  - Pricing tables
  - Blog posts
  - Contact forms
  - Event listings
  - Button groups
- Live preview and visual editing support
- Draft mode for content preview

### 9. Dynamic Forms
- Form builder with Directus integration
- Multiple field types (text, select, checkbox, radio, file upload)
- Zod-based validation
- File upload capability
- Form submission handling

### 10. Blog System
- Blog post creation and management
- Slug-based routing
- Draft and published states
- Rich content support

### 11. Navigation & UI
- Responsive navigation bar
- Footer with site links
- Admin sidebar navigation
- User menu dropdown
- Theme toggle (dark/light mode)
- Breadcrumb navigation

### 12. Search Functionality
- Site-wide search modal
- Search API endpoint
- Search across content

## Technical Requirements

### Frontend
- Next.js 15 with App Router
- React 19
- TypeScript
- Tailwind CSS for styling
- Shadcn UI + Radix UI components
- React Hook Form for form management
- Zod for validation

### Backend/CMS
- Directus headless CMS
- PostgreSQL database
- Docker-based deployment
- Redis for caching

### Payment Processing
- Stripe integration
- Stripe Connect for organizers
- Webhook handling

### Authentication
- JWT tokens
- HTTP-only cookies
- Token refresh mechanism
- Role-based permissions

### API Routes
- RESTful API endpoints
- Server-side authentication
- Protected API routes
- Rate limiting on Directus calls

## User Roles

### Public User
- Browse events
- Purchase tickets
- Create account
- View purchased tickets

### Organizer
- All public user capabilities
- Create and manage events
- Configure ticket types
- View statistics
- Manage Stripe account
- View registrations

### Admin
- Full system access
- User management
- Content management through CMS

## Security Requirements
- Secure authentication flow
- Protected routes with middleware
- CSRF protection
- Content Security Policy headers
- Secure payment processing
- Environment variable protection
- HTTP-only cookies for tokens

## Performance Requirements
- Server-side rendering for SEO
- Image optimization
- Rate limiting on API calls
- Caching with Redis
- Optimized bundle size

## Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Responsive design for mobile and desktop
- Progressive enhancement

## Deployment
- Vercel/Netlify deployment support
- Docker for Directus
- Environment configuration
- CI/CD ready
