# CLAUDE.md - Project Context for Claude Code

## Project Overview

This is **Dispatch Tickets UI**, an open-source admin dashboard for the Dispatch Tickets API - a multi-tenant ticketing service. The UI is built with Next.js 14+ (App Router), Tailwind CSS, and shadcn/ui.

## Tech Stack

- **Framework**: Next.js 14+ with App Router
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui (components in `src/components/ui/`)
- **State**: TanStack Query for server state
- **HTTP**: Axios for API calls
- **Forms**: React Hook Form + Zod validation

## Authentication Flow

Sign-in is **Clerk only** (`@clerk/nextjs`). Clerk production keys are
domain-locked to dispatchtickets.com, so the admin cannot sign in on localhost.

- `ClerkTokenBridge` hands Clerk's `getToken` to the axios client
  (`src/lib/api/client.ts`), which sends the Clerk JWT as the Bearer token.
- `AuthProvider` reads `GET /auth/session` for `organizationId`, `memberId` and
  `orgRole`, and re-reads it whenever Clerk's active org changes.
- Org switching is Clerk's `<OrganizationSwitcher />` / `setActive`; the JWT's
  `org_id` claim scopes every API request.
- **Everything the UI hides by role is enforced again by the API.** This repo is
  open source; client checks are cosmetic.

The old Stackbe magic-link flow (`/auth/callback`, `/connect`,
`dispatch_session_token` in localStorage) was removed on 2026-11-24. A leftover
token in a browser is deleted on load and never sent.

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/          # Clerk sign-in
│   ├── (dashboard)/           # Protected routes (layout checks auth)
│   │   ├── layout.tsx         # Auth guard - redirects if not authenticated/connected
│   │   └── workspaces/        # Workspace and ticket pages
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── layout/                # Sidebar, Header, WorkspaceSwitcher
│   ├── tickets/               # TicketTable, TicketFilters, StatusBadge, etc.
│   └── comments/              # CommentThread, CommentEditor
├── lib/
│   ├── api/
│   │   ├── client.ts          # Axios instance with auth interceptor
│   │   ├── workspaces.ts      # Workspace API calls
│   │   ├── tickets.ts         # Ticket API calls
│   │   └── comments.ts        # Comment API calls
│   └── hooks/                 # TanStack Query hooks (useTickets, useWorkspaces, etc.)
├── providers/
│   ├── auth-provider.tsx      # Session context (org, member id, role) on top of Clerk
│   ├── query-provider.tsx     # TanStack Query setup
│   └── index.tsx              # Combined providers export
└── types/                     # TypeScript types (Ticket, Workspace, Comment, etc.)
```

## API Integration

**Base URL**: `https://api.dispatchtickets.com/v1` (configurable via `NEXT_PUBLIC_API_URL`)

### Auth Endpoints
- `GET /auth/session` - Current session (Clerk JWT)
- `/auth/members*`, `/auth/organization`, `/auth/transfer-ownership`, `DELETE /auth/account` - team and account
- `/auth/subscription*`, `/auth/payment-methods*`, `/auth/invoices` - Throttle billing

### Data Endpoints
- `GET /workspaces` - List workspaces
- `GET /workspaces/:id/tickets` - List tickets (cursor-based pagination)
- `POST /workspaces/:id/tickets` - Create ticket
- `GET /workspaces/:id/tickets/:ticketId` - Get ticket
- `PATCH /workspaces/:id/tickets/:ticketId` - Update ticket
- `GET /workspaces/:id/tickets/:ticketId/comments` - List comments
- `POST /workspaces/:id/tickets/:ticketId/comments` - Add comment

### API Response Format

Tickets use **camelCase** field names and cursor-based pagination:
```typescript
{
  data: Ticket[],
  pagination: { hasMore: boolean, nextCursor: string | null }
}
```

Ticket fields: `id`, `workspaceId`, `title`, `body`, `status`, `priority`, `customFields` (contains `requesterEmail`, `requesterName`), `createdAt`, `updatedAt`

## Common Tasks

### Running the app
```bash
npm run dev      # Dev server (usually runs on port 3002 if 3000/3001 taken)
npm run build    # Production build
```

### Adding a shadcn component
```bash
npx shadcn@latest add [component-name]
```

### Key files to modify

- **Auth changes**: `src/providers/auth-provider.tsx`
- **API client**: `src/lib/api/client.ts`
- **Route protection**: `src/app/(dashboard)/layout.tsx`
- **Types**: `src/types/`

## Environment Variables

```env
NEXT_PUBLIC_API_URL=https://api.dispatchtickets.com/v1
```

## Testing Authentication

Deploy (see the root CLAUDE.md) and sign in at app.dispatchtickets.com: Clerk
will not run on localhost with the production keys.
