"use client";

import { useState } from 'react';

export default function ProfileNetworkPage() {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const testDirectApiCall = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Testing direct API call...');
      
      // Test direct fetch to backend
      const response = await fetch('http://localhost:8000/api/players/profiles-with-pool-data-optimized?limit=5', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('API call successful:', data);
      setResult(data);
    } catch (err) {
      console.error('API call failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testPlayerServiceCall = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('Testing PlayerService call...');
      
      // Import PlayerService dynamically to avoid SSR issues
      const { PlayerService } = await import('@/lib/playerService');
      const data = await PlayerService.getPlayerProfilesWithPoolData({ limit: 5 });
      
      console.log('PlayerService call successful:', data);
      setResult(data);
    } catch (err) {
      console.error('PlayerService call failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Profile Network Test</h1>
      
      <div className="mb-4 space-y-2">
        <button 
          onClick={testDirectApiCall}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50 mr-2"
        >
          {loading ? 'Testing...' : 'Test Direct API Call'}
        </button>
        
        <button 
          onClick={testPlayerServiceCall}
          disabled={loading}
          className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test PlayerService Call'}
        </button>
      </div>

      <div className="mb-4">
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
