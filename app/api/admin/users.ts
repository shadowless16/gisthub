import { NextResponse } from 'next/server';
import { getUsers, createUser, updateUser, deleteUser } from '@/lib/api/users';

export async function GET(request: Request) {
  const users = await getUsers();
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const data = await request.json();
  const user = await createUser(data);
  return NextResponse.json(user);
}

export async function PUT(request: Request) {
  const data = await request.json();
  const user = await updateUser(data);
  return NextResponse.json(user);
}

export async function DELETE(request: Request) {
  const { id } = await request.json();
  const result = await deleteUser(id);
  return NextResponse.json(result);
}
