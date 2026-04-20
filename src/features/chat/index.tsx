"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

// Components
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { MessageList } from "./components/MessageList";
import { ChatInput } from "./components/ChatInput";

// Hooks & Context
import { useChat } from "./hooks/useChat";
import { useAuth } from "../auth/context/AuthContext";

export const ChatFeature = () => {
  const { user } = useAuth();
  const router = useRouter();
  
  // ดึงตัวแปรที่จำเป็นสำหรับการทำ Pagination มาจาก useChat
  const { 
    chats, 
    activeChatId, 
    setActiveChatId, 
    isLoading, 
    sendMessage, 
    createNewChat, 
    deleteChat,
    renameChat,
    ephemeralMessages,
    fetchNextPage,     // ฟังก์ชันสำหรับโหลดข้อความหน้าถัดไป (เก่าขึ้น)
    hasMore,          // สถานะเช็คว่ายังมีข้อความเก่าให้โหลดอีกหรือไม่
    isFetchingHistory  // สถานะขณะกำลังดึงข้อมูลประวัติเก่า
  } = useChat();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState("llama3");

  // จัดการเลือกแชทแรกอัตโนมัติเมื่อ User ล็อกอินและมีข้อมูล
  useEffect(() => {
    if (user && !activeChatId && chats.length > 0) {
      setActiveChatId(chats[0].id);
    } else if (!user) {
      setActiveChatId(null);
    }
  }, [user, chats, activeChatId, setActiveChatId]);

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

  const handleSendMessage = (val: string, images: string[] = []) => {
    const options = !user ? { ephemeral: true } : undefined;
    sendMessage(val, selectedModel, images, options);
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
        />
        
        <div className="flex-1 flex flex-col overflow-hidden min-h-0"> 
          <MessageList 
            messages={messagesToShow} 
            isLoading={isLoading} 
            onLoadMore={fetchNextPage}
            hasMore={hasMore}
            isFetchingHistory={isFetchingHistory}
          />
        </div>

        <ChatInput 
          onSendMessage={handleSendMessage} 
          isLoading={isLoading} 
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