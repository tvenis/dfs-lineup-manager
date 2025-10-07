"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PlayerActualsTable } from "@/components/PlayerActualsTable";
import { Top25ByPositionTable } from "@/components/Top25ByPositionTable";

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

      {/* Tables Side by Side */}
      <div className="flex gap-6">
        <PlayerActualsTable />
        <Top25ByPositionTable />
      </div>
    </div>
  );
}
