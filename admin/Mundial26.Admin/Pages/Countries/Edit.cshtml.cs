using Dapper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Mundial26.Admin.Data;
using Mundial26.Admin.Models;

namespace Mundial26.Admin.Pages.Countries;

public class EditModel : PageModel
{
    private static readonly string[] StickerTypes = { "emblem", "team_photo", "player" };

    private readonly SqlConnectionFactory _factory;

    public EditModel(SqlConnectionFactory factory)
    {
        _factory = factory;
    }

    [BindProperty(SupportsGet = true)]
    public string Code { get; set; } = "";

    [BindProperty]
    public CountryInput Country { get; set; } = new();

    [BindProperty]
    public List<StickerInput> Stickers { get; set; } = new();

    public IReadOnlyList<string> Types => StickerTypes;

    public async Task<IActionResult> OnGetAsync()
    {
        if (string.IsNullOrWhiteSpace(Code)) return RedirectToPage("Index");

        await using var conn = _factory.Create();
        var country = await conn.QuerySingleOrDefaultAsync<Country>(
            @"SELECT Code, Name, Page, [Group], StickerCount, SortOrder
              FROM dbo.Countries WHERE Code = @Code;",
            new { Code });

        if (country is null) return NotFound();

        var stickers = (await conn.QueryAsync<Sticker>(
            @"SELECT CountryCode, Number, Name, Type
              FROM dbo.Stickers
              WHERE CountryCode = @Code
              ORDER BY Number;",
            new { Code })).ToList();

        Country = new CountryInput
        {
            Code = country.Code,
            Name = country.Name,
            Page = country.Page,
            Group = country.Group,
        };
        Stickers = stickers.Select(s => new StickerInput
        {
            Number = s.Number,
            Name = s.Name,
            Type = s.Type,
        }).ToList();

        return Page();
    }

    public async Task<IActionResult> OnPostAsync()
    {
        if (string.IsNullOrWhiteSpace(Code)) return RedirectToPage("Index");

        if (Country.Group is { } g)
        {
            Country.Group = string.IsNullOrWhiteSpace(g) ? null : g.Trim().ToUpperInvariant();
            if (Country.Group is { } gv && (gv.Length != 1 || gv[0] < 'A' || gv[0] > 'L'))
                ModelState.AddModelError(nameof(Country) + ".Group", "Group must be a single letter A–L.");
        }

        foreach (var s in Stickers)
        {
            if (string.IsNullOrWhiteSpace(s.Name))
                ModelState.AddModelError($"Stickers[{s.Number - 1}].Name", "Name is required.");
            if (!StickerTypes.Contains(s.Type))
                ModelState.AddModelError($"Stickers[{s.Number - 1}].Type", "Invalid type.");
        }

        if (!ModelState.IsValid) return Page();

        await using var conn = _factory.Create();
        await conn.OpenAsync();
        await using var tx = (Microsoft.Data.SqlClient.SqlTransaction)await conn.BeginTransactionAsync();
        try
        {
            await conn.ExecuteAsync(
                @"UPDATE dbo.Countries
                  SET Name = @Name, Page = @Page, [Group] = @Group
                  WHERE Code = @Code;",
                new { Code, Country.Name, Country.Page, Country.Group },
                tx);

            await conn.ExecuteAsync(
                @"UPDATE dbo.Stickers
                  SET Name = @Name, Type = @Type
                  WHERE CountryCode = @CountryCode AND Number = @Number;",
                Stickers.Select(s => new
                {
                    CountryCode = Code,
                    s.Number,
                    s.Name,
                    s.Type,
                }),
                tx);

            await tx.CommitAsync();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }

        TempData["SavedCode"] = Code;
        return RedirectToPage("Index");
    }

    public class CountryInput
    {
        public string Code { get; set; } = "";
        public string Name { get; set; } = "";
        public int? Page { get; set; }
        public string? Group { get; set; }
    }

    public class StickerInput
    {
        public int Number { get; set; }
        public string Name { get; set; } = "";
        public string Type { get; set; } = "player";
    }
}
