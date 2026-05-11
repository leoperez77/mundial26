using Microsoft.Data.SqlClient;

namespace Mundial26.Admin.Data;

public class SqlConnectionFactory
{
    private readonly string _connectionString;

    public SqlConnectionFactory(IConfiguration config)
    {
        _connectionString = config.GetConnectionString("Mundial26")
            ?? throw new InvalidOperationException(
                "Connection string 'Mundial26' is not configured. " +
                "Set it via `dotnet user-secrets set ConnectionStrings:Mundial26 \"<conn string>\"`.");
    }

    public SqlConnection Create() => new(_connectionString);
}
