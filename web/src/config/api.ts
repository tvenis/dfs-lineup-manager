// API Configuration  
const getApiBaseUrl = () => {
  // Use environment variable if set
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // For production/preview, use same origin (Vercel domain)
  if (typeof window !== 'undefined' && window.location.origin.includes('vercel.app')) {
    return window.location.origin;
  }
  
  // Local development fallback
  return 'http://localhost:8000';
};

export const API_CONFIG = {
  BASE_URL: getApiBaseUrl(),
  ENDPOINTS: {
    PLAYERS: '/api/players',
    WEEKS: '/api/weeks',
    TEAMS: '/api/teams',
    GAMES: '/api/games',
    LINEUPS: '/api/lineups',
    CSV_IMPORT: '/api/csv',
    CONTESTS: '/api/contests',
    DRAFTGROUPS: '/api/draftgroups',
    COMMENTS: '/api/comments'
  }
};

// Helper function to build full API URLs
export const buildApiUrl = (endpoint: string): string => {
  // Ensure the endpoint starts with a slash
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Use endpoint as-is (no automatic trailing slash handling needed)
  return `${API_CONFIG.BASE_URL}${cleanEndpoint}`;
};
