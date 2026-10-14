# Document Requirements — Design

> [!NOTE]
> This document may not reflect the current implementation.
> See the final report for up-to-date state:
> [Final Report](../reports/document-requirements.md)

## [S1] Problem

The loan **Document Requirements** surface is empty (“No checklist items found for this loan product”) and product import copy says to “use the product edit form to configure document requirements,” but that configuration does not exist.

Root gaps in the live stack:

1. No product-level document-requirements catalog (backup had `LoanProductChecklist` + seed).
2. `SubmitLoanHandler` never creates `DocumentChecklistItem` rows for a new loan.
3. Admin loan-product edit sheet has no document-requirements section.

Reference behavior lives in:

- Frontend: `C:\Users\L-185-DEV\OneDrive - ENTERPRISE BANK INC\Desktop\Code\Backup\alas_v2`
- Backend: `C:\Users\L-185-DEV\OneDrive - ENTERPRISE BANK INC\Desktop\Code\Backup\EBI_ALAS_V2_backend`

Those trees are design evidence only. Implement against live types and rules; do not copy-paste.

## [S2] Solution overview

Approach **A — product catalog + copy-on-submit**.

| Layer | Responsibility |
|--------|----------------|
| Backend domain | `LoanProductDocumentRequirement` under `Features/LoanProducts` |
| Backend API | `GET` / `PUT` `/api/loan-products/{code}/document-requirements` |
| Backend submit | Clone product requirements into `DocumentChecklistItem` per created loan |
| Backend seed | Default product→code pairs from the backup catalog |
| Frontend admin | Document-requirements editor on product edit sheet |
| Frontend loans | Unchanged Document Requirements tab (already lists checklist API results) |

Rejected:

- **B — derive at read time:** cannot persist per-loan missing/pushback status.
- **C — port backup webloan SQL:** linked-server / OPENQUERY design is not live architecture.

## [S3] Data model

### LoanProductDocumentRequirement

| Field | Type | Rules |
|--------|------|--------|
| `Id` | `Guid` | PK |
| `ProductCode` | `string` | required, max 20; pairs with `Code` unique |
| `Code` | `string` | required, max 50; checklist id code (e.g. `A1004`) |
| `Description` | `string` | required, max 200; display name; seed defaults to `Code` |

Owned by `Features/LoanProducts`. Table `LoanProductDocumentRequirements`.

### Loan checklist item mapping

`DocumentChecklistItem` currently has only `Name`, and the checklist DTO maps both `IdCode` and `ChecklistDescription` to that name. Remarks/pushback key on `idCode`, so the id must stay a stable code (`A1004`), not a free-text description.

Add `Code` (max 50) to `DocumentChecklistItem`:

- `Code` = requirement `Code`
- `Name` = requirement `Description` if non-empty else `Code`
- Checklist DTO: `IdCode = Code`, `ChecklistDescription = Name`

On submit, for each created loan and each requirement of `line.ProductCode`, insert one item with that mapping. No webloan binary join in this change.

### Seed (product → codes)

From backup `SeedLoanProductChecklistAsync` (descriptions = codes until edited):

- **A16:** A1004, A2008, A2016, A2017, A2018, A2019, A2020, A2021, A2035, A4001, CCR38, PIC02, PIC03
- **A17:** A1004, A2008, A2016, A2017, A2018, A2019, A2020, A2021, A2022, A2027, A2035, A4001, CCR38, PIC02, PIC03
- **C02 / C23 / C35:** A1004, A2008, A2018, A2019, A2027, A4001, CCR38, PIC02, PIC03
- **C21:** A1004, A2008, A2018, A2019, A2020, A2021, A2022, A2023, A2027, A4001, CCR38, PIC02, PIC03

Seed runs only when the table is empty (same idempotent pattern as other seeders).

## [S4] API contracts

### GET `/api/loan-products/{code}/document-requirements`

Auth: authenticated.  
Response: `200` array of `{ code, description }` ordered by `code`. Unknown product → `404`.

### PUT `/api/loan-products/{code}/document-requirements`

Auth: Admin / `loan_product.manage` (same as product policy update).  
Body: `{ items: [{ code, description }] }` (full replace; empty array clears).  
Validation: `code` required 1–50; `description` required 1–200; no duplicate codes; max 50 items.  
Response: `200` with the saved list. Unknown product → `404`.

### Submit side effect

After each `LoanApplication` is added and before `SaveChangesAsync`, insert matching `DocumentChecklistItem` rows. Missing product requirements → loan is created with an empty checklist (not an error).

## [S5] Frontend admin UI

Location: `src/features/admin/loan-products` (existing owner).

- **product-form-fields.tsx** (or a focused sibling): requirements row type + list editor (code + description, add/remove).
- **product-edit-sheet.tsx:** “Document Requirements” section; load via GET, save via PUT on submit (separate from policy fields if that keeps the form cohesive).
- **loan-products.ts / loan-product-types.ts:** client functions + payload types.
- Respect existing permission: read-only when `canEdit` is false.

Do not invent product copy; use the import sheet’s existing language (“Checklist documents are not imported — configure after import”) only where it already exists.

## [S6] Backend structure (live rules)

Feature-first under existing trees:

```text
Features/LoanProducts/
  LoanProductDocumentRequirement.cs   # entity
  DocumentRequirements/               # GET/PUT handlers + DTOs (cohesive use case)
Features/LoanApplications/Submit/     # create checklist items on submit
Features/Documents/                   # existing DocumentChecklistItem (unchanged domain rules)
Infrastructure/Persistence/          # DbSet + EF config
```

- Nullable enabled; warnings as errors; `CancellationToken` on async I/O.
- No generic repositories; use `AlasDbContext` like neighboring handlers.
- Migration required for the new table.
- Do not expose persistence entities as API contracts.

## [S7] Testing

Backend:

- Handler tests: replace requirements (create/update/delete), validation failures, unknown product.
- Submit test: creates one checklist item per product requirement; empty catalog → no items.

Frontend:

- Schema/editor unit tests for add/remove/validate rows.
- Existing checklist panel already renders non-empty lists; no new golden UI required unless behavior changes.

## [S8] Out of scope

- Webloan / binary document upload-view pipeline (`ViewChecklistDocument` stays as-is).
- Editing checklist status on the loan Document Requirements tab (submit/verify/pushback) beyond what already exists.
- Importing requirements from Excel (import copy already says they are not imported).

## [S9] Acceptance criteria

1. Admin can open a loan product and view/edit its document requirements.
2. After save, GET returns the same list.
3. Submitting a loan for a configured product creates checklist items visible on Document Requirements.
4. Unconfigured products still submit; checklist empty message remains truthful.
5. No Backup source copied into live repos; types and folder ownership match live rules.
6. Tests and build pass for the changed surfaces.
