# Dispatch Tickets Admin UI - Development Brief

## Overview

Build an open-source admin UI for **Dispatch Tickets**, a multi-tenant, API-first ticketing service for developers. This admin UI will be a separate public repository, connecting to the private backend API.

**Backend API:** https://dispatch-tickets-api.onrender.com
**API Docs:** See "API Endpoints" section below

## Project Goals

1. **Open source** - MIT licensed, community-friendly
2. **Self-hostable** - Customers can run their own instance
3. **Hosted version** - We'll also offer a hosted version at app.dispatchtickets.com (or similar)
4. **Developer-friendly** - Clean code, well-documented, easy to contribute to

## Tech Stack (Recommended)

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Framework | Next.js 14+ (App Router) | SSR, file-based routing, React Server Components |
| Styling | Tailwind CSS | Utility-first, easy to customize |
| Components | shadcn/ui | Copy-paste components, not a dependency |
| State | React Query (TanStack Query) | Server state management, caching |
| Forms | React Hook Form + Zod | Type-safe form validation |
| Auth | API key stored in cookie/localStorage | Simple, matches API-first approach |
| Deployment | Vercel | Free tier, perfect for Next.js |

## Authentication Flow

The backend uses API keys (provisioned via Stackbe). The admin UI should:

1. **Login page** - User enters their API key
2. **Store key** - Save in httpOnly cookie (hosted) or localStorage (self-hosted)
3. **Validate** - Call `GET /v1/workspaces` to verify key works
4. **Attach to requests** - Send `Authorization: Bearer <key>` header on all API calls

Note: There's no user/password auth - the API key IS the authentication. Each customer gets their API key from Stackbe (the billing platform).

## Data Model

```
Account (from API key - implicit)
  └── Workspaces (isolated ticket containers)
        ├── Tickets
        │     ├── Comments (threaded)
        │     └── Attachments
        └── Webhooks
```

## API Endpoints

Base URL: `https://dispatch-tickets-api.onrender.com/v1`

All endpoints require `X-API-Key` header.

### Health
```
GET /health - Health check (no auth required)
```

### Workspaces
```
POST   /workspaces           - Create workspace
GET    /workspaces           - List workspaces
GET    /workspaces/:id       - Get workspace
PATCH  /workspaces/:id       - Update workspace
DELETE /workspaces/:id       - Delete workspace
```

### Tickets
```
POST   /workspaces/:ws/tickets          - Create ticket
GET    /workspaces/:ws/tickets          - List tickets (supports filtering)
GET    /workspaces/:ws/tickets/:id      - Get ticket
PATCH  /workspaces/:ws/tickets/:id      - Update ticket
DELETE /workspaces/:ws/tickets/:id      - Delete ticket
```

**Ticket filtering query params:**
- `status` - open, pending, resolved, closed
- `priority` - low, normal, high, urgent
- `assignee` - assignee identifier
- `customer_email` - customer's email
- `source` - api, email, slack, sms, etc.
- `search` - full-text search
- `page`, `limit` - pagination

### Comments
```
POST   /workspaces/:ws/tickets/:id/comments       - Add comment
GET    /workspaces/:ws/tickets/:id/comments       - List comments
PATCH  /workspaces/:ws/tickets/:id/comments/:cid  - Update comment
DELETE /workspaces/:ws/tickets/:id/comments/:cid  - Delete comment
```

### Attachments
```
POST   /workspaces/:ws/tickets/:id/attachments       - Get presigned upload URL
GET    /workspaces/:ws/tickets/:id/attachments       - List attachments
GET    /workspaces/:ws/tickets/:id/attachments/:aid  - Get download URL
DELETE /workspaces/:ws/tickets/:id/attachments/:aid  - Delete attachment
```

### Webhooks
```
POST   /workspaces/:ws/webhooks        - Create webhook subscription
GET    /workspaces/:ws/webhooks        - List webhooks
DELETE /workspaces/:ws/webhooks/:id    - Delete webhook
```

## Core Features to Build

### Phase 1: MVP
- [ ] **Auth** - API key login, validation, storage
- [ ] **Workspace switcher** - List/select workspaces
- [ ] **Ticket list** - Table with filtering, sorting, pagination
- [ ] **Ticket detail** - View ticket, status, priority, custom fields
- [ ] **Comments** - View/add comments on tickets
- [ ] **Create ticket** - Form to create new tickets (for testing/manual entry)

