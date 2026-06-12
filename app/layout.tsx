import type { Metadata } from "next";
import { Inter, Source_Serif_4, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Editorial Legal type system.
// Sans: Inter (UI, body). Serif: Source Serif 4 (headings, display).
// Mono: JetBrains Mono (hashes, transaction ids, anchor proofs).
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "We Agree — Cryptographic Agreements",
  description:
    "Draft, sign, and anchor agreements with passkey-bound Ed25519 signatures and a public, verifiable proof of record.",
};

// Inline, blocking script: applies the saved theme (or system default) BEFORE
// React renders so there is no light-flash on dark-mode loads.
const themeInitScript = `
(function(){
  try {
    var t = localStorage.getItem('theme');
    var sys = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = t === 'dark' || (!t && sys);
    var c = document.documentElement.classList;
    if (dark) c.add('dark');
    if (t === 'light') c.add('light');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${sourceSerif.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
