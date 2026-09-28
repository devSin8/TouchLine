"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { Player } from "@/lib/types";
import { RatingRing } from "@/components/rating-ring";

type SortKey = "rating" | "minutes" | "appearances" | "name";
const format = (value: number) => new Intl.NumberFormat("en-US").format(value);

export function PlayerDashboard({ players }: { players: Player[] }) {
  const [search, setSearch] = useState("");
  const [age, setAge] = useState("All age groups");
  const [position, setPosition] = useState("All positions");
  const [sort, setSort] = useState<SortKey>("rating");
  const [uploadState, setUploadState] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const positions = useMemo(() => [...new Set(players.map((player) => player.position).filter(Boolean))].sort() as string[], [players]);
  const rated = players.filter((player) => player.rating !== null);
  const averageRating = rated.length ? rated.reduce((sum, player) => sum + (player.rating ?? 0), 0) / rated.length : 0;
  const leader = rated[0];
  const matches = players.reduce((sum, player) => sum + player.appearances, 0);

  const filtered = useMemo(() => players.filter((player) => {
    const matchesSearch = `${player.player_name} ${player.team}`.toLowerCase().includes(search.toLowerCase());
    return matchesSearch && (age === "All age groups" || player.age_group === age) && (position === "All positions" || player.position === position);
  }).sort((a, b) => {
    if (sort === "name") return a.player_name.localeCompare(b.player_name);
    if (sort === "minutes") return b.minutes - a.minutes;
    if (sort === "appearances") return b.appearances - a.appearances;
    return (b.rating ?? -1) - (a.rating ?? -1) || a.player_name.localeCompare(b.player_name);
  }), [players, search, age, position, sort]);

  async function upload(file?: File) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) { setUploadState("Choose a CSV file to import."); return; }
    setUploading(true); setUploadState("");
    try {
      const form = new FormData(); form.append("file", file);
      const response = await fetch("/api/import", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Import failed.");
      const duplicateNote = result.duplicatesSkipped ? ` (${result.duplicatesSkipped} exact duplicate skipped)` : "";
      setUploadState(`Imported ${format(result.rows)} player match records${duplicateNote}. Refreshing ratings…`);
      window.location.reload();
    } catch (error) {
      setUploadState(error instanceof Error ? error.message : "Could not import this CSV.");
    } finally { setUploading(false); }
  }

  return <div className="app-shell">
    <aside className="sidebar">
      <Link href="/" className="wordmark"><span className="brand-mark">T</span><span>TOUCHLINE<small>PLAYER INTELLIGENCE</small></span></Link>
      <div className="sidebar-caption">WORKSPACE</div>
      <nav className="side-nav"><a className="nav-item active" href="#players"><span className="nav-icon">◈</span> Player ratings <span className="nav-count">{players.length}</span></a><a className="nav-item" href="#players" onClick={() => setAge("All age groups")}><span className="nav-icon">⌁</span> Match data</a></nav>
      <div className="sidebar-bottom"><div className="data-status"><i /><div><b>DATASET LOADED</b><span>Match event export</span></div></div><div className="sidebar-footnote">YOUTH FOOTBALL<br />DATA EXPLORER <span>v1.0</span></div></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="topbar-breadcrumb">Workspace <span>/</span> <b>Player ratings</b></div><div className="topbar-right"><span className="updated-label"><i /> LIVE DATASET</span><div className="avatar">TL</div></div></header>
      <div className="dashboard-content">
        <div className="page-intro"><div><div className="eyebrow"><span className="live-dot" /> PLAYER PERFORMANCE</div><h1>Know the player<br /><em>behind the numbers.</em></h1><p>Age-adjusted ratings, built from every touch, pass and duel.</p></div>
          <div className="intro-actions"><button className="button button-light" onClick={() => fileRef.current?.click()} disabled={uploading}><span className="upload-icon">↑</span>{uploading ? "Importing…" : "Import match data"}</button><input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ""; }} /></div>
        </div>
        {uploadState && <div className={`upload-message ${uploadState.startsWith("Imported") ? "success" : ""}`} role="status">{uploadState}<button aria-label="Dismiss" onClick={() => setUploadState("")}>×</button></div>}
        <section className="overview-grid" aria-label="Dataset overview">
          <article className="overview-card"><div className="overview-card-head"><span>PLAYERS TRACKED</span><span className="card-icon people-icon">♙</span></div><div className="overview-value">{format(players.length)}<span>players</span></div><div className="card-foot"><span className="accent-dot mint-dot" /> Across two youth age groups</div></article>
          <article className="overview-card"><div className="overview-card-head"><span>AVERAGE PERCENTILE</span><span className="card-icon">⌖</span></div><div className="overview-value">{Math.round(averageRating)}<span>PR</span></div><div className="card-foot">Within each player’s age group</div></article>
          <article className="overview-card leader-card"><div className="overview-card-head"><span>TOP RATED PLAYER</span><span className="leader-chip">#1 THIS COHORT</span></div><div className="leader-name">{leader?.player_name ?? "—"}</div><div className="card-foot"><span className="accent-dot blue-dot" />{leader?.team ?? "No scored players"}<span className="leader-rating">{leader?.rating == null ? "—" : `${Math.round(leader.rating)} PR`}</span></div></article>
          <article className="overview-card"><div className="overview-card-head"><span>APPEARANCES</span><span className="card-icon">◷</span></div><div className="overview-value">{format(matches)}<span>matches</span></div><div className="card-foot">Player match records in dataset</div></article>
        </section>

        <section className="players-section" id="players">
          <div className="list-heading"><div><div className="eyebrow muted">THE PLAYER INDEX</div><h2>Player ratings <span className="count-chip">{filtered.length}</span></h2></div><div className="list-caption">Ranked by age group percentile</div></div>
          <div className="filter-bar"><label className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search player or club…" aria-label="Search players or clubs" /><kbd>⌘ K</kbd></label><div className="filter-controls"><select aria-label="Filter by age group" value={age} onChange={(event) => setAge(event.target.value)}><option>All age groups</option><option>U15</option><option>U17</option></select><select aria-label="Filter by position" value={position} onChange={(event) => setPosition(event.target.value)}><option>All positions</option>{positions.map((item) => <option key={item}>{item}</option>)}</select><span className="sort-label">SORT</span><select className="sort-select" aria-label="Sort players" value={sort} onChange={(event) => setSort(event.target.value as SortKey)}><option value="rating">Rating</option><option value="minutes">Minutes</option><option value="appearances">Appearances</option><option value="name">Name</option></select></div></div>
          <div className="table-frame"><table className="player-table"><thead><tr><th>PLAYER</th><th>CLUB</th><th>POSITION</th><th>AGE GROUP</th><th>APPS</th><th>MINUTES</th><th>RATING</th><th /></tr></thead><tbody>{filtered.map((player, index) => <tr key={player.id}>
            <td><Link href={`/players/${encodeURIComponent(player.id)}`} className="player-name-link"><span className={`player-avatar avatar-${index % 5}`}>{player.player_name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}</span><span><b>{player.player_name}</b><small>{player.position ? `${player.position} · ${player.age_group}` : "Position not listed"}</small></span></Link></td>
            <td className="club-cell">{player.team}</td><td><span className={`position-tag ${player.position === "GK" ? "keeper-tag" : ""}`}>{player.position ?? "—"}</span></td><td><span className="age-tag">{player.age_group}</span></td><td className="number-cell">{player.appearances}</td><td className="number-cell">{format(player.minutes)}</td><td><div className="rating-cell"><RatingRing rating={player.rating} /><span>{player.rating === null ? <b className="unrated">Unrated</b> : <><b>{Math.round(player.rating)}<small> PR</small></b><span className="rating-track"><i style={{ width: `${player.rating}%` }} /></span></>}</span></div></td><td><Link className="row-arrow" href={`/players/${encodeURIComponent(player.id)}`} aria-label={`View ${player.player_name}`}>↗</Link></td>
          </tr>)}{!filtered.length && <tr><td colSpan={8} className="empty-state">No players match these filters.</td></tr>}</tbody></table></div>
          <div className="table-footer"><span>Showing <b>{filtered.length}</b> of <b>{players.length}</b> players</span><span>Percentile ranks are relative to rated players in the same age group <i>ⓘ</i></span></div>
        </section>
        <footer className="dashboard-foot"><span>TOUCHLINE <i>·</i> PLAYER INTELLIGENCE</span><span>BUILT FROM {format(matches)} MATCH APPEARANCES</span></footer>
      </div>
    </main>
  </div>;
}
