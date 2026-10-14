# Document Requirements Implementation Plan

> [!NOTE]
> This document may not reflect the current implementation.
> See the final report for up-to-date state:
> [Final Report](../reports/document-requirements.md)

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recreate product-level document requirements end-to-end so admins can configure them and loans get checklist items on submit (Document Requirements tab shows real rows).

**Architecture:** ALAS owns a `LoanProductDocumentRequirement` catalog (product code + checklist code + description). Admin GET/PUT replaces that list per product. Submit clones the catalog into `DocumentChecklistItem` rows. Existing loan checklist UI/API stays the consumer.

**Tech Stack:** .NET 10 / EF Core / minimal APIs (`test\EBI_ALAS_V2_backend`); React 19 + RHF + Zod + TanStack Query (`test\alas_v2`).

## Global Constraints

- Do not copy-paste from `Code\Backup\...` trees; reimplement against live types and rules.
- Frontend: follow `alas_v2\AGENTS.md` and `.ai\rules\` (feature-first, no cross-feature imports, no catch-all utils).
- Backend: follow `EBI_ALAS_V2_backend\AGENTS.md` and `docs\engineering\rules\` (feature-first, no generic repositories, nullable + warnings as errors, no entity types as public contracts).
- Checklist `idCode` must remain a stable code (`A1004`), not free text.
- Max 50 requirements per product; code 1–50 chars; description 1–200 chars; unique codes per product.
- PUT is a full replace (including empty list).
- Seed only when `LoanProductDocumentRequirements` is empty.
- Description in seed data equals the code until an admin edits it (do not invent human names).
- Write APIs: Admin role / same authorization as `PUT /api/loan-products/{code}`.
- TDD: failing test before production code; frequent commits.
- Spec: `alas_v2\docs\compose\specs\2026-10-14-document-requirements-design.md`.

## File map

| File | Role |
|------|------|
| BE `Features/LoanProducts/LoanProductDocumentRequirement.cs` | Entity |
| BE `Features/LoanProducts/DocumentRequirements/DocumentRequirementContracts.cs` | DTOs |
| BE `Features/LoanProducts/DocumentRequirements/DocumentRequirementHandlers.cs` | GET/PUT handlers |
| BE `Features/LoanProducts/DocumentRequirements/DocumentRequirementEndpoints.cs` | HTTP map |
| BE `Features/LoanProducts/ProductDocumentRequirementCatalog.cs` | Seed pairs |
| BE `Features/LoanProducts/ProductDocumentRequirementSeeder.cs` | Idempotent seed |
| BE `Features/Documents/DocumentChecklistItem.cs` | Add `Code` |
| BE `Features/LoanApplications/Documents/ChecklistDocumentEndpoints.cs` | Map `IdCode` from `Code` |
| BE `Features/LoanApplications/Submit/SubmitLoanHandler.cs` | Create checklist items |
| BE `Infrastructure/Persistence/AlasDbContext.cs` | DbSet + EF config |
| FE `admin/loan-products/api/loan-product-types.ts` | Types |
| FE `admin/loan-products/api/loan-products.ts` | API client |
| FE `admin/loan-products/api/loan-product-queries.ts` | Query keys |
| FE `admin/loan-products/hooks/use-loan-products.ts` | Hooks |
| FE `admin/loan-products/components/product-document-requirements.tsx` | Editor |
| FE `admin/loan-products/components/product-edit-sheet.tsx` | Section + save |
| FE `admin/loan-products/components/products-table.tsx` | Save orchestration |

---

### Task 1: Backend — product document-requirements entity + catalog seed

**Covers:** [S3], [S6]

**Files:**
- Create: `C:\Users\L-185-DEV\OneDrive - ENTERPRISE BANK INC\Desktop\Code\test\EBI_ALAS_V2_backend\src\Ebi.Alas.Api\Features\LoanProducts\LoanProductDocumentRequirement.cs`
- Create: `C:\Users\L-185-DEV\OneDrive - ENTERPRISE BANK INC\Desktop\Code\test\EBI_ALAS_V2_backend\src\Ebi.Alas.Api\Features\LoanProducts\ProductDocumentRequirementCatalog.cs`
- Create: `C:\Users\L-185-DEV\OneDrive - ENTERPRISE BANK INC\Desktop\Code\test\EBI_ALAS_V2_backend\src\Ebi.Alas.Api\Features\LoanProducts\ProductDocumentRequirementSeeder.cs`
- Modify: `C:\Users\L-185-DEV\OneDrive - ENTERPRISE BANK INC\Desktop\Code\test\EBI_ALAS_V2_backend\src\Ebi.Alas.Api\Infrastructure\Persistence\AlasDbContext.cs`
- Modify: `C:\Users\L-185-DEV\OneDrive - ENTERPRISE BANK INC\Desktop\Code\test\EBI_ALAS_V2_backend\src\Ebi.Alas.Api\Infrastructure\Background\AdminSeedHostedService.cs`
- Modify: `C:\Users\L-185-DEV\OneDrive - ENTERPRISE BANK INC\Desktop\Code\test\EBI_ALAS_V2_backend\src\Ebi.Alas.Api\Composition\ServiceRegistration.cs` (register seeder if not resolved from DI by concrete type)
- Test: `C:\Users\L-185-DEV\OneDrive - ENTERPRISE BANK INC\Desktop\Code\test\EBI_ALAS_V2_backend\tests\Ebi.Alas.Api.Tests\Features\LoanProducts\ProductDocumentRequirementSeederTests.cs`

**Interfaces:**
- Produces: `LoanProductDocumentRequirement` with `Id`, `ProductCode`, `Code`, `Description`; `ProductDocumentRequirementCatalog.Defaults` as `IReadOnlyList<(string ProductCode, string Code)>`; `ProductDocumentRequirementSeeder.SeedAsync(CancellationToken) → Task<bool>` (true if inserted).

- [ ] **Step 1: Write failing seeder test**

```csharp
using Ebi.Alas.Api.Features.LoanProducts;
using Ebi.Alas.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Ebi.Alas.Api.Tests.Features.LoanProducts;

