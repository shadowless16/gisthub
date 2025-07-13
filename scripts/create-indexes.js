"use strict";
const { connectToDatabase } = require("../lib/mongodb");
async function createIndexes() {
    const { db } = await connectToDatabase();
    await db.collection("comments").createIndex({ postId: 1 });
    await db.collection("comments").createIndex({ userId: 1 });
    await db.collection("users").createIndex({ username: 1 }, { unique: true });
    await db.collection("users").createIndex({ email: 1 }, { unique: true });
    console.log("Indexes created successfully.");
}
createIndexes().catch(console.error);
