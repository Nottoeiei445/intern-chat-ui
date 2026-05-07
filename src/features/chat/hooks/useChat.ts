"use client"

import { useState, useEffect, useCallback, useMemo } from "react"; 
import { ChatThread, Message } from "../types";
import { useAuth } from "../../auth/context/AuthContext";
import { chatService } from "../services/chat.service"; 
import { AUTH_CONFIG } from "@/features/auth/config/auth.config";
import { storage } from "@/lib/storage";
import { useRouter } from "next/navigation";
import { chatWithOllama } from "../services/ollama";
import { DynamicLayerPayload } from '@/features/map/types';
import { useMapStore } from '@/store/useMapStore';

import { 
  checkAndCleanupExpiredGuest, 
  startGuestExpiryTimer 
} from "../../auth/utils/guest-timer.util";

export function useChat() {
  const { user } = useAuth(); 
  const { 
    apiKeys, 
    openKeyModal, 
    pendingChat, 
    setPendingChat, 
    clearPendingChat 
  } = useMapStore();
  const [chats, setChats] = useState<ChatThread[]>([]); 
  const [activeChatId, setActiveChatId] = useState<string | null>(null); 
  const [isLoading, setIsLoading] = useState(false); 
  const [ephemeralMessages, setEphemeralMessages] = useState<Message[]>([]); 

  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [paginationConfig, setPaginationConfig] = useState<Record<string, { page: number, hasMore: boolean }>>({});

  const [isSessionReady, setIsSessionReady] = useState(false);
  const [isGuestExpired, setIsGuestExpired] = useState(false);
  const router = useRouter();
  
  const dynamicLayers = useMapStore(state => state.dynamicLayers);
  const setDynamicLayers = useMapStore(state => state.setDynamicLayers);
  

  const sortChats = useCallback((list: ChatThread[]) => { 
    return [...list].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)); 
  }, []);

  useEffect(() => {
    if (apiKeys.gistda && pendingChat) {
      console.log("[useChat] API Key detected! Retrying pending request silently...");
      
      // เรียก sendMessage เดิม แต่เปิดโหมด isSilentRetry
      sendMessage(
        pendingChat.input,
        pendingChat.model,
        pendingChat.images,
        { ...pendingChat.options, isSilentRetry: true }
      );

      // ยิงเสร็จเคลียร์สถานะทิ้ง
      clearPendingChat();
    }
  }, [apiKeys.gistda, pendingChat]);

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

      setIsFetchingHistory(true); 
      
      try {
        const responseData = await chatService.getConversationDetail(targetId, 1); 
        let messages = [];
        if (Array.isArray(responseData?.data?.messages)) messages = responseData.data.messages;
        else if (Array.isArray(responseData?.messages)) messages = responseData.messages;
        else if (Array.isArray(responseData?.data)) messages = responseData.data;
        else if (Array.isArray(responseData)) messages = responseData;
        
        setChats(prev => {
          const existingChat = prev.find(chat => chat.id === targetId);
          if (existingChat && existingChat.messages.length > 0) {
            const lastMsg = existingChat.messages[existingChat.messages.length - 1];
            if (lastMsg.role === "user") {
              return prev;
            }
          }

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
        setIsFetchingHistory(false);
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
    options?: { 
      ephemeral?: boolean; 
      isRegenerate?: boolean; 
      explicitChatId?: string; 
      isSilentRetry?: boolean;
      isClarity?: boolean; // ประกาศ Type ตรงนี้
      editMessageId?: string;    // ประกาศ Type ตรงนี้
    }
  ) => { 
    if (!input.trim() && images.length === 0) return; 
    
    const ephemeral = options?.ephemeral ?? false;
    const isRegenerate = options?.isRegenerate ?? false;
    const isSilentRetry = options?.isSilentRetry ?? false; 
    const isClarity = options?.isClarity ?? false;
    const editMessageId = options?.editMessageId ?? null;

    if(!input.trim() && images.length === 0 && !isRegenerate) return;
    
    let initialId = options?.explicitChatId || activeChatId;
    if (!initialId && !user) {
      initialId = storage.getCookie(AUTH_CONFIG.session.guestIdStorageKey) as string || null;
    }
    
    let currentId = initialId;
    let isNewSession = false; 

    // ปรับเงื่อนไข: ถ้าเป็น Silent Retry ห้าม Render ข้อความ User ซ้ำบนจอ
    if (!isRegenerate && !isSilentRetry) {
      const userMsg: Message = { 
        role: "user", 
        content: input,
        ...(images.length > 0 && { images }) 
      }; 
      
      if (ephemeral) {
        setEphemeralMessages(prev => [...prev, userMsg]); 
      } 
      else if (currentId && !currentId.startsWith('session_')) { 
        setChats(prev => {
          const exists = prev.some(c => c.id === currentId);
          if (!exists) {
            return [{
              id: currentId as string,
              title: input.slice(0, 30) || "Guest Session",
              messages: [userMsg], 
              model: model,
              createdAt: Date.now(),
              updatedAt: Date.now()
            }, ...prev];
          } 
          else {
            const updated = prev.map(chat => 
              chat.id === currentId 
                ? { ...chat, messages: [...chat.messages, userMsg], updatedAt: Date.now() } 
                : chat
            );
            return sortChats(updated); 
          }
        });
        setActiveChatId(currentId);
      } 
      else {
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
    try {
      const payload = { 
        message: input, 
        model: model, 
        ephemeral: ephemeral,
        is_generate: isRegenerate,
        is_silent_retry: isSilentRetry, 
        is_clarity: isClarity, // ส่ง flag ไปให้หลังบ้าน
        ...(editMessageId && { edit_message_id: editMessageId }), // ส่ง ID ไปให้หลังบ้านเพื่อตัด History
        ...(images.length > 0 && { images }), 
        ...((isNewSession || ephemeral) ? {} : { conversationId: currentId })
      };
      
      if (input.trim() === "test_flow") {
        const mockChoiceMsg: Message = {
          id: `mock_choice_${Date.now()}`,
          role: "assistant",
          content: "เลือกช่วงเวลาที่ต้องการดูข้อมูล:",
          choices: [
            { label: "🔥 24 ชั่วโมง", value: "24 ชม." },
            { label: "📅 7 วัน", value: "7 วัน" }
          ]
        };
        setChats(prev => prev.map(chat => chat.id === currentId ? { ...chat, messages: [...chat.messages, mockChoiceMsg] } : chat));
        setIsLoading(false);
        return; 
      }

      if (payload.is_clarity) {
        console.log("✅ [SUCCESS] ยิง Payload Clarity:", payload);
        const mockConfirmMsg: Message = {
          id: `mock_confirm_${Date.now()}`,
          role: "assistant",
          content: `✅ หลังบ้านได้รับ Choice: **"${payload.message}"**\n(ลองเช็กใน Console (F12) ดูครับ จะเห็นว่าส่ง is_clarity: true ไปด้วย)`
        };
        setChats(prev => prev.map(chat => chat.id === currentId ? { ...chat, messages: [...chat.messages, mockConfirmMsg] } : chat));
        setIsLoading(false);
        return;
      }

      if (payload.edit_message_id) {
        console.log("✅ [SUCCESS] ยิง Payload Edit Message:", payload);
        const mockEditMsg: Message = {
          id: `mock_edit_${Date.now()}`,
          role: "assistant",
          content: `✂️ หลังบ้านได้รับคำสั่ง **Edit**!\n- ข้อความใหม่: **"${payload.message}"**\n- สั่งให้ตัดประวัติตั้งแต่ ID: **${payload.edit_message_id}**\n(ลองเช็กใน Console (F12) ดูได้เลยครับ)`
        };
        setChats(prev => prev.map(chat => chat.id === currentId ? { ...chat, messages: [...chat.messages, mockEditMsg] } : chat));
        setIsLoading(false);
        return;
      }

      const response = await chatService.sendMessageStream(payload, apiKeys.gistda);
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

                // ดัก Error ขอคีย์: จดคำสั่งลง Store และสั่งเด้ง Modal
                if (data.code === 'missing_x_api_key' || data.needsApiKey) {
                  setPendingChat({ input, model, images, options }); // แอบจำไว้ในใจ
                  openKeyModal(); // เด้งหน้าต่างทวงคีย์

                  // ลบบับเบิ้ล Assistant ว่างๆ ออกเพื่อให้จอไม่ค้างข้อความเปล่า
                  setChats(prev => prev.map(chat => {
                    if (chat.id === currentId) {
                      return { 
                        ...chat, 
                        messages: chat.messages.filter(m => m.role !== "assistant" || m.content !== "") 
                      };
                    }
                    return chat;
                  }));
                  
                  // ตัดจบการอ่าน Stream นี้ทันที
                  reader.cancel(); 
                  return; 
                }

                if (data.event === 'layer_catalog' && data.layer) {
                  const backendData = data.layer;
                  const newLayer: DynamicLayerPayload = {
                    id: backendData.basename || backendData.layerName || `ai-layer-${Date.now()}`,
                    type: backendData.type,
                    baseUrl: backendData.url,
                    layerId: backendData.basename || backendData.layerName,
                    title: backendData.title,
                    apiProvider: backendData.url.includes('vallaris') ? 'vallaris' : 'gistda',

                    bounds: backendData.bounds,
                    minzoom: backendData.minzoom,
                    maxzoom: backendData.maxzoom
                  };
                  setDynamicLayers([newLayer]);
                  continue;
                }

                if (data.event === 'map_options' || data.needInfo ) {
                  if (ephemeral) {
                    // กรณีเป็น Ephemeral Message 
                    setEphemeralMessages(prev => {
                      const newMsgs = [...prev];
                      const lastIdx = newMsgs.length - 1;
                      if (lastIdx >= 0 && newMsgs[lastIdx].role === "assistant") {
                        newMsgs[lastIdx] = { ...newMsgs[lastIdx], choices: data.choices };
                      }
                      return newMsgs;
                    });
                  } else {
                    // กรณีแชทปกติ
                    setChats(prev => prev.map(chat => {
                      if (chat.id === currentId) {
                        const safeMsgs = [...chat.messages];
                        const lastIdx = safeMsgs.length - 1;
                        
                        // ถ้าเจอข้อความ Assistant ล่าสุด ให้ยัด choices เข้าไป
                        if (lastIdx >= 0 && safeMsgs[lastIdx].role === "assistant") {
                          safeMsgs[lastIdx] = { 
                            ...safeMsgs[lastIdx], 
                            choices: data.choices // จุดที่เอา Choices ไปเก็บ
                          };
                        }
                        return { ...chat, messages: safeMsgs };
                      }
                      return chat;
                    }));
                  }
                  continue; // ข้ามไปอ่านบรรทัดต่อไป ไม่ต้องพ่น Choices ออกมาเป็น Text
                }

                // ลอจิกจัดการข้อความและสลับ ID เหมือนเดิม
                const incomingUserId = data.usermessage_id || data.userMessageId;
                const incomingAssistantId = data.assistantmessage_Id || data.assistantMessageId;

                if (incomingUserId || incomingAssistantId) {
                  setChats(prev => prev.map(chat => {
                    if(chat.id === currentId) {
                      const safeMsgs = [...chat.messages];
                      if (incomingUserId) {
                        for (let i = safeMsgs.length - 1; i >= 0; i--) {
                          if (safeMsgs[i].role === "user" && (!safeMsgs[i].id || String(safeMsgs[i].id).startsWith("temp_"))) {
                            safeMsgs[i] = { ...safeMsgs[i], id: incomingUserId };
                            break;
                          }
                        }
                      }
                      if (incomingAssistantId) {
                        for (let i = safeMsgs.length - 1; i >= 0; i--) {
                          if (safeMsgs[i].role === "assistant" && (!safeMsgs[i].id || String(safeMsgs[i].id).startsWith("temp_"))) {
                            safeMsgs[i] = { ...safeMsgs[i], id: incomingAssistantId };
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
                  setChats(prev => prev.map(chat => {
                    if (chat.id === currentId) {
                      const safeMsgs = [...chat.messages];
                      const lastIdx = safeMsgs.length - 1;
                      if (lastIdx >= 0 && safeMsgs[lastIdx].role === "assistant") {
                        safeMsgs[lastIdx] = { ...safeMsgs[lastIdx], content: displayContent };
                      } else {
                        safeMsgs.push({ 
                          id: `temp_assistant_${Date.now()}`,
                          role: "assistant", 
                          content: displayContent,
                        });
                      }
                      return { ...chat, messages: safeMsgs };
                    }
                    return chat;
                  }));
                }
              } catch (e) {
                console.error("JSON Parse Error", e);
              }
            }
          }
        }
      }

      if (!ephemeral && isNewSession && realIdToSwapLater) {
        const finalRealId = realIdToSwapLater; 
        setPaginationConfig(prev => ({ ...prev, [finalRealId]: { page: 1, hasMore: false } }));
        setChats(prev => prev.map(chat => 
          chat.id === currentId ? { ...chat, id: finalRealId } : chat
        ));
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
  const renameChat = async (id: string, newTitle: string) => { 
    const originalChats = [...chats]; 
    setChats(prev => prev.map(chat => chat.id === id ? { ...chat, title: newTitle } : chat));   
    
    try { 
      await chatService.renameConversation(id, newTitle); 
    } catch (error) {
      console.error("[FAILURE] Failed to rename chat:", error);
      setChats(originalChats); 
    }
  };
 
  const editAndResend = async (messageId: string, newContent: string, model: string) => {
    if (!activeChatId) return;
    setIsLoading(true);
    try {
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
      
      // ส่งคำสั่งพร้อมแนบ ID ข้อความไปให้หลังบ้านจัดการตัด Context
      await sendMessage(newContent, model, [], { 
        isRegenerate: true,
        editMessageId: messageId 
      });
      
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
    dynamicLayers,    
    setDynamicLayers, 
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