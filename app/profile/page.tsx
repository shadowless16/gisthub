"use client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Edit, Upload, X, UserPlus, UserMinus, Search } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useState, useRef, useEffect } from "react"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/lib/hooks/use-auth"
import Picker from '@emoji-mart/react'
import data from '@emoji-mart/data'

interface ProfileHeaderProps {
  user: {
    username: string
    profilePic?: string
    bio?: string
    followers?: string[]
    following?: string[]
  } | null
  postsCount?: number
}

import { ProfileHeader } from "@/components/profile/profile-header"
import { PostCard } from "@/components/feed/post-card"
import { PostCreator } from "@/components/feed/post-creator"
import { MainLayout } from "@/components/layout/main-layout"

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

interface ModalUser {
  _id: string
  username: string
  profilePic?: string
  bio?: string
  isFollowing?: boolean
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Enhanced modal state
  const [modalOpen, setModalOpen] = useState<null | 'followers' | 'following'>(null)
  const [modalUsers, setModalUsers] = useState<ModalUser[]>([])
  const [filteredUsers, setFilteredUsers] = useState<ModalUser[]>([])
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchUserPosts = async () => {
      if (!user?._id) return
      try {
        setLoading(true)
        const response = await apiClient.getUserPosts(user._id)
        if (response && typeof response === 'object' && 'posts' in response && Array.isArray((response as any).posts)) {
          setPosts((response as any).posts)
        } else {
          setError('Failed to load posts: Invalid response')
        }
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load posts")
      } finally {
        setLoading(false)
      }
    }
    fetchUserPosts()
  }, [user?._id])

  // Filter users based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(modalUsers)
    } else {
      const filtered = modalUsers.filter(u => 
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.bio?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredUsers(filtered)
    }
  }, [searchQuery, modalUsers])

  const handlePostCreated = () => {
    if (user?._id) {
      apiClient.getUserPosts(user._id).then((response) => {
        if (response && typeof response === 'object' && 'posts' in response && Array.isArray((response as any).posts)) {
          setPosts((response as any).posts)
        } else {
          setError('Failed to refresh posts: Invalid response')
        }
      })
    }
  }

  // Enhanced follow/unfollow functionality
  const handleFollowToggle = async (targetUserId: string, isCurrentlyFollowing: boolean) => {
    try {
      // Use the same endpoint for both follow and unfollow
      await apiClient.followUser(targetUserId);
      if (isCurrentlyFollowing) {
        setFollowingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(targetUserId);
          return newSet;
        });
        setModalUsers(prev => prev.map(u => 
          u._id === targetUserId ? { ...u, isFollowing: false } : u
        ));
      } else {
        setFollowingUsers(prev => new Set(prev).add(targetUserId));
        setModalUsers(prev => prev.map(u => 
          u._id === targetUserId ? { ...u, isFollowing: true } : u
        ));
      }
      // Refresh user from backend to update following/followers
      await refreshUser();
    } catch (error) {
      console.error('Failed to toggle follow:', error);
      // Show error toast here
    }
  }

  // Enhanced modal opening functions
  const openFollowers = async () => {
    console.log('Fetching followers:', user?.followers);
    if (!user?.followers?.length) {
      setModalUsers([]);
      setModalOpen('followers');
      return;
    }
    setModalLoading(true);
    setModalError(null);
    setModalOpen('followers');
    setSearchQuery('');
    try {
      const res = await apiClient.getUsersByIds(user.followers);
      const usersWithFollowStatus = res?.users?.map((u: any) => ({
        ...u,
        isFollowing: user.following?.includes(u._id) || false
      })) || [];
      setModalUsers(usersWithFollowStatus);
      
      // Initialize following set
      const currentFollowing = new Set(user.following || []);
      setFollowingUsers(currentFollowing);
    } catch (e) {
      console.error('Failed to load followers:', e);
      setModalError('Failed to load followers');
      setModalUsers([]);
    } finally {
      setModalLoading(false);
    }
  }

  const openFollowing = async () => {
    console.log('Fetching following:', user?.following);
    if (!user?.following?.length) {
      setModalUsers([]);
      setModalOpen('following');
      return;
    }
    setModalLoading(true);
    setModalError(null);
    setModalOpen('following');
    setSearchQuery('');
    try {
      const res = await apiClient.getUsersByIds(user.following);
      const usersWithFollowStatus = res?.users?.map((u: any) => ({
        ...u,
        isFollowing: true // All users in following list are being followed
      })) || [];
      setModalUsers(usersWithFollowStatus);
      
      // Initialize following set
      const currentFollowing = new Set(user.following || []);
      setFollowingUsers(currentFollowing);
    } catch (e) {
      console.error('Failed to load following:', e);
      setModalError('Failed to load following');
      setModalUsers([]);
    } finally {
      setModalLoading(false);
    }
  }

  const closeModal = () => {
    setModalOpen(null);
    setSearchQuery('');
    setModalUsers([]);
    setFilteredUsers([]);
  }

  return (
    <MainLayout>
      <main
        className="w-full max-w-2xl mx-auto space-y-6 px-2 sm:px-4 md:px-6 lg:px-0"
        style={{ minHeight: '100vh', boxSizing: 'border-box' }}
      >
        {user ? (
          <div className="w-full">
            <ProfileHeader
              user={user}
              postsCount={posts.length}
              onFollowersClick={openFollowers}
              onFollowingClick={openFollowing}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <span>Loading profile...</span>
          </div>
        )}

        {/* Enhanced Instagram-like Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
                <div className="flex-1" />
                <h3 className="text-lg font-semibold text-gray-900">
                  {modalOpen === 'followers' ? 'Followers' : 'Following'}
                </h3>
                <button 
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  onClick={closeModal}
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-4 border-b border-gray-100 bg-white">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto">
                {modalLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : modalError ? (
                  <div className="py-12 text-center text-red-500 px-4">
                    <p className="text-sm">{modalError}</p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="py-12 text-center text-gray-500 px-4">
                    <p className="text-sm">
                      {searchQuery ? 'No users found matching your search.' : 'No users found.'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredUsers.map((u) => (
                      <div key={u._id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar className="h-11 w-11 flex-shrink-0">
                            <AvatarImage src={u.profilePic || '/placeholder-user.jpg'} alt={u.username} />
                            <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                              {u.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{u.username}</p>
                            {u.bio && (
                              <p className="text-sm text-gray-500 truncate">{u.bio}</p>
                            )}
                          </div>
                        </div>
                        
                        {/* Follow/Unfollow Button */}
                        {u._id !== user?._id && (
                          <Button
                            variant={followingUsers.has(u._id) ? "outline" : "default"}
                            size="sm"
                            onClick={() => handleFollowToggle(u._id, followingUsers.has(u._id))}
                            className={`ml-3 min-w-[80px] ${
                              followingUsers.has(u._id) 
                                ? 'hover:bg-red-50 hover:text-red-600 hover:border-red-200' 
                                : 'bg-blue-500 hover:bg-blue-600 text-white'
                            }`}
                          >
                            {followingUsers.has(u._id) ? (
                              <>
                                <UserMinus size={14} className="mr-1" />
                                Unfollow
                              </>
                            ) : (
                              <>
                                <UserPlus size={14} className="mr-1" />
                                Follow
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
              <div className="p-4 border-t border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-500 text-center">
                  {filteredUsers.length} {modalOpen === 'followers' ? 'followers' : 'following'}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="w-full">
          <PostCreator onPostCreated={handlePostCreated} />
        </div>
        <div className="space-y-4 w-full">
          <h2 className="text-xl font-semibold break-words">Your Posts</h2>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span>Loading...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500 mb-4">{error}</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No posts yet. Start sharing your thoughts!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 w-full">
              {posts.map((post) => (
                <div
                  key={post._id}
                  className="w-full min-w-0"
                  style={{ maxWidth: '100%' }}
                >
                  <PostCard
                    post={post}
                    className="max-w-full break-words overflow-hidden"
                    onDelete={async (id) => {
                      if (window.confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
                        try {
                          await apiClient.deletePost(id);
                          setPosts(posts => posts.filter(p => p._id !== id));
                        } catch (err) {
                          alert("Failed to delete post. Please try again.");
                        }
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </MainLayout>
  )
}