"use client"

import { useState, useEffect, useCallback, useMemo } from "react"; 
import { ChatThread, Message } from "../types";
import { useAuth } from "../../auth/context/AuthContext";
import { chatService } from "../services/chat.service"; 
import { authService } from "@/features/auth/services/auth.service";
import { AUTH_CONFIG } from "@/features/auth/config/auth.config";
import { storage } from "@/lib/storage";

export function useChat() {
  const { user } = useAuth(); 

  const [chats, setChats] = useState<ChatThread[]>([]); 
  const [activeChatId, setActiveChatId] = useState<string | null>(null); 
  const [isLoading, setIsLoading] = useState(false); 
  const [ephemeralMessages, setEphemeralMessages] = useState<Message[]>([]); 

  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [paginationConfig, setPaginationConfig] = useState<Record<string, { page: number, hasMore: boolean }>>({});

  const [isSessionReady, setIsSessionReady] = useState(false);

  const sortChats = useCallback((list: ChatThread[]) => { 
    return [...list].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)); 
  }, []);

  // 0. Initialize Session
  useEffect(() => {
    const initSession = async () => {
      const hasToken = storage.getCookie(AUTH_CONFIG.session.accessTokenStorageKey);
      if(!hasToken) {
        console.log("[INIT] No access token found, attempting guest login...");
        try {
          await authService.initializeGuest();
        } catch (error) {
          console.error("Guest initialization failed:", error);
        }
      }
      setIsSessionReady(true);
    };
    initSession();
  }, []);

  // 1. Fetch All Histories
  useEffect(() => {
    const fetchAllHistories = async () => {
      if (!isSessionReady) return;

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
        setChats(sorted); 
        
        // ถ้าเป็น Guest ให้บังคับ active เป็น guestId เลย จะได้หาเจอ
        const guestId = storage.getCookie(AUTH_CONFIG.session.guestIdStorageKey);
        if (!user && guestId) {
          setActiveChatId(guestId as string);
        } else if (sorted.length > 0) { 
          setActiveChatId(prev => prev ? prev : sorted[0].id); 
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
      // ดึง Guest ID และกำหนดเงื่อนไข: ถ้าไม่มี user ให้ใช้ guestId
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
    options?: { ephemeral?: boolean }
  ) => { 
    if (!input.trim() && images.length === 0) return; 
    
    const guestId = storage.getCookie(AUTH_CONFIG.session.guestIdStorageKey);
    const ephemeral = options?.ephemeral ?? false;

    // ถ้าไม่มี user ให้ใช้ guestId
    let currentId = !user && guestId ? (guestId as string) : activeChatId; 
    
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

  const migrationInfo = useMemo(() => {
    const gId = storage.getCookie(AUTH_CONFIG.session.guestIdStorageKey);
    const guestChat = chats.find(c => String(c.id) === String(gId));
    const hasContent = (guestChat?.messages.length || 0) > 0;

    return {
      guestId: gId as string | null,
      canMigrate: !!gId && hasContent,
    };
  }, [chats]);


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
    hasMore: currentHasMore,
    isSessionReady, 
    guestId: migrationInfo.guestId,
    canMigrate: migrationInfo.canMigrate
  };
}