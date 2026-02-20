// app/layout.tsx

import type { Metadata } from "next";
import "./globals.css";
import { ThemeInitializer } from "@/components/theme/ThemeInitializer";

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
      <body className="bg-canvas text-ink antialiased">
        <ThemeInitializer />
        {children}
      </body>
    </html>
  );
}
