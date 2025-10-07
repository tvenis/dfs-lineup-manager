import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const position = searchParams.get('position') || 'QB';
    const limit = parseInt(searchParams.get('limit') || '25');
    const sortBy = searchParams.get('sort_by') || 'total_dk_points';
    const sortDirection = searchParams.get('sort_direction') || 'desc';

    // Build backend URL
    const backendUrl = new URL(`${process.env.NEXT_PUBLIC_API_URL}/api/actuals/top25`);
    backendUrl.searchParams.set('position', position);
    backendUrl.searchParams.set('limit', limit.toString());
    backendUrl.searchParams.set('sort_by', sortBy);
    backendUrl.searchParams.set('sort_direction', sortDirection);

    const response = await fetch(backendUrl.toString());
    
    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching top 25 players:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top 25 players' },
      { status: 500 }
    );
  }
}
