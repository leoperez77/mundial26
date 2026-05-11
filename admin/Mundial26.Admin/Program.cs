using Mundial26.Admin.Data;
using Mundial26.Admin.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddRazorPages();
builder.Services.AddSingleton<SqlConnectionFactory>();
builder.Services.AddScoped<SchemaBootstrapper>();
builder.Services.AddScoped<Seeder>();
builder.Services.AddScoped<JsonExporter>();

var app = builder.Build();

// Bootstrap schema (idempotent, IF NOT EXISTS guards) on every startup,
// including CLI runs (--seed / --export) so the tables exist before use.
using (var scope = app.Services.CreateScope())
{
    var bootstrapper = scope.ServiceProvider.GetRequiredService<SchemaBootstrapper>();
    await bootstrapper.EnsureSchemaAsync();
}

// CLI handlers — exit before the web host starts.
if (args.Length > 0)
{
    var verb = args[0];
    using var scope = app.Services.CreateScope();

    if (verb == "--seed")
    {
        var seeder = scope.ServiceProvider.GetRequiredService<Seeder>();
        var seedPath = Path.Combine(app.Environment.ContentRootPath, "Seed", "panini_wc2026.json");
        await seeder.SeedAsync(seedPath);
        return;
    }

    if (verb == "--export")
    {
        var exporter = scope.ServiceProvider.GetRequiredService<JsonExporter>();
        var outputPath = await exporter.ExportAsync();
        Console.WriteLine($"Exported to: {outputPath}");
        return;
    }
}

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseRouting();
app.UseAuthorization();
app.MapStaticAssets();
app.MapRazorPages()
   .WithStaticAssets();

app.Run();
