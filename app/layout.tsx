import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "We Agree — Secure Agreement Platform",
  description: "Create, edit, and digitally sign agreements with trust and immutability.",
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
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
