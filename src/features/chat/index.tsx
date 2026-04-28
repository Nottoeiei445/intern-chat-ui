"use client";
// Components
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { MessageList } from "./components/MessageList";
import { ChatInput } from "./components/ChatInput";

// Hooks & Context
import { useChat } from "./hooks/useChat";
import { useModels } from "./hooks/useModels";
import { useAuth } from "../auth/context/AuthContext";
import { AUTH_CONFIG } from "../auth/config/auth.config";
import { storage } from "../../lib/storage";
import { authService } from "../auth/services/auth.service";
import { isGuestTimeUp } from "@/features/auth/utils/guest-timer.util";
import { useState, useMemo } from "react"; // 🚀 ลบ useEffect ออก เพราะเราไม่ได้ fetch ในนี้แล้ว
import { useRouter } from "next/navigation";

export const ChatFeature = () => {
  const { user } = useAuth();
  const router = useRouter();
  
  // 🚀 2. Hook จัดการเรื่องแชท (สะอาดสะอ้าน)
  const { 
    chats, 
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
    hasMore,          
    isFetchingHistory,   
    isGuestExpired,
    setChats,
    setIsGuestExpired,
  } = useChat();

  // 🚀 3. Hook จัดการเรื่อง Model โดยเฉพาะ
  const { 
    models, 
    selectedModel, 
    setSelectedModel 
  } = useModels();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // คำนวณข้อความที่จะแสดงผล
  const messagesToShow = useMemo(() => {
    if (activeChatId) {
      const currentChat = chats.find(c => c.id === activeChatId);
      return currentChat?.messages || [];
    }
    return ephemeralMessages;
  }, [activeChatId, chats, ephemeralMessages]);

  const handleCreateNew = () => {
    if (!user) return router.push("/login");
    createNewChat();
  };

  const handleSelect = (id: string | null) => {
    if (!user) return router.push("/login");
    setActiveChatId(id);
  };

  const handleSendMessage = async (val: string, images: string[] = []) => {
    if (isGuestTimeUp()) {
      const hasStartTime = localStorage.getItem(AUTH_CONFIG.session.guestStartTimeStorageKey);
      
      if (hasStartTime) {
        console.warn("[Gatekeeper] Session expired. Blocking outgoing message.");
        setIsGuestExpired(true); 
        storage.removeCookie(AUTH_CONFIG.session.accessTokenStorageKey);
        
        return; 
      }
    }

    if (isGuestExpired) return;

    try {
      const currentToken = storage.getCookie(AUTH_CONFIG.session.accessTokenStorageKey);
      let guestIdToPass = undefined;

      if (!currentToken) {
        await authService.initializeGuest(); 
        const startTime = Date.now().toString();
        localStorage.setItem(AUTH_CONFIG.session.guestStartTimeStorageKey, startTime);
        guestIdToPass = storage.getCookie(AUTH_CONFIG.session.guestIdStorageKey);
      }

      // 🚀 4. นำ selectedModel ที่ได้จาก useModels มาส่งให้ sendMessage
      sendMessage(val, selectedModel, images, { explicitChatId: guestIdToPass ?? undefined } as any);

    } catch (error) {
      console.error("Failed to initialize guest session:", error);
    }
  };

  return (
    <div className="flex h-screen bg-[#050505] text-slate-200 overflow-hidden font-ibm">
      
      <Sidebar 
        isOpen={isSidebarOpen} 
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        chats={chats} 
        onRename={renameChat}
        activeId={activeChatId} 
        onSelect={handleSelect} 
        onNew={handleCreateNew} 
        onDelete={deleteChat} 
      />
      
      <div className="flex-1 flex flex-col relative min-w-0 h-screen">
        <Header 
          isSidebarOpen={isSidebarOpen} 
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          selectedModel={selectedModel} 
          onModelChange={setSelectedModel} 
          models={models}
        />
        
        <div className="flex-1 flex flex-col overflow-hidden min-h-0"> 
          <MessageList 
            messages={messagesToShow} 
            isLoading={isLoading} 
            onLoadMore={fetchNextPage}
            hasMore={hasMore}
            isFetchingHistory={isFetchingHistory}
            onEditMessage={(id, newContent) => editAndResend(id, newContent, selectedModel)}
            onSelectTemplate={(text) => handleSendMessage(text)} 
          />
        </div>

        <ChatInput 
          onSendMessage={handleSendMessage} 
          isLoading={isLoading} 
          isGuestExpired={isGuestExpired}
        />
      </div>
    </div>
  );
};

export * from './types';
export * from './hooks/useChat';
export * from './components/Sidebar';
export * from './components/Header';
export * from './components/MessageList';
export * from './components/ChatInput';