public sealed class ProductDocumentRequirementSeederTests
{
    private static AlasDbContext Db() => new(
        new DbContextOptionsBuilder<AlasDbContext>()
            .UseInMemoryDatabase($"req-seed-{Guid.NewGuid():N}")
            .Options);

    [Fact]
    public async Task SeedAsync_InsertsCatalog_WhenEmpty()
    {
        await using var db = Db();
        var seeder = new ProductDocumentRequirementSeeder(db);

        var inserted = await seeder.SeedAsync(CancellationToken.None);

        Assert.True(inserted);
        Assert.True(await db.LoanProductDocumentRequirements.AnyAsync());
        Assert.Equal(
            ProductDocumentRequirementCatalog.Defaults.Count,
            await db.LoanProductDocumentRequirements.CountAsync());
    }

    [Fact]
    public async Task SeedAsync_IsIdempotent()
    {
        await using var db = Db();
        var seeder = new ProductDocumentRequirementSeeder(db);
        await seeder.SeedAsync(CancellationToken.None);

        var insertedAgain = await seeder.SeedAsync(CancellationToken.None);

        Assert.False(insertedAgain);
        Assert.Equal(
            ProductDocumentRequirementCatalog.Defaults.Count,
            await db.LoanProductDocumentRequirements.CountAsync());
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run (from backend root):
```powershell
dotnet test tests/Ebi.Alas.Api.Tests --filter FullyQualifiedName~ProductDocumentRequirementSeederTests
```
Expected: compile FAIL (`LoanProductDocumentRequirement` / seeder missing).

- [ ] **Step 3: Implement entity, catalog, seeder, DbContext**

`LoanProductDocumentRequirement.cs`:

```csharp
namespace Ebi.Alas.Api.Features.LoanProducts;

public sealed class LoanProductDocumentRequirement
{
    private LoanProductDocumentRequirement()
    {
        ProductCode = string.Empty;
        Code = string.Empty;
        Description = string.Empty;
    }

    public Guid Id { get; private set; }

    public string ProductCode { get; private set; }

    public string Code { get; private set; }

    public string Description { get; private set; }

    public static LoanProductDocumentRequirement Create(
        string productCode,
        string code,
        string description)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(productCode);
        ArgumentException.ThrowIfNullOrWhiteSpace(code);
        ArgumentException.ThrowIfNullOrWhiteSpace(description);
        return new LoanProductDocumentRequirement
        {
            Id = Guid.NewGuid(),
            ProductCode = productCode.Trim(),
            Code = code.Trim(),
            Description = description.Trim()
        };
    }
}
```

`ProductDocumentRequirementCatalog.cs` (codes from reference seed; descriptions = codes):

```csharp
namespace Ebi.Alas.Api.Features.LoanProducts;

public static class ProductDocumentRequirementCatalog
{
    public static readonly IReadOnlyList<(string ProductCode, string Code)> Defaults =
    [
        .. For("A16",
            "A1004", "A2008", "A2016", "A2017", "A2018", "A2019", "A2020", "A2021", "A2035", "A4001", "CCR38", "PIC02", "PIC03"),
        .. For("A17",
            "A1004", "A2008", "A2016", "A2017", "A2018", "A2019", "A2020", "A2021", "A2022", "A2027", "A2035", "A4001", "CCR38", "PIC02", "PIC03"),
        .. For("C02",
            "A1004", "A2008", "A2018", "A2019", "A2027", "A4001", "CCR38", "PIC02", "PIC03"),
        .. For("C21",
            "A1004", "A2008", "A2018", "A2019", "A2020", "A2021", "A2022", "A2023", "A2027", "A4001", "CCR38", "PIC02", "PIC03"),
        .. For("C23",
            "A1004", "A2008", "A2018", "A2019", "A2027", "A4001", "CCR38", "PIC02", "PIC03"),
        .. For("C35",
            "A1004", "A2008", "A2018", "A2019", "A2027", "A4001", "CCR38", "PIC02", "PIC03"),
    ];

    private static IEnumerable<(string ProductCode, string Code)> For(string productCode, params string[] codes) =>
        codes.Select(code => (productCode, code));
}
```

`ProductDocumentRequirementSeeder.cs`:

```csharp
using Ebi.Alas.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Ebi.Alas.Api.Features.LoanProducts;

public sealed class ProductDocumentRequirementSeeder(AlasDbContext db)
{
    public async Task<bool> SeedAsync(CancellationToken cancellationToken)
    {
        if (await db.LoanProductDocumentRequirements.AsNoTracking().AnyAsync(cancellationToken))
        {
            return false;
        }

        foreach (var (productCode, code) in ProductDocumentRequirementCatalog.Defaults)
        {
            db.LoanProductDocumentRequirements.Add(
                LoanProductDocumentRequirement.Create(productCode, code, code));
        }

        await db.SaveChangesAsync(cancellationToken);
        return true;
    }
}
```

In `AlasDbContext`:

```csharp
public DbSet<LoanProductDocumentRequirement> LoanProductDocumentRequirements => Set<LoanProductDocumentRequirement>();
```

and in `OnModelCreating`:

```csharp
modelBuilder.Entity<LoanProductDocumentRequirement>(b =>
{
    b.ToTable("LoanProductDocumentRequirements");
    b.HasKey(x => x.Id);
    b.Property(x => x.ProductCode).HasMaxLength(20).IsRequired();
    b.Property(x => x.Code).HasMaxLength(50).IsRequired();
    b.Property(x => x.Description).HasMaxLength(200).IsRequired();
    b.HasIndex(x => new { x.ProductCode, x.Code }).IsUnique();
});
```

In `AdminSeedHostedService.StartAsync`, after admin user seed:

```csharp
var requirementSeeder = scope.ServiceProvider.GetRequiredService<ProductDocumentRequirementSeeder>();
var seededRequirements = await requirementSeeder.SeedAsync(cancellationToken);
logger.LogInformation(
    seededRequirements
        ? "Product document requirements seeded from catalog."
        : "Product document requirements already present.");
```

Register `ProductDocumentRequirementSeeder` in `ServiceRegistration` next to other scoped services:

```csharp
services.AddScoped<Features.LoanProducts.ProductDocumentRequirementSeeder>();
```

- [ ] **Step 4: Run tests to verify they pass**

```powershell
dotnet test tests/Ebi.Alas.Api.Tests --filter FullyQualifiedName~ProductDocumentRequirementSeederTests
```
Expected: PASS (2 tests).

- [ ] **Step 5: Add EF migration + build**

```powershell
dotnet ef migrations add AddLoanProductDocumentRequirements --project src/Ebi.Alas.Api --startup-project src/Ebi.Alas.Api
dotnet build
```
Expected: migration file created under `Migrations/`; build succeeds with 0 warnings-as-errors.

- [ ] **Step 6: Commit**

```powershell
git add src/Ebi.Alas.Api/Features/LoanProducts src/Ebi.Alas.Api/Infrastructure src/Ebi.Alas.Api/Composition src/Ebi.Alas.Api/Migrations tests/Ebi.Alas.Api.Tests/Features/LoanProducts
git commit -m "feat: add loan product document requirement catalog and seed"
```

---

### Task 2: Backend — GET/PUT document-requirements API

**Covers:** [S4], [S6], [S7]

**Files:**
- Create: `...\Features\LoanProducts\DocumentRequirements\DocumentRequirementContracts.cs`
- Create: `...\Features\LoanProducts\DocumentRequirements\DocumentRequirementHandlers.cs`
- Create: `...\Features\LoanProducts\DocumentRequirements\DocumentRequirementEndpoints.cs`
- Modify: `...\Features\LoanProducts\LoanProductEndpoints.cs` (map the new endpoint group from `MapLoanProductEndpoints` or `PipelineConfiguration`)
- Test: `...\tests\Ebi.Alas.Api.Tests\Features\LoanProducts\DocumentRequirementHandlersTests.cs`

**Interfaces:**
- Consumes: `LoanProductDocumentRequirement`, `AlasDbContext`
- Produces:
  - `DocumentRequirementItemDto(string Code, string Description)`
  - `ReplaceDocumentRequirementsRequest(IReadOnlyList<DocumentRequirementItemDto> Items)`
  - `GetDocumentRequirementsHandler.HandleAsync(string code, CancellationToken) → Task<IReadOnlyList<DocumentRequirementItemDto>>`
  - `ReplaceDocumentRequirementsHandler.HandleAsync(string code, ReplaceDocumentRequirementsRequest request, CancellationToken) → Task<IReadOnlyList<DocumentRequirementItemDto>>`

- [ ] **Step 1: Write failing handler tests**

```csharp
using Ebi.Alas.Api.Features.LoanProducts;
using Ebi.Alas.Api.Features.LoanProducts.DocumentRequirements;
using Ebi.Alas.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Ebi.Alas.Api.Tests.Features.LoanProducts;

public sealed class DocumentRequirementHandlersTests
{
    private static AlasDbContext Db() => new(
        new DbContextOptionsBuilder<AlasDbContext>()
            .UseInMemoryDatabase($"req-api-{Guid.NewGuid():N}")
            .Options);

    private static async Task SeedProductAsync(AlasDbContext db, string code)
    {
        db.LoanProducts.Add(LoanProduct.Create(code, code, 0.01m, 1, 30, DateTimeOffset.UtcNow));
        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task Replace_ReplacesFullList()
    {
        await using var db = Db();
        await SeedProductAsync(db, "A16");
        db.LoanProductDocumentRequirements.Add(
            LoanProductDocumentRequirement.Create("A16", "OLD", "OLD"));
        await db.SaveChangesAsync();
        var handler = new ReplaceDocumentRequirementsHandler(db);

        var result = await handler.HandleAsync(
            "A16",
            new ReplaceDocumentRequirementsRequest(
                [new DocumentRequirementItemDto("A1004", "A1004"),
                 new DocumentRequirementItemDto("PIC02", "Photo ID")]),
            CancellationToken.None);

        Assert.Equal(2, result.Count);
        Assert.Equal("Photo ID", result.Single(i => i.Code == "PIC02").Description);
        Assert.DoesNotContain(db.LoanProductDocumentRequirements, r => r.Code == "OLD");
    }

    [Fact]
    public async Task Replace_RejectsDuplicateCodes()
    {
        await using var db = Db();
        await SeedProductAsync(db, "A16");
        var handler = new ReplaceDocumentRequirementsHandler(db);

        await Assert.ThrowsAsync<ArgumentException>(() => handler.HandleAsync(
            "A16",
            new ReplaceDocumentRequirementsRequest(
                [new DocumentRequirementItemDto("A1004", "A"),
                 new DocumentRequirementItemDto("A1004", "B")]),
            CancellationToken.None));
    }

    [Fact]
    public async Task Get_ReturnsNotFound_WhenProductMissing()
    {
        await using var db = Db();
        var handler = new GetDocumentRequirementsHandler(db);

        await Assert.ThrowsAsync<Ebi.Alas.Api.Composition.Errors.NotFoundException>(
            () => handler.HandleAsync("NOPE", CancellationToken.None));
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

```powershell
dotnet test tests/Ebi.Alas.Api.Tests --filter FullyQualifiedName~DocumentRequirementHandlersTests
```
Expected: compile FAIL (types missing).

- [ ] **Step 3: Implement contracts, handlers, endpoints**

`DocumentRequirementContracts.cs`:

```csharp
namespace Ebi.Alas.Api.Features.LoanProducts.DocumentRequirements;

public sealed record DocumentRequirementItemDto(string Code, string Description);

public sealed record ReplaceDocumentRequirementsRequest(
    IReadOnlyList<DocumentRequirementItemDto> Items);
```

`DocumentRequirementHandlers.cs`:

```csharp
using Ebi.Alas.Api.Composition.Errors;
using Ebi.Alas.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Ebi.Alas.Api.Features.LoanProducts.DocumentRequirements;

public sealed class GetDocumentRequirementsHandler(AlasDbContext db)
{
    public async Task<IReadOnlyList<DocumentRequirementItemDto>> HandleAsync(
        string code,
        CancellationToken cancellationToken)
    {
        var normalized = NormalizeCode(code);
        var exists = await db.LoanProducts.AsNoTracking()
            .AnyAsync(p => p.Code == normalized, cancellationToken);
        if (!exists)
        {
            throw new NotFoundException("Loan product", normalized);
        }

        return await db.LoanProductDocumentRequirements.AsNoTracking()
            .Where(r => r.ProductCode == normalized)
            .OrderBy(r => r.Code)
            .Select(r => new DocumentRequirementItemDto(r.Code, r.Description))
            .ToListAsync(cancellationToken);
    }

    private static string NormalizeCode(string code) =>
        string.IsNullOrWhiteSpace(code) ? string.Empty : code.Trim();
}

public sealed class ReplaceDocumentRequirementsHandler(AlasDbContext db)
{
    public const int MaxItems = 50;

    public async Task<IReadOnlyList<DocumentRequirementItemDto>> HandleAsync(
        string code,
        ReplaceDocumentRequirementsRequest request,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var normalized = string.IsNullOrWhiteSpace(code) ? string.Empty : code.Trim();
        var product = await db.LoanProducts.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Code == normalized, cancellationToken)
            ?? throw new NotFoundException("Loan product", normalized);

        var items = request.Items ?? [];
        if (items.Count > MaxItems)
        {
            throw new ArgumentException($"At most {MaxItems} document requirements are allowed.");
        }

        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var item in items)
        {
            if (string.IsNullOrWhiteSpace(item.Code) || item.Code.Trim().Length > 50)
            {
                throw new ArgumentException("Each document requirement code is required and must be 50 characters or fewer.");
            }
            if (string.IsNullOrWhiteSpace(item.Description) || item.Description.Trim().Length > 200)
            {
                throw new ArgumentException("Each document requirement description is required and must be 200 characters or fewer.");
            }
            if (!seen.Add(item.Code.Trim()))
            {
                throw new ArgumentException($"Duplicate document requirement code '{item.Code.Trim()}'.");
            }
        }

        var existing = await db.LoanProductDocumentRequirements
            .Where(r => r.ProductCode == product.Code)
            .ToListAsync(cancellationToken);
        db.LoanProductDocumentRequirements.RemoveRange(existing);

        foreach (var item in items)
        {
            db.LoanProductDocumentRequirements.Add(
                LoanProductDocumentRequirement.Create(product.Code, item.Code, item.Description));
        }

        await db.SaveChangesAsync(cancellationToken);

        return items
            .Select(i => new DocumentRequirementItemDto(i.Code.Trim(), i.Description.Trim()))
            .OrderBy(i => i.Code, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }
}
```

`DocumentRequirementEndpoints.cs` (map under existing loan-products group):

```csharp
using Ebi.Alas.Api.Composition.Errors;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;

namespace Ebi.Alas.Api.Features.LoanProducts.DocumentRequirements;

public static class DocumentRequirementEndpoints
{
    public static void MapDocumentRequirementEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/loan-products/{code}/document-requirements")
            .WithTags("LoanProducts");

