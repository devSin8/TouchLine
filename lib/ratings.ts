import type { MatchEvent, Player, ScoredEvent } from "@/lib/types";

const weights: Record<string, [number, number, number]> = {
  ST: [0.6, 0.2, 0.2], W: [0.5, 0.3, 0.2], CM: [0.25, 0.45, 0.3], FB: [0.2, 0.35, 0.45], CB: [0.1, 0.3, 0.6],
};
const counted = ["touches", "passes_attempted", "passes_completed", "progressive_passes", "crosses", "dribbles_attempted", "dribbles_completed", "shots", "shots_on_target", "goals", "assists", "duels_won", "duels_lost", "aerial_duels_won", "aerial_duels_lost", "tackles", "interceptions", "recoveries", "clearances", "fouls_committed", "fouls_won", "yellow_cards", "red_cards", "possession_lost"] as const;
const per90 = (value: number, minutes: number) => minutes > 0 ? value / minutes * 90 : 0;

export function scoreEvent(event: MatchEvent): ScoredEvent {
  const m = event.minutes_played;
  const attack = 4 * per90(event.goals, m) + 3 * per90(event.assists, m) + 1.5 * per90(event.shots_on_target, m) + 0.8 * per90(event.dribbles_completed, m);
  const passing = per90(event.progressive_passes, m) + 0.8 * per90(event.crosses, m) + 1.2 * (event.passes_attempted ? event.passes_completed / event.passes_attempted * 10 : 0);
  const defending = 1.5 * per90(event.tackles, m) + 1.5 * per90(event.interceptions, m) + 0.8 * per90(event.recoveries, m) + 0.6 * per90(event.clearances, m) + per90(event.duels_won, m);
  const penalty = 0.5 * per90(event.possession_lost, m) + 0.8 * per90(event.fouls_committed, m) + 2 * event.yellow_cards + 5 * event.red_cards;
  const role = event.position ? weights[event.position] : undefined;
  if (event.position === "GK") {
    // The source has no saves or shots-faced fields. Use only measured distribution
    // and defensive involvement, and keep team goals conceded out of the score.
    const keeperActions = 1.5 * per90(event.aerial_duels_won, m) + per90(event.duels_won, m) + 0.8 * per90(event.recoveries, m) + 0.6 * per90(event.clearances, m) + 0.5 * per90(event.interceptions, m);
    return { ...event, pillar1: passing, pillar2: keeperActions, pillar3: -penalty, penalty, raw_rating: 0.4 * passing + 0.6 * keeperActions - penalty };
  }
  const raw_rating = role ? role[0] * attack + role[1] * passing + role[2] * defending - penalty : null;
  return { ...event, pillar1: attack, pillar2: passing, pillar3: defending, penalty, raw_rating };
}

function percentile(value: number, cohort: number[]): number | null {
  if (!cohort.length) return null;
  const less = cohort.filter((score) => score < value).length;
  const equal = cohort.filter((score) => score === value).length;
  return ((less + (equal + 1) / 2 - 0.5) / cohort.length) * 100;
}

export function calculatePlayers(rows: MatchEvent[]): Player[] {
  const grouped = new Map<string, ScoredEvent[]>();
  rows.forEach((row) => {
    const id = `${row.age_group}::${row.team.toLowerCase()}::${row.player_name.toLowerCase()}`;
    const list = grouped.get(id) ?? [];
    list.push(scoreEvent(row)); grouped.set(id, list);
  });
  const players: Player[] = [...grouped.entries()].map(([id, events]) => {
    const minutes = events.reduce((sum, item) => sum + item.minutes_played, 0);
    const positions = events.map((item) => item.position).filter(Boolean);
    const position = positions[0] ?? null;
    const average = (key: "raw_rating" | "pillar1" | "pillar2" | "pillar3") => {
      const available = events.filter((event) => event[key] !== null);
      const time = available.reduce((sum, event) => sum + event.minutes_played, 0);
      return time ? available.reduce((sum, event) => sum + (event[key] as number) * event.minutes_played, 0) / time : null;
    };
    const totals: Record<string, number> = {};
    counted.forEach((field) => { totals[field] = events.reduce((sum, event) => sum + event[field], 0); });
    return {
      id, player_name: events[0].player_name, team: events[0].team, age_group: events[0].age_group, position,
      appearances: events.length, minutes, raw_rating: average("raw_rating"), rating: null,
      pillar1_percentile: null, pillar2_percentile: null, pillar3_percentile: null,
      pillar_names: position === "GK" ? ["Distribution", "Defensive actions", "Ball security"] : ["Attacking", "Passing & creation", "Defending"],
      events: events.sort((a, b) => b.match_date.localeCompare(a.match_date)), totals,
    };
  });
  for (const player of players) {
    const cohort = players.filter((other) => other.age_group === player.age_group && other.raw_rating !== null && ((player.position === "GK") === (other.position === "GK")));
    if (player.raw_rating !== null) player.rating = percentile(player.raw_rating, cohort.map((other) => other.raw_rating as number));
    if (!player.position || player.raw_rating === null) continue;
    const peers = players.filter((other) => other.age_group === player.age_group && other.position === player.position);
    for (const [metric, key] of [["pillar1_percentile", "pillar1"], ["pillar2_percentile", "pillar2"], ["pillar3_percentile", "pillar3"]] as const) {
      player[metric] = percentile(averagePillar(player, key), peers.filter((peer) => peer.raw_rating !== null).map((peer) => averagePillar(peer, key)));
    }
  }
  return players.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1) || a.player_name.localeCompare(b.player_name));
}

function averagePillar(player: Player, key: "pillar1" | "pillar2" | "pillar3"): number {
  const minutes = player.events.reduce((sum, event) => sum + event.minutes_played, 0);
  return minutes ? player.events.reduce((sum, event) => sum + event[key] * event.minutes_played, 0) / minutes : 0;
}

export function per90Totals(player: Player): Record<string, number> {
  return Object.fromEntries(Object.entries(player.totals).map(([key, value]) => [key, player.minutes ? value / player.minutes * 90 : 0]));
}

export function getRatingFormula(position: string | null): string {
  if (position === "GK") return "0.40 distribution + 0.60 defensive actions − discipline and ball-loss penalties (GK proxy; no saves data)";
  const role = position ? weights[position] : undefined;
  return role ? `${role[0].toFixed(2)} attack + ${role[1].toFixed(2)} passing + ${role[2].toFixed(2)} defending − penalties` : "No position weights supplied";
}
