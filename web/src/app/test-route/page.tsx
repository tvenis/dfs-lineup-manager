"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function TestRoutePage() {
  const [isClient, setIsClient] = useState(false);
  const [currentPath, setCurrentPath] = useState("");

  useEffect(() => {
    setIsClient(true);
    setCurrentPath(window.location.pathname);
  }, []);

  if (!isClient) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Route Test Page</h1>
      <div className="space-y-2">
        <p><strong>Current Path:</strong> {currentPath}</p>
        <p><strong>User Agent:</strong> {navigator.userAgent}</p>
        <p><strong>Timestamp:</strong> {new Date().toISOString()}</p>
      </div>
      
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-2">Test Links:</h2>
        <div className="space-x-4">
          <a 
            href="/profile/11370" 
            className="text-blue-600 hover:underline"
          >
            Test Player Profile (11370)
          </a>
          <a 
            href="/profile/12345" 
            className="text-blue-600 hover:underline"
          >
            Test Player Profile (12345)
          </a>
        </div>
      </div>
    </div>
  );
}
