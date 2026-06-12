import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./globals-print.css";
import { PortfolioProvider } from "./hooks/usePortfolioData";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "Rising Capital Group — Options Desk Trading Dashboard",
  description: "Instant, secure trading performance, position risk, trade activity, and overnight carry analysis dashboard for Rising Capital Group options trading desk DLL11706.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="font-sans antialiased text-brand-text-primary bg-white">
        <PortfolioProvider>
          {children}
        </PortfolioProvider>
      </body>
    </html>
  );
}
