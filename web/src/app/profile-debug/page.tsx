"use client";

import { useState, useEffect } from 'react';
import { PlayerService } from '@/lib/playerService';

export default function ProfileDebugPage() {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const testApiCall = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('Testing API call...');
        console.log('API_CONFIG.BASE_URL:', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000');
        
        const data = await PlayerService.getPlayerProfilesWithPoolData({ limit: 5 });
        console.log('API call successful:', data);
        setResult(data);
      } catch (err) {
        console.error('API call failed:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    testApiCall();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Profile Debug Page</h1>
      
      <div className="mb-4">
        <p><strong>API Base URL:</strong> {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}</p>
        <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <h3 className="font-bold">Error:</h3>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          <h3 className="font-bold">Success:</h3>
          <p>Players loaded: {result.players?.length || 0}</p>
          <p>Total: {result.total}</p>
          <pre className="mt-2 text-sm overflow-auto max-h-96">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
