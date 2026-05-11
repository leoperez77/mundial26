using Dapper;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Mundial26.Admin.Data;
using Mundial26.Admin.Models;

namespace Mundial26.Admin.Pages.Specials;

public class IndexModel : PageModel
{
    public static readonly (string Key, string Title)[] Sections = new[]
    {
        ("intro", "Intro"),
        ("fifa_world_cup", "FIFA World Cup"),
        ("host_countries", "Host Countries"),
        ("world_cup_history", "World Cup History"),
        ("extra_stickers_purple", "Extra Stickers (Purple)"),
    };

    private readonly SqlConnectionFactory _factory;

    public IndexModel(SqlConnectionFactory factory)
    {
        _factory = factory;
    }

    [BindProperty]
    public List<SpecialInput> Items { get; set; } = new();

    public bool Saved { get; private set; }

    public async Task OnGetAsync()
    {
        await using var conn = _factory.Create();
        var rows = (await conn.QueryAsync<Special>(
            @"SELECT Id, Section, Code, Name, SortOrder
              FROM dbo.Specials
              ORDER BY Section, SortOrder;")).ToList();

        Items = rows.Select(r => new SpecialInput
        {
            Id = r.Id,
            Section = r.Section,
            Code = r.Code,
            Name = r.Name,
        }).ToList();
    }

    public async Task<IActionResult> OnPostAsync()
    {
        if (!ModelState.IsValid) return Page();

        await using var conn = _factory.Create();
        await conn.OpenAsync();
        await using var tx = (Microsoft.Data.SqlClient.SqlTransaction)await conn.BeginTransactionAsync();
        try
        {
            await conn.ExecuteAsync(
                @"UPDATE dbo.Specials
                  SET Code = @Code, Name = @Name
                  WHERE Id = @Id;",
                Items.Select(i => new { i.Id, i.Code, i.Name }),
                tx);
            await tx.CommitAsync();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }

        TempData["Saved"] = "true";
        return RedirectToPage();
    }

    public IEnumerable<SpecialInput> ItemsFor(string section) =>
        Items.Where(i => i.Section == section);

    public int IndexOf(SpecialInput item) => Items.IndexOf(item);

    public class SpecialInput
    {
        public int Id { get; set; }
        public string Section { get; set; } = "";
        public string Code { get; set; } = "";
        public string Name { get; set; } = "";
    }
}
