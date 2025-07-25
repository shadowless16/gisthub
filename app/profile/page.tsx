// app/profile/page.tsx
"use client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Search, X, UserPlus, UserMinus } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useState, useEffect, useCallback } from "react"
import { Switch } from "@/components/ui/switch"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/lib/hooks/use-auth" // Assuming useAuth now returns User | null

import { ProfileHeader } from "@/components/profile/profile-header"
import { PostCard } from "@/components/feed/post-card"
import { PostCreator } from "@/components/feed/post-creator"
import { MainLayout } from "@/components/layout/main-layout"
import { User as UserIcon, Mail, Building2, Briefcase, CircleDot, MapPin, Calendar, Clock, Link as LinkIcon, Star } from "lucide-react" 
import type { User } from '@/lib/hooks/use-auth'; // Update this path to where your User type is actually defined


// Define the shape of a Post object
interface Post {
  _id: string
  userId: string
  content: string
  imageURL?: string
  isAnonymous: boolean
  likes: string[]
  likesCount: number
  createdAt: string
  user?: {
    username: string
    profilePic?: string
  }
}

// Define the shape of a user object for modals
interface ModalUser {
  _id: string
  username: string
  profilePic?: string
  bio?: string
  isFollowing?: boolean
}

interface InfoCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  isEmail?: boolean;
}

const InfoCard = ({ icon, title, value, isEmail = false }: InfoCardProps) => (
  <div className="flex items-start gap-3 p-2.5 bg-gray-50 dark:bg-zinc-900 rounded-lg border border-gray-100 dark:border-zinc-800 hover:bg-gray-50/50 dark:hover:bg-zinc-800/70 transition-colors">
    <div className="p-1.5 bg-blue-100 dark:bg-blue-900 rounded-lg text-blue-600 dark:text-blue-300">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</p>
      {isEmail ? (
        <a
          href={`mailto:${value}`}
          className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 break-all"
        >
          {value}
        </a>
      ) : (
        <p className="font-medium text-gray-900 dark:text-white truncate">{value}</p>
      )}
    </div>
  </div>
);

interface SocialLinkCardProps {
  platform: string;
  handle: string;
  url: string;
}

const SocialLinkCard = ({ platform, handle, url }: SocialLinkCardProps) => {
  const platformIcons: { [key: string]: string } = {
    instagram: "/icons/instagram.svg",
    x: "/icons/x.svg",
    github: "/icons/github.svg",
    portfolio: "/icons/portfolio.svg"
  };

  const platformColors: { [key: string]: string } = {
    instagram: "bg-gradient-to-r from-pink-500 to-orange-500",
    x: "bg-gradient-to-r from-gray-200 via-gray-400 to-gray-600",
    github: "bg-gradient-to-r from-gray-100 via-gray-300 to-gray-500",
    portfolio: "bg-gradient-to-r from-blue-600 to-purple-600"
  };

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-200 hover:shadow-sm transition-all"
    >
      <div className={`p-1.5 rounded-lg flex items-center justify-center ${platformColors[platform as keyof typeof platformColors]}`}>
        <img src={platformIcons[platform]} alt={platform} className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-700 capitalize">{platform}</p>
        <p className="text-sm text-gray-500 truncate">{handle.startsWith('@') ? handle : `@${handle}`}</p>
      </div>
    </a>
  );
};

