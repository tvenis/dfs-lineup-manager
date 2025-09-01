"use client";

import { useState, useEffect } from 'react';

export default function PlayerPoolPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simple test to see if the page loads
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading player pool...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Player Pool</h1>
          <p className="text-gray-600 mt-1">Player pool page is loading...</p>
        </div>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <p className="text-center text-gray-600">
          Player pool functionality is temporarily disabled while fixing chunk loading issues.
        </p>
      </div>
    </div>
  );
}