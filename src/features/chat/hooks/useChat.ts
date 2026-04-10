"use client"

import { useState, useEffect } from "react";
import { ChatThread, Message } from "../types";
import { chatWithOllama } from "../services/ollama";
import { useAuth } from "../../auth/context/AuthContext";
// 👇 1. Import ตัว Config ที่เราสร้างไว้เข้ามาใช้
import { CHAT_CONFIG } from "../config/chat.config"; 

export function useChat() {
  const { user } = useAuth();

  const [chats, setChats] = useState<ChatThread[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [ephemeralMessages, setEphemeralMessages] = useState<Message[]>([]);

  // 1. โหลดประวัติ
  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) {
        setChats([]);
        setActiveChatId(null);
        setEphemeralMessages([]);
        return;
      }
      try {
        // 👇 2. เปลี่ยนมาใช้ CHAT_CONFIG.HISTORY
        const res = await fetch(`${CHAT_CONFIG.HISTORY}?userId=${user.id}`);
        if (res.ok) {
          const data: ChatThread[] = await res.json();
          setChats(data);
          if (data.length > 0) setActiveChatId(data[0].id);
        }
      } catch (error) {
        console.error("ดึงประวัติจาก Backend ไม่สำเร็จ:", error);
      }
    };
    fetchHistory();
  }, [user]);

  const createNewChat = () => setActiveChatId(null);

  const deleteChat = async (id: string) => {
    const filtered = chats.filter(c => c.id !== id);
    setChats(filtered);
    if (activeChatId === id) setActiveChatId(filtered[0]?.id || null);
    
    // 👇 3. ใช้ CHAT_CONFIG.HISTORY
    if (user) await fetch(`${CHAT_CONFIG.HISTORY}/${id}`, { method: 'DELETE' }).catch(console.error);
  };

  const renameChat = async (id: string, newTitle: string) => {
    setChats(prev => prev.map(chat => chat.id === id ? { ...chat, title: newTitle } : chat));
    
    // 👇 4. ใช้ CHAT_CONFIG.HISTORY
    if (user) {
      await fetch(`${CHAT_CONFIG.HISTORY}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      }).catch(console.error);
    }
  };

  // 2. ฟังก์ชันส่งข้อความ (แบบ Production-Ready)
  const sendMessage = async (
    input: string,
    model: string,
    options?: { ephemeral?: boolean }
  ) => {
    if (!input.trim()) return;

    const ephemeral = options?.ephemeral ?? false;
    let currentId = activeChatId;
    let updatedHistory: Message[] = [];
    const userMsg: Message = { role: "user", content: input };
    let isNewSession = false; 

    if (ephemeral || !user) {
      const nextEphemeral = [...ephemeralMessages, userMsg];
      setEphemeralMessages(nextEphemeral);
      updatedHistory = nextEphemeral;
    } else if (currentId) {
      // ต่อแชทเดิม
      setChats(prev => prev.map(chat => {
        if (chat.id === currentId) {
          return { ...chat, messages: [...chat.messages, userMsg] };
        }
        return chat;
      }));
      const targetChat = chats.find(c => c.id === currentId);
      updatedHistory = targetChat ? [...targetChat.messages, userMsg] : [userMsg];
    } else {
      // สร้างแชทใหม่
      isNewSession = true;
      const tempId = `session_${Date.now()}`;
      const newChat: ChatThread = {
        id: tempId,
        title: input.slice(0, 30),
        messages: [userMsg],
        createdAt: Date.now(),
      };
      setChats(prev => [newChat, ...prev]);
      setActiveChatId(tempId);
      currentId = tempId;
      updatedHistory = [userMsg];
    }

    setIsLoading(true);

    try {
      // ขอคำตอบจาก Ollama
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

      // เอาขึ้นจอ
      if (ephemeral || !user) {
        setEphemeralMessages(prev => [...prev, assistantMsg]);
      } else {
        const target = currentId as string;
        setChats(prev => prev.map(c => 
          c.id === target ? { ...c, messages: [...c.messages, assistantMsg] } : c
        ));

        // 🔥 ท่าที่ 2: ใช้ CHAT_CONFIG.APPEND ส่งไปให้เพื่อน (Backend)
        await fetch(CHAT_CONFIG.APPEND, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            sessionId: target,
            isNewSession: isNewSession, 
            title: isNewSession ? input.slice(0, 30) : undefined, 
            newMessages: [userMsg, assistantMsg] 
          })
        });
      }
    } catch (error) {
      console.error("Chat Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return { chats, activeChatId, setActiveChatId, isLoading, sendMessage, createNewChat, deleteChat, renameChat, ephemeralMessages };
}