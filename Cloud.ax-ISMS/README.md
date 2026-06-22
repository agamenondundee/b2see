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

Build in progress, delivered in the phases set out below. This repository currently
contains the foundation: the data model, configurable defaults, architecture notes,
the list of values to confirm, and the full ISO/IEC 27001:2022 reference seed
(clauses 4 to 10 and all 93 Annex A controls).

| Phase | Scope | State |
| ----- | ----- | ----- |
| 1 | Data model, authentication, RBAC skeleton, document repository CRUD | In progress (data model and reference seed done) |
| 2 | Version control and the lifecycle and approval workflow | Planned |
| 3 | Framework seed, clause and control mapping, coverage gaps | Seed data done; mapping UI planned |
| 4 | Statement of Applicability module with export | Planned |
| 5 | Core registers | Planned |
| 6 | Review scheduling, notifications, dashboard and reporting | Planned |
| 7 | Full audit trail view, search and filtering | Planned |
| 8 | Export and evidence pack generation | Planned |
| 9 | Security hardening, accessibility, backup and deployment | Planned |

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
| Frontend | React with TypeScript |
| Backend | Node.js REST API with TypeScript (Fastify) |
| Database | PostgreSQL via Prisma |
| Document storage | S3 compatible object storage, UK or EU region |
| Authentication | OIDC, federated to the organisation's identity provider |
| Search | PostgreSQL full text search |

See `docs/architecture.md` for detail and `docs/configuration-to-confirm.md` for the
organisation specific values that must be confirmed.

## Repository layout

```
Cloud.ax-ISMS/
  config/                 Configurable defaults (prefixes, classes, frequencies, roles, branding)
  docs/                   Architecture and the values to confirm
  backend/
    prisma/schema.prisma  Full data model
    src/seed/             Reference data and the seed runner
```

## Running the seed (once the database is available)

```bash
cd backend
cp .env.example .env       # set DATABASE_URL to your UK or EU PostgreSQL instance
npm install
npx prisma migrate dev --name init
npm run seed               # loads clauses, controls and a starter Statement of Applicability
```

## Reference data

On first deployment the seed loads:

- All ISO/IEC 27001:2022 management clauses 4 to 10 with subclauses, their mandatory
  documented information, and the 4.1 and 4.2 climate change considerations from
  Amendment 1:2024.
- All 93 Annex A controls with reference, title, theme and the 2022 attributes
  (control type, information security properties, cybersecurity concepts).
- A starter Statement of Applicability with one row per control for the organisation
  to complete.

Control titles are the official ISO short titles. Control descriptions and guidance
are not reproduced here, as that text is in the licensed standard; the description
field is left for the organisation to populate from its own copy. Control attributes
are derived from ISO/IEC 27002:2022 and should be validated against the licensed
standard. See `docs/configuration-to-confirm.md`.
