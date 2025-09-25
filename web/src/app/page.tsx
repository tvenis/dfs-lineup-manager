"use client";

import { WeeklyLineupManager } from "@/components/WeeklyLineupManager";

export default function HomePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">DFS Lineup Manager</h1>
      <WeeklyLineupManager selectedWeek="1" />
    </div>
  );
}
// Vercel deployment test - Wed Aug 27 17:48:20 EDT 2025
// Simplified Vercel config test - Sat Aug 30 20:08:40 EDT 2025
