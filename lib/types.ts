export type Position = "ST" | "W" | "CM" | "FB" | "CB" | "GK" | string;

export type MatchEvent = {
  match_id: string;
  match_date: string;
  competition: string;
  age_group: string;
  home_team: string;
  away_team: string;
  team: string;
  opponent: string;
  venue: string;
  goals_for: number;
  goals_against: number;
  player_name: string;
  position: string | null;
  minutes_played: number;
  touches: number;
  passes_attempted: number;
  passes_completed: number;
  progressive_passes: number;
  crosses: number;
  dribbles_attempted: number;
  dribbles_completed: number;
  shots: number;
  shots_on_target: number;
  goals: number;
  assists: number;
  duels_won: number;
  duels_lost: number;
  aerial_duels_won: number;
  aerial_duels_lost: number;
  tackles: number;
  interceptions: number;
  recoveries: number;
  clearances: number;
  fouls_committed: number;
  fouls_won: number;
  yellow_cards: number;
  red_cards: number;
  possession_lost: number;
};

export type ScoredEvent = MatchEvent & {
  attack: number;
  passing: number;
  defending: number;
  penalty: number;
  raw_rating: number | null;
};

export type Player = {
  id: string;
  player_name: string;
  team: string;
  age_group: string;
  position: string | null;
  appearances: number;
  minutes: number;
  rating: number | null;
  raw_rating: number | null;
  attack_percentile: number | null;
  passing_percentile: number | null;
  defending_percentile: number | null;
  events: ScoredEvent[];
  totals: Record<string, number>;
};
