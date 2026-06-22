# Architecture

## Overview

Three tiers, clearly separated:

- A React and TypeScript single page application for the user interface.
- A Node.js and TypeScript REST API (Fastify) that holds all business logic and
  enforces access control server side.
- A PostgreSQL database for structured data (documents metadata, versions, clauses,
  controls, the Statement of Applicability, the registers and the audit log).

Document files are held in S3 compatible object storage. The database holds only the
metadata and a reference to each stored file. The application is containerised and
all traffic runs over TLS 1.2 or higher.

```
Browser (React, TypeScript)
        |
   HTTPS, OIDC session
        |
REST API (Fastify, TypeScript)  ---->  Object storage (documents, UK or EU region)
        |
   PostgreSQL (metadata, registers, audit log)
```

## Data residency

All data is stored and processed in the UK or EU only. The database, the object
storage and any mail or notification service must be in a UK or EU region. No service
that routes or stores data outside this boundary is used unless explicitly confirmed.
See `docs/configuration-to-confirm.md` items C2 to C5.

## Security model

- Authentication federates to the organisation's identity provider over OIDC. Local
  password storage is avoided. Any unavoidable local account uses a strong policy and
  MFA.
- Authorisation is enforced on every action in the API, not only in the UI. Roles are
  listed in section 9 of the specification and in `config/isms.defaults.json`.
- Encryption in transit (TLS) and at rest (database and object storage).
- Audit logging records every create, edit, status change, download, export,
  permission change and login, with actor, action, entity, timestamp and source IP.
  The audit log is append only. The API exposes no update or delete path for log
  entries, and the database role used by the application is granted insert and select
  only on the audit log table, so entries cannot be altered or removed in normal
  operation.
- Sessions are secure and expiring, with an idle timeout, and logout invalidates the
  session.
- All queries are parameterised. Input is validated and output is encoded to prevent
  injection and cross site scripting.
- No secrets are held in source control. Dependencies are pinned and scanned.

## Data model

The full schema is in `backend/prisma/schema.prisma`. Core entities:

- Document, the central entity, with many Versions. A Version is immutable once
  published; a revision creates a new Version and the prior published Version becomes
  Superseded but is retained in full.
- Clause, seeded with ISO/IEC 27001:2022 management clauses 4 to 10 and subclauses,
  each with its mandatory documented information, including the 4.1 and 4.2 climate
  change considerations from Amendment 1:2024.
- AnnexAControl, seeded with all 93 controls, their theme and the 2022 attributes.
- SoaEntry, one row per Annex A control, forming the Statement of Applicability.
- The registers: risk, asset, supplier, nonconformity, internal audit, management
  review, competence and training, legal and regulatory, and context and interested
  parties.
- User and Role for access control.
- AuditLogEntry for the append only audit trail.

Documents link many to many to clauses and to controls. SoA entries link to the
documents and risks that implement and are treated by each control. These links drive
the framework mapping, the coverage gap detection and the evidence packs.

## Document lifecycle

```
Draft -> In Review -> Approved -> Published
Published -> Under Revision -> In Review -> Approved -> Published (prior version Superseded)
Any published state -> Retired
```

Transition rules are enforced in the API and recorded in the audit log. Segregation
of duties is enforced where roles allow: an author cannot be the sole approver of
their own document.

## Deployment

The application is containerised. A deployment guide and infrastructure as code are
delivered in Phase 9. All environments use TLS, region pinned storage and automated,
tested backups with a documented retention and recovery procedure.
