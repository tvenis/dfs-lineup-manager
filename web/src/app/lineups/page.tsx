"use client";

import { WeeklyLineupManager } from "@/components/WeeklyLineupManager";

export default function LineupsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">DFS Lineup Manager</h1>
      <WeeklyLineupManager selectedWeek="1" />
    </div>
  );
}

