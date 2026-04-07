import { useState, useEffect } from "react";
import { ChatThread, Message } from "../types";
import { chatWithOllama } from "../services/ollama";

export function useChat() {
  const [chats, setChats] = useState<ChatThread[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("gis_chat_app_v1");
    if (saved) {
      const parsed = JSON.parse(saved);
      setChats(parsed);
      if (parsed.length > 0) setActiveChatId(parsed[0].id);
    } else {
      createNewChat();
    }
  }, []);

  useEffect(() => {
    if (chats.length > 0) localStorage.setItem("gis_chat_app_v1", JSON.stringify(chats));
  }, [chats]);

  const createNewChat = () => {
    const newChat: ChatThread = {
      id: Date.now().toString(),
      title: "New Conversation",
      messages: [],
      createdAt: Date.now(),
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
  };

  const deleteChat = (id: string) => {
    const filtered = chats.filter(c => c.id !== id);
    setChats(filtered);
    if (activeChatId === id) setActiveChatId(filtered[0]?.id || null);
  };

  const sendMessage = async (input: string, model: string) => {
    if (!activeChatId) return;

    const userMsg: Message = { role: "user", content: input };
    
    // Optimistic Update
    setChats(prev => prev.map(chat => {
      if (chat.id === activeChatId) {
        const newTitle = chat.messages.length === 0 ? input.slice(0, 25) + "..." : chat.title;
        return { ...chat, title: newTitle, messages: [...chat.messages, userMsg] };
      }
      return chat;
    }));

    setIsLoading(true);

    try {
      const currentMessages = chats.find(c => c.id === activeChatId)?.messages || [];
      const data = await chatWithOllama(model, [...currentMessages, userMsg]);
      const raw = data.message.content;

      let thinking = "";
      let content = raw;
      if (raw.includes("<think>")) {
        const parts = raw.split("</think>");
        thinking = parts[0].replace("<think>", "").trim();
        content = parts[1]?.trim() || "";
      }

      const assistantMsg: Message = { role: "assistant", content, thinking };

      setChats(prev => prev.map(c => 
        c.id === activeChatId ? { ...c, messages: [...c.messages, assistantMsg] } : c
      ));
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return { chats, activeChatId, setActiveChatId, isLoading, sendMessage, createNewChat, deleteChat };
}