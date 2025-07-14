// lib/api/posts.ts
import { connectToDatabase } from '../mongodb';
import { ObjectId } from 'mongodb';

export async function getPosts() {
  const { db } = await connectToDatabase();
  const posts = await db.collection('posts').find({}).toArray();
  return posts.map((post: any) => ({ ...post, id: post._id }));
}

export async function createPost(data: any) {
  const { db } = await connectToDatabase();
  const result = await db.collection('posts').insertOne(data);
  return { ...data, id: result.insertedId };
}

export async function updatePost(data: any) {
  const { db } = await connectToDatabase();
  const { id, ...rest } = data;
  // Ensure ID is converted to ObjectId for MongoDB query
  await db.collection('posts').updateOne({ _id: new ObjectId(id) }, { $set: rest });
  return { id, ...rest };
}

export async function deletePost(id: string) {
  const { db } = await connectToDatabase();
  await db.collection('posts').deleteOne({ _id: new ObjectId(id) });
  return { id };
}