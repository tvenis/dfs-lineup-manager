"use client";

import { LineupBuilder } from "@/components/LineupBuilder";
import { useSearchParams } from "next/navigation";

export default function BuilderPage() {
  const searchParams = useSearchParams();
  const lineupId = searchParams.get('lineupId') || undefined;
  
  return <LineupBuilder lineupId={lineupId} />;
}


