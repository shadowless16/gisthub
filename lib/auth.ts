// lib/auth.ts
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";

// TEMPORARY: Hardcoded secret for debugging ONLY. DO NOT USE IN PRODUCTION!
const JWT_SECRET = "MY_TEMP_HARDCODED_SECRET_FOR_TESTING_123";

export interface JWTPayload {
  userId: string;
  username: string;
  email: string;
}

/**
 * Hashes a plain-text password using bcrypt.
 * @param password The plain-text password to hash.
 * @returns A promise that resolves with the hashed password.
 */
export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Compares a plain-text password with a hashed password.
 * @param password The plain-text password.
 * @param hashedPassword The hashed password to compare against.
 * @returns A promise that resolves to true if passwords match, false otherwise.
 */
export function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Generates a JSON Web Token (JWT) with the given payload.
 * @param payload The data to include in the token.
 * @returns The signed JWT string.
 */
export function generateToken(payload: JWTPayload): string {
  // DEBUGGING: Log the secret used when GENERATING the token.
  console.log("[JWT DEBUG] Secret used for SIGNING:", JWT_SECRET);
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

/**
 * Verifies a JWT and returns its payload if valid.
 * @param token The JWT string to verify.
 * @returns The JWTPayload if the token is valid, otherwise null.
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    // DEBUGGING: Log the secret used when VERIFYING the token.
    console.log("[JWT DEBUG] Secret used for VERIFYING:", JWT_SECRET);
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    console.log("[JWT DEBUG] Token VERIFIED successfully. Payload:", decoded);
    return decoded;
  } catch (error) {
    console.error("[JWT DEBUG] Token verification FAILED:", error);
    return null;
  }
}

/**
 * Extracts a JWT from a NextRequest object (from Authorization header or cookies).
 * @param request The NextRequest object.
 * @returns The token string if found, otherwise null.
 */
export function getTokenFromRequest(request: NextRequest): string | null {
  // Try to get token from Authorization header (Bearer token)
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7); // Remove "Bearer " prefix
  }

  // Try to get token from cookies (e.g., 'auth-token' cookie)
  const token = request.cookies.get("auth-token")?.value;
  return token || null;
}

/**
 * Retrieves and verifies the user's JWT from a NextRequest, returning the user payload.
 * @param request The NextRequest object.
 * @returns The JWTPayload if a valid token is found, otherwise null.
 */
export function getUserFromRequest(request: NextRequest): JWTPayload | null {
  const token = getTokenFromRequest(request);
  if (!token) {
    console.log("[getUserFromRequest] No token found in request."); // Debug
    return null;
  }

  return verifyToken(token);
}