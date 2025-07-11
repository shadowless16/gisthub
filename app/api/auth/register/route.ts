import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { hashPassword, generateToken } from "@/lib/auth"
import { validateEmail, validateUsername, validatePassword } from "@/lib/utils/validation"
import { type User, sanitizeUser } from "@/lib/models/User"

export async function POST(request: NextRequest) {
  try {
    const { username, email, password } = await request.json()

    // Validation
    if (!username || !email || !password) {
      return NextResponse.json({ error: "Username, email, and password are required" }, { status: 400 })
    }

    if (!validateEmail(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    if (!validateUsername(username)) {
      return NextResponse.json(
        { error: "Username must be 3-20 characters, alphanumeric and underscores only" },
        { status: 400 },
      )
    }

    if (!validatePassword(password)) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const usersCollection = db.collection<User>("users")

    // Check if user already exists
    const existingUser = await usersCollection.findOne({
      $or: [{ email }, { username }],
    })

    if (existingUser) {
      return NextResponse.json({ error: "User with this email or username already exists" }, { status: 409 })
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password)
    const newUser: User = {
      username,
      email,
      passwordHash,
      followers: [],
      following: [],
      createdAt: new Date(),
    }

    const result = await usersCollection.insertOne(newUser)
    let createdUser = await usersCollection.findOne({ _id: result.insertedId })

    if (!createdUser) {
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
    }

    // Auto-follow AkD
    const adminUser = await usersCollection.findOne({ username: "AkD" })
    if (adminUser && adminUser._id) {
      // Add AkD to new user's following
      await usersCollection.updateOne({ _id: createdUser._id }, { $addToSet: { following: adminUser._id } })
      // Add new user to AkD's followers
      await usersCollection.updateOne({ _id: adminUser._id }, { $addToSet: { followers: createdUser._id } })
      // Refresh createdUser
      createdUser = await usersCollection.findOne({ _id: result.insertedId })
    }

    // Generate JWT token
    const token = generateToken({
      userId: createdUser._id!.toString(),
      username: createdUser.username,
      email: createdUser.email,
    })

    // Create response with cookie
    const response = NextResponse.json(
      {
        message: "User created successfully",
        user: sanitizeUser(createdUser),
        token,
      },
      { status: 201 },
    )

    // Set HTTP-only cookie
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    return response
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
