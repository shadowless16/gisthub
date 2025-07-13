import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import UserModel, { sanitizeUser } from "@/lib/models/User"
import { ObjectId } from "mongodb"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ids = searchParams.getAll('ids'); // Get all 'ids' query parameters
    console.log('Bulk user fetch requested IDs:', ids);

    if (!ids || ids.length === 0) {
      console.log('No IDs provided to bulk user fetch.');
      return NextResponse.json({ users: [] }); // Return empty array if no IDs provided
    }

    // Validate all IDs
    const objectIds = ids.map(id => {
      if (!ObjectId.isValid(id)) {
        throw new Error("Invalid user ID in bulk request"); // Throw error for any invalid ID
      }
      return new ObjectId(id);
    });
    console.log('Bulk user fetch valid ObjectIds:', objectIds);

    const { db } = await connectToDatabase();
    const usersCollection = db.collection("users");

    const users = await usersCollection.find({ _id: { $in: objectIds } }).toArray();
    console.log('Bulk user fetch found users:', users);

    // Sanitize and return users
    return NextResponse.json({
      users: users.map(user => sanitizeUser(user)),
    });
  } catch (error: any) {
    console.error("Get bulk users error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}