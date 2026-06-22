# Backup and recovery

The platform holds the organisation's documented information and its audit evidence,
so backups and a tested restore are essential. The exact targets are confirmed with
the organisation (see `docs/configuration-to-confirm.md` items C23 to C25).

## What is backed up

- PostgreSQL database: all metadata, the Statement of Applicability, the registers
  and the audit log.
- Object storage: every document file, including superseded versions, which are
  retained in full.

Both must be backed up, since a document is its metadata in the database plus its
file in object storage.

## Schedule and retention

- Database: automated daily backups with point in time recovery where the managed
  service supports it. Retention to confirm with the organisation.
- Object storage: enable versioning and a lifecycle policy, or replicate to a second
  bucket in a UK or EU region. Retention to confirm.
- Backups are stored in a UK or EU region only.

## Restore

- Document and test a full restore of the database and the object storage into a
  clean environment at least annually, and record the result as evidence.
- Verify after restore: the audit log is intact and append only, document version
  history is complete, and the Statement of Applicability links resolve.

## Recovery objectives

- Recovery time objective (RTO) and recovery point objective (RPO): to be defined
  with the organisation and recorded in the business continuity documentation. The
  backup frequency above is set to meet the agreed RPO.

## Audit log integrity

The audit log is append only. The application database role is granted insert and
select only on the audit_log_entry table. Backups of the audit log are retained for
at least the certification cycle so the history remains defensible as evidence.
