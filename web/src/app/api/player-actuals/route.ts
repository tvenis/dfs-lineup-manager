import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const position = searchParams.get('position');
    const week = searchParams.get('week');
    const season = searchParams.get('season');
    const search = searchParams.get('search');
    const tier = searchParams.get('tier');
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';
    const sortBy = searchParams.get('sort_by') || 'dk_points';
    const sortDirection = searchParams.get('sort_direction') || 'desc';
    
    console.log('Player Actuals API - Query params:', { 
      position, week, season, search, tier, limit, offset, sortBy, sortDirection 
    });
    
    // Build backend URL
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const backendUrl = `${apiUrl}/api/actuals/all`;
    
    console.log('Player Actuals API - backendUrl:', backendUrl);
    
    // Build query string for backend
    const backendParams = new URLSearchParams();
    if (position && position !== 'all') backendParams.append('position', position);
    if (week && week !== 'all') backendParams.append('week', week);
    if (season && season !== 'all') backendParams.append('season', season);
    if (search) backendParams.append('search', search);
    if (tier && tier !== 'all') backendParams.append('tier', tier);
    backendParams.append('limit', limit);
    backendParams.append('offset', offset);
    backendParams.append('sort_by', sortBy);
    backendParams.append('sort_direction', sortDirection);
    
    const fullBackendUrl = `${backendUrl}?${backendParams.toString()}`;
    
    const response = await fetch(fullBackendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Backend API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Player Actuals API - Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
