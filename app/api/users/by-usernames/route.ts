// app/api/users/by-usernames/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { dbConnect } from "@/lib/mongoose";
import mongoose from "mongoose";
import type { Model } from "mongoose";

// Defensive import for the User model, similar to your other route
let User: Model<any>;
try {
  User = mongoose.models.User || require("@/lib/models/User").default || require("@/lib/models/User");
} catch (e) {
  User = require("@/lib/models/User").default || require("@/lib/models/User");
}

/**
 * Handles POST requests to fetch users by a list of usernames.
 * This is used for extracting tagged users from content.
 */
export async function POST(request: NextRequest) {
  await dbConnect(); // Ensure database connection

  try {
    const body = await request.json();
    const { usernames } = body; // Expecting { usernames: ["user1", "user2"] }

    // Validate input
    if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
      return NextResponse.json({
        message: "Invalid or empty 'usernames' array provided.",
        success: false
      }, { status: 400 });
    }

    // Fetch users from the database based on the provided usernames
    // Select specific fields for the response, exclude sensitive ones like password
    const users = await User.find({ username: { $in: usernames } }).select('_id username profilePic');

    // Return the found users
    return NextResponse.json({ success: true, results: users });

  } catch (error: any) {
    console.error("Error in /api/users/by-usernames POST:", error);
    return NextResponse.json({
      message: "Internal server error.",
      error: error.message || "An unknown error occurred."
    }, { status: 500 });
  }
}

// If you also want to support GET for some reason, you can add it here,
// but for the PostCreator's tagging, POST is what's expected.
/*
export async function GET(request: NextRequest) {
  await dbConnect();
  try {
    const searchParams = request.nextUrl.searchParams;
    const usernamesString = searchParams.get('usernames');

    if (!usernamesString) {
      return NextResponse.json({ message: "No usernames provided", success: false }, { status: 400 });
    }

    const usernames = usernamesString.split(',').map(name => name.trim()).filter(name => name.length > 0);

    if (usernames.length === 0) {
      return NextResponse.json({ message: "No valid usernames provided", success: false }, { status: 400 });
    }

    const users = await User.find({ username: { $in: usernames } }).select('_id username profilePic');
    return NextResponse.json({ success: true, results: users });

  } catch (error: any) {
    console.error("Error in /api/users/by-usernames GET:", error);
    return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 });
  }
}
*/