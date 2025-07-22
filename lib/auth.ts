// lib/auth.ts
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { NextResponse } from "next/server";

// Get JWT secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET or NEXTAUTH_SECRET environment variable must be set');
}

// Make sure the secret is a string
const SECRET_KEY: string = JWT_SECRET;

export interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  exp?: number;
  iat?: number;
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
  console.log("[JWT DEBUG] Generating token for payload:", payload);
  const token = jwt.sign(payload, SECRET_KEY, { 
    expiresIn: "7d",
    algorithm: 'HS256'
  });
  console.log("[JWT DEBUG] Token generated:", token);
  return token;
}

/**
 * Gets the authenticated session from the request.
 * @param req The NextRequest object
 * @returns The session data if authenticated, null otherwise
 */
export async function getAuthSession(req: NextRequest) {
  try {
    const token = req.cookies.get('auth-token')?.value;
    if (!token) {
      console.log('[Auth] No token found in cookies');
      return null;
    }

    const decoded = jwt.verify(token, SECRET_KEY, { algorithms: ['HS256'] }) as unknown as JWTPayload;
    
    // Check if token is about to expire (less than 1 hour remaining)
    if (decoded.exp) {
      const expirationTime = decoded.exp * 1000; // Convert to milliseconds
      const oneHour = 60 * 60 * 1000;
      
      if (Date.now() + oneHour >= expirationTime) {
        console.log('[Auth] Token about to expire, generating new one');
        // Generate new token
        const newToken = generateToken({
          userId: decoded.userId,
          username: decoded.username,
          email: decoded.email
        });
        
        // Set new token in response cookies
        const response = new NextResponse();
        response.cookies.set('auth-token', newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60 // 7 days
        });
      }
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.log('[Auth] Token expired');
    } else {
      console.error('[Auth] Error verifying token:', error);
    }
    return null;
  }
}

/**
 * Verifies a JWT and returns its payload if valid.
 * @param token The JWT string to verify.
 * @returns The JWTPayload if the token is valid, otherwise null.
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    console.log("[JWT DEBUG] Verifying token:", token);
    const decoded = jwt.verify(token, SECRET_KEY, { algorithms: ['HS256'] }) as unknown as JWTPayload;
    console.log("[JWT DEBUG] Token verified successfully. Decoded payload:", decoded);
    return decoded;
  } catch (error) {
    console.error("[JWT DEBUG] Token verification failed:", error);
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
    const token = authHeader.substring(7);
    console.log("[JWT DEBUG] Token found in Authorization header:", token);
    return token;
  }

  // Try to get token from cookies (e.g., 'auth-token' cookie)
  const token = request.cookies.get("auth-token")?.value;
  if (token) {
    console.log("[JWT DEBUG] Token found in cookies:", token);
  } else {
    console.log("[JWT DEBUG] No token found in cookies.");
  }
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
    console.log("[JWT DEBUG] No token found in request.");
    return null;
  }
  console.log("[JWT DEBUG] Token retrieved from request:", token);
  const payload = verifyToken(token);
  console.log("[JWT DEBUG] Decoded payload from token:", payload);
  return payload;
}

// Store refresh tokens (in-memory for now, replace with a database in production)
const refreshTokens: Record<string, string> = {};

/**
 * Generates a refresh token and associates it with a user.
 * @param userId The user's ID.
 * @returns The generated refresh token.
 */
export function generateRefreshToken(userId: string): string {
  const refreshToken = uuidv4();
  refreshTokens[refreshToken] = userId;
  console.log("[RefreshToken DEBUG] Refresh token generated for userId:", userId, "Token:", refreshToken);
  return refreshToken;
}

/**
 * Validates a refresh token and returns the associated user ID if valid.
 * @param token The refresh token to validate.
 * @returns The user ID if the token is valid, otherwise null.
 */
export function validateRefreshToken(token: string): string | null {
  const userId = refreshTokens[token];
  if (userId) {
    console.log("[RefreshToken DEBUG] Valid refresh token for userId:", userId);
    return userId;
  }
  console.log("[RefreshToken DEBUG] Invalid refresh token:", token);
  return null;
}

/**
 * Revokes a refresh token.
 * @param token The refresh token to revoke.
 */
export function revokeRefreshToken(token: string): void {
  delete refreshTokens[token];
  console.log("[RefreshToken] Revoked token:", token);
}

/**
 * Handles token refresh requests.
 * @param request The NextRequest object.
 * @returns A NextResponse with a new access token if the refresh token is valid.
 */
export async function handleTokenRefresh(request: NextRequest): Promise<NextResponse> {
  const refreshToken = request.cookies.get("refresh-token")?.value;
  if (!refreshToken) {
    console.log("[TokenRefresh DEBUG] No refresh token provided in request.");
    return NextResponse.json({ error: "No refresh token provided." }, { status: 401 });
  }

  console.log("[TokenRefresh DEBUG] Refresh token received:", refreshToken);
  const userId = validateRefreshToken(refreshToken);
  if (!userId) {
    console.log("[TokenRefresh DEBUG] Invalid refresh token received:", refreshToken);
    return NextResponse.json({ error: "Invalid refresh token." }, { status: 401 });
  }

  const newAccessToken = generateToken({ userId, username: "", email: "" });
  console.log("[TokenRefresh DEBUG] New access token generated for userId:", userId);

  return NextResponse.json({ accessToken: newAccessToken });
}