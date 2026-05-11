-- Pages + group letters from the album's table of contents (image, 2026-05-11).
-- Idempotent — re-running has no effect. Run via:
--   sqlcmd -S <server> -d <db> -U <user> -P <pwd> -i Sql/CountryGroupsAndPages.sql -C
-- (or apply through the admin Edit pages).

SET NOCOUNT ON;

;WITH src([Code], [Page], [Grp]) AS (
    SELECT * FROM (VALUES
        ('MEX',  8, 'A'), ('RSA', 10, 'A'), ('KOR', 12, 'A'), ('CZE', 14, 'A'),
        ('CAN', 16, 'B'), ('BIH', 18, 'B'), ('QAT', 20, 'B'), ('SUI', 22, 'B'),
        ('BRA', 24, 'C'), ('MAR', 26, 'C'), ('HAI', 28, 'C'), ('SCO', 30, 'C'),
        ('USA', 32, 'D'), ('PAR', 34, 'D'), ('AUS', 36, 'D'), ('TUR', 38, 'D'),
        ('GER', 40, 'E'), ('CUW', 42, 'E'), ('CIV', 44, 'E'), ('ECU', 46, 'E'),
        ('NED', 48, 'F'), ('JPN', 50, 'F'), ('SWE', 52, 'F'), ('TUN', 54, 'F'),
        ('BEL', 58, 'G'), ('EGY', 60, 'G'), ('IRN', 62, 'G'), ('NZL', 64, 'G'),
        ('ESP', 66, 'H'), ('CPV', 68, 'H'), ('KSA', 70, 'H'), ('URU', 72, 'H'),
        ('FRA', 74, 'I'), ('SEN', 76, 'I'), ('IRQ', 78, 'I'), ('NOR', 80, 'I'),
        ('ARG', 82, 'J'), ('ALG', 84, 'J'), ('AUT', 86, 'J'), ('JOR', 88, 'J'),
        ('POR', 90, 'K'), ('COD', 92, 'K'), ('UZB', 94, 'K'), ('COL', 96, 'K'),
        ('ENG', 98, 'L'), ('CRO',100, 'L'), ('GHA',102, 'L'), ('PAN',104, 'L')
    ) AS v(Code, Page, Grp)
)
UPDATE c
   SET c.Page = s.Page,
       c.[Group] = s.Grp
  FROM dbo.Countries c
  JOIN src s ON s.Code = c.Code;

SELECT @@ROWCOUNT AS RowsUpdated;
