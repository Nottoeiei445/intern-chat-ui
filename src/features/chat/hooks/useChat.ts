// src/features/chat/hooks/useChat.ts
"use client"

import { useState, useEffect, useMemo, useRef } from "react"; 
import { ChatThread } from "../types";
import { useAuth } from "../../auth/context/AuthContext";
import { chatService } from "../services/chat.service"; 
import { AUTH_CONFIG } from "@/features/auth/config/auth.config";
import { storage } from "@/lib/storage";
import { useMapStore } from '@/store/useMapStore';
import { checkAndCleanupExpiredGuest, startGuestExpiryTimer } from "../../auth/utils/guest-timer.util";
import { useChatStream } from "./useChatStream";
import { useModels } from "../hooks/useModels";



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

const mapBackendLayers = (backendLayers: any[]): any[] => {
  if (!Array.isArray(backendLayers)) return [];

  return backendLayers.map((item: any) => {
    const innerLayer = item.layer?.layer || item.layer || item || {};
    const innerStyle = item.mapStyle || {};
    const layerId = item.id || innerLayer.layerId || item.layerKey;
    
    let baseUrl = innerLayer.url || item.url || "";
    if (!baseUrl && layerId) {
      if (item.type === 'coverage_tile') {
        baseUrl = `https://app.vallarismaps.com/core/api/maps/coverage/1.0-beta/maps/${layerId}/tms`;
      } else {
        baseUrl = `https://app.vallarismaps.com/core/api/tiles/1.0-beta/tiles/${layerId}`;
      }
    }

    return {
      id: layerId,
      type: item.type || innerLayer.type || "vector_tile",
      baseUrl: baseUrl,
      layerId: layerId,
      title: item.title || item.label || innerLayer.title || item.layerTitle || "Untitled Layer",
      apiProvider: (baseUrl && baseUrl.includes('vallaris')) ? 'vallaris' : 'gistda',
      bounds: innerLayer.bounds || item.bounds || null,
      minzoom: innerLayer.minzoom ?? item.minzoom ?? 0,
      maxzoom: innerLayer.maxzoom ?? item.maxzoom ?? 24,
      availableStyles: innerStyle.availableStyles || item.availableStyles || [],
      activeStyleKey: item.activeStyle || innerStyle.activeStyle || innerStyle.defaultStyle || innerStyle.styleKey || 'default',
      renderStyles: innerStyle.layers || item.layers || []
    };
  });
};

