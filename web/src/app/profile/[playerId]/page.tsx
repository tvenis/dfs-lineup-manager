"use client";

import { useParams } from "next/navigation";
import { PlayerProfile } from "@/components/PlayerProfile";

interface PageProps {
  params: Promise<{ playerId: string }>;
}

export default async function PlayerProfilePage({ params }: PageProps) {
  const { playerId } = await params;

  return (
    <div className="p-6">
      <PlayerProfile playerId={playerId} />
    </div>
  );
}
