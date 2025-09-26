import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    
    console.log('Test Profile API - playerId:', playerId);
    
    // Test if we can reach the backend API
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const backendUrl = `${apiUrl}/api/players`;
    
    console.log('Test Profile API - backendUrl:', backendUrl);
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Backend API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      playerId,
      apiUrl,
      backendUrl,
      playersCount: data.players?.length || 0,
      samplePlayer: data.players?.[0] || null,
    });
    
  } catch (error) {
    console.error('Test Profile API - Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      playerId: request.nextUrl.searchParams.get('playerId'),
    }, { status: 500 });
  }
}
