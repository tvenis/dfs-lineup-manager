// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  ENDPOINTS: {
    PLAYERS: '/api/players/',
    WEEKS: '/api/weeks/',
    TEAMS: '/api/teams/',
    GAMES: '/api/games/',
    LINEUPS: '/api/lineups/',
    CSV_IMPORT: '/api/csv/'
  }
};

// Helper function to build full API URLs
export const buildApiUrl = (endpoint: string): string => {
  // Ensure the endpoint starts with a slash
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // Ensure the endpoint ends with a slash for FastAPI compatibility
  const finalEndpoint = cleanEndpoint.endsWith('/') ? cleanEndpoint : `${cleanEndpoint}/`;
  
  return `${API_CONFIG.BASE_URL}${finalEndpoint}`;
};
