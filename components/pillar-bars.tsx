import type { Player } from "@/lib/types";

export function PillarBars({ player }: { player: Player }) {
  const pillars = [
    { name: player.pillar_names[0], score: player.pillar1_percentile, color: "mint", note: player.position === "GK" ? "Pass completion, progression & distribution" : "Goals, assists, shots on target & dribbling" },
    { name: player.pillar_names[1], score: player.pillar2_percentile, color: "blue", note: player.position === "GK" ? "Aerial duels, regains, clearances & interceptions" : "Progression, crossing & pass completion" },
    { name: player.pillar_names[2], score: player.pillar3_percentile, color: "violet", note: player.position === "GK" ? "Lower possession-loss and discipline penalties score higher" : "Tackles, interceptions, regains & duels" },
  ];
  return <div className="pillar-grid">{pillars.map((pillar) => <article className={`pillar-card ${pillar.color}`} key={pillar.name}>
    <div className="pillar-top"><span>{pillar.name}</span><b>{pillar.score === null ? "—" : `${Math.round(pillar.score)}th`}<small>{pillar.score === null ? "" : " percentile"}</small></b></div>
    <div className="pillar-track"><i style={{ width: `${pillar.score ?? 0}%` }} /></div>
    <p>{pillar.note}</p>
  </article>)}</div>;
}
