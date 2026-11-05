# SenderRemarketing

Universal multi-tenant workspace for contact management and WhatsApp campaign operations.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- Supabase Auth + PostgreSQL + Row Level Security
- Netlify hosting

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`. For older Supabase projects, the legacy anon key can be used as a fallback.

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL Editor.
3. Configure Authentication URL settings. Set the Site URL to your deployed Netlify URL and add `http://localhost:3000/auth/confirm` plus `https://YOUR-SITE.netlify.app/auth/confirm` to Redirect URLs.
4. Add the Supabase URL and publishable key to the local environment and Netlify environment variables.

See [Supabase setup guide](supabase/README.md) and [architecture notes](docs/architecture.md).

## Netlify deployment

1. Import this GitHub repository in Netlify.
2. Netlify detects Next.js and configures its maintained Next.js adapter automatically.
3. Build command: `npm run build`; publish directory: `.next` (also configured in `netlify.toml`).
4. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Site configuration → Environment variables.
5. Trigger a deploy after adding or changing environment variables.

## Current milestone

- [x] Next.js frontend shell and dashboard mockup
- [x] Supabase browser/server clients
- [x] Email/password signup and login UI
- [x] Protected dashboard routes and sign out
- [x] Email confirmation callback
- [x] Multi-tenant PostgreSQL schema with RLS policies
- [x] Netlify deployment configuration
- [ ] Create and configure hosted Supabase project
- [ ] Deploy to Netlify
- [ ] Replace dashboard mock data with tenant-scoped database queries
- [ ] Build CSV contact import and management

**Important:** The dashboard still contains demonstration data. No WhatsApp messages are sent. Messaging integrations must use supported provider interfaces and platform-compliant messaging practices.
