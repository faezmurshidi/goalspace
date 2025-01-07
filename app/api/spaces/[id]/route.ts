import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Replace this with your actual database query
    // For now, we'll use localStorage on the client side
    return NextResponse.json(
      { message: 'Please implement client-side space fetching' },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        }
      }
    );
  } catch (error) {
    console.error('Error in /api/spaces/[id]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch space' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        }
      }
    );
  }
} 