        group.MapGet("/", async (
            string code,
            GetDocumentRequirementsHandler handler,
            CancellationToken cancellationToken) =>
        {
            var items = await handler.HandleAsync(code, cancellationToken);
            return Results.Ok(items);
        })
        .RequireAuthorization();

        group.MapPut("/", async (
            string code,
            ReplaceDocumentRequirementsRequest request,
            ReplaceDocumentRequirementsHandler handler,
            CancellationToken cancellationToken) =>
        {
            try
            {
                var items = await handler.HandleAsync(code, request, cancellationToken);
                return Results.Ok(items);
            }
            catch (ArgumentException ex)
            {
                return Results.Problem(
                    statusCode: StatusCodes.Status400BadRequest,
                    title: "Bad Request",
                    detail: ex.Message);
            }
        })
        .RequireAuthorization(new AuthorizeAttribute { Roles = "Admin" })
        .RequireRateLimiting("write");
    }
}
```

Call `endpoints.MapDocumentRequirementEndpoints()` from the same place `MapLoanProductEndpoints` is registered (`PipelineConfiguration` or `LoanProductEndpoints` host).

- [ ] **Step 4: Run handler tests**

```powershell
dotnet test tests/Ebi.Alas.Api.Tests --filter FullyQualifiedName~DocumentRequirementHandlersTests
```
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/Ebi.Alas.Api/Features/LoanProducts/DocumentRequirements src/Ebi.Alas.Api/Features/LoanProducts/LoanProductEndpoints.cs src/Ebi.Alas.Api/Composition tests/Ebi.Alas.Api.Tests/Features/LoanProducts
git commit -m "feat: expose loan product document requirement read and replace API"
```

