import { PlayerProfile } from "@/components/PlayerProfile";
import { PlayerService } from "@/lib/playerService";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

// ISR Configuration - Revalidate every 5 minutes
export const revalidate = 300;

// Allow dynamic params for new player IDs
export const dynamicParams = true;

// Generate dynamic metadata for SEO
export async function generateMetadata({ params }: PlayerProfilePageProps): Promise<Metadata> {
  const { playerId } = await params;
  
  try {
    const playerData = await fetchPlayerData(playerId);
    
    if (!playerData?.player) {
      return {
        title: "Player Not Found",
        description: "The requested player profile could not be found.",
      };
    }

    const player = playerData.player;
    const title = `${player.displayName} - Player Profile | DK Lineup Manager`;
    const description = `View ${player.displayName}'s fantasy football profile, stats, projections, and analysis for DraftKings contests. Position: ${player.position}, Team: ${player.team}.`;

    return {
      title,
      description,
      keywords: [
        player.displayName,
        player.position,
        player.team,
        "fantasy football",
        "draftkings",
        "player profile",
        "DFS analysis"
      ],
      openGraph: {
        title,
        description,
        type: 'profile',
        images: player.playerImage160 ? [
          {
            url: player.playerImage160,
            width: 160,
            height: 160,
            alt: player.displayName,
          }
        ] : [],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: player.playerImage160 ? [player.playerImage160] : [],
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: "Player Profile | DK Lineup Manager",
      description: "View player profiles and analysis for DraftKings contests.",
    };
  }
}

interface PlayerProfilePageProps {
  params: Promise<{
    playerId: string;
  }>;
}

async function fetchPlayerData(playerId: string) {
  try {
    console.log("Server: Fetching data for playerId:", playerId);

    // Use the optimized endpoint that searches across all draft groups
    const profilesResponse = await PlayerService.getPlayerProfilesWithPoolData({ 
      limit: 1000,
      show_hidden: true // Include hidden players to be thorough
    });

    console.log("Server: Total players in response:", profilesResponse.players?.length);

    const playerProfile = profilesResponse.players?.find(profile =>
      profile.playerDkId.toString() === playerId.toString()
    );

    if (playerProfile) {
      // Player found in profiles - convert to Player format
      const player = {
        playerDkId: playerProfile.playerDkId,
        firstName: playerProfile.firstName,
        lastName: playerProfile.lastName,
        suffix: playerProfile.suffix,
        displayName: playerProfile.displayName,
        shortName: playerProfile.shortName,
        position: playerProfile.position,
        team: playerProfile.team,
        playerImage50: playerProfile.playerImage50,
        playerImage160: playerProfile.playerImage160,
        hidden: playerProfile.hidden,
        created_at: playerProfile.created_at,
        updated_at: playerProfile.updated_at
      };

      // Store weekly summary data
      const weeklyData = {
        currentWeekProj: playerProfile.currentWeekProj ?? null,
        currentWeekSalary: playerProfile.currentWeekSalary ?? null,
        ownership: playerProfile.ownership ?? null,
        status: playerProfile.status || 'Available'
      };

      return { player, weeklyData, playerPoolData: null };
    } else {
      // Fallback: Try direct player lookup
      console.log("Server: Player not found in profiles, trying direct lookup");
      const playerPoolEntry = await PlayerService.getPlayerByDkId(parseInt(playerId));
      
      if (playerPoolEntry) {
        console.log("Server: Found player directly:", playerPoolEntry);
        return { 
          player: playerPoolEntry.player, 
          weeklyData: null,
          playerPoolData: playerPoolEntry 
        };
      }
    }

    return null;
  } catch (error) {
    console.error("Server: Error fetching player data:", error);
    // Return null to let the client component handle the data fetching
    return null;
  }
}

export default async function PlayerProfilePage({ params }: PlayerProfilePageProps) {
  const { playerId } = await params;

  // Validate playerId
  if (!playerId) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> No player ID provided</span>
        </div>
      </div>
    );
  }

  // Fetch player data on the server
  const playerData = await fetchPlayerData(playerId);

  // If server-side fetching fails, still render the component and let it handle client-side fetching
  return (
    <div className="p-6">
      <ErrorBoundary
        onError={(error, errorInfo) => {
          console.error('PlayerProfile Error:', error, errorInfo);
          // Could send to analytics/monitoring service here
        }}
      >
        <PlayerProfile 
          playerId={playerId} 
          initialPlayerData={playerData?.player || null}
          initialWeeklyData={playerData?.weeklyData || null}
          initialPlayerPoolData={playerData?.playerPoolData || null}
        />
      </ErrorBoundary>
    </div>
  );
}
