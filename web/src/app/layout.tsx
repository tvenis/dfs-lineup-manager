import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./figma-colors.css";
import App from "./App";
import { StructuredData } from "@/components/StructuredData";

// ISR Configuration - Global revalidation every 10 minutes
export const revalidate = 600;

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "DK Lineup Manager",
    template: "%s | DK Lineup Manager"
  },
  description: "Professional Daily Fantasy Football lineup management tool with player analysis, projections, and optimization for DraftKings contests.",
  keywords: [
    "daily fantasy football",
    "draftkings",
    "lineup optimizer",
    "fantasy sports",
    "DFS",
    "player analysis",
    "projections",
    "lineup builder"
  ],
  authors: [{ name: "DK Lineup Manager" }],
  creator: "DK Lineup Manager",
  publisher: "DK Lineup Manager",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'DK Lineup Manager',
    description: 'Professional Daily Fantasy Football lineup management tool with player analysis, projections, and optimization for DraftKings contests.',
    siteName: 'DK Lineup Manager',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DK Lineup Manager',
    description: 'Professional Daily Fantasy Football lineup management tool with player analysis, projections, and optimization for DraftKings contests.',
    creator: '@yourtwitterhandle',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <StructuredData type="website" />
        <App>{children}</App>
      </body>
    </html>
  );
}