---

### Task 3: Backend — checklist item `Code` + copy requirements on submit

**Covers:** [S3], [S4], [S7], [S9]

**Files:**
- Modify: `...\Features\Documents\DocumentChecklistItem.cs`
- Modify: `...\Infrastructure\Persistence\AlasDbContext.cs`
- Modify: `...\Features\LoanApplications\Documents\ChecklistDocumentEndpoints.cs`
- Modify: `...\Features\LoanApplications\Submit\SubmitLoanHandler.cs`
- Test: `...\tests\Ebi.Alas.Api.Tests\Features\LoanApplications\SubmitLoanDocumentChecklistTests.cs`
- Migration: `AddDocumentChecklistItemCode`

**Interfaces:**
- Consumes: `LoanProductDocumentRequirement` catalog for `line.ProductCode`
- Produces: `DocumentChecklistItem.Create(Guid loanApplicationId, string code, string name, DateTimeOffset now)`; checklist DTO `IdCode` = item `Code`.

- [ ] **Step 1: Write failing submit checklist test**

```csharp
using Ebi.Alas.Api.Composition.Auth;
using Ebi.Alas.Api.Features.LoanApplications;
using Ebi.Alas.Api.Features.LoanApplications.Submit;
using Ebi.Alas.Api.Features.LoanProducts;
using Ebi.Alas.Api.Features.SystemSettings;
using Ebi.Alas.Api.Features.Users.Domain;
using Ebi.Alas.Api.Features.Workflow;
using Ebi.Alas.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Ebi.Alas.Api.Tests.Features.LoanApplications;

public sealed class SubmitLoanDocumentChecklistTests
{
    private static AlasDbContext Db() => new(
        new DbContextOptionsBuilder<AlasDbContext>()
            .UseInMemoryDatabase($"submit-req-{Guid.NewGuid():N}")
            .Options);

    private static SubmitLoanHandler Handler(AlasDbContext db) => new(
        db,
        new Ebi.Alas.Api.Features.LoanComputation.LoanComputationService(),
        new WorkflowQueueService(db, TimeProvider.System),
        new WorkflowConfiguration(
            Options.Create(new WorkflowOptions()).ToMonitor(),
            new FakeSettingsStore(new SettingSnapshot(true, DateTime.UtcNow, "Admin"))),
        new ApplicationNumberGenerator(db),
        new ApplicationArrivalNotifier(/* use the same collaborators as existing submit tests; if notifier needs fakes, mirror SubmitLoanBranchTests */),
        TimeProvider.System);

    [Fact]
    public async Task Submit_CreatesChecklistItems_FromProductRequirements()
    {
        await using var db = Db();
        db.LoanProductDocumentRequirements.Add(
            LoanProductDocumentRequirement.Create("A16", "A1004", "A1004"));
        db.LoanProductDocumentRequirements.Add(
            LoanProductDocumentRequirement.Create("A16", "PIC02", "Photo ID"));
        await db.SaveChangesAsync();

        var handler = Handler(db);
        var caller = new CallerContext(Guid.NewGuid(), UserRole.Encoder, "BR-A");
        var request = new SubmitLoanApplicationsRequest(
            "G-1",
            "Client",
            "BR-A",
            LoanType.New,
            [new SubmitLoanLine("A16", "A16 - Salary", 1000m, 30, 0.05m)]);

        await handler.HandleAsync(request, caller, CancellationToken.None);

        var loanId = db.LoanApplications.Single().Id;
        var items = await db.DocumentChecklistItems
            .Where(i => i.LoanApplicationId == loanId)
            .ToListAsync();
        Assert.Equal(2, items.Count);
        Assert.Contains(items, i => i.Code == "A1004" && i.Name == "A1004");
        Assert.Contains(items, i => i.Code == "PIC02" && i.Name == "Photo ID");
    }

    [Fact]
    public async Task Submit_WithoutRequirements_CreatesNoChecklistItems()
    {
        await using var db = Db();
        var handler = Handler(db);
        var caller = new CallerContext(Guid.NewGuid(), UserRole.Encoder, "BR-A");
        var request = new SubmitLoanApplicationsRequest(
            "G-1",
            "Client",
            "BR-A",
            LoanType.New,
            [new SubmitLoanLine("A16", "A16 - Salary", 1000m, 30, 0.05m)]);

        await handler.HandleAsync(request, caller, CancellationToken.None);

        Assert.Empty(db.DocumentChecklistItems);
    }
}
```

