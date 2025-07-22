// components/ui/comment-input.tsx
"use client"

import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Trash2, Paperclip } from "lucide-react";
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import Image from "next/image";
import { useAuth } from "@/lib/hooks/use-auth";
import { useMentions } from "@/lib/hooks/use-mentions";

interface CommentInputProps {
  onSubmit: (content: string, imageFile?: File) => void;
  placeholder?: string;
  className?: string;
  isSubmitting?: boolean;
}

export const CommentInput = ({ onSubmit, placeholder = "Write a comment...", className = "", isSubmitting = false }: CommentInputProps) => {
  const { user } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const {
    suggestions,
    showSuggestions,
    selectedIndex,
    handleKeyDown,
    handleSelectSuggestion,
    handleInputChange,
  } = useMentions(textareaRef);
  const [content, setContent] = useState<string>("");
  const [showEmoji, setShowEmoji] = useState<boolean>(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);
    handleInputChange(e);  // Handle mentions
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedImage(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = () => {
    if (!content.trim() && !selectedImage) return;
    onSubmit(content, selectedImage ?? undefined);
    setContent("");
    setSelectedImage(null);
    setImagePreview(null);
    setShowEmoji(false); // Hide emoji picker after submitting
  };

  return (
    <div className={`flex items-start space-x-2 sm:space-x-3 ${className}`}>
      <Avatar className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0">
        <AvatarImage src={user?.profilePic || "/placeholder.svg"} />
        <AvatarFallback className="bg-primary/10 text-primary text-xs">
          {user?.username?.slice(0, 2).toUpperCase() || "U"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 space-y-2 relative">
        <div className="flex gap-1 sm:gap-2 items-center">
          <Textarea
            ref={textareaRef}
            placeholder={placeholder}
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            className="min-h-[50px] sm:min-h-[60px] resize-none text-sm"
            rows={1}
          />
          <div className="flex flex-col gap-1 flex-shrink-0">
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowEmoji(!showEmoji)}>
              😊
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => document.getElementById('comment-img-input')?.click()}>
              <Paperclip className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
          </div>
          <input
            id="comment-img-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
        </div>
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
            {suggestions.map((user, index) => (
              <li
                key={user._id}
                className={`px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center gap-2 ${
                  index === selectedIndex ? 'bg-gray-100 dark:bg-gray-700' : ''
                }`}
                onClick={() => handleSelectSuggestion(user.username)}
              >
                <Avatar className="w-6 h-6">
                  <AvatarImage src={user.profilePic || "/placeholder.svg"} />
                  <AvatarFallback>{user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="text-sm">@{user.username}</span>
              </li>
            ))}
          </ul>
        )}
        {showEmoji && (
          <div className="absolute z-50 mt-2 right-0 top-full">
            <Picker data={data} onEmojiSelect={(e: any) => setContent(content + (e.native || e.shortcodes || ""))} theme="auto" />
          </div>
        )}
        {imagePreview && (
          <div className="mt-2 relative">
            <img src={imagePreview} alt="preview" className="max-h-24 sm:max-h-32 rounded object-cover" />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 rounded-full"
              onClick={() => {
                setSelectedImage(null);
                setImagePreview(null);
              }}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        )}
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={(!content.trim() && !selectedImage) || isSubmitting}
            size="sm"
            className="bg-primary hover:bg-primary/90 text-white text-xs sm:text-sm"
          >
            {isSubmitting ? <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 animate-spin" /> : <Send className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />}
            Post
          </Button>
        </div>
      </div>
    </div>
  );
};