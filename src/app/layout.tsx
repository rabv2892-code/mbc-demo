import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Marouane Business Center",
  description: "Logiciel de gestion Café, Eau et Transport",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
