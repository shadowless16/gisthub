/**
 * POST /api/auth/login
 *
 * Request body:
 *   {
 *     identifier: string, // email or username
 *     password: string
 *   }
 *
 * Response:
 *   200 OK: { message, user, token }
 *   400 Bad Request: { error }
 *   401 Unauthorized: { error }
 *   500 Internal Server Error: { error }
 *
 * Allows login with either email or username and password.
 */
import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { verifyPassword, generateToken } from "@/lib/auth"
import UserModel from "@/lib/models/User"
import { sanitizeUser } from "@/lib/models/User"

export async function POST(request: NextRequest) {
  try {

    const { identifier, password } = await request.json()

    if (!identifier || !password) {
      return NextResponse.json({ error: "Email/Username and password are required" }, { status: 400 })
    }

    const { db } = await connectToDatabase()
    const usersCollection = db.collection("users")

    // Find user by email or username
    const user = await usersCollection.findOne({
      $or: [
        { email: identifier },
        { username: identifier }
      ]
    })

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash)

    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Generate JWT token
    const token = generateToken({
      userId: user._id!.toString(),
      username: user.username,
      email: user.email,
    })

    // Create response with cookie
    const response = NextResponse.json({
      message: "Login successful",
      user: sanitizeUser(user),
      token,
    })

    // Set HTTP-only cookie
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
