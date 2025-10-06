"use client";

import { useState, useEffect } from 'react';
import { buildApiUrl, API_CONFIG } from '@/config/api';

export default function TestApiPage() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testApiCalls = async () => {
    setLoading(true);
    setError(null);
    const testResults: any = {};

    try {
      // Test 1: Basic API health
      console.log('Testing API health...');
      const healthResponse = await fetch(buildApiUrl('/health'));
      testResults.health = {
        status: healthResponse.status,
        ok: healthResponse.ok,
        data: await healthResponse.json()
      };

      // Test 2: Default draft group
      console.log('Testing default draft group...');
      const draftGroupResponse = await fetch(buildApiUrl('/api/weeks/1/default-draft-group'));
      testResults.draftGroup = {
        status: draftGroupResponse.status,
        ok: draftGroupResponse.ok,
        data: await draftGroupResponse.json()
      };

      // Test 3: Player pool
      console.log('Testing player pool...');
      const playerPoolResponse = await fetch(buildApiUrl('/api/players/pool/1?excluded=false&limit=10&draft_group=131064'));
      testResults.playerPool = {
        status: playerPoolResponse.status,
        ok: playerPoolResponse.ok,
        data: await playerPoolResponse.json()
      };

      // Test 4: Player profiles
      console.log('Testing player profiles...');
      const profilesResponse = await fetch(buildApiUrl('/api/players/profiles-with-pool-data-optimized?limit=5'));
      testResults.profiles = {
        status: profilesResponse.status,
        ok: profilesResponse.ok,
        data: await profilesResponse.json()
      };

      setResults(testResults);
    } catch (err) {
      console.error('API test error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testApiCalls();
  }, []);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">API Test Page</h1>
      
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          API Base URL: {API_CONFIG.BASE_URL}
        </p>
      </div>

      {loading && (
        <div className="text-center py-4">
          <p>Testing API endpoints...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
          <h3 className="font-semibold text-red-800">Error:</h3>
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {results && (
        <div className="space-y-4">
          {Object.entries(results).map(([key, result]: [string, any]) => (
            <div key={key} className="border rounded p-4">
              <h3 className="font-semibold mb-2 capitalize">{key}</h3>
              <div className="space-y-2">
                <p><strong>Status:</strong> {result.status}</p>
                <p><strong>OK:</strong> {result.ok ? '✅' : '❌'}</p>
                <div>
                  <strong>Data:</strong>
                  <pre className="bg-gray-100 p-2 rounded mt-1 text-xs overflow-auto max-h-40">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}