"use client";

import { WeeklyLineupManager } from "@/components/WeeklyLineupManager";

export default function HomePage() {
  console.log('HomePage component rendering');
  
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">DFS Lineup Manager</h1>
      <WeeklyLineupManager />
    </div>
  );
}
// Build trigger - Wed Aug 27 17:38:27 EDT 2025
