import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const position = searchParams.get('position');
    const week = searchParams.get('week');
    const season = searchParams.get('season');
    const tier = searchParams.get('tier');
    
    console.log('Player Actuals Summary API - Query params:', { position, week, season, tier });
    
    // Build backend URL
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const backendUrl = `${apiUrl}/api/actuals/summary`;
    
    console.log('Player Actuals Summary API - backendUrl:', backendUrl);
    
    // Build query string for backend
    const backendParams = new URLSearchParams();
    if (position && position !== 'all') backendParams.append('position', position);
    if (week && week !== 'all') backendParams.append('week', week);
    if (season && season !== 'all') backendParams.append('season', season);
    if (tier && tier !== 'all') backendParams.append('tier', tier);
    
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
    console.error('Player Actuals Summary API - Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
