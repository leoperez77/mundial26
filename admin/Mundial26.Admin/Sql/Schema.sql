IF OBJECT_ID(N'dbo.Countries', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Countries (
        Code         NVARCHAR(3)    NOT NULL PRIMARY KEY,
        Name         NVARCHAR(100)  NOT NULL,
        Page         INT            NULL,
        [Group]      NVARCHAR(1)    NULL,
        StickerCount INT            NOT NULL CONSTRAINT DF_Countries_StickerCount DEFAULT (20),
        SortOrder    INT            NOT NULL
    );
    CREATE INDEX IX_Countries_SortOrder ON dbo.Countries(SortOrder);
END;

IF OBJECT_ID(N'dbo.Stickers', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Stickers (
        CountryCode NVARCHAR(3)   NOT NULL,
        Number      INT           NOT NULL,
        Name        NVARCHAR(200) NOT NULL,
        Type        NVARCHAR(20)  NOT NULL CONSTRAINT DF_Stickers_Type DEFAULT ('player'),
        CONSTRAINT PK_Stickers PRIMARY KEY (CountryCode, Number),
        CONSTRAINT FK_Stickers_Countries FOREIGN KEY (CountryCode)
            REFERENCES dbo.Countries(Code) ON DELETE CASCADE
    );
END;

IF OBJECT_ID(N'dbo.Specials', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Specials (
        Id        INT            NOT NULL IDENTITY(1,1) PRIMARY KEY,
        Section   NVARCHAR(50)   NOT NULL,
        Code      NVARCHAR(20)   NOT NULL CONSTRAINT DF_Specials_Code DEFAULT (''),
        Name      NVARCHAR(200)  NOT NULL,
        SortOrder INT            NOT NULL
    );
    CREATE INDEX IX_Specials_Section_SortOrder ON dbo.Specials(Section, SortOrder);
END;

IF OBJECT_ID(N'dbo.AlbumMeta', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AlbumMeta (
        Id              INT            NOT NULL PRIMARY KEY,
        Album           NVARCHAR(200)  NOT NULL,
        ReleaseDate     NVARCHAR(20)   NOT NULL,
        TotalStickers   INT            NOT NULL,
        TotalTeams      INT            NOT NULL,
        StickersPerTeam INT            NOT NULL,
        Source          NVARCHAR(500)  NOT NULL,
        SourceUrl       NVARCHAR(500)  NOT NULL,
        NotesJson       NVARCHAR(MAX)  NOT NULL CONSTRAINT DF_AlbumMeta_NotesJson DEFAULT ('[]')
    );
END;
