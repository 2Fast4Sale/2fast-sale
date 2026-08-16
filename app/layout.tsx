import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { ToastProvider } from "../components/Toast";
import CookieBanner from "./components/CookieBanner";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "2Fast4Sale — Inserate für Autohändler",
  description: "Fahrzeugschein abfotografieren, Fotos ins Studio setzen, Beschreibung erzeugen lassen. Fertiges Inserat als Fotopaket und PDF.",
  openGraph: {
    title: "2Fast4Sale — Inserate für Autohändler",
    description: "Fahrzeugschein abfotografieren, Fotos ins Studio setzen, Beschreibung erzeugen lassen. Fertiges Inserat als Fotopaket und PDF.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className={inter.variable}>
      <body className={inter.className}><ToastProvider>{children}</ToastProvider><CookieBanner /><Analytics /></body>
    </html>
  );
}
