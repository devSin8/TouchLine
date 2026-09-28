import type { MatchEvent } from "@/lib/types";

const required = ["match_id", "match_date", "age_group", "team", "player_name", "minutes_played"];
const numericFields = [
  "goals_for", "goals_against", "minutes_played", "touches", "passes_attempted", "passes_completed",
  "progressive_passes", "crosses", "dribbles_attempted", "dribbles_completed", "shots", "shots_on_target",
  "goals", "assists", "duels_won", "duels_lost", "aerial_duels_won", "aerial_duels_lost", "tackles",
  "interceptions", "recoveries", "clearances", "fouls_committed", "fouls_won", "yellow_cards", "red_cards", "possession_lost",
] as const;

export function parseCsv(text: string): MatchEvent[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && quoted && text[i + 1] === '"') { cell += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += char;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  const headers = (rows.shift() ?? []).map((value) => value.trim().replace(/^\uFEFF/, ""));
  const missing = required.filter((key) => !headers.includes(key));
  if (missing.length) throw new Error(`CSV is missing required columns: ${missing.join(", ")}`);

  return rows.filter((values) => values.some((value) => value.trim())).map((values, rowIndex) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => { record[header] = values[index] ?? ""; });
    if (!record.player_name?.trim()) throw new Error(`Row ${rowIndex + 2} has no player_name.`);
    const event: Record<string, unknown> = {};
    for (const header of headers) event[header] = record[header]?.trim() ?? "";
    for (const field of numericFields) event[field] = Number(record[field]) || 0;
    event.position = record.position?.trim() || null;
    event.match_date = normalizeDate(record.match_date);
    return event as unknown as MatchEvent;
  });
}

export function normalizeDate(value: string): string {
  const input = value.trim();
  const dmy = input.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  const iso = input.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Could not read match date: ${input}`);
  return parsed.toISOString().slice(0, 10);
}
