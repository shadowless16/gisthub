import { NextResponse } from 'next/server';
import { getPosts, createPost, updatePost, deletePost } from '@/lib/api/posts';

export async function GET(request: Request) {
  const posts = await getPosts();
  return NextResponse.json(posts);
}

export async function POST(request: Request) {
  const data = await request.json();
  const post = await createPost(data);
  return NextResponse.json(post);
}

export async function PUT(request: Request) {
  const data = await request.json();
  const post = await updatePost(data);
  return NextResponse.json(post);
}

export async function DELETE(request: Request) {
  const { id } = await request.json();
  const result = await deletePost(id);
  return NextResponse.json(result);
}
