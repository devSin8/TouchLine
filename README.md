# Touchline — Player ratings

A Next.js app for exploring the supplied youth-football match export. The landing page ranks players by age-group percentile; each profile explains the player's rating, match log and season totals. The included CSV makes the app usable immediately. CSV uploads are persisted to Supabase after the database is configured.

## Run locally

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and fill in the Supabase values (optional for browsing the included dataset).
4. Run `npm run dev` and open `http://localhost:3000`.

Without Supabase variables, the app reads `data/xdrona_match_events.csv` as its starter dataset. Upload requires a connected Supabase project so the new data can be stored durably.

## Connect Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. In the project dashboard, open **SQL Editor**, paste `supabase/schema.sql`, and run it. This creates the normalized `players`, `matches` and `appearances` tables, uniqueness constraints and indexes.
3. In **Project Settings → API**, copy the Project URL and the `service_role` key. Put them in `.env.local`:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
   ```

4. Restart the Next.js server. The service-role key is used only in server code. It bypasses row-level security, so keep it private and never expose it in browser code or a public repository.
5. Use **Import match data** to upload a CSV with the supplied column names. The app normalizes dates, validates required columns, upserts fixtures and players, then saves player-match appearances. The dashboard reads saved appearances from Supabase.

If you later deploy the app, set the same two environment variables in the hosting provider's server environment. Publishing is not part of the current implementation step.

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

The formula sheet does not provide weights for GK or missing positions. Those players remain searchable with their raw stats and match history, but are labeled **Unrated** and are excluded from rated-player percentiles. The CSV contains one missing position and 26 GK appearances. The source has 365 rows, 184 distinct player/team/age-group identities, and mixed date formats; imported dates are normalized to ISO.

The percentile is the comparable headline rating. Match scores are shown as raw formula composites because the supplied formula does not define a conversion to a 1–10 scale. This model does not adjust for opponent strength, team context or data-provider quality, and small cohorts can move percentiles substantially.

## Project structure

- `app/` — dashboard, player profile and CSV import route.
- `components/` — interactive player table and rating visualizations.
- `lib/` — CSV parser, rating logic and Supabase/data access.
- `data/xdrona_match_events.csv` — starter dataset from the assignment.
- `supabase/schema.sql` — database schema.
