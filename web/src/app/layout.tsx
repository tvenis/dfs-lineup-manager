import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./figma-colors.css";
import App from "./App";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DK Lineup Manager",
  description: "Daily Fantasy Football Lineup Manager",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <App>{children}</App>
      </body>
    </html>
  );
}
