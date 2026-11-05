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