Note: if `ApplicationArrivalNotifier` cannot be constructed the same way as `SubmitLoanBranchTests`, copy that test’s exact handler factory and only add the two new cases.

- [ ] **Step 2: Run test to verify it fails**

```powershell
dotnet test tests/Ebi.Alas.Api.Tests --filter FullyQualifiedName~SubmitLoanDocumentChecklistTests
```
Expected: FAIL (no items created / `Code` missing).

- [ ] **Step 3: Implement `Code` + submit copy**

`DocumentChecklistItem.cs` — add `Code` and change factory:

```csharp
public string Code { get; private set; } = string.Empty;

public static DocumentChecklistItem Create(
    Guid loanApplicationId,
    string code,
    string name,
    DateTimeOffset now)
{
    ArgumentException.ThrowIfNullOrWhiteSpace(code);
    ArgumentException.ThrowIfNullOrWhiteSpace(name);
    return new DocumentChecklistItem
    {
        Id = Guid.NewGuid(),
        LoanApplicationId = loanApplicationId,
        Code = code.Trim(),
        Name = name.Trim(),
        IsSubmitted = false,
        IsVerified = false,
        Flag = DocumentFlag.Incomplete
    };
}
```

Update any existing `Create(loanId, name, now)` call sites to pass `code: name` if they only have a name.

