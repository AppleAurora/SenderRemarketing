# SenderRemarketing

Universal multi-tenant workspace for contact management and WhatsApp campaign operations.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- Supabase Auth + PostgreSQL + Row Level Security
- Vercel hosting (deployment setup pending)

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL Editor.
3. Configure Authentication email confirmation and redirect URLs.
4. Add the Supabase URL and publishable/anon key to the local environment and Vercel project environment.

See [Supabase setup guide](supabase/README.md) and [architecture notes](docs/architecture.md).

## Current milestone

- [x] Next.js frontend shell and dashboard mockup
- [x] Supabase browser/server clients
- [x] Email/password signup and login UI
- [x] Protected dashboard routes and sign out
- [x] Multi-tenant PostgreSQL schema with RLS policies
- [ ] Create and configure hosted Supabase project
- [ ] Deploy to Vercel
- [ ] Replace dashboard mock data with tenant-scoped database queries
- [ ] Build CSV contact import and management

**Important:** The dashboard still contains demonstration data. No WhatsApp messages are sent. Messaging integrations must use supported provider interfaces and platform-compliant messaging practices.
