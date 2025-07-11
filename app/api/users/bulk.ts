import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { Types } from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ids = searchParams.getAll('ids');
    if (!ids || ids.length === 0) {
      return NextResponse.json([], { status: 200 });
    }
    await connectToDatabase();
    // Convert string ids to ObjectId, skip invalid
    const objectIds = [];
    const invalidIds = [];
    for (const id of ids) {
      if (/^[a-fA-F0-9]{24}$/.test(id)) {
        objectIds.push(new Types.ObjectId(id));
      } else {
        invalidIds.push(id);
      }
    }
    // ...existing code...
    if (objectIds.length === 0) {
      return NextResponse.json([], { status: 200 });
    }
    const users = await User.find({ _id: { $in: objectIds } }, {
      username: 1,
      profilePic: 1,
      bio: 1,
    }).lean();
    // Convert _id to string for frontend
    const result = users.map((u: any) => ({
      _id: u._id.toString(),
      username: u.username,
      profilePic: u.profilePic,
      bio: u.bio,
    }));
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    if (err instanceof Error) {
      console.error('Bulk user fetch error:', err.message, err.stack);
      return NextResponse.json({ error: 'Server error', details: err.message, stack: err.stack }, { status: 500 });
    } else {
      console.error('Bulk user fetch error:', err);
      return NextResponse.json({ error: 'Server error', details: String(err) }, { status: 500 });
    }
  }
}