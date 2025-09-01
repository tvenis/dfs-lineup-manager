"use client";

import { LineupBuilder } from "@/components/LineupBuilder";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function BuilderPageContent() {
  const searchParams = useSearchParams();
  const lineupId = searchParams.get('lineupId') || undefined;
  
  return <LineupBuilder lineupId={lineupId} />;
}

export default function BuilderPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BuilderPageContent />
    </Suspense>
  );
}


