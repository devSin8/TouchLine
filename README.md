# Touchline — Player ratings

A Next.js app for exploring the supplied youth-football match export. The landing page ranks players by age-group percentile; each profile explains the player's rating, match log and season totals. The included CSV makes the app usable immediately. Admins can sign in to upload CSVs, which are persisted to Supabase.

## Run locally

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and fill in the Supabase and admin values (Supabase is optional for browsing the included dataset).
4. Run `npm run dev` and open `http://localhost:3000`.

Without Supabase variables, the app reads `data/xdrona_match_events.csv` as its starter dataset. CSV upload requires a connected Supabase project.

## Connect Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. In the project dashboard, open **SQL Editor**, paste `supabase/schema.sql`, and run it. This creates the normalized `players`, `matches` and `appearances` tables, uniqueness constraints and indexes.
3. In **Project Settings → API**, copy the Project URL and the `service_role` key. Put them in `.env.local`. Also set a strong admin password and a separate random session secret of at least 32 characters:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
   ADMIN_UPLOAD_PASSWORD=YOUR_LONG_RANDOM_PASSWORD
   ADMIN_SESSION_SECRET=YOUR_RANDOM_SECRET_AT_LEAST_32_CHARACTERS
   ```

4. Restart the Next.js server. The service-role key is used only in server code. It bypasses row-level security, so keep it private and never expose it in browser code or a public repository.
5. Click **Admin sign in** on the dashboard and enter `ADMIN_UPLOAD_PASSWORD`. An eight-hour, HTTP-only, same-site session cookie unlocks CSV uploads. The import API independently verifies the signed session before writing to Supabase. Sign out when finished.

For Vercel, set all four variables in the project's environment settings and redeploy. Never add a `NEXT_PUBLIC_` prefix to either admin secret.

## Data model

- `players` stores a player's identity, team, age group and position. Its unique key is `(player_name, age_group, team)`: the CSV does not provide a stable provider player ID, and a name alone may not distinguish players on different teams or in different age groups.
- `matches` stores fixture-level details once: match ID, date, competition and home/away teams.
- `appearances` stores each player's statistics and match context for one fixture. It references both a player and a match, and `(match_id, player_id)` is unique so the same player cannot be imported twice for the same fixture.

This is a small normalized relational schema. It avoids repeating player identity and fixture metadata for every event row, keeps match and player facts in their natural places, and still preserves appearance-specific details such as opponent, venue, score and performance stats. Foreign keys keep appearance records connected to valid players and matches; indexes support player-history and date-based reads. The CSV importer resolves or creates the player and match records before upserting appearances. The Next.js server accesses Supabase with the service-role key, so that key must remain private.

## Rating method

The formula follows `Player rating system.txt`:

- Counting events are converted to per-90 rates using minutes played.
- Attack = 4 × goals/90 + 3 × assists/90 + 1.5 × shots on target/90 + 0.8 × dribbles completed/90.
- Passing = progressive passes/90 + 0.8 × crosses/90 + 1.2 × (pass completion ratio × 10).
- Defending = 1.5 × tackles/90 + 1.5 × interceptions/90 + 0.8 × recoveries/90 + 0.6 × clearances/90 + duels won/90.
- Penalty = 0.5 × possession lost/90 + 0.8 × fouls committed/90 + 2 × yellow cards + 5 × red cards.
- Position weights combine those pillars for ST, W, CM, FB and CB; the penalty is subtracted. Player raw scores are averaged across appearances weighted by minutes, then converted to a percentile among rated players in the same age group. Ties share their midpoint rank.
- Pillar percentiles use same-age-group, same-position peers.

The formula sheet does not provide weights for GK or missing positions. The app therefore uses a clearly labeled, provisional goalkeeper proxy: `0.40 × passing/distribution + 0.60 × defensive actions − the same discipline and ball-loss penalty`. Defensive actions use aerial duels won, duels won, recoveries, clearances and interceptions per 90. GK percentiles compare players only to same-age-group goalkeepers. The source has no saves or shots-faced fields, so the proxy does not measure shot-stopping; team goals conceded is deliberately excluded because it reflects the whole defense. Missing-position players remain **Unrated**. The CSV contains one missing position and 26 GK appearances. The source has 365 rows, 184 distinct player/team/age-group identities, and mixed date formats; imported dates are normalized to ISO. One player-match row is duplicated exactly in the supplied CSV, so the importer skips that duplicate and stores 364 unique appearances.

The percentile is the comparable headline rating. Match scores are shown as raw formula composites because the supplied formula does not define a conversion to a 1–10 scale. This model does not adjust for opponent strength, team context or data-provider quality, and small cohorts can move percentiles substantially.

## Project approach note

### What we tried and kept

We used the position-aware rating method supplied in `Player rating system.txt`. The app first calculates attacking, passing and defending contributions from per-90 event rates, applies the appropriate position weights and subtracts the stated penalties. It then averages each player's match scores weighted by minutes and presents an age-group percentile. Pillar percentiles use same-age-group, same-position peers. This keeps the implementation tied to the requested method and makes the ratings easier to explain on player profiles.

The source did not include a goalkeeper formula. We added a clearly labeled provisional proxy based on distribution and defensive actions, with the same discipline and ball-loss penalties, and compare goalkeepers within their age group. We chose not to treat team goals conceded as an individual keeper statistic. Since the CSV has no saves or shots faced, the proxy cannot assess shot-stopping and should be replaced or refined if those fields become available.

### What we discarded

We considered using a different, generic player score, but kept the provided position-weighted system because it was the assignment's stated basis and better reflects that roles value different contributions. We also avoided converting raw composites to a 1–10 score: the supplied method does not define that conversion. The app instead shows percentiles as the headline comparison and keeps the match-level composite clearly identified as a raw score.

### Data observations

- The supplied file has 365 data rows and 184 distinct player/team/age-group identities.
- There is one exact duplicate player-match row. The importer skips it, leaving 364 unique appearances to store.
- The file contains both U15 and U17 players, mixed date formats, one player with no listed position and 26 goalkeeper appearances.
- Dates are normalized during CSV parsing. Missing positions are left unrated when no position weights are available.
- The available goalkeeper event fields do not include saves or shots faced, which limits any keeper rating based on this dataset.

### Where we got stuck and how we resolved it

The main implementation challenges were connecting the app to Supabase and protecting the CSV import route. During setup, the Supabase URL included a REST API path where the client expected the project URL. During import, repeated player-match rows caused a PostgreSQL upsert conflict because one command could affect the same target row twice. We corrected the project URL configuration and deduplicated rows before upserting. We then added admin sign-in and a server-side session check so the import API itself requires authentication, rather than relying only on hiding the upload control in the interface.

### What we would do with one more week

1. Ask coaches or analysts to review the rating weights, especially the provisional goalkeeper proxy, and document any approved changes.
2. Add data-quality checks and an import summary for invalid dates, missing positions, duplicate rows and unexpected values before writing to Supabase.
3. Add automated unit tests for CSV parsing, duplicate handling, per-90 calculations, position weights and percentile ties.
4. Review the schema and access policies with the intended deployment model, and add operational protections such as login rate limiting and a more complete admin account flow if uploads remain in use.
5. Validate the deployed app with the production environment variables and compare a sample of database records and ratings against hand-calculated examples.

### Tools and learning

ChatGPT was used to help clarify the requirements, discuss implementation choices and explain setup and debugging steps. Codex was used to work in the project code, implement the app features, investigate issues and update the project documentation. The project helped build practical understanding of Supabase schemas and relationships, environment-based connections, and the path from parsing a CSV file to validating and storing its records in a database.

## Project structure

- `app/` — dashboard, player profile, admin login/session routes and protected CSV import route.
- `components/` — interactive player table and rating visualizations.
- `lib/` — CSV parser, rating logic and Supabase/data access.
- `data/xdrona_match_events.csv` — starter dataset from the assignment.
- `supabase/schema.sql` — database schema.
