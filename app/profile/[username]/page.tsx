"use client"
import { useEffect, useState } from "react"
import { UserPlus, UserMinus } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import { useRouter, useParams } from "next/navigation"
import { apiClient } from "@/lib/api-client"
import { PostCard } from "@/components/feed/post-card"

import { MainLayout } from "@/components/layout/main-layout"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Mail, Link, Star } from "lucide-react"


export default function UserProfilePage() {
  const params = useParams();
  const username = params?.username as string;
  const { user: authUser, loading: authLoading, refreshUser } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);

  // Follow state using Set for instant UI feedback
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    apiClient.getUserByUsername(username)
      .then((res: any) => {
        // Defensive: handle both {user: ...} and direct user object
        if (res && (typeof res === "object") && ("user" in res || (res._id && res.username))) {
          setUser("user" in res ? res.user : res);
        } else {
          setError("User not found");
        }
      })
      .catch(() => setError("User not found"))
      .finally(() => setLoading(false));
  }, [username]);

  // Set followingSet when authUser is loaded
  useEffect(() => {
    if (!authUser) return;
    setFollowingSet(new Set(authUser.following?.map((id: any) => id.toString()) || []));
  }, [authUser]);

  useEffect(() => {
    if (!user?._id) return;
    setLoadingPosts(true);
    setPostsError(null);
    apiClient.getUserPosts(user._id)
      .then((res: any) => {
        if (res && Array.isArray(res.posts)) setPosts(res.posts);
        else setPostsError("Failed to load posts");
      })
      .catch(() => setPostsError("Failed to load posts"))
      .finally(() => setLoadingPosts(false));
  }, [user?._id]);

  // Helper for follow back state
  function isFollowBack() {
    if (!user || !authUser) return false;
    const authId = authUser._id?.toString();
    // The viewed user follows you, but you don't follow them
    return (
      authId &&
      user.following?.map((id: any) => id.toString()).includes(authId) &&
      !followingSet.has(user._id) &&
      user._id !== authId
    );
  }
  
  return (
    <MainLayout>
      <main className="w-full max-w-2xl mx-auto px-2 py-3 sm:px-4 sm:py-6 lg:py-10 bg-white dark:bg-[#0a0d18] min-h-screen"> {/* Improved mobile padding and background */}
        {loading ? (
          <div className="text-center py-10 sm:py-20 text-lg">Loading profile...</div>
        ) : error ? (
          <div className="text-center py-10 sm:py-20 text-red-600 text-lg">{error}</div>
        ) : user ? (
          <>
            {/* --- Profile Header Section (modern style) --- */}
            <div className="w-full rounded-2xl p-3 sm:p-6 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5 sm:gap-6 shadow border border-green-400 dark:border-green-600 bg-white dark:bg-[#101426] mb-5 sm:mb-6 transition-colors"> {/* More padding, better bg for mobile */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-6 w-full">
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-green-200 dark:border-[#181c2a] shadow-md"> {/* Larger avatar for mobile */}
                  <AvatarImage src={user.profilePic || '/placeholder-user.jpg'} alt={user.username} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold text-2xl sm:text-3xl">
                    {user.username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-center sm:text-left mt-2 sm:mt-0">
                  <div className="flex flex-col sm:flex-row items-center sm:items-baseline gap-0.5 sm:gap-2 mb-1">
                    <span className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white leading-tight break-words">{user.firstName} {user.lastName}</span>
                  </div>
                  <div className="text-xs sm:text-lg text-gray-500 dark:text-[#b3b8c5] font-mono mb-1 break-words">@{user.username}</div>
                  {user.bio && <div className="text-gray-600 dark:text-[#b3b8c5] text-xs sm:text-base mb-2 break-words">{user.bio}</div>}
                  <div className="flex justify-center sm:justify-start gap-2 sm:gap-6 mt-2 flex-wrap"> {/* Tighter gap for mobile */}
                    <span className="text-gray-900 dark:text-white font-bold text-xs sm:text-sm">
                      <span className="text-base sm:text-lg font-extrabold">{user.following?.length || 0}</span> Following
                    </span>
                    <span className="text-gray-900 dark:text-white font-bold text-xs sm:text-sm">
                      <span className="text-base sm:text-lg font-extrabold">{user.followers?.length || 0}</span> Followers
                    </span>
                    <span className="text-gray-900 dark:text-white font-bold text-xs sm:text-sm">
                      <span className="text-base sm:text-lg font-extrabold">{posts.length}</span> Posts
                    </span>
                  </div>
                </div>
              </div>
              {/* Edit Profile or Follow/Unfollow Button */}
              <div className="flex-shrink-0 w-full sm:w-auto flex justify-center sm:justify-end mt-4 sm:mt-0"> {/* More margin for mobile */}
                {authUser && user._id === authUser._id ? (
                  <button className="border border-[#2d334d] text-white font-semibold px-3 py-1.5 text-sm sm:px-6 sm:py-2 rounded-lg hover:bg-[#181c2a] flex items-center gap-2"> {/* Smaller button on mobile */}
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19.5 3 21l1.5-4L16.5 3.5Z"/></svg> Edit Profile
                  </button>
                ) : authUser && user._id !== authUser._id && (
                  <button
                    className={`px-3 py-1.5 text-sm sm:px-6 sm:py-2 rounded-lg font-bold min-w-[90px] sm:min-w-[120px] transition-all duration-150
                      ${followingSet.has(user._id)
                        ? 'bg-[#181c2a] text-white border border-[#2d334d] hover:bg-[#23263a]'
                        : 'bg-blue-500 text-white hover:bg-blue-600 border-none'}
                      disabled:opacity-60 flex items-center justify-center gap-2`}
                    disabled={followLoading}
                    onClick={async () => {
                      setFollowLoading(true);
                      try {
                        await apiClient.followUser(user._id);
                        setFollowingSet(prev => {
                          const newSet = new Set(prev);
                          if (prev.has(user._id)) {
                            newSet.delete(user._id);
                          } else {
                            newSet.add(user._id);
                          }
                          return newSet;
                        });
                        // Optionally refetch user for accuracy
                        const res = await apiClient.getUserByUsername(username);
                        if (
                          res &&
                          typeof res === "object" &&
                          ("user" in res ||
                            ((res as any)._id && (res as any).username))
                        ) {
                          setUser("user" in res ? (res as any).user : (res as any));
                        }
                        refreshUser();
                      } catch (e) {
                      } finally {
                        setFollowLoading(false);
                      }
                    }}
                  >
                    {followLoading
                      ? (followingSet.has(user._id) ? (<><UserMinus size={14} /> Unfollowing...</>) : (isFollowBack() ? (<><UserPlus size={14} /> Following back...</>) : (<><UserPlus size={14} /> Following...</>)))
                      : (followingSet.has(user._id)
                          ? (<><UserMinus size={14} /> Following</>)
                          : (isFollowBack() ? (<><UserPlus size={14} /> Follow back</>) : (<><UserPlus size={14} /> Follow</>)))}
                  </button>
                )}
              </div>
            </div>
            <Card className="w-full mt-4 rounded-xl shadow-sm bg-white dark:bg-[#181c2a] border border-gray-200 dark:border-zinc-800">
              <CardContent className="p-3 sm:p-6 space-y-4 sm:space-y-6"> {/* More padding for mobile */}
                <h3 className="text-base sm:text-xl font-bold text-gray-800 dark:text-gray-100 pb-2 sm:pb-3 border-b border-gray-200 dark:border-gray-700">Personal Information</h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-5"> {/* Single column on mobile, more gap */}
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                    <span className="font-medium text-gray-900 dark:text-gray-100 break-all text-xs sm:text-base">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="font-medium text-gray-900 dark:text-gray-100 text-xs sm:text-base">{user.branch || "Not specified"}</span>
                  </div>
                </div>
                {user.bio && (
                  <div className="pt-2">
                    <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1">Bio</h4>
                    <p className="text-gray-700 dark:text-gray-200 text-xs sm:text-sm">{user.bio}</p>
                  </div>
                )}
                {user.socialLinks && (
                  <div className="pt-2 sm:pt-4">
                    <h3 className="text-sm sm:text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2 sm:mb-3 flex items-center gap-2">
                      <Link className="h-4 w-4" />
                      Social Profiles
                    </h3>
                    <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 sm:gap-3"> {/* Tighter gap for mobile */}
                      {user.socialLinks.instagram && (
                        <a href={`https://instagram.com/${user.socialLinks.instagram}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-500 hover:underline text-sm"> {/* Reduced font size */}
                          Instagram: @{user.socialLinks.instagram}
                        </a>
                      )}
                      {user.socialLinks.x && (
                        <a href={`https://x.com/${user.socialLinks.x}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-500 hover:underline text-sm"> {/* Reduced font size */}
                          X: @{user.socialLinks.x}
                        </a>
                      )}
                      {user.socialLinks.github && (
                        <a href={`https://github.com/${user.socialLinks.github}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-500 hover:underline text-xs sm:text-sm">
                          GitHub: @{user.socialLinks.github}
                        </a>
                      )}
                      {user.socialLinks.portfolio && (
                        <a href={user.socialLinks.portfolio} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-500 hover:underline text-sm"> {/* Reduced font size */}
                          Portfolio
                        </a>
                      )}
                    </div>
                  </div>
                )}
                {user.interests && user.interests.length > 0 && (
                  <div className="pt-2 sm:pt-4">
                    <h3 className="text-sm sm:text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2 sm:mb-3 flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      Interests
                    </h3>
                    <div className="flex flex-wrap gap-1 sm:gap-2"> {/* Tighter gap for mobile */}
                      {user.interests.map((interest: string, idx: number) => (
                        <div key={idx} className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-zinc-800 dark:to-zinc-900 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-xs font-medium text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-zinc-700">
                          {interest}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* User's Posts Section */}
            <div className="w-full mt-6 sm:mt-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800 border-b pb-2 sm:pb-3 mb-3 sm:mb-4">Posts</h2>
              {loadingPosts ? (
                <div className="text-center py-8 text-gray-500">Loading posts...</div>
              ) : postsError ? (
                <div className="text-center py-8 text-red-600">{postsError}</div>
              ) : posts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No posts yet.</div>
              ) : (
                <div className="flex flex-col gap-4 sm:gap-5"> {/* Adjusted gap */}
                  {posts.map((post) => (
                    <PostCard
                      key={post._id}
                      post={post}
                      className="max-w-full break-words overflow-hidden"
                      onDelete={async () => {}}
                      comments={post.comments || []}
                      commentsLoading={false}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </main>
    </MainLayout>
  )
}