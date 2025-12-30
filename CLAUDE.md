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

The app uses **magic link authentication** via the Dispatch Tickets API:

```
/login → enter email → magic link sent
     ↓
/auth/callback?token=JWT → validates & stores session
     ↓
/connect (if org not connected) → one-time API key setup
     ↓
/workspaces → dashboard
```

### Key Auth Details

- Session token stored in `localStorage` as `dispatch_session_token`
- The callback receives a JWT directly from Stackbe (starts with `eyJ`)
- API returns 401 "User does not belong to an organization" for new users - this is handled gracefully
- `isConnected: false` means user needs to link their API key via `/connect`

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/          # Magic link login page
│   ├── (auth)/connect/        # API key connection (first-time)
│   ├── (dashboard)/           # Protected routes (layout checks auth)
│   │   ├── layout.tsx         # Auth guard - redirects if not authenticated/connected
│   │   └── workspaces/        # Workspace and ticket pages
│   └── auth/callback/         # Magic link callback handler
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
│   ├── auth-provider.tsx      # Auth context (session, login, logout, connect)
│   ├── query-provider.tsx     # TanStack Query setup
│   └── index.tsx              # Combined providers export
└── types/                     # TypeScript types (Ticket, Workspace, Comment, etc.)
```

## API Integration

**Base URL**: `https://dispatch-tickets-api.onrender.com/v1` (configurable via `NEXT_PUBLIC_API_URL`)

### Auth Endpoints
- `POST /auth/magic-link` - Send magic link email
- `POST /auth/verify` - Verify token (for non-JWT tokens)
- `GET /auth/session` - Get current session
- `POST /auth/connect` - Link API key to organization

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

## Known Issues / TODOs

1. **API key source unclear**: The `/connect` page asks for an API key but it's not clear where users get this from Stackbe/Dispatch
2. **Error handling**: Some API errors could have better user-facing messages

## Environment Variables

```env
NEXT_PUBLIC_API_URL=https://dispatch-tickets-api.onrender.com/v1
```

## Testing Authentication

1. Go to `/login`
2. Enter email
3. Check email for magic link
4. Click link → should land on `/connect` (if new user) or `/workspaces` (if already connected)
5. On `/connect`, enter API key to link organization
