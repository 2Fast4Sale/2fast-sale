import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { ToastProvider } from "../components/Toast";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "2Fast4Sale — KI-Inserate in 2 Minuten",
  description: "Fahrzeugschein scannen, Studio-Fotos per KI, direkt auf mobile.de & AutoScout24 veröffentlichen.",
  openGraph: {
    title: "2Fast4Sale — KI-Inserate in 2 Minuten",
    description: "Fahrzeugschein scannen, Studio-Fotos per KI, direkt auf mobile.de & AutoScout24 veröffentlichen.",
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
      <body className={inter.className}><ToastProvider>{children}</ToastProvider></body>
    </html>
  );
}
