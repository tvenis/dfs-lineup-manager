"use client";

import { Suspense } from "react";
import { ImportGameResults } from "@/components/ImportGameResults";

export default function GamesImportPage() {
  return (
    <div className="container mx-auto py-6">
      <Suspense fallback={<div>Loading...</div>}>
        <ImportGameResults />
      </Suspense>
    </div>
  );
}
