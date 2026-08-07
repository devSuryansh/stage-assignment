import { Newsreader, DM_Sans } from "next/font/google";
import "./globals.css";

const display = Newsreader({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const body = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "Cultural Adaptation Studio",
  description:
    "Adapt screenplays into Bangru Haryanvi and generate a continuity-safe visual production pack",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${display.variable} ${body.variable} min-h-screen bg-[#e8eef2] text-slate-900 antialiased`}
        style={{ fontFamily: "var(--font-body), sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