`AlasDbContext` DocumentChecklistItem config:

```csharp
b.Property(x => x.Code).HasMaxLength(50).IsRequired();
b.Property(x => x.Name).HasMaxLength(200).IsRequired();
```

`ChecklistDocumentEndpoints` projection:

```csharp
.Select(d => new { d.Code, d.Name, d.IsSubmitted, d.IsVerified })
// ...
IdCode: item.Code,
ChecklistDescription: item.Name,
```

`SubmitLoanHandler` after `db.LoanApplications.Add(loan)` (before `SaveChangesAsync`):

```csharp
var requirementCodes = await db.LoanProductDocumentRequirements.AsNoTracking()
    .Where(r => r.ProductCode == line.ProductCode)
    .OrderBy(r => r.Code)
    .Select(r => new { r.Code, r.Description })
    .ToListAsync(cancellationToken);

foreach (var requirement in requirementCodes)
{
    db.DocumentChecklistItems.Add(DocumentChecklistItem.Create(
        loan.Id,
        requirement.Code,
        requirement.Description,
        now));
}
```

If `DocumentChecklistItem.Create` is used elsewhere with the old 3-arg signature, update those call sites in the same change.

- [ ] **Step 4: Run tests**

```powershell
dotnet test tests/Ebi.Alas.Api.Tests --filter "FullyQualifiedName~SubmitLoanDocumentChecklistTests|FullyQualifiedName~SubmitLoan"
```
Expected: PASS (new tests + existing submit tests).

- [ ] **Step 5: Migration + build**

```powershell
dotnet ef migrations add AddDocumentChecklistItemCode --project src/Ebi.Alas.Api --startup-project src/Ebi.Alas.Api
dotnet build
```
Expected: migration adds `Code` column; build clean.

- [ ] **Step 6: Commit**

```powershell
git add src/Ebi.Alas.Api tests/Ebi.Alas.Api.Tests
git commit -m "feat: create loan document checklist items from product requirements"
```

---

### Task 4: Frontend — document-requirements API client + hooks

**Covers:** [S4], [S5]

**Files:**
- Modify: `C:\Users\L-185-DEV\OneDrive - ENTERPRISE BANK INC\Desktop\Code\test\alas_v2\src\features\admin\loan-products\api\loan-product-types.ts`
- Modify: `...\api\loan-products.ts`
- Modify: `...\api\loan-product-queries.ts`
- Modify: `...\hooks\use-loan-products.ts`
- Test: `...\api\loan-products.document-requirements.spec.ts`

**Interfaces:**
- Produces:
  - `DocumentRequirementItem { code: string; description: string }`
  - `getLoanProductDocumentRequirements(code: string): Promise<DocumentRequirementItem[]>`
  - `replaceLoanProductDocumentRequirements(code: string, items: DocumentRequirementItem[]): Promise<DocumentRequirementItem[]>`
  - `loanProductKeys.documentRequirements(code: string)`
  - `useLoanProductDocumentRequirements(code: string | null)`
  - `useReplaceLoanProductDocumentRequirements()`

