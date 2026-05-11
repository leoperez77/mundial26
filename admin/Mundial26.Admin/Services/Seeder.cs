using System.Text.Json;
using Dapper;
using Mundial26.Admin.Data;

namespace Mundial26.Admin.Services;

public class Seeder
{
    private readonly SqlConnectionFactory _factory;
    private readonly ILogger<Seeder> _log;

    public Seeder(SqlConnectionFactory factory, ILogger<Seeder> log)
    {
        _factory = factory;
        _log = log;
    }

    public async Task SeedAsync(string seedFilePath)
    {
        await using var conn = _factory.Create();
        await conn.OpenAsync();

        var existing = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM dbo.Countries");
        if (existing > 0)
        {
            _log.LogInformation("Countries table is not empty ({Count} rows) — seed skipped.", existing);
            return;
        }

        if (!File.Exists(seedFilePath))
            throw new FileNotFoundException($"Seed file not found: {seedFilePath}");

        await using var stream = File.OpenRead(seedFilePath);
        using var doc = await JsonDocument.ParseAsync(stream);
        var root = doc.RootElement;

        var meta = new
        {
            Album = root.GetProperty("album").GetString() ?? "",
            ReleaseDate = root.GetProperty("release_date").GetString() ?? "",
            TotalStickers = root.GetProperty("total_stickers").GetInt32(),
            TotalTeams = root.GetProperty("total_teams").GetInt32(),
            StickersPerTeam = root.GetProperty("stickers_per_team").GetInt32(),
            Source = root.GetProperty("source").GetString() ?? "",
            SourceUrl = root.GetProperty("source_url").GetString() ?? "",
            NotesJson = root.GetProperty("notes").GetRawText(),
        };

        var countries = new List<object>();
        var stickers = new List<object>();
        var sortOrder = 0;

        foreach (var c in root.GetProperty("countries").EnumerateArray())
        {
            var code = c.GetProperty("code").GetString()!;
            countries.Add(new
            {
                Code = code,
                Name = c.GetProperty("name").GetString()!,
                Page = c.TryGetProperty("page", out var pageEl) && pageEl.ValueKind == JsonValueKind.Number
                    ? (int?)pageEl.GetInt32() : null,
                Group = c.TryGetProperty("group", out var groupEl) && groupEl.ValueKind == JsonValueKind.String
                    ? groupEl.GetString() : null,
                StickerCount = c.TryGetProperty("sticker_count", out var scEl) ? scEl.GetInt32() : 20,
                SortOrder = sortOrder++,
            });

            foreach (var s in c.GetProperty("stickers").EnumerateArray())
            {
                stickers.Add(new
                {
                    CountryCode = code,
                    Number = s.GetProperty("number").GetInt32(),
                    Name = s.GetProperty("name").GetString()!,
                    Type = s.GetProperty("type").GetString()!,
                });
            }
        }

        var specials = new List<object>();
        var specialsRoot = root.GetProperty("specials");
        foreach (var section in new[] { "intro", "fifa_world_cup", "host_countries", "world_cup_history" })
        {
            if (!specialsRoot.TryGetProperty(section, out var arr)) continue;
            var so = 0;
            foreach (var item in arr.EnumerateArray())
            {
                specials.Add(new
                {
                    Section = section,
                    Code = item.GetProperty("code").GetString() ?? "",
                    Name = item.GetProperty("name").GetString() ?? "",
                    SortOrder = so++,
                });
            }
        }
        if (specialsRoot.TryGetProperty("extra_stickers_purple", out var extras))
        {
            var so = 0;
            foreach (var item in extras.EnumerateArray())
            {
                specials.Add(new
                {
                    Section = "extra_stickers_purple",
                    Code = "",
                    Name = item.GetString() ?? "",
                    SortOrder = so++,
                });
            }
        }

        await using var tx = (Microsoft.Data.SqlClient.SqlTransaction)await conn.BeginTransactionAsync();
        try
        {
            await conn.ExecuteAsync(
                @"INSERT INTO dbo.AlbumMeta (Id, Album, ReleaseDate, TotalStickers, TotalTeams, StickersPerTeam, Source, SourceUrl, NotesJson)
                  VALUES (1, @Album, @ReleaseDate, @TotalStickers, @TotalTeams, @StickersPerTeam, @Source, @SourceUrl, @NotesJson);",
                meta, tx);

            await conn.ExecuteAsync(
                @"INSERT INTO dbo.Countries (Code, Name, Page, [Group], StickerCount, SortOrder)
                  VALUES (@Code, @Name, @Page, @Group, @StickerCount, @SortOrder);",
                countries, tx);

            await conn.ExecuteAsync(
                @"INSERT INTO dbo.Stickers (CountryCode, Number, Name, Type)
                  VALUES (@CountryCode, @Number, @Name, @Type);",
                stickers, tx);

            await conn.ExecuteAsync(
                @"INSERT INTO dbo.Specials (Section, Code, Name, SortOrder)
                  VALUES (@Section, @Code, @Name, @SortOrder);",
                specials, tx);

            await tx.CommitAsync();
        }
        catch
        {
            await tx.RollbackAsync();
            throw;
        }

        _log.LogInformation(
            "Seeded {Countries} countries, {Stickers} stickers, {Specials} specials.",
            countries.Count, stickers.Count, specials.Count);
        Console.WriteLine($"Seeded: {countries.Count} countries, {stickers.Count} stickers, {specials.Count} specials.");
    }
}