### Phase 2: Full Featured
- [ ] **Dashboard** - Ticket counts by status, recent activity
- [ ] **Ticket management** - Bulk actions, status updates, assignment
- [ ] **Attachments** - Upload/download files on tickets
- [ ] **Webhooks UI** - Create/manage webhook subscriptions
- [ ] **Workspace settings** - Update workspace name, settings
- [ ] **Search** - Global ticket search

### Phase 3: Polish
- [ ] **Dark mode** - Theme toggle
- [ ] **Keyboard shortcuts** - Power user features
- [ ] **Real-time updates** - Polling or WebSocket for live updates
- [ ] **Mobile responsive** - Works on tablets/phones
- [ ] **Export** - Export tickets to CSV

## Page Structure (Suggested)

```
/                           - Redirect to /login or /workspaces
/login                      - API key entry
/workspaces                 - Workspace list/selector
/workspaces/[ws]            - Dashboard for workspace
/workspaces/[ws]/tickets    - Ticket list
/workspaces/[ws]/tickets/[id] - Ticket detail
/workspaces/[ws]/settings   - Workspace settings
/workspaces/[ws]/webhooks   - Webhook management
```

## Key UI Components Needed

1. **DataTable** - Sortable, filterable table for tickets
2. **TicketCard** - Compact ticket preview
3. **TicketDetail** - Full ticket view with comments
4. **CommentThread** - Threaded comment display
5. **CommentEditor** - Rich text or markdown comment input
6. **StatusBadge** - Colored status indicators
7. **PriorityBadge** - Priority indicators
8. **WorkspaceSwitcher** - Dropdown to switch workspaces
9. **FilterBar** - Ticket filtering controls
10. **EmptyState** - Friendly empty states for lists

## Environment Variables

```env
# API Configuration
NEXT_PUBLIC_API_URL=https://dispatch-tickets-api.onrender.com/v1

# Optional: For hosted version with server-side API key handling
# API_KEY_ENCRYPTION_SECRET=... (for encrypting stored keys)
```

## Test Credentials

**API Key:** `sbk_live_x-t5lSo5bmkC5gbu5Lc9NFNoXn1zqpPY`
**Auth Header:** `Authorization: Bearer <api_key>`

**Test Workspace:** `ws_9rLVT18Jt8g6-jQBrknOh` (slug: "test")

**Existing test tickets:** 5 tickets (mix of email and API created)

```bash
# Quick test
curl https://dispatch-tickets-api.onrender.com/v1/workspaces \
  -H "Authorization: Bearer sbk_live_x-t5lSo5bmkC5gbu5Lc9NFNoXn1zqpPY"
```

## Design Guidelines

- **Clean and minimal** - Developer-focused, not flashy
- **Fast** - Optimize for quick ticket triage
- **Accessible** - WCAG 2.1 AA compliance
- **Consistent with shadcn/ui** - Use their design tokens

Reference designs to consider:
- Linear (clean, fast, keyboard-driven)
- GitHub Issues (familiar to developers)
- Stripe Dashboard (professional, clear hierarchy)

## Getting Started

```bash
# Create new Next.js project
npx create-next-app@latest dispatch-tickets-admin --typescript --tailwind --eslint --app --src-dir

cd dispatch-tickets-admin

# Add shadcn/ui
npx shadcn@latest init

# Add essential components
npx shadcn@latest add button card input label table badge dropdown-menu dialog

# Add data fetching
npm install @tanstack/react-query axios

# Add forms
npm install react-hook-form @hookform/resolvers zod
```

## Repository Setup

```bash
# Initialize repo
git init
gh repo create dispatch-tickets-admin --public --description "Open source admin UI for Dispatch Tickets"

# Add LICENSE (MIT)
# Add README.md with setup instructions
# Add CONTRIBUTING.md
# Add .env.example
```

## Success Criteria

The admin UI is successful when:
1. A user can log in with their API key
2. View and manage tickets across workspaces
3. The codebase is clean enough for community contributions
4. Self-hosting is documented and works
5. Hosted version can be deployed to Vercel

## Questions to Decide

1. **Branding** - Logo, colors, name for the admin? ("Dispatch Admin"?)
2. **Domain** - Where will hosted version live? (admin.dispatchtickets.com?)
3. **License** - MIT? Apache 2.0?
4. **Monorepo tooling** - Just npm workspaces, or Turborepo?

---

## Contact / Resources

- **Backend repo:** (private) dispatch-tickets
- **API health check:** https://dispatch-tickets-api.onrender.com/v1/health
- **Stackbe (billing):** https://stackbe.io
