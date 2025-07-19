"use client"

import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Bell, Heart, MessageCircle, UserPlus } from "lucide-react"
import { useEffect, useState } from "react"

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [postSnippets, setPostSnippets] = useState<Record<string, string>>({});
  const [marking, setMarking] = useState<string | null>(null); // notification id being marked

  async function fetchNotifications() {
    setLoading(true);
    try {
      const meRes = await fetch("/api/auth/me");
      const me = await meRes.json();
      if (!me.user || !me.user._id) {
        setNotifications([]);
        setLoading(false);
        return;
      }
      const res = await fetch(`/api/notifications?userId=${me.user._id}`);
      const data = await res.json();
      setNotifications(data);

      // For each notification, fetch its post snippet and map by postId
      const snippets: Record<string, string> = {};
      await Promise.all(
        data.map(async (notif: any) => {
          let postId = null;
          if (notif.link && notif.link.match(/\/(post|feed)\/(\w+)/)) {
            postId = notif.link.match(/\/(post|feed)\/(\w+)/)[2];
          }
          if (postId && !snippets[postId]) {
            try {
              const postRes = await fetch(`/api/posts?id=${postId}`);
              const postData = await postRes.json();
              let post = postData.post || (postData.posts && postData.posts[0]);
              if (post && post.content) {
                snippets[postId] = post.content.slice(0, 40) + (post.content.length > 40 ? "..." : "");
              }
            } catch (e) {
              // ignore
            }
          }
        })
      );
      setPostSnippets(snippets);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Mark notification as read/unread
  async function markRead(notifId: string, read: boolean) {
    setMarking(notifId);
    // Optimistically update UI
    setNotifications((prev) =>
      prev.map((n) => {
        const nId = typeof n._id === "object" && n._id !== null && "$oid" in n._id ? n._id.$oid : n._id;
        return nId === notifId ? { ...n, read } : n;
      })
    );
    try {
      const res = await fetch(`/api/notifications/${notifId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read }),
      });
      if (!res.ok) {
        // If server failed, revert
        await fetchNotifications();
      }
    } catch (e) {
      // On error, revert
      await fetchNotifications();
    } finally {
      setMarking(null);
    }
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Notifications</h1>
        </div>
        {loading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <span>Loading...</span>
            </CardContent>
          </Card>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No notifications yet</h3>
              <p className="text-muted-foreground">
                {"You'll see notifications here when someone interacts with your posts"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {notifications.map((notif) => {
              // Handle _id as string or object (e.g., { $oid: "..." })
              const notifId = typeof notif._id === "object" && notif._id !== null && "$oid" in notif._id ? notif._id.$oid : notif._id;
              let Icon = Bell;
              if (notif.type === "like") Icon = Heart;
              else if (notif.type === "mention") Icon = UserPlus;
              else if (notif.type === "comment") Icon = MessageCircle;
              // Fix post link if needed (ensure it starts with /posts/ and not /post/)
              let postLink = notif.link;
              let postId = null;
              if (postLink && postLink.match(/\/(post|feed)\/(\w+)/)) {
                postId = postLink.match(/\/(post|feed)\/(\w+)/)[2];
              }
              if (postLink && postLink.startsWith("/post/")) {
                postLink = postLink.replace("/post/", "/feed/");
              }
              const isRead = notif.read;
              return (
                <Card
                  key={notifId}
                  className={
                    "transition-all cursor-pointer " +
                    (isRead ? "bg-muted/50 opacity-70" : "bg-white border-blue-400 border-2 shadow-md")
                  }
                  onClick={() => {
                    if (!isRead) markRead(notifId, true);
                  }}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <Icon className={"w-8 h-8 " + (isRead ? "text-muted-foreground" : "text-blue-500")} />
                    {notif.fromUser?.avatar && (
                      <img
                        src={notif.fromUser.avatar}
                        alt={notif.fromUser.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    )}
                    <div className="flex-1 text-left">
                      <div className={"font-medium " + (isRead ? "" : "font-bold")}>{notif.message}</div>
                      {postId && postSnippets[postId] && (
                        <div className="text-xs text-muted-foreground italic mt-1">
                          {postSnippets[postId]}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">{new Date(notif.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {postLink && (
                        <a
                          href={postLink}
                          className="text-blue-500 hover:underline text-sm"
                          onClick={e => {
                            e.stopPropagation();
                            if (!isRead) markRead(notifId, true);
                          }}
                        >
                          View
                        </a>
                      )}
                      <button
                        className={
                          "text-xs px-2 py-1 rounded " +
                          (isRead
                            ? "bg-gray-200 text-gray-600 hover:bg-gray-300"
                            : "bg-blue-500 text-white hover:bg-blue-600")
                        }
                        disabled={marking === notifId}
                        onClick={e => {
                          e.stopPropagation();
                          markRead(notifId, !isRead);
                        }}
                      >
                        {isRead ? "Mark as Unread" : "Mark as Read"}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
