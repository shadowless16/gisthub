// This type is shared between client and server
export interface SuggestedUser {
  _id: string;  // String representation of MongoDB ObjectId
  username: string;
  email?: string;
  profilePic?: string;
  bio?: string;
  followers: string[];  // Array of string representations of ObjectIds
  following: string[];  // Array of string representations of ObjectIds
  isFollowing?: boolean;
}
