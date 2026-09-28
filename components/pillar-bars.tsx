import type { Player } from "@/lib/types";

export function PillarBars({ player }: { player: Player }) {
  const pillars = [
    { name: "Attacking", score: player.attack_percentile, color: "mint", note: "Goals, assists, shots on target & dribbling" },
    { name: "Passing & creation", score: player.passing_percentile, color: "blue", note: "Progression, crossing & pass completion" },
    { name: "Defending", score: player.defending_percentile, color: "violet", note: "Tackles, interceptions, regains & duels" },
  ];
  return <div className="pillar-grid">{pillars.map((pillar) => <article className={`pillar-card ${pillar.color}`} key={pillar.name}>
    <div className="pillar-top"><span>{pillar.name}</span><b>{pillar.score === null ? "—" : `${Math.round(pillar.score)}th`}<small>{pillar.score === null ? "" : " percentile"}</small></b></div>
    <div className="pillar-track"><i style={{ width: `${pillar.score ?? 0}%` }} /></div>
    <p>{pillar.note}</p>
  </article>)}</div>;
}
