# SenderRemarketing — architecture baseline

## Product direction

SenderRemarketing is a universal, multi-tenant workspace for contact management and WhatsApp campaign operations. It starts as an internal tool and is designed to become a SaaS product.

## Milestone 1: application foundation

- Next.js App Router + TypeScript + Tailwind CSS.
- Responsive workspace shell and dashboard.
- Initial navigation for contacts, WhatsApp lines, campaigns, scheduling, activity, and settings.
- Mock dashboard data only. No real contacts, sessions, or messages are stored or sent.

## Planned service boundaries

- **Identity & tenancy:** organizations, memberships, roles, tenant-scoped authorization.
- **Contacts:** CSV parsing, column mapping, phone normalization, duplicate detection, consent provenance, suppression/opt-out records.
- **Line registry:** provider, account type, display name, connection state, last health check, and audit history. QR pairing must use a supported and authorized integration; a linked-device QR is not itself permission to automate the WhatsApp Web client.
- **Campaigns:** audience snapshots, approved content, schedule, timezone, status, and audit trail.
- **Messaging adapters:** provider-specific send/status/reply interfaces. Prefer the official WhatsApp Business Platform for production messaging and approved templates where required.
- **Queue workers:** idempotent jobs, retries with backoff, rate controls, pause/kill switch, and delivery-status reconciliation.
- **Analytics:** accepted, sent, delivered, read (when available), failed, replied, and opted-out counts.

## Safety and platform constraints

- Only message people with a valid permission/consent basis; retain the source and timestamp.
- Enforce opt-outs and suppression lists before enqueueing and immediately before sending.
- Do not implement artificial message exchanges, fake engagement, typing simulation, or warm-up routines intended to manipulate platform trust or evade enforcement.
- Internal line tests are diagnostics only: explicitly marked, limited to owned/test recipients, and excluded from campaign-performance metrics.
- Never store QR screenshots, session secrets, or provider credentials in source control or browser local storage.
- Tenant isolation must be enforced in the database and server authorization layer, not only in the UI.

## Next milestones

1. Add database schema and authentication with organization isolation.
2. Build CSV import, mapping, validation, contact lists, and consent/opt-out management.
3. Add line registry and a provider adapter boundary; evaluate supported QR/device integrations separately from production campaign sending.
4. Add campaign composer, scheduling, queue workers, webhooks, and reporting.
5. Add SaaS billing, plans, usage metering, and organization administration.


## Authentication and database setup

1. Create a Supabase project.
2. In Supabase SQL Editor, run `supabase/schema.sql`.
3. Copy the Project URL and publishable/anon key into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Configure Supabase Auth email confirmation and allowed redirect URLs for localhost and the deployed domain.
5. Import the repository into Netlify. Netlify detects Next.js and configures its OpenNext adapter automatically; add the same environment variables to Site configuration → Environment variables, then redeploy.

The signup flow creates a profile, a new organization, and an owner membership via a database trigger. The schema enables RLS on tenant-owned tables. Do not add the Supabase service-role key to client-side variables. Current dashboard metrics and example contacts remain mock data until the contact and campaign modules are connected to these tables.
