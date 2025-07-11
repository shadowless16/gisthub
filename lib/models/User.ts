
import mongoose, { Schema, models, model } from 'mongoose';

const UserSchema = new Schema({
  username: { type: String, required: true },
  email: { type: String, required: true },
  passwordHash: { type: String, required: true },
  profilePic: { type: String },
  bio: { type: String },
  followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
});

const UserModel = models.User || model('User', UserSchema);

// Sanitize user for API responses
export function sanitizeUser(user) {
  return {
    _id: user._id?.toString() || '',
    username: user.username,
    email: user.email,
    profilePic: user.profilePic,
    bio: user.bio,
    followers: user.followers?.map?.(id => id.toString?.()) || [],
    following: user.following?.map?.(id => id.toString?.()) || [],
    createdAt: user.createdAt?.toISOString?.() || '',
  };
}

export default UserModel;
