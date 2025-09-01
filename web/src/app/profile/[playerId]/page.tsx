"use client";

import { useParams } from "next/navigation";
import { PlayerProfile } from "@/components/PlayerProfile";

export default function PlayerProfilePage() {
  const params = useParams();
  const playerId = params.playerId as string;

  return (
    <div className="p-6">
      <PlayerProfile playerId={playerId} />
    </div>
  );
}
