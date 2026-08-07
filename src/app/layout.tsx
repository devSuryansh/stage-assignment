import { Inter, Poppins } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const poppins = Poppins({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata = {
  title: "Cultural Adaptation Studio",
  description:
    "Production-pack module: adapt a screenplay into Bangru Haryanvi with continuity-safe visuals",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${poppins.variable} min-h-screen bg-surface-base text-neutral-100 antialiased`}
        style={{
          fontFamily: "var(--font-body), sans-serif",
          background: "var(--surface-base)",
          color: "var(--text-primary)",
        }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
