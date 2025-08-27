// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  ENDPOINTS: {
    PLAYERS: '/api/players',
    WEEKS: '/api/weeks',
    TEAMS: '/api/teams',
    LINEUPS: '/api/lineups',
    CSV_IMPORT: '/api/csv'
  }
};

// Helper function to build full API URLs
export const buildApiUrl = (endpoint: string): string => {
  // Ensure the endpoint starts with a slash
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Remove trailing slash to prevent double slashes when appending paths
  const trimmedEndpoint = cleanEndpoint.endsWith('/') ? cleanEndpoint.slice(0, -1) : cleanEndpoint;
  
  return `${API_CONFIG.BASE_URL}${trimmedEndpoint}`;
};
