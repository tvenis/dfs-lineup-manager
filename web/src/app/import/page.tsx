"use client";

import { Suspense } from "react";
import { ImportManager } from "@/components/ImportManager";

export default function ImportPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ImportManager />
    </Suspense>
  );
}