// This is the missing functional component declaration
export default function Profile() {
  const { user, refreshUser } = useAuth(); // user is now typed as User | null

  // Visibility state for each info field (default: all public)
  const [visibility, setVisibility] = useState({
    email: true,
    bio: true,
    location: true,
    branch: true,
  });

  // TODO: Load/save visibility from API/user object
  // For now, just local state

  const handleToggle = (field: keyof typeof visibility) => {
    setVisibility(prev => ({ ...prev, [field]: !prev[field] }));
  }

  // Redirect to onboarding if required fields are missing
  useEffect(() => {
    if (!user) return; // Exit if user is null or undefined

    const requiredFields: Array<keyof User> = [ // Explicitly type requiredFields as keys of User
      'bio',
      'interests',
      'location',
      'profilePic',
      'branch'
    ];

    const missing = requiredFields.some(field => {
      // Type assertion for user.interests as it's already guarded by `Array.isArray`
      if (field === 'interests') {
        return !Array.isArray(user.interests) || user.interests.length === 0;
      }

      // Check if the property exists and is not null/undefined/empty string
      const value = user[field];
      return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
    });

    if (missing) {
      window.location.href = '/auth/setup-profile';
    }
  }, [user]);

  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [skipPosts, setSkipPosts] = useState(0);
  const postsLimit = 20;

  // State for the followers/following modal
  const [modalOpen, setModalOpen] = useState<null | 'followers' | 'following'>(null);
  const [modalUsers, setModalUsers] = useState<ModalUser[]>([]);
  const [filteredModalUsers, setFilteredModalUsers] = useState<ModalUser[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [followingUsersSet, setFollowingUsersSet] = useState<Set<string>>(new Set());

  // Memoized function to fetch user posts
  const fetchUserPosts = useCallback(async (append = false, customSkip?: number) => {
    if (!user?._id) return;

    setLoadingPosts(true);
    setPostsError(null);

    try {
      const response = await apiClient.getUserPosts(user._id, { limit: postsLimit, skip: customSkip ?? skipPosts });

      if (response && typeof response === 'object' && 'posts' in response && Array.isArray((response as any).posts)) {
        if (append) {
          setPosts(prev => [...prev, ...(response as any).posts]);
        } else {
          setPosts((response as any).posts);
        }
        setHasMorePosts((response as any).hasMore);
      } else {
        setPostsError('Failed to load posts: Invalid response');
      }
    } catch (err) {
      setPostsError(err instanceof Error ? err.message : "Failed to load posts");
    } finally {
      setLoadingPosts(false);
    }
  }, [user?._id, skipPosts]);

  // Effect to fetch posts when user ID changes
  useEffect(() => {
    setSkipPosts(0);
    fetchUserPosts(false, 0);
  }, [user?._id, fetchUserPosts]);

  // Effect to fetch and populate the user's profile data from the backend when the component loads
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user?._id) return;

      try {
        const profileData = await apiClient.getUser(user._id);
        if (profileData) {
          // Update user state or other relevant states with fetched data
          refreshUser();
        }
      } catch (error) {
        console.error('Failed to fetch profile data:', error);
      }
    };

    fetchProfileData();
  }, [user?._id, refreshUser]);

  // Function to load more posts for infinite scrolling
  const loadMorePosts = () => {
    const newSkip = skipPosts + postsLimit;
    setSkipPosts(newSkip);
    fetchUserPosts(true, newSkip);
  };

  // Handle post creation to refresh the post list
  const handlePostCreated = () => {
    setSkipPosts(0);
    fetchUserPosts(false, 0);
  };

  // Filter modal users based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredModalUsers(modalUsers);
    } else {
      const filtered = modalUsers.filter(u =>
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.bio?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredModalUsers(filtered);
    }
  }, [searchQuery, modalUsers]);

  // Handle follow/unfollow toggle for a user in the modal
  const handleFollowToggle = async (targetUserId: string) => {
    try {
      await apiClient.followUser(targetUserId);
      const isCurrentlyFollowing = followingUsersSet.has(targetUserId);

      setFollowingUsersSet(prev => {
        const newSet = new Set(prev);
        if (isCurrentlyFollowing) {
          newSet.delete(targetUserId);
        } else {
          newSet.add(targetUserId);
        }
        return newSet;
      });

      setModalUsers(prev => prev.map(u =>
        u._id === targetUserId ? { ...u, isFollowing: !isCurrentlyFollowing } : u
      ));

      await refreshUser(); // Refresh the authenticated user's data
    } catch (error) {
      console.error('Failed to toggle follow:', error);
      // TODO: Implement a toast notification for errors
    }
  };

  // Fetch and open followers modal
  const openFollowersModal = async () => {
    if (!user?._id) return;

    setModalLoading(true);
    setModalError(null);
    setModalOpen('followers');
    setSearchQuery('');
    setModalUsers([]); // Clear previous users

    try {
      // Ensure user.followers is an array before checking length
      if (!user.followers || !Array.isArray(user.followers) || user.followers.length === 0) {
        setModalLoading(false); // Make sure to set loading to false even if there are no followers
        return; // No followers to fetch
      }
      const res = await apiClient.getUsersByIds(user.followers);
      let usersArr: ModalUser[] = [];
      if (res && typeof res === 'object' && 'users' in res && Array.isArray((res as any).users)) {
        usersArr = (res as any).users;
      }

      const usersWithFollowStatus = usersArr.map((u: ModalUser) => ({ // Type u explicitly
        ...u,
        isFollowing: user.following?.includes(u._id) || false
      }));
      setModalUsers(usersWithFollowStatus);
      setFollowingUsersSet(new Set(user.following || [])); // Initialize following set
    } catch (e) {
      console.error('Failed to load followers:', e);
      setModalError('Failed to load followers');
    } finally {
      setModalLoading(false);
    }
  };

  // Fetch and open following modal
  const openFollowingModal = async () => {
    if (!user?._id) return;

    setModalLoading(true);
    setModalError(null);
    setModalOpen('following');
    setSearchQuery('');
    setModalUsers([]); // Clear previous users

    try {
      // Ensure user.following is an array before checking length
      if (!user.following || !Array.isArray(user.following) || user.following.length === 0) {
        setModalLoading(false); // Make sure to set loading to false even if there's no one being followed
        return; // No following to fetch
      }
      const res = await apiClient.getUsersByIds(user.following);
      let usersArr: ModalUser[] = [];
      if (res && typeof res === 'object' && 'users' in res && Array.isArray((res as any).users)) {
        usersArr = (res as any).users;
      }

      const usersWithFollowStatus = usersArr.map((u: ModalUser) => ({ // Type u explicitly
        ...u,
        isFollowing: true // All users in following list are being followed
      }));
      setModalUsers(usersWithFollowStatus);
      setFollowingUsersSet(new Set(user.following || [])); // Initialize following set
    } catch (e) {
      console.error('Failed to load following:', e);
      setModalError('Failed to load following');
    } finally {
      setModalLoading(false);
    }
  };

  // Close the modal and reset its state
  const closeModal = () => {
    setModalOpen(null);
    setSearchQuery('');
    setModalUsers([]);
    setFilteredModalUsers([]);
    setModalError(null);
  };

  return (
    <MainLayout>
      <main className="w-full max-w-2xl mx-auto space-y-8 px-4 py-6 sm:px-6 md:px-8 lg:px-0">
        {user ? (
          <div className="w-full">
            <ProfileHeader
              user={user}
              postsCount={posts.length}
              onFollowersClick={openFollowersModal}
              onFollowingClick={openFollowingModal}
            />

            {/* --- User Details Section --- */}
            <Card className="mt-6 rounded-xl shadow-sm">
              <CardContent className="p-5 space-y-5"> {/* Reduced padding and space-y */}
                <h3 className="text-xl font-bold text-gray-800 pb-2 border-b">Personal Information</h3> {/* Reduced pb */}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {/* Reduced gap */}
                  {/* Enhanced Info Cards with visibility toggle only for requested fields */}
                  <div className="flex items-center gap-2">
                    <InfoCard
                      icon={<UserIcon className="h-5 w-5" />}
                      title="Full Name"
                      value={
                        (user.firstName?.trim() && user.lastName?.trim())
                          ? `${user.firstName.trim()} ${user.lastName.trim()}`
                          : user.firstName?.trim()
                          ? user.firstName.trim()
                          : user.lastName?.trim()
                          ? user.lastName.trim()
                          : user.username
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <InfoCard
                      icon={<Mail className="h-5 w-5" />}
                      title="Email"
                      value={user.email}
                      isEmail={true}
                    />
                    <Switch checked={visibility.email} onCheckedChange={() => handleToggle('email')} />
                    <span className="text-xs text-gray-500 min-w-[45px]">{visibility.email ? 'Public' : 'Private'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <InfoCard
                      icon={<MapPin className="h-5 w-5" />}
                      title="Location"
                      value={user.location || ''}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <InfoCard
                      icon={<Briefcase className="h-5 w-5" />}
                      title="Branch"
                      value={user.branch || 'Not specified'}
                    />
                  </div>
                </div>

                {/* Bio with toggle */}
                {user.bio && (
                  <div className="pt-3 flex items-center gap-2"> {/* Reduced pt */}
                    <div className="flex-1">
                      <h4 className="text-base font-semibold text-gray-800 mb-1">Bio</h4>
                      <p className="text-gray-700 text-sm">{user.bio}</p>
                    </div>
                  </div>
                )}

                {/* Social Links section (no visibility toggle) */}
                {user.socialLinks && (
                  <div className="pt-3 flex items-start gap-2"> {/* Changed to items-start for better alignment with heading */}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2"> {/* Reduced mb */}
                        <LinkIcon className="h-4 w-4" />
                        Social Profiles
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"> {/* Adjusted gap */}
                        {user.socialLinks.instagram && (
                          <SocialLinkCard
                            platform="instagram"
                            handle={user.socialLinks.instagram}
                            url={`https://instagram.com/${user.socialLinks.instagram}`}
                          />
                        )}
                        {user.socialLinks.x && (
                          <SocialLinkCard
                            platform="x"
                            handle={user.socialLinks.x}
                            url={`https://x.com/${user.socialLinks.x}`}
                          />
                        )}
                        {user.socialLinks.github && (
                          <SocialLinkCard
                            platform="github"
                            handle={user.socialLinks.github}
                            url={`https://github.com/${user.socialLinks.github}`}
                          />
                        )}
                        {user.socialLinks.portfolio && (
                          <SocialLinkCard
                            platform="portfolio"
                            handle="View Portfolio"
                            url={user.socialLinks.portfolio}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Interests section (no visibility toggle) */}
                {user.interests && user.interests.length > 0 && (
                  <div className="pt-3 flex items-start gap-2"> {/* Changed to items-start */}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2"> {/* Reduced mb */}
                        <Star className="h-4 w-4" />
                        Interests
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {user.interests.map((interest: string, idx: number) => (
                          <div
                            key={idx}
                            className="bg-gradient-to-r from-blue-50 to-indigo-50 px-2.5 py-1 rounded-full text-sm font-medium text-blue-700 border border-blue-100" // Reduced padding
                          >
                            {interest}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Edit Profile Button */}
                <Button
                  onClick={() => window.location.href = '/auth/setup-profile'}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Edit Profile
                </Button>
              </CardContent>
            </Card>

          </div>
        ) : (
          <div className="flex items-center justify-center min-h-[40vh]">
            <p className="text-lg text-gray-600">Loading profile...</p>
          </div>
        )}

        {/* --- Followers/Following Modal --- */}
        <Dialog open={!!modalOpen} onOpenChange={(open) => { if (!open) closeModal(); }}>
          {/* DialogTrigger is not used here as we open the modal programmatically */}
          <DialogContent className="p-0 max-w-md w-full h-[90vh] sm:h-[80vh] flex flex-col rounded-2xl overflow-hidden">
            <DialogHeader className="p-4 border-b border-gray-200 flex flex-row items-center justify-between">
              <DialogTitle className="text-xl font-bold text-gray-900">
                {modalOpen === 'followers' ? 'Followers' : 'Following'}
              </DialogTitle>
              <Button variant="ghost" size="icon" onClick={closeModal} className="rounded-full">
                <X className="h-5 w-5 text-gray-500" />
              </Button>
            </DialogHeader>

            {/* Search Bar within Modal */}
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <Input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus-visible:ring-blue-500"
                />
              </div>
            </div>

            {/* Modal Content - User List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {modalLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                </div>
              ) : modalError ? (
                <div className="py-12 text-center text-red-600 px-4">
                  <p className="text-base">{modalError}</p>
                </div>
              ) : filteredModalUsers.length === 0 ? (
                <div className="py-12 text-center text-gray-500 px-4">
                  <p className="text-base">
                    {searchQuery ? 'No users found matching your search.' : 'No users to display.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredModalUsers.map((u) => (
                    <div key={u._id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors duration-200">
                      <a
                        href={u._id !== user?._id ? `/profile/${u.username}` : undefined}
                        className="flex items-center gap-3 flex-1 min-w-0 group"
                        style={{ pointerEvents: u._id !== user?._id ? 'auto' : 'none' }}
                      >
                        <Avatar className="h-12 w-12 flex-shrink-0 group-hover:ring-2 group-hover:ring-blue-400">
                          <AvatarImage src={u.profilePic || '/placeholder-user.jpg'} alt={u.username} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                            {u.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate group-hover:text-blue-600 cursor-pointer">{u.username}</p>
                          {u.bio && (
                            <p className="text-sm text-gray-500 truncate">{u.bio}</p>
                          )}
                        </div>
                      </a>

                      {/* Follow/Unfollow Button */}
                      {u._id !== user?._id && (
                        <Button
                          variant={followingUsersSet.has(u._id) ? "outline" : "default"}
                          size="sm"
                          onClick={() => handleFollowToggle(u._id)}
                          className={`ml-4 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                            ${followingUsersSet.has(u._id)
                              ? 'border-gray-300 text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-300'
                              : 'bg-blue-500 text-white hover:bg-blue-600'
                            }`}
                        >
                          {followingUsersSet.has(u._id) ? (
                            <>
                              <UserMinus size={16} className="mr-1.5" /> Unfollow
                            </>
                          ) : (
                            <>
                              <UserPlus size={16} className="mr-1.5" /> Follow
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 text-center text-sm text-gray-600">
              {filteredModalUsers.length} {modalOpen === 'followers' ? 'followers' : 'following'}
            </div>
          </DialogContent>
        </Dialog>

        {/* --- Post Creation Section --- */}
        <div className="w-full">
          <PostCreator onPostCreated={handlePostCreated} />
        </div>

        {/* --- User Posts Section --- */}
        <div className="space-y-6 w-full">
          <h2 className="text-2xl font-bold text-gray-800 border-b pb-3">Your Posts</h2>
          {loadingPosts ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <p className="ml-4 text-lg text-gray-600">Loading your posts...</p>
            </div>
          ) : postsError ? (
            <div className="text-center py-16">
              <p className="text-red-600 text-lg mb-4">{postsError}</p>
              <Button onClick={() => fetchUserPosts(false, 0)} className="bg-blue-500 hover:bg-blue-600 text-white">
                Retry Loading Posts
              </Button>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg">No posts yet. Start sharing your thoughts!</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-5 w-full">
                {posts.map((post) => (
                  <PostCard
                    key={post._id}
                    post={post}
                    className="max-w-full break-words overflow-hidden"
                    onDelete={async (id: string) => {
                      if (window.confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
                        try {
                          await apiClient.deletePost(id);
                          setPosts(prevPosts => prevPosts.filter(p => p._id !== id));
                        } catch (err) {
                          // TODO: Implement a toast notification for errors
                          alert("Failed to delete post. Please try again.");
                        }
                      }
                    }}
                    onProfileClick={post.user?.username && post.user?.username !== user?.username ? () => window.location.href = `/profile/${post.user?.username}` : undefined}
                    comments={[]} // Pass empty array or actual comments if available
                    commentsLoading={false} // Pass actual loading state if available
                  />
                ))}
              </div>
              {hasMorePosts && (
                <div className="flex justify-center py-6">
                  <Button
                    onClick={loadMorePosts}
                    disabled={loadingPosts}
                    className="px-6 py-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loadingPosts ? "Loading More..." : "Load More Posts"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </MainLayout>
  );
}