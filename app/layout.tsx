import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Secure Agreement Platform",
  description: "Create, edit, and digitally sign agreements with trust and immutability.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
