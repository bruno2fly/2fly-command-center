"use client";

import { useState, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";

/**
 * Hook + Button component for adding inline agent chat to any tab.
 * 
 * Usage:
 *   const { showChat, ChatButton } = useTabChat();
 *   return <>
 *     <div className="flex items-center"><ChatButton /><OtherButtons /></div>
 *     {showChat && <InlineAgentChat ... />}
 *   </>
 */
export function useTabChat() {
  const [showChat, setShowChat] = useState(false);
  const { isDark } = useTheme();

  const toggleChat = useCallback(() => setShowChat((v) => !v), []);

  const ChatButton = useCallback(() => (
    <button
      onClick={toggleChat}
      className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${
        showChat
          ? isDark ? "bg-purple-500/30 text-purple-300 ring-1 ring-purple-500/40" : "bg-purple-100 text-purple-700 ring-1 ring-purple-300"
          : isDark
            ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 hover:from-blue-500/30 hover:to-purple-500/30"
            : "bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 hover:from-blue-100 hover:to-purple-100"
      }`}
    >
      {showChat ? "✕ Close Chat" : "💬 Ask Agent"}
    </button>
  ), [showChat, isDark, toggleChat]);

  return { showChat, toggleChat, ChatButton };
}
