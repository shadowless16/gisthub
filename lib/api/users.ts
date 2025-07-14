// lib/api/users.ts
import { connectToDatabase } from '../mongodb';
import { ObjectId } from 'mongodb';

export async function getUsers() {
  const { db } = await connectToDatabase();
  const users = await db.collection('users').find({}).toArray();
  return users.map((user: any) => ({ ...user, id: user._id }));
}

export async function createUser(data: any) {
  const { db } = await connectToDatabase();
  const result = await db.collection('users').insertOne(data);
  return { ...data, id: result.insertedId };
}

export async function updateUser(data: any) {
  const { db } = await connectToDatabase();
  const { id, ...rest } = data;
  // Ensure ID is converted to ObjectId for MongoDB query
  await db.collection('users').updateOne({ _id: new ObjectId(id) }, { $set: rest });
  return { id, ...rest };
}

export async function deleteUser(id: string) {
  const { db } = await connectToDatabase();
  await db.collection('users').deleteOne({ _id: new ObjectId(id) });
  return { id };
}