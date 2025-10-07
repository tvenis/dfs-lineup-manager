"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PlayerActualsTable } from "@/components/PlayerActualsTable";

export default function PlayerActualsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Player Actuals</h1>
        <p className="mt-2 text-sm text-gray-600">
          Player actual performance data and statistics
        </p>
      </div>

      {/* Player Actuals Table */}
      <PlayerActualsTable />
      
      {/* Future components can be added here */}
      {/* Example: <PlayerActualsAnalytics /> */}
      {/* Example: <PlayerActualsTrends /> */}
      {/* Example: <PlayerActualsSummary /> */}
    </div>
  );
}
