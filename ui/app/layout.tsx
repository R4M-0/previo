// app/layout.tsx

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Previo — Collaborative Editor",
  description: "A collaborative Markdown & LaTeX editor with live preview",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-canvas text-ink antialiased">{children}</body>
    </html>
  );
}
