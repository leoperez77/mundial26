namespace Mundial26.Admin.Models;

public class Country
{
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public int? Page { get; set; }
    public string? Group { get; set; }
    public int StickerCount { get; set; } = 20;
    public int SortOrder { get; set; }
    public List<Sticker> Stickers { get; set; } = new();
}
