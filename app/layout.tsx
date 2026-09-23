import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Domingo Admin",
  description: "Administration for the public Domingo website.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <div className="toast" id="domingo-toast" role="status" aria-live="polite" />
      </body>
    </html>
  );
}