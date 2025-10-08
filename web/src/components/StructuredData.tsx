"use client";

import { useEffect } from 'react';

interface Player {
  playerDkId: number;
  displayName: string;
  firstName: string;
  lastName: string;
  position: string;
  team: string;
  playerImage160?: string;
}

interface StructuredDataProps {
  player?: Player;
  type?: 'player' | 'website';
}

export function StructuredData({ player, type = 'website' }: StructuredDataProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Remove existing structured data
    const existingScript = document.querySelector('script[type="application/ld+json"]');
    if (existingScript) {
      existingScript.remove();
    }

    let structuredData;

    if (type === 'player' && player) {
      structuredData = {
        "@context": "https://schema.org",
        "@type": "Person",
        "@id": `https://your-domain.com/profile/${player.playerDkId}`,
        "name": player.displayName,
        "givenName": player.firstName,
        "familyName": player.lastName,
        "jobTitle": `Professional ${player.position}`,
        "worksFor": {
          "@type": "SportsTeam",
          "name": player.team
        },
        "image": player.playerImage160,
        "url": `https://your-domain.com/profile/${player.playerDkId}`,
        "description": `${player.displayName} - ${player.position} for ${player.team} - Fantasy Football Player Profile`,
        "sameAs": [
          `https://www.draftkings.com/player/${player.playerDkId}`
        ]
      };
    } else {
      structuredData = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "DK Lineup Manager",
        "description": "Professional Daily Fantasy Football lineup management tool with player analysis, projections, and optimization for DraftKings contests.",
        "url": "https://your-domain.com",
        "applicationCategory": "SportsApplication",
        "operatingSystem": "Web Browser",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        },
        "creator": {
          "@type": "Organization",
          "name": "DK Lineup Manager"
        },
        "keywords": [
          "daily fantasy football",
          "draftkings",
          "lineup optimizer",
          "fantasy sports",
          "DFS",
          "player analysis",
          "projections"
        ]
      };
    }

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(structuredData);
    document.head.appendChild(script);

    return () => {
      const scriptToRemove = document.querySelector('script[type="application/ld+json"]');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [player, type]);

  return null;
}
