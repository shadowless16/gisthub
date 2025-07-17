
import mongoose, { Schema, models, model } from 'mongoose';

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  branch: { type: String, required: true },
  learningPath: { type: String },
  dateOfBirth: { type: String },
  isAlumni: { type: Boolean, default: false },
  profilePic: { type: String }, // URL or base64
  bio: { type: String },
  socialLinks: {
    instagram: { type: String },
    x: { type: String },
    github: { type: String },
    portfolio: { type: String },
  },
  interests: [{ type: String }],
  location: { type: String },
  followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date },
  status: { type: String, default: "active" }, // "active", "inactive", "suspended"
  role: { type: String, default: "student" }, // "student", "alumni", "admin"
  preferences: {
    anonymousMode: { type: Boolean, default: false },
    receiveNotifications: { type: Boolean, default: true },
  },
});

const UserModel = models.User || model('User', UserSchema);

// Sanitize user for API responses
export function sanitizeUser(user: any) {
  return {
    _id: user._id?.toString() || '',
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    branch: user.branch,
    learningPath: user.learningPath,
    dateOfBirth: user.dateOfBirth,
    isAlumni: user.isAlumni,
    profilePic: user.profilePic,
    bio: user.bio,
    socialLinks: user.socialLinks || {},
    interests: user.interests || [],
    location: user.location,
    followers: user.followers?.map?.((id: any) => id.toString?.()) || [],
    following: user.following?.map?.((id: any) => id.toString?.()) || [],
    createdAt: user.createdAt?.toISOString?.() || '',
    lastActive: user.lastActive?.toISOString?.() || '',
    status: user.status,
    role: user.role,
    preferences: user.preferences || {},
  };
}

export default UserModel;
