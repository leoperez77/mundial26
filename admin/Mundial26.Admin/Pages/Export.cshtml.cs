using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Mundial26.Admin.Services;

namespace Mundial26.Admin.Pages;

public class ExportModel : PageModel
{
    private readonly JsonExporter _exporter;

    public ExportModel(JsonExporter exporter)
    {
        _exporter = exporter;
    }

    public string? OutputPath { get; private set; }
    public DateTime? GeneratedAt { get; private set; }
    public string? Error { get; private set; }

    public void OnGet() { }

    public async Task<IActionResult> OnPostAsync()
    {
        try
        {
            OutputPath = await _exporter.ExportAsync();
            GeneratedAt = DateTime.UtcNow;
        }
        catch (Exception ex)
        {
            Error = ex.Message;
        }
        return Page();
    }
}
