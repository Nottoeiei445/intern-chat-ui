"use client"

import { useState, useEffect } from "react";
import { ChatThread, Message } from "../types";
import { useAuth } from "../../auth/context/AuthContext";
import { chatService } from "../services/chat.service"; 

export function useChat() {
  const { user } = useAuth(); 

  const [chats, setChats] = useState<ChatThread[]>([]); 
  const [activeChatId, setActiveChatId] = useState<string | null>(null); 
  const [isLoading, setIsLoading] = useState(false); 
  const [ephemeralMessages, setEphemeralMessages] = useState<Message[]>([]); 

  // State ใหม่สำหรับจัดการ Pagination ของแต่ละห้องแชท
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [paginationConfig, setPaginationConfig] = useState<Record<string, { page: number, hasMore: boolean }>>({});

  // Helper: Sort chats
  const sortChats = (list: ChatThread[]) => { 
    return [...list].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)); 
  };

  // 1. Fetch All Histories
  useEffect(() => { 
    const fetchAllHistories = async () => { 
      if (!user?.id) return; 
      
      console.group("📡 [INIT] Fetching Chat Histories"); 
      
      try {
        const responseData = await chatService.getHistories(user.id); 
        const rawList = responseData.data || responseData; 

        // SOFT DELETE LOGIC
        const filteredList = rawList.filter((item: any) => { 
          const isActive = item.is_active !== false && item.deleted !== true; 
          if (!isActive) console.warn(`🚫 Ignored Soft Deleted ID: ${item.id}`); 
          return isActive; 
        });

        const mappedChats: ChatThread[] = filteredList.map((item: any) => ({ 
          id: item.id, 
          title: item.title || "New Conversation", 
          messages: [],  
          createdAt: new Date(item.created_at).getTime(), 
          updatedAt: new Date(item.last_message_at || item.updated_at || item.created_at).getTime(), 
        }));

        const sorted = sortChats(mappedChats); 
        setChats(sorted); 
        console.table(sorted.slice(0, 5)); 
        
        if (sorted.length > 0 && !activeChatId) { 
          setActiveChatId(sorted[0].id); 
        }
      } catch (error) {
        console.error("❌ Failed to fetch histories:", error); 
      } finally {
        console.groupEnd(); 
      }
    };
    fetchAllHistories(); 
  }, [user]); 

  // 2. Fetch Chat Detail (Messages) - โหลดหน้าแรก
  useEffect(() => {
    const fetchChatDetail = async () => { 
      if (!activeChatId || activeChatId.startsWith('session_') || chats.length === 0) return; 
      
      const currentChat = chats.find(c => c.id === activeChatId); 
      
      // ถ้ามี messages อยู่แล้ว ให้ตรวจสอบว่ามี config ใน state หรือยัง
      if (currentChat && currentChat.messages && currentChat.messages.length > 0) {
        if (!paginationConfig[activeChatId]) {
          setPaginationConfig(prev => ({ 
            ...prev, 
            [activeChatId]: { page: 1, hasMore: currentChat.messages.length >= 5 } 
          }));
        }
        return; 
      }

      setIsLoading(true); 
      try {
        // ส่ง page 1 ไปดึงข้อมูลหน้าแรก (backend ต้องรองรับพารามิเตอร์นี้)
        const responseData = await chatService.getConversationDetail(activeChatId, 1); 
        const messages = responseData.data?.messages || responseData.messages || responseData.data || []; 
        
        setChats(prev => prev.map(chat =>  
          chat.id === activeChatId ? { ...chat, messages: messages } : chat 
        ));

        // บันทึก config หน้าแรกลง state (สมมติว่าถ้าได้ข้อความมา 20 แสดงว่าอาจจะมีหน้าถัดไป)
        setPaginationConfig(prev => ({
          ...prev,
          [activeChatId]: { page: 1, hasMore: messages.length >= 5 }
        }));

      } catch (error) {
        console.error("❌ Failed to load messages:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchChatDetail(); 
  }, [activeChatId, chats.length]); 

  // ฟังก์ชันใหม่: ดึงข้อมูลหน้าถัดไป (เก่าขึ้น)
  const fetchNextPage = async () => {
    if (!activeChatId || activeChatId.startsWith('session_')) return;

    const config = paginationConfig[activeChatId] || { page: 1, hasMore: true };
    if (!config.hasMore || isFetchingHistory) return;

    setIsFetchingHistory(true);
    const nextPage = config.page + 1;

    try {
      // เรียก API โดยส่งเลขหน้าถัดไป (backend ต้องรองรับ)
      const responseData = await chatService.getConversationDetail(activeChatId, nextPage);
      const olderMessages = responseData.data?.messages || responseData.messages || responseData.data || [];

      if (olderMessages.length === 0) {
        setPaginationConfig(prev => ({ 
          ...prev, 
          [activeChatId]: { ...config, hasMore: false } 
        }));
      } else {
        // เอาข้อความเก่าไปต่อไว้ "ด้านบน" ของ array เดิม
        setChats(prev => prev.map(chat =>
          chat.id === activeChatId
            ? { ...chat, messages: [...olderMessages, ...chat.messages] }
            : chat
        ));
        setPaginationConfig(prev => ({ 
          ...prev, 
          [activeChatId]: { page: nextPage, hasMore: olderMessages.length >= 5 } 
        }));
      }
    } catch (error) {
      console.error("❌ Failed to fetch older messages:", error);
    } finally {
      setIsFetchingHistory(false);
    }
  };

  const createNewChat = () => setActiveChatId(null); 

  // 3. Send Message (เวอร์ชัน Stream SSE)
  const sendMessage = async (
    input: string, 
    model: string, 
    images: string[] = [], 
    options?: { ephemeral?: boolean }
  ) => { 
    if (!input.trim() && images.length === 0) return; 
    
    const ephemeral = (!user?.id) ? true : (options?.ephemeral ?? false);

    if (!ephemeral && !user?.id) { 
      console.error("❌ Member mode requires login"); 
      return;
    }

    let currentId = activeChatId; 
    
    const userMsg: Message = { 
      role: "user", 
      content: input,
      ...(images.length > 0 && { images }) 
    }; 
    
    let isNewSession = false; 

    if (ephemeral) {
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
      setChats(prev => [{ id: tempId, title: input.slice(0, 30), messages: [userMsg], model: model, createdAt: Date.now(), updatedAt: Date.now() }, ...prev]); 
      setActiveChatId(tempId); 
      currentId = tempId; 
    }

    setIsLoading(true); 

    try {
      const payload = { 
        message: input, 
        userId: user?.id || 'guest_user', 
        model: model, 
        ephemeral: ephemeral,
        ...(images.length > 0 && { images }), 
        ...((isNewSession || ephemeral) ? {} : { conversationId: currentId })
      };
      const response = await chatService.sendMessageStream(payload);
      
      const realConversationId = response.headers.get('X-Conversation-Id') || response.headers.get('conversation_id');
      const assistantMsg: Message = { role: "assistant", content: "" };

      if (!ephemeral) {
        setChats(prev => prev.map(chat => 
          chat.id === currentId 
            ? { ...chat, id: realConversationId || chat.id, messages: [...chat.messages, assistantMsg] } 
            : chat
        ));
        if (isNewSession && realConversationId) {
          setActiveChatId(realConversationId);
          currentId = realConversationId;
        }
      } else {
        setEphemeralMessages(prev => [...prev, assistantMsg]);
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.replace('data: ', '').trim();
                if (!jsonStr) continue;

                const data = JSON.parse(jsonStr);
                const textChunk = data.text || data.content || "";
                accumulatedContent += textChunk;

                const displayContent = accumulatedContent.split("<thinking>").pop()?.trim() || accumulatedContent;

                if (ephemeral) {
                  setEphemeralMessages(prev => {
                    const newMsgs = [...prev];
                    const lastIdx = newMsgs.length - 1;
                    if (newMsgs[lastIdx]?.role === "assistant") {
                      newMsgs[lastIdx] = { ...newMsgs[lastIdx], content: displayContent };
                    }
                    return newMsgs;
                  });
                } else {
                  setChats(prev => prev.map(chat => 
                    chat.id === currentId 
                      ? {
                          ...chat,
                          messages: chat.messages.map((msg, idx) => 
                            idx === chat.messages.length - 1 ? { ...msg, content: displayContent } : msg
                          )
                        }
                      : chat
                  ));
                }
              } catch (e) {}
            }
          }
        }
      }
    } catch (error) {
      console.error("❌ Stream failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Delete Chat
  const deleteChat = async (id: string) => {
    if (!user?.id) return;

    console.log(`🗑️ [PROCESS] Requesting server to delete conversation: ${id}`);
    
    setIsLoading(true);

    try {
      await chatService.deleteConversation(id); 
      console.log(`✅ [SUCCESS] Server confirmed deletion`);

      const filtered = chats.filter(c => c.id !== id);
      setChats(filtered);
      
      if (activeChatId === id) {
        setActiveChatId(filtered[0]?.id || null);
      }

    } catch (error: any) {
      console.error("❌ [FAILURE] Server rejected deletion:", error);
      alert(`Failed to delete chat. Server responded with an error.`);
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Rename Chat
  const renameChat = async (id: string, newTitle: string) => {
    if (!user?.id) return;

    const originalChats = [...chats];
    setChats(prev => prev.map(chat => chat.id === id ? { ...chat, title: newTitle } : chat));
    
    try {
      await chatService.renameConversation(id, user.id, newTitle);
    } catch (error) {
      console.error("❌ [FAILURE] Failed to rename chat:", error);
      setChats(originalChats); 
    }
  };

  // ดึงค่า hasMore ของห้องแชทปัจจุบัน
  const currentHasMore = activeChatId ? (paginationConfig[activeChatId]?.hasMore ?? false) : false;

  return { 
    chats, 
    activeChatId, 
    setActiveChatId, 
    isLoading, 
    sendMessage, 
    createNewChat, 
    deleteChat, 
    renameChat, 
    ephemeralMessages,
    fetchNextPage,
    isFetchingHistory,
    hasMore: currentHasMore
  };
}