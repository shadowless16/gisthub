// lib/api/suggested-users.ts

import { connectToDatabase } from "@/lib/mongodb";
import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getUserFromRequest } from '@/lib/auth';
import type { SuggestedUser } from "@/types/suggested-user";

// Internal type for MongoDB documents before conversion
interface DBUser {
  _id: ObjectId;
  username: string;
  email: string;
  profilePic?: string;
  bio?: string;
  followers: ObjectId[];
  following: ObjectId[];
  branch?: string;
  interests?: string[];
}

// Convert MongoDB document to API response type
function convertToSuggestedUser(dbUser: DBUser, isFollowing: boolean = false): SuggestedUser {
  return {
    _id: dbUser._id.toString(),
    username: dbUser.username,
    email: dbUser.email,
    profilePic: dbUser.profilePic,
    bio: dbUser.bio,
    followers: dbUser.followers.map(id => id.toString()),
    following: dbUser.following.map(id => id.toString()),
    isFollowing
  };
}

export async function getSuggestedUsers(request: NextRequest): Promise<SuggestedUser[]> {
  try {
    // Get and validate current user
    const currentUser = getUserFromRequest(request);
    if (!currentUser) {
      throw new Error("Authentication required for suggested users.");
    }

    // Validate and convert userId to ObjectId
    const cleanUserId = String(currentUser.userId).trim();
    // ------------------------------------------------------------------
    // *** ENSURE THESE TWO LOGS ARE PRESENT EXACTLY LIKE THIS ***
    console.log(`[SuggestedUsers API] Attempting to validate userId: '${cleanUserId}'`);
    if (!/^[0-9a-fA-F]{24}$/.test(cleanUserId)) {
      console.error(`[SuggestedUsers API] Invalid user ID format detected: '${cleanUserId}'`);
      throw new Error('Invalid user ID format. Please log out and log in again.');
    }
    // ------------------------------------------------------------------
    const currentUserId = new ObjectId(cleanUserId);

    // Connect to database
    const { db } = await connectToDatabase();
    const usersCollection = db.collection<DBUser>("users");

    // Get current user document
    const currentUserDoc = await usersCollection.findOne<DBUser>({ _id: currentUserId });
    if (!currentUserDoc) {
      throw new Error('User not found in database. Please log in again.');
    }

    let suggestedUsers: SuggestedUser[] = [];
    const totalLimit = 10; // Desired total number of suggestions

    // Initial set of users to exclude: the current user and those they already follow
    const usersToExclude = [currentUserId, ...(currentUserDoc.following || [])];

    // Helper to update the exclusion list for subsequent stages
    const getCombinedExcludeList = () => {
      const existingSuggestionIds = suggestedUsers.map(u => new ObjectId(u._id));
      return [...usersToExclude, ...existingSuggestionIds];
    };

    // --- Stage 1: Users from the Same Branch ---
    if (currentUserDoc.branch) {
      const branchLimit = Math.min(Math.floor(totalLimit * 0.3), totalLimit - suggestedUsers.length);
      if (branchLimit > 0) {
        const branchSuggestions = await usersCollection.aggregate<DBUser>([
          {
            $match: {
              _id: { $nin: getCombinedExcludeList() },
              branch: currentUserDoc.branch,
            },
          },
          {
            $addFields: {
              followersCount: { $size: "$followers" },
            },
          },
          {
            $sort: { followersCount: -1 },
          },
          {
            $limit: branchLimit,
          },
          {
            $project: {
              _id: 1,
              username: 1,
              email: 1,
              profilePic: 1,
              bio: 1,
              followers: 1,
              following: 1
            }
          }
        ]).toArray();

        suggestedUsers.push(...branchSuggestions.map(user => convertToSuggestedUser(user, false)));
      }
    }

    // --- Stage 2: Users with Common Interests ---
    if (currentUserDoc.interests?.length && suggestedUsers.length < totalLimit) {
      const interestsLimit = Math.min(Math.floor(totalLimit * 0.4), totalLimit - suggestedUsers.length);
      if (interestsLimit > 0) {
        const interestSuggestions = await usersCollection.aggregate<DBUser>([
          {
            $match: {
              _id: { $nin: getCombinedExcludeList() },
              interests: { $exists: true, $ne: [] }
            }
          },
          {
            $addFields: {
              commonInterests: {
                $size: {
                  $setIntersection: ["$interests", currentUserDoc.interests]
                }
              },
              followersCount: { $size: "$followers" }
            }
          },
          {
            $match: {
              commonInterests: { $gt: 0 }
            }
          },
          {
            $sort: {
              commonInterests: -1,
              followersCount: -1
            }
          },
          {
            $limit: interestsLimit
          },
          {
            $project: {
              _id: 1,
              username: 1,
              email: 1,
              profilePic: 1,
              bio: 1,
              followers: 1,
              following: 1
            }
          }
        ]).toArray();

        suggestedUsers.push(...interestSuggestions.map(user => convertToSuggestedUser(user, false)));
      }
    }

    // --- Stage 3: General Fallback Suggestions ---
    if (suggestedUsers.length < totalLimit) {
      const remainingLimit = totalLimit - suggestedUsers.length;
      const fallbackSuggestions = await usersCollection.aggregate<DBUser>([
        {
          $match: {
            _id: { $nin: getCombinedExcludeList() }
          }
        },
        {
          $addFields: {
            followersCount: { $size: "$followers" }
          }
        },
        {
          $sort: {
            followersCount: -1
          }
        },
        {
          $limit: remainingLimit
        },
        {
          $project: {
            _id: 1,
            username: 1,
            email: 1,
            profilePic: 1,
            bio: 1,
            followers: 1,
            following: 1
          }
        }
      ]).toArray();

      suggestedUsers.push(...fallbackSuggestions.map(user => convertToSuggestedUser(user, false)));
    }

    // --- Randomly shuffle the final suggestions list for variety ---
    const shuffledSuggestions = [...suggestedUsers];
    for (let i = shuffledSuggestions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledSuggestions[i], shuffledSuggestions[j]] =
      [shuffledSuggestions[j], shuffledSuggestions[i]];
    }

    return shuffledSuggestions;

  } catch (error) {
    console.error('[getSuggestedUsers] Error:', error); // This will log any error thrown within this function
    throw error;
  }
}