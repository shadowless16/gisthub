import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Story } from '@/lib/models/Story';
import { connectToDatabase } from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';

// DELETE: Delete a story by ID (only by owner)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { db } = await connectToDatabase();
  const story = await db.collection('stories').findOne({ _id: new (require('mongodb').ObjectId)(params.id) });
  if (!story) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (story.userId.toString() !== user.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  await db.collection('stories').deleteOne({ _id: new (require('mongodb').ObjectId)(params.id) });
  return NextResponse.json({ success: true });
}
