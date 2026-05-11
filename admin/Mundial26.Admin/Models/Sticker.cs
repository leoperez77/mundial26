namespace Mundial26.Admin.Models;

public class Sticker
{
    public string CountryCode { get; set; } = "";
    public Country Country { get; set; } = null!;
    public int Number { get; set; }
    public string Name { get; set; } = "";
    public string Type { get; set; } = "player";
}
