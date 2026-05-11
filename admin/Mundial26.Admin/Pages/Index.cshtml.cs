using Dapper;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Mundial26.Admin.Data;

namespace Mundial26.Admin.Pages;

public class IndexModel : PageModel
{
    private readonly SqlConnectionFactory _factory;

    public IndexModel(SqlConnectionFactory factory)
    {
        _factory = factory;
    }

    public int CountriesTotal { get; private set; }
    public int PagesMissing { get; private set; }
    public int GroupsMissing { get; private set; }
    public int StickersTotal { get; private set; }
    public int SpecialsTotal { get; private set; }

    public async Task OnGetAsync()
    {
        await using var conn = _factory.Create();
        const string sql = @"
            SELECT COUNT(*) AS CountriesTotal,
                   SUM(CASE WHEN Page IS NULL THEN 1 ELSE 0 END) AS PagesMissing,
                   SUM(CASE WHEN [Group] IS NULL THEN 1 ELSE 0 END) AS GroupsMissing
              FROM dbo.Countries;
            SELECT COUNT(*) FROM dbo.Stickers;
            SELECT COUNT(*) FROM dbo.Specials;";

        using var grid = await conn.QueryMultipleAsync(sql);
        var summary = await grid.ReadSingleAsync();
        CountriesTotal = (int)summary.CountriesTotal;
        PagesMissing = (int)(summary.PagesMissing ?? 0);
        GroupsMissing = (int)(summary.GroupsMissing ?? 0);
        StickersTotal = await grid.ReadSingleAsync<int>();
        SpecialsTotal = await grid.ReadSingleAsync<int>();
    }
}
