using Dapper;

namespace Mundial26.Admin.Data;

public class SchemaBootstrapper
{
    private readonly SqlConnectionFactory _factory;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<SchemaBootstrapper> _log;

    public SchemaBootstrapper(SqlConnectionFactory factory, IWebHostEnvironment env, ILogger<SchemaBootstrapper> log)
    {
        _factory = factory;
        _env = env;
        _log = log;
    }

    public async Task EnsureSchemaAsync()
    {
        var schemaPath = Path.Combine(_env.ContentRootPath, "Sql", "Schema.sql");
        if (!File.Exists(schemaPath))
            throw new FileNotFoundException($"Schema script not found: {schemaPath}");

        var sql = await File.ReadAllTextAsync(schemaPath);
        await using var conn = _factory.Create();
        await conn.ExecuteAsync(sql);
        _log.LogInformation("Schema bootstrap complete.");
    }
}
