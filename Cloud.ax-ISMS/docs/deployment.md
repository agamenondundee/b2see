# Deployment

## Principles

- All hosted services are in a UK or EU region. The database, object storage and the
  mail service must not route or store data outside this boundary.
- TLS 1.2 or higher for all traffic. Terminate TLS in front of the frontend container
  or load balancer.
- No secrets in source control. Secrets are provided through the environment or a
  secrets manager in the chosen platform.

## Local and demonstration stack

```bash
cd Cloud.ax-ISMS
docker compose up --build
# Frontend: http://localhost:8080
# API:      http://localhost:4000/health
```

The backend container runs `prisma db push`, loads the reference data and starts the
API. In development the local sign in is available because no identity provider is
configured. The first user can be created with any roles, including Administrator.

## Running without Docker

```bash
# Backend
cd backend
cp .env.example .env          # set DATABASE_URL and a SESSION_SECRET
npm install
npx prisma generate
npx prisma db push            # or: npx prisma migrate dev --name init
npm run seed
npm run dev                   # http://localhost:4000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                   # http://localhost:5173, proxies the API
```

## Production

1. Provision managed PostgreSQL and S3 compatible object storage in a UK or EU
   region. Set `DATABASE_URL` and the `STORAGE_*` values. Replace the local
   filesystem branch in `backend/src/storage.ts` with the S3 client.
2. Register the application with the identity provider and set `OIDC_ISSUER_URL`,
   `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` and `OIDC_REDIRECT_URI`. Before go live,
   complete the OIDC callback with discovery and JWKS signature verification of the
   id_token. See `docs/configuration-to-confirm.md` items C6 and C7.
3. Set a strong `SESSION_SECRET`, set `NODE_ENV=production` (this disables the local
   sign in and marks the session cookie secure), and set `CORS_ORIGIN` to the site
   origin.
4. Configure the mail service (`SMTP_*`) in region for review notifications.
5. Move from `prisma db push` to `prisma migrate` for change control once the schema
   is stable.
6. Restrict the database role used by the application to insert and select only on
   the audit_log_entry table, so the audit trail cannot be altered or deleted in
   normal operation.
7. Put a TLS terminating proxy or load balancer in front of the frontend. Set the
   security headers (HSTS, content security policy) there.

## Scale

The system is designed for the stated scale (about 80 users and a low thousands of
documents and records). A single backend instance and a managed database are
sufficient. PostgreSQL full text search can replace the current matching if the
document and record count grows.
