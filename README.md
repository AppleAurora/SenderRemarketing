# SenderRemarketing

A multi-tenant WhatsApp campaign management platform. The first milestone establishes the application shell, dashboard, contacts import workflow, campaign planning UI, and line connection inventory.

## Product principles

- Multi-tenant data isolation from the beginning.
- Consent-aware contact management and suppression lists.
- Campaign scheduling separated from messaging-provider adapters.
- QR-linked device sessions are treated as connection management only; no unofficial browser automation or artificial warm-up loops.
- Messaging adapters must use supported provider APIs and respect platform policies.

## Initial stack

- Next.js App Router + TypeScript
- Tailwind CSS
- PostgreSQL + Prisma (next milestone)
- Redis + BullMQ (next milestone)

## Development

```bash
npm install
npm run dev
```

The current milestone is a frontend-first scaffold with mock data. No real WhatsApp messages are sent.