# Mundial 26 — Sticker Lookup PWA

## Development Plan (v2 — final)

**Domain:** mundial26.co
**Audience:** Spanish, English, Portuguese — primarily Latin American collectors
**Target ship date:** Before 2026-06-11 (World Cup kickoff)
**Owner:** [user]
**For:** Claude Code execution

---

## 1. Problem & Goals

The Panini FIFA World Cup 2026 sticker album uses per-country sticker codes (e.g., `RSA-14`, `COL-19`). The album does not print a country index or page numbers on the spread itself, so collectors must keep flipping to the back-of-album index. Repeated flipping damages the album.

**Goal:** A fast, offline-capable lookup tool. Enter a code → get the album page and player name instantly.

**Out of scope for V1 (do not add):**
- Collection tracking (have / missing / dupes)
- Camera/OCR scanning
- Swap-list sharing or social features
- Accounts, login, sync
- Push notifications
- Real tip-jar integration (placeholder UI only)

These may come in V2. Resist scope creep aggressively.

---

## 2. Architecture Overview

Two projects in **one git repository**, two folders, two completely independent stacks. No monorepo tooling needed — they don't share runtime, and the contract between them is a single JSON file.

```
mundial26/
├── admin/                         # Project A: local data-entry tool
│   ├── Mundial26.Admin.sln
│   ├── Mundial26.Admin.csproj
│   ├── Pages/                     # Razor Pages
│   ├── Data/                      # DbContext, migrations
│   ├── Models/
│   ├── Services/                  # JsonExporter
│   ├── Seed/
│   │   └── panini_wc2026.json     # Seed file (the one already produced)
│   └── mundial26.db               # SQLite, gitignored
│
├── web/                           # Project B: the PWA
│   ├── package.json
│   ├── svelte.config.js
│   ├── src/
│   │   ├── lib/
│   │   ├── routes/
│   │   └── paraglide/             # i18n catalogs
│   ├── static/
│   │   └── data/
│   │       └── panini-wc2026.json # Committed; produced by admin export
│   └── ...
│
├── docs/
│   └── DEV_PLAN.md                # This file
├── .gitignore
└── README.md
```

**Data flow:**

```
[user enters page numbers, fixes typos in admin]
        ↓
admin (ASP.NET Core 9 + EF Core + SQLite)
        ↓
"Export JSON" action
        ↓
/web/static/data/panini-wc2026.json   (committed to git)
        ↓
git push → Vercel rebuild → mundial26.co
        ↓
user's browser → IndexedDB cache → instant lookups
```

---

## 3. Tech Stack (locked)

### Admin (Project A)

| Layer | Choice |
|---|---|
| Runtime | .NET 10 |
| Framework | ASP.NET Core Razor Pages |
| Data access | Dapper (micro-ORM, raw SQL) |
| DB client | `Microsoft.Data.SqlClient` |
| Database | SQL Server (remote, on owner-controlled box) |
| Schema | Hand-rolled `Sql/Schema.sql` run idempotently on startup (`IF OBJECT_ID … IS NULL` guards) |
| UI | Bootstrap 5 (the ASP.NET default — fine for internal tool) |
| Serialization | `System.Text.Json` |
| Secrets | `dotnet user-secrets` for the connection string |
| Hosting | **Local** on the owner's machine. Run with `dotnet run`. Never deployed publicly. DB lives elsewhere. |

### Web / PWA (Project B)

| Layer | Choice |
|---|---|
| Language | TypeScript 5+ |
| Framework | SvelteKit (latest, `adapter-static`) |
| Build | Vite |
| Styling | Tailwind CSS |
| PWA tooling | `@vite-pwa/sveltekit` |
| i18n | Paraglide JS (`@inlang/paraglide-sveltekit`) |
| Search | Fuse.js (for fuzzy name search) |
| Local cache | `idb-keyval` over IndexedDB |
| Icons | `lucide-svelte` |
| Fonts | Anton + Archivo + JetBrains Mono (Google Fonts) |
| Hosting | Vercel (free tier) |
| DNS | GoDaddy (the registrar) — point `mundial26.co` at Vercel via two records |

### Notes for Claude Code on the choice
- Two projects, two stacks, **no monorepo tooling**. Just two folders sharing a git history.
- The JSON file is the contract. Schema is defined in §4 below. Whatever the admin exports must match whatever the PWA reads.
- The admin is **never deployed**. It runs on the owner's laptop only. No auth, no hosting, no cloud DB.

---

## 4. Data Model (the JSON contract)

The single source of truth between the two projects.

### 4.1 TypeScript types (`web/src/lib/types.ts`)

