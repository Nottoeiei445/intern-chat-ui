"use client"

import { useState, useEffect, useCallback, useMemo } from "react"; 
import { ChatThread, Message } from "../types";
import { useAuth } from "../../auth/context/AuthContext";
import { chatService } from "../services/chat.service"; 
import { authService } from "@/features/auth/services/auth.service";
import { AUTH_CONFIG } from "@/features/auth/config/auth.config";
import { storage } from "@/lib/storage";
import { useRouter } from "next/navigation";
import { chatWithOllama } from "../services/ollama";
import { 
  checkAndCleanupExpiredGuest, 
  startGuestExpiryTimer 
} from "../../auth/utils/guest-timer.util";

export function useChat() {
  const { user } = useAuth(); 

  const [chats, setChats] = useState<ChatThread[]>([]); 
  const [activeChatId, setActiveChatId] = useState<string | null>(null); 
  const [isLoading, setIsLoading] = useState(false); 
  const [ephemeralMessages, setEphemeralMessages] = useState<Message[]>([]); 

  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [paginationConfig, setPaginationConfig] = useState<Record<string, { page: number, hasMore: boolean }>>({});

  const [isSessionReady, setIsSessionReady] = useState(false);
  const [isGuestExpired, setIsGuestExpired] = useState(false);
  const router = useRouter();

  const sortChats = useCallback((list: ChatThread[]) => { 
    return [...list].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)); 
  }, []);

  // 0. Initialize Session
  useEffect(() => {
    const initSession = async () => {
      setIsSessionReady(true);
    };
    initSession();
  }, []);

  // 1. Fetch All Histories
  useEffect(() => {
    const fetchAllHistories = async () => {
      if (!isSessionReady) return;

      // 🚀 THE FIX: ดักจับ 401 Unauthorized 
      // เช็คก่อนว่ามี Token ไหม ถ้าไม่มี (เช่น Guest หน้าใหม่) ให้หยุดทำงานไปเลย
      const token = storage.getCookie(AUTH_CONFIG.session.accessTokenStorageKey);
      if (!token) {
        console.log("[useChat] No token found, skipping history fetch.");
        return; 
      }

      console.group("[INIT] Fetching Chat Histories"); 
      
      try {
        const responseData = await chatService.getHistories(); 
        const rawList = responseData.data || responseData; 

        const filteredList = rawList.filter((item: any) => { 
          const isActive = item.is_active !== false && item.deleted !== true; 
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
        
        setChats(prev => {
          const serverChats = sorted.map(newChat => {
            const existingChat = prev.find(c => c.id === newChat.id);
            if (existingChat && existingChat.messages.length > 0) {
              return { ...newChat, messages: existingChat.messages };
            }
            return newChat;
          });

          const localChats = prev.filter(p => !serverChats.some(s => s.id === p.id));
          return [...localChats, ...serverChats].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        });
        
        const guestId = storage.getCookie(AUTH_CONFIG.session.guestIdStorageKey);
        if (!user && guestId) {
          setActiveChatId(guestId as string);
        } else if (sorted.length > 0 && !activeChatId) { 
          setActiveChatId(sorted[0].id); 
        }
      } catch (error) {
        console.error("Failed to fetch histories:", error); 
      } finally {
        console.groupEnd(); 
      }
    };
    
    fetchAllHistories(); 
  }, [isSessionReady, sortChats, user]);

  // 2. Fetch Chat Detail (Messages)
  useEffect(() => {
    const fetchChatDetail = async () => { 
      const guestId = storage.getCookie(AUTH_CONFIG.session.guestIdStorageKey);
      const targetId = !user && guestId ? (guestId as string) : activeChatId;

      if (!targetId || targetId.startsWith('session_')) return; 
      if (paginationConfig[targetId]) return; 

      setIsLoading(true); 
      try {
        const responseData = await chatService.getConversationDetail(targetId, 1); 
        let messages = [];
        if (Array.isArray(responseData?.data?.messages)) messages = responseData.data.messages;
        else if (Array.isArray(responseData?.messages)) messages = responseData.messages;
        else if (Array.isArray(responseData?.data)) messages = responseData.data;
        else if (Array.isArray(responseData)) messages = responseData;
        
        setChats(prev => {
          const chatExists = prev.some(chat => chat.id === targetId);
          if (!chatExists && targetId === guestId) {
            return [{
              id: targetId,
              title: "Guest Session",
              messages: messages,
              createdAt: Date.now(),
              updatedAt: Date.now()
            }, ...prev];
          }
          return prev.map(chat => chat.id === targetId ? { ...chat, messages: messages } : chat);
        });

        setPaginationConfig(prev => ({
          ...prev,
          [targetId]: { page: 1, hasMore: messages.length >= 5 }
        }));

      } catch (error) {
        console.error("Failed to load messages:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchChatDetail(); 
  }, [activeChatId, paginationConfig, user]); 

  // Fetch Next Page
  const fetchNextPage = async () => {
    const guestId = storage.getCookie(AUTH_CONFIG.session.guestIdStorageKey);
    const targetId = !user && guestId ? (guestId as string) : activeChatId;

    if (!targetId || targetId.startsWith('session_')) return;

    const config = paginationConfig[targetId] || { page: 1, hasMore: true };
    if (!config.hasMore || isFetchingHistory) return;

    setIsFetchingHistory(true);
    const nextPage = config.page + 1;

    try {
      const responseData = await chatService.getConversationDetail(targetId, nextPage);
      let olderMessages = [];
      if (Array.isArray(responseData?.data?.messages)) olderMessages = responseData.data.messages;
      else if (Array.isArray(responseData?.messages)) olderMessages = responseData.messages;
      else if (Array.isArray(responseData?.data)) olderMessages = responseData.data;
      else if (Array.isArray(responseData)) olderMessages = responseData;

      if (olderMessages.length === 0) {
        setPaginationConfig(prev => ({ 
          ...prev, 
          [targetId]: { ...config, hasMore: false } 
        }));
      } else {
        setChats(prev => prev.map(chat =>
          chat.id === targetId
            ? { ...chat, messages: [...olderMessages, ...chat.messages] }
            : chat
        ));
        setPaginationConfig(prev => ({ 
          ...prev, 
          [targetId]: { page: nextPage, hasMore: olderMessages.length >= 5 } 
        }));
      }
    } catch (error) {
      console.error("Failed to fetch older messages:", error);
    } finally {
      setIsFetchingHistory(false);
    }
  };

  const createNewChat = () => setActiveChatId(null); 


  // 3. Send Message
  const sendMessage = async (
    input: string, 
    model: string, 
    images: string[] = [], 
    options?: { ephemeral?: boolean; isRegenerate?: boolean; explicitChatId?: string } // 🚀 เพิ่มตัวนี้
  ) => { 
    if (!input.trim() && images.length === 0) return; 
    
    const ephemeral = options?.ephemeral ?? false;
    const isRegenerate = options?.isRegenerate ?? false;

    if(!input.trim() && images.length === 0 && !isRegenerate) return;
    
    // 🚀 ใช้ explicitChatId ถ้ามีส่งมา (แก้ปัญหา State อัปเดตไม่ทัน)
    let initialId = options?.explicitChatId || activeChatId;
    if (!initialId && !user) {
      initialId = storage.getCookie(AUTH_CONFIG.session.guestIdStorageKey) as string || null;
    }
    
    let currentId = initialId;
    let isNewSession = false; 

    if (!isRegenerate) {
      const userMsg: Message = { 
        role: "user", 
        content: input,
        ...(images.length > 0 && { images }) 
      }; 
      
      if (ephemeral) {
        setEphemeralMessages(prev => [...prev, userMsg]); 
      } else if (currentId && !currentId.startsWith('session_')) { 
        setChats(prev => {
          // 🚀 เช็คว่ากล่องแชทนี้มีอยู่แล้วหรือยัง?
          const exists = prev.some(c => c.id === currentId);

          if (!exists) {
            // ✅ ถ้ายังไม่มี (เพิ่งได้ Guest ID มาใหม่): ให้สร้างกล่องแชท "พร้อมยัดข้อความ User" ลงไปเลย!
            return [{
              id: currentId as string,
              title: input.slice(0, 30) || "Guest Session",
              messages: [userMsg], 
              model: model,
              createdAt: Date.now(),
              updatedAt: Date.now()
            }, ...prev];
          } else {
            // ✅ ถ้ามีอยู่แล้ว: ก็แค่เอาข้อความไปต่อท้ายตามปกติ
            const updated = prev.map(chat => 
              chat.id === currentId 
                ? { ...chat, messages: [...chat.messages, userMsg], updatedAt: Date.now() } 
                : chat
            );
            return sortChats(updated); 
          }
        });
        
        // บังคับโฟกัสห้องแชทให้ถูกต้อง
        setActiveChatId(currentId);
      } else {
        isNewSession = true; 
        const tempId = `session_${Date.now()}`; 
        setChats(prev => [{ 
          id: tempId, 
          title: input.slice(0, 30), 
          messages: [userMsg], 
          model: model, 
          createdAt: Date.now(), 
          updatedAt: Date.now() 
        }, ...prev]); 
        setActiveChatId(tempId); 
        currentId = tempId; 
      }
    }

    setIsLoading(true);

    setIsLoading(true); 

    try {
      const payload = { 
        message: input, 
        model: model, 
        ephemeral: ephemeral,
        is_generate: isRegenerate,
        ...(images.length > 0 && { images }), 
        ...((isNewSession || ephemeral) ? {} : { conversationId: currentId })
      };
      
      const response = await chatService.sendMessageStream(payload);
      
      let realIdToSwapLater = response.headers.get('X-Conversation-Id') || response.headers.get('conversation_id');
      
      const assistantMsg: Message = { role: "assistant", content: "" };

      if (!ephemeral) {
        setChats(prev => prev.map(chat => 
          chat.id === currentId 
            ? { ...chat, messages: [...chat.messages, assistantMsg] } 
            : chat
        ));
      } else {
        setEphemeralMessages(prev => [...prev, assistantMsg]);
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.replace('data: ', '').trim();
                if (!jsonStr || jsonStr === '[DONE]') continue;

                const data = JSON.parse(jsonStr);
                const incomingUserId = data.usermessage_id || data.userMessageId;
                const incomingAssistantId = data.assistantmessage_Id || data.assistantMessageId;

                if (incomingUserId || incomingAssistantId) {
                  setChats(prev => prev.map(chat => {
                    if(chat.id === currentId) {
                      const safeMsgs = [...chat.messages];
                      
                      if (incomingUserId) {
                        for (let i = safeMsgs.length - 1; i >= 0; i--) {
                          if (safeMsgs[i].role === "user" && (!safeMsgs[i].id || safeMsgs[i].id?.startsWith("temp_edit_"))) {
                            safeMsgs[i] = { ...safeMsgs[i], id: incomingUserId }; // 👈 ยัด ID ฝั่ง User
                            break;
                          }
                        }
                      }
                      if (incomingAssistantId) {
                        for (let i = safeMsgs.length - 1; i >= 0; i--) {
                          if (safeMsgs[i].role === "assistant" && !safeMsgs[i].id) {
                            safeMsgs[i] = { ...safeMsgs[i], id: incomingAssistantId }; // 👈 ยัด ID ฝั่ง AI
                            break;
                          }
                        }
                      }
                      return { ...chat, messages: safeMsgs };
                    }
                    return chat;
                  }));
                }
      
                if (isNewSession && !realIdToSwapLater && !ephemeral) {
                  const streamId = data.conversation_id || data.conversationId || data.chat_id || data.chatId;
                  if (streamId) {
                    realIdToSwapLater = String(streamId);
                  }
                }

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
              } catch (e) {
                console.error("JSON Parse Error", e);
              }
            }
          }
        }
      }

      if (!ephemeral && isNewSession && realIdToSwapLater) {
        const finalRealId = realIdToSwapLater; // การันตีค่า
        
        // ดัก useEffect ไม่ให้ดึง API ทับหน้าจอ
        setPaginationConfig(prev => ({ ...prev, [finalRealId]: { page: 1, hasMore: false } }));
        
        // สลับ ID ในรายการแชท
        setChats(prev => prev.map(chat => 
          chat.id === currentId ? { ...chat, id: finalRealId } : chat
        ));
        
        // สลับโฟกัสหน้าจอ
        setActiveChatId(finalRealId);
      }

    } catch (error) {
      console.error("Stream failed:", error);
    } finally {
      setIsLoading(false);
    }
};


  // 4. Delete Chat
  const deleteChat = async (id: string) => {
    console.log(`[PROCESS] Requesting server to delete conversation: ${id}`);
    setIsLoading(true);

    try {
      await chatService.deleteConversation(id); 
      console.log(`[SUCCESS] Server confirmed deletion`);

      const filtered = chats.filter(c => c.id !== id);
      setChats(filtered);
      
      if (activeChatId === id) {
        setActiveChatId(filtered[0]?.id || null);
      }
    } catch (error: any) {
      console.error("[FAILURE] Server rejected deletion:", error);
      alert(`Failed to delete chat. Server responded with an error.`);
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Rename Chat
    const renameChat = async (id: string, newTitle: string) => { // เปลี่ยนชื่อแชท
      const originalChats = [...chats]; // เก็บสำรองของเดิมไว้ก่อนเผื่อแก้ไขกลับ
      setChats(prev => prev.map(chat => chat.id === id ? { ...chat, title: newTitle } : chat));   // อัปเดตชื่อใน UI ทันทีแบบ Optimistic UI
      
      try { 
        await chatService.renameConversation(id, newTitle); // ส่งคำขอเปลี่ยนชื่อไปยังเซิร์ฟเวอร์
      } catch (error) {
        console.error("[FAILURE] Failed to rename chat:", error);
        setChats(originalChats); 
      }
    };
 
    const editAndResend = async (messageId: string, newContent: string, model: string) => {
      if (!activeChatId) return;
      setIsLoading(true);
      try {
        // 1. ส่ง ID เก่าไปบอกเพื่อนหลังบ้านว่าขอแก้ตัวนี้นะ
        await chatService.editMessage(messageId, newContent, true);

        setChats(prev => prev.map(chat => {
          if (chat.id === activeChatId) {
            const msgIndex = chat.messages.findIndex(m => m.id === messageId);
            if (msgIndex == -1) return chat;
            
            const updatedMessages = chat.messages.slice(0, msgIndex + 1).map(m=> 
              m.id === messageId ? { ...m, content: newContent, id: "temp_edit_" + Date.now() } : m
            );
            
            return { ...chat, messages: updatedMessages };
          }
          return chat;
        }));
        
        // 2. เรียก sendMessage ให้มันไปดึง ID ใหม่จาก Stream มายัดให้เอง!
        await sendMessage(newContent, model, [], { isRegenerate: true });
        
      } catch (error) {
        console.error("Failed to edit message:", error);
      } finally {
        setIsLoading(false);
      }
    };
  const migrationInfo = useMemo(() => {
    const gId = storage.getCookie(AUTH_CONFIG.session.guestIdStorageKey);
    const guestChat = chats.find(c => String(c.id) === String(gId));
    const hasContent = (guestChat?.messages.length || 0) > 0;

    return {
      guestId: gId as string | null,
      canMigrate: !!gId && hasContent,
    };
  }, [chats]);

  useEffect(() => {
    if (user || !isSessionReady) return;

    const wasSwept = checkAndCleanupExpiredGuest();
    if (wasSwept) {
      setChats([]);
      setActiveChatId(null);
      setIsGuestExpired(false);
    }
  }, [user, isSessionReady]); 

  useEffect(() => {
    if (user || !isSessionReady || isGuestExpired) return;

    const stopTimer = startGuestExpiryTimer(() => {
      setIsGuestExpired(true); 
      storage.removeCookie(AUTH_CONFIG.session.accessTokenStorageKey);
    });

    return () => stopTimer();
  }, [user, isSessionReady, isGuestExpired]);

  const currentHasMore = activeChatId ? (paginationConfig[activeChatId]?.hasMore ?? false) : false;

  return { 
    chats, 
    setChats,
    activeChatId, 
    setActiveChatId, 
    isLoading, 
    sendMessage, 
    createNewChat, 
    deleteChat, 
    renameChat, 
    editAndResend,
    ephemeralMessages,
    fetchNextPage,
    isFetchingHistory,
    hasMore: currentHasMore,
    isSessionReady, 
    guestId: migrationInfo.guestId,
    canMigrate: migrationInfo.canMigrate,
    isGuestExpired,
    setIsGuestExpired
    };
}