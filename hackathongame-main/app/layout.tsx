import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Darkness Explorer — Neuro Rehab",
  description: "Juego de rehabilitación neuromotora post-ictus basado en eye-tracking",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Script
          src="https://cdn.jsdelivr.net/npm/webgazer@2.1.0/dist/webgazer.min.js"
          strategy="afterInteractive"
        />
        {children}
      </body>
    </html>
  );
}
