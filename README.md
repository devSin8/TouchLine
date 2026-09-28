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

- `players` stores player identity, team, age group and position. The unique key is name + age group + team because the source has no provider player ID.
- `matches` stores fixture identity, date, competition and the home/away clubs.
- `appearances` stores one player's statistics and match-context result for one fixture. It references a player and a match, and `(match_id, player_id)` is unique.

This avoids repeating fixture/player details for each event row while retaining each row's team-specific opponent, venue and score.

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

## Project structure

- `app/` — dashboard, player profile, admin login/session routes and protected CSV import route.
- `components/` — interactive player table and rating visualizations.
- `lib/` — CSV parser, rating logic and Supabase/data access.
- `data/xdrona_match_events.csv` — starter dataset from the assignment.
- `supabase/schema.sql` — database schema.
