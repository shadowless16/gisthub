import { NextRequest, NextResponse } from 'next/server'
import { getSuggestedUsers } from '@/lib/api/suggested-users'

export async function GET(req: NextRequest) {
  try {
    const users = await getSuggestedUsers()
    return NextResponse.json({ users })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch suggested users' }, { status: 500 })
  }
}
