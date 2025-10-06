"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PlayerPropsTable } from "@/components/PlayerPropsTable";

export default function PlayerPropsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Player Props</h1>
        <p className="mt-2 text-sm text-gray-600">
          Player prop betting results and analytics
        </p>
      </div>

      {/* Player Props Table */}
      <PlayerPropsTable />
      
      {/* Future components can be added here */}
      {/* Example: <PlayerPropsAnalytics /> */}
      {/* Example: <PlayerPropsTrends /> */}
      {/* Example: <PlayerPropsSummary /> */}
    </div>
  );
}
