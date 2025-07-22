// utils/content-renderer.tsx
import React from "react";

export function renderContentWithMentions(content: string): React.ReactNode {
  if (!content) return null;
  const mentionRegex = /@([a-zA-Z0-9_]{2,})/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = mentionRegex.exec(content)) !== null) {
    const [full, username] = match;
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    parts.push(
      <a
        key={`mention-${key++}`}
        href={`/profile/${username}`}
        className="text-blue-600 hover:underline font-semibold"
      >
        @{username}
      </a>
    );
    lastIndex = match.index + full.length;
  }
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }
  return <>{parts}</>;
}
