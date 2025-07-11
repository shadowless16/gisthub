import { NextRequest, NextResponse } from 'next/server';
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { Story, sanitizeStory } from '@/lib/models/Story';
import { connectToDatabase } from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';

// GET: Fetch all active stories (not expired)
export async function GET() {
  const { db } = await connectToDatabase();
  const now = new Date();
  const stories = await db.collection('stories')
    .find({ expiresAt: { $gt: now } })
    .sort({ createdAt: -1 })
    .toArray();
  return NextResponse.json({ stories: stories.map((s: any) => sanitizeStory(s)) });
}

// POST: Create a new story (image only)
export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const contentType = req.headers.get('content-type') || '';
  let imageUrl = '';
  let text = '';

  if (contentType.startsWith('multipart/form-data')) {
    // Parse multipart form
    const formData = await req.formData();
    const file = formData.get('image');
    text = formData.get('text')?.toString() || '';
    if (file && typeof file === 'object' && 'arrayBuffer' in file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      try { mkdirSync(uploadsDir, { recursive: true }); } catch {}
      const filename = `story_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
      const filepath = path.join(uploadsDir, filename);
      writeFileSync(filepath, buffer);
      imageUrl = `/uploads/${filename}`;
    }
  } else {
    // JSON fallback (for text-only stories)
    const body = await req.json();
    imageUrl = body.imageUrl || '';
    text = body.text || '';
  }

  if (!imageUrl && !text) {
    return NextResponse.json({ error: 'Image or text required' }, { status: 400 });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h
  const story: Story = {
    userId: new (require('mongodb').ObjectId)(user.userId),
    imageUrl,
    text,
    createdAt: now,
    expiresAt,
  };
  const { db } = await connectToDatabase();
  const result = await db.collection('stories').insertOne(story);
  story._id = result.insertedId;
  return NextResponse.json({ story: sanitizeStory(story) });
}
