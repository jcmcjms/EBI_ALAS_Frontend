---
feature: document-requirements
status: delivered
specs:
  - docs/compose/specs/2026-10-14-document-requirements-design.md
plans:
  - docs/compose/plans/2026-10-14-document-requirements.md
branch: main
commits: b7071d6..36e663a
---

# Document Requirements — Final Report

## What Was Built

Product-level **document requirements** are configurable in the admin loan-product edit sheet and are copied onto each new loan at submit time. The loan **Document Requirements** tab now lists real checklist rows (stable codes + descriptions) instead of “No checklist items found.”

Admins manage a per-product list of requirement codes (max 50) with descriptions. On loan submit, those rows become `DocumentChecklistItem`s so reviewers see what is required and which items are still unsubmitted.

## Architecture

### Backend (`test\EBI_ALAS_V2_backend`)

| Piece | Location | Role |
|--------|----------|------|
| Entity | `Features/LoanProducts/LoanProductDocumentRequirement.cs` | `ProductCode`, `Code`, `Description` |
| Catalog + seed | `ProductDocumentRequirementCatalog.cs`, `ProductDocumentRequirementSeeder.cs` | Default A16/A17/C02/C21/C23/C35 codes; seed only when table empty |
| API | `Features/LoanProducts/DocumentRequirements/` | `GET/PUT /api/loan-products/{code}/document-requirements` |
| Checklist id | `Features/Documents/DocumentChecklistItem.cs` | Added `Code` for stable `idCode` |
| Submit | `Features/LoanApplications/Submit/SubmitLoanHandler.cs` | Clones product requirements into checklist items |
| Checklist DTO | `ChecklistDocumentEndpoints.cs` | `IdCode = Code`, `ChecklistDescription = Name` |

Write PUT is Admin-only (same as product policy update). GET is authenticated.

### Frontend (`test\alas_v2`)

| Piece | Location | Role |
|--------|----------|------|
| Types + client | `admin/loan-products/api/loan-product-types.ts`, `loan-products.ts` | `DocumentRequirementItem`, GET/PUT helpers |
| Hooks | `hooks/use-loan-products.ts` | `useLoanProductDocumentRequirements`, `useReplaceLoanProductDocumentRequirements` |
| Editor | `components/product-document-requirements.tsx` | Add/remove code+description rows |
| Sheet | `components/product-edit-sheet.tsx` | “Document Requirements” section; validates then full-replaces after policy save |

Existing loan Document Requirements UI is unchanged and consumes the checklist API.

### Design Decisions

- **Approach A (catalog + copy-on-submit)** so missing/pushback status can live per loan. Read-time derivation cannot persist status.
- **Stable `Code` on `DocumentChecklistItem`** so remarks/pushback key on `A1004`, not free-text description.
- **Descriptions seed as the code** until edited — reference data only supplied codes (webloan `check_list_all` names are not in this stack). Do not invent display names.
- **PUT is full replace** (including empty) for a simple admin contract.
- No Backup source was copied; types and folders follow live feature-first rules.

## Usage

### Admin

1. Open **Loan Products** → **Edit Policy**.
2. Under **Document Requirements**, add/edit/remove code + description rows.
3. **Save Changes** — policy fields save first, then the requirement list is replaced.

### API

```http
GET /api/loan-products/A16/document-requirements
PUT /api/loan-products/A16/document-requirements
Content-Type: application/json

{ "items": [{ "code": "A1004", "description": "A1004" }, { "code": "PIC02", "description": "Photo ID" }] }
```

### Loan checklist

After submit, `GET /api/loans/{id}/checklist-documents` returns one row per product requirement (`uploadStatus` = `No uploaded documents` until submitted).

## Verification

| Gate | Result |
|------|--------|
| Backend `dotnet test` | **336 passed** |
| Backend `dotnet build` | **0 warnings, 0 errors** |
| Frontend `pnpm test` | **190 passed** (includes 3 new suites) |
| Frontend `pnpm typecheck` | exit **0** |
| Frontend `pnpm architecture:check` | **no dependency violations** |

Covered behavior: catalog seed idempotency; GET/PUT replace + duplicate rejection; submit creates checklist items (and none when unconfigured); editor add/remove.

**Not runtime-verified:** live HTTP smoke of GET/PUT and a submitted loan against a running API (API was not started in this session).

## Journey Log

- [lesson] Backend test project had pre-existing compile breaks (`IWebLoanReader.GetCatLoanClassAsync`, `SubmitLoanHandler`/`LoanWorkflowService` ctor, `ToReceiveNotification` link arg) — fixed before feature tests could run.
- [lesson] `tests/` is in backend `.gitignore` but tracked files stay tracked; new test files need `git add -f`.
- [pivot] Checklist `idCode` needed a dedicated `Code` column; mapping both id and description to `Name` would break remarks keys.
- [lesson] Seed descriptions equal codes by design; inventing human labels would be fabricated product copy.

## Source Materials

| File | Role | Notes |
|------|------|-------|
| `docs/compose/specs/2026-10-14-document-requirements-design.md` | Design | Full-chain approach A |
| `docs/compose/plans/2026-10-14-document-requirements.md` | Plan | Tasks 1–6 executed |
| `Code\Backup\EBI_ALAS_V2_backend` | Reference | `LoanProductChecklist` seed codes only |
