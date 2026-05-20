"use client"

import { useState, useEffect, useCallback, useMemo } from "react"; 
import { ChatThread, Message } from "../types";
import { useAuth } from "../../auth/context/AuthContext";
import { chatService } from "../services/chat.service"; 
import { AUTH_CONFIG } from "@/features/auth/config/auth.config";
import { storage } from "@/lib/storage";
import { useMapStore } from '@/store/useMapStore';
import { 
  checkAndCleanupExpiredGuest, 
  startGuestExpiryTimer 
} from "../../auth/utils/guest-timer.util";

// --- Helpers ---
const sortChats = (list: ChatThread[]) => { 
  return [...list].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)); 
};

const mapBackendMessage = (msg: any) => {
  const isMapOptions = msg.metadata?.event === 'map_options';
  const payload = msg.metadata?.payload;
  const attachments = msg.metadata?.vision?.attachments || msg.metadata?.attachments || [];
  const imageUrl = attachments.length > 0 ? attachments[0].url : undefined;

  return {
    ...msg, 
    content: msg.content || (isMapOptions ? payload?.question : "") || "",
    choices: isMapOptions ? payload?.choices : msg.choices,
    choiceKey: isMapOptions ? payload?.key : msg.choiceKey,
    pagination: isMapOptions ? (payload?.pagination || msg.metadata?.pagination) : msg.pagination,
    imageUrl: imageUrl, 
  };
};

const reconstructMapState = (messages: Message[]) => {
  let layers: any[] = [];
  
  messages.forEach(msg => {
    const meta = msg.metadata;
    if (!meta) return;

    if (meta.event === 'layer_catalog' && meta.layer) {
      const b = meta.layer;
      const newLayerId = b.layerId || b.styleId || b.basename || b.layerName || `ai-layer-${msg.id}`;
      
      const newLayer = {
        id: newLayerId,
        type: b.type, 
        baseUrl: b.url, 
        layerId: newLayerId,
        title: b.title, 
        apiProvider: b.url?.includes('vallaris') ? 'vallaris' : 'gistda',
        bounds: b.bounds, 
        minzoom: b.minzoom, 
        maxzoom: b.maxzoom,
        ...(meta.mapStyle && {
          availableStyles: meta.mapStyle.availableStyles || [],
          activeStyleKey: meta.mapStyle.defaultStyle || meta.mapStyle.styleKey || 'default',
          renderStyles: meta.mapStyle.layers || []
        })
      };

      const existingIdx = layers.findIndex(l => l.id === newLayerId);
      if (existingIdx > -1) {
        layers[existingIdx] = { ...layers[existingIdx], ...newLayer }; // อัปเดตตัวเดิม
      } else {
        layers.push(newLayer); // เพิ่มตัวใหม่
      }
    }

    if (meta.event === 'map_style' && (meta.availableStyles || meta.layers)) {
      layers = layers.map(layer => {
        if (layer.layerId === meta.layerId || layer.id === meta.layerId) {
          return { 
            ...layer, 
            availableStyles: meta.availableStyles || layer.availableStyles,
            activeStyleKey: meta.defaultStyle || layer.activeStyleKey,
            renderStyles: meta.layers || layer.renderStyles 
          };
        }
        return layer;
      });
    }
    if (meta.event === 'map_control') {
      if (meta.mode === 'all') {
        layers = []; 
      } else if (meta.mode === 'selected' && meta.layerId) {
        layers = layers.filter(layer => layer.id !== meta.layerId && layer.layerId !== meta.layerId);
      }
    }
  });
  
  return layers; 
};

