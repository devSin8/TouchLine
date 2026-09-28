import { getPlayers } from "@/lib/data";
import { PlayerDashboard } from "@/components/player-dashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const players = await getPlayers();
  return <PlayerDashboard players={players} />;
}
