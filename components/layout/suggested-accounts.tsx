// components/suggested-accounts.tsx
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UserPlus, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import type { SuggestedUser } from "@/types/suggested-user"
import { apiClient } from "@/lib/api-client";

const CACHE_KEY = 'suggested_users_cache';
const CACHE_EXPIRY = 45 * 60 * 1000; // 45 minutes in milliseconds
const MAX_SUGGESTIONS = 5;

interface CachedData {
  users: SuggestedUser[];
  timestamp: number;
}

export function SuggestedAccounts() {
	const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([])
	const [loading, setLoading] = useState(true)
	const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({})

	const { user } = useAuth()
	const { toast } = useToast()

	useEffect(() => {
		const fetchSuggestedUsers = async () => {
			if (!user?.email) {
				console.log('[SuggestedAccounts] No authenticated user, skipping fetch');
				setLoading(false);
				setSuggestedUsers([]);
				return;
			}

			// Check cache first
			const cached = localStorage.getItem(CACHE_KEY);
			if (cached) {
				const cachedData: CachedData = JSON.parse(cached);
				const now = Date.now();
				if (now - cachedData.timestamp < CACHE_EXPIRY) {
					console.log('[SuggestedAccounts] Using cached suggestions');
					setSuggestedUsers(cachedData.users);
					setLoading(false);
					return;
				} else {
					console.log('[SuggestedAccounts] Cache expired, fetching new suggestions');
				}
			}

			setLoading(true);
			try {
				console.log('[SuggestedAccounts] Fetching suggested users for:', user.email);
				const response = await apiClient.getSuggestedUsers();
				let users: SuggestedUser[] = [];
				
				if (Array.isArray(response)) {
					users = response.slice(0, MAX_SUGGESTIONS);
				} else if (response && Array.isArray(response.users)) {
					users = response.users.slice(0, MAX_SUGGESTIONS);
				}

				// Cache the results
				localStorage.setItem(CACHE_KEY, JSON.stringify({
					users,
					timestamp: Date.now()
				}));

				setSuggestedUsers(users);
				console.log('[SuggestedAccounts] Suggestion algorithm results:', {
					totalFetched: response.length || 0,
					selected: users.length,
					criteria: 'Users are suggested based on:',
					factors: [
						'Common interests or learning paths',
						'Similar branch or alumni status',
						'Mutual connections (followers/following)',
						'Active users in the last 30 days',
						'Users with complete profiles'
					]
				});
			} catch (err) {
				console.error("[SuggestedAccounts] Error fetching suggested users:", err);
				toast({
					title: "Error",
					description: "Could not load suggested users",
					variant: "destructive",
				});
				setSuggestedUsers([]);
			} finally {
				setLoading(false);
			}
		};

		fetchSuggestedUsers();
	}, [user, toast]); // Add user and toast to dependencies

	const handleFollow = async (userIdToFollow: string) => {
		if (!user) {
			toast({
				title: "Authentication Required",
				description: "Please log in to follow users.",
				variant: "destructive",
			});
			return;
		}

		setFollowingStates(prev => ({ ...prev, [userIdToFollow]: true }));
		try {
			const response = await apiClient.followUser(userIdToFollow);
			if (response.isFollowing) {
				setSuggestedUsers(prev =>
					prev.map(u =>
						u._id === userIdToFollow ? { ...u, isFollowing: true, followers: [...u.followers, user._id] } : u // CORRECTED: Changed user.userId to user._id
					)
				);
				toast({
					title: "Success",
					description: `You are now following ${suggestedUsers.find(u => u._id === userIdToFollow)?.username || 'user'}.`,
				});
			} else {
				// This case should ideally not happen for a follow action
				toast({
					title: "Error",
					description: "Could not follow user.",
					variant: "destructive",
				});
			}
		} catch (err: any) {
			console.error('Error following user:', err);
			toast({
				title: "Error",
				description: err.message || "Failed to follow user.",
				variant: "destructive",
			});
		} finally {
			setFollowingStates(prev => ({ ...prev, [userIdToFollow]: false }));
		}
	};

	if (loading && suggestedUsers.length === 0) {
		return (
			<Card className="hidden lg:block bg-card text-card-foreground shadow-sm">
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">Suggested for you</CardTitle>
					<UserPlus className="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{[...Array(3)].map((_, i) => (
							<div key={i} className="flex items-center space-x-3 animate-pulse">
								<div className="h-10 w-10 rounded-full bg-muted"></div>
								<div className="flex-1 space-y-1">
									<div className="h-4 bg-muted rounded w-3/4"></div>
									<div className="h-3 bg-muted rounded w-1/2"></div>
								</div>
								<div className="h-8 w-20 bg-muted rounded-full"></div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		);
	}

	if (suggestedUsers.length === 0 && !loading) {
		return null; // Don't render if no suggestions and not loading
	}

	return (
		<Card className="hidden lg:block bg-card border-0 shadow-none">
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4">
				<CardTitle className="text-base font-semibold">Suggested for you</CardTitle>
				<UserPlus className="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent className="px-4">
				<div className="space-y-6">
					{suggestedUsers.map((suggestedUser) => (
						<div key={suggestedUser._id} className="flex items-center justify-between group">
							<div className="flex items-center space-x-3">
								<Avatar className="h-10 w-10 border">
									<AvatarImage src={suggestedUser.profilePic} alt={suggestedUser.username} />
									<AvatarFallback className="bg-primary/5 text-primary font-medium">
										{suggestedUser.username.slice(0, 2).toUpperCase()}
									</AvatarFallback>
								</Avatar>
								<div className="flex-1 min-w-0">
									<p className="font-semibold text-sm truncate max-w-[120px] sm:max-w-[160px] md:max-w-[200px] group-hover:underline cursor-pointer">
										{suggestedUser.username}
									</p>
									<p className="text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-[160px] md:max-w-[200px]">
										@{suggestedUser.username}
									</p>
									<p className="text-xs text-muted-foreground">
										{suggestedUser.followers.length} followers
									</p>
								</div>
							</div>
							<Button
								size="sm"
								variant={followingStates[suggestedUser._id] || suggestedUser.isFollowing ? "secondary" : "default"}
								onClick={() => handleFollow(suggestedUser._id)}
								disabled={followingStates[suggestedUser._id]}
								className="rounded-full px-4 h-8 text-xs font-medium transition-all"
							>
								{followingStates[suggestedUser._id] ? (
									<Loader2 className="w-3 h-3 animate-spin" />
								) : suggestedUser.isFollowing ? (
									"Following"
								) : (
									"Follow"
								)}
							</Button>
						</div>
					))}
					{suggestedUsers.length > 0 && (
						<Button 
							variant="ghost" 
							className="w-full text-primary hover:text-primary/90 text-sm font-semibold"
						>
							View all suggestions
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	)
}