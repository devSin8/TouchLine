import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { parseCsv } from "@/lib/csv";
import { calculatePlayers } from "@/lib/ratings";
import type { MatchEvent, Player } from "@/lib/types";

const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

function supabase() {
  if (!supabaseConfigured) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function seedRows(): Promise<MatchEvent[]> {
  const csv = await readFile(path.join(process.cwd(), "data", "xdrona_match_events.csv"), "utf8");
  return parseCsv(csv);
}

async function databaseRows(): Promise<MatchEvent[] | null> {
  const client = supabase();
  if (!client) return null;
  const { data, error } = await client.from("appearances").select("*, players!inner(player_name, age_group, team, position), matches!inner(match_date, competition, home_team, away_team, opponent, venue, goals_for, goals_against)");
  if (error || !data?.length) return null;
  return (data as unknown as Record<string, unknown>[]).map((record) => {
    const player = record.players as Record<string, unknown>;
    const match = record.matches as Record<string, unknown>;
    return {
      ...record, ...player, ...match, team: player.team, match_id: record.match_id,
    } as unknown as MatchEvent;
  });
}

export async function getPlayers(): Promise<Player[]> {
  const rows = await databaseRows() ?? await seedRows();
  return calculatePlayers(rows);
}

export async function persistEvents(inputRows: MatchEvent[]): Promise<number> {
  const client = supabase();
  if (!client) throw new Error("Supabase is not connected yet. Follow the setup steps in the README to enable uploads.");
  const uniqueRows = new Map<string, MatchEvent>();
  for (const row of inputRows) {
    const key = `${row.match_id}\u0000${row.player_name}\u0000${row.age_group}\u0000${row.team}`;
    const previous = uniqueRows.get(key);
    if (!previous) {
      uniqueRows.set(key, row);
    } else if (JSON.stringify(previous) !== JSON.stringify(row)) {
      throw new Error(`The CSV has conflicting duplicate rows for ${row.player_name} in match ${row.match_id}. Keep one row per player per match and resolve the differing stats.`);
    }
  }
  const rows = [...uniqueRows.values()];
  const matches = new Map<string, MatchEvent>();
  const players = new Map<string, MatchEvent>();
  for (const row of rows) {
    matches.set(row.match_id, row);
    players.set(`${row.player_name}::${row.age_group}::${row.team}`, row);
  }

  const { error: matchError } = await client.from("matches").upsert([...matches.values()].map((row) => ({
    match_id: row.match_id, match_date: row.match_date, competition: row.competition,
    home_team: row.home_team, away_team: row.away_team,
  })));
  if (matchError) throw new Error(`Could not save matches: ${matchError.message}`);

  const playerIds = new Map<string, string>();
  for (const [key, row] of players) {
    const { data, error } = await client.from("players").upsert({
      player_name: row.player_name, age_group: row.age_group, team: row.team, position: row.position,
    }, { onConflict: "player_name,age_group,team" }).select("id").single();
    if (error || !data) throw new Error(`Could not save player ${row.player_name}: ${error?.message ?? "unknown error"}`);
    playerIds.set(key, data.id);
  }

  const appearances = rows.map((row) => {
    const {
      player_name, age_group, team, position: _position,
      match_date: _matchDate, competition: _competition, home_team: _homeTeam, away_team: _awayTeam,
      ...stats
    } = row;
    return { ...stats, player_id: playerIds.get(`${player_name}::${age_group}::${team}`) };
  });
  for (let i = 0; i < appearances.length; i += 500) {
    const { error } = await client.from("appearances").upsert(appearances.slice(i, i + 500), { onConflict: "match_id,player_id" });
    if (error) throw new Error(`Could not save player match data: ${error.message}`);
  }
  return rows.length;
}
