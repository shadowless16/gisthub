// app/api/posts/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb"; // Assuming this connects to MongoDB Native Driver
// If you're using Mongoose, you might need to import your Mongoose model directly
// and use mongoose.connect instead of connectToDatabase directly in each route.
import { getUserFromRequest } from "@/lib/auth"; // Your utility to get user from request
import { type Post, sanitizePost } from "@/lib/models/Post"; // Your Post model type and sanitize function
import UserModel from "@/lib/models/User"; // Assuming this is your Mongoose User model
import { isSunday } from "@/lib/utils/validation"; // Your utility to check if it's Sunday
import { ObjectId } from "mongodb"; // For MongoDB's ObjectId

// Note: For Next.js App Router, it's often cleaner to import Mongoose models
// directly without the try-catch or require if they're defined properly.
// However, if it's working for you, keep it. If using Mongoose, ensure you're
// connecting to DB once (e.g., in a global setup or a dedicated `connectDB` module
// that prevents multiple connections).
// For direct MongoDB Native Driver (which `connectToDatabase` seems to imply),
// this setup is fine.

export async function GET(request: NextRequest) {
  const start = Date.now();
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const includeAnonymous = searchParams.get("includeAnonymous") === "true";
    const limit = Number.parseInt(searchParams.get("limit") || "20");
    const skip = Number.parseInt(searchParams.get("skip") || "0");

    const { db } = await connectToDatabase();
    const postsCollection = db.collection("posts");
    const usersCollection = db.collection("users");

    // If id param is present, return only that post
    if (id) {
      const post = await postsCollection.findOne({ _id: new ObjectId(id) });
      if (!post) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }
      // Optionally sanitize post here if needed
      return NextResponse.json({ post });
    }

    // Build query
    const query = !includeAnonymous ? { isAnonymous: false } : {};

    // Only fetch needed fields
    const projection = {
      content: 1,
      imageURL: 1,
      videoURL: 1, // Include videoURL in projection
      isAnonymous: 1,
      likes: 1,
      likesCount: 1, // Assuming this is a stored field or derived
      createdAt: 1,
      userId: 1,
    };

    // Get posts with pagination and projection
    const t0 = Date.now();
    const posts = await postsCollection
      .find(query, { projection })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    console.log(`[API LOG] postsCollection.find took ${Date.now() - t0}ms`);

    // Get user data for non-anonymous posts (batch)
    const t1 = Date.now();
    const userIds = posts.filter(p => !p.isAnonymous && p.userId).map(p => p.userId);
    const uniqueUserIds = [...new Set(userIds.map(id => id.toString()))];
    let userMap: Record<string, any> = {};
    if (uniqueUserIds.length > 0) {
      const users = await usersCollection
        .find({ _id: { $in: uniqueUserIds.map(id => new ObjectId(id)) } }, { projection: { username: 1, profilePic: 1 } })
        .toArray();
      userMap = Object.fromEntries(users.map(u => [u._id.toString(), { username: u.username, profilePic: u.profilePic }]));
    }
    console.log(`[API LOG] usersCollection.find took ${Date.now() - t1}ms`);

    const postsWithUsers = posts.map(post => {
      if (post.isAnonymous) return sanitizePost(post as any);
      const user = userMap[post.userId?.toString?.()];
      return sanitizePost(post as any, user);
    });

    const duration = Date.now() - start;
    console.log(`[API LOG] /api/posts GET took ${duration}ms, returned ${postsWithUsers.length} posts`);

    return NextResponse.json({
      posts: postsWithUsers,
      hasMore: posts.length === limit,
    });
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`[API ERROR] /api/posts GET failed after ${duration}ms:`, error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = getUserFromRequest(request);

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // --- CRUCIAL CHANGE HERE: Use request.formData() instead of request.json() ---
    const formData = await request.formData();

    // Extract fields from FormData
    const content = formData.get("content") as string;
    const imageFile = formData.get("image") as File | null;
    const videoFile = formData.get("video") as File | null; // Assuming you might send video too
    const isAnonymousString = formData.get("isAnonymous") as string;
    const taggedUserIdsString = formData.get("taggedUserIds") as string | null;

    if (!content && !imageFile && !videoFile) {
      return NextResponse.json({ error: "Post must have content, an image, or a video" }, { status: 400 });
    }

    if (content && content.trim().length === 0 && !imageFile && !videoFile) {
      return NextResponse.json({ error: "Content is required if no image or video is provided" }, { status: 400 });
    }

    if (content && content.length > 500) { // Only check content length if content exists
      return NextResponse.json({ error: "Content must be less than 500 characters" }, { status: 400 });
    }

    // Convert string to boolean
    const isAnonymous = isAnonymousString === "true";

    // Check if anonymous posting is allowed (only on Sundays)
    if (isAnonymous && !isSunday()) {
      return NextResponse.json({ error: "Anonymous posting is only allowed on Sundays" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const postsCollection = db.collection<Post>("posts");

    let imageURL: string | null = null;
    if (imageFile) {
      // TODO: Implement actual image upload to a service like Cloudinary, S3, or local storage
      // For demonstration, let's assume an upload utility that returns a URL.
      // Example: const uploadResult = await uploadImageToCloudStorage(imageFile);
      // imageURL = uploadResult.url;
      // For now, a placeholder or simple logic
      imageURL = `/uploads/${imageFile.name}`; // This path needs to be handled by a static file server or another API route
      console.log(`[POST API] Received image: ${imageFile.name} (${imageFile.size} bytes)`);
    }

    let videoURL: string | null = null;
    if (videoFile) {
      // TODO: Implement actual video upload logic
      // Example: const uploadResult = await uploadVideoToCloudStorage(videoFile);
      // videoURL = uploadResult.url;
      videoURL = `/uploads/${videoFile.name}`; // This path needs to be handled
      console.log(`[POST API] Received video: ${videoFile.name} (${videoFile.size} bytes)`);
    }

    // Parse taggedUserIds from stringified JSON if it exists
    let taggedUserObjectIds: ObjectId[] = [];
    if (taggedUserIdsString) {
      try {
        const parsedIds: string[] = JSON.parse(taggedUserIdsString);
        if (Array.isArray(parsedIds)) {
          taggedUserObjectIds = parsedIds.map((id: string) => new ObjectId(id));
        }
      } catch (parseError) {
        console.error("Failed to parse taggedUserIds from FormData:", parseError);
        // Continue without tagged users if parsing fails
      }
    }

    const newPost: Post = {
      userId: new ObjectId(currentUser.userId),
      content: typeof content === 'string' ? content.trim() : '', // Always a string
      imageURL: typeof imageURL === 'string' ? imageURL : '', // Always a string
      videoURL: typeof videoURL === 'string' ? videoURL : '',
      isAnonymous: isAnonymous,
      likes: [], // Initialize likes as an empty array
      createdAt: new Date(),
      taggedUserIds: taggedUserObjectIds, // Use parsed ObjectIds
      // Initialize likesCount if your schema expects it
      // likesCount: 0,
    };

    const result = await postsCollection.insertOne(newPost);
    // Fetch the created post to get all its default fields and ensure it's fully populated
    const createdPost = await postsCollection.findOne({ _id: result.insertedId });

    // Create notifications for tagged users
    if (taggedUserObjectIds && taggedUserObjectIds.length > 0 && createdPost) {
      const notificationsCollection = db.collection("notifications");
      const fromUser = await db.collection("users").findOne({ _id: new ObjectId(currentUser.userId) });
      const postIdStr = createdPost?._id ? createdPost._id.toString() : "";
      const notificationDocs = taggedUserObjectIds.map((taggedId: ObjectId) => ({
        userId: taggedId, // Use ObjectId directly
        type: "mention",
        fromUser: {
          name: fromUser?.username || "",
          avatar: fromUser?.profilePic || "",
          _id: fromUser?._id,
        },
        message: `${fromUser?.username || "Someone"} tagged you in a post`,
        link: `/post/${postIdStr}`,
        read: false,
        createdAt: new Date(),
      }));
      await notificationsCollection.insertMany(notificationDocs);
    }

    if (!createdPost) {
      return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
    }

    // Get user data for response (if not anonymous)
    let userData;
    if (!createdPost.isAnonymous) { // Only fetch user if post is not anonymous
      const usersCollection = db.collection("users");
      const user = await usersCollection.findOne({ _id: createdPost.userId });
      if (user) {
        userData = {
          username: user.username,
          profilePic: user.profilePic,
        };
      }
    }

    return NextResponse.json(
      {
        message: "Post created successfully",
        post: sanitizePost(createdPost, userData), // Ensure sanitizePost handles the new `Post` type correctly
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create post error:", error);
    return NextResponse.json({ error: "Internal server error", details: (error as any).message || "Unknown error" }, { status: 500 });
  }
}