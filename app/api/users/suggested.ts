
import { NextRequest, NextResponse } from 'next/server';
import { getSuggestedUsers } from '@/lib/api/suggested-users';

export async function GET(request: NextRequest) {
  try {
    console.log('[API] Starting suggested users request');
    const suggestedUsers = await getSuggestedUsers(request);
    console.log('[API] Successfully retrieved suggested users');
    return NextResponse.json({ users: suggestedUsers });
  } catch (error: any) {
    console.error('[API] Error in suggested users:', error.message);
    
    // Authentication errors
    if (error.message === "Authentication required for suggested users.") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    
    // Database connection errors
    if (error.message?.includes('MONGODB_URI') || error.message?.includes('MongoClient')) {
      console.error('[API] MongoDB connection error:', error);
      return NextResponse.json(
        { error: 'Database connection error. Please try again later.' },
        { status: 503 }
      );
    }
    
    // User not found errors
    if (error.message?.includes('User not found')) {
      return NextResponse.json(
        { error: 'User account not found. Please log out and log in again.' },
        { status: 404 }
      );
    }
    
    // Invalid user ID errors
    if (error.message?.includes('Invalid user ID')) {
      return NextResponse.json(
        { error: 'Invalid user account. Please log out and log in again.' },
        { status: 400 }
      );
    }
    
    // All other errors
    console.error('[API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
