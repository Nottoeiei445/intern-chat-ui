"use client"

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
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("gis_chat_app_v1", JSON.stringify(chats));
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
    return newChat;
  };

  const deleteChat = (id: string) => {
    const filtered = chats.filter(c => c.id !== id);
    setChats(filtered);
    if (activeChatId === id) setActiveChatId(filtered[0]?.id || null);
  };

  const renameChat = (id: string, newTitle: string) => {
    setChats(prev => prev.map(chat => 
      chat.id === id ? { ...chat, title: newTitle } : chat
    ));
  };

  const sendMessage = async (input: string, model: string) => {
    if (!input.trim()) return;

    let currentId = activeChatId;
    let updatedHistory: Message[] = [];

    if (!currentId) {
      const newId = Date.now().toString();
      const newChat: ChatThread = {
        id: newId,
        title: input.slice(0, 30),
        messages: [{ role: "user", content: input }],
        createdAt: Date.now(),
      };
      
      setChats(prev => [newChat, ...prev]);
      setActiveChatId(newId);
      currentId = newId;
      updatedHistory = [{ role: "user", content: input }];
    } else {
      const userMsg: Message = { role: "user", content: input };
      
      setChats(prev => prev.map(chat => {
        if (chat.id === currentId) {
          const isFirstMsg = chat.messages.length === 0;
          return { 
            ...chat, 
            title: isFirstMsg ? input.slice(0, 30) : chat.title,
            messages: [...chat.messages, userMsg] 
          };
        }
        return chat;
      }));

      const targetChat = chats.find(c => c.id === currentId);
      updatedHistory = targetChat ? [...targetChat.messages, userMsg] : [userMsg];
    }

    setIsLoading(true);

    try {
      const data = await chatWithOllama(model, updatedHistory);
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
        c.id === currentId ? { ...c, messages: [...c.messages, assistantMsg] } : c
      ));
    } catch (error) {
      console.error("Chat Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return { 
    chats, 
    activeChatId, 
    setActiveChatId, 
    isLoading, 
    sendMessage, 
    createNewChat, 
    deleteChat,
    renameChat 
  };
}