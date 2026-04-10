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
  const { 
    chats, 
    activeChatId, 
    setActiveChatId, 
    isLoading, 
    sendMessage, 
    createNewChat, 
    deleteChat,
    renameChat,
    ephemeralMessages
  } = useChat();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState("llama3");

  // 1. จัดการเลือกแชทแรกอัตโนมัติเมื่อ User ล็อกอินและมีข้อมูล
  useEffect(() => {
    if (user && !activeChatId && chats.length > 0) {
      setActiveChatId(chats[0].id);
    } else if (!user) {
      setActiveChatId(null);
    }
  }, [user, chats, activeChatId, setActiveChatId]);

  // 2. คำนวณข้อความที่จะโชว์ (ใช้ useMemo ช่วยเรื่อง Performance)
  const messagesToShow = useMemo(() => {
    if (activeChatId) {
      const currentChat = chats.find(c => c.id === activeChatId);
      return currentChat?.messages || [];
    }
    return ephemeralMessages;
  }, [activeChatId, chats, ephemeralMessages]);

  // --- Handlers ---
  
  const handleCreateNew = () => {
    if (!user) return router.push("/login");
    createNewChat();
  };

  const handleSelect = (id: string | null) => {
    if (!user) return router.push("/login");
    setActiveChatId(id);
  };

  const handleSendMessage = (val: string) => {
    // ถ้ายังไม่ล็อกอิน ให้ใช้ ephemeral mode (ไม่เก็บประวัติ)
    const options = (!user && !activeChatId) ? { ephemeral: true } : undefined;
    sendMessage(val, selectedModel, options);
  };

  return (
    <div className="flex h-screen bg-[#050505] text-slate-200 overflow-hidden font-ibm">
      {/* Sidebar ฝั่งซ้าย */}
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
      
      {/* พื้นที่แชทหลักฝั่งขวา */}
      <div className="flex-1 flex flex-col relative min-w-0">
        <Header 
          isSidebarOpen={isSidebarOpen} 
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          selectedModel={selectedModel} 
          onModelChange={setSelectedModel} 
        />
        
        <div className="flex-1 overflow-hidden">
          <MessageList 
            messages={messagesToShow} 
            isLoading={isLoading} 
          />
        </div>

        {/* ส่วนปุ่มส่งข้อความ */}
        <ChatInput 
          onSendMessage={handleSendMessage} 
          isLoading={isLoading} 
        />
      </div>
    </div>
  );
};

// Export ทุกอย่างออกไปให้เรียกใช้ง่ายๆ
export * from './types';
export * from './hooks/useChat';
export * from './components/Sidebar';
export * from './components/Header';
export * from './components/MessageList';
export * from './components/ChatInput';