```ts
export type StickerType = 'emblem' | 'team_photo' | 'player';

export interface Sticker {
  number: number;        // 1..20
  code: string;          // e.g. "RSA-14"
  name: string;
  type: StickerType;
}

export interface Country {
  code: string;          // 3-letter FIFA code, e.g. "RSA"
  name: string;
  page: number | null;   // null until filled in from the physical album
  group: string | null;  // "A".."L" — null if not yet drawn / unknown
  sticker_count: number;
  stickers: Sticker[];
}

export interface Special {
  code: string;
  name: string;
}

export interface AlbumData {
  album: string;
  release_date: string;
  generated_at: string;  // ISO timestamp of last admin export
  total_stickers: number;
  total_teams: number;
  stickers_per_team: number;
  source: string;
  source_url: string;
  notes: string[];
  countries: Country[];
  specials: {
    intro: Special[];
    fifa_world_cup: Special[];
    host_countries: Special[];
    world_cup_history: Special[];
    extra_stickers_purple: string[];
  };
}
```

### 4.2 C# models (`admin/Models/`)

POCOs only — Dapper materializes columns onto these by name. No fluent config, no navigation properties; loading a country's stickers is a separate query (or a `QueryMultiple` in one round-trip). Mirror the TypeScript types in idiomatic C#:

```csharp
public class Country
{
    public string Code { get; set; } = "";       // primary key
    public string Name { get; set; } = "";
    public int? Page { get; set; }
    public string? Group { get; set; }           // "A".."L"
    public int StickerCount { get; set; } = 20;
    public int SortOrder { get; set; }           // for stable export ordering
    // No navigation property — load stickers with a second Dapper query.
}

public class Sticker
{
    public string CountryCode { get; set; } = "";
    public int Number { get; set; }
    public string Name { get; set; } = "";
    public string Type { get; set; } = "player";  // emblem | team_photo | player
}

public class AlbumMeta
{
    public int Id { get; set; } = 1;            // single-row table
    public string Album { get; set; } = "";
    public string ReleaseDate { get; set; } = "";
    public int TotalStickers { get; set; }
    public int TotalTeams { get; set; }
    public int StickersPerTeam { get; set; }
    public string Source { get; set; } = "";
    public string SourceUrl { get; set; } = "";
    public string NotesJson { get; set; } = "[]";  // top-level "notes" array, stored verbatim
}

public class Special
{
    public int Id { get; set; }
    public string Section { get; set; } = "";    // intro | fifa_world_cup | host_countries | world_cup_history | extra_stickers_purple
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public int SortOrder { get; set; }
}
```

Composite primary key on `Sticker` is `(CountryCode, Number)` — declared in `Sql/Schema.sql`.

### 4.3 JSON output rules

- Property names: `snake_case` (use `JsonNamingPolicy.SnakeCaseLower` available in .NET 8+).
- `generated_at`: ISO 8601 UTC, e.g. `2026-05-11T14:30:00Z`.
- Pretty-printed (indented) so diffs in git are readable.
- Stable ordering: countries sorted by `SortOrder`, stickers by `Number`, specials by `SortOrder` within their section.

---

## 5. Project A — Admin (ASP.NET Core Razor Pages)

### 5.1 Purpose

A local Razor Pages app the owner runs on their own machine to:

1. **Seed** the SQLite database from `Seed/panini_wc2026.json` on first run.
2. **Edit** page numbers (currently `null` for all 48 countries — fill these in once with the physical album in hand).
3. **Edit** group letters (A–L) once the FIFA group-stage draw is finalized.
4. **Fix** name typos (Marc Guéhi, Václav Černý, Alireza Beiranvand, etc.).
5. **Export** the corrected data as `panini-wc2026.json` for the PWA to consume.

### 5.2 Pages

| Path | Purpose |
|---|---|
| `/` (Index) | Dashboard: count of pages still null, count of recently edited rows, big "Export JSON" button |
| `/Countries` | List of all 48 countries — code, name, page, group, edit link |
| `/Countries/Edit?code=RSA` | Edit one country: name, page, group, **and** all 20 stickers inline |
| `/Specials` | Edit special-section stickers grouped by section |
| `/Export` | Confirms export status; shows the path the JSON was written to |

The owner is the only user. **Skip authentication entirely.**

### 5.3 Implementation tasks

**A1. Scaffold the project**

