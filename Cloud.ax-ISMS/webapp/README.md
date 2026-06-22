# Cloud.ax ISMS, browser based

A self contained Information Security Management System for ISO/IEC 27001:2022 that
runs entirely in the browser. There is no server, no database and no build step.
Open `index.html` and it works.

It ships seeded with the ISO/IEC 27001:2022 clauses 4 to 10 (including the climate
change considerations in 4.1 and 4.2) and all 93 Annex A controls with their 2022
attributes, plus a starter Statement of Applicability.

## Open it

- Hosted: this folder is served as a static site. On GitHub Pages it is at
  `/<repo>/Cloud.ax-ISMS/webapp/`.
- Locally: serve the folder over HTTP (modules need HTTP, not the file system):

  ```bash
  cd Cloud.ax-ISMS/webapp
  python3 -m http.server 8000
  # then open http://localhost:8000/
  ```

## What it does

- Dashboard: reviews due and overdue, applicable and excluded controls, coverage
  gaps, and recent activity.
- Documents: create, view and take a document through Draft, In Review, Approved,
  Published, Under Revision and Retired, with version history and segregation of
  duties, and map it to clauses and controls.
- Framework: the clauses and all 93 controls, with coverage gaps.
- Statement of Applicability: one row per control with applicability, justification,
  implementation status and owner; export to CSV or print to PDF.
- Registers: risk, asset, supplier, nonconformity, internal audit, management review,
  competence and training, legal, and context and interested parties; each with add,
  delete and CSV export.
- Audit log of actions taken in the browser.
- Search across documents, clauses and controls.
- Evidence pack manifest for a chosen control.
- Settings: switch acting role, set your name, and export, import or reset the data.

## Where the data lives

All data is stored in your browser through localStorage. It does not leave the
machine. Use Settings to export a JSON backup, to import it on another machine, or to
reset to the seeded starting point. Clearing the browser data removes it.

## Limits of the browser version

This version is ideal for evaluation and single user use. Because it runs only in the
browser, it does not provide server enforced access control, a tamper resistant
shared audit store, multi user collaboration or encrypted central storage. For a
production, multi user, defensible deployment, use the full application in the parent
folder (a Node and TypeScript API, PostgreSQL and an identity provider), which
implements those controls. The browser version can be backed by that API later.

Control titles are the official ISO short titles. Control descriptions and guidance
are in the licensed standard and are not reproduced. Control attributes are derived
from ISO/IEC 27002:2022 and should be validated against the licensed standard.
