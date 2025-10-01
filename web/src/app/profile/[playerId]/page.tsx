"use client";

import { useParams } from "next/navigation";
import { PlayerProfile } from "@/components/PlayerProfile";
import { useEffect, useState } from "react";

export default function PlayerProfilePage() {
  const params = useParams();
  const playerId = params?.playerId as string;
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Debug logging for Vercel
    console.log("PlayerProfilePage - params:", params);
    console.log("PlayerProfilePage - playerId:", playerId);
    console.log("PlayerProfilePage - window.location:", window.location.href);
    console.log("PlayerProfilePage - userAgent:", navigator.userAgent);
  }, [params, playerId]);

  // Show loading state until client-side hydration is complete
  if (!isClient) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">Loading player profile...</p>
          </div>
        </div>
      </div>
    );
  }

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

  return (
    <div className="p-6">
      <PlayerProfile playerId={playerId} />
    </div>
  );
}
