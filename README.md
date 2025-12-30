# Dispatch Tickets UI

Open-source admin UI for [Dispatch Tickets](https://dispatchtickets.com) - a multi-tenant, API-first ticketing service for developers.

## Features

- **Magic Link Authentication** - Passwordless login via email
- **Workspace Management** - View and switch between workspaces
- **Ticket Management** - List, filter, create, and manage support tickets
- **Comments** - Add and view threaded comments on tickets
- **Real-time Updates** - Optimistic updates for a snappy experience
- **Responsive Design** - Works on desktop and mobile

## Tech Stack

- **Framework**: [Next.js 14+](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Components**: [shadcn/ui](https://ui.shadcn.com/)
- **State Management**: [TanStack Query](https://tanstack.com/query)
- **Forms**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **HTTP Client**: [Axios](https://axios-http.com/)

## Authentication Flow

The UI uses a magic link authentication flow powered by the Dispatch Tickets API:

```
1. User enters email on /login
2. API sends magic link email
3. User clicks link → /auth/callback?token=xxx
4. Token is validated and session stored
5. If user's org is not connected → /connect (one-time API key setup)
6. Once connected → /workspaces (dashboard)
```

### First-Time Setup

New users will be prompted to connect their organization's API key after signing in. This is a one-time setup that links your Dispatch Tickets API key to your user session.

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm
- A Dispatch Tickets account

### Installation

1. Clone the repository:

```bash
git clone https://github.com/your-org/dispatchtickets-ui.git
cd dispatchtickets-ui
```

2. Install dependencies:

```bash
npm install
```

3. Copy the environment file:

```bash
cp .env.example .env.local
```

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) and enter your email to receive a magic link.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Dispatch Tickets API URL | `https://dispatch-tickets-api.onrender.com/v1` |

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages (login, connect)
│   │   ├── login/         # Magic link login
│   │   └── connect/       # API key connection (first-time setup)
│   ├── (dashboard)/       # Protected dashboard pages
│   │   └── workspaces/    # Workspace and ticket management
│   └── auth/
│       └── callback/      # Magic link callback handler
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── layout/            # Layout components (sidebar, header)
│   ├── tickets/           # Ticket-related components
│   └── comments/          # Comment components
├── lib/
│   ├── api/               # API client and endpoints
│   └── hooks/             # TanStack Query hooks
├── providers/             # React context providers
│   ├── auth-provider.tsx  # Authentication state management
│   └── query-provider.tsx # TanStack Query setup
└── types/                 # TypeScript type definitions
```

## API Endpoints Used

The UI communicates with the Dispatch Tickets API:

### Authentication
- `POST /auth/magic-link` - Send magic link email
- `POST /auth/verify` - Verify magic link token
- `GET /auth/session` - Get current session info
- `POST /auth/connect` - Connect API key to organization

### Workspaces & Tickets
- `GET /workspaces` - List workspaces
- `GET /workspaces/:id/tickets` - List tickets
- `POST /workspaces/:id/tickets` - Create ticket
- `GET /workspaces/:id/tickets/:ticketId` - Get ticket details
- `PATCH /workspaces/:id/tickets/:ticketId` - Update ticket
- `GET /workspaces/:id/tickets/:ticketId/comments` - List comments
- `POST /workspaces/:id/tickets/:ticketId/comments` - Add comment

## Self-Hosting

This project is designed to be easily self-hosted:

1. Clone the repository
2. Configure your environment variables
3. Deploy to Vercel, Netlify, or any Node.js hosting platform

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-org/dispatchtickets-ui)

## Development

### Running locally

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Key Files

- `src/providers/auth-provider.tsx` - Authentication state and methods
- `src/lib/api/client.ts` - Axios client with auth interceptor
- `src/app/(dashboard)/layout.tsx` - Protected route wrapper

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: [docs.dispatchtickets.com](https://docs.dispatchtickets.com)
- **Issues**: [GitHub Issues](https://github.com/your-org/dispatchtickets-ui/issues)
- **Email**: support@dispatchtickets.com