export function useChat() {
  // 1. Context & Store
  const { user } = useAuth(); 
  
  // 🌟 [CHANGED]: เพิ่มการดึงสิทธิ์ตัวแปร currentConversationApiKey มาร่วมรับรู้สเตทการสลับคีย์ค้นหา
  const { 
    apiKeys, openKeyModal, pendingChat, 
    setPendingChat, clearPendingChat,
    dynamicLayers, setDynamicLayers,
    currentConversationApiKey
  } = useMapStore();

  // 2. Main Chat State 
  const [chats, setChats] = useState<ChatThread[]>([]); 
  const [activeChatId, setActiveChatId] = useState<string | null>(null); 

  // 3. History & Pagination State
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [paginationConfig, setPaginationConfig] = useState<Record<string, { page: number, hasMore: boolean }>>({});
  const [isFetchingSidebar, setIsFetchingSidebar] = useState(false);
  const [sidebarPagination, setSidebarPagination] = useState({ page: 1, hasMore: true });

  // 4. Session State
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [isGuestExpired, setIsGuestExpired] = useState(false);

  
  const {
    sendMessage,
    isLoading,
    suggestions,
    setSuggestions,
    setIsLoading,
    ephemeralMessages,
  } = useChatStream({
    chats,
    setChats,
    activeChatId,
    setActiveChatId,
    setDynamicLayers,
    setPaginationConfig,
    openKeyModal,
    setPendingChat,
    user
  });

  const { 
    models, 
    selectedModel, 
    setSelectedModel 
  } = useModels();

  // --- 5. Initialization Effects ---
  useEffect(() => { setIsSessionReady(true); }, []);

  useEffect(() => {
    // เช็กสถานะความพร้อมว่าระบบได้คีย์ตัวใดตัวหนึ่งฝังเข้าประวัติสาขาเรียบร้อยแล้วหรือยัง
    const hasAnyKeyPopulated = apiKeys.gistda || apiKeys.vallaris || currentConversationApiKey;

    if (hasAnyKeyPopulated && pendingChat) {
      const options = { ...pendingChat.options, isSilentRetry: true };
      if (user && options.explicitChatId?.startsWith('guest_')) delete options.explicitChatId;
      
      sendMessage(pendingChat.input, pendingChat.model, pendingChat.images, options);
      
      // ล้างตู้จดหมายค้างส่งออกเพื่อป้องกันบักลูปอินฟินิตี้ส่งข้อความเบิ้ล
      clearPendingChat();
    }
  }, [apiKeys.gistda, apiKeys.vallaris, currentConversationApiKey, pendingChat, user, sendMessage, clearPendingChat]);

  // Fetch all histories
  useEffect(() => {
    if (!isSessionReady) return;

    const fetchAllHistories = async () => {
      const token = storage.getCookie(AUTH_CONFIG.session.accessTokenStorageKey);
      if (!token) return; 

      try {
        setIsFetchingSidebar(true); 
        const responseData = await chatService.getHistories({ page: 1, limit: 10 }); 
        
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

        const hasMoreData = filteredList.length >= 10; 
        setSidebarPagination({ page: 1, hasMore: hasMoreData });
      } catch (error) { 
        console.error("Failed to fetch histories:", error); 
      } finally {
        setIsFetchingSidebar(false);
      }
    };
    const token = storage.getCookie(AUTH_CONFIG.session.accessTokenStorageKey);
    if (token) fetchAllHistories(); 
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

        const fetchedModel = responseData?.model || responseData?.data?.model || null;
        const rawMessages = responseData?.data?.messages || responseData?.messages || responseData?.data || (Array.isArray(responseData) ? responseData : []);
        const messages = rawMessages.map(mapBackendMessage);
        
        chatService.getConversationLayers(targetId)
          .then(layersResponse => {
             let rawLayers = layersResponse?.layers || layersResponse?.data?.layers || layersResponse?.data || layersResponse || [];
             const restoredLayers = mapBackendLayers(Array.isArray(rawLayers) ? rawLayers : []);
             useMapStore.getState().setDynamicLayers(restoredLayers);
          })
          .catch(err => {
             useMapStore.getState().setDynamicLayers([]);
          });
        
        setChats(prev => {
          const existingChat = prev.find(chat => chat.id === targetId);
          if (existingChat?.messages.length && existingChat.messages[existingChat.messages.length - 1].role === "user") return prev;

          const chatExists = prev.some(chat => chat.id === targetId);
          if (!chatExists && targetId === guestId) {
            return [{ 
              id: targetId, 
              title: "Guest Session", 
              messages, 
              createdAt: Date.now(), 
              updatedAt: Date.now(),
              ...(fetchedModel && { model: fetchedModel }) 
            }, ...prev];
          }
          return prev.map(chat => chat.id === targetId ? { 
            ...chat, 
            messages,
            ...(fetchedModel && { model: fetchedModel }) 
          } : chat);
        });

        setPaginationConfig(prev => ({ ...prev, [targetId]: { page: 1, hasMore: messages.length >= 5 } }));
      } catch (error) {
        console.error("Failed to load messages:", error);
      } finally {
        setIsFetchingHistory(false);
      }
    };
    fetchChatDetail(); 
  }, [activeChatId, user]); 

  // จังหวะผู้ใช้กดเปลี่ยนคลิกสลับห้องแชทเก่าไปมา
  useEffect(() => {
    const mapStore = useMapStore.getState();
    
    if (!activeChatId || activeChatId.startsWith('session_')) {
      mapStore.setcurrentConversationApiKey(null);
      mapStore.setDynamicLayers([]); 
      mapStore.setActiveChatId(null); 
      setSuggestions([]); 
      return;
    }

    const cachedKey = mapStore.sessionKeys[activeChatId] || null;
    mapStore.setcurrentConversationApiKey(cachedKey);
    mapStore.setActiveChatId(activeChatId); 

    chatService.getConversationLayers(activeChatId)
      .then(layersResponse => {
        let rawLayers = layersResponse?.layers || layersResponse?.data?.layers || layersResponse?.data || layersResponse || [];
        const restoredLayers = mapBackendLayers(Array.isArray(rawLayers) ? rawLayers : []);
        mapStore.setDynamicLayers(restoredLayers);
      })
      .catch((error) => {
        mapStore.setDynamicLayers([]);
      });

    setSuggestions([]); 
  }, [activeChatId, setSuggestions]);

  // --- 6. Chat Actions ---
  const fetchNextPage = async () => {
    const guestId = storage.getCookie(AUTH_CONFIG.session.guestIdStorageKey);
    const targetId = !user && guestId ? (guestId as string) : activeChatId;
    if (!targetId || targetId.startsWith('session_')) return;

    const config = paginationConfig[targetId];
    if (!config || !config.hasMore || isFetchingHistory) return;

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

  const fetchNextSidebarPage = async () => {
    if(!sidebarPagination.hasMore || isFetchingSidebar) return;

    setIsFetchingSidebar(true);
    const nextPage = sidebarPagination.page + 1;

    try {
      const responseData = await chatService.getHistories({ page: nextPage, limit: 10 });
      const rawList = responseData.data || responseData;
      const filteredList = Array.isArray(rawList) ? rawList.filter((item: any) => item.is_active !== false && !item.deleted) : [];

      if (filteredList.length === 0) {
        setSidebarPagination(prev => ({...prev, hasMore: false }));
      } else {
        const mappedOlderChats: ChatThread[] = filteredList.map((item: any) => ({ 
          id: item.id, 
          title: item.title || "New Conversation", 
          messages: [],  
          createdAt: new Date(item.created_at).getTime(), 
          updatedAt: new Date(item.last_message_at || item.updated_at || item.created_at).getTime(), 
        }));

        setChats(prev => {
          const uniqueOlderChats = mappedOlderChats.filter(oldChat => !prev.some(p => p.id === oldChat.id));
          return sortChats([...prev, ...uniqueOlderChats]);
        });
        
        setSidebarPagination({ page: nextPage, hasMore: filteredList.length >= 10 });
      }
    } catch (error) {
      console.error("Failed to fetch older chat histories:", error);
    } finally {
      setIsFetchingSidebar(false);
    }
  };

  const createNewChat = () => {
    setActiveChatId(null);
    useMapStore.getState().clearApiKeys();
    useMapStore.getState().setDynamicLayers([]);
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

  const latestPropsRef = useRef({ sendMessage, selectedModel });

  useEffect(() => {
    latestPropsRef.current = { sendMessage, selectedModel };
  }, [sendMessage, selectedModel]);

  useEffect(() => {
    useMapStore.setState({
      triggerLayerUndo: (layerId: string) => {
        const { sendMessage: latestSendMessage, selectedModel: latestModel } = latestPropsRef.current;
        
        latestSendMessage("", latestModel, [], {
          isSilentRetry: true,
          mapselection: { key: "mapundo", value: layerId }
        });
      }
    });
  }, []);

  return { 
    chats, setChats, activeChatId, setActiveChatId, dynamicLayers, setDynamicLayers, 
    isLoading, sendMessage, createNewChat, deleteChat, renameChat, editAndResend,
    ephemeralMessages, fetchNextPage, isFetchingHistory, hasMore: activeChatId ? (paginationConfig[activeChatId]?.hasMore ?? false) : false,
    isSessionReady, guestId: migrationInfo.guestId, canMigrate: migrationInfo.canMigrate, isGuestExpired, setIsGuestExpired, 
    suggestions, setSuggestions, fetchNextSidebarPage, isFetchingSidebar, sidebarHasMore: sidebarPagination.hasMore
  };
}
