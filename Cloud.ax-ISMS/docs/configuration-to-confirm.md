# Values to confirm

The specification marks organisation specific values in square brackets and requires
them to be confirmed rather than invented. This is the consolidated list. Each item
has a suggested default that the platform ships with as configuration. Confirm or
change each value; nothing here is fixed in code.

Where a default is already applied it lives in `config/isms.defaults.json` or
`backend/.env.example`. Update those files once values are confirmed.

## Architecture and hosting

| Ref | Item | Suggested default | Confirmed value |
| --- | ---- | ----------------- | --------------- |
| C1 | Backend language | Node.js with TypeScript | |
| C2 | Hosting target and region | A UK or EU region of your cloud provider, for example Azure UK South | |
| C3 | Object storage for documents | S3 compatible storage in a UK or EU region | |
| C4 | Database hosting | Managed PostgreSQL in a UK or EU region | |
| C5 | Data residency boundary | UK or EU only, no transfer outside this boundary | |

## Identity and access

| Ref | Item | Suggested default | Confirmed value |
| --- | ---- | ----------------- | --------------- |
| C6 | Identity provider for SSO | Confirm provider, for example Microsoft Entra ID | |
| C7 | Federation protocol | OIDC, or SAML 2.0 if required by the provider | |
| C8 | Local accounts | None if avoidable; if any are needed, strong policy plus MFA | |
| C9 | Role set | Administrator, ISMS Manager, Document Owner, Reviewer, Approver, Reader | |

## ISMS configuration

| Ref | Item | Suggested default | Confirmed value |
| --- | ---- | ----------------- | --------------- |
| C10 | Classification scheme | Public, Internal, Confidential, Restricted | |
| C11 | Document type prefixes | POL, PROC, STD, GUI, PLAN, REG, REC, FORM | |
| C12 | Review frequencies offered | 6, 12 and 24 months | |
| C13 | Default review frequency | 12 months | |
| C14 | Review due window | Surface items due within 30 days | |
| C15 | Annex A control attributes | Derived from ISO/IEC 27002:2022, to be validated against your licensed copy | |

## Notifications

| Ref | Item | Suggested default | Confirmed value |
| --- | ---- | ----------------- | --------------- |
| C16 | Primary channel | Email | |
| C17 | Optional channel | Confirm whether to enable, for example Microsoft Teams | |
| C18 | Sending mail service in region | Confirm a UK or EU mail relay or service | |

## Branding and scope

| Ref | Item | Suggested default | Confirmed value |
| --- | ---- | ----------------- | --------------- |
| C19 | Organisation legal name | [ORGANISATION NAME] | |
| C20 | Product display name | Cloud.ax ISMS | |
| C21 | Primary brand colour | A placeholder is set; confirm the brand value | |

## Non functional

| Ref | Item | Suggested default | Confirmed value |
| --- | ---- | ----------------- | --------------- |
| C22 | Expected user count | About 80 | |
| C23 | Target availability | To be defined with the organisation | |
| C24 | Recovery objectives (RTO, RPO) | To be defined with the organisation | |
| C25 | Backup retention | To be defined with the organisation | |

## Notes on standard content

- Control descriptions and implementation guidance from ISO/IEC 27002:2022 are not
  reproduced in this repository, as that text is copyright of ISO. The control
  description field is left empty for the organisation to populate from its licensed
  copy.
- Control attributes (control type, information security properties, cybersecurity
  concepts) are seeded from the published 2022 attribute model and should be checked
  against the licensed standard before relying on them as audit evidence.
