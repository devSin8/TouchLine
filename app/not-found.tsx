import Link from "next/link";

export default function NotFound() {
  return <main className="not-found"><div className="eyebrow">PLAYER PROFILE</div><h1>We couldn’t find this player.</h1><Link href="/">Back to all players →</Link></main>;
}
