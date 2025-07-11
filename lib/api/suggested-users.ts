import { User } from '../models/User'

// Dummy implementation: fetch 3 random users (replace with real DB logic)
export async function getSuggestedUsers() {
  // TODO: Replace with real DB query, e.g. exclude current user, already-followed, etc.
  // This is just a placeholder for demonstration.
  const users = await User.find({})
    .limit(3)
    .select('-password')
    .lean()
  return users
}
