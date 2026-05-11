namespace Mundial26.Admin.Models;

public class AlbumMeta
{
    public int Id { get; set; } = 1;
    public string Album { get; set; } = "";
    public string ReleaseDate { get; set; } = "";
    public int TotalStickers { get; set; }
    public int TotalTeams { get; set; }
    public int StickersPerTeam { get; set; }
    public string Source { get; set; } = "";
    public string SourceUrl { get; set; } = "";
    public string NotesJson { get; set; } = "[]";
}
