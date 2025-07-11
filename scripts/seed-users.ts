import { connectToDatabase } from "../lib/mongodb";
import { hashPassword } from "../lib/auth";
import "dotenv/config";
import { ObjectId } from "mongodb";
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function seedUsers() {
  const { db } = await connectToDatabase();
  const usersCollection = db.collection("users");

  // Find AkD (admin) user
  const admin = await usersCollection.findOne({ username: "AkD" });
  if (!admin) {
    console.error("Admin user 'AkD' not found. Please create this user first.");
    process.exit(1);
  }

  const users = [
    { username: "user1", email: "user1@example.com", password: "password1" },
    { username: "user2", email: "user2@example.com", password: "password2" },
    { username: "user3", email: "user3@example.com", password: "password3" },
    // Add more users as needed
  ];

  for (const user of users) {
    const existing = await usersCollection.findOne({ $or: [ { email: user.email }, { username: user.username } ] });
    if (existing) {
      console.log(`User ${user.username} already exists, skipping.`);
      continue;
    }
    const passwordHash = await hashPassword(user.password);
    const now = new Date();
    const newUser = {
      username: user.username,
      email: user.email,
      passwordHash,
      followers: [admin._id],
      following: [admin._id],
      createdAt: now,
    };
    const result = await usersCollection.insertOne(newUser);
    // Add this user to AkD's followers
    await usersCollection.updateOne({ _id: admin._id }, { $addToSet: { followers: result.insertedId } });
    console.log(`Seeded user: ${user.username}`);
  }

  console.log("Seeding complete.");
  process.exit(0);
}

seedUsers().catch((err) => {
  console.error(err);
  process.exit(1);
});
