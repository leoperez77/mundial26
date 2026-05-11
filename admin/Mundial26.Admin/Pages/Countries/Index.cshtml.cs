using Dapper;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Mundial26.Admin.Data;
using Mundial26.Admin.Models;

namespace Mundial26.Admin.Pages.Countries;

public class IndexModel : PageModel
{
    private readonly SqlConnectionFactory _factory;

    public IndexModel(SqlConnectionFactory factory)
    {
        _factory = factory;
    }

    public IReadOnlyList<Country> Items { get; private set; } = Array.Empty<Country>();
    public int PagesFilled => Items.Count(c => c.Page.HasValue);
    public int GroupsFilled => Items.Count(c => !string.IsNullOrWhiteSpace(c.Group));

    public async Task OnGetAsync()
    {
        await using var conn = _factory.Create();
        var rows = await conn.QueryAsync<Country>(
            @"SELECT Code, Name, Page, [Group], StickerCount, SortOrder
              FROM dbo.Countries
              ORDER BY SortOrder;");
        Items = rows.ToList();
    }
}
