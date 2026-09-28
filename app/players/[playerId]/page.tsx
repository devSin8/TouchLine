import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlayers } from "@/lib/data";
import { per90Totals, getRatingFormula } from "@/lib/ratings";
import { RatingRing } from "@/components/rating-ring";
import { PillarBars } from "@/components/pillar-bars";

export const dynamic = "force-dynamic";

const number = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
const date = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export default async function PlayerPage({ params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params;
  const players = await getPlayers();
  let decodedPlayerId = playerId;
  try { decodedPlayerId = decodeURIComponent(playerId); } catch { /* Keep the original value for a clear not-found response. */ }
  const player = players.find((item) => item.id === decodedPlayerId);
  if (!player) notFound();
  const p90 = per90Totals(player);
  const totals = player.totals;
  const scored = player.rating !== null;
  const metricGroups = [
    { title: "Attacking production", accent: "mint", metrics: [["Goals", "goals"], ["Assists", "assists"], ["Shots", "shots"], ["On target", "shots_on_target"], ["Dribbles completed", "dribbles_completed"], ["Dribble success", "dribbles_attempted"]] },
    { title: "Possession & playmaking", accent: "blue", metrics: [["Touches", "touches"], ["Passes completed", "passes_completed"], ["Passes attempted", "passes_attempted"], ["Progressive passes", "progressive_passes"], ["Crosses", "crosses"]] },
    { title: "Defensive actions", accent: "violet", metrics: [["Tackles", "tackles"], ["Interceptions", "interceptions"], ["Clearances", "clearances"], ["Recoveries", "recoveries"], ["Duels won", "duels_won"], ["Duels lost", "duels_lost"], ["Aerials won", "aerial_duels_won"], ["Aerials lost", "aerial_duels_lost"]] },
    { title: "Discipline", accent: "amber", metrics: [["Possession lost", "possession_lost"], ["Fouls committed", "fouls_committed"], ["Fouls won", "fouls_won"], ["Yellow cards", "yellow_cards"], ["Red cards", "red_cards"]] },
  ] as const;
  return <main className="detail-shell">
    <header className="detail-topbar"><Link href="/" className="back-link"><span>←</span> All players</Link><span className="wordmark small"><span className="brand-mark">T</span> TOUCHLINE</span><span className="topbar-note">PLAYER PROFILE</span></header>
    <div className="detail-content">
      <div className="breadcrumb"><Link href="/">Players</Link><span>/</span>{player.player_name}</div>
      <section className="profile-hero">
        <div className="profile-copy">
          <div className="eyebrow"><span className="live-dot" /> PLAYER PROFILE <span className="eyebrow-divider">·</span> {player.age_group} COHORT</div>
          <h1>{player.player_name}</h1>
          <div className="profile-meta"><span className="team-mark">{player.team.slice(0, 1)}</span><b>{player.team}</b><span className="meta-divider" />{player.position ?? "Position unavailable"}<span className="meta-divider" />{player.appearances} {player.appearances === 1 ? "appearance" : "appearances"}</div>
          <div className="profile-stats"><div><span>TOTAL MINUTES</span><b>{number(player.minutes)}<small> min</small></b></div><div><span>MATCHES PLAYED</span><b>{player.appearances}<small> games</small></b></div><div><span>PER 90 MINUTES</span><b>{number(p90.goals)}<small> goals</small></b></div></div>
        </div>
        <div className="profile-rating"><RatingRing rating={player.rating} large /><div><span>AGE GROUP RATING</span><b>{player.rating === null ? "Not rated" : `${Math.round(player.rating)}th percentile`}</b><small>{player.age_group} · all rated positions</small></div></div>
      </section>

      <section className="section-block"><div className="section-heading"><div><div className="eyebrow muted">PERFORMANCE PROFILE</div><h2>How the rating comes together</h2></div><span className="peer-note">Compared to {player.position ?? "position"} peers</span></div>
        {scored ? <PillarBars player={player} /> : <div className="notice-card"><b>Rating unavailable for this position</b><p>The supplied formula does not include weights for {player.position || "an unlisted position"}. Statistics and match history are still available.</p></div>}
      </section>

      <section className="section-block match-section"><div className="section-heading"><div><div className="eyebrow muted">THE MATCHES BEHIND THE RATING</div><h2>Match log <span className="count-chip">{player.events.length}</span></h2></div><span className="peer-note">Most recent first</span></div>
        <div className="table-frame match-frame"><table className="match-table"><thead><tr><th>DATE</th><th>OPPONENT</th><th>VENUE</th><th>RESULT</th><th>MINS</th><th>MATCH SCORE</th><th>HIGHLIGHTS</th></tr></thead><tbody>{player.events.map((event, index) => {
          const result = event.goals_for > event.goals_against ? "W" : event.goals_for < event.goals_against ? "L" : "D";
          const highlights = [event.goals ? `${event.goals} ${event.goals === 1 ? "goal" : "goals"}` : "", event.assists ? `${event.assists} ${event.assists === 1 ? "assist" : "assists"}` : "", event.interceptions ? `${event.interceptions} interceptions` : "", event.shots_on_target ? `${event.shots_on_target} on target` : ""].filter(Boolean).slice(0, 2);
          return <tr key={`${event.match_id}-${index}`}><td className="date-cell">{date(event.match_date)}</td><td><b>{event.opponent}</b><small>{event.competition}</small></td><td><span className="venue-label">{event.venue}</span></td><td><span className={`result-pill ${result.toLowerCase()}`}>{result} {event.goals_for}–{event.goals_against}</span></td><td>{number(event.minutes_played)}′</td><td className="score-cell">{event.raw_rating === null ? "—" : event.raw_rating.toFixed(2)}</td><td>{highlights.length ? highlights.join(" · ") : "—"}</td></tr>;
        })}</tbody></table></div><p className="score-explainer">Match score is the raw weighted composite from the supplied formula. The overall player rating is the age group percentile.</p>
      </section>

      <section className="section-block stats-section"><div className="section-heading"><div><div className="eyebrow muted">SEASON OUTPUT</div><h2>Raw numbers <span className="count-chip">Totals & per 90</span></h2></div></div>
        <div className="stat-grid">{metricGroups.map((group) => <article className={`stat-card ${group.accent}`} key={group.title}><h3>{group.title}</h3><div className="stat-card-rule" />{group.metrics.map(([label, key]) => {
          const successRate = key === "dribbles_attempted" ? (totals.dribbles_attempted ? `${Math.round(totals.dribbles_completed / totals.dribbles_attempted * 100)}%` : "—") : null;
          const passAccuracy = key === "passes_attempted" ? (totals.passes_attempted ? `${Math.round(totals.passes_completed / totals.passes_attempted * 100)}%` : "—") : null;
          return <div className="stat-line" key={key}><span>{label}</span><b>{number(totals[key])}{successRate && <small> {successRate}</small>}{passAccuracy && <small> {passAccuracy}</small>}</b><span className="per90-value">{number(p90[key])}<small> /90</small></span></div>;
        })}</article>)}</div>
      </section>
      <footer className="detail-foot"><span>RATING METHOD</span><p>{getRatingFormula(player.position)}. Player score is weighted by minutes played, then ranked within the {player.age_group} cohort.</p></footer>
    </div>
  </main>;
}
