import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./figma-colors.css";
import App from "./App";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DK Lineup Manager",
  description: "Daily Fantasy Football Lineup Manager",
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
// Test comment to trigger Preview deployment - Tue Sep 16 23:33:43 CDT 2025