- [ ] **Step 1: Write failing client tests**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/src/shared/lib/apiClient', () => ({
  apiClient: { get: vi.fn(), put: vi.fn() },
}))

const { apiClient } = await import('@/src/shared/lib/apiClient')
const {
  getLoanProductDocumentRequirements,
  replaceLoanProductDocumentRequirements,
} = await import('./loan-products')

describe('document requirements client', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset()
    vi.mocked(apiClient.put).mockReset()
  })

  it('gets requirements as a bare array', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [{ code: 'A1004', description: 'A1004' }],
    })
    await expect(getLoanProductDocumentRequirements('A16')).resolves.toEqual([
      { code: 'A1004', description: 'A1004' },
    ])
    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/loan-products/A16/document-requirements',
    )
  })

  it('puts the full item list', async () => {
    vi.mocked(apiClient.put).mockResolvedValue({
      data: [{ code: 'PIC02', description: 'Photo ID' }],
    })
    const result = await replaceLoanProductDocumentRequirements('A16', [
      { code: 'PIC02', description: 'Photo ID' },
    ])
    expect(result).toEqual([{ code: 'PIC02', description: 'Photo ID' }])
    expect(apiClient.put).toHaveBeenCalledWith(
      '/api/loan-products/A16/document-requirements',
      { items: [{ code: 'PIC02', description: 'Photo ID' }] },
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```powershell
npx vitest run src/features/admin/loan-products/api/loan-products.document-requirements.spec.ts
```
Expected: FAIL (exports missing).

- [ ] **Step 3: Implement types, client, keys, hooks**

`loan-product-types.ts` add:

```ts
export interface DocumentRequirementItem {
  code: string
  description: string
}

export interface ReplaceDocumentRequirementsPayload {
  items: DocumentRequirementItem[]
}
```

`loan-products.ts` add:

```ts
import type { DocumentRequirementItem } from './loan-product-types'

export async function getLoanProductDocumentRequirements(
  code: string,
): Promise<DocumentRequirementItem[]> {
  const res = await apiClient.get<DocumentRequirementItem[]>(
    `/api/loan-products/${encodeURIComponent(code)}/document-requirements`,
  )
  return res.data
}

export async function replaceLoanProductDocumentRequirements(
  code: string,
  items: DocumentRequirementItem[],
): Promise<DocumentRequirementItem[]> {
  const res = await apiClient.put<DocumentRequirementItem[]>(
    `/api/loan-products/${encodeURIComponent(code)}/document-requirements`,
    { items },
  )
  return res.data
}
```

`loan-product-queries.ts` add key:

```ts
documentRequirements: (code: string) =>
  ['loan-products', 'detail', code, 'document-requirements'] as const,
```

`use-loan-products.ts` add:

```ts
export function useLoanProductDocumentRequirements(code: string | null) {
  return useQuery({
    queryKey:
      code !== null
        ? loanProductKeys.documentRequirements(code)
        : ['loan-products', 'document-requirements', 'disabled'],
    queryFn: () => getLoanProductDocumentRequirements(code!),
    enabled: code !== null && code.trim().length > 0,
    staleTime: LOAN_PRODUCTS_STALE_TIME,
  })
}

export function useReplaceLoanProductDocumentRequirements() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      code,
      items,
    }: {
      code: string
      items: DocumentRequirementItem[]
    }) => replaceLoanProductDocumentRequirements(code, items),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: loanProductKeys.documentRequirements(variables.code),
      })
    },
  })
}
```

Import the new client functions from `./loan-products` / `./loan-product-types` as needed.

- [ ] **Step 4: Run tests**

```powershell
npx vitest run src/features/admin/loan-products/api/loan-products.document-requirements.spec.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/features/admin/loan-products/api src/features/admin/loan-products/hooks
git commit -m "feat: add document requirements API client and hooks"
```

---

### Task 5: Frontend — product edit sheet document-requirements editor

**Covers:** [S5], [S9]

**Files:**
- Create: `...\components\product-document-requirements.tsx`
- Create: `...\components\product-document-requirements.spec.tsx`
- Modify: `...\components\product-edit-sheet.tsx`
- Modify: `...\components\products-table.tsx`

**Interfaces:**
- Consumes: `DocumentRequirementItem`, `useLoanProductDocumentRequirements`, `useReplaceLoanProductDocumentRequirements`
- Produces: `ProductDocumentRequirementsEditor` with `value: DocumentRequirementItem[]`, `onChange(next: DocumentRequirementItem[]): void`, `disabled?: boolean`.

- [ ] **Step 1: Write failing editor tests**

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { ProductDocumentRequirementsEditor } from './product-document-requirements'

describe('ProductDocumentRequirementsEditor', () => {
  it('adds and removes rows', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <ProductDocumentRequirementsEditor
        value={[{ code: 'A1004', description: 'A1004' }]}
        onChange={onChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: /add requirement/i }))
    expect(onChange).toHaveBeenLastCalledWith([
      { code: 'A1004', description: 'A1004' },
      { code: '', description: '' },
    ])

    await user.click(screen.getByRole('button', { name: /remove A1004/i }))
    expect(onChange).toHaveBeenLastCalledWith([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
npx vitest run src/features/admin/loan-products/components/product-document-requirements.spec.tsx
```
Expected: FAIL (module missing).

- [ ] **Step 3: Implement editor + wire into sheet**

`product-document-requirements.tsx`:

```tsx
import { Plus, Trash } from '@phosphor-icons/react'
import { Button } from '@/src/shared/ui/primitives/button'
import { Input } from '@/src/shared/ui/primitives/input'
import { Label } from '@/src/shared/ui/primitives/label'
import type { DocumentRequirementItem } from '../api/loan-product-types'

interface ProductDocumentRequirementsEditorProps {
  value: DocumentRequirementItem[]
  onChange: (next: DocumentRequirementItem[]) => void
  disabled?: boolean
}

export function ProductDocumentRequirementsEditor({
  value,
  onChange,
  disabled = false,
}: ProductDocumentRequirementsEditorProps) {
  const updateAt = (index: number, patch: Partial<DocumentRequirementItem>) => {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  return (
    <div className="space-y-3">
      {value.length === 0 && (
        <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
          No document requirements configured for this product.
        </p>
      )}
      {value.map((row, index) => (
        <div key={index} className="grid grid-cols-[1fr_2fr_auto] items-end gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Code</Label>
            <Input
              value={row.code}
              disabled={disabled}
              maxLength={50}
              onChange={(e) => updateAt(index, { code: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Input
              value={row.description}
              disabled={disabled}
              maxLength={200}
              onChange={(e) => updateAt(index, { description: e.target.value })}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            aria-label={`Remove ${row.code || `requirement ${index + 1}`}`}
            onClick={() => onChange(value.filter((_, i) => i !== index))}
          >
            <Trash size={14} />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || value.length >= 50}
        onClick={() => onChange([...value, { code: '', description: '' }])}
      >
        <Plus size={14} /> Add requirement
      </Button>
    </div>
  )
}
```

In `product-edit-sheet.tsx`:

1. Add local state `requirements: DocumentRequirementItem[]`.
2. Load with `useLoanProductDocumentRequirements(product?.code ?? null)` in a `useEffect` reset when product changes.
3. Render section after fees:

```tsx
<section className="space-y-4">
  <SectionHeading
    title="Document Requirements"
    description="Checklist items created on each new loan for this product. Codes stay stable for remarks and pushback."
  />
  <ProductDocumentRequirementsEditor
    value={requirements}
    onChange={setRequirements}
    disabled={!canEdit}
  />
</section>
```

4. On submit, after policy save succeeds, call replace mutation:

```ts
const replaceRequirements = useReplaceLoanProductDocumentRequirements()
// inside submit:
const ok = await onSave(product.code, values)
if (!ok) return
await replaceRequirements.mutateAsync({
  code: product.code,
  items: requirements.filter((r) => r.code.trim().length > 0),
})
onClose()
```

Validate before save: no blank codes; no duplicate codes (case-insensitive); if invalid, show the same error style as `NumberField` or a short destructive message and do not call the API.

`products-table.tsx` `handleSave` stays policy-only (`UpdateLoanProductPayload`). Requirements save lives in the sheet via the replace mutation so Task 4 hooks are the only transport.

- [ ] **Step 4: Run tests**

```powershell
npx vitest run src/features/admin/loan-products
npx tsc -b
```
Expected: PASS / typecheck exit 0.

- [ ] **Step 5: Commit**

```powershell
git add src/features/admin/loan-products
git commit -m "feat: configure loan product document requirements in admin edit sheet"
```

---

### Task 6: End-to-end verification

**Covers:** [S9]

**Files:** none (verification only)

- [ ] **Step 1: Backend full tests + build**

```powershell
dotnet test
dotnet build
```
Expected: all tests PASS; build 0 errors.

- [ ] **Step 2: Frontend quality gates**

```powershell
pnpm test
pnpm typecheck
pnpm architecture:check
```
Expected: all green (or document any pre-existing unrelated failure).

- [ ] **Step 3: Manual contract check (if API is running)**

1. `GET /api/loan-products/A16/document-requirements` → non-empty seeded list.
2. `PUT` same route as Admin with one custom description → GET reflects it.
3. Submit a loan for A16 → `GET /api/loans/{id}/checklist-documents` lists those codes with `uploadStatus` “No uploaded documents” until submitted.

If the API is not running, state that runtime verification was not performed.

- [ ] **Step 4: Final commit only if verification produced fixes**

```powershell
git status
```
If dirty from verification fixes, commit those; otherwise no commit.

---

## Self-review notes

- Spec coverage: S1 problem (context), S2 approach (plan header), S3 data (Tasks 1, 3), S4 API (Tasks 2, 3), S5 FE (Tasks 4, 5), S6 structure (Tasks 1–3), S7 tests (all tasks), S8 out of scope (not implemented), S9 acceptance (Task 6).
- Types are consistent: `DocumentRequirementItemDto` / `DocumentRequirementItem` use `Code`/`code` + `Description`/`description`.
- Checklist factory signature change is centralized in Task 3.
- `FakeSettingsStore` / `ApplicationArrivalNotifier` construction must match existing `SubmitLoanBranchTests` helpers in the live test project — copy that factory rather than inventing new fakes.
