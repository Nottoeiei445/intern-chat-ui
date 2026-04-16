"use client"

import { useState, useEffect } from "react";
import { ChatThread, Message } from "../types";
import { useAuth } from "../../auth/context/AuthContext";
import { CHAT_CONFIG } from "../config/chat.config"; 

export function useChat() {
  const { user } = useAuth();

  const [chats, setChats] = useState<ChatThread[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [ephemeralMessages, setEphemeralMessages] = useState<Message[]>([]);

  // 🛠️ ฟังก์ชันช่วยสำหรับเรียงลำดับแชทตามเวลา updatedAt ล่าสุด (ใหม่สุดอยู่บน)
  const sortChats = (list: ChatThread[]) => {
    return [...list].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  };

  // 🛠️ 1. โหลดรายชื่อแชททั้งหมด และจัดเรียงตามเวลาจาก Backend
  useEffect(() => {
    const fetchAllHistories = async () => {
      if (!user) return;
      try {
        const token = localStorage.getItem("access_token");
        const url = `${CHAT_CONFIG.api.baseURL}${CHAT_CONFIG.endpoints.history}?userId=${user.id}`;
        
        const res = await fetch(url, {
          method: 'GET',
          headers: { 
            ...CHAT_CONFIG.api.headers, 
            "Authorization": `Bearer ${token}` 
          },
          credentials: 'include'
        });

        if (res.ok) {
          const responseData = await res.json();
          const rawList = responseData.data || responseData;

          const mappedChats: ChatThread[] = rawList.map((item: any) => ({
            id: item.id,
            title: item.title || "บทสนทนาใหม่",
            messages: [], 
            createdAt: new Date(item.created_at).getTime(),
            updatedAt: new Date(item.last_message_at || item.updated_at || item.created_at).getTime(),
          }));

          setChats(sortChats(mappedChats));
          
          if (mappedChats.length > 0 && !activeChatId) {
            setActiveChatId(mappedChats[0].id);
          }
        }
      } catch (error) {
        console.error("❌ ดึงรายชื่อแชทไม่สำเร็จ:", error);
      }
    };
    fetchAllHistories();
  }, [user]);

  // 🛠️ 2. โหลดข้อความข้างใน (Messages)
  useEffect(() => {
    const fetchChatDetail = async () => {
      if (!activeChatId || activeChatId.startsWith('session_') || chats.length === 0) return;
      const currentChat = chats.find(c => c.id === activeChatId);
      if (!currentChat || (currentChat.messages && currentChat.messages.length > 0)) return;

      setIsLoading(true);
      try {
        const token = localStorage.getItem("access_token");
        const url = `${CHAT_CONFIG.api.baseURL}${CHAT_CONFIG.endpoints.conversation}/${activeChatId}`;

        const res = await fetch(url, {
          method: 'GET',
          headers: { 
            ...CHAT_CONFIG.api.headers, 
            "Authorization": `Bearer ${token}` 
          },
          credentials: 'include'
        });

        if (res.ok) {
          const responseData = await res.json();
          const messages = responseData.data?.messages || responseData.messages || responseData.data || [];
          
          setChats(prev => prev.map(chat => 
            chat.id === activeChatId ? { ...chat, messages: messages } : chat
          ));
        }
      } catch (error) {
        console.error("❌ โหลดข้อความแชทไม่สำเร็จ:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchChatDetail();
  }, [activeChatId, chats.length]); 

  const createNewChat = () => setActiveChatId(null);

  // 🛠️ 3. ส่งข้อความ และ Re-sort ทันที
  const sendMessage = async (input: string, model: string, options?: { ephemeral?: boolean }) => {
    if (!input.trim()) return;
    const ephemeral = options?.ephemeral ?? false;
    let currentId = activeChatId;
    const userMsg: Message = { role: "user", content: input };
    let isNewSession = false; 

    const token = localStorage.getItem("access_token");

    if (ephemeral || !user) {
      setEphemeralMessages(prev => [...prev, userMsg]);
    } else if (currentId && !currentId.startsWith('session_')) {
      setChats(prev => {
        const updated = prev.map(chat => 
          chat.id === currentId 
            ? { ...chat, messages: [...chat.messages, userMsg], updatedAt: Date.now() } 
            : chat
        );
        return sortChats(updated); 
      });
    } else {
      isNewSession = true;
      const tempId = `session_${Date.now()}`;
      const newChat: ChatThread = {
        id: tempId,
        title: input.slice(0, 30),
        messages: [userMsg],
        createdAt: Date.now(),
        updatedAt: Date.now(), 
      };
      setChats(prev => [newChat, ...prev]);
      setActiveChatId(tempId);
      currentId = tempId;
    }

    setIsLoading(true);

    try {
      const payload: any = { message: input };
      if (user?.id) payload.userId = user.id;
      if (!isNewSession && currentId) payload.conversationId = currentId;

      const url = `${CHAT_CONFIG.api.baseURL}${CHAT_CONFIG.endpoints.chat}`;
      
      const res = await fetch(url, {
        method: 'POST',
        headers: { 
          ...CHAT_CONFIG.api.headers, 
          "Authorization": `Bearer ${token}` 
        },
        credentials: 'include', 
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`Backend Error: ${res.status}`);

      const responseData = await res.json();
      const realConversationId = responseData.data.conversationId;
      const rawReplyContent = responseData.data.reply.content;

      let thinking = "";
      let finalContent = rawReplyContent;
      if (rawReplyContent.includes("<think>")) {
        const parts = rawReplyContent.split("</think>");
        thinking = parts[0].replace("<think>", "").trim();
        finalContent = parts[1]?.trim() || "";
      }

      const assistantMsg: Message = { role: "assistant", content: finalContent, thinking };

      if (ephemeral || !user) {
        setEphemeralMessages(prev => [...prev, assistantMsg]);
      } else {
        setChats(prev => {
          const updated = prev.map(chat => 
            chat.id === currentId 
              ? { ...chat, id: realConversationId, messages: [...chat.messages, assistantMsg], updatedAt: Date.now() } 
              : chat
          );
          return sortChats(updated);
        });
        if (isNewSession) setActiveChatId(realConversationId);
      }
    } catch (error) {
      console.error("Chat Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 🛠️ 4. ฟังก์ชันลบแชท (ส่ง userId ใน Body และใช้ token)
  const deleteChat = async (id: string) => {
    const originalChats = [...chats];
    const filtered = chats.filter(c => c.id !== id);
    setChats(filtered);
    if (activeChatId === id) setActiveChatId(filtered[0]?.id || null);
    
    if (user) {
      try {
        const token = localStorage.getItem("access_token");
        const url = `${CHAT_CONFIG.api.baseURL}${CHAT_CONFIG.endpoints.conversation}/${id}`;
        
        const res = await fetch(url, { 
          method: 'DELETE',
          headers: { 
            ...CHAT_CONFIG.api.headers, 
            "Authorization": `Bearer ${token}` 
          },
          credentials: 'include',
          body: JSON.stringify({ userId: user.id }) // 🚀 ส่ง userId ไปยืนยันสิทธิ์
        });

        if (!res.ok) {
          console.error("❌ ลบที่หลังบ้านไม่สำเร็จ:", res.status);
          setChats(originalChats); // คืนค่าหน้าจอถ้าหลังบ้านลบไม่ได้
        }
      } catch (error) {
        console.error("❌ เกิดข้อผิดพลาดในการลบ:", error);
        setChats(originalChats);
      }
    }
  };

  // 🛠️ 5. ฟังก์ชันแก้ชื่อแชท
  const renameChat = async (id: string, newTitle: string) => {
    const originalChats = [...chats];
    setChats(prev => prev.map(chat => chat.id === id ? { ...chat, title: newTitle } : chat));
    
    if (user) {
      try {
        const token = localStorage.getItem("access_token");
        const url = `${CHAT_CONFIG.api.baseURL}${CHAT_CONFIG.endpoints.conversation}/${id}`;
        const res = await fetch(url, {
          method: 'PATCH',
          headers: { 
            ...CHAT_CONFIG.api.headers, 
            "Authorization": `Bearer ${token}` 
          },
          credentials: 'include',
          body: JSON.stringify({ 
            userId: user.id, // ส่ง userId ไปด้วยถ้าหลังบ้านต้องการเช็คสิทธิ์
            title: newTitle 
          })
        });

        if (!res.ok) {
          console.error("❌ แก้ชื่อไม่สำเร็จ:", res.status);
          setChats(originalChats);
        }
      } catch (error) {
        console.error("❌ เกิดข้อผิดพลาดในการแก้ชื่อ:", error);
        setChats(originalChats);
      }
    }
  };

  return { chats, activeChatId, setActiveChatId, isLoading, sendMessage, createNewChat, deleteChat, renameChat, ephemeralMessages };
}