# Cloud.ax ISMS

A web based Information Security Management System (ISMS) platform that acts as the
single source of truth for all documented information required by ISO/IEC
27001:2022, including the 2022 Amendment 1:2024 climate change provisions.

The platform stores, versions and controls every ISMS document, maps each document
and record to the relevant clauses and Annex A controls, maintains the Statement of
Applicability and the core registers, tracks review cycles, and produces audit
evidence packs on demand. Every action is logged and every document has a traceable
history, so the platform is itself defensible as audit evidence.

## Status

All nine phases are implemented as a working baseline.

| Phase | Scope | State |
| ----- | ----- | ----- |
| 1 | Data model, authentication, RBAC, document repository CRUD | Implemented |
| 2 | Version control and the lifecycle and approval workflow | Implemented |
| 3 | Framework seed, clause and control mapping, coverage gaps | Implemented |
| 4 | Statement of Applicability with export | Implemented |
| 5 | Core registers (all nine) | Implemented |
| 6 | Review scheduling, notifications, dashboard and reporting | Implemented |
| 7 | Audit trail view, search and filtering | Implemented |
| 8 | Export and evidence pack generation | Implemented |
| 9 | Security model, accessibility, backup and deployment | Implemented |

Items that depend on the organisation environment are wired and configurable but
need the confirmed values to go live: the OIDC identity provider (a local sign in
runs in development), S3 compatible object storage (the filesystem is used in
development), and the mail service for notifications (logged when not configured).
See `docs/configuration-to-confirm.md`.

## Build principles

These are non negotiable and apply to all code, UI, generated content and exports.

- British English everywhere.
- No em dashes anywhere in the codebase, UI, generated text, exports or commit history.
- No AI attribution, generator tags or tool watermarks in source files, comments,
  document metadata, exports or commit messages.
- Security first. This system holds the organisation's confidential security
  documentation.
- Data residency: data is hosted in the UK or EU only.
- Configuration over hard coding. Document ID prefixes, classification levels,
  review frequencies, roles and branding are configurable, not fixed in code. See
  `config/isms.defaults.json`.
- Dependencies are pinned, current and minimal.

## Architecture

| Layer | Choice |
| ----- | ------ |
| Frontend | React with TypeScript (Vite) |
| Backend | Node.js REST API with TypeScript (Fastify, Prisma) |
| Database | PostgreSQL |
| Document storage | S3 compatible object storage, UK or EU region |
| Authentication | OIDC, federated to the organisation's identity provider |
| Search | PostgreSQL matching across metadata, clauses and controls |

See `docs/architecture.md` for detail, `docs/deployment.md` for how to run and deploy,
and `docs/configuration-to-confirm.md` for the values to confirm.

## Run it

```bash
cd Cloud.ax-ISMS
docker compose up --build
# Frontend: http://localhost:8080
# API health: http://localhost:4000/health
```

The backend syncs the schema, loads the reference data and starts. In development the
local sign in is available, so you can create the first user with the Administrator
role and explore every module. For running without Docker, see `docs/deployment.md`.

## Modules

- Document repository: create, view, edit and retire documents; filter and sort.
- Version control: immutable published versions; a revision creates a new version and
  the prior published version is retained as superseded; download any version.
- Lifecycle and approval: Draft, In Review, Approved, Published, Under Revision and
  Retired, with role checks and segregation of duties (the author cannot publish their
  own document).
- Framework mapping: browse clauses and the 93 Annex A controls, see the documents
  that evidence each, and surface coverage gaps.
- Statement of Applicability: one row per control with applicability, justification,
  implementation status, owner and links; export to spreadsheet and PDF.
- Registers: risk, asset, supplier, nonconformity, internal audit, management review,
  competence and training, legal, and context and interested parties; each with
  create, edit, delete and export. Risk entries compute inherent and residual scores.
- Review scheduling and notifications: review dates are calculated; the dashboard
  shows due and overdue items; owners are notified by email, with an optional Teams
  channel.
- Dashboard: reviews due and overdue, Statement of Applicability status, open and
  overdue nonconformities, risk status, coverage gaps and a recent activity feed.
- Audit trail: an append only log of every action, with a filterable read only view.
- Search across document metadata, clauses and controls.
- Evidence packs: a zip of the relevant current document versions plus a manifest for
  a chosen clause, control, theme or the whole ISMS.
- User administration and an access review export of users, roles and last login.

## Repository layout

```
Cloud.ax-ISMS/
  config/                 Configurable defaults (prefixes, classes, frequencies, roles, branding)
  docs/                   Architecture, deployment, backup and the values to confirm
  docker-compose.yml      Local and demonstration stack
  backend/
    prisma/schema.prisma  Full data model
    src/
      server.ts           Fastify app and route registration
      auth.ts             Sessions and role based access control
      audit.ts            Append only audit logging
      lifecycle.ts        Lifecycle state machine, references, scoring
      notifications.ts    Review notifications and scheduler
      storage.ts          Document file storage
      exports.ts          Spreadsheet, PDF and zip helpers
      routes/             Documents, framework, SoA, registers, dashboard, audit, search, evidence, users, config
      seed/               Reference data and the seed runner
  frontend/
    src/                  React application (pages for each module)
```

## Reference data

The seed loads all ISO/IEC 27001:2022 clauses 4 to 10 with their mandatory documented
information and the Amendment 1:2024 climate change considerations (4.1 and 4.2); all
93 Annex A controls with theme and the 2022 attributes; and a starter Statement of
Applicability with one row per control.

Control titles are the official ISO short titles. Control descriptions and guidance
are not reproduced, as that text is in the licensed standard; the description field is
left for the organisation to populate. Control attributes are derived from ISO/IEC
27002:2022 and should be validated against the licensed standard.

## Security

- Authorisation is enforced on the server for every action, not only in the user
  interface.
- The audit log is append only. The API has no path that updates or deletes a log
  entry, and the application database role is restricted to insert and select on the
  audit log table in production.
- Sessions are carried in a signed, expiring, http only cookie, secure in production.
- Inputs are validated and queries are parameterised through Prisma.
- No secrets are held in source control.

See `docs/architecture.md` and `docs/backup-and-recovery.md`.
