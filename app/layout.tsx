import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Touchline — Player ratings",
  description: "Youth football player ratings, backed by match data.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