export function useChat() {
  // 1. Context & Store
  const { user } = useAuth(); 
  const { 
    apiKeys, openKeyModal, pendingChat, 
    setPendingChat, clearPendingChat,
    dynamicLayers, setDynamicLayers 
  } = useMapStore();

  // 2. Main Chat State
  const [chats, setChats] = useState<ChatThread[]>([]); 
  const [activeChatId, setActiveChatId] = useState<string | null>(null); 
  const [isLoading, setIsLoading] = useState(false); 
  const [ephemeralMessages, setEphemeralMessages] = useState<Message[]>([]); 

  // 3. History & Pagination State
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [paginationConfig, setPaginationConfig] = useState<Record<string, { page: number, hasMore: boolean }>>({});

  // 4. Session State
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [isGuestExpired, setIsGuestExpired] = useState(false);

  const [suggestions, setSuggestions] = useState<{key: string, label: string, promptTemplate: string}[]>([]);

  // --- 5. Initialization Effects ---
  useEffect(() => { setIsSessionReady(true); }, []);

  useEffect(() => {
    if (apiKeys.gistda && pendingChat) {
      const options = { ...pendingChat.options, isSilentRetry: true };
      if (user && options.explicitChatId?.startsWith('guest_')) delete options.explicitChatId;
      sendMessage(pendingChat.input, pendingChat.model, pendingChat.images, options);
      clearPendingChat();
    }
  }, [apiKeys.gistda, pendingChat, user]);

  useEffect(() => {
    if (!isSessionReady) return;

    const fetchAllHistories = async () => {
      const token = storage.getCookie(AUTH_CONFIG.session.accessTokenStorageKey);
      if (!token) return; 

      try {
        const responseData = await chatService.getHistories(); 
        const rawList = responseData.data || responseData; 
        const filteredList = Array.isArray(rawList) ? rawList.filter((item: any) => item.is_active !== false && !item.deleted) : [];

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
            return existingChat?.messages.length ? { ...newChat, messages: existingChat.messages } : newChat;
          });
          const localChats = prev.filter(p => !serverChats.some(s => s.id === p.id));
          return sortChats([...localChats, ...serverChats]);
        });
        
        const guestId = storage.getCookie(AUTH_CONFIG.session.guestIdStorageKey);
        if (!user && guestId) setActiveChatId(guestId as string);
        else if (sorted.length > 0 && !activeChatId) setActiveChatId(sorted[0].id);

      } catch (error) { console.error("Failed to fetch histories:", error); }
    };
    fetchAllHistories(); 
  }, [isSessionReady, user]);

  // Fetch specific chat detail
  useEffect(() => {
    const guestId = storage.getCookie(AUTH_CONFIG.session.guestIdStorageKey);
    const targetId = !user && guestId ? (guestId as string) : activeChatId;

    if (!targetId || targetId.startsWith('session_') || paginationConfig[targetId]) return; 

    const fetchChatDetail = async () => { 
      setIsFetchingHistory(true); 
      try {
        const responseData = await chatService.getConversationDetail(targetId, 1); 
        const coversationApiKey = responseData?.ApiKey || responseData?.data?.ApiKey || responseData?.xApiKey || responseData?.data?.xApiKey || null;

        if (coversationApiKey) {
           const mapStore = useMapStore.getState();
           mapStore.setSessionKey(targetId, coversationApiKey); 
           mapStore.setcurrentConversationApiKey(coversationApiKey); 
        } else {
           useMapStore.getState().setcurrentConversationApiKey(null);
        }

        const rawMessages = responseData?.data?.messages || responseData?.messages || responseData?.data || (Array.isArray(responseData) ? responseData : []);
        const messages = rawMessages.map(mapBackendMessage);
        
        const restoredLayers = reconstructMapState(messages);
        useMapStore.getState().setDynamicLayers(restoredLayers);
        
        setChats(prev => {
          const existingChat = prev.find(chat => chat.id === targetId);
          if (existingChat?.messages.length && existingChat.messages[existingChat.messages.length - 1].role === "user") return prev;

          const chatExists = prev.some(chat => chat.id === targetId);
          if (!chatExists && targetId === guestId) {
            return [{ id: targetId, title: "Guest Session", messages, createdAt: Date.now(), updatedAt: Date.now() }, ...prev];
          }
          return prev.map(chat => chat.id === targetId ? { ...chat, messages } : chat);
        });

        setPaginationConfig(prev => ({ ...prev, [targetId]: { page: 1, hasMore: messages.length >= 5 } }));
      } catch (error) {
        console.error("Failed to load messages:", error);
      } finally {
        setIsFetchingHistory(false);
      }
    };
    fetchChatDetail(); 
  }, [activeChatId, paginationConfig, user]);

  useEffect(() => {
    const mapStore = useMapStore.getState();

    // กรณีเริ่มแชทใหม่ หรือไม่ได้เลือกห้อง
    if (!activeChatId || activeChatId.startsWith('session_')) {
      mapStore.setcurrentConversationApiKey(null);
      mapStore.setDynamicLayers([]); 
      setSuggestions([]); 
      return;
    }

    const cachedKey = mapStore.sessionKeys[activeChatId] || null;
    mapStore.setcurrentConversationApiKey(cachedKey);

    // จังหวะคลิกสลับห้องแชทเก่า
    const currentChat = chats.find(c => c.id === activeChatId);
    if (currentChat && currentChat.messages.length > 0) {
      const restoredLayers = reconstructMapState(currentChat.messages);
      mapStore.setDynamicLayers(restoredLayers);
    }
    setSuggestions([]); 
  }, [activeChatId]); 

  // --- 6. Chat Actions ---

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
      const rawOlderMessages = responseData?.data?.messages || responseData?.messages || responseData?.data || (Array.isArray(responseData) ? responseData : []);

      if (rawOlderMessages.length === 0) {
        setPaginationConfig(prev => ({ ...prev, [targetId]: { ...config, hasMore: false } }));
      } else {
        const mappedOlderMessages = rawOlderMessages.map(mapBackendMessage);
        setChats(prev => prev.map(chat => chat.id === targetId ? { ...chat, messages: [...mappedOlderMessages, ...chat.messages] } : chat));
        setPaginationConfig(prev => ({ ...prev, [targetId]: { page: nextPage, hasMore: mappedOlderMessages.length >= 5 } }));
      }
    } catch (error) {
      console.error("Failed to fetch older messages:", error);
    } finally {
      setIsFetchingHistory(false);
    }
  };

  const createNewChat = () => {
    setActiveChatId(null);
    useMapStore.getState().clearApiKeys();
    useMapStore.getState().setDynamicLayers([]);
  };

  const sendMessage = async (input: string, model: string, images: string[] = [], options?: any) => { 
    if (!input.trim() && images.length === 0 && !options?.isRegenerate) return; 
    
    const { ephemeral = false, isRegenerate = false, isSilentRetry = false, isClarity = false, editMessageId = null, choiceKey, choiceValue, mapselection, targetMessageId } = options || {};
    const isChoiceResponse = !!choiceKey;
    
    let currentId = options?.explicitChatId || activeChatId || (!user && storage.getCookie(AUTH_CONFIG.session.guestIdStorageKey) as string) || null;
    if (user && typeof currentId === 'string' && currentId.startsWith('guest_')) {
      currentId = null; 
      if (options) delete options.explicitChatId;
    }
    let isNewSession = false; 

    // Update Local UI Immediately
    if (!isRegenerate && !isSilentRetry) {
      const userMsg: Message = { role: "user", content: input, ...(images.length > 0 && { images }) }; 
      if (ephemeral) setEphemeralMessages(prev => [...prev, userMsg]); 
      else if (currentId && !currentId.startsWith('session_')) { 
        setChats(prev => {
          const exists = prev.some(c => c.id === currentId);
          if (!exists) return [{ id: currentId as string, title: input.slice(0, 30) || "Guest Session", messages: [userMsg], model, createdAt: Date.now(), updatedAt: Date.now() }, ...prev];
          return sortChats(prev.map(chat => chat.id === currentId ? { ...chat, messages: [...chat.messages, userMsg], updatedAt: Date.now() } : chat));
        });
        setActiveChatId(currentId);
      } else {
        isNewSession = true; 
        currentId = `session_${Date.now()}`; 
        const mapStore = useMapStore.getState();
        mapStore.setcurrentConversationApiKey(null);
        mapStore.clearApiKeys();
        setChats(prev => [{ id: currentId as string, title: input.slice(0, 30), messages: [userMsg], model, createdAt: Date.now(), updatedAt: Date.now() }, ...prev]); 
        setActiveChatId(currentId); 
      }
    }

    setSuggestions([]);
    setIsLoading(true);
    try {
      const payload = { 
        message: input, model, ephemeral, is_generate: isRegenerate, is_silent_retry: isSilentRetry, is_clarity: isClarity, 
       ...(mapselection ? { mapselection } : (choiceKey && choiceValue ? { mapselection: { key: choiceKey, value: choiceValue } } : {})),
        ...(editMessageId && { edit_message_id: editMessageId }), 
        ...(images.length > 0 && { images }), 
        ...((isNewSession || ephemeral) ? {} : { conversationId: currentId })
      };

      const { currentConversationApiKey, apiKeys } = useMapStore.getState();
      const activeHeaderKey = currentConversationApiKey || apiKeys.gistda;

      const response = await chatService.sendMessageStream(payload, activeHeaderKey);
      let realIdToSwapLater = response.headers.get('X-Conversation-Id') || response.headers.get('conversation_id');
      const assistantMsg: Message = { role: "assistant", content: "" };

      if (!targetMessageId) {
        if (!ephemeral) setChats(prev => prev.map(chat => chat.id === currentId ? { ...chat, messages: [...chat.messages, assistantMsg] } : chat));
        else setEphemeralMessages(prev => [...prev, assistantMsg]);
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";
      let buffer = "";
      
      let currentEvent = "message"; 

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.replace('event: ', '').trim();
              continue;
            }

            if (!line.startsWith('data: ')) continue;
            try {
              const jsonStr = line.replace('data: ', '').trim();
              if (!jsonStr || jsonStr === '[DONE]') continue;
              const data = JSON.parse(jsonStr);

              const eventType = data.event || currentEvent;

              // Handle Conversation ID Swapping
              const realId = data.conversationId || data.conversation_id || data.chat_id || data.chatId;
              
              if (realId) {
                if (currentId?.startsWith('session_')) {
                  const oldSessionId = currentId;
                  setChats(prev => prev.map(chat => chat.id === oldSessionId ? { ...chat, id: realId } : chat));
                  currentId = realId;
                  setActiveChatId(realId);
                  setPaginationConfig(prev => ({ ...prev, [realId]: { page: 1, hasMore: false } }));
                  const mapStore = useMapStore.getState();
                  if (mapStore.apiKeys.gistda) {
                    mapStore.setSessionKey(realId, mapStore.apiKeys.gistda);
                    mapStore.setcurrentConversationApiKey(mapStore.apiKeys.gistda);
                  }
                }
                if (isNewSession && !realIdToSwapLater && !ephemeral) {
                  realIdToSwapLater = String(realId);
                }
              }

              // Handle Missing API Key
              if (data.code === 'missing_x_api_key' || data.needsApiKey) {
                setPendingChat({ input, model, images, options: { ...options, explicitChatId: currentId } });
                openKeyModal(); 
                setChats(prev => prev.map(chat => chat.id === currentId ? { ...chat, messages: chat.messages.filter(m => m.role !== "assistant" || m.content !== "") } : chat));
                reader.cancel(); return; 
              }

              // Handle Map Events (Catalog)
              if (eventType === 'layer_catalog' && data.layer) {
                const b = data.layer;
                const currentLayers = useMapStore.getState().dynamicLayers; 
                
                const newLayerId = b.layerId || b.styleId || b.basename || b.layerName || `ai-layer-${Date.now()}`;
                
                if (!currentLayers.some(l => l.id === newLayerId)) {
                  setDynamicLayers([...currentLayers, {
                    id: newLayerId,
                    type: b.type, 
                    baseUrl: b.url, 
                    layerId: newLayerId,
                    title: b.title, 
                    apiProvider: b.url?.includes('vallaris') ? 'vallaris' : 'gistda',
                    bounds: b.bounds, 
                    minzoom: b.minzoom, 
                    maxzoom: b.maxzoom,
                  }]);
                }
                continue;
              }

              // Handle Map Events
              if (eventType === 'map_style' && (data.availableStyles || data.layers)) {
                const currentLayers = useMapStore.getState().dynamicLayers; 
                
                const updatedLayers = currentLayers.map(layer => {
                  if (layer.layerId === data.layerId || layer.id === data.layerId) {
                    const receivedStyles = data.availableStyles || [];
                    const baseStyleKey = data.defaultStyle || (receivedStyles.length > 0 ? receivedStyles[0].styleKey : 'default');

                    return { 
                      ...layer, 
                      availableStyles: receivedStyles,
                      activeStyleKey: layer.activeStyleKey || baseStyleKey,
                      renderStyles: data.layers || layer.renderStyles 
                    };
                  }
                  return layer;
                });
                
                setDynamicLayers(updatedLayers);
                continue;
              }

              // Handle Map Options
              if (eventType === 'map_options' || data.needInfo || data.choices) {
                const choices = data.choices || data.payload?.choices;
                const key = data.key || data.payload?.key;
                const questionText = data.question || data.payload?.question || ""; 
                const pagination = data.pagination || data.payload?.pagination;

                const reqOffset = mapselection?.pagination?.offset || 0;
                const updateMsg = (m: Message) => m.role === "assistant" ? { 
                  ...m, 
                  content: questionText || m.content, 
                  choices: choices, 
                  choiceKey: key,
                  pagination: pagination ? { ...pagination, offset: reqOffset } : undefined,
                } : m;
                
                if (ephemeral) {
                  setEphemeralMessages(prev => prev.map((m, i) => i === prev.length - 1 ? updateMsg(m) : m));
                } else {
                  setChats(prev => prev.map(c => {
                    if (c.id !== currentId) return c;
                    return {
                      ...c,
                      messages: c.messages.map((m,i) => {
                        const isTarget = targetMessageId ? m.id === targetMessageId : i === c.messages.length - 1;
                        return isTarget && m.role === "assistant" ? updateMsg(m) : m;
                      })

                    };
                  }));
                }
                continue;
              }

              if (eventType === 'map_control') {
                const mapStore = useMapStore.getState();
                if (data.mode === 'all') {
                  mapStore.clearLayers();
                } 
                else if (data.mode === 'selected' && data.layerId) {
                  const filteredLayers = mapStore.dynamicLayers.filter(
                    layer => layer.id !== data.layerId && layer.layerId !== data.layerId
                  );
                  mapStore.setDynamicLayers(filteredLayers);
                }
                continue;
              }

              if (eventType === 'suggestions' && data.items) {
                setSuggestions(data.items);
                continue;
              }

              // Handle Message IDs
              const incomingUserId = data.usermessage_id || data.userMessageId;
              const incomingAssistantId = data.assistantmessage_Id || data.assistantMessageId;
              if (incomingUserId || incomingAssistantId) {
                setChats(prev => prev.map(chat => {
                  if(chat.id !== currentId) return chat;
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
                }));
              }

              // Handle Content Streaming
              const textChunk = data.text || data.content || "";
              accumulatedContent += textChunk;
              const displayContent = accumulatedContent.split("<thinking>").pop()?.trim() || accumulatedContent;

              if (ephemeral) {
                setEphemeralMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: displayContent } : m));
              } else {
                setChats(prev => prev.map(chat => {
                  if (chat.id !== currentId) return chat;
                  const safeMsgs = [...chat.messages];
                  
                  if (targetMessageId) {
                    const targetIdx = safeMsgs.findIndex(m => m.id === targetMessageId);
                    if (targetIdx !== -1) {
                      safeMsgs[targetIdx] = { ...safeMsgs[targetIdx], content: displayContent || safeMsgs[targetIdx].content };
                    }
                  } else {
                    const lastIdx = safeMsgs.length - 1;
                    if (lastIdx >= 0 && safeMsgs[lastIdx].role === "assistant") {
                       safeMsgs[lastIdx] = { ...safeMsgs[lastIdx], content: displayContent || safeMsgs[lastIdx].content }; 
                    } else {
                       safeMsgs.push({ id: `temp_assistant_${Date.now()}`, role: "assistant", content: displayContent });
                    }
                  }
                  
                  return { ...chat, messages: safeMsgs };
                }));
              }

            } catch (e) { 
              console.error("JSON Parse Error", e); 
            }
          }
        }
      }

      if (!ephemeral && isNewSession && realIdToSwapLater) {
        setPaginationConfig(prev => ({ ...prev, [realIdToSwapLater as string]: { page: 1, hasMore: false } }));
        setChats(prev => prev.map(chat => chat.id === currentId ? { ...chat, id: realIdToSwapLater as string } : chat));
        setActiveChatId(realIdToSwapLater as string);
        const mapStore = useMapStore.getState();
        if (mapStore.apiKeys.gistda) {
          mapStore.setSessionKey(realIdToSwapLater as string, mapStore.apiKeys.gistda);
          mapStore.setcurrentConversationApiKey(mapStore.apiKeys.gistda);
        }
      }
    } catch (error) { console.error("Stream failed:", error); } 
    finally { setIsLoading(false); }
  };

  const deleteChat = async (id: string) => {
    setIsLoading(true);
    try {
      await chatService.deleteConversation(id); 
      const filtered = chats.filter(c => c.id !== id);
      setChats(filtered);
      if (activeChatId === id) setActiveChatId(filtered[0]?.id || null);
    } catch (error: any) { alert(`Failed to delete chat.`); } 
    finally { setIsLoading(false); }
  };

  const renameChat = async (id: string, newTitle: string) => { 
    const originalChats = [...chats]; 
    setChats(prev => prev.map(chat => chat.id === id ? { ...chat, title: newTitle } : chat)); 
    try { await chatService.renameConversation(id, newTitle); } 
    catch (error) { setChats(originalChats); }
  };
 
  const editAndResend = async (messageId: string, newContent: string, model: string) => {
    if (!activeChatId) return;
    setIsLoading(true);
    try {
      setChats(prev => prev.map(chat => {
        if (chat.id !== activeChatId) return chat;
        const msgIndex = chat.messages.findIndex(m => m.id === messageId);
        if (msgIndex == -1) return chat;
        const updatedMessages = chat.messages.slice(0, msgIndex + 1).map(m => m.id === messageId ? { ...m, content: newContent, id: "temp_edit_" + Date.now() } : m);
        return { ...chat, messages: updatedMessages };
      }));
      await sendMessage(newContent, model, [], { isRegenerate: true, editMessageId: messageId });
    } finally { setIsLoading(false); }
  };

  const migrationInfo = useMemo(() => {
    const gId = storage.getCookie(AUTH_CONFIG.session.guestIdStorageKey);
    const guestChat = chats.find(c => String(c.id) === String(gId));
    return { guestId: gId as string | null, canMigrate: !!gId && (guestChat?.messages.length || 0) > 0 };
  }, [chats]);

  useEffect(() => {
    if (user || !isSessionReady) return;
    if (checkAndCleanupExpiredGuest()) {
      setChats([]); setActiveChatId(null); setIsGuestExpired(false);
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

  return { 
    chats, setChats, activeChatId, setActiveChatId, dynamicLayers, setDynamicLayers, 
    isLoading, sendMessage, createNewChat, deleteChat, renameChat, editAndResend,
    ephemeralMessages, fetchNextPage, isFetchingHistory, hasMore: activeChatId ? (paginationConfig[activeChatId]?.hasMore ?? false) : false,
    isSessionReady, guestId: migrationInfo.guestId, canMigrate: migrationInfo.canMigrate, isGuestExpired, setIsGuestExpired, suggestions, setSuggestions
  };
}