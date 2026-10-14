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

Product-level **document requirements** (checklist codes per loan product) are configurable in the admin loan-product edit sheet. The loan **Document Requirements** tab **checks webloan** for those codes and reports upload status — it does not invent local checklist rows.

Admins manage which checklist codes apply to a product (max 50). On read, `GET /api/loans/{id}/checklist-documents` loads those codes and looks up webloan `check_list_data` for the client CIS from the form snapshot. `uploadStatus` is `Uploaded` when webloan `submitted` is set, otherwise `No uploaded documents`. Descriptions come from webloan when present.

## Architecture

### Backend (`test\EBI_ALAS_V2_backend`)

| Piece | Location | Role |
|--------|----------|------|
| Entity | `Features/LoanProducts/LoanProductDocumentRequirement.cs` | `ProductCode`, `Code`, `Description` |
| Catalog + seed | `ProductDocumentRequirementCatalog.cs`, `ProductDocumentRequirementSeeder.cs` | Default A16/A17/C02/C21/C23/C35 codes; seed only when table empty |
| API | `Features/LoanProducts/DocumentRequirements/` | `GET/PUT /api/loan-products/{code}/document-requirements` |
| Webloan check | `IWebLoanReader.GetChecklistItemsAsync` | Reads `check_list_data` by CIS |
| Checklist API | `ChecklistDocumentEndpoints.cs` | Product codes × webloan `submitted` → upload status |

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

- **Requirements = product checklist codes; status = webloan check.** Matches the reference: `LoanProductChecklist` × webloan uploads. Not local rows created at submit.
- **CIS from form snapshot** (`client.cisId`) keys webloan `check_list_data`.
- **Descriptions prefer webloan**, fall back to the product requirement description.
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

After submit, `GET /api/loans/{id}/checklist-documents` returns one row per product requirement code. Upload status is read from webloan (`check_list_data.submitted`), not from local checklist rows.

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

- [dead end] First pass invented local `DocumentChecklistItem` copy-on-submit — wrong. Reference only **checks webloan** against product requirement codes.
- [pivot] Reworked checklist API to product codes × `IWebLoanReader.GetChecklistItemsAsync` (webloan `check_list_data.submitted`).
- [lesson] Backend test project had pre-existing compile breaks — fixed before feature tests could run.
- [lesson] `tests/` is in backend `.gitignore`; new test files need `git add -f`.
- [lesson] Do not invent display names or local workflow rows when the reference derives status from webloan.

## Source Materials

| File | Role | Notes |
|------|------|-------|
| `docs/compose/specs/2026-10-14-document-requirements-design.md` | Design | Full-chain approach A |
| `docs/compose/plans/2026-10-14-document-requirements.md` | Plan | Tasks 1–6 executed |
| `Code\Backup\EBI_ALAS_V2_backend` | Reference | `LoanProductChecklist` seed codes only |