```bash
mkdir admin && cd admin
dotnet new sln -n Mundial26.Admin
dotnet new razor -n Mundial26.Admin --framework net10.0
dotnet sln add Mundial26.Admin/Mundial26.Admin.csproj
cd Mundial26.Admin
dotnet add package Dapper
dotnet add package Microsoft.Data.SqlClient
dotnet user-secrets init
dotnet user-secrets set "ConnectionStrings:Mundial26" "Server=…;Initial Catalog=…;User ID=…;Password=…;TrustServerCertificate=True;Encrypt=False;"
```

(Adjust folder layout to taste. The connection string lives in user-secrets, never in the repo.)

**A2. Schema + connection factory**

Implement `Country`, `Sticker`, `Special`, `AlbumMeta` per §4.2 in `Models/`. Hand-roll `Sql/Schema.sql` with idempotent `IF OBJECT_ID(N'dbo.X', N'U') IS NULL CREATE TABLE …` blocks; declare the composite PK on `Stickers` as `PRIMARY KEY (CountryCode, Number)` and the cascade FK to `Countries`. Use bracketed `[Group]` (it's a reserved-ish T-SQL identifier).

Add `Data/SqlConnectionFactory.cs` (reads `ConnectionStrings:Mundial26`, returns a fresh `SqlConnection`) and `Data/SchemaBootstrapper.cs` (reads `Sql/Schema.sql` from `ContentRootPath` and runs it). Wire both in `Program.cs`:

```csharp
builder.Services.AddSingleton<SqlConnectionFactory>();
builder.Services.AddScoped<SchemaBootstrapper>();
// …
using (var scope = app.Services.CreateScope())
    await scope.ServiceProvider.GetRequiredService<SchemaBootstrapper>().EnsureSchemaAsync();
```

The bootstrapper runs on every startup including `--seed` / `--export`. No migration tooling.

**A3. Seed script**

Add a startup hook (or a separate `--seed` CLI flag handler) that:
1. Detects whether `Countries` table is empty.
2. If empty, reads `Seed/panini_wc2026.json`.
3. Bulk-inserts countries, stickers, and specials.
4. Logs the count and exits.

Idempotent. If table is not empty, exits with a message and does nothing.

**A4. Country list page** (`Pages/Countries/Index.cshtml`)

Server-rendered table:
- Code (mono font)
- Name
- Page (or em-dash if null)
- Group (or em-dash if null)
- "Edit" link

Sort by `SortOrder`. Show a count of "X of 48 pages filled" at the top.

**A5. Country edit page** (`Pages/Countries/Edit.cshtml?code=RSA`)

Single form with:
- Country name (text)
- Page number (int, nullable)
- Group letter (text, single char A–L, nullable)
- Table of 20 stickers, each row editable inline:
  - Number (read-only, 1–20)
  - Code (read-only, e.g. "RSA-14")
  - Name (text input)
  - Type (dropdown: emblem | team_photo | player)
- One "Save" button at the bottom; one POST handler updates everything.

Use `OnPostAsync` with `[BindProperty]` arrays for the sticker list. Redirect back to `/Countries` on success.

**A6. Specials page** (`Pages/Specials/Index.cshtml`)

Group specials by `Section`. Inline-editable form similar to the country edit page. One save button.

**A7. JSON Exporter service** (`Services/JsonExporter.cs`)

Three Dapper queries: one for `AlbumMeta`, one for `Countries` ordered by `SortOrder`, one for all `Stickers` ordered by `(CountryCode, Number)`, one for `Specials` ordered by `(Section, SortOrder)`. Group stickers by `CountryCode` in memory.

Build the output with `System.Text.Json.Nodes.JsonObject` / `JsonArray` rather than anonymous types. Two reasons: (1) insertion order is explicit, no anonymous-type ordering quirks, and (2) `notes` (stored as the raw top-level JSON array in `AlbumMeta.NotesJson`) can be parsed straight back in with `JsonNode.Parse(meta.NotesJson)` — no double-encoding.

Serializer options:
- `WriteIndented = true`
- `NewLine = "\n"` (else CRLF on Windows pollutes the diff against the seed)
- `Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping` (so diacritics aren't `\u`-escaped)

Output path: resolve from `IWebHostEnvironment.ContentRootPath` up two levels to the repo root, then `web/static/data/panini-wc2026.json`. `Directory.CreateDirectory` the parent before writing.

Validate on export:
- Every country has exactly 20 stickers; abort with error if not.
- Sticker 1 has type `emblem`, sticker 13 has type `team_photo`; warn (don't abort) otherwise.
- Print warnings to console for any country still missing `page` or `group`.

**A8. Export page** (`Pages/Export.cshtml`)

A single button. POST handler calls `JsonExporter.ExportAsync()`, catches errors, displays a success state with the file path and timestamp, or the error.

### 5.4 What NOT to add in the admin

- Authentication, accounts, multi-user.
- Image uploads.
- A real frontend framework (jQuery, React, etc.) — Razor Pages + Bootstrap is enough.
- Background jobs, queues, schedulers.
- Logging frameworks beyond the built-in `ILogger`.
- Docker, Kubernetes, anything cloud-native.

---

## 6. Project B — Web / PWA (SvelteKit)

### 6.1 Purpose

The user-facing lookup tool deployed at **mundial26.co**.

Three lookup modes:

1. **By sticker code** — `RSA-14` → "Bathusi Aubaas, South Africa, page 42"
2. **By country code** — `RSA` → country detail with all 20 stickers
3. **By name** — typing "bathusi" or "south af" returns fuzzy matches

Plus a browseable grid of all 48 countries on the home view.

### 6.2 Routes

| Path | Purpose |
|---|---|
| `/` | Home: search bar (with mode toggle) + (later) countdown to kick-off |
| `/browse` | Country grid (alphabetical by FIFA code) with group badges |
| `/c/[code]` | Country detail: prominent page number + all 20 stickers |
| `/s/[code]` | Single-sticker detail (the broadcast card; deep-linkable and shareable) |
| `/about` | About + data source credits + tip jar placeholder |

### 6.3 Search behaviour

A single input handles three modes (mode toggle visible above):

- **Auto-detect single-field input** (default mode):
  - Matches `/^[A-Z]{3}-\d{1,2}$/i` → navigate to `/s/[code]`
  - Matches `/^[A-Z]{3}$/i` if valid country → navigate to `/c/[code]`
  - Otherwise → fuzzy match against country names and player names; top 5 results inline
- **Country + № mode**:
  - First field: select country (dropdown showing flag + code + name)
  - Second field: number 1–20
  - Hitting enter on the number field navigates to the sticker

The single-field mode is the default and is what most users will use.

### 6.4 Data loading strategy

- Build path: `/data/panini-wc2026.json` (committed to `static/data/`).
- On first visit, fetch + parse + store the parsed object in IndexedDB via `idb-keyval`, keyed by `generated_at` timestamp.
- On subsequent visits, read directly from IndexedDB. In the background, refetch the JSON and compare `generated_at`; if newer, update.
- Service worker (via `@vite-pwa/sveltekit`) precaches the JSON, the app shell, and the fonts. **Network-first for HTML, cache-first for everything else** ensures fresh app shell on update.

**Critical:** do NOT `import` the JSON as an ES module. Fetch it as a static file. Bundling it kills update flexibility and bloats the initial bundle.

### 6.5 i18n (es / en / pt)

- Paraglide JS for translations.
- Locale catalogs at `src/paraglide/messages/{es,en,pt}.json`.
- Detect via `navigator.language` on first load; allow manual override in the footer; persist choice in `localStorage`.
- **Default locale: Spanish.** (Owner is Colombian; primary audience is LATAM.)
- Country names: keep as-is from the JSON (universal across languages — "Argentina" is "Argentina" in all three). Translate **UI strings only**.
- Provide reasonable initial Spanish translations directly; English and Portuguese should be reviewable by the owner after launch.

### 6.6 PWA configuration

- **App name:** "Mundial 26"
- **Short name:** "Mundial26"
- **Theme color:** `#0E1F3F` (stadium navy)
- **Background color:** `#F4F1E8` (warm cream)
- **Display mode:** `standalone`
- **Start URL:** `/`
- **Icons:** 192×192 and 512×512 PNG (generate from the trophy logomark; placeholder fine for V1)
- **Maskable icon:** include the maskable version too (safe-zone padded)
- **Service worker:** precache shell + JSON + fonts; network-first for HTML

### 6.7 Tip jar

V1 = placeholder only:
- `/about` has a "Support this project" section.
- A disabled button labelled "Coming soon" (translated).
- TODO comment in code: `// TODO: wire up tip jar provider — see plan §9`.

Do not integrate Stripe, PayPal, Ko-fi, or anything else yet. Defer until post-launch.

### 6.8 Tasks

**B1. Scaffold**
```bash
cd ../ # (alongside admin/)
npm create svelte@latest web
cd web
npm install
npm install -D tailwindcss postcss autoprefixer @tailwindcss/forms
npx tailwindcss init -p
npm install @vite-pwa/sveltekit @vite-pwa/assets-generator
npm install idb-keyval fuse.js
npm install lucide-svelte
npm install -D @inlang/paraglide-sveltekit
```

Configure adapter-static; set up Tailwind with the design tokens from §7.

**B2. Type definitions + data loader**

Define `AlbumData` types in `src/lib/types.ts` per §4.1.

`src/lib/data.ts`:
```ts
import { get, set } from 'idb-keyval';
import type { AlbumData } from './types';

const KEY = 'mundial26:album';
const DATA_URL = '/data/panini-wc2026.json';

export async function loadAlbumData(): Promise<AlbumData> {
  const cached = await get<AlbumData>(KEY);
  if (cached) {
    // Background refresh — fire-and-forget
    refreshInBackground();
    return cached;
  }
  return await fetchAndCache();
}

async function fetchAndCache(): Promise<AlbumData> {
  const res = await fetch(DATA_URL);
  const data: AlbumData = await res.json();
  await set(KEY, data);
  return data;
}

async function refreshInBackground() {
  try {
    const res = await fetch(DATA_URL, { cache: 'no-cache' });
    const fresh: AlbumData = await res.json();
    const cached = await get<AlbumData>(KEY);
    if (!cached || fresh.generated_at > cached.generated_at) {
      await set(KEY, fresh);
    }
  } catch { /* offline; ignore */ }
}
```

Expose via a Svelte context so any page can `getAlbumData()`.

**B3. Search component** (`src/lib/components/SearchBar.svelte`)

Per §6.3. Debounced input (150 ms). Renders dropdown of fuzzy matches inline. Keyboard nav (↑↓ enter esc). Mode toggle above the input. On valid sticker code, navigate to `/s/[code]`. On valid country code, navigate to `/c/[code]`.

**B4. Home page** (`src/routes/+page.svelte`)

- Header (brand + countdown to kickoff)
- Eyebrow + headline ("Type a code, find the page.")
- Mode toggle + search bar
- Hint chips (`ARG-17`, `BRA-14`, `COL-19`)
- Countdown banner (calculated from `2026-06-11`)
- Bottom navigation

**B5. Country detail** (`src/routes/c/[code]/+page.svelte`)

- Navy hero card with flag, name, code, group badge, page number
- Full list of 20 stickers (table-like rows)
- Highlight the sticker the user came from, if referer matches `/s/[code]`

**B6. Sticker detail** (`src/routes/s/[code]/+page.svelte`)

The broadcast card. Navy background, gold code pill, condensed display name, scoreboard-style page number, share button (Web Share API → clipboard fallback).

**B7. Browse page** (`src/routes/browse/+page.svelte`)

Grid of 48 country cards. Each card: flag, group badge (corner), 3-letter code, country name, page number. Filter input at top.

**B8. About page** (`src/routes/about/+page.svelte`)

App description, data source credit (Football Cartophilic Info Exchange + the existing source URL), version, language switcher, tip jar placeholder, link to the album publisher (with disclaimer that this app is not affiliated with Panini).

**B9. i18n setup**

Configure Paraglide. Initial ES catalog complete; EN and PT can use placeholder English with notes for review.

**B10. PWA config**

Per §6.6. Verify install flow on Android and iOS Safari. Test offline (DevTools → Application → Service Workers → Offline).

**B11. SEO + Open Graph**

- `<title>` per page (e.g. "Mundial 26 — RSA-14 Bathusi Aubaas, page 42")
- Open Graph image: a server-generated card for sticker URLs would be nice for shareability, but **defer to V1.5**. For V1, ship one static OG image.
- `robots.txt` allows everything.
- Sitemap with `/`, `/browse`, `/about` + every `/c/[code]` and `/s/[code]`.

### 6.9 What NOT to add in the PWA

- Authentication.
- A backend of any kind. The only network call should be the JSON fetch.
- Analytics (LGPD/GDPR baggage; defer to post-launch if at all).
- Comments, user-generated content, ratings.
- Multiple themes / dark mode toggle (V1 = single light theme).
- Animations beyond simple state transitions.
- Splash screens with logos (PWA handles this from the manifest).

---

## 7. Design System (locked)

Everything here is final and should be implemented exactly as specified. Use CSS variables; reference them by name.

### 7.1 Colour tokens

```css
:root {
  /* Surfaces */
  --bg:           #F4F1E8;  /* warm cream — page background */
  --bg-alt:       #E8E3CF;  /* secondary surface, e.g. toggle bg */
  --surface:      #FFFFFF;  /* card surface */

  /* Brand */
  --navy:         #0E1F3F;  /* stadium navy — primary brand */
  --navy-deep:    #07142B;  /* deeper navy — scoreboard background */
  --navy-light:   #1B3158;  /* navy elevated surface */

  --gold:         #D4A537;  /* trophy gold — primary accent */
  --gold-light:   #F0D582;  /* gold on dark surfaces (text, captions) */
  --gold-deep:    #8C6515;  /* gold on light surfaces (text, borders) */

  --red:          #C42E2E;  /* red spark — live indicators, sparing use */
  --red-deep:     #8B1E1E;

  /* Text */
  --text:         #0E1F3F;  /* primary text on light bg (navy) */
  --muted:        #6B7280;
  --muted-light:  #9CA3AF;

  /* Border */
  --border:       #D4CDB5;

  /* Functional */
  --code-bg:      #0E1F3F;
  --code-text:    #F4F1E8;
}
```

### 7.2 Typography

```css
--font-display: 'Anton', sans-serif;        /* condensed all-caps, broadcast feel */
--font-body:    'Archivo', system-ui, sans-serif;
--font-mono:    'JetBrains Mono', monospace;
```

Loaded from Google Fonts (single `<link>` tag, three families).

**Usage:**
- Display (`Anton`): hero titles, section headings, country names in hero cards, page numbers in scoreboard
- Body (`Archivo`): all body copy, buttons, secondary headings
- Mono (`JetBrains Mono`): sticker codes, group labels, metadata, hint chips, all numerical "scoreboard" data

**Sizes (mobile-first):**
- Display hero: 38px / weight 400 / line-height 0.92 / tracking +0.005em / uppercase
- Display section: 26px / 400 / 0.95 / uppercase
- Page-number callout: 44–52px / 400 / 0.85 (the answer — make it dominant)
- Body large: 16px / 500
- Body: 14px / 500
- Body small: 12–13px / 500
- Mono code pill: 11–12px / 700 / tracking +0.08em / uppercase
- Mono eyebrow: 10px / 700 / tracking +0.18em / uppercase

**Two weights only**: 400 (Anton; 500 elsewhere) and 700 (mono + emphasis).

### 7.3 Spacing & radius

```css
--radius-sm: 6px;
--radius-md: 10px;
--radius-lg: 14px;
--radius-xl: 16px;
```

Vertical rhythm in rem (1rem, 1.5rem, 2rem). Internal component gaps in px (8, 12, 16).

### 7.4 Component patterns

**Code pill** (gold on navy)
```html
<span class="code-pill">RSA-14</span>
```
```css
.code-pill {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 700;
  background: var(--gold);
  color: var(--navy-deep);
  padding: 5px 10px;
  border-radius: 4px;
  letter-spacing: 0.1em;
}
```

**Eyebrow label** (small mono caption above headings)
```html
<div class="eyebrow">Find</div>
```
```css
.eyebrow {
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--gold-deep);
  font-weight: 700;
  display: flex; align-items: center; gap: 8px;
}
.eyebrow::before {
  content: ''; width: 18px; height: 2px; background: var(--gold);
}
```

**Hero broadcast card** (the sticker result)
- `background: var(--navy)` with `color: var(--bg)`
- 4px top accent stripe with the gold-red-gold pattern (see mockup `result-broadcast::before`)
- Faint gold circle decoration in the bottom-right corner (pitch arc reference)
- Scoreboard inside: `background: var(--navy-deep)`, gold page number 52px

**Country card** (browse grid)
- White surface, 1.5px border in `--border`, 10px radius
- Flag top-left, group badge top-right
- Code in Anton 18px
- Name in body 11px muted
- Page number in mono 9px in `--gold-deep`

**Bottom navigation**
- `background: var(--navy)`
- Inactive: text in `rgba(244,241,232,0.5)`
- Active: text and a 3px gold underline (positioned above the icon)

Reference the mockup HTML (`panini_pwa_mockup_v2.html`) for the full visual.

### 7.5 Iconography

- Library: `lucide-svelte`
- Sticker types:
  - emblem → `shield`
  - team_photo → `users` or `image`
  - player → `user`
- Trophy logomark in the brand badge: custom inline SVG (see mockup for reference)

### 7.6 Identity motifs (recurring)

1. **Gold-red-gold accent stripe** at the top of every hero card (`result-broadcast::before` in the mockup). The pattern is: 0–45% gold, 45–60% red, 60–100% gold. This is the recurring identity mark.
2. **Pitch corner arc**: a faint gold circle (12% opacity, 2px stroke) decorating the bottom-right of hero cards.
3. **Live dot**: 6px red dot with a 30%-opacity halo, used in the header next to the countdown.
4. **Trophy in brand mark**: small custom SVG of a stylized cup, gold on navy, in a 28px rounded square.

---

## 8. Setup Instructions (for the owner)

### One-time setup

```bash
git clone <your-repo>
cd mundial26

# --- Admin ---
cd admin/Mundial26.Admin
# First time only — set the SQL Server connection string in user-secrets:
dotnet user-secrets set "ConnectionStrings:Mundial26" "Server=…;Initial Catalog=…;User ID=…;Password=…;TrustServerCertificate=True;Encrypt=False;"
dotnet run -- --seed                       # creates tables (if missing) + seeds from Seed/panini_wc2026.json
dotnet run                                 # opens http://localhost:5000 (or whatever Kestrel binds)

# --- PWA ---
cd ../../web
npm install
npm run dev                                # opens http://localhost:5173
```

### Day-to-day workflow

```bash
# Edit data in the admin (browser at localhost:5000)
# When ready to publish corrections:
# Click "Export JSON" in the admin → writes ../web/static/data/panini-wc2026.json
# Then:
cd web
git add static/data/panini-wc2026.json
git commit -m "data: update page numbers / typo fixes"
git push
# Vercel auto-deploys in ~30 seconds
```

---

## 9. Deployment

### PWA → Vercel

1. Push the repo to GitHub.
2. In Vercel: "Import Git Repository", select the repo, set:
   - **Root directory:** `web`
   - **Framework preset:** SvelteKit (auto-detected)
   - **Build command:** `npm run build` (default)
3. Deploy. First deploy gives you `mundial26-xxx.vercel.app`.
4. Add custom domain `mundial26.co` in Vercel project settings.
5. Vercel shows two DNS records to add:
   - An `A` record on the apex (@) pointing to `76.76.21.21` (Vercel's anycast IP — verify in the dashboard, this can change)
   - A `CNAME` for `www` pointing to `cname.vercel-dns.com`
6. Add those records at GoDaddy (DNS Management → Records → Add). HTTPS auto-provisions in a few minutes.

### Admin → never deployed

The admin UI stays on the owner's local machine. State lives in a SQL Server `mundial` database on the owner-controlled server (host + credentials are stored locally via `dotnet user-secrets`, never in the repo). **Back it up periodically** via SQL Server's `BACKUP DATABASE` (scheduled job, or a manual `.bak` copy after significant editing sessions).

The admin app needs network reachability to the SQL Server when running — unlike the SQLite-era setup, you can't edit offline.

### Email

Already configured at GoDaddy. Verify that SPF, DKIM, and DMARC records exist on `mundial26.co` (DNS Management → Records). If anything's missing, GoDaddy's "email setup" help page has the exact values.

---

## 10. Open Decisions (post-V1)

- **Tip jar provider.** Pick after launch and a couple of weeks of usage data. Options to compare: Ko-fi, Buy Me a Coffee, PayPal.me, Nequi/Daviplata QR for Colombian audience. Different fee profiles for international vs. local senders.
- **Analytics.** If desired: Plausible (privacy-friendly, $9/month) or Umami (self-hosted, free). Not in V1.
- **Play Store presence (V1.5).** Wrap as a Trusted Web Activity (TWA) for Play Store discoverability. ~1 day of work, no code changes to the PWA.
- **OG image generation.** Per-sticker dynamic OG cards would dramatically improve share-ability on WhatsApp. Defer to V1.5.
- **Group letters.** Most countries' groups won't be known until the FIFA draw on 2026-XX-XX. Add as data comes in.

---

## 11. Execution Order for Claude Code

Implement in this order. Each step is independently verifiable.

### Phase 1 — Admin core
1. Scaffold the .NET solution + project + Dapper + `Microsoft.Data.SqlClient`. Initialize `user-secrets` and store the connection string. (A1)
2. Implement POCO models, `Sql/Schema.sql`, `SqlConnectionFactory`, `SchemaBootstrapper`. Schema runs idempotently on every startup. (A2)
3. Implement the seed script. **Verify:** running it populates the DB with 48 countries × 20 stickers = 960 sticker rows, plus 40 specials and one `AlbumMeta` row. (A3)
4. Implement the JSON exporter. **Verify:** exporting without any edits produces a JSON whose diff against the seed file shows *only* `generated_at` at the top and `group: null` once per country (since the seed lacks `group` but §4.1 requires it). Zero other lines should differ. (A7)

### Phase 2 — Admin UI
5. Country list page. (A4)
6. Country edit page. (A5)
7. Specials page. (A6)
8. Export page. (A8) **Verify:** edit a page number for one country → export → diff the JSON → only that field changed.

### Phase 3 — PWA core
9. Scaffold SvelteKit project. (B1)
10. Add design tokens (CSS variables) and global styles per §7. Confirm fonts load.
11. Type definitions + data loader with IndexedDB caching. (B2) **Verify:** load app, check IndexedDB has the album data, reload offline → still works.

### Phase 4 — PWA pages
12. Home page with search bar (single-field mode only first). (B3, B4)
13. Country detail page. (B5)
14. Sticker detail page (the broadcast card — match the mockup precisely). (B6)
15. Browse page with country grid. (B7)
16. About page with tip-jar placeholder. (B8)
17. Search bar — add Country + № mode toggle. (Extend B3)

### Phase 5 — Polish
18. i18n setup with Spanish complete, English/Portuguese roughly translated. (B9)
19. PWA configuration: manifest, service worker, icons. **Verify:** installable on Android, works offline. (B10)
20. SEO meta tags + sitemap. (B11)

### Phase 6 — Deployment
21. Push repo to GitHub.
22. Vercel deploy with custom domain.
23. Smoke test on a real phone over cellular.

Each phase should be committed with conventional commits (`feat(admin):`, `feat(web):`, `chore:`, etc.). Don't jump phases; verify each before proceeding.

---

## 12. Instructions for Claude Code

- **Stick to the spec.** If something feels missing, flag it in chat rather than adding it silently. Especially: don't add features outside V1 scope (no collection tracking, no scanning, no accounts).
- **No new dependencies** beyond those listed in §3 unless explicitly justified.
- **Use idiomatic patterns** for each stack:
  - Admin: Razor Pages with `BindProperty`, `OnGet`/`OnPost`, Dapper `QueryAsync` / `ExecuteAsync` with parameterized SQL inside the page-model handlers (or thin repository services where it pays off). Transactions explicit via `connection.BeginTransactionAsync()`.
  - Web: SvelteKit's built-in patterns — `+page.svelte`, `+page.ts`, `load` functions, server-side prerendering where possible.
- **Type everything.** No `any` in TS, no `dynamic` in C#.
- **Match the design.** The v2 mockup HTML (`panini_pwa_mockup_v2.html`) is the visual reference. Don't deviate without checking in.
- **Write minimal READMEs** in `admin/` and `web/` — how to run, how to build, link to this dev plan.
- **No tests in V1.** Manual verification per §11 is sufficient for an app this size with static data.
- **Commit per phase** in §11. Conventional commit format.
- **Don't run dev servers in the background.** Assume the owner does that.
- **The seed JSON is already produced** and lives at `admin/Seed/panini_wc2026.json`. Place it there before phase 1.

---

## 13. Data Quality Notes

The seed JSON inherits typos from the source (community-maintained Football Cartophilic Info Exchange). The admin tool exists partly to fix these. Known issues to watch for during data entry:

- ENG-4: "Maric Guéhi" → "Marc Guéhi"
- CZE-18: "Vacilav Cerny" → "Václav Černý"
- IRN-2: "Alirez Beiranvand" → "Alireza Beiranvand"
- MAR-3: "Munir El Kajoui" → check current spelling
- Diacritics on many Eastern European names need verification.

Don't fix these in the seed file. Fix them in the admin DB and re-export. That way the seed remains a snapshot of the source.

---

## 14. Acceptance Criteria for V1

V1 is done when **all** of the following are true:

- [ ] `dotnet run` in `/admin` starts the local data-entry tool. All 48 countries listed. Editing a page number and saving persists across restarts.
- [ ] Clicking "Export JSON" in the admin writes a valid `panini-wc2026.json` to `/web/static/data/`. The file passes JSON schema validation against the TS types in §4.1.
- [ ] `npm run dev` in `/web` starts the PWA. Typing `RSA-14` in the search bar instantly shows "Bathusi Aubaas, South Africa, page X" (where X is whatever was entered in the admin).
- [ ] Browsing to `/c/RSA` shows the country detail page with all 20 stickers and the album page number.
- [ ] The language switcher cycles between Spanish, English, and Portuguese. UI strings change correctly.
- [ ] The PWA can be installed on Android (Add to Home Screen) and on iOS Safari (Share → Add to Home Screen).
- [ ] After install, the PWA opens to a result for a previously-viewed sticker code while offline (airplane mode).
- [ ] The deployed PWA at `mundial26.co` loads over HTTPS, scores 95+ on Lighthouse PWA audit, and works correctly on a real phone over cellular.
- [ ] Visual design matches `panini_pwa_mockup_v2.html` within reasonable fidelity (colors, type, layout, motifs).

That's V1. Ship it. Then we talk about V2.
