using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;
using Dapper;
using Mundial26.Admin.Data;
using Mundial26.Admin.Models;

namespace Mundial26.Admin.Services;

public class JsonExporter
{
    private readonly SqlConnectionFactory _factory;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<JsonExporter> _log;

    public JsonExporter(SqlConnectionFactory factory, IWebHostEnvironment env, ILogger<JsonExporter> log)
    {
        _factory = factory;
        _env = env;
        _log = log;
    }

    public async Task<string> ExportAsync()
    {
        await using var conn = _factory.Create();

        var meta = await conn.QuerySingleOrDefaultAsync<AlbumMeta>(
            "SELECT TOP 1 * FROM dbo.AlbumMeta WHERE Id = 1;")
            ?? throw new InvalidOperationException(
                "AlbumMeta is empty. Run the seed (`dotnet run -- --seed`) first.");

        var countries = (await conn.QueryAsync<Country>(
            @"SELECT Code, Name, Page, [Group], StickerCount, SortOrder
              FROM dbo.Countries
              ORDER BY SortOrder;")).ToList();

        var stickers = (await conn.QueryAsync<Sticker>(
            @"SELECT CountryCode, Number, Name, Type
              FROM dbo.Stickers
              ORDER BY CountryCode, Number;")).ToList();

        var specials = (await conn.QueryAsync<Special>(
            @"SELECT Id, Section, Code, Name, SortOrder
              FROM dbo.Specials
              ORDER BY Section, SortOrder;")).ToList();

        var stickersByCountry = stickers
            .GroupBy(s => s.CountryCode)
            .ToDictionary(g => g.Key, g => g.OrderBy(s => s.Number).ToList());

        ValidateOrThrow(countries, stickersByCountry);

        var rootObj = new JsonObject
        {
            ["album"] = meta.Album,
            ["release_date"] = meta.ReleaseDate,
            ["generated_at"] = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ"),
            ["total_stickers"] = meta.TotalStickers,
            ["total_teams"] = meta.TotalTeams,
            ["stickers_per_team"] = meta.StickersPerTeam,
            ["source"] = meta.Source,
            ["source_url"] = meta.SourceUrl,
            ["notes"] = JsonNode.Parse(meta.NotesJson) ?? new JsonArray(),
        };

        var countriesArr = new JsonArray();
        foreach (var c in countries)
        {
            var countryObj = new JsonObject
            {
                ["code"] = c.Code,
                ["name"] = c.Name,
                ["page"] = c.Page,
                ["group"] = c.Group,
                ["sticker_count"] = c.StickerCount,
            };
            var stickersArr = new JsonArray();
            if (stickersByCountry.TryGetValue(c.Code, out var list))
            {
                foreach (var s in list)
                {
                    stickersArr.Add(new JsonObject
                    {
                        ["number"] = s.Number,
                        ["code"] = $"{c.Code}-{s.Number}",
                        ["name"] = s.Name,
                        ["type"] = s.Type,
                    });
                }
            }
            countryObj["stickers"] = stickersArr;
            countriesArr.Add(countryObj);
        }
        rootObj["countries"] = countriesArr;

        var specialsObj = new JsonObject();
        foreach (var section in new[] { "intro", "fifa_world_cup", "host_countries", "world_cup_history" })
        {
            var arr = new JsonArray();
            foreach (var s in specials.Where(x => x.Section == section))
            {
                arr.Add(new JsonObject { ["code"] = s.Code, ["name"] = s.Name });
            }
            specialsObj[section] = arr;
        }
        var purpleArr = new JsonArray();
        foreach (var s in specials.Where(x => x.Section == "extra_stickers_purple"))
        {
            purpleArr.Add(s.Name);
        }
        specialsObj["extra_stickers_purple"] = purpleArr;
        rootObj["specials"] = specialsObj;

        var options = new JsonSerializerOptions
        {
            WriteIndented = true,
            NewLine = "\n",
            Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        };
        var json = rootObj.ToJsonString(options);

        var outputPath = ResolveOutputPath();
        Directory.CreateDirectory(Path.GetDirectoryName(outputPath)!);
        await File.WriteAllTextAsync(outputPath, json);

        _log.LogInformation("Exported album JSON to {Path}", outputPath);
        return outputPath;
    }

    private string ResolveOutputPath()
    {
        var repoRoot = Path.GetFullPath(Path.Combine(_env.ContentRootPath, "..", ".."));
        return Path.Combine(repoRoot, "web", "static", "data", "panini-wc2026.json");
    }

    private void ValidateOrThrow(IReadOnlyList<Country> countries, IReadOnlyDictionary<string, List<Sticker>> stickers)
    {
        var errors = new List<string>();
        foreach (var c in countries)
        {
            stickers.TryGetValue(c.Code, out var list);
            list ??= new List<Sticker>();

            if (list.Count != 20)
                errors.Add($"{c.Code}: expected 20 stickers, has {list.Count}.");

            var s1 = list.FirstOrDefault(s => s.Number == 1);
            if (s1 is { } && s1.Type != "emblem")
                _log.LogWarning("{Code}-1 type is {Type}, expected emblem.", c.Code, s1.Type);

            var s13 = list.FirstOrDefault(s => s.Number == 13);
            if (s13 is { } && s13.Type != "team_photo")
                _log.LogWarning("{Code}-13 type is {Type}, expected team_photo.", c.Code, s13.Type);

            if (c.Page is null)
                _log.LogWarning("{Code} ({Name}) has no page set.", c.Code, c.Name);
            if (c.Group is null)
                _log.LogWarning("{Code} ({Name}) has no group set.", c.Code, c.Name);
        }

        if (errors.Count > 0)
            throw new InvalidOperationException(
                "Export aborted — sticker count mismatch:\n" + string.Join("\n", errors));
    }
}
