"use client";

import { Suspense } from "react";
import { SettingsManager } from "@/components/SettingsManager";

export default function SettingsPage() {
  return (
    <Suspense fallback={<div>Loading settings...</div>}>
      <SettingsManager />
    </Suspense>
  );
}
