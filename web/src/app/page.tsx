"use client";

import { WeeklyLineupManager } from "@/components/WeeklyLineupManager";
import { LineupService } from "@/lib/lineupService";

export default function HomePage() {
  const testExport = async () => {
    try {
      console.log('Testing export with known lineup ID...');
      const lineupId = '853a82e6-62ee-406b-8937-4d440c589967';
      const blob = await LineupService.exportLineup(lineupId);
      console.log('Export successful! Blob size:', blob.size);
      
      // Create download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'test-export.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Test export failed:', error);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">DFS Lineup Manager</h1>
      <button 
        onClick={testExport}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Test Export
      </button>
      <WeeklyLineupManager selectedWeek="1" />
    </div>
  );
}
// Vercel deployment test - Wed Aug 27 17:48:20 EDT 2025
// Simplified Vercel config test - Sat Aug 30 20:08:40 EDT 2025
