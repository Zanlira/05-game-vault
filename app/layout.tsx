import type { Metadata } from "next";
import { Press_Start_2P, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/app/context/UserContext";
import Nav from "@/app/components/Nav";

const pressStart2P = Press_Start_2P({
  weight: "400",
  variable: "--font-pixel",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Arcade Vault",
  description: "Play games and compete for points",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${pressStart2P.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        <div className="av-bg" />
        <div className="av-noise" />
        <UserProvider>
          <div id="root">
            <Nav />
            <main className="av-main">{children}</main>
            <footer className="pixel" style={{ textAlign: "center", padding: "24px 16px", fontSize: 8, color: "var(--ink-faint)", letterSpacing: "0.16em", borderTop: "1px solid var(--line)" }}>
              ARCADE VAULT © 2026 · INSERT COIN TO CONTINUE
            </footer>
          </div>
        </UserProvider>
      </body>
    </html>
  );
}
